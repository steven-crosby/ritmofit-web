import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendSongPage,
  LIBRARY_SORT_OPTIONS,
  likesSubsetNote,
  serverSongSearchState,
  shouldAutoLoadForSearch,
  SONG_SEARCH_AUTOLOAD_BOUND,
  SONG_SEARCH_AUTOLOAD_REQUESTS,
  songSearchAutoLoadSpent,
  songSearchMode,
  songSearchScopeNote,
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
  recallMusicView,
  rememberMusicView,
  resolveMusicKind,
  resolveMusicProvider,
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

  it('keeps service order for Library order and sorts Name without inventing dates', () => {
    const rows = [{ name: 'Cooldown' }, { name: 'Warmup' }];
    expect(orderLibrary(rows, 'library', (row) => row.name)).toEqual(rows);
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

describe('Songs paging and search (RF-132)', () => {
  const song = (id: string, provider: 'apple_music' | 'soundcloud' = 'soundcloud') => ({
    provider,
    providerTrackId: id,
    providerUri: null,
    title: `Song ${id}`,
    artist: 'Artist',
    albumArtUrl: null,
    durationMs: null,
  });

  it('labels the provider-order sort "Library order", not Recents', () => {
    expect(LIBRARY_SORT_OPTIONS).toEqual([
      ['library', 'Library order'],
      ['name', 'Name'],
    ]);
  });

  it('searches Apple Music server-side and the other services by loading pages', () => {
    expect(songSearchMode('apple_music')).toBe('server');
    expect(songSearchMode('soundcloud')).toBe('loaded');
    expect(songSearchMode('spotify')).toBe('loaded');
  });

  it('appends a page without duplicating songs already loaded', () => {
    const out = appendSongPage([song('1'), song('2')], [song('2'), song('3'), song('3')]);
    expect(out.map((row) => row.providerTrackId)).toEqual(['1', '2', '3']);
    // Same id on another service is a different song.
    expect(appendSongPage([song('1')], [song('1', 'apple_music')])).toHaveLength(2);
  });

  it('auto-loads for a typed search only until the 1,000-song bound', () => {
    const base = {
      query: 'angel',
      hasMore: true,
      loading: false,
      failed: false,
      loadedCount: 800,
      bound: SONG_SEARCH_AUTOLOAD_BOUND,
      requests: 3,
    };
    expect(SONG_SEARCH_AUTOLOAD_BOUND).toBe(1000);
    expect(shouldAutoLoadForSearch(base)).toBe(true);
    expect(shouldAutoLoadForSearch({ ...base, loadedCount: 1000 })).toBe(false);
    expect(shouldAutoLoadForSearch({ ...base, query: '  ' })).toBe(false);
    expect(shouldAutoLoadForSearch({ ...base, hasMore: false })).toBe(false);
    expect(shouldAutoLoadForSearch({ ...base, loading: true })).toBe(false);
    expect(shouldAutoLoadForSearch({ ...base, failed: true })).toBe(false);
  });

  // Regression (#665 review item 5): pages that add no new songs never move
  // loadedCount, so the song bound alone let one query request without end.
  it('stops auto-loading after 5 requests for a query even when no songs were added', () => {
    const base = {
      query: 'angel',
      hasMore: true,
      loading: false,
      failed: false,
      loadedCount: 200,
      bound: SONG_SEARCH_AUTOLOAD_BOUND,
      requests: 0,
    };
    expect(SONG_SEARCH_AUTOLOAD_REQUESTS).toBe(5);
    expect(shouldAutoLoadForSearch({ ...base, requests: 4 })).toBe(true);
    expect(shouldAutoLoadForSearch({ ...base, requests: 5 })).toBe(false);
    expect(songSearchAutoLoadSpent({ loadedCount: 200, bound: 1000, requests: 5 })).toBe(true);
    expect(songSearchScopeNote({ ...base, requests: 5 })).toBe(
      'Searched your first 200 liked songs.',
    );
  });

  // Regression (#665 review item 4): a server search that is never sent (Apple not
  // connected) must not read as "Searching…" forever.
  it('reports no pending server search when the connection is not connected', () => {
    const base = {
      onSongs: true,
      mode: 'server' as const,
      query: 'angel',
      connected: true,
      result: null,
    };
    expect(serverSongSearchState(base)).toBe('pending');
    expect(serverSongSearchState({ ...base, connected: false })).toBe('off');
    expect(serverSongSearchState({ ...base, query: '  ' })).toBe('off');
    expect(serverSongSearchState({ ...base, mode: 'loaded' })).toBe('off');
    expect(serverSongSearchState({ ...base, onSongs: false })).toBe('off');
    expect(serverSongSearchState({ ...base, result: { query: 'angel', failed: false } })).toBe(
      'done',
    );
    expect(serverSongSearchState({ ...base, result: { query: 'angel', failed: true } })).toBe(
      'failed',
    );
    expect(serverSongSearchState({ ...base, result: { query: 'ange', failed: false } })).toBe(
      'pending',
    );
  });

  it('says what a loaded-pages search covered', () => {
    const base = {
      query: 'angel',
      hasMore: true,
      loading: false,
      failed: false,
      loadedCount: 1000,
      bound: 1000,
      requests: 4,
    };
    expect(songSearchScopeNote(base)).toBe('Searched your first 1,000 liked songs.');
    expect(songSearchScopeNote({ ...base, loading: true, loadedCount: 600 })).toBe(
      'Searching your liked songs… 600 loaded so far.',
    );
    expect(songSearchScopeNote({ ...base, hasMore: false })).toBeNull();
    expect(songSearchScopeNote({ ...base, query: '' })).toBeNull();
    // A failed page ends the automatic search; the note says what was covered.
    expect(songSearchScopeNote({ ...base, loadedCount: 400, failed: true })).toBe(
      'Searched your first 400 liked songs.',
    );
  });

  it('tells "Create class from liked songs" when it used a subset', () => {
    expect(likesSubsetNote(200, true)).toBe(
      'Using your first 200 liked songs. Load more on Music › Songs to choose from more.',
    );
    expect(likesSubsetNote(42, false)).toBeNull();
  });
});

describe('Music view memory (RF-137)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubStorage(values = new Map<string, string>()) {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    return values;
  }

  it('keeps a remembered service while it is connected or nothing is', () => {
    expect(resolveMusicProvider('apple_music', ['spotify', 'apple_music'])).toBe('apple_music');
    expect(resolveMusicProvider('apple_music', [])).toBe('apple_music');
  });

  it('falls back to the first connected service in order', () => {
    expect(resolveMusicProvider('apple_music', ['spotify'])).toBe('spotify');
    expect(resolveMusicProvider(null, ['apple_music', 'spotify'])).toBe('spotify');
    expect(resolveMusicProvider(null, [])).toBe('soundcloud');
  });

  it('restores a shelf only when the service can show it', () => {
    const kinds = ['playlists', 'songs', 'catalog'] as const;
    expect(resolveMusicKind('songs', true, kinds)).toBe('songs');
    expect(resolveMusicKind('songs', false, kinds)).toBe('catalog');
    expect(resolveMusicKind('catalog', true, kinds)).toBe('catalog');
    expect(resolveMusicKind('songs', true, ['catalog'])).toBe('catalog');
    expect(resolveMusicKind(null, true, kinds)).toBe('playlists');
  });

  it('round-trips the view for the same viewer only', () => {
    stubStorage();
    rememberMusicView('me', { provider: 'apple_music', kind: 'songs' });
    expect(recallMusicView('me')).toEqual({ provider: 'apple_music', kind: 'songs' });
    expect(recallMusicView('someone-else')).toBeNull();
  });

  it('ignores malformed values', () => {
    const values = stubStorage();
    values.set(
      'ritmofit:music-view:v1',
      JSON.stringify({ userId: 'me', provider: 'tidal', kind: 'songs' }),
    );
    expect(recallMusicView('me')).toBeNull();
    values.set('ritmofit:music-view:v1', '{not json');
    expect(recallMusicView('me')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    const throwing = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('window', { localStorage: { getItem: throwing, setItem: throwing } });
    expect(() => rememberMusicView('me', { provider: 'spotify', kind: 'catalog' })).not.toThrow();
    expect(recallMusicView('me')).toBeNull();
  });
});
