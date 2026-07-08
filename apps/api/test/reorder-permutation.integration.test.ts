/**
 * Regression coverage for the sequential-reorder permutation guard
 * (`POST /classes/:id/tracks/reorder`, `isPermutation` in class-tracks.ts). The
 * body's `classTrackIds` must be exactly the class's current class_tracks — full
 * set, no duplicates, no foreign ids.
 *
 * Without the guard, `resequence(db, classId, orderedIds)` maps `orderedIds` to
 * known rows and **filters out anything not found** (sequencing.ts): a subset
 * list silently drops the unlisted tracks from the rewrite, so survivors get
 * fresh contiguous positions `0..k-1` while the omitted tracks keep their stale
 * position — a duplicate/gap corruption of the timeline order. A duplicate id in
 * the list would double-assign a position; a foreign id would just be dropped
 * (a silent no-op instead of a rejection). The happy-path reorder is exercised
 * first as a positive control, so the rejections below aren't a false pass from
 * a dead endpoint.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { authed, signUpUser, type TestUser } from './helpers.js';

describe('sequential reorder permutation guard (integration)', () => {
  let owner: TestUser;
  let classId: string;
  let trackIds: [string, string, string];

  beforeAll(async () => {
    owner = await signUpUser();
    const api = authed(owner.cookie);
    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Reorder permutation test' }),
    });
    expect(classRes.status).toBe(201);
    classId = ((await classRes.json()) as { id: string }).id;

    const ids: string[] = [];
    for (const [title, durationMs] of [
      ['Track A', 60_000],
      ['Track B', 90_000],
      ['Track C', 120_000],
    ] as const) {
      const res = await api(`/api/v1/classes/${classId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ track: { title, artist: 'Artist', durationMs }, intensity: 'mod' }),
      });
      expect(res.status).toBe(201);
      ids.push(((await res.json()) as { id: string }).id);
    }
    trackIds = ids as [string, string, string];
  });

  it('applies a valid permutation (positive control)', async () => {
    const api = authed(owner.cookie);
    const [a, b, c] = trackIds;

    const res = await api(`/api/v1/classes/${classId}/tracks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ classTrackIds: [c, a, b] }),
    });
    expect(res.status).toBe(200);

    const tracks = (await (await api(`/api/v1/classes/${classId}/tracks`)).json()) as Array<{
      id: string;
      position: number;
      startOffsetMs: number;
    }>;
    expect(tracks.map((t) => t.id)).toEqual([c, a, b]);
    expect(tracks.map((t) => t.position)).toEqual([0, 1, 2]);
    // Cumulative offsets follow the new order: C (120000) then A (60000) then B.
    expect(tracks.map((t) => t.startOffsetMs)).toEqual([0, 120_000, 180_000]);
  });

  it('rejects a subset (missing id) and leaves the order untouched', async () => {
    const api = authed(owner.cookie);
    const [a, , c] = trackIds;

    const before = (await (await api(`/api/v1/classes/${classId}/tracks`)).json()) as Array<{
      id: string;
      position: number;
      startOffsetMs: number;
    }>;

    const res = await api(`/api/v1/classes/${classId}/tracks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ classTrackIds: [c, a] }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');

    const after = (await (await api(`/api/v1/classes/${classId}/tracks`)).json()) as Array<{
      id: string;
      position: number;
      startOffsetMs: number;
    }>;
    expect(after).toEqual(before);
  });

  it('rejects a duplicate id in the list', async () => {
    const api = authed(owner.cookie);
    const [a, b] = trackIds;

    const res = await api(`/api/v1/classes/${classId}/tracks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ classTrackIds: [a, a, b] }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a foreign id not belonging to this class', async () => {
    const api = authed(owner.cookie);
    const [a, b, c] = trackIds;

    const res = await api(`/api/v1/classes/${classId}/tracks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ classTrackIds: [a, b, c, crypto.randomUUID()] }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
