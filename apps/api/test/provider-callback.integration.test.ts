/**
 * Provider OAuth *callback* configuration (integration) — drives the real mounted
 * worker's `GET /providers/:provider/callback` through each validation branch.
 *
 * The callback takes no session: identity + CSRF live in the encrypted
 * `rf_oauth_state` cookie the `connect` route sets. The mock-provider seam
 * short-circuits `connect` (so it never sets that cookie), so to exercise the
 * callback's own validation we mint the cookie directly with the test
 * `ENCRYPTION_KEY` — the same key the route decrypts with. Every failure path must
 * 302 back to the canonical app origin with a specific `error=` reason rather than
 * leak detail or 500. (`state_missing` is covered in launch-blockers.)
 */
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { encryptSecret } from '../src/lib/crypto.js';
import { call } from './helpers.js';

const ORIGIN = 'https://test.ritmofit.studio';
const STATE_COOKIE = 'rf_oauth_state';

/** Mint the encrypted state cookie the callback expects, with overridable fields. */
async function stateCookie(
  overrides: Partial<{
    state: string;
    verifier: string;
    provider: string;
    userId: string;
    exp: number;
  }> = {},
): Promise<string> {
  const payload = {
    state: 'state-token',
    verifier: 'pkce-verifier',
    provider: 'soundcloud',
    userId: crypto.randomUUID(),
    exp: Date.now() + 5 * 60 * 1000,
    ...overrides,
  };
  const blob = await encryptSecret(JSON.stringify(payload), env.ENCRYPTION_KEY!);
  return `${STATE_COOKIE}=${blob}`;
}

/** GET the callback with a cookie + query string; never follows the redirect. */
function callback(provider: string, query: string, cookie: string) {
  return call(`/api/v1/providers/${provider}/callback${query}`, { headers: { cookie } });
}

function locationOf(res: Response): string | null {
  return res.headers.get('location');
}

describe('provider OAuth callback configuration (integration)', () => {
  it('rejects an undecryptable state cookie as state_invalid', async () => {
    const res = await callback(
      'soundcloud',
      '?code=abc&state=state-token',
      `${STATE_COOKIE}=garbage`,
    );
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=state_invalid`);
  });

  it('returns access_denied when the provider reports a consent error', async () => {
    const res = await callback(
      'soundcloud',
      '?error=access_denied&state=state-token',
      await stateCookie(),
    );
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=access_denied`);
  });

  it('returns state_mismatch when the query state does not match the cookie', async () => {
    const res = await callback('soundcloud', '?code=abc&state=wrong-state', await stateCookie());
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=state_mismatch`);
  });

  it('returns state_mismatch when the cookie provider differs from the path provider', async () => {
    // Cookie minted for spotify, callback hit on the soundcloud path.
    const res = await callback(
      'soundcloud',
      '?code=abc&state=state-token',
      await stateCookie({ provider: 'spotify' }),
    );
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=state_mismatch`);
  });

  it('returns state_expired when the cookie has passed its TTL', async () => {
    const res = await callback(
      'soundcloud',
      '?code=abc&state=state-token',
      await stateCookie({ exp: Date.now() - 1000 }),
    );
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=state_expired`);
  });

  it('returns unsupported_provider for a valid state on a catalog-only provider', async () => {
    // Apple Music stays catalog-only (its user-token flow is MusicKit-JS, not OAuth).
    const res = await callback(
      'apple_music',
      '?code=abc&state=state-token',
      await stateCookie({ provider: 'apple_music' }),
    );
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=unsupported_provider`);
  });

  it('returns connect_failed when the SoundCloud token exchange cannot complete', async () => {
    // Valid state passes every check and reaches the SoundCloud token exchange,
    // which has no live network/credentials here — the route swallows the detail
    // and redirects with a generic reason rather than 500.
    const res = await callback('soundcloud', '?code=abc&state=state-token', await stateCookie());
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=connect_failed`);
  });

  it('returns connect_failed when the Spotify token exchange cannot complete', async () => {
    // Spotify is now a connect-capable provider, so a valid state reaches its token
    // exchange — which likewise can't complete here and degrades to a generic reason.
    const res = await callback(
      'spotify',
      '?code=abc&state=state-token',
      await stateCookie({ provider: 'spotify' }),
    );
    expect(res.status).toBe(302);
    expect(locationOf(res)).toBe(`${ORIGIN}/?error=connect_failed`);
  });
});
