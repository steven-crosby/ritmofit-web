import { describe, expect, it } from 'vitest';
import { betaAllowedEmails, canCreateBetaAccount } from './auth.js';

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

  it('keeps isolated mock-provider environments open for generated test users', () => {
    expect(
      canCreateBetaAccount(
        {
          BETTER_AUTH_URL: 'https://test.ritmofit.studio',
          MOCK_PROVIDERS: 'true',
        },
        'generated@example.com',
      ),
    ).toBe(true);
  });
});
