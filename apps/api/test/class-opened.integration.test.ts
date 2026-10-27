/**
 * Opening a class or starting Live writes the existing last_opened_at column.
 * The edit clock (updated_at) stays put, and a hidden class stays a 404.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Class } from '@ritmofit/shared';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

describe('class last opened', () => {
  let owner: TestUser;
  let stranger: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    owner = await signUpUser();
    stranger = await signUpUser();
    viewer = await signUpUser();
    await verifyUserEmail(viewer.userId);
  });

  it('sets lastOpenedAt and leaves updatedAt unchanged', async () => {
    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Opened ride', template: 'cycle' }),
    });
    expect(created.status).toBe(201);
    const cls = (await created.json()) as Class;
    expect(cls.lastOpenedAt).toBeNull();

    const opened = await authed(owner.cookie)(`/api/v1/classes/${cls.id}/opened`, {
      method: 'POST',
    });
    expect(opened.status).toBe(200);
    const stamped = (await opened.json()) as Class;
    expect(typeof stamped.lastOpenedAt).toBe('number');
    expect(stamped.lastOpenedAt).toBeGreaterThan(0);
    expect(stamped.updatedAt).toBe(cls.updatedAt);

    const hidden = await authed(stranger.cookie)(`/api/v1/classes/${cls.id}/opened`, {
      method: 'POST',
    });
    expect(hidden.status).toBe(404);
  });

  it('lets a view share stamp lastOpenedAt without moving the edit clock', async () => {
    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Shared open', template: 'cycle' }),
    });
    expect(created.status).toBe(201);
    const cls = (await created.json()) as Class;

    const share = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: cls.id,
        targetUserId: viewer.userId,
        permission: 'view',
      }),
    });
    expect(share.status).toBe(201);

    const opened = await authed(viewer.cookie)(`/api/v1/classes/${cls.id}/opened`, {
      method: 'POST',
    });
    expect(opened.status).toBe(200);
    const stamped = (await opened.json()) as Class;
    expect(stamped.lastOpenedAt).toEqual(expect.any(Number));
    expect(stamped.updatedAt).toBe(cls.updatedAt);

    const asOwner = (await (
      await authed(owner.cookie)(`/api/v1/classes/${cls.id}`)
    ).json()) as Class;
    expect(asOwner.lastOpenedAt).toBe(stamped.lastOpenedAt);
    expect(asOwner.updatedAt).toBe(cls.updatedAt);
  });
});
