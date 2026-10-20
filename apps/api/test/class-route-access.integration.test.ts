/**
 * Cross-user access for class, class-track, and plan-block routes that the
 * existing authz suites do not drive. Hidden callers (no share) and a missing id
 * both return 404 NOT_FOUND. A view share can read and save a class copy, and
 * gets 403 FORBIDDEN on edit/owner writes. Owner success on the same id proves
 * the 404 is existence-hiding, not a missing row.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { authed, call, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

const MISSING_ID = '00000000-0000-4000-8000-00000000a11e';

interface WithId {
  id: string;
}

const cycleBlock = {
  segmentType: 'climb' as const,
  label: 'Seated climb',
  targetDurationMs: 60_000,
  intensity: 'mod' as const,
  teachingGoal: 'Build resistance.',
  movementFocus: 'Seated climb.',
  guidance: {
    kind: 'cycle' as const,
    posture: 'seated' as const,
    cadenceMinRpm: 60,
    cadenceMaxRpm: 80,
    rpeMin: 4,
    rpeMax: 6,
  },
};

async function expectEnvelope(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const body = (await res.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe(code);
}

function uploadCover(cookie: string, classId: string): Promise<Response> {
  const form = new FormData();
  form.set(
    'file',
    new File([new Uint8Array([137, 80, 78, 71])], 'cover.png', { type: 'image/png' }),
  );
  return call(`/api/v1/classes/${classId}/cover`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
}

describe('class route access (integration)', () => {
  let owner: TestUser;
  let viewer: TestUser;
  let stranger: TestUser;
  let classId: string;
  let classTrackId: string;
  let planBlockId: string;
  let viewerClassId: string;
  let strangerClassId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    viewer = await signUpUser();
    stranger = await signUpUser();
    await verifyUserEmail(viewer.userId);

    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Access matrix', template: 'cycle' }),
    });
    expect(created.status).toBe(201);
    classId = ((await created.json()) as WithId).id;

    const track = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Track A', artist: 'Artist', durationMs: 180_000 },
        intensity: 'mod',
      }),
    });
    expect(track.status).toBe(201);
    classTrackId = ((await track.json()) as WithId).id;

    const tagged = await authed(owner.cookie)(`/api/v1/classes/${classId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag: 'warmup' }),
    });
    expect(tagged.status).toBe(201);

    const block = await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks`, {
      method: 'POST',
      body: JSON.stringify(cycleBlock),
    });
    expect(block.status).toBe(201);
    planBlockId = ((await block.json()) as WithId).id;

    const share = await authed(owner.cookie)('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: classId,
        targetUserId: viewer.userId,
        permission: 'view',
      }),
    });
    expect(share.status).toBe(201);

    const viewerClass = await authed(viewer.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Viewer library' }),
    });
    expect(viewerClass.status).toBe(201);
    viewerClassId = ((await viewerClass.json()) as WithId).id;

    const strangerClass = await authed(stranger.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Stranger library' }),
    });
    expect(strangerClass.status).toBe(201);
    strangerClassId = ((await strangerClass.json()) as WithId).id;
  });

  it('hides class copy from a stranger and lets a view share save one', async () => {
    const hidden = await authed(stranger.cookie)(`/api/v1/classes/${classId}/copy`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await expectEnvelope(hidden, 404, 'NOT_FOUND');

    const missing = await authed(owner.cookie)(`/api/v1/classes/${MISSING_ID}/copy`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await expectEnvelope(missing, 404, 'NOT_FOUND');

    const strangerLibrary = (await (
      await authed(stranger.cookie)('/api/v1/classes')
    ).json()) as WithId[];
    expect(strangerLibrary.map((row) => row.id)).toEqual([strangerClassId]);

    const copied = await authed(viewer.cookie)(`/api/v1/classes/${classId}/copy`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(copied.status).toBe(201);
    const copy = (await copied.json()) as { id: string; visibility: string };
    expect(copy.id).not.toBe(classId);
    expect(copy.visibility).toBe('private');
  });

  it('hides class delete from a stranger and forbids a view share', async () => {
    const hidden = await authed(stranger.cookie)(`/api/v1/classes/${classId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(hidden, 404, 'NOT_FOUND');

    const missing = await authed(stranger.cookie)(`/api/v1/classes/${MISSING_ID}`, {
      method: 'DELETE',
    });
    await expectEnvelope(missing, 404, 'NOT_FOUND');

    const forbidden = await authed(viewer.cookie)(`/api/v1/classes/${classId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(forbidden, 403, 'FORBIDDEN');

    const stillThere = await authed(owner.cookie)(`/api/v1/classes/${classId}`);
    expect(stillThere.status).toBe(200);

    const removed = await authed(owner.cookie)(`/api/v1/classes/${classId}`, {
      method: 'DELETE',
    });
    expect(removed.status).toBe(204);
  });

  it('hides cover upload from a stranger and forbids a view share without writing', async () => {
    const before = await env.IMAGES_BUCKET.list();

    const hidden = await uploadCover(stranger.cookie, classId);
    await expectEnvelope(hidden, 404, 'NOT_FOUND');

    const missing = await uploadCover(owner.cookie, MISSING_ID);
    await expectEnvelope(missing, 404, 'NOT_FOUND');

    const forbidden = await uploadCover(viewer.cookie, classId);
    await expectEnvelope(forbidden, 403, 'FORBIDDEN');

    expect((await env.IMAGES_BUCKET.list()).objects).toHaveLength(before.objects.length);

    const uploaded = await uploadCover(owner.cookie, classId);
    expect(uploaded.status).toBe(200);
    const coverImageUrl = ((await uploaded.json()) as { coverImageUrl: string }).coverImageUrl;
    const key = new URL(coverImageUrl).pathname.replace('/api/v1/uploads/', '');
    expect(await env.IMAGES_BUCKET.head(key)).not.toBeNull();
    await env.IMAGES_BUCKET.delete(key);
  });

  it('hides tag add and remove from a stranger and forbids a view share', async () => {
    const hiddenAdd = await authed(stranger.cookie)(`/api/v1/classes/${classId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag: 'ride' }),
    });
    await expectEnvelope(hiddenAdd, 404, 'NOT_FOUND');

    const missingAdd = await authed(owner.cookie)(`/api/v1/classes/${MISSING_ID}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag: 'ride' }),
    });
    await expectEnvelope(missingAdd, 404, 'NOT_FOUND');

    const forbiddenAdd = await authed(viewer.cookie)(`/api/v1/classes/${classId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag: 'ride' }),
    });
    await expectEnvelope(forbiddenAdd, 403, 'FORBIDDEN');

    const added = await authed(owner.cookie)(`/api/v1/classes/${classId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag: 'ride' }),
    });
    expect(added.status).toBe(201);

    const hiddenRemove = await authed(stranger.cookie)(`/api/v1/classes/${classId}/tags/warmup`, {
      method: 'DELETE',
    });
    await expectEnvelope(hiddenRemove, 404, 'NOT_FOUND');

    const missingRemove = await authed(owner.cookie)(`/api/v1/classes/${MISSING_ID}/tags/warmup`, {
      method: 'DELETE',
    });
    await expectEnvelope(missingRemove, 404, 'NOT_FOUND');

    const forbiddenRemove = await authed(viewer.cookie)(`/api/v1/classes/${classId}/tags/warmup`, {
      method: 'DELETE',
    });
    await expectEnvelope(forbiddenRemove, 403, 'FORBIDDEN');

    const detail = (await (await authed(owner.cookie)(`/api/v1/classes/${classId}`)).json()) as {
      tags: string[];
    };
    expect(detail.tags).toContain('warmup');

    const removed = await authed(owner.cookie)(`/api/v1/classes/${classId}/tags/warmup`, {
      method: 'DELETE',
    });
    expect(removed.status).toBe(204);
  });

  it('hides track list, add, and reorder from a stranger and forbids view writes', async () => {
    const hiddenList = await authed(stranger.cookie)(`/api/v1/classes/${classId}/tracks`);
    await expectEnvelope(hiddenList, 404, 'NOT_FOUND');

    const missingList = await authed(owner.cookie)(`/api/v1/classes/${MISSING_ID}/tracks`);
    await expectEnvelope(missingList, 404, 'NOT_FOUND');

    const viewList = await authed(viewer.cookie)(`/api/v1/classes/${classId}/tracks`);
    expect(viewList.status).toBe(200);

    const addBody = JSON.stringify({
      track: { title: 'Extra', artist: 'Artist', durationMs: 60_000 },
      intensity: 'easy',
    });
    const hiddenAdd = await authed(stranger.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: addBody,
    });
    await expectEnvelope(hiddenAdd, 404, 'NOT_FOUND');

    const missingAdd = await authed(owner.cookie)(`/api/v1/classes/${MISSING_ID}/tracks`, {
      method: 'POST',
      body: addBody,
    });
    await expectEnvelope(missingAdd, 404, 'NOT_FOUND');

    const forbiddenAdd = await authed(viewer.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: addBody,
    });
    await expectEnvelope(forbiddenAdd, 403, 'FORBIDDEN');

    const added = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: addBody,
    });
    expect(added.status).toBe(201);
    const addedId = ((await added.json()) as WithId).id;

    const reorderBody = JSON.stringify({ classTrackIds: [classTrackId, addedId] });
    const hiddenReorder = await authed(stranger.cookie)(
      `/api/v1/classes/${classId}/tracks/reorder`,
      { method: 'POST', body: reorderBody },
    );
    await expectEnvelope(hiddenReorder, 404, 'NOT_FOUND');

    const missingReorder = await authed(owner.cookie)(
      `/api/v1/classes/${MISSING_ID}/tracks/reorder`,
      { method: 'POST', body: reorderBody },
    );
    await expectEnvelope(missingReorder, 404, 'NOT_FOUND');

    const forbiddenReorder = await authed(viewer.cookie)(
      `/api/v1/classes/${classId}/tracks/reorder`,
      { method: 'POST', body: reorderBody },
    );
    await expectEnvelope(forbiddenReorder, 403, 'FORBIDDEN');

    const reordered = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks/reorder`, {
      method: 'POST',
      body: reorderBody,
    });
    expect(reordered.status).toBe(200);
  });

  it('hides class-track patch and delete from a stranger and forbids a view share', async () => {
    const patchBody = JSON.stringify({ intensity: 'hard' });
    const hiddenPatch = await authed(stranger.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: patchBody,
    });
    await expectEnvelope(hiddenPatch, 404, 'NOT_FOUND');

    const missingPatch = await authed(owner.cookie)(`/api/v1/class-tracks/${MISSING_ID}`, {
      method: 'PATCH',
      body: patchBody,
    });
    await expectEnvelope(missingPatch, 404, 'NOT_FOUND');

    const forbiddenPatch = await authed(viewer.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: patchBody,
    });
    await expectEnvelope(forbiddenPatch, 403, 'FORBIDDEN');

    const patched = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: patchBody,
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { intensity: string }).intensity).toBe('hard');

    const hiddenDelete = await authed(stranger.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(hiddenDelete, 404, 'NOT_FOUND');

    const missingDelete = await authed(owner.cookie)(`/api/v1/class-tracks/${MISSING_ID}`, {
      method: 'DELETE',
    });
    await expectEnvelope(missingDelete, 404, 'NOT_FOUND');

    const forbiddenDelete = await authed(viewer.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(forbiddenDelete, 403, 'FORBIDDEN');

    const stillThere = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`);
    expect(stillThere.status).toBe(200);
    expect((await stillThere.json()) as WithId[]).toHaveLength(1);

    const removed = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'DELETE',
    });
    expect(removed.status).toBe(204);
  });

  it('hides a class-track copy when the source or target is hidden and does not write', async () => {
    const strangerTracks = async () =>
      (await (
        await authed(stranger.cookie)(`/api/v1/classes/${strangerClassId}/tracks`)
      ).json()) as WithId[];
    const viewerTracks = async () =>
      (await (
        await authed(viewer.cookie)(`/api/v1/classes/${viewerClassId}/tracks`)
      ).json()) as WithId[];

    const hiddenSource = await authed(stranger.cookie)(
      `/api/v1/class-tracks/${classTrackId}/copy`,
      {
        method: 'POST',
        body: JSON.stringify({ targetClassId: strangerClassId }),
      },
    );
    await expectEnvelope(hiddenSource, 404, 'NOT_FOUND');
    expect(await strangerTracks()).toEqual([]);

    const hiddenTarget = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetClassId: strangerClassId }),
    });
    await expectEnvelope(hiddenTarget, 404, 'NOT_FOUND');
    expect(await strangerTracks()).toEqual([]);

    const missingSource = await authed(owner.cookie)(`/api/v1/class-tracks/${MISSING_ID}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetClassId: classId }),
    });
    await expectEnvelope(missingSource, 404, 'NOT_FOUND');

    const forbidden = await authed(viewer.cookie)(`/api/v1/class-tracks/${classTrackId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetClassId: viewerClassId }),
    });
    await expectEnvelope(forbidden, 403, 'FORBIDDEN');
    expect(await viewerTracks()).toEqual([]);

    const sourceBefore = (await (
      await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`)
    ).json()) as WithId[];
    expect(sourceBefore).toHaveLength(1);

    const copied = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetClassId: classId }),
    });
    expect(copied.status).toBe(201);
    expect(((await copied.json()) as { classId: string }).classId).toBe(classId);
  });

  it('hides plan-block assignment from a stranger and forbids a view share', async () => {
    const body = JSON.stringify({ planBlockId });
    const hidden = await authed(stranger.cookie)(
      `/api/v1/class-tracks/${classTrackId}/plan-block`,
      { method: 'PATCH', body },
    );
    await expectEnvelope(hidden, 404, 'NOT_FOUND');

    const missing = await authed(owner.cookie)(`/api/v1/class-tracks/${MISSING_ID}/plan-block`, {
      method: 'PATCH',
      body,
    });
    await expectEnvelope(missing, 404, 'NOT_FOUND');

    const forbidden = await authed(viewer.cookie)(
      `/api/v1/class-tracks/${classTrackId}/plan-block`,
      { method: 'PATCH', body },
    );
    await expectEnvelope(forbidden, 403, 'FORBIDDEN');

    const assigned = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/plan-block`, {
      method: 'PATCH',
      body,
    });
    expect(assigned.status).toBe(200);
    expect(((await assigned.json()) as { planBlockId: string }).planBlockId).toBe(planBlockId);
  });

  it('hides plan-block create, reorder, and delete from a stranger and forbids a view share', async () => {
    const createBody = JSON.stringify({ ...cycleBlock, label: 'Second climb' });
    const hiddenCreate = await authed(stranger.cookie)(`/api/v1/classes/${classId}/plan-blocks`, {
      method: 'POST',
      body: createBody,
    });
    await expectEnvelope(hiddenCreate, 404, 'NOT_FOUND');

    const missingCreate = await authed(owner.cookie)(`/api/v1/classes/${MISSING_ID}/plan-blocks`, {
      method: 'POST',
      body: createBody,
    });
    await expectEnvelope(missingCreate, 404, 'NOT_FOUND');

    const forbiddenCreate = await authed(viewer.cookie)(`/api/v1/classes/${classId}/plan-blocks`, {
      method: 'POST',
      body: createBody,
    });
    await expectEnvelope(forbiddenCreate, 403, 'FORBIDDEN');

    const created = await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks`, {
      method: 'POST',
      body: createBody,
    });
    expect(created.status).toBe(201);
    const secondId = ((await created.json()) as WithId).id;

    const reorderBody = JSON.stringify({ planBlockIds: [secondId, planBlockId] });
    const hiddenReorder = await authed(stranger.cookie)(
      `/api/v1/classes/${classId}/plan-blocks/reorder`,
      { method: 'POST', body: reorderBody },
    );
    await expectEnvelope(hiddenReorder, 404, 'NOT_FOUND');

    const missingReorder = await authed(owner.cookie)(
      `/api/v1/classes/${MISSING_ID}/plan-blocks/reorder`,
      { method: 'POST', body: reorderBody },
    );
    await expectEnvelope(missingReorder, 404, 'NOT_FOUND');

    const forbiddenReorder = await authed(viewer.cookie)(
      `/api/v1/classes/${classId}/plan-blocks/reorder`,
      { method: 'POST', body: reorderBody },
    );
    await expectEnvelope(forbiddenReorder, 403, 'FORBIDDEN');

    const reordered = await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks/reorder`, {
      method: 'POST',
      body: reorderBody,
    });
    expect(reordered.status).toBe(200);

    const hiddenDelete = await authed(stranger.cookie)(`/api/v1/plan-blocks/${planBlockId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(hiddenDelete, 404, 'NOT_FOUND');

    const missingDelete = await authed(owner.cookie)(`/api/v1/plan-blocks/${MISSING_ID}`, {
      method: 'DELETE',
    });
    await expectEnvelope(missingDelete, 404, 'NOT_FOUND');

    const forbiddenDelete = await authed(viewer.cookie)(`/api/v1/plan-blocks/${planBlockId}`, {
      method: 'DELETE',
    });
    await expectEnvelope(forbiddenDelete, 403, 'FORBIDDEN');

    const listed = (await (
      await authed(owner.cookie)(`/api/v1/classes/${classId}/plan-blocks`)
    ).json()) as WithId[];
    expect(listed.map((row) => row.id).sort()).toEqual([planBlockId, secondId].sort());

    const removed = await authed(owner.cookie)(`/api/v1/plan-blocks/${secondId}`, {
      method: 'DELETE',
    });
    expect(removed.status).toBe(204);
  });
});
