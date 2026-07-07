import { describe, it, expect } from 'vitest';
import {
  createSoundCloudProvider,
  fetchSoundCloudLikes,
  fetchSoundCloudPlaylistTracks,
  fetchSoundCloudPlaylists,
  SoundCloudUnauthorizedError,
  type FetchLike,
} from '@ritmofit/music';

/** A scripted fetch: route by URL, record calls, return canned JSON. */
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

const TOKEN_URL = 'https://token.test/oauth/token';
const API_BASE = 'https://api.test';

const SC_TRACK = {
  id: 12345,
  urn: 'soundcloud:tracks:12345',
  title: 'Baianá',
  permalink_url: 'https://soundcloud.com/bakermat/baiana',
  duration: 180000,
  artwork_url: 'https://i1.sndcdn.com/artwork.jpg',
  user: { username: 'Bakermat' },
  // extra fields the API returns and we ignore:
  playback_count: 99,
};

function makeProvider(handlers: Record<string, unknown>) {
  const { fetchImpl, calls } = fakeFetch({
    [TOKEN_URL]: { access_token: 'tok-1', expires_in: 3600 },
    ...handlers,
  });
  const provider = createSoundCloudProvider({
    clientId: 'cid',
    clientSecret: 'secret',
    fetchImpl,
    apiBase: API_BASE,
    tokenUrl: TOKEN_URL,
  });
  return { provider, calls };
}

describe('SoundCloudProvider.search', () => {
  it('maps a track to the contract DTO', async () => {
    const { provider } = makeProvider({ [`${API_BASE}/tracks?`]: { collection: [SC_TRACK] } });
    const [r] = await provider.search('baiana');
    expect(r).toEqual({
      provider: 'soundcloud',
      providerTrackId: '12345',
      providerUri: 'https://soundcloud.com/bakermat/baiana',
      title: 'Baianá',
      artist: 'Bakermat',
      albumArtUrl: 'https://i1.sndcdn.com/artwork.jpg',
      durationMs: 180000,
    });
  });

  it('accepts a bare array response too', async () => {
    const { provider } = makeProvider({ [`${API_BASE}/tracks?`]: [SC_TRACK] });
    expect((await provider.search('x')).length).toBe(1);
  });

  it('drops candidates that cannot satisfy the contract (no title/artist)', async () => {
    const bad = { id: 7, duration: 1000 };
    const { provider } = makeProvider({ [`${API_BASE}/tracks?`]: { collection: [bad, SC_TRACK] } });
    const out = await provider.search('x');
    expect(out.map((t) => t.providerTrackId)).toEqual(['12345']);
  });

  it('returns [] for a blank query without hitting the network', async () => {
    const { provider, calls } = makeProvider({});
    expect(await provider.search('   ')).toEqual([]);
    expect(calls.length).toBe(0);
  });

  it('nulls a zero/missing duration', async () => {
    const { provider } = makeProvider({
      [`${API_BASE}/tracks?`]: { collection: [{ ...SC_TRACK, duration: 0 }] },
    });
    expect((await provider.search('x'))[0]?.durationMs).toBeNull();
  });
});

describe('SoundCloudProvider token handling', () => {
  it('requests a client-credentials token with Basic auth, then caches it', async () => {
    const { provider, calls } = makeProvider({
      [`${API_BASE}/tracks?`]: { collection: [SC_TRACK] },
    });
    await provider.search('a');
    await provider.search('b');

    const tokenCalls = calls.filter((c) => c.url === TOKEN_URL);
    expect(tokenCalls.length).toBe(1); // cached across both searches
    expect(tokenCalls[0]?.init?.method).toBe('POST');
    expect(tokenCalls[0]?.init?.headers?.Authorization).toBe(`Basic ${btoa('cid:secret')}`);
    expect(tokenCalls[0]?.init?.body).toContain('grant_type=client_credentials');

    const apiCall = calls.find((c) => c.url.startsWith(`${API_BASE}/tracks`));
    expect(apiCall?.init?.headers?.Authorization).toBe('OAuth tok-1');
  });
});

