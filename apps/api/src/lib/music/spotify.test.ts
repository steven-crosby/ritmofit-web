import { describe, it, expect, vi } from 'vitest';
import {
  createSpotifyProvider,
  fetchSpotifyPlaylistTracks,
  fetchSpotifySavedPlaylists,
  fetchSpotifySavedTracks,
  fetchSpotifySavedTracksPage,
  InvalidProviderCursorError,
  SpotifyUnauthorizedError,
  SpotifyForbiddenError,
  SpotifyDevelopmentModeError,
  SpotifyPlaylistAccessDeniedError,
  ProviderError,
  ProviderQuotaExceededError,
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
      item: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const secondTrack = {
      ...SP_TRACK,
      id: 'track-50',
      uri: 'spotify:track:track-50',
    };
    const playlistUrl = `${API_BASE}/playlists/playlist-id/items`;
    const { provider, calls } = makeProvider({
      [`${playlistUrl}?limit=50&offset=50`]: { items: [{ item: secondTrack }], total: 51 },
      [`${playlistUrl}?limit=50&offset=0`]: { items: firstPage, total: 51 },
    });

    const results = await provider.getPlaylist({ provider: 'spotify', playlistId: 'playlist-id' });

    expect(results).toHaveLength(51);
    expect(results[0]?.providerTrackId).toBe('track-0');
    expect(results[50]?.providerTrackId).toBe('track-50');
    expect(
      calls.filter((call) => call.url.startsWith(playlistUrl)).map((call) => call.url),
    ).toEqual([`${playlistUrl}?limit=50&offset=0`, `${playlistUrl}?limit=50&offset=50`]);
  });

  it('rejects a playlist whose reported total is over 100 without another page', async () => {
    const fullPage = Array.from({ length: 50 }, (_, index) => ({
      item: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const playlistUrl = `${API_BASE}/playlists/playlist-id/items`;
    const { provider, calls } = makeProvider({
      [`${playlistUrl}?limit=50&offset=0`]: { items: fullPage, total: 1000 },
      [`${playlistUrl}?limit=50&offset=50`]: { items: fullPage, total: 1000 },
    });

    await expect(
      provider.getPlaylist({ provider: 'spotify', playlistId: 'playlist-id' }),
    ).rejects.toThrow('Playlist has 1000 songs. The limit is 100.');
    const playlistCalls = calls.filter((call) => call.url.startsWith(playlistUrl));
    expect(playlistCalls).toHaveLength(1);
  });

  it('rejects a malformed later page instead of returning a partial playlist', async () => {
    const playlistUrl = `${API_BASE}/playlists/playlist-id/items`;
    const { provider } = makeProvider({
      [`${playlistUrl}?limit=50&offset=1`]: { items: 'invalid', total: 2 },
      [`${playlistUrl}?limit=50&offset=0`]: { items: [{ item: SP_TRACK }], total: 2 },
    });

    await expect(
      provider.getPlaylist({ provider: 'spotify', playlistId: 'playlist-id' }),
    ).rejects.toThrow('Spotify returned an invalid playlist page.');
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
        json: async () => ({ items: [{ item: SP_TRACK }], total: 1 }),
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

    await expect(
      provider.getPlaylist({ provider: 'spotify', playlistId: 'playlist-id' }),
    ).resolves.toHaveLength(1);
    expect(tokenCalls).toBe(2);
    expect(
      calls
        .filter((call) => call.url.startsWith(`${API_BASE}/playlists`))
        .map((call) => call.authorization),
    ).toEqual(['Bearer tok-1', 'Bearer tok-2']);
  });

  it('requests the /items endpoint (not the retired /tracks) and maps the item entry', async () => {
    const playlistUrl = `${API_BASE}/playlists/pl-1/items`;
    const { provider, calls } = makeProvider({
      [`${playlistUrl}?limit=50&offset=0`]: { items: [{ item: SP_TRACK }], total: 1 },
    });

    const results = await provider.getPlaylist({ provider: 'spotify', playlistId: 'pl-1' });

    expect(results).toHaveLength(1);
    expect(results[0]?.providerTrackId).toBe('4cOdK2wGLETKBW3PvgPWqT');
    // Lock the 2026 migration: the import path must hit /items and read the `item`
    // entry, never the retired /playlists/{id}/tracks endpoint or its `track` field.
    const playlistCall = calls.find((call) => call.url.startsWith(`${API_BASE}/playlists`))!;
    expect(playlistCall.url).toContain('/playlists/pl-1/items');
    expect(playlistCall.url).not.toContain('/tracks');
  });

  it('degrades a page of item-less entries to empty without throwing', async () => {
    const playlistUrl = `${API_BASE}/playlists/pl-1/items`;
    const { provider } = makeProvider({
      [`${playlistUrl}?limit=50&offset=0`]: { items: [{}, { item: null }], total: 2 },
    });

    // A nullable/absent `item` must map to nothing, not crash the whole page.
    await expect(
      provider.getPlaylist({ provider: 'spotify', playlistId: 'pl-1' }),
    ).resolves.toEqual([]);
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

  it('rejects a malformed later page instead of returning partial saved tracks', async () => {
    const { fetchImpl } = fakeFetch({
      [`${SAVED_URL}?limit=50&offset=1`]: { items: 'invalid', total: 2 },
      [`${SAVED_URL}?limit=50&offset=0`]: { items: [{ track: SP_TRACK }], total: 2 },
    });

    await expect(
      fetchSpotifySavedTracks({
        accessToken: 't',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toThrow('Spotify returned an invalid saved-track page.');
  });

  it('stops at the maxTracks cap while appending a saved-track page', async () => {
    const fullPage = Array.from({ length: 50 }, (_, index) => ({
      track: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const { fetchImpl, calls } = fakeFetch({
      [`${SAVED_URL}?limit=50&offset=0`]: { items: fullPage, total: 500 },
      [`${SAVED_URL}?limit=50&offset=50`]: { items: [{ track: SP_TRACK }], total: 500 },
    });

    const results = await fetchSpotifySavedTracks({
      accessToken: 't',
      fetchImpl,
      apiBase: API_BASE,
      maxTracks: 10,
    });

    expect(results).toHaveLength(10);
    expect(calls.filter((call) => call.url.startsWith(SAVED_URL))).toHaveLength(1);
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

  it('throws SpotifyDevelopmentModeError when /me/tracks says the user is not registered', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () =>
        'Check settings on developer.spotify.com/dashboard, the user may not be registered.',
    });
    await expect(
      fetchSpotifySavedTracks({ accessToken: 'steven', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SpotifyDevelopmentModeError);
  });

  it('treats an unreadable /me/tracks 403 body as a provider error', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () => {
        throw new Error('body already consumed');
      },
    });
    await expect(
      fetchSpotifySavedTracks({ accessToken: 'steven', fetchImpl, apiBase: API_BASE }),
    ).rejects.toThrow('Spotify API 403 for /me/tracks');
  });

  it('keeps a /me/tracks 403 that is not an allowlist denial as a provider error', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () => 'Forbidden',
    });
    await expect(
      fetchSpotifySavedTracks({ accessToken: 'steven', fetchImpl, apiBase: API_BASE }),
    ).rejects.toThrow('Spotify API 403 for /me/tracks');
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
            external_urls: { spotify: 'https://open.spotify.com/playlist/pl-1' },
            owner: { display_name: 'Steven' },
            items: { total: 24 },
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
        providerUri: 'https://open.spotify.com/playlist/pl-1',
        name: 'Warmup Ride',
        ownerName: 'Steven',
        trackCount: 24,
        coverImageUrl: 'https://i.scdn.co/image/pl-1.jpg',
      },
    ]);
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer user-playlist-token');
  });

  it('rejects a malformed later page instead of returning partial saved playlists', async () => {
    const { fetchImpl } = fakeFetch({
      [`${PLAYLISTS_URL}?limit=50&offset=1`]: { items: 'invalid', total: 2 },
      [`${PLAYLISTS_URL}?limit=50&offset=0`]: {
        items: [{ id: 'pl-1', name: 'Warmup Ride', items: { total: 1 } }],
        total: 2,
      },
    });

    await expect(
      fetchSpotifySavedPlaylists({
        accessToken: 't',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toThrow('Spotify returned an invalid saved-playlist page.');
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

  it('throws SpotifyDevelopmentModeError when the 403 says the user is not registered', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () =>
        JSON.stringify({
          error: {
            status: 403,
            message: 'The user is not registered for this application',
          },
        }),
    });

    await expect(
      fetchSpotifySavedPlaylists({ accessToken: 'steven', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SpotifyDevelopmentModeError);
  });

  it('treats an unreadable /me/playlists 403 body as a missing scope, not an allowlist block', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () => {
        throw new Error('body already consumed');
      },
    });
    await expect(
      fetchSpotifySavedPlaylists({ accessToken: 'steven', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SpotifyForbiddenError);
  });

  it('throws SpotifyForbiddenError on a 403 — a valid token missing the playlist scope', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () => 'insufficient scope',
    });

    await expect(
      fetchSpotifySavedPlaylists({ accessToken: 'pre-expansion', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SpotifyForbiddenError);
  });

  it('reads trackCount from items.total, not the legacy tracks.total', async () => {
    const { fetchImpl } = fakeFetch({
      [`${PLAYLISTS_URL}?limit=50&offset=0`]: {
        items: [
          {
            id: 'pl-1',
            name: 'Warmup Ride',
            owner: { display_name: 'Steven' },
            // A legacy `tracks.total` alongside the current `items.total`: reading the
            // wrong one is exactly the 2026 bug that yielded 0-count cards, so lock it.
            tracks: { total: 999 },
            items: { total: 24 },
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

    expect(results[0]?.trackCount).toBe(24);
  });
});

describe('fetchSpotifyPlaylistTracks', () => {
  const itemsUrl = (id: string) => `${API_BASE}/playlists/${id}/items`;

  it('maps the `{ item }`-wrapped playlist items with a per-user Bearer token', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items: [{ item: SP_TRACK }], total: 1 },
    });

    const results = await fetchSpotifyPlaylistTracks({
      accessToken: 'user-tok',
      playlistId: 'pl-1',
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
    // Spends the user's playlist token directly — no client-credentials app token.
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer user-tok');
  });

  it('paginates the total-counted feed in 50-track pages', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      item: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const { fetchImpl, calls } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items: firstPage, total: 51 },
      [`${itemsUrl('pl-1')}?limit=50&offset=50`]: { items: [{ item: SP_TRACK }], total: 51 },
    });

    const results = await fetchSpotifyPlaylistTracks({
      accessToken: 't',
      playlistId: 'pl-1',
      fetchImpl,
      apiBase: API_BASE,
    });

    expect(results).toHaveLength(51);
    expect(calls.filter((c) => c.url.startsWith(itemsUrl('pl-1'))).map((c) => c.url)).toEqual([
      `${itemsUrl('pl-1')}?limit=50&offset=0`,
      `${itemsUrl('pl-1')}?limit=50&offset=50`,
    ]);
  });

  it('rejects a malformed later page instead of returning partial playlist tracks', async () => {
    const { fetchImpl } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=1`]: { items: 'invalid', total: 2 },
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items: [{ item: SP_TRACK }], total: 2 },
    });

    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 't',
        playlistId: 'pl-1',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toThrow('Spotify returned an invalid saved-playlist track page.');
  });

  it('stops at the maxTracks cap so detail reads stay bounded', async () => {
    const fullPage = Array.from({ length: 50 }, (_, index) => ({
      item: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const { fetchImpl, calls } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items: fullPage, total: 500 },
    });

    const results = await fetchSpotifyPlaylistTracks({
      accessToken: 't',
      playlistId: 'pl-1',
      fetchImpl,
      apiBase: API_BASE,
      maxTracks: 10,
    });

    expect(results).toHaveLength(10);
    // The cap halts pagination after the first page even though total claims 500.
    expect(calls.filter((c) => c.url.startsWith(itemsUrl('pl-1')))).toHaveLength(1);
  });

  it('URL-encodes the playlist id in the request path', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${API_BASE}/playlists/pl%2F1/items?limit=50&offset=0`]: { items: [], total: 0 },
    });

    await fetchSpotifyPlaylistTracks({
      accessToken: 't',
      playlistId: 'pl/1',
      fetchImpl,
      apiBase: API_BASE,
    });

    expect(calls[0]?.url).toContain('/playlists/pl%2F1/items');
  });

  it('throws SpotifyUnauthorizedError on a 401 so callers can refresh + retry', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'expired',
    });

    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 'stale',
        playlistId: 'pl-1',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toBeInstanceOf(SpotifyUnauthorizedError);
  });

  it('throws SpotifyForbiddenError on a 403 whose body is a scope or auth failure', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () => 'insufficient scope',
    });

    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 'pre-expansion',
        playlistId: 'pl-1',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toBeInstanceOf(SpotifyForbiddenError);
  });

  it('throws SpotifyPlaylistAccessDeniedError on a 403 that is not an auth failure', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () => 'You can only open playlists you own or collaborate on.',
    });

    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 'user-tok',
        playlistId: 'pl-1',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toBeInstanceOf(SpotifyPlaylistAccessDeniedError);
  });

  it('stops a user-token preview when Spotify reports a total over 100', async () => {
    const playlistUrl = `${itemsUrl('pl-1')}?limit=50&offset=0`;
    const fullPage = Array.from({ length: 50 }, (_, index) => ({
      item: { ...SP_TRACK, id: `track-${index}`, uri: `spotify:track:track-${index}` },
    }));
    const { fetchImpl, calls } = fakeFetch({
      [playlistUrl]: { items: fullPage, total: 101 },
      [`${itemsUrl('pl-1')}?limit=50&offset=50`]: { items: fullPage, total: 101 },
    });

    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 'user-tok',
        playlistId: 'pl-1',
        fetchImpl,
        apiBase: API_BASE,
        occurrenceLimit: 100,
      }),
    ).rejects.toThrow('Playlist has 101 songs. The limit is 100.');
    expect(calls.filter((call) => call.url.startsWith(itemsUrl('pl-1')))).toHaveLength(1);
    expect(calls.some((call) => call.url.includes('accounts.spotify.com'))).toBe(false);
    expect(calls[0]?.init?.headers?.Authorization).toBe('Bearer user-tok');
  });

  it('requests the /items endpoint, not the retired /tracks', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items: [{ item: SP_TRACK }], total: 1 },
    });

    await fetchSpotifyPlaylistTracks({
      accessToken: 'user-tok',
      playlistId: 'pl-1',
      fetchImpl,
      apiBase: API_BASE,
    });

    expect(calls[0]?.url).toContain('/playlists/pl-1/items');
    expect(calls[0]?.url).not.toContain('/tracks');
  });

  it('degrades item-less entries to empty without throwing', async () => {
    const { fetchImpl } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items: [{}, { item: null }], total: 2 },
    });

    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 'user-tok',
        playlistId: 'pl-1',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).resolves.toEqual([]);
  });

  it('does not request the next page once shouldStop trips on the current page', async () => {
    const items = Array.from({ length: 101 }, (_, index) => ({
      item: { ...SP_TRACK, id: `t-${index}`, uri: `spotify:track:t-${index}` },
    }));
    const { fetchImpl, calls } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items, total: 250 },
      [`${itemsUrl('pl-1')}?limit=50&offset=101`]: { items: [{ item: SP_TRACK }], total: 250 },
    });

    const results = await fetchSpotifyPlaylistTracks({
      accessToken: 'user-tok',
      playlistId: 'pl-1',
      fetchImpl,
      apiBase: API_BASE,
      maxTracks: 200,
      shouldStop: (tracks) => tracks.length > 100,
    });

    expect(results).toHaveLength(101);
    expect(calls).toHaveLength(1);
  });

  it('keeps paging a duplicate-heavy playlist that is still under the distinct-song stop', async () => {
    const repeat = (offset: number) =>
      Array.from({ length: 50 }, (_, index) => ({
        item: {
          ...SP_TRACK,
          id: `dup-${offset + index}`,
          uri: `spotify:track:dup-${offset + index}`,
          name: 'Same Song',
        },
      }));
    const { fetchImpl, calls } = fakeFetch({
      [`${itemsUrl('pl-1')}?limit=50&offset=0`]: { items: repeat(0), total: 100 },
      [`${itemsUrl('pl-1')}?limit=50&offset=50`]: { items: repeat(50), total: 100 },
    });

    const results = await fetchSpotifyPlaylistTracks({
      accessToken: 'user-tok',
      playlistId: 'pl-1',
      fetchImpl,
      apiBase: API_BASE,
      maxTracks: 200,
      shouldStop: (tracks) => new Set(tracks.map((track) => track.title)).size > 100,
    });

    expect(results).toHaveLength(100);
    expect(calls.map((call) => call.url)).toEqual([
      `${itemsUrl('pl-1')}?limit=50&offset=0`,
      `${itemsUrl('pl-1')}?limit=50&offset=50`,
    ]);
  });

  it('does not request the next page once the preview deadline has passed', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000_000);
      const deadlineAt = 1_001_000;
      let pages = 0;
      const fetchImpl: FetchLike = async () => {
        pages += 1;
        if (pages > 1) throw new Error('page 2 must not be requested');
        vi.setSystemTime(deadlineAt);
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [{ item: SP_TRACK }], total: 2 }),
          text: async () => '',
        };
      };

      await expect(
        fetchSpotifyPlaylistTracks({
          accessToken: 'user-tok',
          playlistId: 'pl-1',
          fetchImpl,
          apiBase: API_BASE,
          read: { deadlineAt },
        }),
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(pages).toBe(1);
    } finally {
      vi.useRealTimers();
    }
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

