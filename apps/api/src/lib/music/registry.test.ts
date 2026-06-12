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

  it('501s for a provider that is not yet integrated', () => {
    try {
      getMusicProvider('spotify', env({}));
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as HttpError).status).toBe(501);
    }
  });
});
