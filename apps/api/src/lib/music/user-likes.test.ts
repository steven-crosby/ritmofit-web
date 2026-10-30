import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppleMusicUnauthorizedError,
  InvalidProviderCursorError,
  fetchAppleMusicLibrarySongsPage,
  searchAppleMusicLibrarySongs,
  fetchSoundCloudLikesPage,
  fetchSpotifySavedTracksPage,
  refreshSoundCloudToken,
  refreshSpotifyToken,
  SoundCloudUnauthorizedError,
  SpotifyDevelopmentModeError,
  SpotifyUnauthorizedError,
} from '@ritmofit/music';
import { fetchUserLikes, LIKES_PAGE_TARGET } from './user-likes.js';
import { encodeLikesCursor } from './likes-cursor.js';
import { HttpError } from '../errors.js';
import { SPOTIFY_DEVELOPMENT_MODE_MESSAGE } from './spotify-development-mode.js';
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
  fetchSpotifySavedTracksPage: vi.fn(),
  refreshSpotifyToken: vi.fn(),
  fetchSoundCloudLikesPage: vi.fn(),
  refreshSoundCloudToken: vi.fn(),
  fetchAppleMusicLibrarySongsPage: vi.fn(),
  searchAppleMusicLibrarySongs: vi.fn(),
}));

