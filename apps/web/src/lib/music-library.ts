/**
 * Music-tab library presentation. Provider order and capability truth stay in
 * `providers.ts`. This module only decides the compact chip badge, which library
 * shelves a service can show, and how rows are filtered and ordered.
 *
 * Album shelves are omitted on purpose: no provider lists albums through an
 * existing API, and a chip with nothing behind it would be a dead end.
 *
 * "Library order" keeps the order the service returned. It is not recency: Apple
 * Music documents no date-added sort for library songs (its order is near
 * alphabetical), SoundCloud documents no like date, and playlist payloads carry
 * no timestamp, so the tab does not invent one (RF-132).
 *
 * Liked/library songs arrive in pages (`listLikesPage`). Search on Songs reaches
 * past the loaded pages: Apple Music searches the library server-side; the other
 * services keep loading pages while a query is typed, up to
 * `SONG_SEARCH_AUTOLOAD_BOUND` songs, then say so and offer to keep loading.
 *
 * Music reopens on the service and shelf the viewer last used (`MusicView`, RF-137).
 */
import { providerCapabilities, type Provider, type TrackSearchResult } from '@ritmofit/shared';
import { PROVIDER_ORDER, type ProviderConnectionState } from './providers.js';
import { formatDuration } from './class-summary.js';

export type MusicChipBadgeKind =
  | 'connected'
  | 'expired'
  | 'unverified'
  | 'checking'
  | 'catalog-only';

export type MusicLibraryFailure = 'none' | 'unavailable' | 'spotify-allowlist' | 'provider-quota';

/** API code for a Spotify Development Mode allowlist refusal. Not a reconnect. */
export const SPOTIFY_ALLOWLIST_CODE = 'SPOTIFY_DEVELOPMENT_MODE';

/** API code for a spent provider quota. Waiting fixes it; retrying now does not. */
export const PROVIDER_QUOTA_CODE = 'PROVIDER_QUOTA_EXCEEDED';

/** Failures whose API sentence already says why and what to do, so the UI shows it as-is. */
export function libraryFailureExplainsItself(code: string | undefined): boolean {
  return code === SPOTIFY_ALLOWLIST_CODE || code === PROVIDER_QUOTA_CODE;
}

/**
 * Reconnect is the only chip word that is an action. Status words stay on the
 * selector. The Reconnect control has to start OAuth; it cannot be a label
 * inside the selector.
 */
export function musicChipOffersReconnect(kind: MusicChipBadgeKind): boolean {
  return kind === 'expired';
}

export function musicLibraryFailure(
  errors: ReadonlyArray<{ code?: string } | null | undefined>,
): MusicLibraryFailure {
  const present = errors.filter((error): error is { code?: string } => error != null);
  if (present.length === 0) return 'none';
  if (present.some((error) => error.code === SPOTIFY_ALLOWLIST_CODE)) return 'spotify-allowlist';
  if (present.some((error) => error.code === PROVIDER_QUOTA_CODE)) return 'provider-quota';
  return 'unavailable';
}

export type MusicLibraryKind = 'playlists' | 'songs' | 'catalog';

export type MusicConnectionNotice = {
  action: 'connect' | 'reconnect';
  tone: 'neutral' | 'caution';
  message: string;
};

/**
 * The one line the Music tab shows about the selected service's account, or
 * null when the service chip already says everything. Library read failures
 * belong to their shelf, and a failed status read to the page-level alert.
 * Catalog search never needs an account, so a missing link stays quiet there
 * unless a connect attempt is in flight and needs somewhere to report.
 */
export function musicConnectionNotice(input: {
  label: string;
  fetchStatus: 'loading' | 'ready' | 'error';
  connectionState: ProviderConnectionState;
  libraryKind: MusicLibraryKind;
  scopeGap: 'playlists' | 'playback' | null;
  connectInFlight: boolean;
}): MusicConnectionNotice | null {
  const { label } = input;
  if (input.fetchStatus !== 'ready') return null;
  const quietOnCatalog = input.libraryKind === 'catalog' && !input.connectInFlight;
  if (input.connectionState === 'expired') {
    if (quietOnCatalog) return null;
    return {
      action: 'reconnect',
      tone: 'caution',
      message: `Reconnect ${label} to see your library. Catalog search still works.`,
    };
  }
  if (input.connectionState === 'disconnected') {
    if (quietOnCatalog) return null;
    const shelf =
      input.libraryKind === 'songs'
        ? 'liked songs'
        : input.libraryKind === 'playlists'
          ? 'playlists'
          : 'playlists and liked songs';
    return {
      action: 'connect',
      tone: 'neutral',
      message: `Connect ${label} to see your ${shelf}. Catalog search works without an account.`,
    };
  }
  if (input.scopeGap) {
    return {
      action: 'reconnect',
      tone: 'caution',
      message:
        input.scopeGap === 'playlists'
          ? `Reconnect ${label} to load your playlists.`
          : `Reconnect ${label} to play songs in Ritmo.`,
    };
  }
  return null;
}

