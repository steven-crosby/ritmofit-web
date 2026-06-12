import { describe, it, expect } from 'vitest';
import { createSpotifyProvider, type FetchLike } from '@ritmofit/music';

/** A scripted fetch: route by URL prefix, record calls, return canned JSON. */
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

const TOKEN_URL = 'https://token.test/api/token';
const API_BASE = 'https://api.test/v1';

const SP_TRACK = {
  id: '4cOdK2wGLETKBW3PvgPWqT',
  uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
  name: 'Never Gonna Give You Up',
  duration_ms: 213000,
  external_urls: { spotify: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT' },
  artists: [{ name: 'Rick Astley' }, { name: 'PWL' }],
  album: { images: [{ url: 'https://i.scdn.co/image/big.jpg' }, { url: 'https://i.scdn.co/image/small.jpg' }] },
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
    const { provider } = makeProvider({ [`${API_BASE}/search`]: { tracks: { items: [SP_TRACK] } } });
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
