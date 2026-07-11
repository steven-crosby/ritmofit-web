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

describe('SoundCloudProvider.getPlaylist (URL import via /resolve)', () => {
  type Scripted = { status: number; body?: unknown; headers?: Record<string, string> };
  /** Like `fakeFetch`, but scriptable per call: status, headers (for 302), body. */
  function scriptedFetch(route: (url: string, init?: Parameters<FetchLike>[1]) => Scripted) {
    const calls: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      const r = route(url, init);
      return {
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        json: async () => r.body ?? null,
        text: async () => JSON.stringify(r.body ?? null),
        headers: { get: (name: string) => r.headers?.[name.toLowerCase()] ?? null },
      };
    };
    return { fetchImpl, calls };
  }

  const URN = 'soundcloud:playlists:987';
  const ENCODED_URN = encodeURIComponent(URN);
  const TRACKS_URL = `${API_BASE}/playlists/${ENCODED_URN}/tracks`;
  const PERMALINK = 'https://soundcloud.com/artist/sets/summer-mix';
  const REF = { provider: 'soundcloud', permalinkUrl: PERMALINK } as const;

  function makeUrlProvider(route: (url: string, init?: Parameters<FetchLike>[1]) => Scripted) {
    const { fetchImpl, calls } = scriptedFetch((url, init) => {
      if (url.startsWith(TOKEN_URL)) {
        return { status: 200, body: { access_token: 'tok-1', expires_in: 3600 } };
      }
      return route(url, init);
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

  it('resolves the permalink to a URN and pages the track collection', async () => {
    const { provider, calls } = makeUrlProvider((url) => {
      if (url.startsWith(`${API_BASE}/resolve`)) {
        return {
          status: 302,
          headers: { location: `${API_BASE}/playlists/${ENCODED_URN}` },
        };
      }
      if (url.startsWith(TRACKS_URL)) {
        return url.includes('page2')
          ? { status: 200, body: { collection: [{ ...SC_TRACK, id: 777 }], next_href: null } }
          : {
              status: 200,
              body: { collection: [SC_TRACK], next_href: `${TRACKS_URL}?page2=true` },
            };
      }
      return { status: 500 };
    });

    const results = await provider.getPlaylist(REF);

    expect(results.map((r) => r.providerTrackId)).toEqual(['12345', '777']);
    const resolveCall = calls.find((c) => c.url.startsWith(`${API_BASE}/resolve`))!;
    expect(resolveCall.url).toContain(`url=${encodeURIComponent(PERMALINK)}`);
    expect(resolveCall.init?.redirect).toBe('manual');
    expect(resolveCall.init?.headers?.Authorization).toBe('OAuth tok-1');
    const firstTracksCall = calls.find((c) => c.url.startsWith(TRACKS_URL))!;
    expect(firstTracksCall.url).toContain('limit=200');
    expect(firstTracksCall.url).toContain('linked_partitioning=true');
  });

  it('returns [] when /resolve 404s (no such playlist)', async () => {
    const { provider } = makeUrlProvider((url) =>
      url.startsWith(`${API_BASE}/resolve`) ? { status: 404 } : { status: 500 },
    );
    await expect(provider.getPlaylist(REF)).resolves.toEqual([]);
  });

  it('returns [] when the URL resolves to a non-playlist resource (e.g. a track)', async () => {
    const { provider } = makeUrlProvider((url) =>
      url.startsWith(`${API_BASE}/resolve`)
        ? { status: 302, headers: { location: `${API_BASE}/tracks/12345` } }
        : { status: 500 },
    );
    await expect(provider.getPlaylist(REF)).resolves.toEqual([]);
  });

  it('accepts a resolved playlist body when a fetch stack auto-followed the 302', async () => {
    const { provider } = makeUrlProvider((url) => {
      if (url.startsWith(`${API_BASE}/resolve`)) {
        return { status: 200, body: { kind: 'playlist', urn: URN, id: 987 } };
      }
      if (url.startsWith(TRACKS_URL)) {
        return { status: 200, body: { collection: [SC_TRACK], next_href: null } };
      }
      return { status: 500 };
    });
    await expect(provider.getPlaylist(REF)).resolves.toHaveLength(1);
  });

  it('returns [] when an auto-followed resolve body is not a playlist', async () => {
    const { provider } = makeUrlProvider((url) =>
      url.startsWith(`${API_BASE}/resolve`)
        ? { status: 200, body: { kind: 'track', urn: 'soundcloud:tracks:1' } }
        : { status: 500 },
    );
    await expect(provider.getPlaylist(REF)).resolves.toEqual([]);
  });

  it('re-mints the app token once when SoundCloud rejects it with 401', async () => {
    let tokenCalls = 0;
    const { fetchImpl, calls } = (() => {
      const record: { url: string; init?: Parameters<FetchLike>[1] }[] = [];
      const impl: FetchLike = async (url, init) => {
        record.push({ url, init });
        if (url.startsWith(TOKEN_URL)) {
          tokenCalls += 1;
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: `tok-${tokenCalls}`, expires_in: 3600 }),
            text: async () => '',
          };
        }
        if (url.startsWith(`${API_BASE}/resolve`)) {
          const auth = init?.headers?.Authorization;
          if (auth === 'OAuth tok-1') {
            return { ok: false, status: 401, json: async () => null, text: async () => '' };
          }
          return {
            ok: false,
            status: 302,
            json: async () => null,
            text: async () => '',
            headers: {
              get: (n: string) =>
                n.toLowerCase() === 'location' ? `${API_BASE}/playlists/${ENCODED_URN}` : null,
            },
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ collection: [SC_TRACK], next_href: null }),
          text: async () => '',
        };
      };
      return { fetchImpl: impl, calls: record };
    })();
    const provider = createSoundCloudProvider({
      clientId: 'cid',
      clientSecret: 'secret',
      fetchImpl,
      apiBase: API_BASE,
      tokenUrl: TOKEN_URL,
    });

    await expect(provider.getPlaylist(REF)).resolves.toHaveLength(1);
    expect(tokenCalls).toBe(2);
    expect(
      calls
        .filter((c) => c.url.startsWith(`${API_BASE}/resolve`))
        .map((c) => c.init?.headers?.Authorization),
    ).toEqual(['OAuth tok-1', 'OAuth tok-2']);
  });

  it('normalizes a string URN track id (2025 id→urn migration tolerance)', async () => {
    const urnTrack = { ...SC_TRACK, id: 'soundcloud:tracks:999' };
    const { provider } = makeUrlProvider((url) => {
      if (url.startsWith(`${API_BASE}/resolve`)) {
        return { status: 302, headers: { location: `${API_BASE}/playlists/${ENCODED_URN}` } };
      }
      if (url.startsWith(TRACKS_URL)) {
        return { status: 200, body: { collection: [urnTrack], next_href: null } };
      }
      return { status: 500 };
    });
    const [track] = await provider.getPlaylist(REF);
    expect(track?.providerTrackId).toBe('soundcloud:tracks:999');
  });
});
