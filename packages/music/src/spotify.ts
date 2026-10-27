/**
 * Spotify provider adapter (M2) — search + lookup behind the `MusicProvider`
 * interface, mapping Spotify track JSON → the shared `TrackSearchResult`.
 *
 * Hard constraint (music-providers.md): **never read BPM from Spotify** — the
 * audio-features/tempo endpoint was deprecated for new apps in Nov 2024 and is
 * not called here. `TrackSearchResult` carries no BPM, and import always sets
 * `display_bpm` to null (BPM is manual). We surface only references + display
 * metadata, never audio.
 *
 * Public search/lookup use a **client-credentials app token** (Basic-auth at the
 * accounts token endpoint), cached until just before expiry. Server-side only —
 * the client secret never reaches a browser. Network is injectable (`fetchImpl`)
 * so the mapping is unit-tested with no live calls; re-verify endpoints/shapes
 * against live docs when real credentials land.
 */
import {
  PLAYLIST_URL_OCCURRENCE_LIMIT,
  providerPlaylistSummarySchema,
  trackSearchResultSchema,
  type ProviderPlaylistSummary,
  type TrackSearchResult,
} from '@ritmofit/shared';
import { z } from 'zod';
import type {
  FetchLike,
  MusicProvider,
  PlaylistImportRef,
  PlaylistReadOptions,
} from './provider.js';
import { abortError, PlaylistOverLimitError, ProviderError, readJson } from './errors.js';
import { AppTokenCache } from './app-token.js';
import { fetchWithRetry, type RetryOptions } from './retry.js';

const DEFAULT_API_BASE = 'https://api.spotify.com/v1';
const DEFAULT_TOKEN_URL = 'https://accounts.spotify.com/api/token';
// Spotify's docs say search `limit` may be 0–50, but the client-credentials flow
// now rejects higher values with 400 "Invalid limit" (verified in prod); 10 is a
// safe, ample page for the add-track picker.
const SEARCH_LIMIT = 10;
// Spotify's playlist-items endpoint currently caps pages at 50. Construct each
// request from our API base + offset rather than following provider-supplied URLs.
const PLAYLIST_PAGE_LIMIT = 50;

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  tokenUrl?: string;
  now?: () => number;
  /** Retry tuning for transient (429/5xx) reads; tests inject a no-op sleep. */
  retry?: RetryOptions;
}

/** One Spotify track (permissive — unknown fields ignored). No audio-features/BPM. */
const spTrackSchema = z.object({
  id: z.string(),
  uri: z.string().optional(),
  name: z.string().optional(),
  duration_ms: z.number().optional(),
  external_urls: z.object({ spotify: z.string() }).partial().optional(),
  artists: z.array(z.object({ name: z.string() })).optional(),
  album: z.object({ images: z.array(z.object({ url: z.string() })).optional() }).optional(),
});
type SpTrack = z.infer<typeof spTrackSchema>;

const spSearchSchema = z.object({
  tracks: z.object({ items: z.array(z.unknown()) }).optional(),
});

const spPlaylistPageSchema = z.object({
  items: z.array(z.object({ item: z.unknown().nullable().optional() })),
  total: z.number().int().nonnegative(),
});

// The saved-tracks endpoint wraps each track in a `{ added_at, track }` envelope,
// same `total`-paged shape as playlist items.
const spSavedPageSchema = z.object({
  items: z.array(z.object({ track: z.unknown() })),
  total: z.number().int().nonnegative(),
});

const spLibraryPlaylistsPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      owner: z.object({ display_name: z.string().nullable().optional() }).optional(),
      items: z.object({ total: z.number().int().nonnegative().optional() }).optional(),
      images: z.array(z.object({ url: z.string() })).optional(),
      external_urls: z.object({ spotify: z.string().optional() }).optional(),
    }),
  ),
  total: z.number().int().nonnegative(),
});

const SAVED_TRACKS_PAGE_LIMIT = 50;
const SAVED_PLAYLISTS_PAGE_LIMIT = 50;

export function createSpotifyProvider(config: SpotifyConfig): MusicProvider {
  return new SpotifyProvider(config);
}

