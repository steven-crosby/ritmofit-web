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
import {
  providerPlaylistSummarySchema,
  trackSearchResultSchema,
  type ProviderPlaylistSummary,
  type TrackSearchResult,
} from '@ritmofit/shared';
import { z } from 'zod';
import type { FetchLike, MusicProvider, PlaylistImportRef } from './provider.js';
import { readJson, ProviderError } from './errors.js';
import { fetchWithRetry, type RetryOptions } from './retry.js';

const DEFAULT_API_BASE = 'https://api.music.apple.com/v1';
const DEFAULT_STOREFRONT = 'us';
const SEARCH_LIMIT = 25;
// Catalog playlist-track pages allow up to 300 items. The raw cap sits far above
// the 100-distinct-song import limit, so a playlist truncated here always exceeds
// that limit after dedup and is rejected as too large — never silently imported
// as if complete.
const CATALOG_PLAYLIST_PAGE_LIMIT = 300;
const IMPORT_TRACK_CAP = 500;

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

  /**
   * Import a public **catalog** playlist (curated `pl.…` or shared-user
   * `pl.u-…` ids) with the developer token alone — no Music-User-Token. The
   * storefront comes from the pasted URL, since availability varies by country.
   * Pages the tracks relationship endpoint (`?include=tracks` truncates at 100)
   * following Apple's relative `next` cursor. [] on 404 — unknown id, or a
   * shared playlist its owner has since unshared. Library playlists never reach
   * here (the route rejects them; they're served by saved-playlist browsing).
   */
  async getPlaylist(ref: Extract<PlaylistImportRef, { provider: 'apple_music' }>) {
    const out: TrackSearchResult[] = [];
    // Apple returns a relative `next` subpath (e.g. `/v1/catalog/us/…?offset=100`,
    // without the custom limit — re-appended so page size stays consistent).
    const origin = this.apiBase.replace(/\/v1$/, '');
    let path: string | null =
      `/v1/catalog/${encodeURIComponent(ref.storefront)}/playlists/` +
      `${encodeURIComponent(ref.playlistId)}/tracks?limit=${CATALOG_PLAYLIST_PAGE_LIMIT}`;

    while (path && out.length < IMPORT_TRACK_CAP) {
      const res = await fetchWithRetry(
        this.fetchImpl,
        `${origin}${path}`,
        { headers: { Authorization: `Bearer ${this.developerToken}` } },
        this.retry,
      );
      if (res.status === 404) return [];
      if (!res.ok) {
        throw new ProviderError(
          'apple_music',
          `Apple Music API ${res.status} for /catalog/:storefront/playlists/:id/tracks`,
        );
      }
      const parsed = amLibraryPageSchema.safeParse(await readJson(res, 'apple_music'));
      if (!parsed.success) {
        throw new ProviderError('apple_music', 'Apple Music returned an invalid playlist page.');
      }
      const page = parsed.data.data ?? [];
      for (const raw of page) {
        // The tracks relationship can hold music videos too — import songs only.
        if (!isCatalogSong(raw)) continue;
        const candidate = this.toCandidate(raw);
        if (candidate) out.push(candidate);
        if (out.length >= IMPORT_TRACK_CAP) break;
      }
      if (page.length === 0) break;
      path = parsed.data.next ? `${parsed.data.next}&limit=${CATALOG_PLAYLIST_PAGE_LIMIT}` : null;
    }
    return out;
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

/** A catalog track resource is a song unless its `type` says otherwise. */
function isCatalogSong(raw: unknown): boolean {
  const parsed = z.object({ type: z.string().optional() }).safeParse(raw);
  return parsed.success && (parsed.data.type === undefined || parsed.data.type === 'songs');
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

const amLibraryPlaylistSchema = z.object({
  id: z.string(),
  attributes: z
    .object({
      name: z.string().optional(),
      curatorName: z.string().optional(),
      trackCount: z.number().int().nonnegative().optional(),
      artwork: z
        .object({ url: z.string(), width: z.number().optional(), height: z.number().optional() })
        .optional(),
    })
    .optional(),
});

const LIBRARY_PLAYLIST_PAGE_LIMIT = 100;

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

/** Fetch the connected user's Apple Music library playlists. */
export async function fetchAppleMusicLibraryPlaylists(cfg: {
  developerToken: string;
  musicUserToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  maxPlaylists?: number;
}): Promise<ProviderPlaylistSummary[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxPlaylists ?? 100;
  const out: ProviderPlaylistSummary[] = [];
  const origin = base.replace(/\/v1$/, '');
  let path: string | null = `/v1/me/library/playlists?limit=${LIBRARY_PLAYLIST_PAGE_LIMIT}`;

  while (path && out.length < cap) {
    const res = await cfg.fetchImpl(`${origin}${path}`, {
      headers: {
        Authorization: `Bearer ${cfg.developerToken}`,
        'Music-User-Token': cfg.musicUserToken,
      },
    });
    if (res.status === 401 || res.status === 403) throw new AppleMusicUnauthorizedError();
    if (!res.ok) {
      throw new ProviderError(
        'apple_music',
        `Apple Music API ${res.status} for /me/library/playlists`,
      );
    }

    const parsed = amLibraryPageSchema.safeParse(await readJson(res, 'apple_music'));
    if (!parsed.success) break;
    const page = parsed.data.data ?? [];
    for (const raw of page) {
      const playlist = amLibraryPlaylistSchema.safeParse(raw);
      if (!playlist.success) continue;
      const a = playlist.data.attributes;
      const item = providerPlaylistSummarySchema.safeParse({
        provider: 'apple_music',
        playlistId: playlist.data.id,
        name: a?.name ?? 'Untitled playlist',
        ownerName: a?.curatorName ?? null,
        trackCount: a?.trackCount ?? 0,
        coverImageUrl: a?.artwork ? renderArtwork(a.artwork) : null,
      });
      if (item.success) out.push(item.data);
      if (out.length >= cap) break;
    }

    if (page.length === 0) break;
    path = parsed.data.next ?? null;
  }

  return out;
}

/** Fetch tracks for one Apple Music library playlist id. */
export async function fetchAppleMusicLibraryPlaylistTracks(cfg: {
  developerToken: string;
  musicUserToken: string;
  playlistId: string;
  fetchImpl: FetchLike;
  apiBase?: string;
  maxTracks?: number;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.maxTracks ?? 200;
  const out: TrackSearchResult[] = [];
  const origin = base.replace(/\/v1$/, '');
  const encodedId = encodeURIComponent(cfg.playlistId);
  let path: string | null =
    `/v1/me/library/playlists/${encodedId}/tracks?limit=${LIBRARY_PAGE_LIMIT}`;

  while (path && out.length < cap) {
    const res = await cfg.fetchImpl(`${origin}${path}`, {
      headers: {
        Authorization: `Bearer ${cfg.developerToken}`,
        'Music-User-Token': cfg.musicUserToken,
      },
    });
    if (res.status === 401 || res.status === 403) throw new AppleMusicUnauthorizedError();
    if (res.status === 404) return [];
    if (!res.ok) {
      throw new ProviderError(
        'apple_music',
        `Apple Music API ${res.status} for /me/library/playlists/:id/tracks`,
      );
    }

    const parsed = amLibraryPageSchema.safeParse(await readJson(res, 'apple_music'));
    if (!parsed.success) break;
    const page = parsed.data.data ?? [];
    for (const raw of page) {
      const candidate = toLibraryCandidate(raw);
      if (candidate) out.push(candidate);
      if (out.length >= cap) break;
    }

    if (page.length === 0) break;
    path = parsed.data.next ?? null;
  }

  return out;
}
