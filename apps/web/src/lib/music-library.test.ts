import { describe, expect, it } from 'vitest';
import {
  defaultLibraryKind,
  filterLibrary,
  musicChipBadge,
  musicLibraryKinds,
  orderLibrary,
  playlistMetaLine,
  songMetaLine,
} from './music-library.js';

describe('musicChipBadge', () => {
  it('keeps a failed library off the Connected badge', () => {
    expect(
      musicChipBadge({
        fetchStatus: 'ready',
        connectionState: 'connected',
        libraryFailed: true,
      }),
    ).toEqual({ kind: 'unverified', label: 'Unavailable' });
  });

  it('uses Reconnect for an expired session and Catalog only when nothing is linked', () => {
    expect(
      musicChipBadge({
        fetchStatus: 'ready',
        connectionState: 'expired',
        libraryFailed: false,
      }),
    ).toEqual({ kind: 'expired', label: 'Reconnect' });
    expect(
      musicChipBadge({
        fetchStatus: 'ready',
        connectionState: 'disconnected',
        libraryFailed: false,
      }),
    ).toEqual({ kind: 'catalog-only', label: 'Catalog only' });
  });

  it('does not call a status outage Connected', () => {
    expect(
      musicChipBadge({
        fetchStatus: 'error',
        connectionState: 'connected',
        libraryFailed: false,
      }).label,
    ).toBe('Unavailable');
    expect(
      musicChipBadge({
        fetchStatus: 'loading',
        connectionState: 'disconnected',
        libraryFailed: false,
      }).label,
    ).toBe('Checking');
  });
});

describe('music library shelves', () => {
  it('offers playlists, songs, and catalog, and no album shelf', () => {
    for (const provider of ['soundcloud', 'spotify', 'apple_music'] as const) {
      expect(musicLibraryKinds(provider)).toEqual(['playlists', 'songs', 'catalog']);
    }
  });

  it('opens on playlists when the account is connected, otherwise the catalog', () => {
    expect(defaultLibraryKind(true, musicLibraryKinds('spotify'))).toBe('playlists');
    expect(defaultLibraryKind(false, musicLibraryKinds('soundcloud'))).toBe('catalog');
  });
});

describe('library rows', () => {
  it('omits a track count the provider did not report', () => {
    expect(playlistMetaLine('Steven', null, 'Spotify')).toBe('Playlist · Steven');
    expect(playlistMetaLine('Steven', 1, 'Spotify')).toBe('Playlist · Steven · 1 track');
    expect(playlistMetaLine(null, 24, 'Spotify')).toBe('Playlist · Spotify · 24 tracks');
  });

  it('puts artist and duration on one song line', () => {
    expect(songMetaLine('Avicii', 200000)).toBe('Song · Avicii · 3:20');
    expect(songMetaLine('Avicii', null)).toBe('Song · Avicii');
  });

  it('keeps service order for Recents and sorts Name without inventing dates', () => {
    const rows = [{ name: 'Cooldown' }, { name: 'Warmup' }];
    expect(orderLibrary(rows, 'recents', (row) => row.name)).toEqual(rows);
    expect(orderLibrary(rows, 'name', (row) => row.name).map((row) => row.name)).toEqual([
      'Cooldown',
      'Warmup',
    ]);
    expect(filterLibrary(rows, 'warm', (row) => row.name)).toEqual([{ name: 'Warmup' }]);
  });
});
