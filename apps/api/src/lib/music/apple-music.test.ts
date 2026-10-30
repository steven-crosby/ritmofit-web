import { describe, it, expect, vi } from 'vitest';
import {
  createAppleMusicProvider,
  fetchAppleMusicLibrarySongs,
  fetchAppleMusicLibrarySongsPage,
  searchAppleMusicLibrarySongs,
  InvalidProviderCursorError,
  fetchAppleMusicLibraryPlaylists,
  fetchAppleMusicLibraryPlaylistTracks,
  AppleMusicUnauthorizedError,
  PlaylistOverLimitError,
  ProviderError,
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

describe.each([
  { name: 'library songs', path: '/v1/me/library/songs', read: fetchAppleMusicLibrarySongs },
  {
    name: 'library playlists',
    path: '/v1/me/library/playlists',
    read: fetchAppleMusicLibraryPlaylists,
  },
  {
    name: 'library playlist tracks',
    path: '/v1/me/library/playlists/p.test/tracks',
    read: fetchAppleMusicLibraryPlaylistTracks,
  },
])('Apple Music $name pagination', ({ path, read }) => {
  const validResource = {
    id: 'i.test',
    attributes: { name: 'Test song', artistName: 'Test artist' },
  };

  function readPages(pages: Record<string, unknown>) {
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      // Bound the fixture even before the guard exists: a regression must fail,
      // never leave the test runner spinning on an endlessly repeated page.
      if (calls.length > Object.keys(pages).length) throw new Error('Pagination sentinel reached.');
      if (!(url in pages)) throw new Error('Unexpected pagination request.');
      return {
        ok: true,
        status: 200,
        json: async () => pages[url],
        text: async () => '',
      };
    };
    const result = read({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      playlistId: 'p.test',
      apiBase: API_BASE,
      fetchImpl,
    });
    return { result, calls };
  }

  it('rejects a self-loop with nonempty unmappable rows before fetching the page twice', async () => {
    const first = `${path}?limit=100`;
    const { result, calls } = readPages({
      [`https://am.test${first}`]: { data: [null], next: first },
    });

    await expect(result).rejects.toBeInstanceOf(ProviderError);
    await expect(result).rejects.toThrow(
      'Apple Music returned a repeated library pagination path.',
    );
    expect(calls).toEqual([`https://am.test${first}`]);
  });

  it('rejects a multi-page cycle without returning earlier valid results', async () => {
    const first = `${path}?limit=100`;
    const second = `${path}?offset=100`;
    const { result, calls } = readPages({
      [`https://am.test${first}`]: { data: [validResource], next: second },
      [`https://am.test${second}`]: { data: [null], next: first },
    });

    await expect(result).rejects.toBeInstanceOf(ProviderError);
    await expect(result).rejects.toThrow(
      'Apple Music returned a repeated library pagination path.',
    );
    expect(calls).toEqual([`https://am.test${first}`, `https://am.test${second}`]);
  });

  it('continues past unmappable rows when the cursor advances', async () => {
    const first = `${path}?limit=100`;
    const second = `${path}?offset=100`;
    const { result, calls } = readPages({
      [`https://am.test${first}`]: { data: [null], next: second },
      [`https://am.test${second}`]: { data: [validResource] },
    });

    await expect(result).resolves.toHaveLength(1);
    expect(calls).toEqual([`https://am.test${first}`, `https://am.test${second}`]);
  });
});

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

  it('rejects a malformed later page instead of returning partial library songs', async () => {
    const { fetchImpl } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: {
        data: [AM_LIBRARY_SONG],
        next: '/v1/me/library/songs?offset=100',
      },
      [`${LIBRARY_URL}?offset=100`]: { data: 'invalid' },
    });

    await expect(
      fetchAppleMusicLibrarySongs({
        developerToken: 'devtok',
        musicUserToken: 'mut-1',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toThrow('Apple Music returned an invalid library song page.');
  });

  it('stops at the maxTracks cap while appending a library-song page', async () => {
    const fullPage = Array.from({ length: 100 }, (_, index) => ({
      ...AM_LIBRARY_SONG,
      id: `i.libraryId${index}`,
      attributes: {
        ...AM_LIBRARY_SONG.attributes,
        playParams: { id: `i.libraryId${index}`, catalogId: String(index) },
      },
    }));
    const { fetchImpl, calls } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: {
        data: fullPage,
        next: '/v1/me/library/songs?offset=100',
      },
    });

    const results = await fetchAppleMusicLibrarySongs({
      developerToken: 'devtok',
      musicUserToken: 'mut-1',
      fetchImpl,
      apiBase: API_BASE,
      maxTracks: 10,
    });

    expect(results).toHaveLength(10);
    expect(calls).toHaveLength(1);
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

describe('fetchAppleMusicLibrarySongsPage (RF-132 paging)', () => {
  const ORIGIN = 'https://am.test';
  const LIBRARY_URL = `${ORIGIN}/v1/me/library/songs`;
  const song = (index: number) => ({
    id: `i.lib${index}`,
    attributes: {
      name: `Song ${index}`,
      artistName: 'Artist',
      playParams: { id: `i.lib${index}`, catalogId: `c${index}` },
    },
  });
  const page = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => song(from + i));
  const base = { developerToken: 'devtok', musicUserToken: 'mut-1', apiBase: API_BASE };

  it('stops at a page boundary at the target and returns Apple’s own next', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: { data: page(0, 100), next: '/v1/me/library/songs?offset=100' },
      [`${LIBRARY_URL}?offset=100`]: {
        data: page(100, 100),
        next: '/v1/me/library/songs?offset=200',
      },
      [`${LIBRARY_URL}?offset=200`]: { data: page(200, 5) },
    });

    const first = await fetchAppleMusicLibrarySongsPage({ ...base, fetchImpl, targetTracks: 200 });

    expect(first.tracks).toHaveLength(200);
    expect(first.next).toBe('/v1/me/library/songs?offset=200');
    expect(calls).toHaveLength(2);

    const second = await fetchAppleMusicLibrarySongsPage({
      ...base,
      fetchImpl,
      cursor: first.next,
    });
    expect(second.tracks.map((t) => t.providerTrackId)).toEqual([
      'c200',
      'c201',
      'c202',
      'c203',
      'c204',
    ]);
    expect(second.next).toBeNull();
    expect(calls.at(-1)?.url).toBe(`${LIBRARY_URL}?offset=200`);
    expect(calls.at(-1)?.init?.headers?.['Music-User-Token']).toBe('mut-1');
  });

  it('keeps whole pages when Apple pages are smaller than the target', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: { data: page(0, 30), next: '/v1/me/library/songs?offset=30' },
      [`${LIBRARY_URL}?offset=30`]: { data: page(30, 30), next: '/v1/me/library/songs?offset=60' },
    });
    const out = await fetchAppleMusicLibrarySongsPage({
      ...base,
      fetchImpl,
      targetTracks: 50,
    });
    expect(out.tracks).toHaveLength(60);
    expect(out.next).toBe('/v1/me/library/songs?offset=60');
    expect(calls).toHaveLength(2);
  });

  it('bounds the provider pages one read may request', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: { data: page(0, 1), next: '/v1/me/library/songs?offset=1' },
      [`${LIBRARY_URL}?offset=1`]: { data: page(1, 1), next: '/v1/me/library/songs?offset=2' },
    });
    const out = await fetchAppleMusicLibrarySongsPage({ ...base, fetchImpl, maxPages: 2 });
    expect(out.tracks).toHaveLength(2);
    expect(out.next).toBe('/v1/me/library/songs?offset=2');
    expect(calls).toHaveLength(2);
  });

  it('treats an empty page as the end of the library', async () => {
    const { fetchImpl } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: { data: [], next: '/v1/me/library/songs?offset=0' },
    });
    const out = await fetchAppleMusicLibrarySongsPage({ ...base, fetchImpl });
    expect(out).toEqual({ tracks: [], next: null });
  });

  it.each([
    'https://evil.test/v1/me/library/songs?offset=100',
    '//evil.test/v1/me/library/songs?offset=100',
    '/v1/me/library/playlists?offset=100',
    '/v1/me/library/songs/../../storefront?x=1',
    '/v1/me/library/songs?offset=100#frag',
    '/v1/me/library/songs',
  ])('rejects a cursor outside /v1/me/library/songs (%s) before any request', async (cursor) => {
    const fetchImpl = vi.fn<FetchLike>();
    await expect(
      fetchAppleMusicLibrarySongsPage({ ...base, fetchImpl, cursor }),
    ).rejects.toBeInstanceOf(InvalidProviderCursorError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats a library-songs next off /v1/me/library/songs as drift instead of following it', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${LIBRARY_URL}?limit=100`]: { data: page(0, 1), next: '/v1/me/storefront?offset=1' },
    });
    await expect(fetchAppleMusicLibrarySongsPage({ ...base, fetchImpl })).rejects.toBeInstanceOf(
      ProviderError,
    );
    expect(calls).toHaveLength(1);
  });

  it("accepts a cursor carrying ' ( ) ! * (left raw by encodeURIComponent)", async () => {
    const cursor = "/v1/me/library/songs?offset=200&l=en-US&x=(a)!*'";
    const { fetchImpl, calls } = fakeFetch({ [`${ORIGIN}${cursor}`]: { data: page(200, 1) } });
    const out = await fetchAppleMusicLibrarySongsPage({ ...base, fetchImpl, cursor });
    expect(out.tracks).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${ORIGIN}${cursor}`);
  });

  it('throws AppleMusicUnauthorizedError on 401 for a later page', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => '',
    });
    await expect(
      fetchAppleMusicLibrarySongsPage({
        ...base,
        fetchImpl,
        cursor: '/v1/me/library/songs?offset=200',
      }),
    ).rejects.toBeInstanceOf(AppleMusicUnauthorizedError);
  });
});

describe('searchAppleMusicLibrarySongs (RF-132 server-side library search)', () => {
  const ORIGIN = 'https://am.test';
  const SEARCH_URL = `${ORIGIN}/v1/me/library/search`;
  const song = (id: string) => ({
    id,
    attributes: { name: `Song ${id}`, artistName: 'Artist', playParams: { catalogId: `c-${id}` } },
  });
  const base = { developerToken: 'devtok', musicUserToken: 'mut-1', apiBase: API_BASE };

  it('searches library-songs with + between words, limit 25, and both tokens', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [SEARCH_URL]: { results: { 'library-songs': { data: [song('a')] } } },
    });
    const out = await searchAppleMusicLibrarySongs({
      ...base,
      fetchImpl,
      query: '  angel   of  mine&x ',
    });
    expect(out.map((t) => t.providerTrackId)).toEqual(['c-a']);
    expect(calls[0]?.url).toBe(`${SEARCH_URL}?term=angel+of+mine%26x&types=library-songs&limit=25`);
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer devtok');
    expect(calls[0]?.init?.headers?.['Music-User-Token']).toBe('mut-1');
  });

  it('follows Apple’s library-search next for up to four pages', async () => {
    const next = (offset: number) =>
      `/v1/me/library/search?offset=${offset}&term=love&types=library-songs`;
    const pages: Record<string, unknown> = {
      [`${SEARCH_URL}?term=love&types=library-songs&limit=25`]: {
        results: { 'library-songs': { data: [song('0')], next: next(25) } },
      },
    };
    for (const offset of [25, 50, 75]) {
      pages[`${ORIGIN}${next(offset)}`] = {
        results: { 'library-songs': { data: [song(String(offset))], next: next(offset + 25) } },
      };
    }
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      if (!(url in pages)) throw new Error(`Unexpected request ${url}`);
      return { ok: true, status: 200, json: async () => pages[url], text: async () => '' };
    };
    const out = await searchAppleMusicLibrarySongs({ ...base, fetchImpl, query: 'love' });
    expect(out).toHaveLength(4);
    expect(calls).toHaveLength(4);
  });

  it.each([
    'https://evil.test/x?y=1',
    '/v1/me/library/songs?offset=25',
    '/v1/me/library/search?offset=25&term=..%2F..%2Fstorefront',
    '/v1/me/library/search/../../storefronts?offset=25',
  ])(
    'treats a search next off /v1/me/library/search (%s) as drift, not a silent end',
    async (next) => {
      const { fetchImpl, calls } = fakeFetch({
        [SEARCH_URL]: { results: { 'library-songs': { data: [song('a')], next } } },
      });
      await expect(
        searchAppleMusicLibrarySongs({ ...base, fetchImpl, query: 'a' }),
      ).rejects.toBeInstanceOf(ProviderError);
      expect(calls).toHaveLength(1);
    },
  );

  // Regression (#665 review item 2): encodeURIComponent leaves ' ( ) ! * raw, and
  // Apple echoes the term into `next`; rejecting them stopped such searches at 25.
  it.each([
    ["don't stop", "don't+stop"],
    ['(remix)', '(remix)'],
    ['wow! *live*', 'wow!+*live*'],
  ])('follows Apple’s next for a %s search past the first 25 matches', async (query, term) => {
    const first = `${SEARCH_URL}?term=${term}&types=library-songs&limit=25`;
    const next = `/v1/me/library/search?offset=25&term=${term}&types=library-songs`;
    const pages: Record<string, unknown> = {
      [first]: { results: { 'library-songs': { data: [song('1')], next } } },
      [`${ORIGIN}${next}`]: { results: { 'library-songs': { data: [song('26')] } } },
    };
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      if (!(url in pages)) throw new Error(`Unexpected request ${url}`);
      return { ok: true, status: 200, json: async () => pages[url], text: async () => '' };
    };
    const out = await searchAppleMusicLibrarySongs({ ...base, fetchImpl, query });
    expect(out.map((t) => t.providerTrackId)).toEqual(['c-1', 'c-26']);
    expect(calls).toEqual([first, `${ORIGIN}${next}`]);
  });

  it('returns [] for no matches and for a blank query without calling Apple', async () => {
    const { fetchImpl, calls } = fakeFetch({ [SEARCH_URL]: { results: {} } });
    expect(await searchAppleMusicLibrarySongs({ ...base, fetchImpl, query: 'zzz' })).toEqual([]);
    expect(await searchAppleMusicLibrarySongs({ ...base, fetchImpl, query: '   ' })).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('throws AppleMusicUnauthorizedError on 401/403 and ProviderError on a bad shape', async () => {
    for (const status of [401, 403]) {
      const fetchImpl: FetchLike = async () => ({
        ok: false,
        status,
        json: async () => ({}),
        text: async () => '',
      });
      await expect(
        searchAppleMusicLibrarySongs({ ...base, fetchImpl, query: 'a' }),
      ).rejects.toBeInstanceOf(AppleMusicUnauthorizedError);
    }
    const { fetchImpl } = fakeFetch({ [SEARCH_URL]: { results: 'nope' } });
    await expect(
      searchAppleMusicLibrarySongs({ ...base, fetchImpl, query: 'a' }),
    ).rejects.toBeInstanceOf(ProviderError);
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
      url: 'https://music.apple.com/us/playlist/cycle-bangers/pl.abc123',
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
        providerUri: 'https://music.apple.com/us/playlist/cycle-bangers/pl.abc123',
        name: 'Cycle Bangers',
        ownerName: 'DJ Ritmo',
        trackCount: 12,
        coverImageUrl: 'https://is1.mzstatic.com/image/512x512.jpg',
      },
    ]);
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer devtok');
    expect(calls[0]?.init?.headers?.['Music-User-Token']).toBe('mut-1');
  });

  // trackCount stays null rather than 0: Apple's LibraryPlaylists attributes never
  // carry a count, so a 0 default made every saved playlist claim "0 tracks" above
  // its real tracks. Name and cover still fall back — those are display defaults,
  // not claims about the library.
  it('defaults name/owner/cover when attributes are absent, and reports an unknown trackCount as null', async () => {
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
        providerUri: null,
        name: 'Untitled playlist',
        ownerName: null,
        trackCount: null,
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

  it('rejects a malformed later page instead of returning partial library playlists', async () => {
    const { fetchImpl } = fakeFetch({
      [`${PLAYLISTS_URL}?limit=100`]: {
        data: [AM_LIBRARY_PLAYLIST],
        next: '/v1/me/library/playlists?offset=100',
      },
      [`${PLAYLISTS_URL}?offset=100`]: { data: 'invalid' },
    });

    await expect(
      fetchAppleMusicLibraryPlaylists({
        developerToken: 'devtok',
        musicUserToken: 'mut-1',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toThrow('Apple Music returned an invalid library playlist page.');
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

  it('rejects a malformed later page instead of returning a partial playlist', async () => {
    const { fetchImpl } = fakeFetch({
      [`${PLAYLISTS_URL}/p.abc123/tracks?limit=100`]: {
        data: [AM_LIBRARY_SONG],
        next: '/v1/me/library/playlists/p.abc123/tracks?offset=100',
      },
      [`${PLAYLISTS_URL}/p.abc123/tracks?offset=100`]: { data: 'invalid' },
    });

    await expect(
      fetchAppleMusicLibraryPlaylistTracks({
        developerToken: 'devtok',
        musicUserToken: 'mut-1',
        playlistId: 'p.abc123',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toThrow('Apple Music returned an invalid library playlist track page.');
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
    expect(call.url).toContain('limit=100');
    expect(call.init?.headers?.Authorization).toBe('Bearer devtok');
    expect(call.init?.headers?.['Music-User-Token']).toBeUndefined();
  });

  it('follows the relative next cursor, re-appending the page limit', async () => {
    const secondSong = { ...AM_SONG, id: '2' };
    const { provider, calls } = makeProvider({
      [`${TRACKS_URL}?offset=300`]: { data: [secondSong] },
      [`${TRACKS_URL}?limit=100`]: {
        data: [AM_SONG],
        next: '/v1/catalog/gb/playlists/pl.abc123/tracks?offset=300',
      },
    });

    const results = await provider.getPlaylist(REF);

    expect(results.map((r) => r.providerTrackId)).toEqual(['1440857781', '2']);
    const pageCalls = calls.filter((c) => c.url.startsWith(TRACKS_URL)).map((c) => c.url);
    expect(pageCalls).toEqual([`${TRACKS_URL}?limit=100`, `${TRACKS_URL}?offset=300&limit=100`]);
  });

  it('normalizes next that already includes limit to a single limit=100', async () => {
    const secondSong = { ...AM_SONG, id: '2' };
    const { provider, calls } = makeProvider({
      [`${TRACKS_URL}?offset=300`]: { data: [secondSong] },
      [`${TRACKS_URL}?limit=100`]: {
        data: [AM_SONG],
        // Apple sometimes echoes limit on `next` (same or different value).
        next: '/v1/catalog/gb/playlists/pl.abc123/tracks?offset=300&limit=100',
      },
    });

    const results = await provider.getPlaylist(REF);

    expect(results.map((r) => r.providerTrackId)).toEqual(['1440857781', '2']);
    const pageCalls = calls.filter((c) => c.url.startsWith(TRACKS_URL)).map((c) => c.url);
    expect(pageCalls).toEqual([`${TRACKS_URL}?limit=100`, `${TRACKS_URL}?offset=300&limit=100`]);
    expect(pageCalls[1]?.match(/limit=/g)).toHaveLength(1);
    expect(pageCalls[1]).toContain('limit=100');
  });

  it('adds limit when next is a path with no query string', async () => {
    const secondSong = { ...AM_SONG, id: '2' };
    // Both pages share the same URL after normalization; key by hit count so the
    // second request can return the second song instead of replaying page 1.
    const calls: { url: string }[] = [];
    let hits = 0;
    const fetchImpl: FetchLike = async (url) => {
      calls.push({ url });
      hits += 1;
      if (hits === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [AM_SONG],
            next: '/v1/catalog/gb/playlists/pl.abc123/tracks',
          }),
          text: async () => '',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [secondSong] }),
        text: async () => '',
      };
    };
    const provider = createAppleMusicProvider({
      developerToken: 'devtok',
      fetchImpl,
      apiBase: API_BASE,
      storefront: 'us',
    });

    const results = await provider.getPlaylist(REF);

    expect(results.map((r) => r.providerTrackId)).toEqual(['1440857781', '2']);
    expect(calls.map((c) => c.url)).toEqual([`${TRACKS_URL}?limit=100`, `${TRACKS_URL}?limit=100`]);
    expect(calls[1]?.url.match(/limit=/g)).toHaveLength(1);
  });

  describe('catalog pagination termination', () => {
    const PATH = '/v1/catalog/gb/playlists/pl.abc123/tracks';

    function readPages(pages: { data: unknown[]; next?: string }[]) {
      const calls: string[] = [];
      const fetchImpl: FetchLike = async (url) => {
        calls.push(url);
        // A regression fails within a fixed fetch count rather than hanging.
        const page = pages[calls.length - 1];
        if (!page) throw new Error('Pagination sentinel reached.');
        return {
          ok: true,
          status: 200,
          json: async () => page,
          text: async () => '',
        };
      };
      const provider = createAppleMusicProvider({
        developerToken: 'devtok',
        fetchImpl,
        apiBase: API_BASE,
      });
      return { result: provider.getPlaylist(REF), calls };
    }

    describe.each([
      { name: 'valid songs', row: AM_SONG },
      { name: 'unmappable songs', row: { id: 'unmappable', type: 'songs' } },
      { name: 'non-song resources', row: { ...AM_SONG, type: 'music-videos' } },
    ])('with $name', ({ row }) => {
      it('rejects a repeated continuation without returning partial results', async () => {
        // The first continuation normalizes to the initial URL and is allowed.
        const { result, calls } = readPages([
          { data: [row], next: PATH },
          { data: [row], next: PATH },
        ]);

        await expect(result).rejects.toBeInstanceOf(ProviderError);
        await expect(result).rejects.toThrow(
          'Apple Music returned a repeated catalog pagination path.',
        );
        expect(calls).toEqual([`${TRACKS_URL}?limit=100`, `${TRACKS_URL}?limit=100`]);
      });

      it('rejects a multi-page continuation cycle before fetching again', async () => {
        const firstNext = `${PATH}?offset=300`;
        const secondNext = `${PATH}?offset=600`;
        const { result, calls } = readPages([
          { data: [AM_SONG], next: firstNext },
          { data: [row], next: secondNext },
          { data: [row], next: firstNext },
        ]);

        await expect(result).rejects.toBeInstanceOf(ProviderError);
        await expect(result).rejects.toThrow(
          'Apple Music returned a repeated catalog pagination path.',
        );
        expect(calls).toEqual([
          `${TRACKS_URL}?limit=100`,
          `${TRACKS_URL}?offset=300&limit=100`,
          `${TRACKS_URL}?offset=600&limit=100`,
        ]);
      });
    });

    it.each([
      { name: 'unmappable songs', row: { id: 'unmappable', type: 'songs' } },
      { name: 'non-song resources', row: { ...AM_SONG, type: 'music-videos' } },
    ])('preserves order through an advancing page of $name', async ({ row }) => {
      const { result, calls } = readPages([
        { data: [AM_SONG], next: `${PATH}?offset=300` },
        { data: [row], next: `${PATH}?offset=600` },
        { data: [{ ...AM_SONG, id: 'last' }] },
      ]);

      await expect(result).resolves.toMatchObject([
        { providerTrackId: AM_SONG.id },
        { providerTrackId: 'last' },
      ]);
      expect(calls).toHaveLength(3);
    });

    it('allows distinct raw continuations that normalize to the same fetch URL', async () => {
      const { result, calls } = readPages([
        { data: [AM_SONG], next: `${PATH}?offset=300&limit=100` },
        { data: [{ ...AM_SONG, id: 'second' }], next: `${PATH}?offset=300&limit=200` },
        { data: [{ ...AM_SONG, id: 'third' }] },
      ]);

      await expect(result).resolves.toMatchObject([
        { providerTrackId: AM_SONG.id },
        { providerTrackId: 'second' },
        { providerTrackId: 'third' },
      ]);
      expect(calls).toEqual([
        `${TRACKS_URL}?limit=100`,
        `${TRACKS_URL}?offset=300&limit=100`,
        `${TRACKS_URL}?offset=300&limit=100`,
      ]);
    });

    it('stops at an empty page before checking its repeated continuation', async () => {
      const next = `${PATH}?offset=300`;
      const { result, calls } = readPages([
        { data: [AM_SONG], next },
        { data: [], next },
      ]);

      await expect(result).resolves.toMatchObject([{ providerTrackId: AM_SONG.id }]);
      expect(calls).toHaveLength(2);
    });

    it('rejects a page that crosses 100 songs and does not fetch past it', async () => {
      const next = `${PATH}?offset=300`;
      const { result, calls } = readPages([
        { data: [AM_SONG], next },
        {
          data: Array.from({ length: 500 }, (_, i) => ({ ...AM_SONG, id: String(i) })),
          next,
        },
      ]);

      await expect(result).rejects.toBeInstanceOf(PlaylistOverLimitError);
      await expect(result).rejects.toThrow('Playlist has more than 100 songs.');
      expect(calls).toHaveLength(2);
    });
  });

  it('rejects a malformed later page instead of returning a partial playlist', async () => {
    const { provider } = makeProvider({
      [`${TRACKS_URL}?offset=300`]: { data: 'invalid' },
      [`${TRACKS_URL}?limit=100`]: {
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

  it('does not follow the next catalog page once the preview deadline has passed', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000_000);
      const deadlineAt = 1_001_000;
      const calls: string[] = [];
      const fetchImpl: FetchLike = async (url) => {
        calls.push(url);
        if (calls.length > 1) throw new Error(`unexpected page ${url}`);
        vi.setSystemTime(deadlineAt);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [AM_SONG],
            next: '/v1/catalog/gb/playlists/pl.abc123/tracks?offset=100',
          }),
          text: async () => '',
        };
      };
      const provider = createAppleMusicProvider({
        developerToken: 'devtok',
        fetchImpl,
        apiBase: API_BASE,
        storefront: 'us',
      });

      await expect(provider.getPlaylist(REF, { deadlineAt })).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(calls).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
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
