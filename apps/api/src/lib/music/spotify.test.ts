import { describe, it, expect } from 'vitest';
import {
  createSpotifyProvider,
  fetchSpotifySavedPlaylists,
  fetchSpotifySavedTracks,
  SpotifyUnauthorizedError,
  type FetchLike,
} from '@ritmofit/music';

/** A scripted fetch: route by URL prefix, record calls, return canned JSON. */
function fakeFetch(handlers: Record<string, unknown>) {
  const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const key = Object.keys(handlers)
      .sort((a, b) => b.length - a.length)
      .find((candidate) => url.startsWith(candidate));
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

const TOKEN_URL = 'https://token.test/api/token';
const API_BASE = 'https://api.test/v1';

const SP_TRACK = {
  id: '4cOdK2wGLETKBW3PvgPWqT',
  uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
  name: 'Never Gonna Give You Up',
  duration_ms: 213000,
  external_urls: { spotify: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT' },
  artists: [{ name: 'Rick Astley' }, { name: 'PWL' }],
  album: {
    images: [
      { url: 'https://i.scdn.co/image/big.jpg' },
      { url: 'https://i.scdn.co/image/small.jpg' },
    ],
  },
  // an audio-features/tempo field would never be read — not present here:
  popularity: 80,
};

function makeProvider(handlers: Record<string, unknown>) {
  const { fetchImpl, calls } = fakeFetch({
    [TOKEN_URL]: { access_token: 'tok-1', expires_in: 3600 },
    ...handlers,
  });
  const provider = createSpotifyProvider({
    clientId: 'cid',
    clientSecret: 'secret',
    fetchImpl,
    apiBase: API_BASE,
    tokenUrl: TOKEN_URL,
  });
  return { provider, calls };
}

describe('SpotifyProvider.search', () => {
  it('maps tracks.items → contract candidates (joined artists, first image)', async () => {
    const { provider } = makeProvider({
      [`${API_BASE}/search`]: { tracks: { items: [SP_TRACK] } },
    });
    const results = await provider.search('rick astley');
    expect(results).toEqual([
      {
        provider: 'spotify',
        providerTrackId: '4cOdK2wGLETKBW3PvgPWqT',
        providerUri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley, PWL',
        albumArtUrl: 'https://i.scdn.co/image/big.jpg',
        durationMs: 213000,
      },
    ]);
  });

  it('returns [] for a blank query without calling the API', async () => {
    const { provider, calls } = makeProvider({});
    expect(await provider.search('   ')).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('authorizes with a Basic client-credentials token then a Bearer call', async () => {
    const { provider, calls } = makeProvider({ [`${API_BASE}/search`]: { tracks: { items: [] } } });
    await provider.search('x');
    const token = calls.find((c) => c.url.startsWith(TOKEN_URL))!;
    expect(token.init?.method).toBe('POST');
    expect(token.init?.headers?.Authorization).toMatch(/^Basic /);
    expect(token.init?.body).toContain('grant_type=client_credentials');
    const search = calls.find((c) => c.url.startsWith(`${API_BASE}/search`))!;
    expect(search.init?.headers?.Authorization).toBe('Bearer tok-1');
  });

  it('caches the app token across calls', async () => {
    const { provider, calls } = makeProvider({ [`${API_BASE}/search`]: { tracks: { items: [] } } });
    await provider.search('a');
    await provider.search('b');
    expect(calls.filter((c) => c.url.startsWith(TOKEN_URL))).toHaveLength(1);
  });
});

describe('SpotifyProvider.lookup', () => {
  it('maps a single track', async () => {
    const { provider } = makeProvider({ [`${API_BASE}/tracks/`]: SP_TRACK });
    const r = await provider.lookup('4cOdK2wGLETKBW3PvgPWqT');
    expect(r?.providerTrackId).toBe('4cOdK2wGLETKBW3PvgPWqT');
    expect(r?.provider).toBe('spotify');
  });
});

describe('SpotifyProvider.getPlaylist', () => {
  it('paginates every playlist item in 50-track pages', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      track: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const secondTrack = {
      ...SP_TRACK,
      id: 'track-50',
      uri: 'spotify:track:track-50',
    };
    const playlistUrl = `${API_BASE}/playlists/playlist-id/tracks`;
    const { provider, calls } = makeProvider({
      [`${playlistUrl}?limit=50&offset=50`]: { items: [{ track: secondTrack }], total: 51 },
      [`${playlistUrl}?limit=50&offset=0`]: { items: firstPage, total: 51 },
    });

    const results = await provider.getPlaylist('playlist-id');

    expect(results).toHaveLength(51);
    expect(results[0]?.providerTrackId).toBe('track-0');
    expect(results[50]?.providerTrackId).toBe('track-50');
    expect(
      calls.filter((call) => call.url.startsWith(playlistUrl)).map((call) => call.url),
    ).toEqual([`${playlistUrl}?limit=50&offset=0`, `${playlistUrl}?limit=50&offset=50`]);
  });

  it('rejects a malformed later page instead of returning a partial playlist', async () => {
    const playlistUrl = `${API_BASE}/playlists/playlist-id/tracks`;
    const { provider } = makeProvider({
      [`${playlistUrl}?limit=50&offset=1`]: { items: 'invalid', total: 2 },
      [`${playlistUrl}?limit=50&offset=0`]: { items: [{ track: SP_TRACK }], total: 2 },
    });

    await expect(provider.getPlaylist('playlist-id')).rejects.toThrow(
      'Spotify returned an invalid playlist page.',
    );
  });

  it('refreshes an expired app token while fetching a playlist page', async () => {
    const calls: { url: string; authorization?: string }[] = [];
    let tokenCalls = 0;
    let playlistCalls = 0;
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, authorization: init?.headers?.Authorization });
      if (url === TOKEN_URL) {
        tokenCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: `tok-${tokenCalls}`, expires_in: 3600 }),
          text: async () => '',
        };
      }

      playlistCalls += 1;
      const ok = playlistCalls > 1;
      return {
        ok,
        status: ok ? 200 : 401,
        json: async () => ({ items: [{ track: SP_TRACK }], total: 1 }),
        text: async () => (ok ? '' : 'expired'),
      };
    };
    const provider = createSpotifyProvider({
      clientId: 'cid',
      clientSecret: 'secret',
      fetchImpl,
      apiBase: API_BASE,
      tokenUrl: TOKEN_URL,
    });

    await expect(provider.getPlaylist('playlist-id')).resolves.toHaveLength(1);
    expect(tokenCalls).toBe(2);
    expect(
      calls
        .filter((call) => call.url.startsWith(`${API_BASE}/playlists`))
        .map((call) => call.authorization),
    ).toEqual(['Bearer tok-1', 'Bearer tok-2']);
  });
});

