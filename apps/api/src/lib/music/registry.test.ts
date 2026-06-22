import { describe, it, expect } from 'vitest';
import { getMusicProvider } from './registry.js';
import { HttpError } from '../errors.js';
import type { Env } from '../types.js';

const env = (overrides: Partial<Env>): Env => overrides as unknown as Env;

describe('getMusicProvider', () => {
  it('serves the mock catalog for any provider when MOCK_PROVIDERS=true', async () => {
    const p = getMusicProvider('soundcloud', env({ MOCK_PROVIDERS: 'true' }));
    expect(p.provider).toBe('soundcloud');
    const hits = await p.search(''); // empty query returns the whole (filtered) catalog
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((t) => t.provider === 'soundcloud')).toBe(true);
  });

  it('returns the live SoundCloud adapter when credentials are present', () => {
    const p = getMusicProvider(
      'soundcloud',
      env({ SOUNDCLOUD_CLIENT_ID: 'cid', SOUNDCLOUD_CLIENT_SECRET: 'sec' }),
    );
    expect(p.provider).toBe('soundcloud');
  });

  it('503s when SoundCloud is selected without credentials', () => {
    try {
      getMusicProvider('soundcloud', env({}));
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(503);
    }
  });

  it('returns the live Spotify adapter when credentials are present', () => {
    const p = getMusicProvider(
      'spotify',
      env({ SPOTIFY_CLIENT_ID: 'cid', SPOTIFY_CLIENT_SECRET: 'sec' }),
    );
    expect(p.provider).toBe('spotify');
  });

  it('returns the live Apple Music adapter when a developer token is present', () => {
    const p = getMusicProvider('apple_music', env({ APPLE_MUSIC_DEVELOPER_TOKEN: 'devtok' }));
    expect(p.provider).toBe('apple_music');
  });

  it('memoizes the live adapter for the same provider + credentials', () => {
    const creds = env({ SPOTIFY_CLIENT_ID: 'memo-cid', SPOTIFY_CLIENT_SECRET: 'sec' });
    const first = getMusicProvider('spotify', creds);
    const second = getMusicProvider('spotify', creds);
    expect(second).toBe(first); // same instance → its AppTokenCache survives across calls

    // A different client id is a different credential → a fresh adapter.
    const other = getMusicProvider(
      'spotify',
      env({ SPOTIFY_CLIENT_ID: 'other-cid', SPOTIFY_CLIENT_SECRET: 'sec' }),
    );
    expect(other).not.toBe(first);
  });

  it('never memoizes the mock adapter', () => {
    const a = getMusicProvider('spotify', env({ MOCK_PROVIDERS: 'true' }));
    const b = getMusicProvider('spotify', env({ MOCK_PROVIDERS: 'true' }));
    expect(b).not.toBe(a);
  });

  it('503s when a provider is selected without credentials', () => {
    for (const provider of ['spotify', 'apple_music'] as const) {
      try {
        getMusicProvider(provider, env({}));
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).status).toBe(503);
      }
    }
  });
});
