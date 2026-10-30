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
import { fetchWithRetry, type RetryOptions } from './retry.js';

const DEFAULT_API_BASE = 'https://api.music.apple.com/v1';
const DEFAULT_STOREFRONT = 'us';
const SEARCH_LIMIT = 25;
// Paste-a-link pages at the occurrence ceiling. A longer playlist is rejected
// from the first page that crosses it — never silently truncated.
const CATALOG_PLAYLIST_PAGE_LIMIT = 100;

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
  async getPlaylist(
    ref: Extract<PlaylistImportRef, { provider: 'apple_music' }>,
    read?: PlaylistReadOptions,
  ) {
    const out: TrackSearchResult[] = [];
    // Apple returns a relative `next` subpath (e.g. `/v1/catalog/us/…?offset=100`).
    // Some responses already include `limit`; always normalize to one page-size pair.
    const origin = this.apiBase.replace(/\/v1$/, '');
    let path: string | null =
      `/v1/catalog/${encodeURIComponent(ref.storefront)}/playlists/` +
      `${encodeURIComponent(ref.playlistId)}/tracks?limit=${CATALOG_PLAYLIST_PAGE_LIMIT}`;
    const seenContinuations = new Set<string>();
    const retry = previewRetry(this.retry, read);

    while (path) {
      throwIfPreviewStopped(read);
      const res = await fetchWithRetry(
        this.fetchImpl,
        `${origin}${path}`,
        { headers: { Authorization: `Bearer ${this.developerToken}` } },
        retry,
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
        // The tracks relationship can hold music videos too — songs count, videos don't.
        if (!isCatalogSong(raw)) continue;
        const candidate = this.toCandidate(raw);
        if (!candidate) continue;
        if (out.length >= PLAYLIST_URL_OCCURRENCE_LIMIT) {
          throw new PlaylistOverLimitError(null, PLAYLIST_URL_OCCURRENCE_LIMIT);
        }
        out.push(candidate);
      }
      if (page.length === 0) break;
      const next = parsed.data.next;
      if (out.length >= PLAYLIST_URL_OCCURRENCE_LIMIT && next) {
        throw new PlaylistOverLimitError(null, PLAYLIST_URL_OCCURRENCE_LIMIT);
      }
      if (next) {
        // Track Apple's continuation before normalization: distinct raw paths may
        // legitimately resolve to the same request URL after rewriting `limit`.
        if (seenContinuations.has(next)) {
          throw new ProviderError(
            'apple_music',
            'Apple Music returned a repeated catalog pagination path.',
          );
        }
        seenContinuations.add(next);
      }
      path = next ? withCatalogPlaylistPageLimit(next, CATALOG_PLAYLIST_PAGE_LIMIT) : null;
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

/**
 * Ensure a relative Apple catalog `next` path carries exactly one `limit=<n>`.
 * Strips any existing `limit` pairs (Apple sometimes includes its own default)
 * then sets the page size we want. Hand-rolled query join — no URL/URLSearchParams.
 */
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

function withCatalogPlaylistPageLimit(nextPath: string, limit: number): string {
  const qIdx = nextPath.indexOf('?');
  const pathname = qIdx === -1 ? nextPath : nextPath.slice(0, qIdx);
  const query = qIdx === -1 ? '' : nextPath.slice(qIdx + 1);
  const kept = query.split('&').filter((pair) => pair.length > 0 && !/^limit=/i.test(pair));
  kept.push(`limit=${limit}`);
  return `${pathname}?${kept.join('&')}`;
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
      url: z.string().optional(),
      artwork: z
        .object({ url: z.string(), width: z.number().optional(), height: z.number().optional() })
        .optional(),
    })
    .optional(),
});

const LIBRARY_PLAYLIST_PAGE_LIMIT = 100;

/** A repeated cursor is upstream drift, not a complete or empty library. */
function checkLibraryPaginationPath(path: string, visited: Set<string>): void {
  if (visited.has(path)) {
    throw new ProviderError(
      'apple_music',
      'Apple Music returned a repeated library pagination path.',
    );
  }
  visited.add(path);
}

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
 * Query characters an Apple library continuation may carry: unreserved URL
 * characters, `%` escapes, `+` (Apple joins search words with it), the
 * sub-delimiters `encodeURIComponent` leaves raw (`' ( ) ! *`), and `=`/`&`.
 */
