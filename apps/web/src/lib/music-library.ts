/**
 * Music-tab library presentation. Provider order and capability truth stay in
 * `providers.ts`. This module only decides the compact chip badge, which library
 * shelves a service can show, and how rows are filtered and ordered.
 *
 * Album shelves are omitted on purpose: no provider lists albums through an
 * existing API, and a chip with nothing behind it would be a dead end.
 *
 * Recents keeps the order the service returned. Playlist and like payloads have
 * no recency timestamp, so the tab does not invent one.
 */
import { providerCapabilities, type Provider } from '@ritmofit/shared';
import type { ProviderConnectionState } from './providers.js';
import { formatDuration } from './class-summary.js';

export type MusicChipBadgeKind =
  | 'connected'
  | 'expired'
  | 'unverified'
  | 'checking'
  | 'catalog-only';

export type MusicLibraryFailure = 'none' | 'unavailable' | 'spotify-allowlist';

/** API code for a Spotify Development Mode allowlist refusal. Not a reconnect. */
export const SPOTIFY_ALLOWLIST_CODE = 'SPOTIFY_DEVELOPMENT_MODE';

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
  return 'unavailable';
}

export type MusicLibraryKind = 'playlists' | 'songs' | 'catalog';

export type LibrarySort = 'recents' | 'name';

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
  if (sort === 'recents') return [...rows];
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
