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

// `btoa` is available in both the Workers runtime and Node ≥18 (vitest). Declared
// here so the package needs no DOM/Workers ambient lib.
declare const btoa: (data: string) => string;

const DEFAULT_API_BASE = 'https://api.soundcloud.com';
const DEFAULT_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
const TOKEN_SKEW_MS = 30_000; // refresh a bit early to avoid edge-of-expiry 401s
const SEARCH_LIMIT = 25;

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

/** SoundCloud's token response (we read only what we need). */
const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

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

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: FetchLike;
  private readonly apiBase: string;
  private readonly tokenUrl: string;
  private readonly now: () => number;

  private cachedToken: { value: string; expiresAtMs: number } | null = null;

  constructor(config: SoundCloudConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.fetchImpl = config.fetchImpl;
    this.apiBase = config.apiBase ?? DEFAULT_API_BASE;
    this.tokenUrl = config.tokenUrl ?? DEFAULT_TOKEN_URL;
    this.now = config.now ?? (() => Date.now());
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
    const token = await this.appToken();
    const res = await this.fetchImpl(`${this.apiBase}${path}`, {
      headers: { Authorization: `OAuth ${token}`, Accept: 'application/json' },
    });
    if (opts?.allow404 && res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`SoundCloud API ${res.status} for ${path}`);
    }
    return res.json();
  }

  /** Client-credentials app token, cached in-isolate until shortly before expiry. */
  private async appToken(): Promise<string> {
    if (this.cachedToken && this.now() < this.cachedToken.expiresAtMs) {
      return this.cachedToken.value;
    }
    const basic = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await this.fetchImpl(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      throw new Error(`SoundCloud token request failed (${res.status})`);
    }
    const token = tokenResponseSchema.parse(await res.json());
    const ttlMs = (token.expires_in ?? 3600) * 1000;
    this.cachedToken = { value: token.access_token, expiresAtMs: this.now() + ttlMs - TOKEN_SKEW_MS };
    return token.access_token;
  }
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
