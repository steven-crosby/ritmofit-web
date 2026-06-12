/**
 * Provider env/credential guards, shared by the OAuth-connection routes and the
 * user-token consumers (e.g. likes). Each maps a missing/incomplete config to a
 * typed HTTP error the route renders — keeping the secret-presence checks in one
 * place so callers can't drift.
 */
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';

/** The AES-GCM key for token-at-rest crypto, or 503 when unconfigured. */
export function requireEncryptionKey(env: Env): string {
  if (!env.ENCRYPTION_KEY) {
    throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'Provider connections are not configured.');
  }
  return env.ENCRYPTION_KEY;
}

/** SoundCloud app credentials (confidential client), or 503 when unconfigured. */
export function soundcloudCreds(env: Env): { clientId: string; clientSecret: string } {
  if (!env.SOUNDCLOUD_CLIENT_ID || !env.SOUNDCLOUD_CLIENT_SECRET) {
    throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'SoundCloud is not configured.');
  }
  return { clientId: env.SOUNDCLOUD_CLIENT_ID, clientSecret: env.SOUNDCLOUD_CLIENT_SECRET };
}

/** Spotify app credentials (confidential client), or 503 when unconfigured. */
export function spotifyCreds(env: Env): { clientId: string; clientSecret: string } {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'Spotify is not configured.');
  }
  return { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET };
}

/** Apple Music developer-token config, or 503 when unconfigured. */
export function appleMusicCreds(env: Env): { developerToken: string; storefront?: string } {
  if (!env.APPLE_MUSIC_DEVELOPER_TOKEN) {
    throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'Apple Music is not configured.');
  }
  return { developerToken: env.APPLE_MUSIC_DEVELOPER_TOKEN, storefront: env.APPLE_MUSIC_STOREFRONT };
}
