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
 */
import { providerCapabilities, type Provider, type TrackSearchResult } from '@ritmofit/shared';
import type { ProviderConnectionState } from './providers.js';
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

/** Which Songs search a service supports: Apple searches the library server-side. */
export function songSearchMode(provider: Provider): 'server' | 'loaded' {
  return provider === 'apple_music' ? 'server' : 'loaded';
}

/** Append a page of songs, dropping any song already loaded (pages can overlap). */
export function appendSongPage(
  loaded: readonly TrackSearchResult[],
  page: readonly TrackSearchResult[],
): TrackSearchResult[] {
  const seen = new Set(loaded.map((row) => `${row.provider}:${row.providerTrackId}`));
  const out = [...loaded];
  for (const row of page) {
    const key = `${row.provider}:${row.providerTrackId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** True while a typed search on a "loaded" service should fetch another page by itself. */
export function shouldAutoLoadForSearch(input: {
  query: string;
  hasMore: boolean;
  loading: boolean;
  failed: boolean;
  loadedCount: number;
  bound: number;
}): boolean {
  return (
    input.query.trim() !== '' &&
    input.hasMore &&
    !input.loading &&
    !input.failed &&
    input.loadedCount < input.bound
  );
}

/**
 * The line under a Songs search on a "loaded" service: what was searched, and
 * whether more of the library is left unsearched.
 */
export function songSearchScopeNote(input: {
  query: string;
  hasMore: boolean;
  loading: boolean;
  loadedCount: number;
  bound: number;
}): string | null {
  if (!input.query.trim() || !input.hasMore) return null;
  if (input.loading || input.loadedCount < input.bound) {
    return `Searching your liked songs… ${input.loadedCount.toLocaleString('en-US')} loaded so far.`;
  }
  return `Searched your first ${input.loadedCount.toLocaleString('en-US')} liked songs.`;
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