class SpotifyProvider implements MusicProvider {
  readonly provider = 'spotify' as const;

  private readonly fetchImpl: FetchLike;
  private readonly apiBase: string;
  private readonly tokens: AppTokenCache;
  private readonly retry?: RetryOptions;

  constructor(config: SpotifyConfig) {
    this.fetchImpl = config.fetchImpl;
    this.apiBase = config.apiBase ?? DEFAULT_API_BASE;
    this.retry = config.retry;
    this.tokens = new AppTokenCache({
      provider: 'spotify',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokenUrl: config.tokenUrl ?? DEFAULT_TOKEN_URL,
      fetchImpl: config.fetchImpl,
      now: config.now,
    });
  }

  async search(query: string): Promise<TrackSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `${this.apiBase}/search?q=${encodeURIComponent(q)}&type=track&limit=${SEARCH_LIMIT}`;
    const json = await this.authedGet(url);
    const parsed = spSearchSchema.safeParse(json);
    const items = parsed.success ? (parsed.data.tracks?.items ?? []) : [];
    return items
      .map((raw) => this.toCandidate(raw))
      .filter((c): c is TrackSearchResult => c !== null);
  }

  async lookup(providerTrackId: string): Promise<TrackSearchResult | null> {
    const json = await this.authedGet(
      `${this.apiBase}/tracks/${encodeURIComponent(providerTrackId)}`,
    );
    return this.toCandidate(json);
  }

  /**
   * App-token playlist read. Paste-a-link must not call this. Spotify's
   * playlist-items endpoint rejects a client-credentials token with 401
   * "Valid user authentication required", and the remint below would hide
   * that auth failure as a provider outage. Use `fetchSpotifyPlaylistTracks`
   * with the instructor's user token instead.
   */
  async getPlaylist(
    ref: Extract<PlaylistImportRef, { provider: 'spotify' }>,
    read?: PlaylistReadOptions,
  ): Promise<TrackSearchResult[]> {
    const encodedPlaylistId = encodeURIComponent(ref.playlistId);
    const candidates: TrackSearchResult[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      throwIfPreviewStopped(read);
      const json = await this.authedGet(
        `${this.apiBase}/playlists/${encodedPlaylistId}/items?limit=${PLAYLIST_PAGE_LIMIT}&offset=${offset}`,
        read,
      );
      const parsed = spPlaylistPageSchema.safeParse(json);
      if (!parsed.success) {
        throw new ProviderError('spotify', 'Spotify returned an invalid playlist page.');
      }

      // Spotify publishes `total`. Stop before another page, and before mapping
      // a list the preview will reject.
      if (parsed.data.total > PLAYLIST_URL_OCCURRENCE_LIMIT) {
        throw new PlaylistOverLimitError(parsed.data.total, PLAYLIST_URL_OCCURRENCE_LIMIT);
      }

      const pageItems = parsed.data.items;
      for (const item of pageItems) {
        const candidate = this.toCandidate(item.item);
        if (!candidate) continue;
        candidates.push(candidate);
        if (candidates.length > PLAYLIST_URL_OCCURRENCE_LIMIT) {
          throw new PlaylistOverLimitError(null, PLAYLIST_URL_OCCURRENCE_LIMIT);
        }
      }
      total = parsed.data.total;
      if (pageItems.length === 0) break;
      offset += pageItems.length;
      if (candidates.length >= PLAYLIST_URL_OCCURRENCE_LIMIT && offset < total) {
        throw new PlaylistOverLimitError(
          total > PLAYLIST_URL_OCCURRENCE_LIMIT ? total : null,
          PLAYLIST_URL_OCCURRENCE_LIMIT,
        );
      }
    }

    return candidates;
  }

  /** Map a Spotify track object → contract candidate, or null if it can't satisfy the schema. */
  private toCandidate(raw: unknown): TrackSearchResult | null {
    return toSpotifyCandidate(raw);
  }

  private async authedGet(url: string, read?: PlaylistReadOptions): Promise<unknown> {
    const retry = previewRetry(this.retry, read);
    const token = await this.tokens.get();
    const res = await fetchWithRetry(
      this.fetchImpl,
      url,
      { headers: { Authorization: `Bearer ${token}` } },
      retry,
    );
    if (!res.ok) {
      // One forced refresh on a 401 in case the cached token went stale early.
      if (res.status === 401) {
        this.tokens.invalidate();
        const retryRes = await fetchWithRetry(
          this.fetchImpl,
          url,
          { headers: { Authorization: `Bearer ${await this.tokens.get()}` } },
          retry,
        );
        if (retryRes.ok) return readJson(retryRes, 'spotify');
      }
      // Surface the upstream message (truncated) so a 400/403 is diagnosable in logs.
      const detail = await res.text().catch(() => '');
      throw new ProviderError(
        'spotify',
        `Spotify request failed: ${res.status} ${detail.slice(0, 200)}`.trim(),
      );
    }
    return readJson(res, 'spotify');
  }
}

