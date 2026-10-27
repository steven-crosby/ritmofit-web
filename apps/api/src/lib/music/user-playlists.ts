/**
 * Read a connected user's saved playlists. This mirrors `user-likes.ts`: caller
 * tokens are decrypted server-side, refreshed on demand, and never returned.
 */
import { and, eq } from 'drizzle-orm';
import {
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
  SpotifyForbiddenError,
  SpotifyDevelopmentModeError,
  SpotifyPlaylistAccessDeniedError,
  AppleMusicUnauthorizedError,
  type OAuthTokens,
  type PlaylistReadOptions,
} from '@ritmofit/music';
import {
  PLAYLIST_URL_OCCURRENCE_LIMIT,
  providerCapabilities,
  type Provider,
  type ProviderPlaylistSummary,
  type TrackSearchResult,
} from '@ritmofit/shared';
import type { Db } from '../db.js';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { boundFetch } from '../fetch.js';
import { decryptSecret, encryptSecret } from '../crypto.js';
import {
  appleMusicCreds,
  requireEncryptionKey,
  soundcloudCreds,
  spotifyCreds,
} from './provider-config.js';
import { musicConnections } from '../../db/schema.js';
import {
  SPOTIFY_DEVELOPMENT_MODE_CODE,
  SPOTIFY_DEVELOPMENT_MODE_MESSAGE,
} from './spotify-development-mode.js';

const EXPIRY_SKEW_MS = 60_000;

type Creds = { clientId: string; clientSecret: string };

interface PlaylistAdapter {
  label: string;
  creds(env: Env): Creds;
  fetchPlaylists(cfg: {
    accessToken: string;
    fetchImpl: typeof boundFetch;
  }): Promise<ProviderPlaylistSummary[]>;
  fetchPlaylistTracks(cfg: {
    accessToken: string;
    playlistId: string;
    fetchImpl: typeof boundFetch;
    shouldStop?: (tracks: TrackSearchResult[]) => boolean;
  }): Promise<TrackSearchResult[]>;
  refreshToken(cfg: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    fetchImpl: typeof boundFetch;
  }): Promise<OAuthTokens>;
  isUnauthorized(err: unknown): boolean;
  /**
   * A 403 that a token refresh cannot fix — the stored token is valid but missing
   * a scope only re-consent can grant. Only Spotify's playlist reads need this
   * (a scope added after the connection was made); SoundCloud/Apple leave it
   * unset, so the `?.` call below is a no-op for them.
   */
  isForbidden?(err: unknown): boolean;
  /** Development Mode 403. Refresh and reconnect do not add the allowlist row. */
  isDevelopmentMode?(err: unknown): boolean;
  /**
   * A provider can deny one specific playlist even when the user's connection is
   * valid. Reconnecting will not help; tell the user why that playlist cannot open.
   */
  isPlaylistAccessDenied?(err: unknown): boolean;
}

interface ConnectedPlaylistRead<T> {
  db: Db;
  env: Env;
  userId: string;
  provider: Provider;
  adapter: PlaylistAdapter;
  read(accessToken: string): Promise<T>;
  /** Paste-a-link copy. Saved-playlist reads keep the generic connect/reconnect lines. */
  notConnectedMessage?: string;
  reauthMessage?: string;
}

export const SPOTIFY_PLAYLIST_PREVIEW_CONNECT_MESSAGE = 'Connect Spotify to import this playlist.';
export const SPOTIFY_PLAYLIST_PREVIEW_RECONNECT_MESSAGE =
  'Reconnect Spotify to import this playlist.';

