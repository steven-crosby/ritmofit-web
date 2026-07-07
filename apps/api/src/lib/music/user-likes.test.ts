import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppleMusicUnauthorizedError,
  fetchAppleMusicLibrarySongs,
  fetchSoundCloudLikes,
  fetchSpotifySavedTracks,
  refreshSoundCloudToken,
  refreshSpotifyToken,
  SoundCloudUnauthorizedError,
  SpotifyUnauthorizedError,
} from '@ritmofit/music';
import { fetchUserLikes } from './user-likes.js';
import { HttpError } from '../errors.js';
import type { Db } from '../db.js';
import type { Env } from '../types.js';

/**
 * Unit coverage for `fetchUserLikes` — the connected-token "search my Spotify /
 * SoundCloud" read. This mirrors `user-playlists.test.ts`: the shared OAuth
 * refresh/retry/persist machinery (proactive expiry-skew refresh, single reactive
 * retry on a 401, refresh-token rotation persistence, REAUTH mapping) is exercised
 * here with a mock DB, while the pure adapters stay stubbed. The Apple Music branch
 * (developer token + Music-User-Token, no server refresh) has its own path.
 */
const musicMocks = vi.hoisted(() => ({
  fetchSpotifySavedTracks: vi.fn(),
  refreshSpotifyToken: vi.fn(),
  fetchSoundCloudLikes: vi.fn(),
  refreshSoundCloudToken: vi.fn(),
  fetchAppleMusicLibrarySongs: vi.fn(),
}));

vi.mock('@ritmofit/music', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ritmofit/music')>();
  return {
    ...actual,
    fetchSpotifySavedTracks: musicMocks.fetchSpotifySavedTracks,
    refreshSpotifyToken: musicMocks.refreshSpotifyToken,
    fetchSoundCloudLikes: musicMocks.fetchSoundCloudLikes,
    refreshSoundCloudToken: musicMocks.refreshSoundCloudToken,
    fetchAppleMusicLibrarySongs: musicMocks.fetchAppleMusicLibrarySongs,
  };
});

vi.mock('../crypto.js', () => ({
  decryptSecret: vi.fn(async (value: string) => value.replace(/^enc:/, '')),
  encryptSecret: vi.fn(async (value: string) => `enc:${value}`),
}));

vi.mock('../mock-catalog.js', () => ({
  searchMockCatalog: vi.fn(() => [{ mock: true }]),
}));

const env = {
  ENCRYPTION_KEY: 'test-key',
  SPOTIFY_CLIENT_ID: 'spotify-client',
  SPOTIFY_CLIENT_SECRET: 'spotify-secret',
} as Env;

const soundcloudEnv = {
  ...env,
  SOUNDCLOUD_CLIENT_ID: 'soundcloud-client',
  SOUNDCLOUD_CLIENT_SECRET: 'soundcloud-secret',
} as Env;

const appleMusicEnv = { ...env, APPLE_MUSIC_DEVELOPER_TOKEN: 'apple-developer-token' } as Env;

const TRACK = {
  provider: 'spotify' as const,
  providerTrackId: 'track-1',
  providerUri: 'spotify:track:track-1',
  title: 'Track One',
  artist: 'Artist',
  albumArtUrl: null,
  durationMs: 180000,
};

function makeConnection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'conn-1',
    userId: 'user-1',
    provider: 'spotify',
    accessTokenEncrypted: 'enc:access-old',
    refreshTokenEncrypted: 'enc:refresh-old',
    scope: 'user-library-read',
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

describe('fetchUserLikes — mock seam', () => {
  beforeEach(() => vi.clearAllMocks());

  it('serves the mock catalog with MOCK_PROVIDERS=true (no DB, no adapters)', async () => {
    const { db } = makeDb(null);
    const out = await fetchUserLikes(
      db,
      { ...env, MOCK_PROVIDERS: 'true' } as Env,
      'user-1',
      'spotify',
    );
    expect(out).toEqual([{ mock: true }]);
    expect(fetchSpotifySavedTracks).not.toHaveBeenCalled();
  });
});

