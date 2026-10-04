import { beforeAll, describe, expect, it } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index.js';
import type { ClassTrack, ImportClassTracks } from '@ritmofit/shared';
import { commitOrderedClassImport } from '../src/lib/ordered-class-import.js';
import { authed, signUpUser, type TestUser } from './helpers.js';

describe('ordered class import (mounted Worker + migrated D1)', () => {
  let owner: TestUser;
  let stranger: TestUser;
  let a: string;
  let b: string;
  beforeAll(async () => {
    owner = await signUpUser();
    stranger = await signUpUser();
    const api = authed(owner.cookie);
    const createTrack = async (title: string, durationMs: number) => {
      const res = await api('/api/v1/tracks', {
        method: 'POST',
        body: JSON.stringify({ title, artist: 'QA', durationMs }),
      });
      expect(res.status).toBe(201);
      return ((await res.json()) as { id: string }).id;
    };
    a = await createTrack('A', 60000);
    b = await createTrack('B', 90000);
  });
  const api = (path: string, init?: RequestInit) => authed(owner.cookie)(path, init);
  const newClass = async (extra = {}) => {
    const res = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Ordered import', ...extra }),
    });
    expect(res.status).toBe(201);
    return ((await res.json()) as { id: string }).id;
  };
  const list = async (id: string) =>
    (await (await api(`/api/v1/classes/${id}/tracks`)).json()) as ClassTrack[];
  const body = (
    existing: ClassTrack[],
    ids: string[],
    trackIds: string[],
    orderedIds = [...existing.map((r) => r.id), ...ids],
  ): ImportClassTracks => ({
    operationId: crypto.randomUUID(),
    expectedTracks: existing.map(({ id, position, updatedAt }) => ({ id, position, updatedAt })),
    placements: ids.map((id, i) => ({ id, trackId: trackIds[i] })),
    orderedIds,
  });
  const commit = (id: string, request: ImportClassTracks, cookie = owner.cookie) =>
    authed(cookie)(`/api/v1/classes/${id}/tracks/import`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

  it('keeps A, B, A as three occurrences with contiguous positions and offsets', async () => {
    const id = await newClass();
    const ids = Array.from({ length: 3 }, () => crypto.randomUUID());
    const res = await commit(id, body([], ids, [a, b, a]));
    expect(res.status).toBe(201);
    const rows = await list(id);
    expect(rows.map((r) => r.id)).toEqual(ids);
    expect(rows.map((r) => r.trackId)).toEqual([a, b, a]);
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
    expect(rows.map((r) => r.startOffsetMs)).toEqual([0, 60000, 150000]);
  });

  it('recovers a missing middle occurrence without duplicating or erasing authored notes/cues', async () => {
    const id = await newClass();
    const [first, middle, last] = Array.from({ length: 3 }, () => crypto.randomUUID());
    expect((await commit(id, body([], [first, last], [a, a]))).status).toBe(201);
    expect(
      (
        await api(`/api/v1/class-tracks/${last}`, {
          method: 'PATCH',
          body: JSON.stringify({ notes: 'Keep my coaching' }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api(`/api/v1/class-tracks/${last}/cues`, {
          method: 'POST',
          body: JSON.stringify({ anchorMs: 1000, text: 'Keep my cue' }),
        })
      ).status,
    ).toBe(201);
    expect(
      (await commit(id, body(await list(id), [middle], [b], [first, middle, last]))).status,
    ).toBe(201);
    const rows = await list(id);
    expect(rows.map((r) => r.id)).toEqual([first, middle, last]);
    expect(rows[2].notes).toBe('Keep my coaching');
    expect(rows.map((r) => r.startOffsetMs)).toEqual([0, 60000, 150000]);
    const cues = (await (await api(`/api/v1/class-tracks/${last}/cues`)).json()) as {
      text: string;
    }[];
    expect(cues.map((c) => c.text)).toEqual(['Keep my cue']);
  });

  it('replays a response-lost operation, including simultaneous retries and after later edits', async () => {
    const id = await newClass();
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const request = body([], ids, [a, b]);
    const responses = await Promise.all([commit(id, request), commit(id, request)]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect(await responses[0].json()).toEqual(await responses[1].json());
    expect((await list(id)).map((r) => r.id)).toEqual(ids);
    await api(`/api/v1/class-tracks/${ids[0]}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'Edited after commit' }),
    });
    expect((await commit(id, request)).status).toBe(201);
    expect((await list(id))[0].notes).toBe('Edited after commit');
    expect((await list(id)).length).toBe(2);
    expect((await commit(id, { ...request, orderedIds: [...ids].reverse() })).status).toBe(409);
  });

  it('rejects stale snapshots without committing any placements or receipt', async () => {
    const id = await newClass();
    const request = body([], [crypto.randomUUID()], [a]);
    await api(`/api/v1/classes/${id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId: b }),
    });
    expect((await commit(id, request)).status).toBe(409);
    expect((await list(id)).map((r) => r.trackId)).toEqual([b]);
    expect(
      await env.DB.prepare('SELECT id FROM class_track_import_operations WHERE id = ?')
        .bind(request.operationId)
        .first(),
    ).toBeNull();
  });

  it('lets one conflicting concurrent import win and safely accepts the other after refresh', async () => {
    const id = await newClass();
    const first = body([], [crypto.randomUUID()], [a]);
    const second = body([], [crypto.randomUUID()], [b]);
    const results = await Promise.all([commit(id, first), commit(id, second)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const retry = results[0].status === 409 ? first : second;
    const current = await list(id);
    expect(current.length).toBe(1);
    expect(
      (
        await commit(
          id,
          body(
            current,
            retry.placements.map((p) => p.id),
            retry.placements.map((p) => p.trackId),
          ),
        )
      ).status,
    ).toBe(201);
    expect((await list(id)).map((r) => r.position)).toEqual([0, 1]);
  });

  it('guards the write transaction against an append occurring after the handler read', async () => {
    const id = await newClass();
    const request = body([], [crypto.randomUUID()], [a]);
    let injected = false;
    const database = new Proxy(env.DB, {
      get(target, key) {
        if (key === 'batch')
          return async (statements: D1PreparedStatement[]) => {
            if (!injected) {
              injected = true;
              await api(`/api/v1/classes/${id}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ trackId: b }),
              });
            }
            return target.batch(statements);
          };
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    await expect(
      commitOrderedClassImport({ ...env, DB: database }, id, owner.userId, request),
    ).rejects.toMatchObject({ status: 409 });
    expect((await list(id)).map((r) => r.trackId)).toEqual([b]);
    expect(
      await env.DB.prepare('SELECT id FROM class_track_import_operations WHERE id = ?')
        .bind(request.operationId)
        .first(),
    ).toBeNull();
  });

  it('rolls back the receipt and all rows when a placement ID belongs to another class', async () => {
    const other = await newClass();
    const taken = crypto.randomUUID();
    await commit(other, body([], [taken], [a]));
    const id = await newClass();
    const request = body([], [crypto.randomUUID(), taken], [b, a]);
    expect((await commit(id, request)).status).toBe(409);
    expect(await list(id)).toEqual([]);
    expect(
      await env.DB.prepare('SELECT id FROM class_track_import_operations WHERE id = ?')
        .bind(request.operationId)
        .first(),
    ).toBeNull();
  });

  it.each([false, true])(
    'rejects a late single-song add atomically (inline=%s)',
    async (inline) => {
      const id = await newClass({ mode: 'scaffold', recipeId: 'cycle_30_v1' });
      const blocks = (await (await api(`/api/v1/classes/${id}/plan-blocks`)).json()) as {
        id: string;
      }[];
      const planBlockId = blocks[0]!.id;
      await api(`/api/v1/classes/${id}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ trackId: a, planBlockId }),
      });
      const current = await list(id);
      const ids = [crypto.randomUUID(), crypto.randomUUID()];
      const request = { ...body(current, ids, [a, b]), planBlockId };
      let injected = false;
      const database = new Proxy(env.DB, {
        get(target, key) {
          if (key === 'batch')
            return async (statements: D1PreparedStatement[]) => {
              if (!injected) {
                injected = true;
                await commitOrderedClassImport(env, id, owner.userId, request);
              }
              return target.batch(statements);
            };
          const value = Reflect.get(target, key);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      const title = `Uncommitted inline ${crypto.randomUUID()}`;
      const addition = {
        ...(inline ? { track: { title, artist: 'QA', durationMs: 60000 } } : { trackId: a }),
        planBlockId,
      };
      const ctx = createExecutionContext();
      const response = await worker.fetch(
        new Request(`https://test.ritmofit.studio/api/v1/classes/${id}/tracks`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: owner.cookie,
            'cf-connecting-ip': '203.0.113.10',
          },
          body: JSON.stringify(addition),
        }),
        { ...env, DB: database },
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(injected).toBe(true);
      expect(response.status).toBe(409);
      expect((await list(id)).map((row) => [row.position, row.startOffsetMs])).toEqual([
        [0, 0],
        [1, 60000],
        [2, 120000],
      ]);
      expect(
        await env.DB.prepare('SELECT id FROM tracks WHERE owner_user_id = ? AND title = ?')
          .bind(owner.userId, title)
          .first(),
      ).toBeNull();
      expect(
        (
          await api(`/api/v1/classes/${id}/tracks`, {
            method: 'POST',
            body: JSON.stringify(addition),
          })
        ).status,
      ).toBe(201);
      expect((await list(id)).map((row) => row.position)).toEqual([0, 1, 2, 3]);
    },
  );

  it('preserves single-song context and derives offsets from its clip window', async () => {
    const id = await newClass();
    const fields = {
      intensity: 'hard',
      displayBpmOverride: 120,
      durationMsOverride: 50000,
      clipStartMs: 10000,
      clipEndMs: 30000,
      beatAnchorMs: 12000,
      notes: 'Coach this song',
      displayRpm: 80,
      holdCount: 4,
    };
    const response = await api(`/api/v1/classes/${id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId: a, ...fields }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject(fields);
    await api(`/api/v1/classes/${id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId: b }),
    });
    expect((await list(id)).map((row) => row.startOffsetMs)).toEqual([0, 20000]);
    expect(
      await env.DB.prepare('SELECT id FROM class_track_import_operations WHERE class_id = ?')
        .bind(id)
        .first(),
    ).toBeNull();
  });

  it('enforces class/library/block access and complete occurrence permutations', async () => {
    const id = await newClass();
    const request = body([], [crypto.randomUUID()], [a]);
    expect((await commit(id, request, stranger.cookie)).status).toBe(404);
    expect((await commit(id, { ...request, orderedIds: [] })).status).toBe(422);
    expect((await commit(id, { ...request, planBlockId: crypto.randomUUID() })).status).toBe(404);
    const strangersClass = await authed(stranger.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Foreign library' }),
    });
    const strangerId = ((await strangersClass.json()) as { id: string }).id;
    expect((await commit(strangerId, request, stranger.cookie)).status).toBe(404);
    expect(await list(id)).toEqual([]);
  });

  it('preserves selected-block scope and groups imports by plan order', async () => {
    const id = await newClass({ mode: 'scaffold', recipeId: 'cycle_30_v1' });
    const blocks = (await (await api(`/api/v1/classes/${id}/plan-blocks`)).json()) as {
      id: string;
    }[];
    await api(`/api/v1/classes/${id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId: b, planBlockId: blocks[1].id }),
    });
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    expect(
      (await commit(id, { ...body(await list(id), ids, [a, a]), planBlockId: blocks[0].id }))
        .status,
    ).toBe(201);
    const rows = await list(id);
    expect(rows.map((r) => r.id).slice(0, 2)).toEqual(ids);
    expect(rows.map((r) => r.planBlockId)).toEqual([blocks[0].id, blocks[0].id, blocks[1].id]);
  });

  it('appends on a free timeline without changing authored offsets and rejects an overlapping retry', async () => {
    const id = await newClass();
    const [first, last, middle] = Array.from({ length: 3 }, () => crypto.randomUUID());
    await commit(id, body([], [first, last], [a, a]));
    await api(`/api/v1/classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ timelineMode: 'free' }),
    });
    const current = await list(id);
    expect((await commit(id, body(current, [middle], [b], [first, middle, last]))).status).toBe(
      409,
    );
    expect(await list(id)).toEqual(current);
    expect((await commit(id, body(current, [middle], [b]))).status).toBe(201);
    expect((await list(id)).map((r) => r.startOffsetMs)).toEqual([0, 60000, 120000]);
  });
});