describe('fetchSoundCloudLikes', () => {
  /** A fetch that returns a fixed status/body and records the request. */
  function statusFetch(status: number, body: unknown) {
    const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => '',
      };
    };
    return { fetchImpl, calls };
  }

  it('maps the liked tracks with the user token as OAuth auth', async () => {
    const { fetchImpl, calls } = statusFetch(200, { collection: [SC_TRACK] });
    const out = await fetchSoundCloudLikes({
      accessToken: 'user-tok',
      fetchImpl,
      apiBase: API_BASE,
    });

    expect(out.map((t) => t.providerTrackId)).toEqual(['12345']);
    expect(calls[0]?.url.startsWith(`${API_BASE}/me/likes/tracks`)).toBe(true);
    expect(calls[0]?.init?.headers?.Authorization).toBe('OAuth user-tok');
  });

  it('accepts a bare-array likes response', async () => {
    const { fetchImpl } = statusFetch(200, [SC_TRACK]);
    expect(
      (await fetchSoundCloudLikes({ accessToken: 't', fetchImpl, apiBase: API_BASE })).length,
    ).toBe(1);
  });

  it('throws SoundCloudUnauthorizedError on 401 (the refresh signal)', async () => {
    const { fetchImpl } = statusFetch(401, {});
    await expect(
      fetchSoundCloudLikes({ accessToken: 'stale', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SoundCloudUnauthorizedError);
  });

  it('throws a generic error on other non-ok responses', async () => {
    const { fetchImpl } = statusFetch(500, {});
    await expect(
      fetchSoundCloudLikes({ accessToken: 't', fetchImpl, apiBase: API_BASE }),
    ).rejects.toThrow(/500/);
  });
});

describe('fetchSoundCloudPlaylists', () => {
  function pagedFetch(handlers: Record<string, unknown>) {
    const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      if (!(url in handlers)) {
        return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
      }
      return {
        ok: true,
        status: 200,
        json: async () => handlers[url],
        text: async () => JSON.stringify(handlers[url]),
      };
    };
    return { fetchImpl, calls };
  }

  it('follows linked_partitioning pages and maps playlist summaries', async () => {
    const firstUrl = `${API_BASE}/me/playlists?limit=1&linked_partitioning=true`;
    const nextUrl = `${API_BASE}/me/playlists?limit=1&linked_partitioning=true&page=2`;
    const { fetchImpl, calls } = pagedFetch({
      [firstUrl]: {
        collection: [
          {
            id: 1,
            title: 'Climb Shelf',
            artwork_url: 'https://i1.sndcdn.com/pl-1.jpg',
            track_count: 12,
            user: { username: 'Coach One' },
          },
        ],
        next_href: nextUrl,
      },
      [nextUrl]: {
        collection: [
          {
            id: 2,
            title: 'Sprint Shelf',
            artwork_url: null,
            track_count: 8,
            user: { username: 'Coach Two' },
          },
        ],
      },
    });

    const out = await fetchSoundCloudPlaylists({
      accessToken: 'user-tok',
      fetchImpl,
      apiBase: API_BASE,
      limit: 1,
      maxPlaylists: 10,
    });

    expect(out.map((playlist) => playlist.playlistId)).toEqual(['1', '2']);
    expect(out[0]).toMatchObject({
      provider: 'soundcloud',
      name: 'Climb Shelf',
      ownerName: 'Coach One',
      trackCount: 12,
      coverImageUrl: 'https://i1.sndcdn.com/pl-1.jpg',
    });
    expect(calls.map((call) => call.url)).toEqual([firstUrl, nextUrl]);
    expect(calls[0]?.init?.headers?.Authorization).toBe('OAuth user-tok');
  });

  it('stops playlist pagination at the bounded cap', async () => {
    const firstUrl = `${API_BASE}/me/playlists?limit=1&linked_partitioning=true`;
    const nextUrl = `${API_BASE}/me/playlists?limit=1&linked_partitioning=true&page=2`;
    const { fetchImpl, calls } = pagedFetch({
      [firstUrl]: {
        collection: [{ id: 1, title: 'Keep', track_count: 1, user: { username: 'Coach' } }],
        next_href: nextUrl,
      },
      [nextUrl]: {
        collection: [{ id: 2, title: 'Skip', track_count: 1, user: { username: 'Coach' } }],
      },
    });

    const out = await fetchSoundCloudPlaylists({
      accessToken: 'user-tok',
      fetchImpl,
      apiBase: API_BASE,
      limit: 1,
      maxPlaylists: 1,
    });

    expect(out.map((playlist) => playlist.playlistId)).toEqual(['1']);
    expect(calls.map((call) => call.url)).toEqual([firstUrl]);
  });

  it('throws SoundCloudUnauthorizedError on playlist 401 so callers can refresh + retry', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'expired',
    });

    await expect(
      fetchSoundCloudPlaylists({ accessToken: 'stale', fetchImpl, apiBase: API_BASE }),
    ).rejects.toBeInstanceOf(SoundCloudUnauthorizedError);
  });
});

