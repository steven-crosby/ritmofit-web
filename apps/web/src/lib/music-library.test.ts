import { describe, expect, it } from 'vitest';
import {
  defaultLibraryKind,
  filterLibrary,
  libraryFailureExplainsItself,
  musicChipBadge,
  musicChipOffersReconnect,
  musicConnectionNotice,
  musicLibraryFailure,
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
        libraryFailure: 'unavailable',
      }),
    ).toEqual({ kind: 'unverified', label: 'Unavailable' });
  });

  it('names a Spotify allowlist block instead of Unavailable, and does not offer reconnect', () => {
    const badge = musicChipBadge({
      fetchStatus: 'ready',
      connectionState: 'connected',
      libraryFailure: 'spotify-allowlist',
    });
    expect(badge).toEqual({ kind: 'unverified', label: 'Not allowlisted' });
    expect(musicChipOffersReconnect(badge.kind)).toBe(false);
    expect(musicChipOffersReconnect('expired')).toBe(true);
    expect(musicLibraryFailure([null, { code: 'SPOTIFY_DEVELOPMENT_MODE' }])).toBe(
      'spotify-allowlist',
    );
    expect(
      musicLibraryFailure([{ code: 'PROVIDER_UNAVAILABLE' }, { code: 'SPOTIFY_DEVELOPMENT_MODE' }]),
    ).toBe('spotify-allowlist');
    expect(musicLibraryFailure([{ code: 'PROVIDER_UNAVAILABLE' }])).toBe('unavailable');
    expect(musicLibraryFailure([undefined])).toBe('none');
  });

  it('names a spent Spotify quota as Limit reached and shows its API sentence', () => {
    expect(musicLibraryFailure([{ code: 'PROVIDER_QUOTA_EXCEEDED' }, null])).toBe('provider-quota');
    const badge = musicChipBadge({
      fetchStatus: 'ready',
      connectionState: 'connected',
      libraryFailure: 'provider-quota',
    });
    expect(badge).toEqual({ kind: 'unverified', label: 'Limit reached' });
    expect(musicChipOffersReconnect(badge.kind)).toBe(false);
    expect(libraryFailureExplainsItself('PROVIDER_QUOTA_EXCEEDED')).toBe(true);
    expect(libraryFailureExplainsItself('SPOTIFY_DEVELOPMENT_MODE')).toBe(true);
    expect(libraryFailureExplainsItself('PROVIDER_UNAVAILABLE')).toBe(false);
    expect(libraryFailureExplainsItself(undefined)).toBe(false);
  });

  it('uses Reconnect for an expired session and Catalog only when nothing is linked', () => {
    expect(
      musicChipBadge({
        fetchStatus: 'ready',
        connectionState: 'expired',
        libraryFailure: 'none',
      }),
    ).toEqual({ kind: 'expired', label: 'Reconnect' });
    expect(
      musicChipBadge({
        fetchStatus: 'ready',
        connectionState: 'disconnected',
        libraryFailure: 'none',
      }),
    ).toEqual({ kind: 'catalog-only', label: 'Catalog only' });
  });

  it('does not call a status outage Connected', () => {
    expect(
      musicChipBadge({
        fetchStatus: 'error',
        connectionState: 'connected',
        libraryFailure: 'none',
      }).label,
    ).toBe('Unavailable');
    expect(
      musicChipBadge({
        fetchStatus: 'loading',
        connectionState: 'disconnected',
        libraryFailure: 'none',
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

describe('musicConnectionNotice', () => {
  const base = {
    label: 'Spotify',
    fetchStatus: 'ready' as const,
    connectionState: 'connected' as const,
    libraryKind: 'playlists' as const,
    scopeGap: null,
    connectInFlight: false,
  };

  it('stays silent when the chip already says Connected', () => {
    expect(musicConnectionNotice(base)).toBeNull();
  });

  it('leaves a failed status read to the page alert', () => {
    expect(
      musicConnectionNotice({ ...base, fetchStatus: 'error', connectionState: 'expired' }),
    ).toBeNull();
  });

  it('offers Reconnect on a library shelf when the session expired', () => {
    expect(musicConnectionNotice({ ...base, connectionState: 'expired' })).toEqual({
      action: 'reconnect',
      tone: 'caution',
      message: 'Reconnect Spotify to see your library. Catalog search still works.',
    });
  });

  it('offers Connect on a library shelf with no account', () => {
    expect(
      musicConnectionNotice({ ...base, connectionState: 'disconnected', libraryKind: 'songs' }),
    ).toMatchObject({ action: 'connect', tone: 'neutral' });
  });

  it('keeps Catalog quiet without an account unless a connect is in flight', () => {
    const catalog = {
      ...base,
      connectionState: 'disconnected' as const,
      libraryKind: 'catalog' as const,
    };
    expect(musicConnectionNotice(catalog)).toBeNull();
    expect(musicConnectionNotice({ ...catalog, connectInFlight: true })).toMatchObject({
      action: 'connect',
    });
  });

  it('names a missing scope on a linked account', () => {
    expect(
      musicConnectionNotice({ ...base, libraryKind: 'catalog', scopeGap: 'playback' }),
    ).toMatchObject({ action: 'reconnect', message: 'Reconnect Spotify to play songs in Ritmo.' });
  });
});
