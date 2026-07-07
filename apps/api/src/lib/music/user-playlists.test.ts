import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppleMusicUnauthorizedError,
  fetchAppleMusicLibraryPlaylistTracks,
  fetchAppleMusicLibraryPlaylists,
  fetchSoundCloudPlaylistTracks,
  fetchSoundCloudPlaylists,
  fetchSpotifyPlaylistTracks,
  fetchSpotifySavedPlaylists,
  refreshSoundCloudToken,
  refreshSpotifyToken,
  SoundCloudUnauthorizedError,
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
  fetchSoundCloudPlaylists: vi.fn(),
  fetchSoundCloudPlaylistTracks: vi.fn(),
  refreshSoundCloudToken: vi.fn(),
  fetchAppleMusicLibraryPlaylists: vi.fn(),
  fetchAppleMusicLibraryPlaylistTracks: vi.fn(),
}));

vi.mock('@ritmofit/music', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ritmofit/music')>();
  return {
    ...actual,
    fetchSpotifySavedPlaylists: musicMocks.fetchSpotifySavedPlaylists,
    fetchSpotifyPlaylistTracks: musicMocks.fetchSpotifyPlaylistTracks,
    refreshSpotifyToken: musicMocks.refreshSpotifyToken,
    fetchSoundCloudPlaylists: musicMocks.fetchSoundCloudPlaylists,
    fetchSoundCloudPlaylistTracks: musicMocks.fetchSoundCloudPlaylistTracks,
    refreshSoundCloudToken: musicMocks.refreshSoundCloudToken,
    fetchAppleMusicLibraryPlaylists: musicMocks.fetchAppleMusicLibraryPlaylists,
    fetchAppleMusicLibraryPlaylistTracks: musicMocks.fetchAppleMusicLibraryPlaylistTracks,
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

const soundcloudEnv = {
  ...env,
  SOUNDCLOUD_CLIENT_ID: 'soundcloud-client',
  SOUNDCLOUD_CLIENT_SECRET: 'soundcloud-secret',
} as Env;

const appleMusicEnv = { ...env, APPLE_MUSIC_DEVELOPER_TOKEN: 'apple-developer-token' } as Env;

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

  it('keeps the stored refresh token when the provider omits a rotated one', async () => {
    // Spotify frequently returns no new refresh_token on refresh; the old one must
    // survive so the next refresh still works (else the user is silently logged out).
    vi.mocked(refreshSpotifyToken).mockResolvedValueOnce({
      accessToken: 'access-fresh',
      refreshToken: null,
      expiresInSec: 3600,
      scope: 'playlist-read-private',
    });
    const { db, updates } = makeDb(makeConnection({ expiresAt: Date.now() - 1 }));

    await fetchUserPlaylists(db, env, 'user-1', 'spotify');

    expect(updates[0]).toMatchObject({
      accessTokenEncrypted: 'enc:access-fresh',
      // Unchanged: the previously-stored (encrypted) refresh token is retained.
      refreshTokenEncrypted: 'enc:refresh-old',
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

describe('SoundCloud saved playlists (shared connected-token path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(refreshSoundCloudToken).mockResolvedValue({
      accessToken: 'sc-access-fresh',
      refreshToken: 'sc-refresh-fresh',
      expiresInSec: 3600,
      scope: null,
    });
    vi.mocked(fetchSoundCloudPlaylists).mockResolvedValue([]);
    vi.mocked(fetchSoundCloudPlaylistTracks).mockResolvedValue([]);
  });

  it('reads saved playlists with the stored SoundCloud token', async () => {
    const summary = {
      provider: 'soundcloud' as const,
      playlistId: 'set-1',
      name: 'Climb',
      ownerName: 'DJ',
      trackCount: 12,
      coverImageUrl: null,
    };
    vi.mocked(fetchSoundCloudPlaylists).mockResolvedValueOnce([summary]);
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));

    const out = await fetchUserPlaylists(db, soundcloudEnv, 'user-1', 'soundcloud');

    expect(out).toEqual([summary]);
    expect(fetchSoundCloudPlaylists).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'access-old' }),
    );
  });

  it('reactively refreshes once when a SoundCloud tracks read rejects the stored token', async () => {
    vi.mocked(fetchSoundCloudPlaylistTracks)
      .mockRejectedValueOnce(new SoundCloudUnauthorizedError())
      .mockResolvedValueOnce([]);
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));

    await fetchUserPlaylistTracks(db, soundcloudEnv, 'user-1', 'soundcloud', 'set-1');

    expect(fetchSoundCloudPlaylistTracks).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ accessToken: 'access-old', playlistId: 'set-1' }),
    );
    expect(fetchSoundCloudPlaylistTracks).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accessToken: 'sc-access-fresh', playlistId: 'set-1' }),
    );
    expect(refreshSoundCloudToken).toHaveBeenCalledTimes(1);
  });

  it('maps a SoundCloud auth failure with no refresh token to REAUTH_REQUIRED', async () => {
    vi.mocked(fetchSoundCloudPlaylists).mockRejectedValueOnce(new SoundCloudUnauthorizedError());
    const { db } = makeDb(makeConnection({ provider: 'soundcloud', refreshTokenEncrypted: null }));

    await expect(
      fetchUserPlaylists(db, soundcloudEnv, 'user-1', 'soundcloud'),
    ).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your SoundCloud account.',
    } satisfies Partial<HttpError>);
    expect(refreshSoundCloudToken).not.toHaveBeenCalled();
  });
});