export type LibrarySort = 'library' | 'name';

/** Sort toggle labels, in display order. */
export const LIBRARY_SORT_OPTIONS: readonly (readonly [LibrarySort, string])[] = [
  ['library', 'Library order'],
  ['name', 'Name'],
];

/** Songs a typed search may load without asking: 5 pages of about 200 (owner, 2026-10-29). */
export const SONG_SEARCH_AUTOLOAD_BOUND = 1000;
/**
 * Page requests one typed query may make without asking (owner: 1,000 songs or 5
 * calls). Bounds the requests even when pages add no new songs, so a search cannot
 * spend the per-user likes budget.
 */
export const SONG_SEARCH_AUTOLOAD_REQUESTS = 5;

/** Which Songs search a service supports: Apple searches the library server-side. */
export function songSearchMode(provider: Provider): 'server' | 'loaded' {
  return provider === 'apple_music' ? 'server' : 'loaded';
}

/**
 * Where an Apple Music library search stands for the current query. `off` when no
 * server search applies (another tab, a "loaded" service, a blank query, or a
 * connection that is not connected, so the effect never sends it); `pending` until
 * the result for this exact query arrives; then `done` or `failed`.
 */
export function serverSongSearchState(input: {
  onSongs: boolean;
  mode: 'server' | 'loaded';
  query: string;
  connected: boolean;
  result: { query: string; failed: boolean } | null;
}): 'off' | 'pending' | 'done' | 'failed' {
  const query = input.query.trim();
  if (!input.onSongs || input.mode !== 'server' || !query || !input.connected) return 'off';
  if (!input.result || input.result.query !== query) return 'pending';
  return input.result.failed ? 'failed' : 'done';
}

/** Append a page of songs, dropping any song already loaded (pages can overlap). */
export function appendSongPage(
  loaded: readonly TrackSearchResult[],
  page: readonly TrackSearchResult[],
): TrackSearchResult[] {
  const key = (row: TrackSearchResult) => `${row.provider}:${row.providerTrackId}`;
  const seen = new Set(loaded.map(key));
  const out = [...loaded];
  for (const row of page) {
    if (seen.has(key(row))) continue;
    seen.add(key(row));
    out.push(row);
  }
  return out;
}

/** A typed search's autoload budget: songs it may reach and requests it may make. */
export interface SongSearchAutoLoad {
  loadedCount: number;
  bound: number;
  requests: number;
}

/** True once a typed search has used its autoload budget (songs or requests). */
export function songSearchAutoLoadSpent(budget: SongSearchAutoLoad): boolean {
  return budget.loadedCount >= budget.bound || budget.requests >= SONG_SEARCH_AUTOLOAD_REQUESTS;
}

/** True while a typed search on a "loaded" service should fetch another page by itself. */
export function shouldAutoLoadForSearch(
  input: SongSearchAutoLoad & {
    query: string;
    hasMore: boolean;
    loading: boolean;
    failed: boolean;
  },
): boolean {
  return (
    input.query.trim() !== '' &&
    input.hasMore &&
    !input.loading &&
    !input.failed &&
    !songSearchAutoLoadSpent(input)
  );
}

/**
 * The line under a Songs search on a "loaded" service: what was searched, and
 * whether more of the library is left unsearched.
 */
export function songSearchScopeNote(
  input: SongSearchAutoLoad & {
    query: string;
    hasMore: boolean;
    loading: boolean;
    failed: boolean;
  },
): string | null {
  if (!input.query.trim() || !input.hasMore) return null;
  const count = input.loadedCount.toLocaleString('en-US');
  if (input.loading || (!input.failed && !songSearchAutoLoadSpent(input))) {
    return `Searching your liked songs… ${count} loaded so far.`;
  }
  return `Searched your first ${count} liked songs.`;
}

/**
 * The note in "Create class from liked songs" when more songs exist than were
 * loaded, so the instructor knows the class draws from a subset.
 */
export function likesSubsetNote(loadedCount: number, hasMore: boolean): string | null {
  if (!hasMore) return null;
  return `Using your first ${loadedCount.toLocaleString('en-US')} liked songs. Load more on Music › Songs to choose from more.`;
}