const PLAYLIST_ADAPTERS: Partial<Record<Provider, PlaylistAdapter>> = {
  spotify: {
    label: 'Spotify',
    creds: spotifyCreds,
    fetchPlaylists: fetchSpotifySavedPlaylists,
    fetchPlaylistTracks: fetchSpotifyPlaylistTracks,
    refreshToken: refreshSpotifyToken,
    isUnauthorized: (err) => err instanceof SpotifyUnauthorizedError,
    isForbidden: (err) => err instanceof SpotifyForbiddenError,
    isDevelopmentMode: (err) => err instanceof SpotifyDevelopmentModeError,
    isPlaylistAccessDenied: (err) => err instanceof SpotifyPlaylistAccessDeniedError,
  },
  soundcloud: {
    label: 'SoundCloud',
    creds: soundcloudCreds,
    fetchPlaylists: fetchSoundCloudPlaylists,
    fetchPlaylistTracks: fetchSoundCloudPlaylistTracks,
    refreshToken: refreshSoundCloudToken,
    isUnauthorized: (err) => err instanceof SoundCloudUnauthorizedError,
  },
};

export async function fetchUserPlaylists(
  db: Db,
  env: Env,
  userId: string,
  provider: Provider,
): Promise<ProviderPlaylistSummary[]> {
  if (env.MOCK_PROVIDERS === 'true') return [];
  if (!providerCapabilities[provider].savedPlaylists) {
    throw new HttpError(
      501,
      'NOT_IMPLEMENTED',
      `Provider '${provider}' saved playlists are not integrated.`,
    );
  }

  if (provider === 'apple_music') {
    return fetchAppleMusicPlaylists(db, env, userId);
  }

  const adapter = PLAYLIST_ADAPTERS[provider];
  if (!adapter)
    throw new HttpError(
      501,
      'NOT_IMPLEMENTED',
      `Provider '${provider}' saved playlists are not integrated.`,
    );

  return readWithConnectedPlaylistToken({
    db,
    env,
    userId,
    provider,
    adapter,
    read: (accessToken) => adapter.fetchPlaylists({ accessToken, fetchImpl: boundFetch }),
  });
}

export async function fetchUserPlaylistTracks(
  db: Db,
  env: Env,
  userId: string,
  provider: Provider,
  playlistId: string,
  options?: { shouldStop?: (tracks: TrackSearchResult[]) => boolean },
): Promise<TrackSearchResult[]> {
  if (env.MOCK_PROVIDERS === 'true') return [];
  if (!providerCapabilities[provider].savedPlaylists) {
    throw new HttpError(
      501,
      'NOT_IMPLEMENTED',
      `Provider '${provider}' saved playlists are not integrated.`,
    );
  }
  if (provider === 'apple_music') {
    return fetchAppleMusicPlaylistTracks(db, env, userId, playlistId, options?.shouldStop);
  }

  const adapter = PLAYLIST_ADAPTERS[provider];
  if (!adapter)
    throw new HttpError(
      501,
      'NOT_IMPLEMENTED',
      `Provider '${provider}' saved playlists are not integrated.`,
    );

  return readWithConnectedPlaylistToken({
    db,
    env,
    userId,
    provider,
    adapter,
    read: (accessToken) =>
      adapter.fetchPlaylistTracks({
        accessToken,
        playlistId,
        fetchImpl: boundFetch,
        ...(options?.shouldStop ? { shouldStop: options.shouldStop } : {}),
      }),
  });
}

/**
 * Paste-a-link preview for a Spotify playlist. Spotify's playlist-items
 * endpoint rejects the app's client-credentials token with 401 "Valid user
 * authentication required". That failure is an auth problem, so this path
 * does not fall back to the app token (a remint would surface as
 * PROVIDER_UNAVAILABLE). The instructor's stored user token is refreshed with
 * the same rules as saved-playlist reads.
 */
export async function fetchSpotifyPlaylistPreview(
  db: Db,
  env: Env,
  userId: string,
  playlistId: string,
  read?: PlaylistReadOptions,
): Promise<TrackSearchResult[]> {
  if (env.MOCK_PROVIDERS === 'true') return [];
  const adapter = PLAYLIST_ADAPTERS.spotify;
  if (!adapter) {
    throw new HttpError(
      501,
      'NOT_IMPLEMENTED',
      "Provider 'spotify' saved playlists are not integrated.",
    );
  }
  return readWithConnectedPlaylistToken({
    db,
    env,
    userId,
    provider: 'spotify',
    adapter,
    notConnectedMessage: SPOTIFY_PLAYLIST_PREVIEW_CONNECT_MESSAGE,
    reauthMessage: SPOTIFY_PLAYLIST_PREVIEW_RECONNECT_MESSAGE,
    read: (accessToken) =>
      fetchSpotifyPlaylistTracks({
        accessToken,
        playlistId,
        fetchImpl: boundFetch,
        occurrenceLimit: PLAYLIST_URL_OCCURRENCE_LIMIT,
        ...(read ? { read } : {}),
      }),
  });
}

