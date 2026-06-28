import { describe, expect, it } from 'vitest';
import { authed, call, signUpUser } from './helpers.js';

describe('caller profile (integration)', () => {
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
