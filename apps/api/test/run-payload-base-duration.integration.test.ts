/**
 * The inspector must read resolved track length from `track.baseDurationMs`,
 * not the already-clipped `track.durationMs`. This file locks that pair on the
 * run-payload and the PATCH omit-when-untouched merge.
 */
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';

const SOURCE_MS = 420_000;
const CLIP_START_MS = 25_000;
const CLIP_END_MS = 390_000;
const EFFECTIVE_MS = 365_000; // min(390000, 420000) - 25000

type RunTrack = {
  classTrackId: string;
  clipStartMs: number;
  track: { durationMs: number | null; baseDurationMs: number | null };
};

type RunPayloadBody = { tracks: RunTrack[]; class: { totalDurationMs: number } };

type ClassTrackBody = {
  id: string;
  durationMsOverride: number | null;
  clipStartMs: number;
  clipEndMs: number | null;
};

async function createClassWithTrack(
  cookie: string,
  durationMs = SOURCE_MS,
): Promise<{ api: ReturnType<typeof authed>; classId: string; classTrackId: string }> {
  const api = authed(cookie);
  const classId = (
    (await (
      await api('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Base duration' }),
      })
    ).json()) as { id: string }
  ).id;
  const classTrackId = (
    (await (
      await api(`/api/v1/classes/${classId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          track: { title: 'Seven Minute Song', artist: 'Fixture', durationMs },
          intensity: 'mod',
        }),
      })
    ).json()) as { id: string }
  ).id;
  return { api, classId, classTrackId };
}

async function payloadOf(api: ReturnType<typeof authed>, classId: string): Promise<RunPayloadBody> {
  const res = await api(`/api/v1/classes/${classId}/run-payload`);
  expect(res.status).toBe(200);
  return (await res.json()) as RunPayloadBody;
}

describe('run-payload base vs effective duration', () => {
  it('emits source length as base and effective when there is no override or clip', async () => {
    const { api, classId } = await createClassWithTrack((await signUpUser()).cookie);
    const entry = (await payloadOf(api, classId)).tracks[0];
    expect(entry?.track.baseDurationMs).toBe(SOURCE_MS);
    expect(entry?.track.durationMs).toBe(SOURCE_MS);
  });

  it('uses durationMsOverride as base without changing the library source', async () => {
    const { api, classId, classTrackId } = await createClassWithTrack((await signUpUser()).cookie);
    const patched = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMsOverride: 480_000 }),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as ClassTrackBody).durationMsOverride).toBe(480_000);

    const entry = (await payloadOf(api, classId)).tracks[0];
    expect(entry?.track.baseDurationMs).toBe(480_000);
    expect(entry?.track.durationMs).toBe(480_000);
  });

  it('keeps base at the source when only a clip start is set', async () => {
    const { api, classId, classTrackId } = await createClassWithTrack((await signUpUser()).cookie);
    expect(
      (
        await api(`/api/v1/class-tracks/${classTrackId}`, {
          method: 'PATCH',
          body: JSON.stringify({ clipStartMs: CLIP_START_MS }),
        })
      ).status,
    ).toBe(200);

    const entry = (await payloadOf(api, classId)).tracks[0];
    expect(entry?.track.baseDurationMs).toBe(SOURCE_MS);
    expect(entry?.track.durationMs).toBe(SOURCE_MS - CLIP_START_MS);
    expect(entry?.clipStartMs).toBe(CLIP_START_MS);
  });

  it('keeps base at the source when only a clip end is set', async () => {
    const { api, classId, classTrackId } = await createClassWithTrack((await signUpUser()).cookie);
    expect(
      (
        await api(`/api/v1/class-tracks/${classTrackId}`, {
          method: 'PATCH',
          body: JSON.stringify({ clipEndMs: CLIP_END_MS }),
        })
      ).status,
    ).toBe(200);

    const entry = (await payloadOf(api, classId)).tracks[0];
    expect(entry?.track.baseDurationMs).toBe(SOURCE_MS);
    expect(entry?.track.durationMs).toBe(CLIP_END_MS);
  });

  it('keeps base at 7:00 and effective at 6:05 for a 0:25-6:30 window', async () => {
    const { api, classId, classTrackId } = await createClassWithTrack((await signUpUser()).cookie);
    expect(
      (
        await api(`/api/v1/class-tracks/${classTrackId}`, {
          method: 'PATCH',
          body: JSON.stringify({ clipStartMs: CLIP_START_MS, clipEndMs: CLIP_END_MS }),
        })
      ).status,
    ).toBe(200);

    const body = await payloadOf(api, classId);
    const entry = body.tracks[0];
    expect(entry?.track.baseDurationMs).toBe(SOURCE_MS);
    expect(entry?.track.durationMs).toBe(EFFECTIVE_MS);
    expect(body.class.totalDurationMs).toBe(EFFECTIVE_MS);
  });

  it('does not manufacture an override when PATCH omits durationMsOverride', async () => {
    const { api, classId, classTrackId } = await createClassWithTrack((await signUpUser()).cookie);
    expect(
      (
        await api(`/api/v1/class-tracks/${classTrackId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            clipStartMs: CLIP_START_MS,
            clipEndMs: CLIP_END_MS,
            notes: 'Check the climb cue.',
          }),
        })
      ).status,
    ).toBe(200);

    const stored = (
      (await (await api(`/api/v1/classes/${classId}/tracks`)).json()) as ClassTrackBody[]
    ).find((row) => row.id === classTrackId);
    expect(stored?.durationMsOverride).toBeNull();
    expect(stored?.clipStartMs).toBe(CLIP_START_MS);
    expect(stored?.clipEndMs).toBe(CLIP_END_MS);

    const first = await payloadOf(api, classId);
    expect(first.tracks[0]?.track.baseDurationMs).toBe(SOURCE_MS);
    expect(first.tracks[0]?.track.durationMs).toBe(EFFECTIVE_MS);

    expect(
      (
        await api(`/api/v1/class-tracks/${classTrackId}`, {
          method: 'PATCH',
          body: JSON.stringify({ notes: 'Check the climb cue again.' }),
        })
      ).status,
    ).toBe(200);
    const again = (
      (await (await api(`/api/v1/classes/${classId}/tracks`)).json()) as ClassTrackBody[]
    ).find((row) => row.id === classTrackId);
    expect(again?.durationMsOverride).toBeNull();

    const second = await payloadOf(api, classId);
    expect(second.tracks[0]?.track.baseDurationMs).toBe(SOURCE_MS);
    expect(second.tracks[0]?.track.durationMs).toBe(EFFECTIVE_MS);
  });

  it('recalculates effective duration from an intentional new base plus the clip', async () => {
    const { api, classId, classTrackId } = await createClassWithTrack((await signUpUser()).cookie);
    expect(
      (
        await api(`/api/v1/class-tracks/${classTrackId}`, {
          method: 'PATCH',
          body: JSON.stringify({ clipStartMs: CLIP_START_MS, clipEndMs: CLIP_END_MS }),
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await api(`/api/v1/class-tracks/${classTrackId}`, {
          method: 'PATCH',
          body: JSON.stringify({ durationMsOverride: 360_000 }),
        })
      ).status,
    ).toBe(200);

    const entry = (await payloadOf(api, classId)).tracks[0];
    expect(entry?.track.baseDurationMs).toBe(360_000);
    expect(entry?.track.durationMs).toBe(360_000 - CLIP_START_MS);
  });
});
