import { describe, expect, it } from 'vitest';
import { betaAccessMode, betaAllowedEmails, canCreateBetaAccount } from './auth.js';

describe('private-beta account allowlist', () => {
  it('normalizes comma-separated emails', () => {
    expect([...betaAllowedEmails(' Wife@Example.com, friend@example.com ,,')]).toEqual([
      'wife@example.com',
      'friend@example.com',
    ]);
  });

  it('fails closed on HTTPS when the allowlist is absent', () => {
    expect(
      canCreateBetaAccount({ BETTER_AUTH_URL: 'https://ritmofit.studio' }, 'wife@example.com'),
    ).toBe(false);
  });

  it('allows only invited emails on HTTPS, case-insensitively', () => {
    const env = {
      BETTER_AUTH_URL: 'https://ritmofit.studio',
      BETA_ALLOWED_EMAILS: 'wife@example.com,friend@example.com',
    };
    expect(canCreateBetaAccount(env, 'WIFE@example.com')).toBe(true);
    expect(canCreateBetaAccount(env, 'stranger@example.com')).toBe(false);
  });

  it('keeps local HTTP signup open when no allowlist is configured', () => {
    expect(
      canCreateBetaAccount({ BETTER_AUTH_URL: 'http://localhost:8787' }, 'tester@example.com'),
    ).toBe(true);
  });

  it('does not treat an arbitrary HTTP host as local development', () => {
    expect(
      canCreateBetaAccount({ BETTER_AUTH_URL: 'http://beta.example.com' }, 'tester@example.com'),
    ).toBe(false);
  });

  it('does not let mock-provider mode bypass the allowlist on a non-local origin', () => {
    expect(
      canCreateBetaAccount(
        {
          BETTER_AUTH_URL: 'https://test.ritmofit.studio',
          MOCK_PROVIDERS: 'true',
        },
        'generated@example.com',
      ),
    ).toBe(false);
    expect(
      canCreateBetaAccount(
        {
          BETTER_AUTH_URL: 'https://test.ritmofit.studio',
          BETA_ALLOWED_EMAILS: 'generated@example.com',
          MOCK_PROVIDERS: 'true',
        },
        'generated@example.com',
      ),
    ).toBe(true);
  });
});

describe('reported access mode', () => {
  it('reports invite_only wherever the gate actually requires an invitation', () => {
    expect(betaAccessMode({ BETTER_AUTH_URL: 'https://ritmofit.studio' })).toBe('invite_only');
    expect(
      betaAccessMode({
        BETTER_AUTH_URL: 'https://ritmofit.studio',
        BETA_ALLOWED_EMAILS: 'wife@example.com',
      }),
    ).toBe('invite_only');
    // An arbitrary HTTP host is not local development.
    expect(betaAccessMode({ BETTER_AUTH_URL: 'http://beta.example.com' })).toBe('invite_only');
    // A configured allowlist on localhost still gates.
    expect(
      betaAccessMode({
        BETTER_AUTH_URL: 'http://localhost:8787',
        BETA_ALLOWED_EMAILS: 'wife@example.com',
      }),
    ).toBe('invite_only');
  });

  it('reports open only where signup genuinely is', () => {
    expect(betaAccessMode({ BETTER_AUTH_URL: 'http://localhost:8787' })).toBe('open');
  });

  it('never disagrees with the gate it reports on', () => {
    const environments = [
      { BETTER_AUTH_URL: 'https://ritmofit.studio' },
      { BETTER_AUTH_URL: 'https://ritmofit.studio', BETA_ALLOWED_EMAILS: 'wife@example.com' },
      { BETTER_AUTH_URL: 'http://localhost:8787' },
      { BETTER_AUTH_URL: 'http://localhost:8787', BETA_ALLOWED_EMAILS: 'wife@example.com' },
      { BETTER_AUTH_URL: 'http://beta.example.com' },
    ];
    for (const env of environments) {
      // "open" must mean any email can create an account; "invite_only" must mean
      // an uninvited one cannot. The claim and the enforcement are one condition.
      const uninvited = canCreateBetaAccount(env, 'stranger@example.com');
      expect(betaAccessMode(env) === 'open').toBe(uninvited);
    }
  });
});