vi.mock('@ritmofit/music', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ritmofit/music')>();
  return {
    ...actual,
    fetchSpotifySavedTracksPage: musicMocks.fetchSpotifySavedTracksPage,
    refreshSpotifyToken: musicMocks.refreshSpotifyToken,
    fetchSoundCloudLikesPage: musicMocks.fetchSoundCloudLikesPage,
    refreshSoundCloudToken: musicMocks.refreshSoundCloudToken,
    fetchAppleMusicLibrarySongsPage: musicMocks.fetchAppleMusicLibrarySongsPage,
    searchAppleMusicLibrarySongs: musicMocks.searchAppleMusicLibrarySongs,
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
    expect(out).toEqual({ tracks: [{ mock: true }], nextCursor: null });
    expect(fetchSpotifySavedTracksPage).not.toHaveBeenCalled();
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
    vi.mocked(fetchSpotifySavedTracksPage).mockResolvedValue({ tracks: [], next: null });
  });

  it('maps a Development Mode 403 on likes to the allowlist code without refreshing', async () => {
    const { db } = makeDb(makeConnection());
    vi.mocked(fetchSpotifySavedTracksPage).mockRejectedValueOnce(new SpotifyDevelopmentModeError());

    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 403,
      code: 'SPOTIFY_DEVELOPMENT_MODE',
      message: SPOTIFY_DEVELOPMENT_MODE_MESSAGE,
    } satisfies Partial<HttpError>);
    expect(refreshSpotifyToken).not.toHaveBeenCalled();
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
    expect(fetchSpotifySavedTracksPage).toHaveBeenCalledWith(
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
    vi.mocked(fetchSpotifySavedTracksPage)
      .mockRejectedValueOnce(new SpotifyUnauthorizedError())
      .mockResolvedValueOnce({ tracks: [TRACK], next: null });

    const out = await fetchUserLikes(db, env, 'user-1', 'spotify');

    expect(out).toEqual({ tracks: [TRACK], nextCursor: null });
    expect(fetchSpotifySavedTracksPage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ accessToken: 'access-old' }),
    );
    expect(fetchSpotifySavedTracksPage).toHaveBeenNthCalledWith(
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
    vi.mocked(fetchSpotifySavedTracksPage).mockRejectedValueOnce(new SpotifyUnauthorizedError());

    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Spotify account.',
    } satisfies Partial<HttpError>);
    expect(refreshSpotifyToken).not.toHaveBeenCalled();
    expect(fetchSpotifySavedTracksPage).toHaveBeenCalledTimes(1);
  });

  it('maps REAUTH_REQUIRED when the reactive refresh itself fails', async () => {
    const { db } = makeDb(makeConnection());
    vi.mocked(fetchSpotifySavedTracksPage).mockRejectedValueOnce(new SpotifyUnauthorizedError());
    vi.mocked(refreshSpotifyToken).mockRejectedValueOnce(new Error('token endpoint 400'));

    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Spotify account.',
    } satisfies Partial<HttpError>);
    // The provider was hit once (401), then the refresh failed → no second read.
    expect(fetchSpotifySavedTracksPage).toHaveBeenCalledTimes(1);
  });

  it('maps REAUTH_REQUIRED when a proactive refresh is followed by a 401 (no second refresh)', async () => {
    // Expired token → proactive refresh succeeds → the read still 401s. Because we
    // already refreshed this request, the `refreshed` guard short-circuits to REAUTH
    // instead of burning a second (replayed) refresh.
    const { db } = makeDb(makeConnection({ expiresAt: Date.now() - 1 }));
    vi.mocked(fetchSpotifySavedTracksPage).mockRejectedValueOnce(new SpotifyUnauthorizedError());

    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Spotify account.',
    } satisfies Partial<HttpError>);
    expect(refreshSpotifyToken).toHaveBeenCalledTimes(1);
    expect(fetchSpotifySavedTracksPage).toHaveBeenCalledTimes(1);
  });

  it('maps REAUTH_REQUIRED when the reactive-refresh retry 401s again', async () => {
    // 401 on the stored token → refresh succeeds → the retried read 401s again.
    // The freshly-refreshed grant is dead, so this surfaces REAUTH rather than
    // leaking the raw provider 401 as a 5xx.
    const { db } = makeDb(makeConnection());
    vi.mocked(fetchSpotifySavedTracksPage)
      .mockRejectedValueOnce(new SpotifyUnauthorizedError())
      .mockRejectedValueOnce(new SpotifyUnauthorizedError());

    await expect(fetchUserLikes(db, env, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 409,
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect your Spotify account.',
    } satisfies Partial<HttpError>);
    expect(refreshSpotifyToken).toHaveBeenCalledTimes(1);
    expect(fetchSpotifySavedTracksPage).toHaveBeenCalledTimes(2);
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
    vi.mocked(fetchSoundCloudLikesPage).mockResolvedValue({ tracks: [], next: null });
  });

  it('reads likes with the stored SoundCloud token', async () => {
    const likes = [{ ...TRACK, provider: 'soundcloud' as const }];
    vi.mocked(fetchSoundCloudLikesPage).mockResolvedValueOnce({ tracks: likes, next: null });
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));

    const out = await fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud');

    expect(out).toEqual({ tracks: likes, nextCursor: null });
    expect(fetchSoundCloudLikesPage).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'access-old' }),
    );
    expect(refreshSoundCloudToken).not.toHaveBeenCalled();
  });

  it('reactively refreshes once when a SoundCloud likes read rejects the stored token', async () => {
    vi.mocked(fetchSoundCloudLikesPage)
      .mockRejectedValueOnce(new SoundCloudUnauthorizedError())
      .mockResolvedValueOnce({ tracks: [], next: null });
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));

    await fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud');

    expect(fetchSoundCloudLikesPage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ accessToken: 'access-old' }),
    );
    expect(fetchSoundCloudLikesPage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accessToken: 'sc-access-fresh' }),
    );
    expect(refreshSoundCloudToken).toHaveBeenCalledTimes(1);
  });

  it('maps a SoundCloud auth failure with no refresh token to REAUTH_REQUIRED', async () => {
    vi.mocked(fetchSoundCloudLikesPage).mockRejectedValueOnce(new SoundCloudUnauthorizedError());
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
    vi.mocked(fetchAppleMusicLibrarySongsPage).mockResolvedValue({ tracks: [], next: null });
  });

  it('reads library songs with the developer token and decrypted Music-User-Token', async () => {
    const songs = [{ ...TRACK, provider: 'apple_music' as const }];
    vi.mocked(fetchAppleMusicLibrarySongsPage).mockResolvedValueOnce({ tracks: songs, next: null });
    const { db } = makeDb(makeConnection({ provider: 'apple_music', refreshTokenEncrypted: null }));

    const out = await fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music');

    expect(out).toEqual({ tracks: songs, nextCursor: null });
    // Apple has no server-side refresh: the stored access token IS the Music-User-Token.
    expect(fetchAppleMusicLibrarySongsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        developerToken: 'apple-developer-token',
        musicUserToken: 'access-old',
      }),
    );
  });

  it('maps an Apple Music auth failure to REAUTH_REQUIRED (no server refresh)', async () => {
    vi.mocked(fetchAppleMusicLibrarySongsPage).mockRejectedValueOnce(
      new AppleMusicUnauthorizedError(),
    );
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

describe('fetchUserLikes — PROVIDER_UNAVAILABLE config guards', () => {
  // The config guards fire before any DB read, so an unconfigured provider surfaces
  // 503 rather than reaching the connection lookup (which would be a 409). makeDb(null)
  // is never touched.
  beforeEach(() => vi.clearAllMocks());

  it('surfaces 503 before any DB read when the encryption key is unconfigured', async () => {
    const { db } = makeDb(null);
    const noKeyEnv = {
      SPOTIFY_CLIENT_ID: 'spotify-client',
      SPOTIFY_CLIENT_SECRET: 'spotify-secret',
    } as Env;

    await expect(fetchUserLikes(db, noKeyEnv, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 503,
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Provider connections are not configured.',
    } satisfies Partial<HttpError>);
  });

  it('surfaces 503 when Spotify app credentials are unconfigured', async () => {
    const { db } = makeDb(null);
    const noCredsEnv = { ENCRYPTION_KEY: 'test-key' } as Env;

    await expect(fetchUserLikes(db, noCredsEnv, 'user-1', 'spotify')).rejects.toMatchObject({
      status: 503,
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Spotify is not configured.',
    } satisfies Partial<HttpError>);
  });

  it('surfaces 503 when SoundCloud app credentials are unconfigured', async () => {
    const { db } = makeDb(null);
    const noCredsEnv = { ENCRYPTION_KEY: 'test-key' } as Env;

    await expect(fetchUserLikes(db, noCredsEnv, 'user-1', 'soundcloud')).rejects.toMatchObject({
      status: 503,
      code: 'PROVIDER_UNAVAILABLE',
      message: 'SoundCloud is not configured.',
    } satisfies Partial<HttpError>);
  });

  it('surfaces 503 when Apple Music is unconfigured', async () => {
    const { db } = makeDb(null);
    const noCredsEnv = { ENCRYPTION_KEY: 'test-key' } as Env;

    await expect(fetchUserLikes(db, noCredsEnv, 'user-1', 'apple_music')).rejects.toMatchObject({
      status: 503,
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Apple Music is not configured.',
    } satisfies Partial<HttpError>);
  });
});

describe('fetchUserLikes — paging cursor and Apple library search (RF-132)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAppleMusicLibrarySongsPage).mockResolvedValue({ tracks: [], next: null });
    vi.mocked(fetchSoundCloudLikesPage).mockResolvedValue({ tracks: [], next: null });
  });

  const appleConn = () => makeConnection({ provider: 'apple_music', refreshTokenEncrypted: null });

  it('wraps the provider continuation in an opaque cursor and hands it back on the next call', async () => {
    vi.mocked(fetchAppleMusicLibrarySongsPage).mockResolvedValueOnce({
      tracks: [TRACK],
      next: '/v1/me/library/songs?offset=200',
    });
    const { db } = makeDb(appleConn());

    const first = await fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music');
    expect(first.nextCursor).toBe(
      encodeLikesCursor('apple_music', '/v1/me/library/songs?offset=200'),
    );
    expect(first.nextCursor).not.toContain('/v1/');
    expect(fetchAppleMusicLibrarySongsPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: null, targetTracks: LIKES_PAGE_TARGET }),
    );

    await fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music', {
      cursor: first.nextCursor ?? undefined,
    });
    expect(fetchAppleMusicLibrarySongsPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: '/v1/me/library/songs?offset=200' }),
    );
  });

  it('returns a null cursor on the last page', async () => {
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));
    const out = await fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud');
    expect(out.nextCursor).toBeNull();
  });

  it('passes a SoundCloud cursor through the refresh-and-retry path unchanged', async () => {
    const next = 'https://api.soundcloud.com/me/likes/tracks?cursor=abc&limit=50';
    vi.mocked(refreshSoundCloudToken).mockResolvedValue({
      accessToken: 'sc-access-fresh',
      refreshToken: null,
      expiresInSec: 3600,
      scope: null,
    });
    vi.mocked(fetchSoundCloudLikesPage)
      .mockRejectedValueOnce(new SoundCloudUnauthorizedError())
      .mockResolvedValueOnce({ tracks: [], next: null });
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));

    await fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud', {
      cursor: encodeLikesCursor('soundcloud', next),
    });

    expect(fetchSoundCloudLikesPage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accessToken: 'sc-access-fresh', cursor: next }),
    );
  });

  it('rejects a malformed cursor with 422 before reading the connection', async () => {
    const { db } = makeDb(appleConn());
    const select = vi.spyOn(db, 'select');
    await expect(
      fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music', { cursor: 'not-a-cursor' }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(select).not.toHaveBeenCalled();
    expect(fetchAppleMusicLibrarySongsPage).not.toHaveBeenCalled();
  });

  it("rejects another provider's cursor with 422", async () => {
    const { db } = makeDb(appleConn());
    await expect(
      fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music', {
        cursor: encodeLikesCursor('soundcloud', 'https://api.soundcloud.com/me/likes/tracks?x=1'),
      }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
  });

  it('maps an adapter-refused continuation (wrong host or path) to 422, not 502', async () => {
    vi.mocked(fetchAppleMusicLibrarySongsPage).mockRejectedValueOnce(
      new InvalidProviderCursorError('apple_music'),
    );
    const { db } = makeDb(appleConn());
    await expect(
      fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music', {
        cursor: encodeLikesCursor('apple_music', '/v1/me/storefront?x=1'),
      }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
  });

  it('answers q for Apple Music with a library search and no cursor', async () => {
    vi.mocked(searchAppleMusicLibrarySongs).mockResolvedValueOnce([TRACK]);
    const { db } = makeDb(appleConn());

    const out = await fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music', {
      q: '  angel  ',
    });

    expect(out).toEqual({ tracks: [TRACK], nextCursor: null });
    expect(searchAppleMusicLibrarySongs).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'angel', musicUserToken: 'access-old' }),
    );
    expect(fetchAppleMusicLibrarySongsPage).not.toHaveBeenCalled();
  });

  it('maps an Apple library-search auth failure to REAUTH_REQUIRED', async () => {
    vi.mocked(searchAppleMusicLibrarySongs).mockRejectedValueOnce(
      new AppleMusicUnauthorizedError(),
    );
    const { db } = makeDb(appleConn());
    await expect(
      fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music', { q: 'angel' }),
    ).rejects.toMatchObject({ status: 409, code: 'REAUTH_REQUIRED' });
  });

  it('rejects q for providers without a library search', async () => {
    const { db } = makeDb(makeConnection({ provider: 'soundcloud' }));
    await expect(
      fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud', { q: 'angel' }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(fetchSoundCloudLikesPage).not.toHaveBeenCalled();
  });

  it('rejects q together with cursor', async () => {
    const { db } = makeDb(appleConn());
    await expect(
      fetchUserLikes(db, appleMusicEnv, 'user-1', 'apple_music', {
        q: 'angel',
        cursor: encodeLikesCursor('apple_music', '/v1/me/library/songs?offset=200'),
      }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
  });

  it('pages the mock catalog by offset under MOCK_PROVIDERS', async () => {
    const { searchMockCatalog } = await import('../mock-catalog.js');
    const rows = Array.from({ length: LIKES_PAGE_TARGET + 3 }, (_, i) => ({
      ...TRACK,
      title: `${i}`,
    }));
    vi.mocked(searchMockCatalog).mockReturnValue(rows);
    const { db } = makeDb(null);
    const mockEnv = { ...env, MOCK_PROVIDERS: 'true' } as Env;

    const first = await fetchUserLikes(db, mockEnv, 'user-1', 'spotify');
    expect(first.tracks).toHaveLength(LIKES_PAGE_TARGET);
    expect(first.nextCursor).not.toBeNull();

    const second = await fetchUserLikes(db, mockEnv, 'user-1', 'spotify', {
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.tracks.map((t) => t.title)).toEqual([
      `${LIKES_PAGE_TARGET}`,
      `${LIKES_PAGE_TARGET + 1}`,
      `${LIKES_PAGE_TARGET + 2}`,
    ]);
    expect(second.nextCursor).toBeNull();
    vi.mocked(searchMockCatalog).mockReturnValue([{ mock: true }] as never);
  });
});

describe('fetchUserLikes — unintegrated provider (RF-132 second review item 6)', () => {
  it('returns 501 before decoding the cursor or checking q', async () => {
    const { providerCapabilities } = await import('@ritmofit/shared');
    const caps = providerCapabilities.soundcloud as { userLikes: boolean };
    const original = caps.userLikes;
    caps.userLikes = false;
    try {
      const { db } = makeDb(null);
      for (const request of [{ cursor: 'not-a-cursor' }, { q: 'angel' }]) {
        await expect(
          fetchUserLikes(db, soundcloudEnv, 'user-1', 'soundcloud', request),
        ).rejects.toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' });
      }
    } finally {
      caps.userLikes = original;
    }
  });
});
