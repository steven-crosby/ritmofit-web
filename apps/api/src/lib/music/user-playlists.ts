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
  SpotifyPlaylistAccessDeniedError,
  AppleMusicUnauthorizedError,
  type OAuthTokens,
} from '@ritmofit/music';
import {
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
}

const PLAYLIST_ADAPTERS: Partial<Record<Provider, PlaylistAdapter>> = {
  spotify: {
    label: 'Spotify',
    creds: spotifyCreds,
    fetchPlaylists: fetchSpotifySavedPlaylists,
    fetchPlaylistTracks: fetchSpotifyPlaylistTracks,
    refreshToken: refreshSpotifyToken,
    isUnauthorized: (err) => err instanceof SpotifyUnauthorizedError,
    isForbidden: (err) => err instanceof SpotifyForbiddenError,
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
    return fetchAppleMusicPlaylistTracks(db, env, userId, playlistId);
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
      adapter.fetchPlaylistTracks({ accessToken, playlistId, fetchImpl: boundFetch }),
  });
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
    throw new HttpError(409, 'NOT_CONNECTED', `Connect your ${cfg.adapter.label} account first.`);
  }

  const expired = conn.expiresAt !== null && Date.now() > conn.expiresAt - EXPIRY_SKEW_MS;
  let refreshed = expired;
  let accessToken = expired
    ? await refreshAndPersist(cfg.db, key, cfg.adapter, creds, conn)
    : await decryptSecret(conn.accessTokenEncrypted, key);

  try {
    return await cfg.read(accessToken);
  } catch (err) {
    // A missing scope: no refresh can grant it, so retrying would just repeat the
    // same 403. Prompt reconnect immediately instead of burning a refresh cycle.
    if (cfg.adapter.isForbidden?.(err)) {
      throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${cfg.adapter.label} account.`);
    }
    if (cfg.adapter.isPlaylistAccessDenied?.(err)) {
      throw new HttpError(
        403,
        'PROVIDER_FORBIDDEN',
        `${cfg.adapter.label} only allows opening playlists you own or collaborate on.`,
      );
    }
    if (!cfg.adapter.isUnauthorized(err)) throw err;
    if (refreshed || !conn.refreshTokenEncrypted) {
      throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${cfg.adapter.label} account.`);
    }
    refreshed = true;
    accessToken = await refreshAndPersist(cfg.db, key, cfg.adapter, creds, conn);
    try {
      // Note the `await`: without it the retry's rejection escapes this try/catch
      // and the second 401 would leak as a raw provider error instead of REAUTH.
      return await cfg.read(accessToken);
    } catch (retryErr) {
      if (!cfg.adapter.isUnauthorized(retryErr)) throw retryErr;
      throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${cfg.adapter.label} account.`);
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
): Promise<string> {
  if (!conn.refreshTokenEncrypted) {
    throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${adapter.label} account.`);
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
    throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${adapter.label} account.`);
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
