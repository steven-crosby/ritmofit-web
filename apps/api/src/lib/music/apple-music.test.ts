import { describe, it, expect } from 'vitest';
import {
  createAppleMusicProvider,
  fetchAppleMusicLibrarySongs,
  fetchAppleMusicLibraryPlaylists,
  fetchAppleMusicLibraryPlaylistTracks,
  AppleMusicUnauthorizedError,
  type FetchLike,
} from '@ritmofit/music';

function fakeFetch(handlers: Record<string, unknown>) {
  const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const key = Object.keys(handlers).find((k) => url.startsWith(k));
    const body = key ? handlers[key] : null;
    return {
      ok: key !== undefined,
      status: key !== undefined ? 200 : 404,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { fetchImpl, calls };
}

const API_BASE = 'https://am.test/v1';

const AM_SONG = {
  id: '1440857781',
  type: 'songs',
  attributes: {
    name: 'Bohemian Rhapsody',
    artistName: 'Queen',
    durationInMillis: 354947,
    url: 'https://music.apple.com/us/album/bohemian-rhapsody/1440857781',
    artwork: { url: 'https://is1.mzstatic.com/image/{w}x{h}.jpg', width: 3000, height: 3000 },
  },
};

function makeProvider(handlers: Record<string, unknown>) {
  const { fetchImpl, calls } = fakeFetch(handlers);
  const provider = createAppleMusicProvider({
    developerToken: 'devtok',
    fetchImpl,
    apiBase: API_BASE,
    storefront: 'us',
  });
  return { provider, calls };
}

describe('AppleMusicProvider.search', () => {
  it('maps results.songs.data → contract candidates and binds artwork size', async () => {
    const { provider } = makeProvider({
      [`${API_BASE}/catalog/us/search`]: { results: { songs: { data: [AM_SONG] } } },
    });
    const results = await provider.search('queen');
    expect(results).toEqual([
      {
        provider: 'apple_music',
        providerTrackId: '1440857781',
        providerUri: 'https://music.apple.com/us/album/bohemian-rhapsody/1440857781',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        albumArtUrl: 'https://is1.mzstatic.com/image/512x512.jpg',
        durationMs: 354947,
      },
    ]);
  });

  it('returns [] for a blank query without calling the API', async () => {
    const { provider, calls } = makeProvider({});
    expect(await provider.search('  ')).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('sends the developer token as a Bearer header', async () => {
    const { provider, calls } = makeProvider({
      [`${API_BASE}/catalog/us/search`]: { results: { songs: { data: [] } } },
    });
    await provider.search('x');
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer devtok');
  });
});

describe('AppleMusicProvider.lookup', () => {
  it('maps the first song in the data array', async () => {
    const { provider } = makeProvider({ [`${API_BASE}/catalog/us/songs/`]: { data: [AM_SONG] } });
    const r = await provider.lookup('1440857781');
    expect(r?.providerTrackId).toBe('1440857781');
    expect(r?.provider).toBe('apple_music');
  });

  it('returns null when the lookup has no data', async () => {
    const { provider } = makeProvider({ [`${API_BASE}/catalog/us/songs/`]: { data: [] } });
    expect(await provider.lookup('nope')).toBeNull();
  });
});

describe('fetchAppleMusicLibrarySongs', () => {
  const ORIGIN = 'https://am.test';
  const LIBRARY_URL = `${ORIGIN}/v1/me/library/songs`;

  // A library song: catalog id lives under playParams; the library id differs.
  const AM_LIBRARY_SONG = {
    id: 'i.libraryId123',
    type: 'library-songs',
    attributes: {
      name: 'Bohemian Rhapsody',
      artistName: 'Queen',
      durationInMillis: 354947,
      url: 'https://music.apple.com/us/album/bohemian-rhapsody/1440857781',
      playParams: { id: 'i.libraryId123', catalogId: '1440857781' },
      artwork: { url: 'https://is1.mzstatic.com/image/{w}x{h}.jpg', width: 3000, height: 3000 },
    },
  };

  it('sends developer Bearer + Music-User-Token and prefers the catalog id', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: { data: [AM_LIBRARY_SONG] },
    });
    const results = await fetchAppleMusicLibrarySongs({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toEqual([
      {
        provider: 'apple_music',
        providerTrackId: '1440857781', // catalogId, not the library id
        providerUri: 'https://music.apple.com/us/album/bohemian-rhapsody/1440857781',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        albumArtUrl: 'https://is1.mzstatic.com/image/512x512.jpg',
        durationMs: 354947,
      },
    ]);
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer devtok');
    expect(calls[0]?.init?.headers?.['Music-User-Token']).toBe('mut-1');
  });

  it('follows Apple’s relative `next` cursor across pages', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: {
        data: [AM_LIBRARY_SONG],
        next: '/v1/me/library/songs?offset=100',
      },
      [`${LIBRARY_URL}?offset=100`]: { data: [AM_LIBRARY_SONG] },
    });
    const results = await fetchAppleMusicLibrarySongs({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toHaveLength(2);
    expect(calls.map((c) => c.url)).toEqual([
      `${LIBRARY_URL}?limit=100`,
      `${LIBRARY_URL}?offset=100`,
    ]);
  });

  it('falls back to the library id when there is no catalog equivalent', async () => {
    const noCatalog = {
      ...AM_LIBRARY_SONG,
      attributes: { ...AM_LIBRARY_SONG.attributes, playParams: { id: 'i.libraryId123' } },
    };
    const { fetchImpl } = fakeFetch({ [`${LIBRARY_URL}?limit=100`]: { data: [noCatalog] } });
    const results = await fetchAppleMusicLibrarySongs({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results[0]?.providerTrackId).toBe('i.libraryId123');
  });

  it('stops instead of looping forever on a non-advancing `next` cursor', async () => {
    // Degenerate upstream response: an empty page that still hands back a `next`
    // pointing back at itself. The cap gates on collected tracks, not iterations,
    // so without the empty-page guard `out.length < cap` never trips and the loop
    // spins forever. Keyed at the base URL so every paged request matches.
    const { fetchImpl, calls } = fakeFetch({
      [LIBRARY_URL]: { data: [], next: '/v1/me/library/songs?offset=0' },
    });
    const results = await fetchAppleMusicLibrarySongs({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toEqual([]);
    expect(calls).toHaveLength(1); // broke after the first empty page
  });

  it('throws AppleMusicUnauthorizedError on 401/403 (reconnect signal)', async () => {
    for (const status of [401, 403]) {
      const fetchImpl: FetchLike = async () => ({
        ok: false,
        status,
        json: async () => ({}),
        text: async () => 'unauthorized',
      });
      await expect(
        fetchAppleMusicLibrarySongs({
          developerToken: 'devtok',
          musicUserToken: 'stale',
          fetchImpl,
          apiBase: API_BASE,
        }),
      ).rejects.toBeInstanceOf(AppleMusicUnauthorizedError);
    }
  });
});

describe('fetchAppleMusicLibraryPlaylists', () => {
  const ORIGIN = 'https://am.test';
  const PLAYLISTS_URL = `${ORIGIN}/v1/me/library/playlists`;

  const AM_LIBRARY_PLAYLIST = {
    id: 'p.abc123',
    type: 'library-playlists',
    attributes: {
      name: 'Cycle Bangers',
      curatorName: 'DJ Ritmo',
      trackCount: 12,
      artwork: { url: 'https://is1.mzstatic.com/image/{w}x{h}.jpg', width: 3000, height: 3000 },
    },
  };

  it('maps a library playlist → ProviderPlaylistSummary and sends both tokens', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${PLAYLISTS_URL}?limit=100`]: { data: [AM_LIBRARY_PLAYLIST] },
    });
    const results = await fetchAppleMusicLibraryPlaylists({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toEqual([
      {
        provider: 'apple_music',
        playlistId: 'p.abc123',
        name: 'Cycle Bangers',
        ownerName: 'DJ Ritmo',
        trackCount: 12,
        coverImageUrl: 'https://is1.mzstatic.com/image/512x512.jpg',
      },
    ]);
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer devtok');
    expect(calls[0]?.init?.headers?.['Music-User-Token']).toBe('mut-1');
  });

  it('defaults name/owner/trackCount/cover when attributes are absent', async () => {
    const bare = { id: 'p.bare', type: 'library-playlists' };
    const { fetchImpl } = fakeFetch({ [`${PLAYLISTS_URL}?limit=100`]: { data: [bare] } });
    const results = await fetchAppleMusicLibraryPlaylists({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toEqual([
      {
        provider: 'apple_music',
        playlistId: 'p.bare',
        name: 'Untitled playlist',
        ownerName: null,
        trackCount: 0,
        coverImageUrl: null,
      },
    ]);
  });

  it('follows Apple’s relative `next` cursor across pages', async () => {
    const second = { ...AM_LIBRARY_PLAYLIST, id: 'p.def456' };
    const { fetchImpl, calls } = fakeFetch({
      [`${PLAYLISTS_URL}?limit=100`]: {
        data: [AM_LIBRARY_PLAYLIST],
        next: '/v1/me/library/playlists?offset=100',
      },
      [`${PLAYLISTS_URL}?offset=100`]: { data: [second] },
    });
    const results = await fetchAppleMusicLibraryPlaylists({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results.map((p) => p.playlistId)).toEqual(['p.abc123', 'p.def456']);
    expect(calls.map((c) => c.url)).toEqual([
      `${PLAYLISTS_URL}?limit=100`,
      `${PLAYLISTS_URL}?offset=100`,
    ]);
  });

  it('throws AppleMusicUnauthorizedError on 401/403 (reconnect signal)', async () => {
    for (const status of [401, 403]) {
      const fetchImpl: FetchLike = async () => ({
        ok: false,
        status,
        json: async () => ({}),
        text: async () => 'unauthorized',
      });
      await expect(
        fetchAppleMusicLibraryPlaylists({
          developerToken: 'devtok',
          musicUserToken: 'stale',
          fetchImpl,
          apiBase: API_BASE,
        }),
      ).rejects.toBeInstanceOf(AppleMusicUnauthorizedError);
    }
  });
});

describe('fetchAppleMusicLibraryPlaylistTracks', () => {
  const ORIGIN = 'https://am.test';
  const PLAYLISTS_URL = `${ORIGIN}/v1/me/library/playlists`;

  const AM_LIBRARY_SONG = {
    id: 'i.libraryId123',
    type: 'library-songs',
    attributes: {
      name: 'Bohemian Rhapsody',
      artistName: 'Queen',
      durationInMillis: 354947,
      url: 'https://music.apple.com/us/album/bohemian-rhapsody/1440857781',
      playParams: { id: 'i.libraryId123', catalogId: '1440857781' },
      artwork: { url: 'https://is1.mzstatic.com/image/{w}x{h}.jpg', width: 3000, height: 3000 },
    },
  };

  it('maps playlist tracks, prefers the catalog id, and targets the playlist URL', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${PLAYLISTS_URL}/p.abc123/tracks?limit=100`]: { data: [AM_LIBRARY_SONG] },
    });
    const results = await fetchAppleMusicLibraryPlaylistTracks({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      playlistId: 'p.abc123',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toEqual([
      {
        provider: 'apple_music',
        providerTrackId: '1440857781', // catalogId, not the library id
        providerUri: 'https://music.apple.com/us/album/bohemian-rhapsody/1440857781',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        albumArtUrl: 'https://is1.mzstatic.com/image/512x512.jpg',
        durationMs: 354947,
      },
    ]);
    expect(calls[0]?.url).toBe(`${PLAYLISTS_URL}/p.abc123/tracks?limit=100`);
    expect(calls[0]?.init?.headers?.['Music-User-Token']).toBe('mut-1');
  });

  it('returns [] when the playlist is missing (404)', async () => {
    // No handler matches → fakeFetch yields 404 → the adapter treats it as empty.
    const { fetchImpl, calls } = fakeFetch({});
    const results = await fetchAppleMusicLibraryPlaylistTracks({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      playlistId: 'p.gone',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('throws AppleMusicUnauthorizedError on 401/403 (reconnect signal)', async () => {
    for (const status of [401, 403]) {
      const fetchImpl: FetchLike = async () => ({
        ok: false,
        status,
        json: async () => ({}),
        text: async () => 'unauthorized',
      });
      await expect(
        fetchAppleMusicLibraryPlaylistTracks({
          developerToken: 'devtok',
          musicUserToken: 'stale',
          playlistId: 'p.abc123',
          fetchImpl,
          apiBase: API_BASE,
        }),
      ).rejects.toBeInstanceOf(AppleMusicUnauthorizedError);
    }
  });
});

describe('AppleMusicProvider.getPlaylist (catalog URL import)', () => {
  const REF = { provider: 'apple_music', storefront: 'gb', playlistId: 'pl.abc123' } as const;
  const TRACKS_URL = `${API_BASE}/catalog/gb/playlists/pl.abc123/tracks`;

  it('fetches the catalog tracks relationship for the URL storefront with the developer token', async () => {
    const { provider, calls } = makeProvider({
      [TRACKS_URL]: { data: [AM_SONG] },
    });

    const results = await provider.getPlaylist(REF);

    expect(results).toHaveLength(1);
    expect(results[0]?.providerTrackId).toBe('1440857781');
    const call = calls.find((c) => c.url.startsWith(TRACKS_URL))!;
    expect(call.url).toContain('/catalog/gb/');
    expect(call.url).toContain('limit=300');
    expect(call.init?.headers?.Authorization).toBe('Bearer devtok');
    expect(call.init?.headers?.['Music-User-Token']).toBeUndefined();
  });

  it('follows the relative next cursor, re-appending the page limit', async () => {
    const secondSong = { ...AM_SONG, id: '2' };
    const { provider, calls } = makeProvider({
      [`${TRACKS_URL}?offset=300`]: { data: [secondSong] },
      [`${TRACKS_URL}?limit=300`]: {
        data: [AM_SONG],
        next: '/v1/catalog/gb/playlists/pl.abc123/tracks?offset=300',
      },
    });

    const results = await provider.getPlaylist(REF);

    expect(results.map((r) => r.providerTrackId)).toEqual(['1440857781', '2']);
    const pageCalls = calls.filter((c) => c.url.startsWith(TRACKS_URL)).map((c) => c.url);
    expect(pageCalls).toEqual([`${TRACKS_URL}?limit=300`, `${TRACKS_URL}?offset=300&limit=300`]);
  });

  it('rejects a malformed later page instead of returning a partial playlist', async () => {
    const { provider } = makeProvider({
      [`${TRACKS_URL}?offset=300`]: { data: 'invalid' },
      [`${TRACKS_URL}?limit=300`]: {
        data: [AM_SONG],
        next: '/v1/catalog/gb/playlists/pl.abc123/tracks?offset=300',
      },
    });

    await expect(provider.getPlaylist(REF)).rejects.toThrow(
      'Apple Music returned an invalid playlist page.',
    );
  });

  it('returns [] on 404 (unknown id, or a shared playlist since unshared)', async () => {
    const { provider } = makeProvider({}); // no handler → 404
    await expect(provider.getPlaylist(REF)).resolves.toEqual([]);
  });

  it('imports songs only, skipping music-videos in the tracks relationship', async () => {
    const video = {
      ...AM_SONG,
      id: 'mv-1',
      type: 'music-videos',
    };
    const { provider } = makeProvider({ [TRACKS_URL]: { data: [video, AM_SONG] } });
    const results = await provider.getPlaylist(REF);
    expect(results.map((r) => r.providerTrackId)).toEqual(['1440857781']);
  });

  it('surfaces a non-ok status as a ProviderError (bad developer token)', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'unauthorized',
    });
    const provider = createAppleMusicProvider({
      developerToken: 'devtok',
      fetchImpl,
      apiBase: API_BASE,
      storefront: 'us',
    });
    await expect(provider.getPlaylist(REF)).rejects.toThrow('Apple Music API 401');
  });
});
