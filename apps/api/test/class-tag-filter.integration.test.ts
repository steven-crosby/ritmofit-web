/**
 * Server-side tag (theme) search on `GET /classes?tag=`. The filter composes with
 * the existing visibility CTE and keyset pagination, and normalizes the query tag
 * to match how tags are stored (trimmed + lowercased). A class the caller can't
 * see never surfaces, even when it carries the searched tag.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { CLASS_LIST_NEXT_CURSOR_HEADER } from '@ritmofit/shared';
import { authed, signUpUser, type TestUser } from './helpers.js';

interface ClassRow {
  id: string;
  title: string;
}

async function createClass(user: TestUser, title: string): Promise<string> {
  const res = await authed(user.cookie)('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function tagClass(user: TestUser, classId: string, tag: string): Promise<void> {
  const res = await authed(user.cookie)(`/api/v1/classes/${classId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tag }),
  });
  expect(res.status).toBe(201);
}

describe('class tag filter (integration)', () => {
  let owner: TestUser;
  let stranger: TestUser;
  let hiitA: string;
  let hiitB: string;

  beforeAll(async () => {
    owner = await signUpUser();
    stranger = await signUpUser();

    hiitA = await createClass(owner, 'HIIT A');
    hiitB = await createClass(owner, 'HIIT B');
    const pride = await createClass(owner, 'Pride Ride');
    await tagClass(owner, hiitA, 'hiit');
    await tagClass(owner, hiitB, 'hiit');
    await tagClass(owner, pride, 'pride');

    // A class the owner can't see, carrying the same tag — must never surface.
    const hidden = await createClass(stranger, 'Stranger HIIT');
    await tagClass(stranger, hidden, 'hiit');
  });

  it('returns only the caller-visible classes carrying the tag', async () => {
    const res = await authed(owner.cookie)('/api/v1/classes?tag=hiit');
    expect(res.status).toBe(200);
    const ids = ((await res.json()) as ClassRow[]).map((c) => c.id).sort();
    expect(ids).toEqual([hiitA, hiitB].sort());
  });

  it('normalizes the query tag (case/whitespace) to match stored tags', async () => {
    const res = await authed(owner.cookie)('/api/v1/classes?tag=%20HIIT%20');
    expect(res.status).toBe(200);
    expect(((await res.json()) as ClassRow[]).length).toBe(2);
  });

  it('returns an empty array for a tag with no matches', async () => {
    const res = await authed(owner.cookie)('/api/v1/classes?tag=nonexistent');
    expect(res.status).toBe(200);
    expect((await res.json()) as ClassRow[]).toHaveLength(0);
  });

  it('paginates within a tag filter (cursor composes with the filter)', async () => {
    const first = await authed(owner.cookie)('/api/v1/classes?tag=hiit&limit=1');
    expect(first.status).toBe(200);
    const firstPage = (await first.json()) as ClassRow[];
    expect(firstPage).toHaveLength(1);
    const cursor = first.headers.get(CLASS_LIST_NEXT_CURSOR_HEADER);
    expect(cursor).toBeTruthy();

    const second = await authed(owner.cookie)(
      `/api/v1/classes?tag=hiit&limit=1&cursor=${encodeURIComponent(cursor!)}`,
    );
    expect(second.status).toBe(200);
    const secondPage = (await second.json()) as ClassRow[];
    expect(secondPage).toHaveLength(1);
    // The two pages are distinct and together cover both HIIT classes.
    expect(secondPage[0]!.id).not.toBe(firstPage[0]!.id);
    expect([firstPage[0]!.id, secondPage[0]!.id].sort()).toEqual([hiitA, hiitB].sort());
  });
});
