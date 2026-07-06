/**
 * Mint a short-lived Spotify access token for the browser Web Playback SDK.
 *
 * This is the deliberate, narrowly-scoped exception to "provider tokens are never
 * returned to the client" (conventions.md): the official Web Playback SDK's
 * `getOAuthToken` callback needs a live access token in the page. We return ONLY a
 * short-lived access token (never the refresh token), only to the authenticated
 * owner, and only for a connection that granted the `streaming` playback scope. The
 * token is never logged, and the SPA must not persist it (no localStorage) or use it
 * for catalog/BPM shortcuts.
 *
 * Refresh/persist mirrors `user-likes.ts` (the likes read spends the same tokens),
 * but the two concerns diverge — likes fetches-and-retries-on-401, playback checks
 * the granted scope and hands the token to the browser — so the machinery is kept
 * separate rather than forced into one shape.
 */
import { and, eq } from 'drizzle-orm';
import { refreshSpotifyToken, spotifyScopeHasPlayback } from '@ritmofit/music';
import type { SpotifyPlaybackToken } from '@ritmofit/shared';
import type { Db } from '../db.js';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { boundFetch } from '../fetch.js';
import { encryptSecret, decryptSecret } from '../crypto.js';
import { requireEncryptionKey, spotifyCreds } from './provider-config.js';
import { musicConnections } from '../../db/schema.js';

// Refresh a little early so a token that expires mid-session doesn't reject.
const EXPIRY_SKEW_MS = 60_000;
// Spotify access tokens are 1h; fall back to this if the grant omits `expires_in`.
const DEFAULT_TTL_MS = 3_600_000;

/**
 * Return a fresh, short-lived Spotify access token (+ its remaining TTL) for the
 * caller's connected account, refreshing server-side if the stored one is expired
 * or about to be. Throws a typed `HttpError` the route renders:
 *  - 503 PROVIDER_UNAVAILABLE   — Spotify app creds / encryption key not configured.
 *  - 409 NOT_CONNECTED          — the user has no Spotify connection.
 *  - 409 PLAYBACK_REAUTH_REQUIRED — connected, but the grant predates (or lacks) the
 *    `streaming` scope, so the SPA must prompt a reconnect *for playback* (distinct
 *    from a dead grant, which the search path surfaces as REAUTH_REQUIRED).
 *  - 409 REAUTH_REQUIRED        — the refresh grant is dead; reconnect.
 */
export async function mintSpotifyPlaybackToken(
  db: Db,
  env: Env,
  userId: string,
): Promise<SpotifyPlaybackToken> {
  // Dev seam: hand the SDK a placeholder so the flow runs with zero credentials.
  if (env.MOCK_PROVIDERS === 'true') {
    return { accessToken: 'mock-spotify-playback-token', expiresInMs: DEFAULT_TTL_MS };
  }

  const creds = spotifyCreds(env); // 503 when unconfigured
  const key = requireEncryptionKey(env);
  const conn = await db
    .select()
    .from(musicConnections)
    .where(and(eq(musicConnections.userId, userId), eq(musicConnections.provider, 'spotify')))
    .get();
  if (!conn) {
    throw new HttpError(409, 'NOT_CONNECTED', 'Connect your Spotify account first.');
  }
  // Playback needs the `streaming` scope. Connections made before the scope
  // expansion carry only `user-library-read`, so this is a reconnect *for playback*,
  // not a dead grant — a distinct code so the SPA can prompt the narrower reconnect.
  if (!spotifyScopeHasPlayback(conn.scope)) {
    throw new HttpError(
      409,
      'PLAYBACK_REAUTH_REQUIRED',
      'Reconnect Spotify to enable in-app playback.',
    );
  }

  const expired = conn.expiresAt !== null && Date.now() > conn.expiresAt - EXPIRY_SKEW_MS;
  if (!expired) {
    return {
      accessToken: await decryptSecret(conn.accessTokenEncrypted, key),
      expiresInMs: conn.expiresAt ? Math.max(0, conn.expiresAt - Date.now()) : DEFAULT_TTL_MS,
    };
  }

  // Expired (or about to) — refresh, persist the rotated pair, hand back the fresh
  // token. A failed refresh means the grant is dead → reconnect (never leak detail).
  if (!conn.refreshTokenEncrypted) {
    throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your Spotify account.');
  }
  let tokens;
  try {
    const refreshToken = await decryptSecret(conn.refreshTokenEncrypted, key);
    tokens = await refreshSpotifyToken({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken,
      fetchImpl: boundFetch,
    });
  } catch {
    throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your Spotify account.');
  }

  await db
    .update(musicConnections)
    .set({
      accessTokenEncrypted: await encryptSecret(tokens.accessToken, key),
      // The provider may rotate the refresh token; keep the old one if it didn't.
      refreshTokenEncrypted: tokens.refreshToken
        ? await encryptSecret(tokens.refreshToken, key)
        : conn.refreshTokenEncrypted,
      scope: tokens.scope ?? conn.scope,
      expiresAt: tokens.expiresInSec ? Date.now() + tokens.expiresInSec * 1000 : null,
      updatedAt: Date.now(),
    })
    .where(eq(musicConnections.id, conn.id));

  return {
    accessToken: tokens.accessToken,
    expiresInMs: tokens.expiresInSec ? tokens.expiresInSec * 1000 : DEFAULT_TTL_MS,
  };
}