const CONTINUATION_QUERY = "[A-Za-z0-9=&%._~+!*'()-]+";
/** The relative path Apple's library-songs `next` continuation must stay on. */
const LIBRARY_SONGS_CONTINUATION = new RegExp(`^/v1/me/library/songs\\?${CONTINUATION_QUERY}$`);
/** The relative path Apple's library-search `next` continuation must stay on. */
const LIBRARY_SEARCH_CONTINUATION = new RegExp(`^/v1/me/library/search\\?${CONTINUATION_QUERY}$`);
/** Apple documents `limit` for library search as default 5, maximum 25. */
const LIBRARY_SEARCH_PAGE_LIMIT = 25;
/** Library search reads at most this many pages (100 songs) per query. */
const LIBRARY_SEARCH_MAX_PAGES = 4;
const DEFAULT_LIBRARY_PAGE_TARGET = 200;
const DEFAULT_LIBRARY_PAGE_MAX_PAGES = 8;

const amLibrarySearchSchema = z.object({
  results: z
    .object({
      'library-songs': z
        .object({ data: z.array(z.unknown()).optional(), next: z.string().optional() })
        .optional(),
    })
    .optional(),
});

interface AppleLibraryRead {
  developerToken: string;
  musicUserToken: string;
  fetchImpl: FetchLike;
  apiBase?: string;
}

/** True when `path` matches `pattern` and cannot climb out of it with `..`. */
function isContinuation(pattern: RegExp, path: string): boolean {
  return pattern.test(path) && !path.includes('..');
}

/** True when `path` is an Apple library-songs continuation we may follow. */
function isLibrarySongsContinuation(path: string): boolean {
  return isContinuation(LIBRARY_SONGS_CONTINUATION, path);
}

/** One Apple library collection the shared page loop can read. */
interface AppleLibraryCollection {
  /** Endpoint named in error messages, e.g. `/me/library/songs`. */
  endpoint: string;
  /** Noun for the invalid-page error, e.g. `library song`. */
  noun: string;
  continuation: RegExp;
  /**
   * What to do with a `next` off the collection's path: `throw` (upstream drift,
   * for a list whose `next` becomes a client cursor) or `stop` (keep the pages
   * already read, for a one-shot search that is never resumed).
   */
  onUnexpectedNext: 'throw' | 'stop';
  parse(json: unknown): { data: unknown[]; next: string | null } | null;
}

const LIBRARY_SONGS: AppleLibraryCollection = {
  endpoint: '/me/library/songs',
  noun: 'library song',
  continuation: LIBRARY_SONGS_CONTINUATION,
  onUnexpectedNext: 'throw',
  parse: (json) => {
    const parsed = amLibraryPageSchema.safeParse(json);
    return parsed.success ? { data: parsed.data.data ?? [], next: parsed.data.next ?? null } : null;
  },
};

const LIBRARY_SEARCH_SONGS: AppleLibraryCollection = {
  endpoint: '/me/library/search',
  noun: 'library search',
  continuation: LIBRARY_SEARCH_CONTINUATION,
  onUnexpectedNext: 'stop',
  parse: (json) => {
    const parsed = amLibrarySearchSchema.safeParse(json);
    if (!parsed.success) return null;
    const songs = parsed.data.results?.['library-songs'];
    return { data: songs?.data ?? [], next: songs?.next ?? null };
  },
};

/**
 * Read pages of one Apple library collection from `startPath`, following Apple's
 * relative `next`. Stops on the first of: no `next`, an empty page, `cap` rows
 * (truncating inside a page), or — at a page boundary — `targetTracks` rows or
 * `maxPages` pages. Returns Apple's own continuation for the page it did not read.
 * A `next` off the collection's path (or with `..`) is upstream drift: it throws
 * rather than silently ending the list early.
 */