/** Map a raw Spotify track object → contract candidate, or null if it can't be one. */
function toSpotifyCandidate(raw: unknown): TrackSearchResult | null {
  const parsed = spTrackSchema.safeParse(raw);
  if (!parsed.success) return null;
  const t: SpTrack = parsed.data;
  const artist = (t.artists ?? [])
    .map((a) => a.name)
    .filter(Boolean)
    .join(', ');
  const candidate = {
    provider: 'spotify' as const,
    providerTrackId: t.id,
    providerUri: t.uri ?? t.external_urls?.spotify ?? null,
    title: t.name ?? '',
    artist,
    albumArtUrl: t.album?.images?.[0]?.url ?? null,
    durationMs: t.duration_ms ?? null,
  };
  const out = trackSearchResultSchema.safeParse(candidate);
  return out.success ? out.data : null;
}

/**
 * Thrown when Spotify rejects a **user** token with 401 — the signal `apps/api`
 * uses to refresh the stored token once and retry. (App-token calls inside the
 * adapter never surface this; they re-mint on their own cache miss.)
 */
export class SpotifyUnauthorizedError extends Error {
  readonly status = 401 as const;
  constructor() {
    super('Spotify rejected the user token (401).');
    this.name = 'SpotifyUnauthorizedError';
  }
}

/**
 * Thrown when Spotify rejects a **saved-playlist** read with 403 — a valid token
 * that predates the `playlist-read-private` / `playlist-read-collaborative`
 * scopes. Unlike `SpotifyUnauthorizedError`, a token refresh cannot fix this: only
 * re-consent grants the missing scope, so the caller must prompt a reconnect
 * rather than retry.
 */
export class SpotifyForbiddenError extends Error {
  readonly status = 403 as const;
  constructor() {
    super('Spotify rejected the request (403) — the token is missing a required scope.');
    this.name = 'SpotifyForbiddenError';
  }
}

/**
 * Spotify accepted the login, then refused a user-token library call because
 * this account is not on the app's Development Mode allowlist. A refresh or
 * reconnect does not add that row.
 */
export class SpotifyDevelopmentModeError extends Error {
  readonly status = 403 as const;
  constructor() {
    super('Spotify has not allowlisted this user for the app (403).');
    this.name = 'SpotifyDevelopmentModeError';
  }
}

/**
 * Thrown when Spotify denies a **playlist item** read for a valid user token.
 * The 2026 playlist-items endpoint only exposes contents for playlists the user
 * owns or collaborates on, so reconnecting cannot grant access to that playlist.
 */
export class SpotifyPlaylistAccessDeniedError extends Error {
  readonly status = 403 as const;
  constructor() {
    super('Spotify denied access to this playlist (403).');
    this.name = 'SpotifyPlaylistAccessDeniedError';
  }
}

/**
 * Fetch the connected user's saved tracks with a **per-user** access token
 * (`music_connections`), mapped to the shared contract — the "search my Spotify"
 * surface. Stays a pure adapter: the caller owns the token's decryption, refresh,
 * and persistence. Throws `SpotifyUnauthorizedError` on 401 so the caller can
 * refresh + retry; throws on any other non-ok. Paginates the `total`-counted feed.
 */
