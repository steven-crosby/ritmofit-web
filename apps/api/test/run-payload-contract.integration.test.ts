/**
 * GET /classes/:id/run-payload contract lock. The body must satisfy the shared
 * run-payload schema, and the server-resolved fields must match api.md: override
 * BPM, base duration before clipping, clipped duration, rebased anchors, move
 * name, and stable section ids. A caller with no access gets 404 NOT_FOUND.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { beatPositionAt, runPayloadSchema, type RunPayload } from '@ritmofit/shared';
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

/**
 * Acceptance checks for the four stored cue columns. A cue-list row that already
 * shows the value does not pass these — only `GET /classes/:id/run-payload` does.
 */
describe('run-payload cue fields', () => {
  let owner: TestUser;
  let stranger: TestUser;
  let classId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    stranger = await signUpUser();

    const created = await authed(owner.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Cue facts', template: 'cycle' }),
    });
    expect(created.status).toBe(201);
    classId = ((await created.json()) as { id: string }).id;

    const timed = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Hold', artist: 'Studio', durationMs: 180_000, displayBpm: 128 },
        intensity: 'mod',
      }),
    });
    expect(timed.status).toBe(201);
    const timedId = ((await timed.json()) as { id: string }).id;

    // Created first, later on the timeline. Position 0. Duration, BPM, and
    // intensity left unset. The note is stored and must stay off the payload.
    const later = await authed(owner.cookie)(`/api/v1/class-tracks/${timedId}/cues`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: 48_000,
        text: 'Second on the timeline',
        note: 'Coaching',
      }),
    });
    expect(later.status).toBe(201);

    // Created second, earlier on the timeline. Position 1. A 15s hold whose
    // next cue sits at 48000 — the payload duration is the stored hold.
    const held = await authed(owner.cookie)(`/api/v1/class-tracks/${timedId}/cues`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: 0,
        text: 'Left Leg Lead',
        durationMs: 15_000,
        bpm: 96,
        intensity: 'open',
        note: 'Hold',
      }),
    });
    expect(held.status).toBe(201);

    const clipped = await authed(owner.cookie)(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Clip', artist: 'Studio', durationMs: 180_000, displayBpm: 100 },
        intensity: 'easy',
      }),
    });
    expect(clipped.status).toBe(201);
    const clippedId = ((await clipped.json()) as { id: string }).id;
    const windowed = await authed(owner.cookie)(`/api/v1/class-tracks/${clippedId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: 30_000 }),
    });
    expect(windowed.status).toBe(200);
    const rebased = await authed(owner.cookie)(`/api/v1/class-tracks/${clippedId}/cues`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: 60_000,
        text: 'Rebased hold',
        durationMs: 15_000,
        note: 'Still stored',
      }),
    });
    expect(rebased.status).toBe(201);
  });

  it('copies stored duration, bpm, intensity, and position, and leaves note off', async () => {
    const res = await authed(owner.cookie)(`/api/v1/classes/${classId}/run-payload`);
    expect(res.status).toBe(200);
    const raw = (await res.json()) as {
      schemaVersion: number;
      tracks: Array<{
        classTrackId: string;
        displayBpm: number | null;
        intensity: string;
        clipStartMs: number;
        cues: Array<Record<string, unknown>>;
      }>;
    };

    expect(raw.schemaVersion).toBe(1);
    const timed = raw.tracks[0]!;
    expect(timed.displayBpm).toBe(128);
    expect(timed.intensity).toBe('mod');
    expect(timed.cues.map((cue) => cue.anchorMs)).toEqual([0, 48_000]);

    const held = timed.cues[0]!;
    const blank = timed.cues[1]!;
    expect(held.text).toBe('Left Leg Lead');
    expect(held.durationMs).toBe(15_000);
    expect(blank.anchorMs).toBe(48_000);
    expect(held.bpm).toBe(96);
    expect(held.intensity).toBe('open');
    expect(held.position).toBe(1);
    expect(blank.durationMs).toBeNull();
    expect(blank.bpm).toBeNull();
    expect(blank.intensity).toBeNull();
    expect(blank.position).toBe(0);
    expect(held).not.toHaveProperty('note');
    expect(blank).not.toHaveProperty('note');

    const clipped = raw.tracks[1]!;
    expect(clipped.clipStartMs).toBe(30_000);
    // Beat/bar use the track tempo at the stored anchor. Cue BPM is copied as
    // its own field, and clip re-base changes `anchorMs` only.
    const blankCount = beatPositionAt(48_000, timed.displayBpm, 0);
    expect(beatPositionAt(48_000, null, 0)).toBeNull();
    expect(blank.beat).toBe(blankCount?.beat);
    expect(blank.bar).toBe(blankCount?.bar);

    const fromStoredAnchor = beatPositionAt(60_000, clipped.displayBpm, 0);
    const fromPayloadAnchor = beatPositionAt(30_000, clipped.displayBpm, 0);
    expect(fromStoredAnchor).not.toEqual(fromPayloadAnchor);
    expect(clipped.cues[0]).toMatchObject({
      anchorMs: 30_000,
      durationMs: 15_000,
      beat: fromStoredAnchor?.beat,
      bar: fromStoredAnchor?.bar,
    });
    expect(clipped.cues[0]).not.toHaveProperty('note');

    const cueAnchorMs = 10_000;
    const cueBpm = 96;
    const fromTrack = beatPositionAt(cueAnchorMs, timed.displayBpm, 0);
    const fromCue = beatPositionAt(cueAnchorMs, cueBpm, 0);
    expect(fromTrack).not.toEqual(fromCue);
    const created = await authed(owner.cookie)(`/api/v1/class-tracks/${timed.classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: cueAnchorMs,
        text: 'Tempo stays on the track',
        bpm: cueBpm,
      }),
    });
    expect(created.status).toBe(201);
    const again = await authed(owner.cookie)(`/api/v1/classes/${classId}/run-payload`);
    expect(again.status).toBe(200);
    const next = (await again.json()) as typeof raw;
    const conflict = next.tracks[0]?.cues.find((cue) => cue.text === 'Tempo stays on the track');
    expect(conflict).toMatchObject({
      anchorMs: cueAnchorMs,
      bpm: cueBpm,
      beat: fromTrack?.beat,
      bar: fromTrack?.bar,
    });
    expect(next.tracks[0]?.displayBpm).toBe(128);

    expect(runPayloadSchema.parse(raw).schemaVersion).toBe(1);
  });

  it('hides the cue-field payload from a stranger', async () => {
    const hidden = await authed(stranger.cookie)(`/api/v1/classes/${classId}/run-payload`);
    await expectEnvelope(hidden, 404, 'NOT_FOUND');
  });
});