async function readAppleLibraryPages(
  cfg: AppleLibraryRead,
  collection: AppleLibraryCollection,
  startPath: string,
  bounds: { cap: number; targetTracks: number; maxPages: number },
): Promise<ProviderTrackPage> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const out: TrackSearchResult[] = [];
  // Apple returns a relative `next` path (e.g. `/v1/me/library/songs?offset=100`).
  const origin = base.replace(/\/v1$/, '');
  let path: string | null = startPath;
  let pages = 0;
  const visited = new Set<string>();

  while (path && out.length < bounds.cap) {
    if (out.length >= bounds.targetTracks || pages >= bounds.maxPages) break;
    checkLibraryPaginationPath(path, visited);
    const res = await cfg.fetchImpl(`${origin}${path}`, {
      headers: {
        Authorization: `Bearer ${cfg.developerToken}`,
        'Music-User-Token': cfg.musicUserToken,
      },
    });
    if (res.status === 401 || res.status === 403) throw new AppleMusicUnauthorizedError();
    if (!res.ok)
      throw new ProviderError(
        'apple_music',
        `Apple Music API ${res.status} for ${collection.endpoint}`,
      );
    const page = collection.parse(await readJson(res, 'apple_music'));
    if (!page) {
      throw new ProviderError(
        'apple_music',
        `Apple Music returned an invalid ${collection.noun} page.`,
      );
    }
    pages += 1;
    for (const raw of page.data) {
      const candidate = toLibraryCandidate(raw);
      if (candidate) out.push(candidate);
      if (out.length >= bounds.cap) break;
    }
    // Guard against a non-advancing `next` cursor (e.g. a page that returns no
    // rows but still hands back a `next`): without this the `out.length < cap`
    // bound never trips and the loop would spin forever. Mirrors the Spotify
    // adapter's empty-page break. An empty page is the end of the collection.
    if (page.data.length === 0) {
      path = null;
      break;
    }
    if (page.next !== null && !isContinuation(collection.continuation, page.next)) {
      if (collection.onUnexpectedNext === 'stop') {
        path = null;
        break;
      }
      throw new ProviderError(
        'apple_music',
        `Apple Music returned an unexpected ${collection.noun} pagination path.`,
      );
    }
    path = page.next;
  }
  return { tracks: out, next: path };
}

/**
 * Fetch the connected user's Apple Music **library** songs with the app's
 * developer token (Bearer) plus the user's Music-User-Token, mapped to the shared
 * contract — the "search my Apple Music" surface. Pure adapter: the caller owns the
 * token's decryption and the developer-token signing. Throws
 * `AppleMusicUnauthorizedError` on 401/403 (reconnect signal); throws on any other
 * non-ok. Paginates Apple's cursor (`next`).
 */
export async function fetchAppleMusicLibrarySongs(
  cfg: AppleLibraryRead & {
    /** Stop after this many tracks so a huge library can't run unbounded. */
    maxTracks?: number;
  },
): Promise<TrackSearchResult[]> {
  const page = await readAppleLibraryPages(
    cfg,
    LIBRARY_SONGS,
    `/v1/me/library/songs?limit=${LIBRARY_PAGE_LIMIT}`,
    {
      cap: cfg.maxTracks ?? 200,
      targetTracks: Number.POSITIVE_INFINITY,
      maxPages: Number.POSITIVE_INFINITY,
    },
  );
  return page.tracks;
}

/**
 * Read one bounded page of the user's Apple Music library songs, starting at
 * `cursor` (Apple's own relative `next` subpath, from a previous page) or at the
 * start of the library. Returns whole Apple pages, so `next` resumes exactly where
 * this page stopped. A `cursor` that is not an `/v1/me/library/songs?…` subpath is
 * rejected with `InvalidProviderCursorError` before any request is made. Apple
 * documents no recency sort for library songs, so the order is Apple's own.
 */