describe('fetchSoundCloudPlaylistTracks', () => {
  function track(id: number) {
    return { ...SC_TRACK, id, title: `Track ${id}` };
  }

  function pagedFetch(handlers: Record<string, { status?: number; body: unknown }>) {
    const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      const handler = handlers[url];
      if (!handler) return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
      const status = handler.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => handler.body,
        text: async () => JSON.stringify(handler.body),
      };
    };
    return { fetchImpl, calls };
  }

  it('follows playlist track pages instead of trusting embedded playlist tracks', async () => {
    const firstUrl = `${API_BASE}/playlists/pl-1/tracks?limit=1&linked_partitioning=true`;
    const nextUrl = `${API_BASE}/playlists/pl-1/tracks?limit=1&linked_partitioning=true&page=2`;
    const { fetchImpl, calls } = pagedFetch({
      [firstUrl]: { body: { collection: [track(1)], next_href: nextUrl } },
      [nextUrl]: { body: { collection: [track(2)] } },
    });

    const out = await fetchSoundCloudPlaylistTracks({
      accessToken: 'user-tok',
      playlistId: 'pl-1',
      fetchImpl,
      apiBase: API_BASE,
      limit: 1,
      maxTracks: 10,
    });

    expect(out.map((candidate) => candidate.providerTrackId)).toEqual(['1', '2']);
    expect(calls.map((call) => call.url)).toEqual([firstUrl, nextUrl]);
    expect(calls[0]?.init?.headers?.Authorization).toBe('OAuth user-tok');
  });

  it('stops playlist track pagination at the bounded cap', async () => {
    const firstUrl = `${API_BASE}/playlists/pl-1/tracks?limit=1&linked_partitioning=true`;
    const nextUrl = `${API_BASE}/playlists/pl-1/tracks?limit=1&linked_partitioning=true&page=2`;
    const { fetchImpl, calls } = pagedFetch({
      [firstUrl]: { body: { collection: [track(1)], next_href: nextUrl } },
      [nextUrl]: { body: { collection: [track(2)] } },
    });

    const out = await fetchSoundCloudPlaylistTracks({
      accessToken: 'user-tok',
      playlistId: 'pl-1',
      fetchImpl,
      apiBase: API_BASE,
      limit: 1,
      maxTracks: 1,
    });

    expect(out.map((candidate) => candidate.providerTrackId)).toEqual(['1']);
    expect(calls.map((call) => call.url)).toEqual([firstUrl]);
  });

  it('returns [] when a SoundCloud playlist does not exist', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => 'missing',
    });

    await expect(
      fetchSoundCloudPlaylistTracks({
        accessToken: 'user-tok',
        playlistId: 'missing',
        fetchImpl,
        apiBase: API_BASE,
      }),
    ).resolves.toEqual([]);
  });
});

describe('SoundCloudProvider.lookup', () => {
  it('resolves a single track by id', async () => {
    const { provider } = makeProvider({ [`${API_BASE}/tracks/12345`]: SC_TRACK });
    expect((await provider.lookup('12345'))?.title).toBe('Baianá');
  });

  it('returns null when the track 404s', async () => {
    const { provider } = makeProvider({}); // no handler → 404
    expect(await provider.lookup('nope')).toBeNull();
  });
});
