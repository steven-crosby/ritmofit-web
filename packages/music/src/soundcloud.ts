/**
 * SoundCloud provider adapter (M2, the first real provider).
 *
 * Verified against SoundCloud's API terms (June 2026):
 * - OAuth 2.1; **all clients are confidential** — even app-token (client
 *   credentials) calls need the secret, sent as HTTP Basic auth. So this runs
 *   **server-side only**; the secret never reaches a client.
 * - Token endpoint: `https://secure.soundcloud.com/oauth/token` (the legacy
 *   `api.soundcloud.com/oauth2/token` is deprecated).
 * - Public track search uses an app token (no per-user connection needed yet —
 *   user OAuth + `music_connections` is the next slice).
 * - We store only references + minimal display metadata; never audio, never
 *   provider BPM (music-providers.md). Streaming/preview is a later slice and
 *   must carry SoundCloud attribution.
 *
 * Network is fully injectable (`fetchImpl`) so the mapping is unit-tested with no
 * live calls. Defaults are documented; re-verify the auth header scheme against
 * live docs when real credentials land.
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
  LibraryPageOptions,
  MusicProvider,
  PlaylistImportRef,
  PlaylistReadOptions,
  ProviderTrackPage,
} from './provider.js';
import {
  abortError,
  InvalidProviderCursorError,
  PlaylistOverLimitError,
  ProviderError,
  readJson,
} from './errors.js';
import { AppTokenCache } from './app-token.js';
import { fetchWithRetry, type RetryOptions } from './retry.js';

// `URL` is available in the Workers runtime and Node ≥18 (vitest). Declared here
// so the package needs no DOM/Workers ambient lib (same pattern as `btoa` in
// app-token.ts). Only the members this module reads are declared.
declare const URL: new (
  input: string,
  base?: string,
) => { pathname: string; origin: string; username: string; password: string };

const DEFAULT_API_BASE = 'https://api.soundcloud.com';
const DEFAULT_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
const SEARCH_LIMIT = 25;
const LIKES_LIMIT = 50;
const SOUNDCLOUD_PAGE_LIMIT = 50;
// Paste-a-link pages at the occurrence ceiling. A longer playlist is rejected
// from the page that crosses it — never silently truncated.
const IMPORT_PAGE_LIMIT = 100;

export interface SoundCloudConfig {
  clientId: string;
  clientSecret: string;
  /** Workers/Node global `fetch` by default; injected in tests. */
  fetchImpl: FetchLike;
  /** Overridable for tests. */
  apiBase?: string;
  tokenUrl?: string;
  /** Clock seam for token-expiry tests. */
  now?: () => number;
  /** Retry tuning for transient (429/5xx) reads; tests inject a no-op sleep. */
  retry?: RetryOptions;
}

/** One SoundCloud track (permissive — unknown fields are ignored). Since the
 *  2025 URN migration SoundCloud is replacing numeric `id`s with URN strings
 *  (`soundcloud:tracks:123`); tolerate both and normalize to string. */
const scTrackSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  urn: z.string().optional(),
  title: z.string().optional(),
  permalink_url: z.string().optional(),
  duration: z.number().optional(),
  artwork_url: z.string().nullable().optional(),
  user: z.object({ username: z.string() }).optional(),
});
type ScTrack = z.infer<typeof scTrackSchema>;

/** Search may be a bare array or a `linked_partitioning` envelope. */
const scSearchSchema = z.union([
  z.array(z.unknown()),
  z.object({ collection: z.array(z.unknown()), next_href: z.string().nullable().optional() }),
]);

const scPlaylistSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  urn: z.string().optional(),
  title: z.string().optional(),
  permalink_url: z.string().optional(),
  artwork_url: z.string().nullable().optional(),
  track_count: z.number().int().nonnegative().optional(),
  user: z.object({ username: z.string().optional() }).optional(),
  tracks: z.array(z.unknown()).optional(),
});

const scPlaylistListSchema = z.union([
  z.array(z.unknown()),
  z.object({ collection: z.array(z.unknown()), next_href: z.string().nullable().optional() }),
]);

const scPagedTracksSchema = z.union([
  z.array(z.unknown()),
  z.object({ collection: z.array(z.unknown()), next_href: z.string().nullable().optional() }),
]);

/** The resource body `/resolve` yields when a fetch stack auto-follows its 302. */
const scResolvedResourceSchema = z.object({
  kind: z.string().optional(),
  urn: z.string().optional(),
  id: z.union([z.number(), z.string()]).optional(),
});