export async function fetchAppleMusicLibrarySongsPage(
  cfg: AppleLibraryRead & LibraryPageOptions & { cursor?: string | null },
): Promise<ProviderTrackPage> {
  if (cfg.cursor != null && !isLibrarySongsContinuation(cfg.cursor)) {
    throw new InvalidProviderCursorError('apple_music');
  }
  return readAppleLibraryPages(
    cfg,
    LIBRARY_SONGS,
    cfg.cursor ?? `/v1/me/library/songs?limit=${LIBRARY_PAGE_LIMIT}`,
    {
      cap: Number.POSITIVE_INFINITY,
      targetTracks: cfg.targetTracks ?? DEFAULT_LIBRARY_PAGE_TARGET,
      maxPages: cfg.maxPages ?? DEFAULT_LIBRARY_PAGE_MAX_PAGES,
    },
  );
}

/** Apple library search wants words joined by `+`; each word is URL-encoded. */
function libraryTerm(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => encodeURIComponent(word))
    .join('+');
}

/**
 * Search the user's own Apple Music library songs server-side
 * (`GET /v1/me/library/search?types=library-songs`), so a song past the loaded
 * pages is still findable. Reads up to four pages of 25 (Apple's documented
 * maximum `limit`), following Apple's own `next`. Blank query → [] with no call.
 */
export async function searchAppleMusicLibrarySongs(
  cfg: AppleLibraryRead & { query: string },
): Promise<TrackSearchResult[]> {
  const term = libraryTerm(cfg.query);
  if (!term) return [];
  const page = await readAppleLibraryPages(
    cfg,
    LIBRARY_SEARCH_SONGS,
    `/v1/me/library/search?term=${term}&types=library-songs&limit=${LIBRARY_SEARCH_PAGE_LIMIT}`,
    {
      cap: Number.POSITIVE_INFINITY,
      targetTracks: Number.POSITIVE_INFINITY,
      maxPages: LIBRARY_SEARCH_MAX_PAGES,
    },
  );
  return page.tracks;
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
  const visited = new Set<string>();

  while (path && out.length < cap) {
    checkLibraryPaginationPath(path, visited);
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
    if (!parsed.success) {
      throw new ProviderError(
        'apple_music',
        'Apple Music returned an invalid library playlist page.',
      );
    }
    const page = parsed.data.data ?? [];
    for (const raw of page) {
      const playlist = amLibraryPlaylistSchema.safeParse(raw);
      if (!playlist.success) continue;
      const a = playlist.data.attributes;
      const item = providerPlaylistSummarySchema.safeParse({
        provider: 'apple_music',
        playlistId: playlist.data.id,
        providerUri: a?.url ?? null,
        name: a?.name ?? 'Untitled playlist',
        ownerName: a?.curatorName ?? null,
        trackCount: a?.trackCount ?? null,
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
  /**
   * Saved-playlist import stop. Checked after a page, before the next request.
   * When set, the browse cap does not apply.
   */
  shouldStop?: (tracks: TrackSearchResult[]) => boolean;
}): Promise<TrackSearchResult[]> {
  const base = cfg.apiBase ?? DEFAULT_API_BASE;
  const cap = cfg.shouldStop ? Number.MAX_SAFE_INTEGER : (cfg.maxTracks ?? 200);
  const out: TrackSearchResult[] = [];
  const origin = base.replace(/\/v1$/, '');
  const encodedId = encodeURIComponent(cfg.playlistId);
  let path: string | null =
    `/v1/me/library/playlists/${encodedId}/tracks?limit=${LIBRARY_PAGE_LIMIT}`;
  const visited = new Set<string>();

  while (path && out.length < cap) {
    checkLibraryPaginationPath(path, visited);
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
    if (!parsed.success) {
      throw new ProviderError(
        'apple_music',
        'Apple Music returned an invalid library playlist track page.',
      );
    }
    const page = parsed.data.data ?? [];
    for (const raw of page) {
      const candidate = toLibraryCandidate(raw);
      if (candidate) out.push(candidate);
      if (!cfg.shouldStop && out.length >= cap) break;
    }

    if (page.length === 0) break;
    if (cfg.shouldStop?.(out)) break;
    path = parsed.data.next ?? null;
  }

  return out;
}
