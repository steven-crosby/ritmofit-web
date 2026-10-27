/**
 * Opening a class or starting Live writes the existing last_opened_at column.
 * The edit clock (updated_at) stays put, and a hidden class stays a 404.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Class } from '@ritmofit/shared';
import { authed, signUpUser, type TestUser } from './helpers.js';

describe('class last opened', () => {
  let owner: TestUser;
  let stranger: TestUser;

  beforeAll(async () => {
    owner = await signUpUser();
    stranger = await signUpUser();
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
});