describe('Apple Music saved playlists (developer-token path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAppleMusicLibraryPlaylists).mockResolvedValue([]);
    vi.mocked(fetchAppleMusicLibraryPlaylistTracks).mockResolvedValue([]);
  });

  it('reads library playlists with the developer token and decrypted Music-User-Token', async () => {
    const summary = {
      provider: 'apple_music' as const,
      playlistId: 'p.library-1',
      name: 'Ride',
      ownerName: null,
      trackCount: 8,
      coverImageUrl: null,
    };
    vi.mocked(fetchAppleMusicLibraryPlaylists).mockResolvedValueOnce([summary]);
    const { db } = makeDb(makeConnection({ provider: 'apple_music', refreshTokenEncrypted: null }));

    const out = await fetchUserPlaylists(db, appleMusicEnv, 'user-1', 'apple_music');

    expect(out).toEqual([summary]);
    // Apple has no server-side refresh: the stored access token IS the Music-User-Token.
    expect(fetchAppleMusicLibraryPlaylists).toHaveBeenCalledWith(
      expect.objectContaining({
        developerToken: 'apple-developer-token',
        musicUserToken: 'access-old',
      }),
    );
  });

  it('passes the playlist id through to the library tracks read', async () => {
    const { db } = makeDb(makeConnection({ provider: 'apple_music', refreshTokenEncrypted: null }));

    await fetchUserPlaylistTracks(db, appleMusicEnv, 'user-1', 'apple_music', 'p.library-1');

    expect(fetchAppleMusicLibraryPlaylistTracks).toHaveBeenCalledWith(
      expect.objectContaining({
        developerToken: 'apple-developer-token',
        musicUserToken: 'access-old',
        playlistId: 'p.library-1',
      }),
    );
  });

  it('maps an Apple Music auth failure to REAUTH_REQUIRED (no server refresh)', async () => {
    vi.mocked(fetchAppleMusicLibraryPlaylists).mockRejectedValueOnce(
      new AppleMusicUnauthorizedError(),
    );
    const { db } = makeDb(makeConnection({ provider: 'apple_music', refreshTokenEncrypted: null }));

    await expect(
      fetchUserPlaylists(db, appleMusicEnv, 'user-1', 'apple_music'),
    ).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Apple Music account.',
    } satisfies Partial<HttpError>);
  });

  it('throws NOT_CONNECTED when there is no Apple Music connection', async () => {
    const { db } = makeDb(null);

    await expect(
      fetchUserPlaylists(db, appleMusicEnv, 'user-1', 'apple_music'),
    ).rejects.toMatchObject({
      status: 409,
      code: 'NOT_CONNECTED',
    } satisfies Partial<HttpError>);
  });
});
