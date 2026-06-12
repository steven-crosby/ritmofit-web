import { describe, it, expect } from 'vitest';
import {
  createSoundCloudProvider,
  fetchSoundCloudLikes,
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
    const { provider, calls } = makeProvider({ [`${API_BASE}/tracks?`]: { collection: [SC_TRACK] } });
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
      return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => '' };
    };
    return { fetchImpl, calls };
  }

  it('maps the liked tracks with the user token as OAuth auth', async () => {
    const { fetchImpl, calls } = statusFetch(200, { collection: [SC_TRACK] });
    const out = await fetchSoundCloudLikes({ accessToken: 'user-tok', fetchImpl, apiBase: API_BASE });

    expect(out.map((t) => t.providerTrackId)).toEqual(['12345']);
    expect(calls[0]?.url.startsWith(`${API_BASE}/me/likes/tracks`)).toBe(true);
    expect(calls[0]?.init?.headers?.Authorization).toBe('OAuth user-tok');
  });

  it('accepts a bare-array likes response', async () => {
    const { fetchImpl } = statusFetch(200, [SC_TRACK]);
    expect((await fetchSoundCloudLikes({ accessToken: 't', fetchImpl, apiBase: API_BASE })).length).toBe(1);
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