/**
 * Extract the playlist URN/id from a `/resolve` Location — an API resource URL
 * like `https://api.soundcloud.com/playlists/soundcloud%3Aplaylists%3A123`.
 * Null when the URL resolved to some other resource kind (track, user).
 */
function playlistUrnFromResourceUrl(location: string, apiBase: string): string | null {
  let resolved: InstanceType<typeof URL>;
  try {
    resolved = new URL(location, apiBase);
  } catch {
    return null;
  }
  const segments = movePastVersionPrefix(resolved.pathname.split('/').filter((s) => s !== ''));
  if (segments[0] !== 'playlists' || !segments[1]) return null;
  try {
    return decodeURIComponent(segments[1]);
  } catch {
    return segments[1];
  }
}

/** Tolerate an API-version path prefix (e.g. `/v2/playlists/…`) in the Location. */
function movePastVersionPrefix(segments: string[]): string[] {
  const first = segments[0];
  return first && /^v\d+$/.test(first) ? segments.slice(1) : segments;
}

export function createSoundCloudProvider(config: SoundCloudConfig): MusicProvider {
  return new SoundCloudProvider(config);
}

class SoundCloudProvider implements MusicProvider {
  readonly provider = 'soundcloud' as const;

  private readonly fetchImpl: FetchLike;
  private readonly apiBase: string;
  private readonly tokens: AppTokenCache;
  private readonly retry?: RetryOptions;

