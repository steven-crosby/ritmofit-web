/**
 * Classify a failed provider token refresh (RF-216, audit finding C-2).
 *
 * Before RF-216 every refresh site caught every failure as `409 REAUTH_REQUIRED`,
 * so a Spotify outage, a rate limit or a network blip sent the instructor through
 * OAuth, in the middle of Live. Only a dead grant should do that:
 *
 *  - Dead grant → 409 REAUTH_REQUIRED: the token endpoint answered OAuth
 *    `invalid_grant` (revoked, expired or already rotated). Nothing else is one.
 *  - Rate limited → 429 (`ProviderQuotaExceededError`): Spotify's endpoint answered
 *    429. Another provider's 429 is treated as the server problem below.
 *  - Server problem → 502 (`ProviderError`): the endpoint answered 5xx, the request
 *    threw (network failure, abort, timeout), a 2xx body did not parse, or the
 *    endpoint answered any other 4xx (RF-218). A 4xx such as `invalid_client` after
 *    Ritmo's client secret changes is Ritmo's fault: reconnecting cannot help, so it
 *    must not read as Reconnect. The stored grant is kept.
 *
 * The 502 is logged by `app.onError` from the error's message, which for a
 * `ProviderTokenError` is the provider, the HTTP status and the OAuth error code
 * only: never the response body or a token.
 *
 * Callers keep their own guards for a missing or undecryptable refresh token, which
 * are dead grants: run only the refresh request itself through this.
 */
import { and, eq } from 'drizzle-orm';
import { ProviderError, ProviderQuotaExceededError, ProviderTokenError } from '@ritmofit/music';
import type { Db } from '../db.js';
import { HttpError } from '../errors.js';
import { musicConnections } from '../../db/schema.js';

/**
 * True only when the provider says this user's refresh grant is dead (OAuth
 * `invalid_grant`: revoked, expired or already rotated). Other 4xx, such as
 * `invalid_client` after Ritmo's own client secret changed, are Ritmo's fault and
 * must never cost users their stored grants.
 */
export function isDeadGrant(err: unknown): boolean {
  return err instanceof ProviderTokenError && err.oauthError === 'invalid_grant';
}

/**
 * Forget a refresh token the provider declared dead (`isDeadGrant`), so the connection view reports
 * `refreshable: false` and the SPA shows Reconnect (RF-216). Only clears the exact
 * ciphertext this request used: a concurrent request that already refreshed and
 * stored a rotated token keeps it.
 */
export async function forgetRefusedRefreshToken(
  db: Db,
  conn: { id: string; refreshTokenEncrypted: string | null },
): Promise<void> {
  if (!conn.refreshTokenEncrypted) return;
  await db
    .update(musicConnections)
    .set({ refreshTokenEncrypted: null, updatedAt: Date.now() })
    .where(
      and(
        eq(musicConnections.id, conn.id),
        eq(musicConnections.refreshTokenEncrypted, conn.refreshTokenEncrypted),
      ),
    );
}

export function refreshFailure(provider: string, err: unknown, reauthMessage: string): Error {
  // The same test the refresh sites use to forget the stored token, so a 409 is
  // answered exactly when the grant is forgotten.
  if (isDeadGrant(err)) return new HttpError(409, 'REAUTH_REQUIRED', reauthMessage);
  if (err instanceof ProviderTokenError) {
    // The 429 envelope's message names Spotify; other providers' 429 is an outage.
    if (err.status === 429 && provider === 'spotify') {
      return new ProviderQuotaExceededError(provider);
    }
    // 5xx, a failed request, or a 4xx that is not a dead grant (RF-218): 502.
    return err;
  }
  // A malformed 2xx token body is an upstream fault, not a dead grant.
  if (err instanceof ProviderError) return err;
  return new ProviderError(provider, `${provider} token refresh request failed.`, { cause: err });
}
