import { describe, it, expect } from 'vitest';
import { createAppleMusicProvider, type FetchLike } from '@ritmofit/music';

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
