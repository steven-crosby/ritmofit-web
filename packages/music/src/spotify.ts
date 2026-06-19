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
import { readJson, ProviderError } from './errors.js';
import { AppTokenCache } from './app-token.js';

const DEFAULT_API_BASE = 'https://api.spotify.com/v1';
const DEFAULT_TOKEN_URL = 'https://accounts.spotify.com/api/token';
// Spotify's docs say search `limit` may be 0–50, but the client-credentials flow
// now rejects higher values with 400 "Invalid limit" (verified in prod); 10 is a
// safe, ample page for the add-track picker.
const SEARCH_LIMIT = 10;

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  tokenUrl?: string;
  now?: () => number;
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

export function createSpotifyProvider(config: SpotifyConfig): MusicProvider {
  return new SpotifyProvider(config);
}

class SpotifyProvider implements MusicProvider {
  readonly provider = 'spotify' as const;

  private readonly fetchImpl: FetchLike;
  private readonly apiBase: string;
  private readonly tokens: AppTokenCache;

  constructor(config: SpotifyConfig) {
    this.fetchImpl = config.fetchImpl;
    this.apiBase = config.apiBase ?? DEFAULT_API_BASE;
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

  async getPlaylist(playlistId: string): Promise<TrackSearchResult[]> {
    const json = await this.authedGet(
      `${this.apiBase}/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`,
    );
    const parsed = z.object({ items: z.array(z.object({ track: z.unknown() })) }).safeParse(json);
    if (!parsed.success) return [];
    return parsed.data.items
      .map((item) => this.toCandidate(item.track))
      .filter((c): c is TrackSearchResult => c !== null);
  }

  /** Map a Spotify track object → contract candidate, or null if it can't satisfy the schema. */
  private toCandidate(raw: unknown): TrackSearchResult | null {
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

  private async authedGet(url: string): Promise<unknown> {
    const token = await this.tokens.get();
    const res = await this.fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      // One forced refresh on a 401 in case the cached token went stale early.
      if (res.status === 401) {
        this.tokens.invalidate();
        const retry = await this.fetchImpl(url, {
          headers: { Authorization: `Bearer ${await this.tokens.get()}` },
        });
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