/**
 * Map known provider playlist-read failures to stable HttpErrors so they never
 * leak as raw 5xx. Shared by the first read and the post-refresh retry.
 *
 * - Forbidden (valid token, missing scope) → 409 REAUTH_REQUIRED
 * - Per-playlist access denied → 403 PROVIDER_FORBIDDEN
 * - Unauthorized → 409 REAUTH_REQUIRED when `unauthorizedAsReauth` (dead grant /
 *   already refreshed); otherwise the caller handles a single reactive refresh
 * - Anything else → rethrow as-is
 */
function mapConnectedPlaylistReadError(
  adapter: PlaylistAdapter,
  err: unknown,
  opts: { unauthorizedAsReauth?: boolean; reauthMessage?: string } = {},
): never {
  const reauth = opts.reauthMessage ?? `Reconnect your ${adapter.label} account.`;
  // Allowlist 403 is not a missing scope. Reconnect cannot add the dashboard row.
  if (adapter.isDevelopmentMode?.(err)) {
    throw new HttpError(403, SPOTIFY_DEVELOPMENT_MODE_CODE, SPOTIFY_DEVELOPMENT_MODE_MESSAGE);
  }
  // A missing scope: no refresh can grant it — prompt reconnect, don't burn a cycle.
  if (adapter.isForbidden?.(err)) {
    throw new HttpError(409, 'REAUTH_REQUIRED', reauth);
  }
  if (adapter.isPlaylistAccessDenied?.(err)) {
    throw new HttpError(
      403,
      'PROVIDER_FORBIDDEN',
      `${adapter.label} only allows opening playlists you own or collaborate on.`,
    );
  }
  if (opts.unauthorizedAsReauth && adapter.isUnauthorized(err)) {
    throw new HttpError(409, 'REAUTH_REQUIRED', reauth);
  }
  throw err;
}

async function readWithConnectedPlaylistToken<T>(cfg: ConnectedPlaylistRead<T>): Promise<T> {
  const key = requireEncryptionKey(cfg.env);
  const creds = cfg.adapter.creds(cfg.env);
  const conn = await cfg.db
    .select()
    .from(musicConnections)
    .where(
      and(eq(musicConnections.userId, cfg.userId), eq(musicConnections.provider, cfg.provider)),
    )
    .get();

  if (!conn) {
    throw new HttpError(
      409,
      'NOT_CONNECTED',
      cfg.notConnectedMessage ?? `Connect your ${cfg.adapter.label} account first.`,
    );
  }

  const expired = conn.expiresAt !== null && Date.now() > conn.expiresAt - EXPIRY_SKEW_MS;
  let refreshed = expired;
  let accessToken = expired
    ? await refreshAndPersist(cfg.db, key, cfg.adapter, creds, conn, cfg.reauthMessage)
    : await decryptSecret(conn.accessTokenEncrypted, key);

  try {
    return await cfg.read(accessToken);
  } catch (err) {
    // Forbidden / access-denied map immediately. Other non-401 errors rethrow.
    // Unauthorized falls through for one reactive refresh when possible.
    if (!cfg.adapter.isUnauthorized(err)) {
      mapConnectedPlaylistReadError(cfg.adapter, err, { reauthMessage: cfg.reauthMessage });
    }
    if (refreshed || !conn.refreshTokenEncrypted) {
      mapConnectedPlaylistReadError(cfg.adapter, err, {
        unauthorizedAsReauth: true,
        reauthMessage: cfg.reauthMessage,
      });
    }
    refreshed = true;
    accessToken = await refreshAndPersist(cfg.db, key, cfg.adapter, creds, conn, cfg.reauthMessage);
    try {
      // Note the `await`: without it the retry's rejection escapes this try/catch
      // and the second 401 would leak as a raw provider error instead of REAUTH.
      return await cfg.read(accessToken);
    } catch (retryErr) {
      // Post-refresh: same Forbidden/AccessDenied mapping as the first path, plus
      // a second 401 → REAUTH (grant is dead; do not refresh again).
      mapConnectedPlaylistReadError(cfg.adapter, retryErr, {
        unauthorizedAsReauth: true,
        reauthMessage: cfg.reauthMessage,
      });
    }
  }
}

