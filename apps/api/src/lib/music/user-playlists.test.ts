import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSpotifyPlaylistTracks,
  fetchSpotifySavedPlaylists,
  refreshSpotifyToken,
  SpotifyUnauthorizedError,
} from '@ritmofit/music';
import { fetchUserPlaylistTracks, fetchUserPlaylists } from './user-playlists.js';
import { HttpError } from '../errors.js';
import type { Db } from '../db.js';
import type { Env } from '../types.js';

const musicMocks = vi.hoisted(() => ({
  fetchSpotifySavedPlaylists: vi.fn(),
  fetchSpotifyPlaylistTracks: vi.fn(),
  refreshSpotifyToken: vi.fn(),
}));

vi.mock('@ritmofit/music', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ritmofit/music')>();
  return {
    ...actual,
    fetchSpotifySavedPlaylists: musicMocks.fetchSpotifySavedPlaylists,
    fetchSpotifyPlaylistTracks: musicMocks.fetchSpotifyPlaylistTracks,
    refreshSpotifyToken: musicMocks.refreshSpotifyToken,
  };
});

vi.mock('../crypto.js', () => ({
  decryptSecret: vi.fn(async (value: string) => value.replace(/^enc:/, '')),
  encryptSecret: vi.fn(async (value: string) => `enc:${value}`),
}));

const env = {
  ENCRYPTION_KEY: 'test-key',
  SPOTIFY_CLIENT_ID: 'spotify-client',
  SPOTIFY_CLIENT_SECRET: 'spotify-secret',
} as Env;

function makeConnection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'conn-1',
    userId: 'user-1',
    provider: 'spotify',
    accessTokenEncrypted: 'enc:access-old',
    refreshTokenEncrypted: 'enc:refresh-old',
    scope: 'playlist-read-private',
    expiresAt: Date.now() + 60 * 60 * 1000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeDb(conn: unknown) {
  const updates: unknown[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => conn,
        }),
      }),
    }),
    update: () => ({
      set: (values: unknown) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
  } as unknown as Db;
  return { db, updates };
}

describe('user playlist token helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(refreshSpotifyToken).mockResolvedValue({
      accessToken: 'access-fresh',
      refreshToken: 'refresh-fresh',
      expiresInSec: 3600,
      scope: 'playlist-read-private',
    });
    vi.mocked(fetchSpotifySavedPlaylists).mockResolvedValue([]);
    vi.mocked(fetchSpotifyPlaylistTracks).mockResolvedValue([]);
  });

  it('proactively refreshes an expired token before fetching saved playlists', async () => {
    const { db, updates } = makeDb(makeConnection({ expiresAt: Date.now() - 1 }));

    await fetchUserPlaylists(db, env, 'user-1', 'spotify');

    expect(refreshSpotifyToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'spotify-client',
        clientSecret: 'spotify-secret',
        refreshToken: 'refresh-old',
      }),
    );
    expect(fetchSpotifySavedPlaylists).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'access-fresh' }),
    );
    expect(updates[0]).toMatchObject({
      accessTokenEncrypted: 'enc:access-fresh',
      refreshTokenEncrypted: 'enc:refresh-fresh',
      scope: 'playlist-read-private',
    });
  });

  it('reactively refreshes once when playlist tracks reject the stored token', async () => {
    const { db } = makeDb(makeConnection());
    vi.mocked(fetchSpotifyPlaylistTracks)
      .mockRejectedValueOnce(new SpotifyUnauthorizedError())
      .mockResolvedValueOnce([
        {
          provider: 'spotify',
          providerTrackId: 'track-1',
          providerUri: 'spotify:track:track-1',
          title: 'Track One',
          artist: 'Artist',
          albumArtUrl: null,
          durationMs: 180000,
        },
      ]);

    const out = await fetchUserPlaylistTracks(db, env, 'user-1', 'spotify', 'playlist-1');

    expect(out).toHaveLength(1);
    expect(fetchSpotifyPlaylistTracks).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ accessToken: 'access-old', playlistId: 'playlist-1' }),
    );
    expect(fetchSpotifyPlaylistTracks).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accessToken: 'access-fresh', playlistId: 'playlist-1' }),
    );
    expect(refreshSpotifyToken).toHaveBeenCalledTimes(1);
  });

  it('keeps REAUTH_REQUIRED behavior when a reactive retry cannot refresh', async () => {
    const { db } = makeDb(makeConnection({ refreshTokenEncrypted: null }));
    vi.mocked(fetchSpotifySavedPlaylists).mockRejectedValueOnce(new SpotifyUnauthorizedError());

    await expect(fetchUserPlaylists(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Spotify account.',
    } satisfies Partial<HttpError>);
    expect(refreshSpotifyToken).not.toHaveBeenCalled();
    expect(fetchSpotifySavedPlaylists).toHaveBeenCalledTimes(1);
  });
});
