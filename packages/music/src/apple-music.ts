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
import { fetchWithRetry, type RetryOptions } from './retry.js';

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
  /** Retry tuning for transient (429/5xx) reads; tests inject a no-op sleep. */
  retry?: RetryOptions;
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
      artwork: z
        .object({ url: z.string(), width: z.number().optional(), height: z.number().optional() })
        .optional(),
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
  private readonly retry?: RetryOptions;

  constructor(config: AppleMusicConfig) {
    this.developerToken = config.developerToken;
    this.fetchImpl = config.fetchImpl;
    this.storefront = config.storefront ?? DEFAULT_STOREFRONT;
    this.apiBase = config.apiBase ?? DEFAULT_API_BASE;
    this.retry = config.retry;
  }

  async search(query: string): Promise<TrackSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `${this.apiBase}/catalog/${this.storefront}/search?term=${encodeURIComponent(q)}&types=songs&limit=${SEARCH_LIMIT}`;
    const json = await this.authedGet(url);
    const parsed = amSearchSchema.safeParse(json);
    const data = parsed.success ? (parsed.data.results?.songs?.data ?? []) : [];
    return data
      .map((raw) => this.toCandidate(raw))
      .filter((c): c is TrackSearchResult => c !== null);
  }

  async lookup(providerTrackId: string): Promise<TrackSearchResult | null> {
    const url = `${this.apiBase}/catalog/${this.storefront}/songs/${encodeURIComponent(providerTrackId)}`;
    const json = await this.authedGet(url);
    const parsed = amLookupSchema.safeParse(json);
    const first = parsed.success ? parsed.data.data?.[0] : undefined;
    return first ? this.toCandidate(first) : null;
  }

  async getPlaylist(): Promise<TrackSearchResult[]> {
    return []; // Not implemented for Apple Music
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
    const res = await fetchWithRetry(
      this.fetchImpl,
      url,
      { headers: { Authorization: `Bearer ${this.developerToken}` } },
      this.retry,
    );
    if (!res.ok)
      throw new ProviderError('apple_music', `Apple Music request failed: ${res.status}`);
    return readJson(res, 'apple_music');
  }
}

/** Apple artwork URLs are templates with `{w}`/`{h}` placeholders — bind a concrete size. */
function renderArtwork(artwork: { url: string; width?: number; height?: number }): string {
  const w = Math.min(artwork.width ?? 512, 512);
  const h = Math.min(artwork.height ?? 512, 512);
  return artwork.url.replace('{w}', String(w)).replace('{h}', String(h));
}

const LIBRARY_PAGE_LIMIT = 100;

/** A library song carries a `playParams.catalogId` linking back to the catalog id. */
const amLibrarySongSchema = z.object({
  id: z.string(),
  attributes: z
    .object({
      name: z.string().optional(),
      artistName: z.string().optional(),
      durationInMillis: z.number().optional(),
      url: z.string().optional(),
      playParams: z.object({ catalogId: z.string().optional() }).optional(),
      artwork: z
        .object({ url: z.string(), width: z.number().optional(), height: z.number().optional() })
        .optional(),
    })
    .optional(),
});
const amLibraryPageSchema = z.object({
  data: z.array(z.unknown()).optional(),
  next: z.string().optional(),
});

/**
 * Thrown when Apple Music rejects the **Music-User-Token** with 401/403 — the
 * signal `apps/api` uses to ask the user to reconnect. Unlike OAuth there is no
 * server-side refresh: a stale Music-User-Token is re-minted by MusicKit in the
 * browser, so the caller surfaces a reconnect rather than retrying.
 */
export class AppleMusicUnauthorizedError extends Error {
  readonly status = 401 as const;
  constructor() {
    super('Apple Music rejected the user token (401/403).');
    this.name = 'AppleMusicUnauthorizedError';
  }
}

/** Map a raw Apple Music **library** song → contract candidate (prefers the catalog id). */
function toLibraryCandidate(raw: unknown): TrackSearchResult | null {
  const parsed = amLibrarySongSchema.safeParse(raw);
  if (!parsed.success) return null;
  const t = parsed.data;
  const a = t.attributes;
  const candidate = {
    provider: 'apple_music' as const,
    // Prefer the catalog id so an imported library track matches catalog search;
    // fall back to the library id for songs without a catalog equivalent.
    providerTrackId: a?.playParams?.catalogId ?? t.id,
    providerUri: a?.url ?? null,
    title: a?.name ?? '',
    artist: a?.artistName ?? '',
    albumArtUrl: a?.artwork ? renderArtwork(a.artwork) : null,
    durationMs: a?.durationInMillis ?? null,
  };
  const out = trackSearchResultSchema.safeParse(candidate);
  return out.success ? out.data : null;
}

/**
 * Fetch the connected user's Apple Music **library** songs with the app's
 * developer token (Bearer) plus the user's Music-User-Token, mapped to the shared
 * contract — the "search my Apple Music" surface. Pure adapter: the caller owns the
 * token's decryption and the developer-token signing. Throws
 * `AppleMusicUnauthorizedError` on 401/403 (reconnect signal); throws on any other
 * non-ok. Paginates Apple's cursor (`next`).
 */
export async function fetchAppleMusicLibrarySongs(cfg: {
  developerToken: string;
  musicUserToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  /** Stop after this many tracks so a huge library can't run unbounded. */
  maxTracks?: number;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxTracks ?? 200;
  const out: TrackSearchResult[] = [];
  // Apple returns a relative `next` path (e.g. `/v1/me/library/songs?offset=100`).
  const origin = base.replace(/\/v1$/, '');
  let path: string | null = `/v1/me/library/songs?limit=${LIBRARY_PAGE_LIMIT}`;

  while (path && out.length < cap) {
    const res = await cfg.fetchImpl(`${origin}${path}`, {
      headers: {
        Authorization: `Bearer ${cfg.developerToken}`,
        'Music-User-Token': cfg.musicUserToken,
      },
    });
    if (res.status === 401 || res.status === 403) throw new AppleMusicUnauthorizedError();
    if (!res.ok)
      throw new ProviderError('apple_music', `Apple Music API ${res.status} for /me/library/songs`);
    const parsed = amLibraryPageSchema.safeParse(await readJson(res, 'apple_music'));
    if (!parsed.success) break;
    const page = parsed.data.data ?? [];
    for (const raw of page) {
      const candidate = toLibraryCandidate(raw);
      if (candidate) out.push(candidate);
    }
    // Guard against a non-advancing `next` cursor (e.g. a page that returns no
    // rows but still hands back a `next`): without this the `out.length < cap`
    // bound never trips and the loop would spin forever. Mirrors the Spotify
    // adapter's empty-page break.
    if (page.length === 0) break;
    path = parsed.data.next ?? null;
  }
  return out;
}