async function fetchAppleMusicPlaylists(
  db: Db,
  env: Env,
  userId: string,
): Promise<ProviderPlaylistSummary[]> {
  const key = requireEncryptionKey(env);
  const { developerToken } = await appleMusicCreds(env);
  const conn = await db
    .select()
    .from(musicConnections)
    .where(and(eq(musicConnections.userId, userId), eq(musicConnections.provider, 'apple_music')))
    .get();
  if (!conn) {
    throw new HttpError(409, 'NOT_CONNECTED', 'Connect your Apple Music account first.');
  }
  const musicUserToken = await decryptSecret(conn.accessTokenEncrypted, key);
  try {
    return await fetchAppleMusicLibraryPlaylists({
      developerToken,
      musicUserToken,
      fetchImpl: boundFetch,
    });
  } catch (err) {
    if (err instanceof AppleMusicUnauthorizedError) {
      throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your Apple Music account.');
    }
    throw err;
  }
}

async function fetchAppleMusicPlaylistTracks(
  db: Db,
  env: Env,
  userId: string,
  playlistId: string,
  shouldStop?: (tracks: TrackSearchResult[]) => boolean,
): Promise<TrackSearchResult[]> {
  const key = requireEncryptionKey(env);
  const { developerToken } = await appleMusicCreds(env);
  const conn = await db
    .select()
    .from(musicConnections)
    .where(and(eq(musicConnections.userId, userId), eq(musicConnections.provider, 'apple_music')))
    .get();
  if (!conn) {
    throw new HttpError(409, 'NOT_CONNECTED', 'Connect your Apple Music account first.');
  }
  const musicUserToken = await decryptSecret(conn.accessTokenEncrypted, key);
  try {
    return await fetchAppleMusicLibraryPlaylistTracks({
      developerToken,
      musicUserToken,
      playlistId,
      fetchImpl: boundFetch,
      ...(shouldStop ? { shouldStop } : {}),
    });
  } catch (err) {
    if (err instanceof AppleMusicUnauthorizedError) {
      throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your Apple Music account.');
    }
    throw err;
  }
}

async function refreshAndPersist(
  db: Db,
  key: string,
  adapter: PlaylistAdapter,
  creds: Creds,
  conn: typeof musicConnections.$inferSelect,
  reauthMessage?: string,
): Promise<string> {
  const reauth = reauthMessage ?? `Reconnect your ${adapter.label} account.`;
  if (!conn.refreshTokenEncrypted) {
    throw new HttpError(409, 'REAUTH_REQUIRED', reauth);
  }

  let tokens;
  try {
    const refreshToken = await decryptSecret(conn.refreshTokenEncrypted, key);
    tokens = await adapter.refreshToken({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken,
      fetchImpl: boundFetch,
    });
  } catch {
    throw new HttpError(409, 'REAUTH_REQUIRED', reauth);
  }

  await db
    .update(musicConnections)
    .set({
      accessTokenEncrypted: await encryptSecret(tokens.accessToken, key),
      refreshTokenEncrypted: tokens.refreshToken
        ? await encryptSecret(tokens.refreshToken, key)
        : conn.refreshTokenEncrypted,
      scope: tokens.scope ?? conn.scope,
      expiresAt: tokens.expiresInSec ? Date.now() + tokens.expiresInSec * 1000 : null,
      updatedAt: Date.now(),
    })
    .where(eq(musicConnections.id, conn.id));

  return tokens.accessToken;
}
