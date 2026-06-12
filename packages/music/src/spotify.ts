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
import { trackSearchResultSchema, type TrackSearchResult } from '@ritmofit/shared';
import { z } from 'zod';
import type { FetchLike, MusicProvider } from './provider.js';

declare const btoa: (data: string) => string;

const DEFAULT_API_BASE = 'https://api.spotify.com/v1';
const DEFAULT_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const TOKEN_SKEW_MS = 30_000;
const SEARCH_LIMIT = 25;

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  tokenUrl?: string;
  now?: () => number;
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

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

export function createSpotifyProvider(config: SpotifyConfig): MusicProvider {
  return new SpotifyProvider(config);
}

class SpotifyProvider implements MusicProvider {
  readonly provider = 'spotify' as const;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: FetchLike;
  private readonly apiBase: string;
  private readonly tokenUrl: string;
  private readonly now: () => number;

  private cachedToken: { value: string; expiresAtMs: number } | null = null;

  constructor(config: SpotifyConfig) {
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
    const url = `${this.apiBase}/search?q=${encodeURIComponent(q)}&type=track&limit=${SEARCH_LIMIT}`;
    const json = await this.authedGet(url);
    const parsed = spSearchSchema.safeParse(json);
    const items = parsed.success ? (parsed.data.tracks?.items ?? []) : [];
    return items.map((raw) => this.toCandidate(raw)).filter((c): c is TrackSearchResult => c !== null);
  }

  async lookup(providerTrackId: string): Promise<TrackSearchResult | null> {
    const json = await this.authedGet(`${this.apiBase}/tracks/${encodeURIComponent(providerTrackId)}`);
    return this.toCandidate(json);
  }

  /** Map a Spotify track object → contract candidate, or null if it can't satisfy the schema. */
  private toCandidate(raw: unknown): TrackSearchResult | null {
    const parsed = spTrackSchema.safeParse(raw);
    if (!parsed.success) return null;
    const t: SpTrack = parsed.data;
    const artist = (t.artists ?? []).map((a) => a.name).filter(Boolean).join(', ');
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

  private async authedGet(url: string): Promise<unknown> {
    const token = await this.appToken();
    const res = await this.fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      // One forced refresh on a 401 in case the cached token went stale early.
      if (res.status === 401) {
        this.cachedToken = null;
        const retry = await this.fetchImpl(url, {
          headers: { Authorization: `Bearer ${await this.appToken()}` },
        });
        if (retry.ok) return retry.json();
      }
      throw new Error(`Spotify request failed: ${res.status}`);
    }
    return res.json();
  }

  private async appToken(): Promise<string> {
    if (this.cachedToken && this.now() < this.cachedToken.expiresAtMs - TOKEN_SKEW_MS) {
      return this.cachedToken.value;
    }
    const basic = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await this.fetchImpl(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
    const parsed = tokenResponseSchema.parse(await res.json());
    const ttl = (parsed.expires_in ?? 3600) * 1000;
    this.cachedToken = { value: parsed.access_token, expiresAtMs: this.now() + ttl };
    return parsed.access_token;
  }
}