  constructor(config: SoundCloudConfig) {
    this.fetchImpl = config.fetchImpl;
    this.apiBase = config.apiBase ?? DEFAULT_API_BASE;
    this.retry = config.retry;
    this.tokens = new AppTokenCache({
      provider: 'soundcloud',
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
    // Built by hand (not URLSearchParams) so this package needs no DOM/Workers lib.
    const params =
      `q=${encodeURIComponent(q)}&access=playable` +
      `&limit=${SEARCH_LIMIT}&linked_partitioning=true`;
    const body = await this.apiGet(`/tracks?${params}`);
    const parsed = scSearchSchema.safeParse(body);
    if (!parsed.success) return [];
    const raw = Array.isArray(parsed.data) ? parsed.data : parsed.data.collection;
    return raw.map((item) => toCandidate(item)).filter((r): r is TrackSearchResult => r !== null);
  }

  async lookup(providerTrackId: string): Promise<TrackSearchResult | null> {
    // Stored ids are the numeric SoundCloud track id (see `toCandidate`).
    const id = encodeURIComponent(providerTrackId);
    const body = await this.apiGet(`/tracks/${id}`, { allow404: true });
    if (body === null) return null;
    return toCandidate(body);
  }

  /**
   * Import a public playlist permalink: `/resolve` the URL to a playlist URN,
   * then page the playlist-track collection (the embedded `tracks` on
   * `/playlists/{urn}` can be truncated). [] when the URL doesn't resolve or
   * resolves to something that isn't a playlist (e.g. an on.soundcloud.com
   * short link to a track).
   */
  async getPlaylist(
    ref: Extract<PlaylistImportRef, { provider: 'soundcloud' }>,
    read?: PlaylistReadOptions,
  ) {
    try {
      return await this.getPlaylistOnce(ref.permalinkUrl, read);
    } catch (err) {
      if (!(err instanceof SoundCloudUnauthorizedError)) throw err;
      // The cached app token went stale server-side; re-mint once and retry.
      // Over-limit and preview abort are not authorization failures.
      this.tokens.invalidate();
      try {
        return await this.getPlaylistOnce(ref.permalinkUrl, read);
      } catch (retryErr) {
        if (retryErr instanceof SoundCloudUnauthorizedError) {
          throw new ProviderError('soundcloud', 'SoundCloud rejected a fresh app token (401).');
        }
        throw retryErr;
      }
    }
  }

  private async getPlaylistOnce(
    permalinkUrl: string,
    read?: PlaylistReadOptions,
  ): Promise<TrackSearchResult[]> {
    const urn = await this.resolvePlaylistUrn(permalinkUrl, read);
    if (urn === null) return [];
    const out: TrackSearchResult[] = [];
    let nextUrl: string | null =
      `${this.apiBase}/playlists/${encodeURIComponent(urn)}/tracks` +
      `?limit=${IMPORT_PAGE_LIMIT}&linked_partitioning=true`;
    const retry = previewRetry(this.retry, read);

    while (nextUrl) {
      throwIfPreviewStopped(read);
      const token = await this.tokens.get();
      const res = await fetchWithRetry(
        this.fetchImpl,
        nextUrl,
        { headers: { Authorization: `OAuth ${token}`, Accept: 'application/json' } },
        retry,
      );
      if (res.status === 401) throw new SoundCloudUnauthorizedError();
      if (res.status === 404) return [];
      if (!res.ok) {
        throw new ProviderError(
          'soundcloud',
          `SoundCloud API ${res.status} for /playlists/:urn/tracks`,
        );
      }
      const page = parseSoundCloudTrackPage(await readJson(res, 'soundcloud'));
      if (!page) {
        throw new ProviderError(
          'soundcloud',
          'SoundCloud returned an invalid page for /playlists/:urn/tracks.',
        );
      }
      for (const row of page.rows) {
        const candidate = toCandidate(row);
        if (!candidate) continue;
        if (out.length >= PLAYLIST_URL_OCCURRENCE_LIMIT) {
          throw new PlaylistOverLimitError(null, PLAYLIST_URL_OCCURRENCE_LIMIT);
        }
        out.push(candidate);
      }
      if (page.rows.length === 0) break;
      if (out.length >= PLAYLIST_URL_OCCURRENCE_LIMIT && page.nextUrl) {
        throw new PlaylistOverLimitError(null, PLAYLIST_URL_OCCURRENCE_LIMIT);
      }
      nextUrl = page.nextUrl;
    }
    return out;
  }

  /**
   * `/resolve` a soundcloud.com / on.soundcloud.com URL to a playlist URN, or
   * null when it doesn't exist or isn't a playlist. The endpoint replies 302
   * with an api.soundcloud.com resource URL; requested with `redirect: manual`
   * because auto-following can strip the Authorization header — the URN is read
   * straight off the Location, no second request needed. A stack that followed
   * anyway hands us the resource body, so 200 JSON is accepted too.
   */
  private async resolvePlaylistUrn(
    permalinkUrl: string,
    read?: PlaylistReadOptions,
  ): Promise<string | null> {
    throwIfPreviewStopped(read);
    const token = await this.tokens.get();
    const res = await fetchWithRetry(
      this.fetchImpl,
      `${this.apiBase}/resolve?url=${encodeURIComponent(permalinkUrl)}`,
      {
        headers: { Authorization: `OAuth ${token}`, Accept: 'application/json' },
        redirect: 'manual',
      },
      previewRetry(this.retry, read),
    );
    if (res.status === 401) throw new SoundCloudUnauthorizedError();
    if (res.status === 404) return null;
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers?.get('location');
      if (!location) {
        throw new ProviderError('soundcloud', 'SoundCloud /resolve redirected without a Location.');
      }
      return playlistUrnFromResourceUrl(location, this.apiBase);
    }
    if (res.ok) {
      const parsed = scResolvedResourceSchema.safeParse(await readJson(res, 'soundcloud'));
      if (!parsed.success) {
        throw new ProviderError('soundcloud', 'SoundCloud /resolve returned an unexpected shape.');
      }
      if (parsed.data.kind !== 'playlist') return null;
      return parsed.data.urn ?? (parsed.data.id !== undefined ? String(parsed.data.id) : null);
    }
    throw new ProviderError('soundcloud', `SoundCloud API ${res.status} for /resolve`);
  }

  /** GET against the API with a valid app token; throws on non-ok (except opt-in 404). */
  private async apiGet(path: string, opts?: { allow404: boolean }): Promise<unknown> {
    const token = await this.tokens.get();
    const res = await fetchWithRetry(
      this.fetchImpl,
      `${this.apiBase}${path}`,
      { headers: { Authorization: `OAuth ${token}`, Accept: 'application/json' } },
      this.retry,
    );
    if (opts?.allow404 && res.status === 404) return null;
    if (!res.ok) {
      throw new ProviderError('soundcloud', `SoundCloud API ${res.status} for ${path}`);
    }
    return readJson(res, 'soundcloud');
  }
}

/**
 * Thrown when SoundCloud rejects a **user** token with 401 — the signal `apps/api`
 * uses to refresh the stored token once and retry. (App-token calls inside the
 * adapter never surface this; they re-mint on their own cache miss.)
 */
export class SoundCloudUnauthorizedError extends Error {
  readonly status = 401 as const;
  constructor() {
    super('SoundCloud rejected the user token (401).');
    this.name = 'SoundCloudUnauthorizedError';
  }
}

/**
 * Fetch the connected user's liked tracks with a **per-user** access token
 * (`music_connections`), mapped to the shared contract — the "search my
 * SoundCloud" surface. Stays a pure adapter: the caller owns the token's
 * decryption, refresh, and persistence. Throws `SoundCloudUnauthorizedError` on
 * 401 so the caller can refresh + retry; throws on any other non-ok.
 */
export async function fetchSoundCloudLikes(cfg: {
  accessToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  /** Stop after this many raw rows so liked-track reads stay bounded. */
  maxTracks?: number;
  /** Page size override for tests; SoundCloud pages are bounded to 50. */
  limit?: number;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxTracks ?? 200;
  const pageLimit = Math.min(cfg.limit ?? LIKES_LIMIT, SOUNDCLOUD_PAGE_LIMIT, cap);
  const rows = await fetchSoundCloudPagedCollection({
    firstUrl:
      `${base}/me/likes/tracks?limit=${pageLimit}` + '&linked_partitioning=true&access=playable',
    accessToken: cfg.accessToken,
    fetchImpl: cfg.fetchImpl,
    parsePage: (json) => {
      const parsed = scSearchSchema.safeParse(json);
      if (!parsed.success) return null;
      if (Array.isArray(parsed.data)) return { rows: parsed.data, nextUrl: null };
      return { rows: parsed.data.collection, nextUrl: parsed.data.next_href ?? null };
    },
    errorPath: '/me/likes/tracks',
    cap,
  });
  return rows.map((item) => toCandidate(item)).filter((r): r is TrackSearchResult => r !== null);
}

/**
 * Paths a liked-tracks continuation may name. SoundCloud documents that a
 * `next_href` keeps the request's path and swaps the query for a `cursor`
 * (developers.soundcloud.com/blog/pagination-updates-on-our-api), so ours is
 * `/me/likes/tracks`; `/users/{user_urn}/likes/tracks` is the same resource in the
 * public OpenAPI spec, allowed in case SoundCloud resolves `/me` to the user.
 */
const LIKES_CONTINUATION_PATH = /^\/(me|users\/(soundcloud:users:)?[0-9]+)\/likes\/tracks$/;

/**
 * True when `url` is a liked-tracks continuation we may follow with the user's
 * token: an absolute URL on the SoundCloud API origin, no embedded credentials,
 * and a likes-tracks path.
 */
function isLikesContinuation(url: string, base: string): boolean {
  let parsed: InstanceType<typeof URL>;
  let api: InstanceType<typeof URL>;
  try {
    parsed = new URL(url);
    api = new URL(base);
  } catch {
    return false;
  }
  if (parsed.origin !== api.origin) return false;
  if (parsed.username || parsed.password) return false;
  return LIKES_CONTINUATION_PATH.test(parsed.pathname);
}

/**
 * Read one bounded page of the user's SoundCloud liked tracks, starting at
 * `cursor` (SoundCloud's own `next_href` from a previous page) or at the first
 * page. Returns whole SoundCloud pages, so `next` resumes exactly where this page
 * stopped. A `cursor` on another host or path is rejected with
 * `InvalidProviderCursorError` before the user's token is sent anywhere.
 */
export async function fetchSoundCloudLikesPage(
  cfg: {
    accessToken: string;
    fetchImpl: FetchLike;
    apiBase?: string;
    cursor?: string | null;
    /** Page size override for tests; defaults to 50. */
    limit?: number;
  } & LibraryPageOptions,
): Promise<ProviderTrackPage> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  if (cfg.cursor != null && !isLikesContinuation(cfg.cursor, base)) {
    throw new InvalidProviderCursorError('soundcloud');
  }
  const pageLimit = Math.min(cfg.limit ?? LIKES_LIMIT, SOUNDCLOUD_PAGE_LIMIT);
  const { rows, nextUrl } = await readSoundCloudPages({
    firstUrl:
      cfg.cursor ??
      `${base}/me/likes/tracks?limit=${pageLimit}` + '&linked_partitioning=true&access=playable',
    accessToken: cfg.accessToken,
    fetchImpl: cfg.fetchImpl,
    parsePage: parseSoundCloudTrackPage,
    errorPath: '/me/likes/tracks',
    cap: Number.POSITIVE_INFINITY,
    targetRows: cfg.targetTracks ?? 200,
    maxPages: cfg.maxPages ?? 8,
    isContinuation: (url) => isLikesContinuation(url, base),
  });
  return {
    tracks: rows.map((item) => toCandidate(item)).filter((r): r is TrackSearchResult => r !== null),
    next: nextUrl,
  };
}

/** Read a connected user's SoundCloud playlists for browse shelves. */
export async function fetchSoundCloudPlaylists(cfg: {
  accessToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  /** Stop after this many playlists so browse reads stay bounded. */
  maxPlaylists?: number;
  /** Page size override for tests; SoundCloud pages are bounded to 50. */
  limit?: number;
}): Promise<ProviderPlaylistSummary[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxPlaylists ?? 100;
  const pageLimit = Math.min(cfg.limit ?? SOUNDCLOUD_PAGE_LIMIT, SOUNDCLOUD_PAGE_LIMIT, cap);
  const rows = await fetchSoundCloudPagedCollection({
    firstUrl: `${base}/me/playlists?limit=${pageLimit}&linked_partitioning=true`,
    accessToken: cfg.accessToken,
    fetchImpl: cfg.fetchImpl,
    parsePage: (json) => {
      const parsed = scPlaylistListSchema.safeParse(json);
      if (!parsed.success) return null;
      if (Array.isArray(parsed.data)) return { rows: parsed.data, nextUrl: null };
      return { rows: parsed.data.collection, nextUrl: parsed.data.next_href ?? null };
    },
    errorPath: '/me/playlists',
    cap,
  });

  return rows
    .map((row) => toPlaylistSummary(row))
    .filter((row): row is ProviderPlaylistSummary => row !== null);
}

/** Read tracks in one SoundCloud playlist id with a per-user token. */
export async function fetchSoundCloudPlaylistTracks(cfg: {
  accessToken: string;
  playlistId: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  /** Stop after this many tracks so detail reads stay bounded. */
  maxTracks?: number;
  /** Page size override for tests; SoundCloud pages are bounded to 50. */
  limit?: number;
  /**
   * Saved-playlist import stop. Checked after a page, before the next request.
   * When set, the browse cap does not apply.
   */
  shouldStop?: (tracks: TrackSearchResult[]) => boolean;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const id = encodeURIComponent(cfg.playlistId);
  const cap = cfg.shouldStop ? Number.MAX_SAFE_INTEGER : (cfg.maxTracks ?? 200);
  const pageLimit = Math.min(cfg.limit ?? SOUNDCLOUD_PAGE_LIMIT, SOUNDCLOUD_PAGE_LIMIT, cap);
  // SoundCloud can truncate embedded playlist `tracks`; read the playlist-track
  // collection endpoint with linked partitioning so large playlists stay complete.
  const rows = await fetchSoundCloudPagedCollection({
    firstUrl: `${base}/playlists/${id}/tracks?limit=${pageLimit}&linked_partitioning=true`,
    accessToken: cfg.accessToken,
    fetchImpl: cfg.fetchImpl,
    parsePage: (json) => {
      const parsed = scPagedTracksSchema.safeParse(json);
      if (!parsed.success) return null;
      if (Array.isArray(parsed.data)) return { rows: parsed.data, nextUrl: null };
      return { rows: parsed.data.collection, nextUrl: parsed.data.next_href ?? null };
    },
    errorPath: '/playlists/:id/tracks',
    cap,
    allow404: true,
    shouldStop: cfg.shouldStop
      ? (rows) =>
          cfg.shouldStop!(
            rows
              .map((item) => toCandidate(item))
              .filter((row): row is TrackSearchResult => row !== null),
          )
      : undefined,
  });

  return rows
    .map((item) => toCandidate(item))
    .filter((row): row is TrackSearchResult => row !== null);
}

async function fetchSoundCloudPagedCollection(
  cfg: SoundCloudPageRead & {
    allow404?: boolean;
    /** After a full page, stop before requesting `next_href`. */
    shouldStop?: (rows: unknown[]) => boolean;
  },
): Promise<unknown[]> {
  return (await readSoundCloudPages(cfg)).rows;
}

interface SoundCloudPageRead {
  firstUrl: string;
  accessToken: string;
  fetchImpl: FetchLike;
  parsePage: (json: unknown) => { rows: unknown[]; nextUrl: string | null } | null;
  errorPath: string;
  cap: number;
}

/**
 * Follow SoundCloud's `next_href` from `firstUrl`. Stops on the first of: no
 * `next_href`, an empty page, `cap` rows (truncating inside a page), `shouldStop`,
 * or — at a page boundary — `targetRows` rows or `maxPages` pages. `nextUrl` is
 * SoundCloud's own continuation for the page it did not read.
 */
async function readSoundCloudPages(
  cfg: SoundCloudPageRead & {
    allow404?: boolean;
    shouldStop?: (rows: unknown[]) => boolean;
    targetRows?: number;
    maxPages?: number;
    /** When set, a `next_href` this rejects is upstream drift and throws. */
    isContinuation?: (url: string) => boolean;
  },
): Promise<{ rows: unknown[]; nextUrl: string | null }> {
  const out: unknown[] = [];
  let nextUrl: string | null = cfg.firstUrl;
  const targetRows = cfg.targetRows ?? Number.POSITIVE_INFINITY;
  const maxPages = cfg.maxPages ?? Number.POSITIVE_INFINITY;
  let pages = 0;

  while (nextUrl && out.length < cfg.cap) {
    if (out.length >= targetRows || pages >= maxPages) break;
    const res = await cfg.fetchImpl(nextUrl, {
      headers: { Authorization: `OAuth ${cfg.accessToken}`, Accept: 'application/json' },
    });
    if (res.status === 401) throw new SoundCloudUnauthorizedError();
    if (cfg.allow404 && res.status === 404) return { rows: [], nextUrl: null };
    if (!res.ok)
      throw new ProviderError('soundcloud', `SoundCloud API ${res.status} for ${cfg.errorPath}`);

    const page = cfg.parsePage(await readJson(res, 'soundcloud'));
    if (!page) {
      throw new ProviderError(
        'soundcloud',
        `SoundCloud returned an invalid page for ${cfg.errorPath}.`,
      );
    }
    pages += 1;

    for (const row of page.rows) {
      out.push(row);
      if (out.length >= cfg.cap) break;
    }
    if (page.rows.length === 0) {
      nextUrl = null;
      break;
    }
    if (page.nextUrl !== null && cfg.isContinuation && !cfg.isContinuation(page.nextUrl)) {
      throw new ProviderError(
        'soundcloud',
        `SoundCloud returned an unexpected pagination link for ${cfg.errorPath}.`,
      );
    }
    nextUrl = page.nextUrl;
    if (cfg.shouldStop?.(out)) break;
  }

  return { rows: out, nextUrl };
}

function parseSoundCloudTrackPage(
  json: unknown,
): { rows: unknown[]; nextUrl: string | null } | null {
  const parsed = scPagedTracksSchema.safeParse(json);
  if (!parsed.success) return null;
  if (Array.isArray(parsed.data)) return { rows: parsed.data, nextUrl: null };
  return { rows: parsed.data.collection, nextUrl: parsed.data.next_href ?? null };
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

function toPlaylistSummary(raw: unknown): ProviderPlaylistSummary | null {
  const pl = scPlaylistSchema.safeParse(raw);
  if (!pl.success) return null;
  const providerPlaylistId = pl.data.urn ?? pl.data.id;
  if (providerPlaylistId === undefined) return null;
  const item = providerPlaylistSummarySchema.safeParse({
    provider: 'soundcloud',
    playlistId: String(providerPlaylistId),
    providerUri: pl.data.permalink_url ?? null,
    name: pl.data.title ?? 'Untitled playlist',
    ownerName: pl.data.user?.username ?? null,
    trackCount: pl.data.track_count ?? null,
    coverImageUrl: pl.data.artwork_url ?? null,
  });
  return item.success ? item.data : null;
}

/** Map a raw SoundCloud track to a contract candidate, or null if it can't be one. */
function toCandidate(raw: unknown): TrackSearchResult | null {
  const parsed = scTrackSchema.safeParse(raw);
  if (!parsed.success) return null;
  const t: ScTrack = parsed.data;
  const providerTrackId = t.urn ?? t.id;
  if (providerTrackId === undefined) return null;
  const candidate = {
    provider: 'soundcloud' as const,
    providerTrackId: String(providerTrackId),
    providerUri: t.permalink_url ?? null, // deep-link target for live hand-off
    title: t.title ?? '',
    artist: t.user?.username ?? '',
    albumArtUrl: t.artwork_url ?? null,
    durationMs: typeof t.duration === 'number' && t.duration > 0 ? t.duration : null,
  };
  // Validate against the shared contract; drop anything that doesn't satisfy it
  // (e.g. missing title/artist) rather than leaking a malformed candidate.
  const result = trackSearchResultSchema.safeParse(candidate);
  return result.success ? result.data : null;
}