export function musicChipBadge(input: {
  fetchStatus: 'loading' | 'ready' | 'error';
  connectionState: ProviderConnectionState;
  libraryFailure?: MusicLibraryFailure;
}): { kind: MusicChipBadgeKind; label: string } {
  if (input.fetchStatus === 'loading') return { kind: 'checking', label: 'Checking' };
  // Allowlist is a specific block on a linked account. It is not "Unavailable"
  // and it is not a reconnect action.
  if (input.libraryFailure === 'spotify-allowlist') {
    return { kind: 'unverified', label: 'Not allowlisted' };
  }
  if (input.libraryFailure === 'provider-quota') {
    return { kind: 'unverified', label: 'Limit reached' };
  }
  // A failed status read, or a library read that did not succeed, must not wear
  // a Connected badge. Spotify can be linked and still return no library.
  if (input.fetchStatus === 'error' || input.libraryFailure === 'unavailable') {
    return { kind: 'unverified', label: 'Unavailable' };
  }
  if (input.connectionState === 'connected') return { kind: 'connected', label: 'Connected' };
  if (input.connectionState === 'expired') return { kind: 'expired', label: 'Reconnect' };
  return { kind: 'catalog-only', label: 'Catalog only' };
}

/** Playlists, songs, and catalog — albums only when a service actually lists them. */
export function musicLibraryKinds(provider: Provider): MusicLibraryKind[] {
  const kinds: MusicLibraryKind[] = [];
  if (providerCapabilities[provider].savedPlaylists) kinds.push('playlists');
  if (providerCapabilities[provider].userLikes) kinds.push('songs');
  kinds.push('catalog');
  return kinds;
}

export function defaultLibraryKind(
  connected: boolean,
  kinds: readonly MusicLibraryKind[],
): MusicLibraryKind {
  if (connected && kinds.includes('playlists')) return 'playlists';
  return 'catalog';
}

/** The service and shelf Music last showed, so it reopens there (RF-137). */
export interface MusicView {
  provider: Provider;
  kind: MusicLibraryKind;
}

const MUSIC_VIEW_KEY = 'ritmofit:music-view:v1';
const MUSIC_LIBRARY_KINDS: readonly MusicLibraryKind[] = ['playlists', 'songs', 'catalog'];

/**
 * Which service Music opens on. A remembered service wins while it is connected,
 * or when nothing is connected. Otherwise the first connected service in
 * `PROVIDER_ORDER`, so a first visit or a since-disconnected choice lands
 * somewhere useful instead of on an empty catalog.
 */
export function resolveMusicProvider(
  remembered: Provider | null,
  connected: readonly Provider[],
): Provider {
  if (remembered && (connected.length === 0 || connected.includes(remembered))) return remembered;
  return PROVIDER_ORDER.find((provider) => connected.includes(provider)) ?? PROVIDER_ORDER[0]!;
}

/** The remembered shelf when that service still offers it (and is connected, unless Catalog). */
export function resolveMusicKind(
  remembered: MusicLibraryKind | null,
  connected: boolean,
  kinds: readonly MusicLibraryKind[],
): MusicLibraryKind {
  if (remembered && kinds.includes(remembered) && (remembered === 'catalog' || connected))
    return remembered;
  return defaultLibraryKind(connected, kinds);
}

/**
 * Per-viewer memory across reloads. Storage is best effort: private mode or blocked
 * storage just means Music forgets on reload. Within a session the Dashboard keeps
 * the view in component state, so leaving and returning works without storage.
 */
export function recallMusicView(userId: string): MusicView | null {
  try {
    const raw = window.localStorage.getItem(MUSIC_VIEW_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<MusicView> & { userId?: unknown };
    if (
      value.userId !== userId ||
      !PROVIDER_ORDER.includes(value.provider as Provider) ||
      !MUSIC_LIBRARY_KINDS.includes(value.kind as MusicLibraryKind)
    )
      return null;
    return { provider: value.provider as Provider, kind: value.kind as MusicLibraryKind };
  } catch {
    return null;
  }
}

export function rememberMusicView(userId: string, view: MusicView): void {
  try {
    window.localStorage.setItem(MUSIC_VIEW_KEY, JSON.stringify({ userId, ...view }));
  } catch {
    /* Music still remembers for this session through Dashboard state. */
  }
}

/** " · N tracks", or nothing when the provider never reported a count. */
export function playlistCountSuffix(trackCount: number | null): string {
  if (trackCount == null) return '';
  return ` · ${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`;
}

export function playlistMetaLine(
  ownerName: string | null,
  trackCount: number | null,
  fallbackOwner: string,
): string {
  return `Playlist · ${ownerName ?? fallbackOwner}${playlistCountSuffix(trackCount)}`;
}

export function songMetaLine(artist: string, durationMs: number | null): string {
  const duration = durationMs == null ? '' : ` · ${formatDuration(durationMs)}`;
  return `Song · ${artist}${duration}`;
}

export function orderLibrary<T>(
  rows: readonly T[],
  sort: LibrarySort,
  label: (row: T) => string,
): T[] {
  if (sort === 'library') return [...rows];
  return [...rows].sort((a, b) =>
    label(a).localeCompare(label(b), undefined, { sensitivity: 'base' }),
  );
}

export function filterLibrary<T>(
  rows: readonly T[],
  query: string,
  haystack: (row: T) => string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => haystack(row).toLowerCase().includes(needle));
}
