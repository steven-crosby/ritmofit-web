/**
 * Apple Music provider adapter (M2) — catalog search + lookup behind the
 * `MusicProvider` interface, mapping Apple Music song JSON → the shared
 * `TrackSearchResult`.
 *
 * Distinct from "Sign in with Apple" (that's auth, handled by Better Auth). This
 * is MusicKit / Apple Music catalog access, authorized by a **developer token**
 * (an ES256 JWT signed with the Apple Music `.p8` key). Signing happens out of
 * band — the app passes the ready token in (the `.p8` stays at the untracked
 * workspace root, never in a tracked repo). We surface references + display
 * metadata only; never audio, never provider BPM (music-providers.md).
 *
 * Network is injectable (`fetchImpl`) so the mapping is unit-tested with no live
 * calls; re-verify endpoints/shapes against live docs when a real token lands.
 */
import { trackSearchResultSchema, type TrackSearchResult } from '@ritmofit/shared';
import { z } from 'zod';
import type { FetchLike, MusicProvider } from './provider.js';
import { readJson, ProviderError } from './errors.js';

const DEFAULT_API_BASE = 'https://api.music.apple.com/v1';
const DEFAULT_STOREFRONT = 'us';
const SEARCH_LIMIT = 25;

export interface AppleMusicConfig {
  /** ES256 developer-token JWT (signed out of band from the `.p8` key). */
  developerToken: string;
  fetchImpl: FetchLike;
  /** ISO storefront, e.g. 'us'. Defaults to 'us'. */
  storefront?: string;
  apiBase?: string;
}

/** One Apple Music song (permissive — unknown fields ignored). */
const amSongSchema = z.object({
  id: z.string(),
  attributes: z
    .object({
      name: z.string().optional(),
      artistName: z.string().optional(),
      durationInMillis: z.number().optional(),
      url: z.string().optional(),
      artwork: z.object({ url: z.string(), width: z.number().optional(), height: z.number().optional() }).optional(),
    })
    .optional(),
});
type AmSong = z.infer<typeof amSongSchema>;

const amSearchSchema = z.object({
  results: z.object({ songs: z.object({ data: z.array(z.unknown()) }).optional() }).optional(),
});
const amLookupSchema = z.object({ data: z.array(z.unknown()).optional() });

export function createAppleMusicProvider(config: AppleMusicConfig): MusicProvider {
  return new AppleMusicProvider(config);
}

class AppleMusicProvider implements MusicProvider {
  readonly provider = 'apple_music' as const;

  private readonly developerToken: string;
  private readonly fetchImpl: FetchLike;
  private readonly storefront: string;
  private readonly apiBase: string;

  constructor(config: AppleMusicConfig) {
    this.developerToken = config.developerToken;
    this.fetchImpl = config.fetchImpl;
    this.storefront = config.storefront ?? DEFAULT_STOREFRONT;
    this.apiBase = config.apiBase ?? DEFAULT_API_BASE;
  }

  async search(query: string): Promise<TrackSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `${this.apiBase}/catalog/${this.storefront}/search?term=${encodeURIComponent(q)}&types=songs&limit=${SEARCH_LIMIT}`;
    const json = await this.authedGet(url);
    const parsed = amSearchSchema.safeParse(json);
    const data = parsed.success ? (parsed.data.results?.songs?.data ?? []) : [];
    return data.map((raw) => this.toCandidate(raw)).filter((c): c is TrackSearchResult => c !== null);
  }

  async lookup(providerTrackId: string): Promise<TrackSearchResult | null> {
    const url = `${this.apiBase}/catalog/${this.storefront}/songs/${encodeURIComponent(providerTrackId)}`;
    const json = await this.authedGet(url);
    const parsed = amLookupSchema.safeParse(json);
    const first = parsed.success ? parsed.data.data?.[0] : undefined;
    return first ? this.toCandidate(first) : null;
  }

  /** Map an Apple Music song → contract candidate, or null if it can't satisfy the schema. */
  private toCandidate(raw: unknown): TrackSearchResult | null {
    const parsed = amSongSchema.safeParse(raw);
    if (!parsed.success) return null;
    const t: AmSong = parsed.data;
    const a = t.attributes;
    const candidate = {
      provider: 'apple_music' as const,
      providerTrackId: t.id,
      providerUri: a?.url ?? null,
      title: a?.name ?? '',
      artist: a?.artistName ?? '',
      albumArtUrl: a?.artwork ? renderArtwork(a.artwork) : null,
      durationMs: a?.durationInMillis ?? null,
    };
    const out = trackSearchResultSchema.safeParse(candidate);
    return out.success ? out.data : null;
  }

  private async authedGet(url: string): Promise<unknown> {
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.developerToken}` },
    });
    if (!res.ok) throw new ProviderError('apple_music', `Apple Music request failed: ${res.status}`);
    return readJson(res, 'apple_music');
  }
}

/** Apple artwork URLs are templates with `{w}`/`{h}` placeholders — bind a concrete size. */
function renderArtwork(artwork: { url: string; width?: number; height?: number }): string {
  const w = Math.min(artwork.width ?? 512, 512);
  const h = Math.min(artwork.height ?? 512, 512);
  return artwork.url.replace('{w}', String(w)).replace('{h}', String(h));
}
