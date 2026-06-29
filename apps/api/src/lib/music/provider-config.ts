/**
 * Provider env/credential guards, shared by the OAuth-connection routes and the
 * user-token consumers (e.g. likes). Each maps a missing/incomplete config to a
 * typed HTTP error the route renders — keeping the secret-presence checks in one
 * place so callers can't drift.
 */
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { signAppleJwt } from '../apple-jwt.js';

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

export function hasAppleMusicConfig(env: Env): boolean {
  return Boolean(
    env.APPLE_MUSIC_DEVELOPER_TOKEN ||
    (env.APPLE_MUSIC_TEAM_ID && env.APPLE_MUSIC_KEY_ID && env.APPLE_MUSIC_PRIVATE_KEY),
  );
}

/** Apple Music developer-token config, or 503 when unconfigured. */
export async function appleMusicCreds(
  env: Env,
): Promise<{ developerToken: string; storefront?: string }> {
  if (!hasAppleMusicConfig(env)) {
    throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'Apple Music is not configured.');
  }
  const developerToken =
    env.APPLE_MUSIC_DEVELOPER_TOKEN ??
    (await signAppleJwt({
      teamId: env.APPLE_MUSIC_TEAM_ID!,
      keyId: env.APPLE_MUSIC_KEY_ID!,
      privateKey: env.APPLE_MUSIC_PRIVATE_KEY!,
      audience: 'appstoreconnect-v1',
    }));
  return {
    developerToken,
    storefront: env.APPLE_MUSIC_STOREFRONT,
  };
}