export async function fetchSpotifySavedTracks(cfg: {
  accessToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  /** Stop after this many tracks so a huge library can't run unbounded. */
  maxTracks?: number;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxTracks ?? 200;
  const out: TrackSearchResult[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total && out.length < cap) {
    const res = await cfg.fetchImpl(
      `${base}/me/tracks?limit=${SAVED_TRACKS_PAGE_LIMIT}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}`, Accept: 'application/json' } },
    );
    if (res.status === 401) throw new SpotifyUnauthorizedError();
    if (res.status === 403) {
      const detail = await denialDetail(res);
      if (isSpotifyDevelopmentModeDenial(detail)) throw new SpotifyDevelopmentModeError();
      throw new ProviderError('spotify', 'Spotify API 403 for /me/tracks');
    }
    if (!res.ok) throw new ProviderError('spotify', `Spotify API ${res.status} for /me/tracks`);
    const parsed = spSavedPageSchema.safeParse(await readJson(res, 'spotify'));
    if (!parsed.success) {
      throw new ProviderError('spotify', 'Spotify returned an invalid saved-track page.');
    }
    const pageItems = parsed.data.items;
    for (const item of pageItems) {
      const candidate = toSpotifyCandidate(item.track);
      if (candidate) out.push(candidate);
      if (out.length >= cap) break;
    }
    total = parsed.data.total;
    if (pageItems.length === 0) break;
    offset += pageItems.length;
  }
  return out;
}

/**
 * Fetch the connected user's saved playlists (`/me/playlists`) with a per-user
 * token, mapped into compact shelf cards for browse surfaces.
 */
export async function fetchSpotifySavedPlaylists(cfg: {
  accessToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  /** Stop after this many playlists so browse reads stay bounded. */
  maxPlaylists?: number;
}): Promise<ProviderPlaylistSummary[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxPlaylists ?? 100;
  const out: ProviderPlaylistSummary[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total && out.length < cap) {
    const res = await cfg.fetchImpl(
      `${base}/me/playlists?limit=${SAVED_PLAYLISTS_PAGE_LIMIT}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}`, Accept: 'application/json' } },
    );
    if (res.status === 401) throw new SpotifyUnauthorizedError();
    if (res.status === 403) {
      const detail = await denialDetail(res);
      if (isSpotifyDevelopmentModeDenial(detail)) throw new SpotifyDevelopmentModeError();
      throw new SpotifyForbiddenError();
    }
    if (!res.ok) throw new ProviderError('spotify', `Spotify API ${res.status} for /me/playlists`);

    const parsed = spLibraryPlaylistsPageSchema.safeParse(await readJson(res, 'spotify'));
    if (!parsed.success) {
      throw new ProviderError('spotify', 'Spotify returned an invalid saved-playlist page.');
    }

    for (const raw of parsed.data.items) {
      const candidate = providerPlaylistSummarySchema.safeParse({
        provider: 'spotify',
        playlistId: raw.id,
        providerUri: raw.external_urls?.spotify ?? null,
        name: raw.name ?? 'Untitled playlist',
        ownerName: raw.owner?.display_name ?? null,
        trackCount: raw.items?.total ?? null,
        coverImageUrl: raw.images?.[0]?.url ?? null,
      });
      if (candidate.success) out.push(candidate.data);
      if (out.length >= cap) break;
    }

    total = parsed.data.total;
    if (parsed.data.items.length === 0) break;
    offset += parsed.data.items.length;
  }

  return out;
}

/**
 * Fetch tracks for one Spotify playlist with a per-user token. This powers saved
 * playlist drill-in so the UI can preview tracks before adding/importing.
 */
