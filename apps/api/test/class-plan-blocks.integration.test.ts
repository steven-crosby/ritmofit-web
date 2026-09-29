/**
 * Deterministic scaffold domain through the mounted Worker and migrated D1.
 * Keeps planned blocks independent from real music while pinning authorization,
 * ordering, deletion, legacy compatibility, and class-copy remapping.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

interface ClassView {
  id: string;
  template: string | null;
  targetDurationMs: number | null;
  scaffoldRecipeId: string | null;
}

interface BlockView {
  id: string;
  classId: string;
  position: number;
  label: string;
  targetDurationMs: number;
  guidance: { kind: string };
}

interface ClassTrackView {
  id: string;
  planBlockId: string | null;
  position: number;
}

describe('class plan blocks and deterministic scaffolds (integration)', () => {
  let owner: TestUser;
  let stranger: TestUser;
  let classId: string;
  let blocks: BlockView[];

  beforeAll(async () => {
    owner = await signUpUser();
    stranger = await signUpUser();
    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'scaffold',
        title: 'Deterministic ride',
        recipeId: 'cycle_30_v1',
      }),
    });
    expect(created.status).toBe(201);
    const cls = (await created.json()) as ClassView;
    classId = cls.id;
    expect(cls).toMatchObject({
      template: 'cycle',
      targetDurationMs: 30 * 60_000,
      scaffoldRecipeId: 'cycle_30_v1',
    });

    const listed = await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks`);
    expect(listed.status).toBe(200);
    blocks = (await listed.json()) as BlockView[];
  });

  it('materializes the exact music-independent recipe and leaves Live free of fake tracks', async () => {
    expect(blocks).toHaveLength(7);
    expect(blocks.map((block) => block.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(blocks.reduce((sum, block) => sum + block.targetDurationMs, 0)).toBe(30 * 60_000);
    expect(blocks.every((block) => block.guidance.kind === 'cycle')).toBe(true);

    const tracks = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`);
    expect(await tracks.json()).toEqual([]);

    const live = await authed(owner.cookie)(`/api/v1/classes/${classId}/run-payload`);
    expect(live.status).toBe(200);
    const liveBody = (await live.json()) as Record<string, unknown>;
    expect(liveBody).not.toHaveProperty('planBlocks');
  });

  it('creates, lists, and copies a v2 recipe with its recovery valley before the peak', async () => {
    const api = authed(owner.cookie);
    const created = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ mode: 'scaffold', title: 'v2 ride', recipeId: 'cycle_45_v2' }),
    });
    expect(created.status).toBe(201);
    const cls = (await created.json()) as ClassView;
    expect(cls).toMatchObject({ targetDurationMs: 45 * 60_000, scaffoldRecipeId: 'cycle_45_v2' });

    const v2Blocks = (await (
      await api(`/api/v1/classes/${cls.id}/plan-blocks`)
    ).json()) as BlockView[];
    expect(v2Blocks.map((block) => block.label)).toEqual([
      'Arrive on the bike',
      'Build the base',
      'Seated climb',
      'Speed control',
      'Standing climb',
      'Recover before the peak',
      'Peak effort',
      'Return and release',
    ]);
    expect(v2Blocks.reduce((sum, block) => sum + block.targetDurationMs, 0)).toBe(45 * 60_000);

    const listed = (await (await api('/api/v1/classes')).json()) as ClassView[];
    expect(listed.find((row) => row.id === cls.id)?.scaffoldRecipeId).toBe('cycle_45_v2');

    const copy = await api(`/api/v1/classes/${cls.id}/copy`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Copied v2 ride' }),
    });
    expect(copy.status).toBe(201);
    expect(((await copy.json()) as ClassView).scaffoldRecipeId).toBe('cycle_45_v2');
  });

  it('preserves legacy empty creation and rejects contradictory scaffold input', async () => {
    const api = authed(owner.cookie);
    const legacy = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Legacy empty', template: 'hiit' }),
    });
    expect(legacy.status).toBe(201);
    const legacyClass = (await legacy.json()) as ClassView;
    expect(legacyClass.scaffoldRecipeId).toBeNull();
    expect(await (await api(`/api/v1/classes/${legacyClass.id}/plan-blocks`)).json()).toEqual([]);

    const contradictory = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'scaffold',
        title: 'Contradictory',
        recipeId: 'cycle_30_v1',
        template: 'hiit',
        targetDurationMs: 123,
      }),
    });
    expect(contradictory.status).toBe(422);
  });

  it('hides blocks cross-tenant and enforces discipline-specific guidance', async () => {
    const hidden = await authed(stranger.cookie)(`/api/v1/classes/${classId}/plan-blocks`);
    expect(hidden.status).toBe(404);
    expect(((await hidden.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');

    const mismatch = await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks`, {
      method: 'POST',
      body: JSON.stringify({
        segmentType: null,
        label: 'Wrong discipline',
        targetDurationMs: 60_000,
        intensity: 'easy',
        teachingGoal: 'Should fail.',
        movementFocus: 'Mat work.',
        guidance: { kind: 'pilates', optionalEquipment: ['mat'] },
      }),
    });
    expect(mismatch.status).toBe(422);
  });

  it('groups assigned music by block and requires explicit detach before deletion', async () => {
    const api = authed(owner.cookie);
    const add = async (title: string, planBlockId: string) => {
      const response = await api(`/api/v1/classes/${classId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          track: { title, artist: 'Test artist', durationMs: 120_000 },
          planBlockId,
        }),
      });
      expect(response.status).toBe(201);
      return (await response.json()) as ClassTrackView;
    };

    const later = await add('Later block first', blocks[1]!.id);
    const earlier = await add('Earlier block second', blocks[0]!.id);
    const grouped = (await (
      await api(`/api/v1/classes/${classId}/tracks`)
    ).json()) as ClassTrackView[];
    expect(grouped.map((track) => track.id)).toEqual([earlier.id, later.id]);
    expect(grouped.map((track) => track.position)).toEqual([0, 1]);
    expect(grouped.map((track) => track.planBlockId)).toEqual([blocks[0]!.id, blocks[1]!.id]);

    const interleave = await api(`/api/v1/classes/${classId}/tracks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ classTrackIds: [later.id, earlier.id] }),
    });
    expect(interleave.status).toBe(409);

    const reorderedBlocks = [blocks[1]!.id, blocks[0]!.id, ...blocks.slice(2).map((b) => b.id)];
    const reorderPlan = await api(`/api/v1/classes/${classId}/plan-blocks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ planBlockIds: reorderedBlocks }),
    });
    expect(reorderPlan.status).toBe(200);
    const tracksAfterPlanReorder = (await (
      await api(`/api/v1/classes/${classId}/tracks`)
    ).json()) as ClassTrackView[];
    expect(tracksAfterPlanReorder.map((track) => track.id)).toEqual([later.id, earlier.id]);

    const blockedDelete = await api(`/api/v1/plan-blocks/${blocks[0]!.id}`, {
      method: 'DELETE',
    });
    expect(blockedDelete.status).toBe(409);

    const detach = await api(`/api/v1/class-tracks/${earlier.id}/plan-block`, {
      method: 'PATCH',
      body: JSON.stringify({ planBlockId: null }),
    });
    expect(detach.status).toBe(200);
    expect(((await detach.json()) as ClassTrackView).planBlockId).toBeNull();

    const afterDetach = (await (
      await api(`/api/v1/classes/${classId}/tracks`)
    ).json()) as ClassTrackView[];
    expect(afterDetach.find((track) => track.id === later.id)?.planBlockId).toBe(blocks[1]!.id);

    const deleted = await api(`/api/v1/plan-blocks/${blocks[0]!.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
  });

  it('copies blocks with fresh ids and remaps assigned tracks', async () => {
    const api = authed(owner.cookie);
    const assigned = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Copy me', artist: 'Test artist', durationMs: 120_000 },
        planBlockId: blocks[1]!.id,
      }),
    });
    expect(assigned.status).toBe(201);
    const sourceTracks = (await (
      await api(`/api/v1/classes/${classId}/tracks`)
    ).json()) as ClassTrackView[];
    expect(sourceTracks.some((track) => track.planBlockId != null)).toBe(true);
    const copy = await api(`/api/v1/classes/${classId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Copied scaffold' }),
    });
    expect(copy.status).toBe(201);
    const copiedClass = (await copy.json()) as ClassView;
    expect(copiedClass.scaffoldRecipeId).toBe('cycle_30_v1');

    const copiedBlocks = (await (
      await api(`/api/v1/classes/${copiedClass.id}/plan-blocks`)
    ).json()) as BlockView[];
    const sourceAfterDelete = (await (
      await api(`/api/v1/classes/${classId}/plan-blocks`)
    ).json()) as BlockView[];
    expect(copiedBlocks).toHaveLength(sourceAfterDelete.length);
    expect(copiedBlocks.map((block) => block.id)).not.toEqual(
      sourceAfterDelete.map((block) => block.id),
    );

    const copiedTracks = (await (
      await api(`/api/v1/classes/${copiedClass.id}/tracks`)
    ).json()) as ClassTrackView[];
    const copiedBlockIds = new Set(copiedBlocks.map((block) => block.id));
    expect(copiedTracks.some((track) => track.planBlockId != null)).toBe(true);
    expect(
      copiedTracks.every(
        (track) => track.planBlockId == null || copiedBlockIds.has(track.planBlockId),
      ),
    ).toBe(true);
  });

  it('defensively detaches a track when its block is deleted directly in D1', async () => {
    const api = authed(owner.cookie);
    const assigned = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'FK defense', artist: 'Test artist', durationMs: 120_000 },
        planBlockId: blocks[2]!.id,
      }),
    });
    expect(assigned.status).toBe(201);
    const track = (await assigned.json()) as ClassTrackView;

    await env.DB.prepare('DELETE FROM class_plan_blocks WHERE id = ?').bind(blocks[2]!.id).run();
    const afterDelete = (await (
      await api(`/api/v1/classes/${classId}/tracks`)
    ).json()) as ClassTrackView[];
    expect(afterDelete.find((candidate) => candidate.id === track.id)?.planBlockId).toBeNull();
  });

  it('rejects free-timeline moves and plan reorders that would invert block order', async () => {
    const api = authed(owner.cookie);
    const created = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'scaffold',
        title: 'Free scaffold',
        recipeId: 'hiit_30_v1',
      }),
    });
    const freeClass = (await created.json()) as ClassView;
    const freeBlocks = (await (
      await api(`/api/v1/classes/${freeClass.id}/plan-blocks`)
    ).json()) as BlockView[];

    const trackIds: string[] = [];
    for (const [index, block] of freeBlocks.slice(0, 2).entries()) {
      const added = await api(`/api/v1/classes/${freeClass.id}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          track: { title: `Free ${index}`, artist: 'Test artist', durationMs: 60_000 },
          planBlockId: block.id,
        }),
      });
      trackIds.push(((await added.json()) as ClassTrackView).id);
    }
    const switched = await api(`/api/v1/classes/${freeClass.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ timelineMode: 'free' }),
    });
    expect(switched.status).toBe(200);

    const invertedMove = await api(`/api/v1/class-tracks/${trackIds[0]}`, {
      method: 'PATCH',
      body: JSON.stringify({ startOffsetMs: 120_000 }),
    });
    expect(invertedMove.status).toBe(409);

    const invertedBlocks = await api(`/api/v1/classes/${freeClass.id}/plan-blocks/reorder`, {
      method: 'POST',
      body: JSON.stringify({
        planBlockIds: [
          freeBlocks[1]!.id,
          freeBlocks[0]!.id,
          ...freeBlocks.slice(2).map((b) => b.id),
        ],
      }),
    });
    expect(invertedBlocks.status).toBe(409);
  });
});

describe('PATCH /plan-blocks/:id keeps planned time, class target, and HIIT rounds independent', () => {
  interface HiitGuidance {
    kind: 'hiit';
    workMs: number | null;
    recoveryMs: number | null;
    rounds: number | null;
    sequenceFocus: string;
    equipment: string;
  }
  type HiitBlockView = Omit<BlockView, 'guidance'> & { guidance: HiitGuidance };

  let owner: TestUser;
  let viewer: TestUser;
  let stranger: TestUser;
  let classId: string;
  let circuit: HiitBlockView;

  const readClass = async () =>
    (await (await authed(owner.cookie)(`/api/v1/classes/${classId}`)).json()) as ClassView;
  const readBlock = async (id: string) =>
    (
      (await (
        await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks`)
      ).json()) as HiitBlockView[]
    ).find((row) => row.id === id)!;

  beforeAll(async () => {
    owner = await signUpUser();
    viewer = await signUpUser();
    await verifyUserEmail(viewer.userId);
    stranger = await signUpUser();
    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ mode: 'scaffold', title: 'Editable HIIT', recipeId: 'hiit_45_v1' }),
    });
    expect(created.status).toBe(201);
    classId = ((await created.json()) as ClassView).id;
    const rows = (await (
      await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks`)
    ).json()) as HiitBlockView[];
    circuit = rows.find((row) => row.label === 'Circuit A')!;
    expect(circuit).toMatchObject({
      targetDurationMs: 9 * 60_000,
      guidance: { rounds: 9, workMs: 30_000, recoveryMs: 30_000 },
    });

    const share = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: classId,
        targetUserId: viewer.userId,
        permission: 'view',
      }),
    });
    expect(share.status).toBe(201);
  });

  it('changes planned time only: class target and HIIT rounds stay put', async () => {
    const res = await authed(owner.cookie)(`/api/v1/plan-blocks/${circuit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetDurationMs: 10 * 60_000 }),
    });
    expect(res.status).toBe(200);
    const saved = (await res.json()) as HiitBlockView;
    expect(saved.targetDurationMs).toBe(10 * 60_000);
    expect(saved.guidance).toEqual(circuit.guidance);
    expect((await readClass()).targetDurationMs).toBe(45 * 60_000);
  });

  it('changes HIIT guidance only: planned time and class target stay put', async () => {
    // Storage rolls back per test, so set a non-recipe time here first.
    const resized = await authed(owner.cookie)(`/api/v1/plan-blocks/${circuit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetDurationMs: 10 * 60_000 }),
    });
    expect(resized.status).toBe(200);
    const guidance = { ...circuit.guidance, rounds: 12 };
    const res = await authed(owner.cookie)(`/api/v1/plan-blocks/${circuit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ guidance }),
    });
    expect(res.status).toBe(200);
    const saved = await readBlock(circuit.id);
    expect(saved.guidance).toEqual(guidance);
    expect(saved.targetDurationMs).toBe(10 * 60_000);
    expect((await readClass()).targetDurationMs).toBe(45 * 60_000);
  });

  it('rejects view-only (403) and hidden (404) callers without writing', async () => {
    const before = await readBlock(circuit.id);
    const asViewer = await authed(viewer.cookie)(`/api/v1/plan-blocks/${circuit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetDurationMs: 60_000 }),
    });
    expect(asViewer.status).toBe(403);
    const asStranger = await authed(stranger.cookie)(`/api/v1/plan-blocks/${circuit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetDurationMs: 60_000 }),
    });
    expect(asStranger.status).toBe(404);
    expect((await readBlock(circuit.id)).targetDurationMs).toBe(before.targetDurationMs);
  });

  it('rejects mismatched discipline guidance and out-of-range time', async () => {
    const api = authed(owner.cookie);
    const wrongKind = await api(`/api/v1/plan-blocks/${circuit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ guidance: { kind: 'pilates', optionalEquipment: [] } }),
    });
    expect(wrongKind.status).toBe(422);
    for (const targetDurationMs of [0, -1, 24 * 60 * 60 * 1000 + 1, 1.5]) {
      const bad = await api(`/api/v1/plan-blocks/${circuit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ targetDurationMs }),
      });
      expect(bad.status).toBeGreaterThanOrEqual(400);
      expect(bad.status).toBeLessThan(500);
    }
    expect(await readBlock(circuit.id)).toEqual(circuit);
  });

  it('does not move free-mode track offsets when planned time changes', async () => {
    const api = authed(owner.cookie);
    const added = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Free anchor', artist: 'Test artist', durationMs: 60_000 },
        planBlockId: circuit.id,
      }),
    });
    expect(added.status).toBe(201);
    const switched = await api(`/api/v1/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ timelineMode: 'free' }),
    });
    expect(switched.status).toBe(200);
    const readTracks = async () =>
      (await (await api(`/api/v1/classes/${classId}/tracks`)).json()) as (ClassTrackView & {
        startOffsetMs: number;
      })[];
    const before = await readTracks();

    const res = await api(`/api/v1/plan-blocks/${circuit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetDurationMs: 3 * 60_000 }),
    });
    expect(res.status).toBe(200);
    expect(await readTracks()).toEqual(before);
  });
});
