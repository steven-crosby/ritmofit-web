/**
 * Consume a user's provider OAuth token (M2 slice 3) — the first read that spends
 * the per-user `music_connections` token rather than the app-level client token:
 * "search my SoundCloud likes".
 *
 * This module owns everything the pure `@ritmofit/music` adapter deliberately
 * doesn't: loading the caller's connection, decrypting the access token, proactive
 * + reactive **token refresh**, and persisting the rotated tokens back (encrypted).
 * The adapter just maps SoundCloud JSON → contract DTOs and raises
 * `SoundCloudUnauthorizedError` on a 401 so we can refresh once and retry.
 *
 * Tokens are never logged or returned to clients (conventions.md). With
 * `MOCK_PROVIDERS=true` this serves the mock catalog so the flow runs with zero
 * credentials, like the rest of M2.
 */
import { and, eq } from 'drizzle-orm';
import {
  fetchSoundCloudLikes,
  refreshSoundCloudToken,
  SoundCloudUnauthorizedError,
} from '@ritmofit/music';
import { providerCapabilities, type Provider, type TrackSearchResult } from '@ritmofit/shared';
import type { Db } from '../db.js';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { boundFetch } from '../fetch.js';
import { encryptSecret, decryptSecret } from '../crypto.js';
import { requireEncryptionKey, soundcloudCreds } from './provider-config.js';
import { searchMockCatalog } from '../mock-catalog.js';
import { musicConnections } from '../../db/schema.js';

// Refresh a little early so a token that expires mid-request doesn't 401.
const EXPIRY_SKEW_MS = 60_000;

/** Return the caller's liked tracks at `provider`, mapped to the shared contract. */
export async function fetchUserLikes(
  db: Db,
  env: Env,
  userId: string,
  provider: Provider,
): Promise<TrackSearchResult[]> {
  // Dev seam: the provider's catalog stands in for the user's likes.
  if (env.MOCK_PROVIDERS === 'true') {
    return searchMockCatalog('', provider);
  }
  if (!providerCapabilities[provider].userLikes) {
    throw new HttpError(501, 'NOT_IMPLEMENTED', `Provider '${provider}' is not yet integrated.`);
  }

  const key = requireEncryptionKey(env);
  const creds = soundcloudCreds(env);
  const conn = await db
    .select()
    .from(musicConnections)
    .where(and(eq(musicConnections.userId, userId), eq(musicConnections.provider, provider)))
    .get();
  if (!conn) {
    throw new HttpError(409, 'NOT_CONNECTED', 'Connect your SoundCloud account first.');
  }

  // Proactively refresh an access token that's expired (or about to).
  const expired = conn.expiresAt !== null && Date.now() > conn.expiresAt - EXPIRY_SKEW_MS;
  let refreshed = expired;
  let accessToken = expired
    ? await refreshAndPersist(db, key, creds, conn)
    : await decryptSecret(conn.accessTokenEncrypted, key);

  try {
    return await fetchSoundCloudLikes({ accessToken, fetchImpl: boundFetch });
  } catch (err) {
    if (!(err instanceof SoundCloudUnauthorizedError)) throw err;
    // The provider rejected the token. If we already refreshed once this request,
    // the grant is dead (and `conn` now holds a SPENT refresh token — re-refreshing
    // would replay it) → ask the user to reconnect. Otherwise refresh once and retry.
    if (refreshed || !conn.refreshTokenEncrypted) {
      throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your SoundCloud account.');
    }
    refreshed = true;
    accessToken = await refreshAndPersist(db, key, creds, conn);
    return await fetchSoundCloudLikes({ accessToken, fetchImpl: boundFetch });
  }
}

/**
 * Exchange the stored refresh token for a fresh access token, persist the rotated
 * pair (encrypted) with the new expiry, and return the new access token.
 */
async function refreshAndPersist(
  db: Db,
  key: string,
  creds: { clientId: string; clientSecret: string },
  conn: typeof musicConnections.$inferSelect,
): Promise<string> {
  if (!conn.refreshTokenEncrypted) {
    throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your SoundCloud account.');
  }

  let tokens;
  try {
    const refreshToken = await decryptSecret(conn.refreshTokenEncrypted, key);
    tokens = await refreshSoundCloudToken({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken,
      fetchImpl: boundFetch,
    });
  } catch {
    // A failed refresh means the grant is dead — surface a reconnect, not detail.
    throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your SoundCloud account.');
  }

  await db
    .update(musicConnections)
    .set({
      accessTokenEncrypted: await encryptSecret(tokens.accessToken, key),
      // SoundCloud may rotate the refresh token; keep the old one if it didn't.
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
