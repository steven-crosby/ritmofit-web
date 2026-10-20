/**
 * GET /classes/:id/run-payload contract lock. The body must satisfy the shared
 * run-payload schema, and the server-resolved fields must match api.md: override
 * BPM, base duration before clipping, clipped duration, rebased anchors, move
 * name, and stable section ids. A caller with no access gets 404 NOT_FOUND.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { runPayloadSchema, type RunPayload } from '@ritmofit/shared';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

const MISSING_ID = '00000000-0000-4000-8000-00000000b22e';

async function expectEnvelope(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const body = (await res.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe(code);
}

describe('run-payload contract (integration)', () => {
  let owner: TestUser;
  let viewer: TestUser;
  let stranger: TestUser;
  let classId: string;
  let sectionId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    viewer = await signUpUser();
    stranger = await signUpUser();
    await verifyUserEmail(viewer.userId);

    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Contract ride',
        template: 'cycle',
        targetDurationMs: 2_700_000,
      }),
    });
    expect(created.status).toBe(201);
    classId = ((await created.json()) as { id: string }).id;

    const track = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Baiana', artist: 'Bakermat', durationMs: 180_000, displayBpm: 100 },
        intensity: 'mod',
      }),
    });
    expect(track.status).toBe(201);
    const classTrackId = ((await track.json()) as { id: string }).id;

    const clipped = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        displayBpmOverride: 128,
        durationMsOverride: 150_000,
        clipStartMs: 30_000,
        clipEndMs: 120_000,
      }),
    });
    expect(clipped.status).toBe(200);

    const cue = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 60_000, text: 'Drop' }),
    });
    expect(cue.status).toBe(201);

    const move = await authed(owner.cookie)(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 60_000, nameOverride: 'Climb' }),
    });
    expect(move.status).toBe(201);

    const section = await authed(owner.cookie)(`/api/v1/classes/${classId}/sections`, {
      method: 'POST',
      body: JSON.stringify({ type: 'climb', startOffsetMs: 0 }),
    });
    expect(section.status).toBe(201);
    sectionId = ((await section.json()) as { id: string }).id;

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

  async function readPayload(cookie: string): Promise<RunPayload> {
    const res = await authed(cookie)(`/api/v1/classes/${classId}/run-payload`);
    expect(res.status).toBe(200);
    return runPayloadSchema.parse(await res.json());
  }

  it('returns a schema-valid payload with the documented server resolutions', async () => {
    const payload = await readPayload(owner.cookie);

    expect(payload.schemaVersion).toBe(1);
    expect(payload.class).toMatchObject({
      id: classId,
      title: 'Contract ride',
      template: 'cycle',
      targetDurationMs: 2_700_000,
      timelineMode: 'sequential',
      totalDurationMs: 90_000,
    });
    expect(payload.tracks).toHaveLength(1);
    const entry = payload.tracks[0]!;
    expect(entry.displayBpm).toBe(128);
    expect(entry.position).toBe(0);
    expect(entry.startOffsetMs).toBe(0);
    expect(entry.clipStartMs).toBe(30_000);
    expect(entry.track).toMatchObject({
      title: 'Baiana',
      artist: 'Bakermat',
      baseDurationMs: 150_000,
      durationMs: 90_000,
    });
    expect(entry.cues).toEqual([expect.objectContaining({ anchorMs: 30_000, text: 'Drop' })]);
    expect(entry.moves).toEqual([expect.objectContaining({ anchorMs: 30_000, name: 'Climb' })]);
    expect(payload.sections).toEqual([{ id: sectionId, type: 'climb', startOffsetMs: 0 }]);
  });

  it('serves the same contract to a view share', async () => {
    const ownerPayload = await readPayload(owner.cookie);
    const viewerPayload = await readPayload(viewer.cookie);
    expect(viewerPayload).toEqual(ownerPayload);
  });

  it('hides the run-payload from a stranger and a missing id', async () => {
    const hidden = await authed(stranger.cookie)(`/api/v1/classes/${classId}/run-payload`);
    await expectEnvelope(hidden, 404, 'NOT_FOUND');

    const missing = await authed(owner.cookie)(`/api/v1/classes/${MISSING_ID}/run-payload`);
    await expectEnvelope(missing, 404, 'NOT_FOUND');
  });
});
