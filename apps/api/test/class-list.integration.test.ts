import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  CLASS_LIST_NEXT_CURSOR_HEADER,
  type ClassWithAccess,
  type ClassListItem,
} from '@ritmofit/shared';
import { authed, call, signUpUser, type TestUser } from './helpers.js';

const ids = {
  own: '00000000-0000-4000-8000-000000000500',
  direct: '00000000-0000-4000-8000-000000000400',
  duplicate: '00000000-0000-4000-8000-000000000300',
  team: '00000000-0000-4000-8000-000000000200',
  hidden: '00000000-0000-4000-8000-000000000100',
  teamId: '00000000-0000-4000-8000-000000000010',
};

describe('class library pagination (integration)', () => {
  let owner: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    owner = await signUpUser();
    viewer = await signUpUser();

    const classInsert = env.DB.prepare(`
      insert into classes (
        id, owner_user_id, title, description, template, status, visibility,
        target_duration_ms, created_at, updated_at, last_opened_at
      ) values (?, ?, ?, null, 'cycle', 'draft', 'private', null, ?, ?, null)
    `);
    await env.DB.batch([
      classInsert.bind(ids.own, viewer.userId, 'Viewer owned', 500, 500),
      classInsert.bind(ids.direct, owner.userId, 'Direct view', 400, 400),
      classInsert.bind(ids.duplicate, owner.userId, 'Highest access wins', 300, 300),
      classInsert.bind(ids.team, owner.userId, 'Team view', 300, 300),
      classInsert.bind(ids.hidden, owner.userId, 'Hidden', 600, 600),
      env.DB.prepare(
        `insert into teams (id, name, owner_user_id, created_at, updated_at)
         values (?, 'Pagination team', ?, 1, 1)`,
      ).bind(ids.teamId, owner.userId),
      env.DB.prepare(
        `insert into team_memberships (id, user_id, team_id, role, joined_at)
         values (?, ?, ?, 'member', 1)`,
      ).bind('00000000-0000-4000-8000-000000000011', viewer.userId, ids.teamId),
      env.DB.prepare(
        `insert into shares (
          id, resource_type, resource_id, shared_by_user_id, target_user_id,
          target_team_id, permission, created_at, updated_at
        ) values (?, 'class', ?, ?, ?, null, ?, 1, 1)`,
      ).bind(
        '00000000-0000-4000-8000-000000000021',
        ids.direct,
        owner.userId,
        viewer.userId,
        'view',
      ),
      env.DB.prepare(
        `insert into shares (
          id, resource_type, resource_id, shared_by_user_id, target_user_id,
          target_team_id, permission, created_at, updated_at
        ) values (?, 'class', ?, ?, ?, null, 'view', 1, 1)`,
      ).bind('00000000-0000-4000-8000-000000000022', ids.duplicate, owner.userId, viewer.userId),
      env.DB.prepare(
        `insert into shares (
          id, resource_type, resource_id, shared_by_user_id, target_user_id,
          target_team_id, permission, created_at, updated_at
        ) values (?, 'class', ?, ?, null, ?, ?, 1, 1)`,
      ).bind(
        '00000000-0000-4000-8000-000000000023',
        ids.duplicate,
        owner.userId,
        ids.teamId,
        'edit',
      ),
      env.DB.prepare(
        `insert into shares (
          id, resource_type, resource_id, shared_by_user_id, target_user_id,
          target_team_id, permission, created_at, updated_at
        ) values (?, 'class', ?, ?, null, ?, 'view', 1, 1)`,
      ).bind('00000000-0000-4000-8000-000000000024', ids.team, owner.userId, ids.teamId),
    ]);
  });

  it('preserves the legacy full-array response for unparameterized clients', async () => {
    const res = await authed(viewer.cookie)('/api/v1/classes');
    expect(res.status).toBe(200);
    expect(res.headers.get(CLASS_LIST_NEXT_CURSOR_HEADER)).toBeNull();
    const rows = (await res.json()) as ClassWithAccess[];
    expect(rows.map((row) => row.id)).toEqual([ids.own, ids.direct, ids.duplicate, ids.team]);
    expect(rows.find((row) => row.id === ids.duplicate)?.accessLevel).toBe('edit');
  });

  it('pages by updatedAt then id without duplicates or hidden classes', async () => {
    const first = await authed(viewer.cookie)('/api/v1/classes?limit=2');
    expect(first.status).toBe(200);
    const firstRows = (await first.json()) as ClassWithAccess[];
    expect(firstRows.map((row) => row.id)).toEqual([ids.own, ids.direct]);
    const cursor = first.headers.get(CLASS_LIST_NEXT_CURSOR_HEADER);
    expect(cursor).toBeTruthy();

    const second = await authed(viewer.cookie)(
      `/api/v1/classes?limit=2&cursor=${encodeURIComponent(cursor!)}`,
    );
    expect(second.status).toBe(200);
    const secondRows = (await second.json()) as ClassWithAccess[];
    expect(secondRows.map((row) => row.id)).toEqual([ids.duplicate, ids.team]);
    expect(second.headers.get(CLASS_LIST_NEXT_CURSOR_HEADER)).toBeNull();
  });

  it('rejects a malformed cursor with the standard validation envelope', async () => {
    const res = await authed(viewer.cookie)('/api/v1/classes?cursor=not-a-cursor');
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns Library-card aggregates (track count, total runtime, art collage)', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Card summary' }),
    });
    const classId = ((await classRes.json()) as { id: string }).id;

    // Two tracks: one with art (180s), one without (120s) → total 300s, count 2,
    // one collage URL.
    await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: {
          title: 'With art',
          artist: 'A',
          durationMs: 180_000,
          albumArtUrl: 'https://art.example/cover.jpg',
        },
      }),
    });
    await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track: { title: 'No art', artist: 'B', durationMs: 120_000 } }),
    });

    const res = await api('/api/v1/classes');
    expect(res.status).toBe(200);
    const rows = (await res.json()) as ClassListItem[];
    const card = rows.find((r) => r.id === classId);
    expect(card).toBeDefined();
    expect(card!.trackCount).toBe(2);
    expect(card!.totalDurationMs).toBe(300_000);
    expect(card!.albumArtUrls).toEqual(['https://art.example/cover.jpg']);
  });

  it('returns zeroed aggregates for a class with no tracks', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Empty draft' }),
    });
    const classId = ((await classRes.json()) as { id: string }).id;

    const res = await api('/api/v1/classes');
    const card = ((await res.json()) as ClassListItem[]).find((r) => r.id === classId);
    expect(card).toMatchObject({ trackCount: 0, totalDurationMs: 0, albumArtUrls: [] });
  });

  it('rejects an oversized page and exposes the cursor header to local web CORS', async () => {
    const invalid = await authed(viewer.cookie)('/api/v1/classes?limit=51');
    expect(invalid.status).toBe(422);

    const preflight = await call('/api/v1/classes?limit=2', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Expose-Headers')).toContain(
      CLASS_LIST_NEXT_CURSOR_HEADER,
    );
  });
});