describe('fetchUserLikes — Spotify (shared connected-token path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(refreshSpotifyToken).mockResolvedValue({
      accessToken: 'access-fresh',
      refreshToken: 'refresh-fresh',
      expiresInSec: 3600,
      scope: 'user-library-read',
    });
    vi.mocked(fetchSpotifySavedTracks).mockResolvedValue([]);
  });

  it('throws NOT_CONNECTED when the user has no Spotify connection', async () => {
    const { db } = makeDb(null);
    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'NOT_CONNECTED',
    } satisfies Partial<HttpError>);
  });

  it('proactively refreshes an expired token before fetching likes', async () => {
    const { db, updates } = makeDb(makeConnection({ expiresAt: Date.now() - 1 }));

    await fetchUserLikes(db, env, 'user-1', 'spotify');

    expect(refreshSpotifyToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'spotify-client',
        clientSecret: 'spotify-secret',
        refreshToken: 'refresh-old',
      }),
    );
    expect(fetchSpotifySavedTracks).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'access-fresh' }),
    );
    expect(updates[0]).toMatchObject({
      accessTokenEncrypted: 'enc:access-fresh',
      refreshTokenEncrypted: 'enc:refresh-fresh',
      scope: 'user-library-read',
    });
  });

  it('reactively refreshes once when the stored token is rejected, then retries', async () => {
    const { db } = makeDb(makeConnection());
    vi.mocked(fetchSpotifySavedTracks)
      .mockRejectedValueOnce(new SpotifyUnauthorizedError())
      .mockResolvedValueOnce([TRACK]);

    const out = await fetchUserLikes(db, env, 'user-1', 'spotify');

    expect(out).toEqual([TRACK]);
    expect(fetchSpotifySavedTracks).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ accessToken: 'access-old' }),
    );
    expect(fetchSpotifySavedTracks).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accessToken: 'access-fresh' }),
    );
    expect(refreshSpotifyToken).toHaveBeenCalledTimes(1);
  });

  it('keeps the stored refresh token when the provider omits a rotated one', async () => {
    // Spotify frequently returns no new refresh_token on refresh; the old one must
    // survive so the next refresh still works (else the user is silently logged out).
    vi.mocked(refreshSpotifyToken).mockResolvedValueOnce({
      accessToken: 'access-fresh',
      refreshToken: null,
      expiresInSec: 3600,
      scope: 'user-library-read',
    });
    const { db, updates } = makeDb(makeConnection({ expiresAt: Date.now() - 1 }));

    await fetchUserLikes(db, env, 'user-1', 'spotify');

    expect(updates[0]).toMatchObject({
      accessTokenEncrypted: 'enc:access-fresh',
      // Unchanged: the previously-stored (encrypted) refresh token is retained.
      refreshTokenEncrypted: 'enc:refresh-old',
    });
  });

  it('maps a rejected token with no refresh token to REAUTH_REQUIRED (no refresh attempt)', async () => {
    const { db } = makeDb(makeConnection({ refreshTokenEncrypted: null }));
    vi.mocked(fetchSpotifySavedTracks).mockRejectedValueOnce(new SpotifyUnauthorizedError());

    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Spotify account.',
    } satisfies Partial<HttpError>);
    expect(refreshSpotifyToken).not.toHaveBeenCalled();
    expect(fetchSpotifySavedTracks).toHaveBeenCalledTimes(1);
  });

  it('maps REAUTH_REQUIRED when the reactive refresh itself fails', async () => {
    const { db } = makeDb(makeConnection());
    vi.mocked(fetchSpotifySavedTracks).mockRejectedValueOnce(new SpotifyUnauthorizedError());
    vi.mocked(refreshSpotifyToken).mockRejectedValueOnce(new Error('token endpoint 400'));

    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Spotify account.',
    } satisfies Partial<HttpError>);
    // The provider was hit once (401), then the refresh failed → no second read.
    expect(fetchSpotifySavedTracks).toHaveBeenCalledTimes(1);
  });
});

describe('fetchUserLikes — SoundCloud (shared connected-token path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(refreshSoundCloudToken).mockResolvedValue({
      accessToken: 'sc-access-fresh',
      refreshToken: 'sc-refresh-fresh',
      expiresInSec: 3600,
      scope: null,
    });
    vi.mocked(fetchSoundCloudLikes).mockResolvedValue([]);
  });

  it('reads likes with the stored SoundCloud token', async () => {
    const likes = [{ ...TRACK, provider: 'soundcloud' as const }];
    vi.mocked(fetchSoundCloudLikes).mockResolvedValueOnce(likes);
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));

    const out = await fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud');

    expect(out).toEqual(likes);
    expect(fetchSoundCloudLikes).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'access-old' }),
    );
    expect(refreshSoundCloudToken).not.toHaveBeenCalled();
  });

  it('reactively refreshes once when a SoundCloud likes read rejects the stored token', async () => {
    vi.mocked(fetchSoundCloudLikes)
      .mockRejectedValueOnce(new SoundCloudUnauthorizedError())
      .mockResolvedValueOnce([]);
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));

    await fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud');

    expect(fetchSoundCloudLikes).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ accessToken: 'access-old' }),
    );
    expect(fetchSoundCloudLikes).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accessToken: 'sc-access-fresh' }),
    );
    expect(refreshSoundCloudToken).toHaveBeenCalledTimes(1);
  });

  it('maps a SoundCloud auth failure with no refresh token to REAUTH_REQUIRED', async () => {
    vi.mocked(fetchSoundCloudLikes).mockRejectedValueOnce(new SoundCloudUnauthorizedError());
    const { db } = makeDb(makeConnection({ provider: 'soundcloud', refreshTokenEncrypted: null }));

    await expect(fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your SoundCloud account.',
    } satisfies Partial<HttpError>);
    expect(refreshSoundCloudToken).not.toHaveBeenCalled();
  });
});

describe('fetchUserLikes — Apple Music (developer-token path, no server refresh)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAppleMusicLibrarySongs).mockResolvedValue([]);
  });

  it('reads library songs with the developer token and decrypted Music-User-Token', async () => {
    const songs = [{ ...TRACK, provider: 'apple_music' as const }];
    vi.mocked(fetchAppleMusicLibrarySongs).mockResolvedValueOnce(songs);
    const { db } = makeDb(makeConnection({ provider: 'apple_music', refreshTokenEncrypted: null }));

    const out = await fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music');

    expect(out).toEqual(songs);
    // Apple has no server-side refresh: the stored access token IS the Music-User-Token.
    expect(fetchAppleMusicLibrarySongs).toHaveBeenCalledWith(
      expect.objectContaining({
        developerToken: 'apple-developer-token',
        musicUserToken: 'access-old',
      }),
    );
  });

  it('maps an Apple Music auth failure to REAUTH_REQUIRED (no server refresh)', async () => {
    vi.mocked(fetchAppleMusicLibrarySongs).mockRejectedValueOnce(new AppleMusicUnauthorizedError());
    const { db } = makeDb(makeConnection({ provider: 'apple_music', refreshTokenEncrypted: null }));

    await expect(fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Apple Music account.',
    } satisfies Partial<HttpError>);
  });

  it('throws NOT_CONNECTED when there is no Apple Music connection', async () => {
    const { db } = makeDb(null);

    await expect(fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music')).rejects.toMatchObject({
      status: 409,
      code: 'NOT_CONNECTED',
    } satisfies Partial<HttpError>);
  });
});