const QUOTA_BODY = JSON.stringify({
  error: { status: 429, message: 'Too many requests', reason: 'QUOTA_EXCEEDED' },
});

/** Every non-token request answers with `status` and `body`; counts those requests. */
function scriptedApi(status: number, body: string, headers: Record<string, string> = {}) {
  let apiCalls = 0;
  const fetchImpl: FetchLike = async (url) => {
    if (url === TOKEN_URL) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
        text: async () => '',
      };
    }
    apiCalls += 1;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => JSON.parse(body) as unknown,
      text: async () => body,
      headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
    };
  };
  return { fetchImpl, calls: () => apiCalls };
}

describe('Spotify 429 handling', () => {
  const noSleep = { sleep: async () => {} };

  it('search: QUOTA_EXCEEDED makes one request and raises the typed quota error', async () => {
    const api = scriptedApi(429, QUOTA_BODY);
    const provider = createSpotifyProvider({
      clientId: 'cid',
      clientSecret: 'secret',
      fetchImpl: api.fetchImpl,
      apiBase: API_BASE,
      tokenUrl: TOKEN_URL,
      retry: noSleep,
    });
    const err = await provider.search('rick').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderQuotaExceededError);
    expect(err).toBeInstanceOf(ProviderError);
    expect(api.calls()).toBe(1);
  });

  it('search: a plain 429 retries with backoff, then fails as an outage', async () => {
    const api = scriptedApi(429, '{"error":{"status":429,"message":"rate limited"}}');
    const sleep = vi.fn(async () => {});
    const provider = createSpotifyProvider({
      clientId: 'cid',
      clientSecret: 'secret',
      fetchImpl: api.fetchImpl,
      apiBase: API_BASE,
      tokenUrl: TOKEN_URL,
      retry: { sleep },
    });
    const err = await provider.search('rick').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).not.toBeInstanceOf(ProviderQuotaExceededError);
    expect(api.calls()).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('search: Retry-After 120 fails fast and never sleeps', async () => {
    const api = scriptedApi(429, '{}', { 'retry-after': '120' });
    const sleep = vi.fn(async () => {});
    const provider = createSpotifyProvider({
      clientId: 'cid',
      clientSecret: 'secret',
      fetchImpl: api.fetchImpl,
      apiBase: API_BASE,
      tokenUrl: TOKEN_URL,
      retry: { sleep },
    });
    await expect(provider.search('rick')).rejects.toBeInstanceOf(ProviderError);
    expect(api.calls()).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('/me/tracks retries a plain 429 once', async () => {
    const api = scriptedApi(429, '{}');
    await expect(
      fetchSpotifySavedTracks({
        accessToken: 'user-tok',
        fetchImpl: api.fetchImpl,
        apiBase: API_BASE,
        retry: noSleep,
      }),
    ).rejects.toThrow('Spotify API 429 for /me/tracks');
    expect(api.calls()).toBe(2);
  });

  it('/me/playlists retries a plain 429 once', async () => {
    const api = scriptedApi(429, '{}');
    await expect(
      fetchSpotifySavedPlaylists({
        accessToken: 'user-tok',
        fetchImpl: api.fetchImpl,
        apiBase: API_BASE,
        retry: noSleep,
      }),
    ).rejects.toThrow('Spotify API 429 for /me/playlists');
    expect(api.calls()).toBe(2);
  });

  it('/me/tracks and /me/playlists raise the quota error without retrying', async () => {
    const tracks = scriptedApi(429, QUOTA_BODY);
    await expect(
      fetchSpotifySavedTracks({
        accessToken: 'user-tok',
        fetchImpl: tracks.fetchImpl,
        apiBase: API_BASE,
        retry: noSleep,
      }),
    ).rejects.toBeInstanceOf(ProviderQuotaExceededError);
    expect(tracks.calls()).toBe(1);

    const playlists = scriptedApi(429, QUOTA_BODY);
    await expect(
      fetchSpotifySavedPlaylists({
        accessToken: 'user-tok',
        fetchImpl: playlists.fetchImpl,
        apiBase: API_BASE,
        retry: noSleep,
      }),
    ).rejects.toBeInstanceOf(ProviderQuotaExceededError);
    expect(playlists.calls()).toBe(1);
  });

  it('playlist items: QUOTA_EXCEEDED raises the quota error', async () => {
    const api = scriptedApi(429, QUOTA_BODY);
    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 'user-tok',
        playlistId: 'pl-1',
        fetchImpl: api.fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toBeInstanceOf(ProviderQuotaExceededError);
    expect(api.calls()).toBe(1);
  });

  it('playlist items: a 404 (a private playlist the user does not own) is access denied', async () => {
    const api = scriptedApi(404, '{"error":{"status":404,"message":"Resource not found"}}');
    await expect(
      fetchSpotifyPlaylistTracks({
        accessToken: 'user-tok',
        playlistId: 'pl-1',
        fetchImpl: api.fetchImpl,
        apiBase: API_BASE,
      }),
    ).rejects.toBeInstanceOf(SpotifyPlaylistAccessDeniedError);
  });
});

describe('fetchSpotifySavedTracksPage (RF-132 paging, mock-tested only: RF-92)', () => {
  const SAVED_URL = `${API_BASE}/me/tracks`;
  const items = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      track: { ...SP_TRACK, id: `t${from + i}`, uri: `spotify:track:t${from + i}` },
    }));

  it('reads whole 50-track pages to the target and returns Spotify’s next offset', async () => {
    const { fetchImpl, calls } = fakeFetch({
      [`${SAVED_URL}?limit=50&offset=0`]: { items: items(0, 50), total: 120 },
      [`${SAVED_URL}?limit=50&offset=50`]: { items: items(50, 50), total: 120 },
      [`${SAVED_URL}?limit=50&offset=100`]: { items: items(100, 20), total: 120 },
    });
    const first = await fetchSpotifySavedTracksPage({
      accessToken: 't',
      fetchImpl,
      apiBase: API_BASE,
      targetTracks: 100,
    });
    expect(first.tracks).toHaveLength(100);
    expect(first.next).toBe('100');
    expect(calls).toHaveLength(2);

    const second = await fetchSpotifySavedTracksPage({
      accessToken: 't',
      fetchImpl,
      apiBase: API_BASE,
      cursor: first.next,
    });
    expect(second.tracks.map((t) => t.providerTrackId)[0]).toBe('t100');
    expect(second.tracks).toHaveLength(20);
    expect(second.next).toBeNull();
  });

  it('returns no next when an empty page arrives before the reported total', async () => {
    const { fetchImpl } = fakeFetch({
      [`${SAVED_URL}?limit=50&offset=0`]: { items: [], total: 10 },
    });
    const out = await fetchSpotifySavedTracksPage({
      accessToken: 't',
      fetchImpl,
      apiBase: API_BASE,
    });
    expect(out).toEqual({ tracks: [], next: null });
  });

  it.each(['-1', '1.5', 'abc', '01', 'https://api.spotify.com/v1/me/tracks?offset=50', ''])(
    'rejects a non-offset cursor (%s) before any request',
    async (cursor) => {
      const fetchImpl = vi.fn<FetchLike>();
      await expect(
        fetchSpotifySavedTracksPage({ accessToken: 't', fetchImpl, apiBase: API_BASE, cursor }),
      ).rejects.toBeInstanceOf(InvalidProviderCursorError);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );
});
