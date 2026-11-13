/**
 * Classify a failed provider token refresh (RF-216, audit finding C-2).
 *
 * Before RF-216 every refresh site caught every failure as `409 REAUTH_REQUIRED`,
 * so a Spotify outage, a rate limit or a network blip sent the instructor through
 * OAuth, in the middle of Live. Only a dead grant should do that:
 *
 *  - Dead grant → 409 REAUTH_REQUIRED: the token endpoint refused the grant with a
 *    4xx other than 429 (for example 400 `invalid_grant` or 401 `invalid_client`).
 *  - Rate limited → 429 (`ProviderQuotaExceededError`): Spotify's endpoint answered
 *    429. Another provider's 429 is treated as the outage below.
 *  - Outage → 502 (`ProviderError`): the endpoint answered 5xx, the request threw
 *    (network failure, abort, timeout), or a 2xx body did not parse.
 *
 * Callers keep their own guards for a missing or undecryptable refresh token, which
 * are dead grants: run only the refresh request itself through this.
 */
import { and, eq } from 'drizzle-orm';
import { ProviderError, ProviderQuotaExceededError, ProviderTokenError } from '@ritmofit/music';
import type { Db } from '../db.js';
import { HttpError } from '../errors.js';
import { musicConnections } from '../../db/schema.js';

/** True when the token endpoint refused the grant itself (a 4xx other than 429). */
export function isRefusedGrant(err: unknown): boolean {
  return (
    err instanceof ProviderTokenError && err.status >= 400 && err.status < 500 && err.status !== 429
  );
}

/**
 * Forget a refresh token the provider refused, so the connection view reports
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
  if (err instanceof ProviderTokenError) {
    // The 429 envelope's message names Spotify; other providers' 429 is an outage.
    if (err.status === 429) {
      return provider === 'spotify' ? new ProviderQuotaExceededError(provider) : err;
    }
    if (err.status >= 500 || !isRefusedGrant(err)) return err;
    return new HttpError(409, 'REAUTH_REQUIRED', reauthMessage);
  }
  // A malformed 2xx token body is an upstream fault, not a dead grant.
  if (err instanceof ProviderError) return err;
  return new ProviderError(provider, `${provider} token refresh request failed.`, { cause: err });
}
