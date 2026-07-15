import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { authed, call, signUpUser } from './helpers.js';

describe('caller profile (integration)', () => {
  it('advertises the invite-only beta boundary', async () => {
    const res = await call('/api/v1/auth/capabilities');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ access: { mode: 'invite_only' } });
  });

  it('blocks an uninvited production-style signup and permits the allowlisted address', async () => {
    const mutableEnv = env as typeof env & {
      MOCK_PROVIDERS?: string;
      BETA_ALLOWED_EMAILS?: string;
    };
    const previousMock = mutableEnv.MOCK_PROVIDERS;
    const previousAllowlist = mutableEnv.BETA_ALLOWED_EMAILS;
    const invitedEmail = `invited-${crypto.randomUUID()}@example.com`;
    mutableEnv.MOCK_PROVIDERS = 'false';
    mutableEnv.BETA_ALLOWED_EMAILS = invitedEmail;

    try {
      const rejected = await call('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `uninvited-${crypto.randomUUID()}@example.com`,
          password: 'sup3r-secret-pw',
          name: 'Not Invited',
        }),
      });
      expect(rejected.status).toBe(403);
      expect(await rejected.json()).toMatchObject({ code: 'BETA_INVITE_REQUIRED' });

      const accepted = await call('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: invitedEmail,
          password: 'sup3r-secret-pw',
          name: 'Invited Instructor',
        }),
      });
      expect(accepted.status).toBe(200);
    } finally {
      mutableEnv.MOCK_PROVIDERS = previousMock;
      mutableEnv.BETA_ALLOWED_EMAILS = previousAllowlist;
    }
  });

  it('rejects anonymous reads and updates', async () => {
    expect((await call('/api/v1/auth/me')).status).toBe(401);
    const update = await call('/api/v1/auth/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Nope' }),
    });
    expect(update.status).toBe(401);
  });

  it('returns and updates the signed-in caller profile', async () => {
    const owner = await signUpUser();
    const me = authed(owner.cookie);

    const read = await me('/api/v1/auth/me');
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({
      id: owner.userId,
      email: owner.email,
      displayName: 'Test User',
      imageUrl: null,
    });

    const updated = await me('/api/v1/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: 'Studio Coach',
        imageUrl: 'https://example.com/avatar.jpg',
      }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      id: owner.userId,
      email: owner.email,
      displayName: 'Studio Coach',
      imageUrl: 'https://example.com/avatar.jpg',
    });

    const reread = await me('/api/v1/auth/me');
    expect(await reread.json()).toMatchObject({
      displayName: 'Studio Coach',
      imageUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('validates profile image URLs', async () => {
    const owner = await signUpUser();
    const res = await authed(owner.cookie)('/api/v1/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl: 'not a url' }),
    });

    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });
});
