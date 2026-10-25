/**
 * Playlist-import song blocks: one block per occurrence, inside the ordered-import
 * commit. Paste-a-link stays on its current route.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { PLAYLIST_SONG_BLOCK_KEY, type ClassTrack, type ImportClassTracks } from '@ritmofit/shared';
import { commitOrderedClassImport } from '../src/lib/ordered-class-import.js';
import { authed, signUpUser, type TestUser } from './helpers.js';

interface BlockView {
  id: string;
  position: number;
  label: string;
  segmentType: string | null;
  recipeBlockKey: string | null;
  targetDurationMs: number;
  intensity: string;
  teachingGoal: string;
  movementFocus: string;
  guidance: {
    kind: string;
    posture?: string;
    cadenceMinRpm?: number;
    cadenceMaxRpm?: number;
    rpeMin?: number;
    rpeMax?: number;
    optionalEquipment?: string[];
    sequenceFocus?: string;
    equipment?: string;
  };
}

interface TrackView extends ClassTrack {
  notes: string | null;
}

describe('playlist song-block commits (mounted Worker + migrated D1)', () => {
  let owner: TestUser;
  let tracks: { id: string; title: string; durationMs: number }[];

  beforeAll(async () => {
    owner = await signUpUser();
    const api = authed(owner.cookie);
    tracks = [];
    for (let index = 0; index < 16; index += 1) {
      const title = `Song ${index + 1}`;
      const durationMs = (index + 1) * 30_000;
      const res = await api('/api/v1/tracks', {
        method: 'POST',
        body: JSON.stringify({ title, artist: 'QA', durationMs }),
      });
      expect(res.status).toBe(201);
      tracks.push({ id: ((await res.json()) as { id: string }).id, title, durationMs });
    }
  });

  const api = (path: string, init?: RequestInit) => authed(owner.cookie)(path, init);
  const newClass = async (extra: Record<string, unknown> = {}) => {
    const res = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Song blocks', ...extra }),
    });
    expect(res.status).toBe(201);
    return ((await res.json()) as { id: string }).id;
  };
  const listTracks = async (id: string) =>
    (await (await api(`/api/v1/classes/${id}/tracks`)).json()) as TrackView[];
  const listBlocks = async (id: string) =>
    (await (await api(`/api/v1/classes/${id}/plan-blocks`)).json()) as BlockView[];
  const songBody = (
    existing: TrackView[],
    library: { id: string }[],
    extra: Partial<ImportClassTracks> = {},
  ): ImportClassTracks => {
    const ids = library.map(() => crypto.randomUUID());
    return {
      operationId: crypto.randomUUID(),
      expectedTracks: existing.map(({ id, position, updatedAt }) => ({
        id,
        position,
        updatedAt,
      })),
      placements: ids.map((id, index) => ({ id, trackId: library[index]!.id })),
      orderedIds: [...existing.map((row) => row.id), ...ids],
      songBlocks: true,
      ...extra,
    };
  };
  const commit = (id: string, request: ImportClassTracks) =>
    api(`/api/v1/classes/${id}/tracks/import`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  const createTrack = async (title: string, durationMs?: number) => {
    const res = await api('/api/v1/tracks', {
      method: 'POST',
      body: JSON.stringify({
        title,
        artist: 'QA',
        ...(durationMs === undefined ? {} : { durationMs }),
      }),
    });
    expect(res.status).toBe(201);
    return ((await res.json()) as { id: string }).id;
  };

  it('replaces an untouched scaffold with one labeled block per song in one batch', async () => {
    const id = await newClass({ mode: 'scaffold', recipeId: 'cycle_30_v1' });
    const before = await listBlocks(id);
    expect(before.length).toBeGreaterThan(0);
    expect(
      before.every((block) => block.recipeBlockKey && block.recipeBlockKey !== 'playlist_song'),
    ).toBe(true);
    const chosen = tracks.slice(0, 2);
    const request = songBody([], chosen);
    let batches = 0;
    const database = new Proxy(env.DB, {
      get(target, key) {
        if (key === 'batch') {
          return async (statements: D1PreparedStatement[]) => {
            batches += 1;
            return target.batch(statements);
          };
        }
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const rows = await commitOrderedClassImport(
      { ...env, DB: database },
      id,
      owner.userId,
      request,
    );
    expect(batches).toBe(1);
    expect(rows.map((row) => row.planBlockId)).toEqual(expect.any(Array));
    const blocks = await listBlocks(id);
    const placed = await listTracks(id);
    expect(blocks.map((block) => block.recipeBlockKey)).toEqual([
      PLAYLIST_SONG_BLOCK_KEY,
      PLAYLIST_SONG_BLOCK_KEY,
    ]);
    expect(blocks.map((block) => [block.label, block.segmentType, block.position])).toEqual([
      ['Warm-up', 'warm_up', 0],
      ['Cooldown', 'cool_down', 1],
    ]);
    expect(blocks.map((block) => block.teachingGoal)).toEqual(chosen.map((track) => track.title));
    expect(blocks.every((block) => block.intensity === 'none')).toBe(true);
    expect(blocks.map((block) => block.targetDurationMs)).toEqual(
      chosen.map((track) => track.durationMs),
    );
    expect(blocks[0]!.guidance).toEqual({
      kind: 'cycle',
      posture: 'mixed',
      cadenceMinRpm: 1,
      cadenceMaxRpm: 1,
      rpeMin: 1,
      rpeMax: 1,
    });
    expect(placed.map((row) => row.planBlockId)).toEqual(blocks.map((block) => block.id));
    expect(placed.map((row) => row.notes)).toEqual([null, null]);
    expect(before.some((block) => blocks.some((next) => next.id === block.id))).toBe(false);
  });

  it('writes ten occurrences in source order with no cues or notes', async () => {
    const id = await newClass({ mode: 'scaffold', recipeId: 'cycle_45_v1' });
    const longTitle = `${'Long title '.repeat(12)}end`;
    expect(longTitle.length).toBeGreaterThan(100);
    expect(longTitle.length).toBeLessThanOrEqual(300);
    const longId = await createTrack(longTitle, 150_000);
    const chosen = [
      tracks[0]!,
      { id: longId, title: longTitle, durationMs: 150_000 },
      tracks[0]!,
      ...tracks.slice(1, 8),
    ];
    expect(chosen).toHaveLength(10);
    const res = await commit(id, songBody([], chosen));
    expect(res.status).toBe(201);
    const placed = await listTracks(id);
    const blocks = await listBlocks(id);
    expect(placed.map((row) => row.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(blocks.map((block) => block.position)).toEqual(placed.map((row) => row.position));
    expect(placed.map((row) => row.planBlockId)).toEqual(blocks.map((block) => block.id));
    expect(placed.map((row) => row.trackId)).toEqual(chosen.map((track) => track.id));
    expect(blocks[0]).toMatchObject({ label: 'Warm-up', segmentType: 'warm_up' });
    expect(blocks[9]).toMatchObject({ label: 'Cooldown', segmentType: 'cool_down' });
    expect(blocks.slice(1, 9).every((block) => block.segmentType == null)).toBe(true);
    expect(blocks[1]).toMatchObject({
      label: longTitle.slice(0, 100),
      teachingGoal: longTitle,
      movementFocus: longTitle,
    });
    expect(blocks[2]!.label).toBe(tracks[0]!.title);
    expect(placed.every((row) => row.notes == null)).toBe(true);
    const cueCounts = await Promise.all(
      placed.map(async (row) => {
        const cues = (await (await api(`/api/v1/class-tracks/${row.id}/cues`)).json()) as unknown[];
        return cues.length;
      }),
    );
    expect(cueCounts).toEqual(Array(10).fill(0));
    expect(blocks.every((block) => block.recipeBlockKey === PLAYLIST_SONG_BLOCK_KEY)).toBe(true);
  });

  it('treats one blank-title song as warm-up and stores Song 1', async () => {
    const id = await newClass();
    const blankId = await createTrack('   ');
    expect((await commit(id, songBody([], [{ id: blankId }]))).status).toBe(201);
    const [block] = await listBlocks(id);
    expect(block).toMatchObject({
      label: 'Warm-up',
      segmentType: 'warm_up',
      teachingGoal: 'Song 1',
      movementFocus: 'Song 1',
      targetDurationMs: 60_000,
      recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
      guidance: { kind: 'pilates', optionalEquipment: [] },
    });
    expect(block!.segmentType).not.toBe('cool_down');
  });

  it('accepts 15 songs and refuses a 16th placement or a class already at the cap', async () => {
    const acceptedId = await newClass();
    expect((await commit(acceptedId, songBody([], tracks.slice(0, 15)))).status).toBe(201);
    expect(await listBlocks(acceptedId)).toHaveLength(15);
    expect(await listTracks(acceptedId)).toHaveLength(15);
    const overflow = songBody(await listTracks(acceptedId), [tracks[15]!]);
    expect((await commit(acceptedId, overflow)).status).toBe(422);
    expect(await listBlocks(acceptedId)).toHaveLength(15);
    expect(await listTracks(acceptedId)).toHaveLength(15);

    const scaffoldId = await newClass({ mode: 'scaffold', recipeId: 'pilates_30_v1' });
    const beforeBlocks = await listBlocks(scaffoldId);
    const tooMany = songBody([], tracks);
    const rejected = await commit(scaffoldId, tooMany);
    expect(rejected.status).toBe(422);
    expect(((await rejected.json()) as { error: { code: string } }).error.code).toBe(
      'VALIDATION_ERROR',
    );
    expect((await listBlocks(scaffoldId)).map((block) => block.id)).toEqual(
      beforeBlocks.map((block) => block.id),
    );
    expect(await listTracks(scaffoldId)).toEqual([]);
    expect(
      await env.DB.prepare('SELECT id FROM class_track_import_operations WHERE id = ?')
        .bind(tooMany.operationId)
        .first(),
    ).toBeNull();

    const fullId = await newClass();
    const plain = songBody([], tracks);
    expect(
      (
        await commit(fullId, {
          ...plain,
          songBlocks: undefined,
        })
      ).status,
    ).toBe(201);
    expect(await listTracks(fullId)).toHaveLength(16);
    expect(await listBlocks(fullId)).toEqual([]);
    const extra = songBody(await listTracks(fullId), [tracks[0]!]);
    expect((await commit(fullId, extra)).status).toBe(422);
    expect(await listTracks(fullId)).toHaveLength(16);
    expect(await listBlocks(fullId)).toEqual([]);
  });

  it('rejects songBlocks combined with planBlockId before writing', async () => {
    const id = await newClass({ mode: 'scaffold', recipeId: 'cycle_30_v1' });
    const before = await listBlocks(id);
    const request = songBody([], [tracks[0]!], { planBlockId: before[0]!.id });
    const res = await commit(id, request);
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    expect((await listBlocks(id)).map((block) => block.id)).toEqual(
      before.map((block) => block.id),
    );
    expect(await listTracks(id)).toEqual([]);
  });

  it('appends after authored music, drops empty recipe blocks, and keeps the cue', async () => {
    const id = await newClass({ mode: 'scaffold', recipeId: 'cycle_30_v1' });
    const recipe = await listBlocks(id);
    const kept = recipe[0]!;
    const added = await api(`/api/v1/classes/${id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId: tracks[0]!.id, planBlockId: kept.id }),
    });
    expect(added.status).toBe(201);
    const placed = (await added.json()) as TrackView;
    expect(
      (
        await api(`/api/v1/class-tracks/${placed.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ notes: 'Keep this cue sheet' }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api(`/api/v1/class-tracks/${placed.id}/cues`, {
          method: 'POST',
          body: JSON.stringify({ anchorMs: 1000, text: 'Stay with the pedal' }),
        })
      ).status,
    ).toBe(201);
    const instructorRes = await api(`/api/v1/classes/${id}/plan-blocks`, {
      method: 'POST',
      body: JSON.stringify({
        segmentType: null,
        label: 'My empty block',
        targetDurationMs: 120_000,
        intensity: 'mod',
        teachingGoal: 'Instructor wrote this',
        movementFocus: 'Custom focus',
        guidance: {
          kind: 'cycle',
          posture: 'seated',
          cadenceMinRpm: 70,
          cadenceMaxRpm: 90,
          rpeMin: 4,
          rpeMax: 6,
        },
      }),
    });
    expect(instructorRes.status).toBe(201);
    const instructor = (await instructorRes.json()) as BlockView;
    expect(instructor.recipeBlockKey).toBeNull();

    const current = await listTracks(id);
    const res = await commit(id, songBody(current, tracks.slice(1, 3)));
    expect(res.status).toBe(201);
    const blocks = await listBlocks(id);
    const rows = await listTracks(id);
    expect(blocks.map((block) => block.id).slice(0, 2)).toEqual([kept.id, instructor.id]);
    expect(blocks[0]).toMatchObject({
      label: kept.label,
      recipeBlockKey: kept.recipeBlockKey,
      segmentType: kept.segmentType,
    });
    expect(blocks[1]).toMatchObject({
      id: instructor.id,
      label: 'My empty block',
      recipeBlockKey: null,
      teachingGoal: 'Instructor wrote this',
    });
    expect(recipe.slice(1).every((block) => !blocks.some((next) => next.id === block.id))).toBe(
      true,
    );
    const addedBlocks = blocks.slice(2);
    expect(addedBlocks.map((block) => [block.label, block.segmentType])).toEqual([
      [tracks[1]!.title, null],
      [tracks[2]!.title, null],
    ]);
    expect(addedBlocks.every((block) => block.recipeBlockKey === PLAYLIST_SONG_BLOCK_KEY)).toBe(
      true,
    );
    expect(
      addedBlocks.some((block) => block.label === 'Warm-up' || block.label === 'Cooldown'),
    ).toBe(false);
    expect(rows[0]).toMatchObject({
      id: placed.id,
      planBlockId: kept.id,
      notes: 'Keep this cue sheet',
    });
    const cues = (await (await api(`/api/v1/class-tracks/${placed.id}/cues`)).json()) as {
      text: string;
    }[];
    expect(cues.map((cue) => cue.text)).toEqual(['Stay with the pedal']);
    expect(rows.slice(1).map((row) => row.planBlockId)).toEqual(
      addedBlocks.map((block) => block.id),
    );
  });

  it('replays one operation without inserting a second set of blocks', async () => {
    const id = await newClass();
    const request = songBody([], tracks.slice(0, 3));
    const first = await commit(id, request);
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    const second = await commit(id, request);
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(firstBody);
    expect(await listBlocks(id)).toHaveLength(3);
    expect(await listTracks(id)).toHaveLength(3);
  });

  it('returns 409 for a stale block snapshot and does not insert song blocks', async () => {
    const id = await newClass({ mode: 'scaffold', recipeId: 'cycle_30_v1' });
    const before = await listBlocks(id);
    const request = songBody([], [tracks[0]!]);
    let injected = false;
    const database = new Proxy(env.DB, {
      get(target, key) {
        if (key === 'batch') {
          return async (statements: D1PreparedStatement[]) => {
            if (!injected) {
              injected = true;
              await env.DB.prepare(
                'UPDATE class_plan_blocks SET position = position + 100 WHERE id = ?',
              )
                .bind(before[0]!.id)
                .run();
            }
            return target.batch(statements);
          };
        }
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    await expect(
      commitOrderedClassImport({ ...env, DB: database }, id, owner.userId, request),
    ).rejects.toMatchObject({ status: 409 });
    const after = await listBlocks(id);
    expect(after.some((block) => block.recipeBlockKey === PLAYLIST_SONG_BLOCK_KEY)).toBe(false);
    expect(after).toHaveLength(before.length);
    expect(await listTracks(id)).toEqual([]);
    expect(
      await env.DB.prepare('SELECT id FROM class_track_import_operations WHERE id = ?')
        .bind(request.operationId)
        .first(),
    ).toBeNull();
  });

  it('returns 404 for an unknown track and leaves the scaffold unchanged', async () => {
    const id = await newClass({ mode: 'scaffold', recipeId: 'hiit_30_v1' });
    const before = await listBlocks(id);
    const request = songBody([], [{ id: crypto.randomUUID() }]);
    expect((await commit(id, request)).status).toBe(404);
    expect((await listBlocks(id)).map((block) => block.id)).toEqual(
      before.map((block) => block.id),
    );
    expect(await listTracks(id)).toEqual([]);
  });

  it('tracks a missing duration until a planned-time edit clears the marker', async () => {
    const id = await newClass({
      mode: 'scaffold',
      recipeId: 'cycle_30_v1',
      title: 'Duration hook',
    });
    const undated = await createTrack('No length yet');
    expect((await commit(id, songBody([], [{ id: undated }]))).status).toBe(201);
    const [placement] = await listTracks(id);
    let [block] = await listBlocks(id);
    expect(block).toMatchObject({
      recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
      targetDurationMs: 60_000,
      label: 'Warm-up',
    });

    const renamed = await api(`/api/v1/plan-blocks/${block!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ label: 'Opener' }),
    });
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toMatchObject({
      label: 'Opener',
      recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
    });

    const timed = await api(`/api/v1/class-tracks/${placement!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMsOverride: 180_000 }),
    });
    expect(timed.status).toBe(200);
    [block] = await listBlocks(id);
    expect(block).toMatchObject({
      recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
      targetDurationMs: 180_000,
      label: 'Opener',
    });

    const clipped = await api(`/api/v1/class-tracks/${placement!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipEndMs: 90_000 }),
    });
    expect(clipped.status).toBe(200);
    [block] = await listBlocks(id);
    expect(block).toMatchObject({
      recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
      targetDurationMs: 90_000,
    });

    const planned = await api(`/api/v1/plan-blocks/${block!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetDurationMs: 120_000 }),
    });
    expect(planned.status).toBe(200);
    expect(await planned.json()).toMatchObject({
      recipeBlockKey: null,
      targetDurationMs: 120_000,
    });

    const later = await api(`/api/v1/class-tracks/${placement!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMsOverride: 200_000 }),
    });
    expect(later.status).toBe(200);
    [block] = await listBlocks(id);
    expect(block).toMatchObject({ recipeBlockKey: null, targetDurationMs: 120_000 });
  });

  it('clears the marker when the instructor changes the teaching goal', async () => {
    const id = await newClass();
    expect((await commit(id, songBody([], [tracks[3]!]))).status).toBe(201);
    const [block] = await listBlocks(id);
    const res = await api(`/api/v1/plan-blocks/${block!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ teachingGoal: 'Coach the climb' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      teachingGoal: 'Coach the climb',
      recipeBlockKey: null,
      label: 'Warm-up',
    });
  });
});
