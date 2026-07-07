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
  providerPlaylistSummarySchema,
  trackSearchResultSchema,
  type ProviderPlaylistSummary,
  type TrackSearchResult,
} from '@ritmofit/shared';
import { z } from 'zod';
import type { FetchLike, MusicProvider } from './provider.js';
import { readJson, ProviderError } from './errors.js';
import { AppTokenCache } from './app-token.js';
import { fetchWithRetry, type RetryOptions } from './retry.js';

const DEFAULT_API_BASE = 'https://api.soundcloud.com';
const DEFAULT_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
const SEARCH_LIMIT = 25;
const LIKES_LIMIT = 50;

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

/** One SoundCloud track (permissive — unknown fields are ignored). */
const scTrackSchema = z.object({
  id: z.number(),
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
  z.object({ collection: z.array(z.unknown()) }),
]);

const scPlaylistSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  permalink_url: z.string().optional(),
  artwork_url: z.string().nullable().optional(),
  track_count: z.number().int().nonnegative().optional(),
  user: z.object({ username: z.string().optional() }).optional(),
  tracks: z.array(z.unknown()).optional(),
});

const scPlaylistListSchema = z.union([
  z.array(z.unknown()),
  z.object({ collection: z.array(z.unknown()) }),
]);

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

  async getPlaylist(playlistId: string): Promise<TrackSearchResult[]> {
    const id = encodeURIComponent(playlistId);
    const body = await this.apiGet(`/playlists/${id}`, { allow404: true });
    if (body === null) return [];
    const parsed = z.object({ tracks: z.array(z.unknown()) }).safeParse(body);
    if (!parsed.success) return [];
    return parsed.data.tracks
      .map((item) => toCandidate(item))
      .filter((r): r is TrackSearchResult => r !== null);
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
  limit?: number;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const limit = cfg.limit ?? LIKES_LIMIT;
  const params = `limit=${limit}&linked_partitioning=true&access=playable`;
  const res = await cfg.fetchImpl(`${base}/me/likes/tracks?${params}`, {
    headers: { Authorization: `OAuth ${cfg.accessToken}`, Accept: 'application/json' },
  });
  if (res.status === 401) throw new SoundCloudUnauthorizedError();
  if (!res.ok)
    throw new ProviderError('soundcloud', `SoundCloud API ${res.status} for /me/likes/tracks`);
  const parsed = scSearchSchema.safeParse(await readJson(res, 'soundcloud'));
  if (!parsed.success) return [];
  const raw = Array.isArray(parsed.data) ? parsed.data : parsed.data.collection;
  return raw.map((item) => toCandidate(item)).filter((r): r is TrackSearchResult => r !== null);
}

/** Read a connected user's SoundCloud playlists for browse shelves. */
export async function fetchSoundCloudPlaylists(cfg: {
  accessToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  limit?: number;
}): Promise<ProviderPlaylistSummary[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const limit = cfg.limit ?? 50;
  const params = `limit=${limit}&linked_partitioning=true`;
  const res = await cfg.fetchImpl(`${base}/me/playlists?${params}`, {
    headers: { Authorization: `OAuth ${cfg.accessToken}`, Accept: 'application/json' },
  });
  if (res.status === 401) throw new SoundCloudUnauthorizedError();
  if (!res.ok)
    throw new ProviderError('soundcloud', `SoundCloud API ${res.status} for /me/playlists`);

  const parsed = scPlaylistListSchema.safeParse(await readJson(res, 'soundcloud'));
  if (!parsed.success) return [];
  const rows = Array.isArray(parsed.data) ? parsed.data : parsed.data.collection;
  return rows
    .map((row) => {
      const pl = scPlaylistSchema.safeParse(row);
      if (!pl.success) return null;
      const item = providerPlaylistSummarySchema.safeParse({
        provider: 'soundcloud',
        playlistId: String(pl.data.id),
        name: pl.data.title ?? 'Untitled playlist',
        ownerName: pl.data.user?.username ?? null,
        trackCount: pl.data.track_count ?? 0,
        coverImageUrl: pl.data.artwork_url ?? null,
      });
      return item.success ? item.data : null;
    })
    .filter((row): row is ProviderPlaylistSummary => row !== null);
}

/** Read tracks in one SoundCloud playlist id with a per-user token. */
export async function fetchSoundCloudPlaylistTracks(cfg: {
  accessToken: string;
  playlistId: string;
  fetchImpl: FetchLike;
  apiBase?: string;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const id = encodeURIComponent(cfg.playlistId);
  const res = await cfg.fetchImpl(`${base}/playlists/${id}`, {
    headers: { Authorization: `OAuth ${cfg.accessToken}`, Accept: 'application/json' },
  });
  if (res.status === 401) throw new SoundCloudUnauthorizedError();
  if (res.status === 404) return [];
  if (!res.ok)
    throw new ProviderError('soundcloud', `SoundCloud API ${res.status} for /playlists/:id`);
  const parsed = scPlaylistSchema.safeParse(await readJson(res, 'soundcloud'));
  if (!parsed.success) return [];
  return (parsed.data.tracks ?? [])
    .map((item) => toCandidate(item))
    .filter((row): row is TrackSearchResult => row !== null);
}

/** Map a raw SoundCloud track to a contract candidate, or null if it can't be one. */
function toCandidate(raw: unknown): TrackSearchResult | null {
  const parsed = scTrackSchema.safeParse(raw);
  if (!parsed.success) return null;
  const t: ScTrack = parsed.data;
  const candidate = {
    provider: 'soundcloud' as const,
    providerTrackId: String(t.id),
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
