/**
 * Reviewer C audit repros (synthetic fetch only; never reaches a provider).
 * Asserts CURRENT behaviour at 4e0b150: green = reproduced.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mintSpotifyPlaybackToken } from './spotify-playback-token.js';
import { fetchUserLikes } from './user-likes.js';
import { HttpError } from '../errors.js';
import type { Db } from '../db.js';
import type { Env } from '../types.js';

vi.mock('../crypto.js', () => ({
  encryptSecret: vi.fn(async (s: string) => `enc:${s}`),
  decryptSecret: vi.fn(async (s: string) => s.replace('enc:', '')),
}));

const updates: unknown[] = [];
function dbWith(row: Record<string, unknown>): Db {
  return {
    select: () => ({ from: () => ({ where: () => ({ get: async () => row }) }) }),
    update: () => ({
      set: (v: unknown) => {
        updates.push(v);
        return { where: async () => ({}) };
      },
    }),
  } as unknown as Db;
}

const env = {
  MOCK_PROVIDERS: 'false',
  SPOTIFY_CLIENT_ID: 'id',
  SPOTIFY_CLIENT_SECRET: 'secret',
  SOUNDCLOUD_CLIENT_ID: 'id',
  SOUNDCLOUD_CLIENT_SECRET: 'secret',
  ENCRYPTION_KEY: 'k'.repeat(32),
} as unknown as Env;

const expiredConn = (provider: string) => ({
  id: 'c1',
  userId: 'u1',
  provider,
  accessTokenEncrypted: 'enc:old-access',
  refreshTokenEncrypted: 'enc:live-refresh',
  scope: 'user-library-read streaming',
  expiresAt: Date.now() - 5_000,
});

const calls: string[] = [];
beforeEach(() => {
  updates.length = 0;
  calls.length = 0;
});
afterEach(() => vi.unstubAllGlobals());

function stubTokenEndpoint(status: number, body = '{"error":"server_error"}') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      calls.push(String(input));
      return new Response(body, { status, headers: { 'content-type': 'application/json' } });
    }),
  );
}

describe('C-2 transient token-endpoint failure is reported as a dead grant', () => {
  for (const status of [500, 502, 503, 429]) {
    it(`Spotify playback token: ${status} from accounts.spotify.com -> 409 REAUTH_REQUIRED`, async () => {
      stubTokenEndpoint(status);
      const err = await mintSpotifyPlaybackToken(dbWith(expiredConn('spotify')), env, 'u1').catch(
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(409);
      expect((err as HttpError).code).toBe('REAUTH_REQUIRED');
      expect(calls).toEqual(['https://accounts.spotify.com/api/token']); // one try, no retry
    });
  }

  it('network failure (fetch throws) -> 409 REAUTH_REQUIRED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network connection lost');
      }),
    );
    const err = await mintSpotifyPlaybackToken(dbWith(expiredConn('spotify')), env, 'u1').catch(
      (e: unknown) => e,
    );
    expect((err as HttpError).code).toBe('REAUTH_REQUIRED');
  });

  it('SoundCloud likes: 503 from the token endpoint -> 409 REAUTH_REQUIRED', async () => {
    stubTokenEndpoint(503);
    const err = await fetchUserLikes(dbWith(expiredConn('soundcloud')), env, 'u1', 'soundcloud')
      .then(() => null)
      .catch((e: unknown) => e);
    expect((err as HttpError).status).toBe(409);
    expect((err as HttpError).code).toBe('REAUTH_REQUIRED');
    expect(updates).toHaveLength(0); // nothing persisted: the grant was never actually dead
  });

  it('control: a real invalid_grant (400) is the only case that should map to reauth', async () => {
    stubTokenEndpoint(400, '{"error":"invalid_grant"}');
    const err = await mintSpotifyPlaybackToken(dbWith(expiredConn('spotify')), env, 'u1').catch(
      (e: unknown) => e,
    );
    expect((err as HttpError).code).toBe('REAUTH_REQUIRED');
  });
});
