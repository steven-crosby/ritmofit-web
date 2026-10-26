/**
 * A non-UUID class id on a nested `/classes/:id/...` route must be the JSON
 * 404 envelope for GET, POST, and DELETE, with or without a session.
 *
 * Before the guard, an anonymous request was 401 (the class router's `use('*')`
 * session gate matches every method) and an authenticated request to a method
 * with no handler was Hono's text/plain "404 Not Found". That plain miss is
 * what the asset layer serves as the SPA shell (200) or answers 405. These
 * assertions fail on that HTML, on the plain-text miss, and on a 401.
 *
 * A real UUID the caller cannot see stays on the documented path: 401 without
 * a session, 404 NOT_FOUND once authenticated (existence hidden).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, call, signUpUser, type TestUser } from './helpers.js';

const MALFORMED = 'not-a-uuid';
const MISSING_UUID = '00000000-0000-4000-8000-00000000a11e';

const NESTED = [
  '/tracks',
  '/tracks/import',
  '/tracks/reorder',
  '/plan-blocks',
  '/plan-blocks/reorder',
  '/sections',
  '/run-payload',
  '/copy',
  '/cover',
  '/tags',
  '/import-playlist',
  '/shares',
] as const;

async function expectNotFoundJson(res: Response): Promise<void> {
  const text = await res.text();
  expect(text.toLowerCase()).not.toMatch(/<!doctype html|<html/);
  expect(res.status).toBe(404);
  expect(res.headers.get('content-type') ?? '').toContain('application/json');
  expect(JSON.parse(text)).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
}

describe('malformed class id on nested routes (integration)', () => {
  let owner: TestUser;
  let classId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Malformed id guard', template: 'cycle' }),
    });
    expect(created.status).toBe(201);
    classId = ((await created.json()) as { id: string }).id;
  });

  it.each(['GET', 'POST', 'DELETE'] as const)(
    '%s nested routes with a non-UUID class id are JSON 404, not the SPA',
    async (method) => {
      for (const suffix of NESTED) {
        const path = `/api/v1/classes/${MALFORMED}${suffix}`;
        const init = { method, body: method === 'GET' ? undefined : '{}' };
        await expectNotFoundJson(await call(path, init));
        await expectNotFoundJson(await authed(owner.cookie)(path, init));
      }
    },
  );

  it('keeps a missing UUID on the documented authz path', async () => {
    const hidden = `/api/v1/classes/${MISSING_UUID}/tracks`;
    const anon = await call(hidden);
    expect(anon.status).toBe(401);
    expect(await anon.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });

    const authedMiss = await authed(owner.cookie)(hidden);
    await expectNotFoundJson(authedMiss);
  });

  it('still lists tracks for a real class id', async () => {
    const res = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') ?? '').toContain('application/json');
    expect(await res.json()).toEqual([]);
  });
});