describe('fetchSpotifySavedTracks', () => {
  const SAVED_URL = `${API_BASE}/me/tracks`;

  it('maps the `{ track }`-wrapped saved items with a per-user Bearer token', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${SAVED_URL}?limit=50&offset=0`]: { items: [{ track: SP_TRACK }], total: 1 },
    });
    const results = await fetchSpotifySavedTracks({
      accessToken: 'user-tok',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toEqual([
      {
        provider: 'spotify',
        providerTrackId: '4cOdK2wGLETKBW3PvgPWqT',
        providerUri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley, PWL',
        albumArtUrl: 'https://i.scdn.co/image/big.jpg',
        durationMs: 213000,
      },
    ]);
    // Spends the user's token directly — no client-credentials app token.
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer user-tok');
  });

  it('paginates the total-counted feed in 50-track pages', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      track: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const { fetchImpl, calls } = fakeFetch({
      [`${SAVED_URL}?limit=50&offset=0`]: { items: firstPage, total: 51 },
      [`${SAVED_URL}?limit=50&offset=50`]: { items: [{ track: SP_TRACK }], total: 51 },
    });
    const results = await fetchSpotifySavedTracks({
      accessToken: 't',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(results).toHaveLength(51);
    expect(calls.filter((c) => c.url.startsWith(SAVED_URL)).map((c) => c.url)).toEqual([
      `${SAVED_URL}?limit=50&offset=0`,
      `${SAVED_URL}?limit=50&offset=50`,
    ]);
  });

  it('throws SpotifyUnauthorizedError on a 401 so the caller can refresh + retry', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'expired',
    });
    await expect(
      fetchSpotifySavedTracks({ accessToken: 'stale', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SpotifyUnauthorizedError);
  });
});

describe('fetchSpotifySavedPlaylists', () => {
  const PLAYLISTS_URL = `${API_BASE}/me/playlists`;

  it('maps saved playlists into compact provider playlist cards', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${PLAYLISTS_URL}?limit=50&offset=0`]: {
        items: [
          {
            id: 'pl-1',
            name: 'Warmup Ride',
            owner: { display_name: 'Steven' },
            tracks: { total: 24 },
            images: [{ url: 'https://i.scdn.co/image/pl-1.jpg' }],
          },
        ],
        total: 1,
      },
    });

    const results = await fetchSpotifySavedPlaylists({
      accessToken: 'user-playlist-token',
      fetchImpl,
      apiBase: API_BASE,
    });

    expect(results).toEqual([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        name: 'Warmup Ride',
        ownerName: 'Steven',
        trackCount: 24,
        coverImageUrl: 'https://i.scdn.co/image/pl-1.jpg',
      },
    ]);
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer user-playlist-token');
  });

  it('throws SpotifyUnauthorizedError on a 401 so callers can refresh + retry', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'expired',
    });

    await expect(
      fetchSpotifySavedPlaylists({ accessToken: 'stale', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SpotifyUnauthorizedError);
  });
});

describe('SpotifyProvider transient-retry wiring', () => {
  it('retries a transient 503 search response then succeeds', async () => {
    let searchCalls = 0;
    const fetchImpl: FetchLike = async (url) => {
      if (url === TOKEN_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'tok', expires_in: 3600 }),
          text: async () => '',
        };
      }
      searchCalls += 1;
      const ok = searchCalls > 1; // first attempt 503, retry 200
      return {
        ok,
        status: ok ? 200 : 503,
        json: async () => ({ tracks: { items: ok ? [SP_TRACK] : [] } }),
        text: async () => '',
      };
    };
    const provider = createSpotifyProvider({
      clientId: 'cid',
      clientSecret: 'secret',
      fetchImpl,
      apiBase: API_BASE,
      tokenUrl: TOKEN_URL,
      retry: { sleep: async () => {} }, // no real backoff in tests
    });

    const results = await provider.search('rick');
    expect(results).toHaveLength(1);
    expect(searchCalls).toBe(2);
  });
});
