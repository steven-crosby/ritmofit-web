/**
 * Lane c-music repro (audit at 4c344e2): C-16 / CM-03 concurrent refresh with a
 * single-use (rotating) refresh token. Copy to apps/api/src/lib/music/ and run:
 *   pnpm --filter @ritmofit/api exec vitest run src/lib/music/c-music-refresh-race-repro.test.ts
 * Stubbed provider adapters and a shared in-memory connection row; no network.
 */
import { describe, expect, it, vi } from 'vitest';
import { fetchUserLikes } from './user-likes.js';
import { fetchUserPlaylists } from './user-playlists.js';
import type { Db } from '../db.js';
import type { Env } from '../types.js';

const music = vi.hoisted(() => ({
  refreshSoundCloudToken: vi.fn(),
  fetchSoundCloudLikes: vi.fn(),
  fetchSoundCloudPlaylists: vi.fn(),
}));

vi.mock('@ritmofit/music', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ritmofit/music')>();
  return { ...actual, ...music };
});

vi.mock('../crypto.js', () => ({
  decryptSecret: vi.fn(async (value: string) => value.replace(/^enc:/, '')),
  encryptSecret: vi.fn(async (value: string) => `enc:${value}`),
}));

const env = {
  ENCRYPTION_KEY: 'k',
  SOUNDCLOUD_CLIENT_ID: 'sc-id',
  SOUNDCLOUD_CLIENT_SECRET: 'sc-secret',
} as Env;

describe('CM-03 (extends C-16): parallel likes + playlists inside the 60 s skew window', () => {
  it('spends one rotating refresh token twice; the loser reports REAUTH_REQUIRED', async () => {
    // Web still shows "connected" (expiresAt > now); server refreshes (now > expiresAt - 60s).
    const row = {
      id: 'conn-1',
      userId: 'u1',
      provider: 'soundcloud',
      accessTokenEncrypted: 'enc:access-old',
      refreshTokenEncrypted: 'enc:refresh-1',
      scope: null,
      expiresAt: Date.now() + 30_000,
      createdAt: 0,
      updatedAt: 0,
    };
    const db = {
      select: () => ({ from: () => ({ where: () => ({ get: async () => ({ ...row }) }) }) }),
      update: () => ({
        set: (values: Partial<typeof row>) => ({
          where: async () => {
            Object.assign(row, values);
          },
        }),
      }),
    } as unknown as Db;

    // Single-use refresh token: the first exchange rotates it; a replay is rejected.
    const spent = new Set<string>();
    let n = 0;
    music.refreshSoundCloudToken.mockImplementation(async ({ refreshToken }) => {
      await new Promise((r) => setTimeout(r, 5));
      if (spent.has(refreshToken)) throw new Error('invalid_grant');
      spent.add(refreshToken);
      n += 1;
      return {
        accessToken: `access-${n}`,
        refreshToken: `refresh-${n + 1}`,
        expiresInSec: 3600,
        scope: null,
      };
    });
    music.fetchSoundCloudLikes.mockResolvedValue([]);
    music.fetchSoundCloudPlaylists.mockResolvedValue([]);

    // Dashboard's two effects fire both shelves for the same provider at once.
    const [likes, playlists] = await Promise.allSettled([
      fetchUserLikes(db, env, 'u1', 'soundcloud'),
      fetchUserPlaylists(db, env, 'u1', 'soundcloud'),
    ]);

    expect(music.refreshSoundCloudToken).toHaveBeenCalledTimes(2);
    expect(music.refreshSoundCloudToken.mock.calls.map((c) => c[0].refreshToken)).toEqual([
      'refresh-1',
      'refresh-1',
    ]);
    const statuses = [likes, playlists].map((r) =>
      r.status === 'fulfilled' ? 'ok' : (r.reason as { code?: string }).code,
    );
    expect(statuses.sort()).toEqual(['REAUTH_REQUIRED', 'ok']);
    // The grant itself is healthy: the winner persisted the rotated pair.
    expect(row.refreshTokenEncrypted).toBe('enc:refresh-2');
  });
});
