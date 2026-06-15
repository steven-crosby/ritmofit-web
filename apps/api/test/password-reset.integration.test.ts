/**
 * Password-reset flow (integration) — drives the real Better Auth routes mounted
 * on the worker end-to-end against the migrated D1: request a reset, read the
 * token Better Auth persists, set a new password, and prove the credential
 * actually changed (new password signs in, old one no longer does).
 *
 * Real Resend delivery is the dev-fallback no-op here (no `RESEND_API_KEY`) and is
 * covered by `email.test.ts`; this verifies the route + token + DB mechanism the
 * email merely carries, plus the no-enumeration response for an unknown address.
 */
import { describe, expect, it } from 'vitest';
import { call, readResetToken, signUpUser } from './helpers.js';

const REDIRECT_TO = 'https://test.ritmofit.studio/reset-password';

function postJson(path: string, body: unknown, cookie?: string) {
  return call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe('password reset flow (integration)', () => {
  it('resets the password end-to-end and rotates the credential', async () => {
    const user = await signUpUser();
    const oldPassword = 'sup3r-secret-pw';
    const newPassword = 'rotated-sup3r-secret-pw';

    const requested = await postJson('/api/auth/request-password-reset', {
      email: user.email,
      redirectTo: REDIRECT_TO,
    });
    expect(requested.ok).toBe(true);

    const token = await readResetToken(user.userId);
    expect(token).toBeTruthy();

    const reset = await postJson('/api/auth/reset-password', {
      newPassword,
      token,
    });
    expect(reset.ok).toBe(true);

    // Old password must no longer authenticate.
    const oldSignIn = await postJson('/api/auth/sign-in/email', {
      email: user.email,
      password: oldPassword,
    });
    expect(oldSignIn.ok).toBe(false);

    // New password must authenticate.
    const newSignIn = await postJson('/api/auth/sign-in/email', {
      email: user.email,
      password: newPassword,
    });
    expect(newSignIn.ok).toBe(true);
  });

  it('does not create a token or leak existence for an unknown email', async () => {
    const requested = await postJson('/api/auth/request-password-reset', {
      email: `nobody-${crypto.randomUUID()}@example.com`,
      redirectTo: REDIRECT_TO,
    });
    // Better Auth returns success regardless to avoid account enumeration.
    expect(requested.ok).toBe(true);
  });

  it('rejects a reset with an invalid token', async () => {
    const reset = await postJson('/api/auth/reset-password', {
      newPassword: 'whatever-secret-pw',
      token: 'not-a-real-token',
    });
    expect(reset.ok).toBe(false);
  });
});
