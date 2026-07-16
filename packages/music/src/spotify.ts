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
  providerPlaylistSummarySchema,
  trackSearchResultSchema,
  type ProviderPlaylistSummary,
  type TrackSearchResult,
} from '@ritmofit/shared';
import { z } from 'zod';
import type { FetchLike, MusicProvider, PlaylistImportRef } from './provider.js';
import { readJson, ProviderError } from './errors.js';
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
const IMPORT_TRACK_CAP = 500;

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

  async getPlaylist(
    ref: Extract<PlaylistImportRef, { provider: 'spotify' }>,
  ): Promise<TrackSearchResult[]> {
    const encodedPlaylistId = encodeURIComponent(ref.playlistId);
    const candidates: TrackSearchResult[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total && candidates.length < IMPORT_TRACK_CAP) {
      const json = await this.authedGet(
        `${this.apiBase}/playlists/${encodedPlaylistId}/items?limit=${PLAYLIST_PAGE_LIMIT}&offset=${offset}`,
      );
      const parsed = spPlaylistPageSchema.safeParse(json);
      if (!parsed.success) {
        throw new ProviderError('spotify', 'Spotify returned an invalid playlist page.');
      }

      const pageItems = parsed.data.items;
      candidates.push(
        ...pageItems
          .map((item) => this.toCandidate(item.item))
          .filter((candidate): candidate is TrackSearchResult => candidate !== null),
      );
      total = parsed.data.total;
      if (pageItems.length === 0) break;
      offset += pageItems.length;
    }

    return candidates;
  }

  /** Map a Spotify track object → contract candidate, or null if it can't satisfy the schema. */
  private toCandidate(raw: unknown): TrackSearchResult | null {
    return toSpotifyCandidate(raw);
  }

  private async authedGet(url: string): Promise<unknown> {
    const token = await this.tokens.get();
    const res = await fetchWithRetry(
      this.fetchImpl,
      url,
      { headers: { Authorization: `Bearer ${token}` } },
      this.retry,
    );
    if (!res.ok) {
      // One forced refresh on a 401 in case the cached token went stale early.
      if (res.status === 401) {
        this.tokens.invalidate();
        const retry = await fetchWithRetry(
          this.fetchImpl,
          url,
          { headers: { Authorization: `Bearer ${await this.tokens.get()}` } },
          this.retry,
        );
        if (retry.ok) return readJson(retry, 'spotify');
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
    if (!res.ok) throw new ProviderError('spotify', `Spotify API ${res.status} for /me/tracks`);
    const parsed = spSavedPageSchema.safeParse(await readJson(res, 'spotify'));
    if (!parsed.success) break;
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
    if (res.status === 403) throw new SpotifyForbiddenError();
    if (!res.ok) throw new ProviderError('spotify', `Spotify API ${res.status} for /me/playlists`);

    const parsed = spLibraryPlaylistsPageSchema.safeParse(await readJson(res, 'spotify'));
    if (!parsed.success) break;

    for (const raw of parsed.data.items) {
      const candidate = providerPlaylistSummarySchema.safeParse({
        provider: 'spotify',
        playlistId: raw.id,
        providerUri: raw.external_urls?.spotify ?? null,
        name: raw.name ?? 'Untitled playlist',
        ownerName: raw.owner?.display_name ?? null,
        trackCount: raw.items?.total ?? 0,
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
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxTracks ?? 200;
  const out: TrackSearchResult[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const encodedPlaylistId = encodeURIComponent(cfg.playlistId);

  while (offset < total && out.length < cap) {
    const res = await cfg.fetchImpl(
      `${base}/playlists/${encodedPlaylistId}/items?limit=${PLAYLIST_PAGE_LIMIT}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}`, Accept: 'application/json' } },
    );
    if (res.status === 401) throw new SpotifyUnauthorizedError();
    if (res.status === 403) throw new SpotifyPlaylistAccessDeniedError();
    if (!res.ok) throw new ProviderError('spotify', `Spotify API ${res.status} for playlist items`);
    const parsed = spPlaylistPageSchema.safeParse(await readJson(res, 'spotify'));
    if (!parsed.success) break;

    for (const item of parsed.data.items) {
      const candidate = toSpotifyCandidate(item.item);
      if (candidate) out.push(candidate);
      if (out.length >= cap) break;
    }

    total = parsed.data.total;
    if (parsed.data.items.length === 0) break;
    offset += parsed.data.items.length;
  }

  return out;
}