export async function fetchSpotifyPlaylistTracks(cfg: {
  accessToken: string;
  playlistId: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  /** Stop after this many tracks so detail reads stay bounded. */
  maxTracks?: number;
  /**
   * Saved-playlist import stop. Checked after a page, before the next request.
   * When set, the browse cap of 200 does not apply — duplicates under the
   * distinct-song ceiling keep paging.
   */
  shouldStop?: (tracks: TrackSearchResult[]) => boolean;
  /**
   * Paste-a-link ceiling. When Spotify publishes `total` above this, stop
   * before another page. A user token is required; this function never mints
   * a client-credentials token.
   */
  occurrenceLimit?: number;
  /** Preview deadline. Checked before each page; a late page is not started. */
  read?: PlaylistReadOptions;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.shouldStop ? Number.MAX_SAFE_INTEGER : (cfg.maxTracks ?? 200);
  const out: TrackSearchResult[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const encodedPlaylistId = encodeURIComponent(cfg.playlistId);
  const retry = cfg.read ? previewRetry(undefined, cfg.read) : undefined;

  while (offset < total && out.length < cap) {
    throwIfPreviewStopped(cfg.read);
    const url =
      `${base}/playlists/${encodedPlaylistId}/items` +
      `?limit=${PLAYLIST_PAGE_LIMIT}&offset=${offset}`;
    const init = {
      headers: { Authorization: `Bearer ${cfg.accessToken}`, Accept: 'application/json' },
    };
    const res = retry
      ? await fetchWithRetry(cfg.fetchImpl, url, init, retry)
      : await cfg.fetchImpl(url, init);
    if (res.status === 401) throw new SpotifyUnauthorizedError();
    if (res.status === 403) {
      const detail = await res.text().catch(() => '');
      if (isSpotifyAuthFailure(detail)) throw new SpotifyForbiddenError();
      throw new SpotifyPlaylistAccessDeniedError();
    }
    if (!res.ok) throw new ProviderError('spotify', `Spotify API ${res.status} for playlist items`);
    const parsed = spPlaylistPageSchema.safeParse(await readJson(res, 'spotify'));
    if (!parsed.success) {
      throw new ProviderError('spotify', 'Spotify returned an invalid saved-playlist track page.');
    }

    if (cfg.occurrenceLimit != null && parsed.data.total > cfg.occurrenceLimit) {
      throw new PlaylistOverLimitError(parsed.data.total, cfg.occurrenceLimit);
    }

    for (const item of parsed.data.items) {
      const candidate = toSpotifyCandidate(item.item);
      if (!candidate) continue;
      out.push(candidate);
      if (cfg.occurrenceLimit != null && out.length > cfg.occurrenceLimit) {
        throw new PlaylistOverLimitError(null, cfg.occurrenceLimit);
      }
      if (!cfg.shouldStop && cfg.occurrenceLimit == null && out.length >= cap) break;
    }

    total = parsed.data.total;
    if (parsed.data.items.length === 0) break;
    offset += parsed.data.items.length;
    if (cfg.occurrenceLimit != null && out.length >= cfg.occurrenceLimit && offset < total) {
      throw new PlaylistOverLimitError(
        total > cfg.occurrenceLimit ? total : null,
        cfg.occurrenceLimit,
      );
    }
    if (cfg.shouldStop?.(out)) break;
  }

  return out;
}

/**
 * A 403 whose body is an auth or scope failure, not a denial of one playlist.
 * Reconnecting can fix the former. It cannot fix the latter.
 */
function isSpotifyAuthFailure(detail: string): boolean {
  return /insufficient client scope|insufficient scope|authentication required|invalid access token/i.test(
    detail,
  );
}

/**
 * Development Mode allows login, then returns 403 on user-token reads until
 * the account is added under User Management. The published wording is
 * "not registered" (for this application, or in the developer dashboard).
 */
function isSpotifyDevelopmentModeDenial(detail: string): boolean {
  // "not registered for this application" and "the user may not be registered".
  return /not(?:\s+be)?\s+registered/i.test(detail);
}

async function denialDetail(res: { text(): Promise<string> }): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function previewRetry(
  base: RetryOptions | undefined,
  read?: PlaylistReadOptions,
): RetryOptions | undefined {
  if (!read?.signal && read?.deadlineAt == null) return base;
  return { ...base, signal: read.signal, deadlineAt: read.deadlineAt };
}

function throwIfPreviewStopped(read?: PlaylistReadOptions): void {
  if (read?.signal?.aborted) throw abortError();
  if (read?.deadlineAt != null && Date.now() >= read.deadlineAt) throw abortError();
}
