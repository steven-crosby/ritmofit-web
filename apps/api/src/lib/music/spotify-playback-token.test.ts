import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mintSpotifyPlaybackToken } from './spotify-playback-token.js';
import { HttpError } from '../errors.js';
import * as musicPkg from '@ritmofit/music';
import * as cryptoLib from '../crypto.js';
import type { Db } from '../db.js';
import type { Env } from '../types.js';

// Setup mock DB
const mockGet = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ run: vi.fn() }));
mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        get: mockGet,
      })),
    })),
  })),
  update: vi.fn(() => ({
    set: mockUpdateSet,
  })),
} as unknown as Db;

vi.mock('@ritmofit/music', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@ritmofit/music')>();
  return {
    ...mod,
    refreshSpotifyToken: vi.fn(),
  };
});

vi.mock('../crypto.js', () => ({
  encryptSecret: vi.fn(async (secret) => `enc:${secret}`),
  decryptSecret: vi.fn(async (enc) => enc.replace('enc:', '')),
}));

describe('mintSpotifyPlaybackToken', () => {
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      MOCK_PROVIDERS: 'false',
      SPOTIFY_CLIENT_ID: 'id',
      SPOTIFY_CLIENT_SECRET: 'secret',
      ENCRYPTION_KEY: 'test-key'.padStart(32, '0'),
    } as unknown as Env;
  });

  it('returns mock token when MOCK_PROVIDERS=true', async () => {
    mockEnv.MOCK_PROVIDERS = 'true';
    const res = await mintSpotifyPlaybackToken(mockDb, mockEnv, 'user1');
    expect(res.accessToken).toBe('mock-spotify-playback-token');
  });

  it('throws 409 NOT_CONNECTED when no connection', async () => {
    mockGet.mockResolvedValueOnce(undefined);
    await expect(mintSpotifyPlaybackToken(mockDb, mockEnv, 'user1')).rejects.toThrowError(
      new HttpError(409, 'NOT_CONNECTED', 'Connect your Spotify account first.'),
    );
  });

  it('throws 409 PLAYBACK_REAUTH_REQUIRED if scope lacks streaming', async () => {
    mockGet.mockResolvedValueOnce({
      id: 'conn1',
      userId: 'user1',
      provider: 'spotify',
      scope: 'user-library-read',
    });
    await expect(mintSpotifyPlaybackToken(mockDb, mockEnv, 'user1')).rejects.toThrowError(
      new HttpError(
        409,
        'PLAYBACK_REAUTH_REQUIRED',
        'Reconnect Spotify to enable in-app playback.',
      ),
    );
  });

  it('returns current token if unexpired', async () => {
    mockGet.mockResolvedValueOnce({
      id: 'conn1',
      userId: 'user1',
      provider: 'spotify',
      scope: 'user-library-read streaming',
      accessTokenEncrypted: 'enc:token1',
      expiresAt: Date.now() + 3600 * 1000,
    });
    const res = await mintSpotifyPlaybackToken(mockDb, mockEnv, 'user1');
    expect(res.accessToken).toBe('token1');
    expect(cryptoLib.decryptSecret).toHaveBeenCalledWith('enc:token1', mockEnv.ENCRYPTION_KEY);
  });

  it('throws 409 REAUTH_REQUIRED if expired and no refresh token', async () => {
    mockGet.mockResolvedValueOnce({
      id: 'conn1',
      userId: 'user1',
      provider: 'spotify',
      scope: 'user-library-read streaming',
      accessTokenEncrypted: 'enc:token1',
      refreshTokenEncrypted: null,
      expiresAt: Date.now() - 1000,
    });
    await expect(mintSpotifyPlaybackToken(mockDb, mockEnv, 'user1')).rejects.toThrowError(
      new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your Spotify account.'),
    );
  });

  it('refreshes token if expired and updates DB', async () => {
    mockGet.mockResolvedValueOnce({
      id: 'conn1',
      userId: 'user1',
      provider: 'spotify',
      scope: 'user-library-read streaming',
      accessTokenEncrypted: 'enc:token1',
      refreshTokenEncrypted: 'enc:refresh1',
      expiresAt: Date.now() - 1000,
    });

    vi.mocked(musicPkg.refreshSpotifyToken).mockResolvedValueOnce({
      accessToken: 'token2',
      refreshToken: 'refresh2', // Provider rotated it
      expiresInSec: 3600,
      scope: 'user-library-read streaming',
    });

    const res = await mintSpotifyPlaybackToken(mockDb, mockEnv, 'user1');
    expect(res.accessToken).toBe('token2');

    expect(musicPkg.refreshSpotifyToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'refresh1',
      }),
    );

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        accessTokenEncrypted: 'enc:token2',
        refreshTokenEncrypted: 'enc:refresh2',
      }),
    );
  });

  it('throws 409 REAUTH_REQUIRED if refresh fails', async () => {
    mockGet.mockResolvedValueOnce({
      id: 'conn1',
      userId: 'user1',
      provider: 'spotify',
      scope: 'user-library-read streaming',
      accessTokenEncrypted: 'enc:token1',
      refreshTokenEncrypted: 'enc:refresh1',
      expiresAt: Date.now() - 1000,
    });

    vi.mocked(musicPkg.refreshSpotifyToken).mockRejectedValueOnce(new Error('fail'));

    await expect(mintSpotifyPlaybackToken(mockDb, mockEnv, 'user1')).rejects.toThrowError(
      new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your Spotify account.'),
    );
  });
});
