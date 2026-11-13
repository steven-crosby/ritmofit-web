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
import { ProviderError, ProviderQuotaExceededError, ProviderTokenError } from '@ritmofit/music';
import { HttpError } from '../errors.js';

export function refreshFailure(provider: string, err: unknown, reauthMessage: string): Error {
  if (err instanceof ProviderTokenError) {
    // The 429 envelope's message names Spotify; other providers' 429 is an outage.
    if (err.status === 429) {
      return provider === 'spotify' ? new ProviderQuotaExceededError(provider) : err;
    }
    if (err.status >= 500) return err;
    return new HttpError(409, 'REAUTH_REQUIRED', reauthMessage);
  }
  // A malformed 2xx token body is an upstream fault, not a dead grant.
  if (err instanceof ProviderError) return err;
  return new ProviderError(provider, `${provider} token refresh request failed.`, { cause: err });
}
