import { describe, it, expect } from 'vitest';
import { ProviderError, ProviderQuotaExceededError, ProviderTokenError } from '@ritmofit/music';
import { HttpError } from '../errors.js';
import { isDeadGrant, refreshFailure } from './refresh-failure.js';

const REAUTH = 'Reconnect your Spotify account.';

describe('refreshFailure (RF-216, audit C-2)', () => {
  it.each([
    [400, 'invalid_grant'],
    [401, 'invalid_grant'],
  ])('a dead grant (%s %s) asks to reconnect', (status, code) => {
    const err = refreshFailure(
      'spotify',
      new ProviderTokenError('spotify', 'Spotify', status, code),
      REAUTH,
    );
    expect(err).toEqual(new HttpError(409, 'REAUTH_REQUIRED', REAUTH));
    expect(err).toMatchObject({ status: 409, code: 'REAUTH_REQUIRED' });
  });

  // RF-218: reconnecting cannot fix Ritmo's own client or request, so these are 502s.
  describe.each(['spotify', 'soundcloud'])('%s: a 4xx that is not invalid_grant', (provider) => {
    it.each([
      [401, 'invalid_client'],
      [400, 'invalid_client'],
      [400, 'unsupported_grant_type'],
      [400, 'some_code_nobody_knows'],
      [403, null],
      [404, null],
    ])('%s %s is a retryable provider error, not REAUTH_REQUIRED', (status, code) => {
      const cause = new ProviderTokenError(provider, 'Label', status, code);
      const err = refreshFailure(provider, cause, REAUTH);
      expect(err).toBe(cause);
      expect(err).toBeInstanceOf(ProviderError);
      expect(err).not.toBeInstanceOf(HttpError);
      expect(err).not.toBeInstanceOf(ProviderQuotaExceededError);
      expect(isDeadGrant(cause)).toBe(false);
    });
  });

  it('the logged message is the provider label, status and OAuth code only', () => {
    const err = refreshFailure(
      'spotify',
      new ProviderTokenError('spotify', 'Spotify', 401, 'invalid_client'),
      REAUTH,
    );
    expect(err.message).toBe('Spotify token endpoint returned 401 (invalid_client)');
  });

  it.each([500, 502, 503])('a token-endpoint %s is a retryable provider error', (status) => {
    const cause = new ProviderTokenError('spotify', 'Spotify', status, null);
    expect(refreshFailure('spotify', cause, REAUTH)).toBe(cause);
  });

  it('a Spotify 429 is the retryable quota error', () => {
    const err = refreshFailure(
      'spotify',
      new ProviderTokenError('spotify', 'Spotify', 429, null),
      REAUTH,
    );
    expect(err).toBeInstanceOf(ProviderQuotaExceededError);
  });

  it('a SoundCloud 429 stays a provider error (the 429 envelope names Spotify)', () => {
    const cause = new ProviderTokenError('soundcloud', 'SoundCloud', 429, null);
    const err = refreshFailure('soundcloud', cause, REAUTH);
    expect(err).toBe(cause);
    expect(err).not.toBeInstanceOf(ProviderQuotaExceededError);
  });

  it('a thrown request (network, abort) is a retryable provider error', () => {
    const err = refreshFailure('spotify', new TypeError('fetch failed'), REAUTH);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toMatchObject({ provider: 'spotify' });
    expect(err.message).not.toContain('fetch failed');
  });

  it('a malformed 2xx token body stays a provider error', () => {
    const cause = new ProviderError('spotify', 'unexpected shape');
    expect(refreshFailure('spotify', cause, REAUTH)).toBe(cause);
  });

  it("only invalid_grant marks the stored grant dead; invalid_client is Ritmo's own fault", () => {
    expect(isDeadGrant(new ProviderTokenError('spotify', 'Spotify', 400, 'invalid_grant'))).toBe(
      true,
    );
    expect(isDeadGrant(new ProviderTokenError('spotify', 'Spotify', 400, 'invalid_client'))).toBe(
      false,
    );
    expect(isDeadGrant(new ProviderTokenError('spotify', 'Spotify', 401, null))).toBe(false);
    expect(isDeadGrant(new ProviderTokenError('spotify', 'Spotify', 503, null))).toBe(false);
    expect(isDeadGrant(new TypeError('fetch failed'))).toBe(false);
  });
});
