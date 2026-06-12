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
import { trackSearchResultSchema, type TrackSearchResult } from '@ritmofit/shared';
import { z } from 'zod';
import type { FetchLike, MusicProvider } from './provider.js';
import { readJson } from './errors.js';
import { AppTokenCache } from './app-token.js';

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

export function createSoundCloudProvider(config: SoundCloudConfig): MusicProvider {
  return new SoundCloudProvider(config);
}

class SoundCloudProvider implements MusicProvider {
  readonly provider = 'soundcloud' as const;

  private readonly fetchImpl: FetchLike;
  private readonly apiBase: string;
  private readonly tokens: AppTokenCache;

  constructor(config: SoundCloudConfig) {
    this.fetchImpl = config.fetchImpl;
    this.apiBase = config.apiBase ?? DEFAULT_API_BASE;
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

  /** GET against the API with a valid app token; throws on non-ok (except opt-in 404). */
  private async apiGet(path: string, opts?: { allow404: boolean }): Promise<unknown> {
    const token = await this.tokens.get();
    const res = await this.fetchImpl(`${this.apiBase}${path}`, {
      headers: { Authorization: `OAuth ${token}`, Accept: 'application/json' },
    });
    if (opts?.allow404 && res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`SoundCloud API ${res.status} for ${path}`);
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
  if (!res.ok) throw new Error(`SoundCloud API ${res.status} for /me/likes/tracks`);
  const parsed = scSearchSchema.safeParse(await readJson(res, 'soundcloud'));
  if (!parsed.success) return [];
  const raw = Array.isArray(parsed.data) ? parsed.data : parsed.data.collection;
  return raw.map((item) => toCandidate(item)).filter((r): r is TrackSearchResult => r !== null);
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
