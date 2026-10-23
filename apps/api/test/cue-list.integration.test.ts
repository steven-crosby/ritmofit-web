/**
 * Builder cue list: teaching order and the fields the song editor stores.
 * The run payload keeps its existing cue shape.
 */
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';

async function createPlacement(api: ReturnType<typeof authed>) {
  const track = await api('/api/v1/tracks', {
    method: 'POST',
    body: JSON.stringify({ title: 'Cue list track', artist: 'Artist', durationMs: 180_000 }),
  });
  expect(track.status).toBe(201);
  const trackId = ((await track.json()) as { id: string }).id;

  const cls = await api('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title: 'Cue list class' }),
  });
  expect(cls.status).toBe(201);
  const classId = ((await cls.json()) as { id: string }).id;

  const placement = await api(`/api/v1/classes/${classId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ trackId }),
  });
  expect(placement.status).toBe(201);
  const classTrackId = ((await placement.json()) as { id: string }).id;
  return { classId, classTrackId };
}

describe('builder cue list', () => {
  it('stores duration, BPM, Open, and a note, and lists by teaching order', async () => {
    const owner = await signUpUser();
    const api = authed(owner.cookie);
    const { classId, classTrackId } = await createPlacement(api);

    const empty = await api(`/api/v1/class-tracks/${classTrackId}/cues`);
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual([]);

    const later = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: 40_000,
        text: 'Left Leg Lead',
        durationMs: 15_000,
        bpm: 96,
        intensity: 'open',
        note: 'This is our warm up.',
      }),
    });
    expect(later.status).toBe(201);
    const first = (await later.json()) as {
      id: string;
      position: number;
      text: string;
      durationMs: number;
      bpm: number;
      intensity: string;
      note: string;
    };
    expect(first).toMatchObject({
      position: 0,
      text: 'Left Leg Lead',
      durationMs: 15_000,
      bpm: 96,
      intensity: 'open',
      note: 'This is our warm up.',
    });

    const earlierOnTheClock = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({
        anchorMs: 0,
        text: 'Recover',
        durationMs: 48_000,
        bpm: 110,
        intensity: 'easy',
      }),
    });
    expect(earlierOnTheClock.status).toBe(201);

    const listed = await api(`/api/v1/class-tracks/${classTrackId}/cues`);
    const rows = (await listed.json()) as Array<{ text: string; position: number }>;
    expect(rows.map((row) => row.text)).toEqual(['Left Leg Lead', 'Recover']);
    expect(rows.map((row) => row.position)).toEqual([0, 1]);

    const cleared = await api(`/api/v1/cues/${first.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ note: '   ', intensity: 'all_out', durationMs: 31_000, bpm: 100 }),
    });
    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toMatchObject({
      note: null,
      intensity: 'all_out',
      durationMs: 31_000,
      bpm: 100,
    });

    const payload = await api(`/api/v1/classes/${classId}/run-payload`);
    expect(payload.status).toBe(200);
    const body = (await payload.json()) as {
      tracks: Array<{ cues: Array<Record<string, unknown>> }>;
    };
    const cues = body.tracks[0]?.cues ?? [];
    expect(cues).toHaveLength(2);
    for (const cue of cues) {
      expect(Object.keys(cue).sort()).toEqual(['anchorMs', 'bar', 'beat', 'color', 'id', 'text']);
    }
    expect(cues.map((cue) => cue.text).sort()).toEqual(['Left Leg Lead', 'Recover']);
  });

  it('rejects Open on a track intensity write', async () => {
    const owner = await signUpUser();
    const api = authed(owner.cookie);
    const { classTrackId } = await createPlacement(api);
    const res = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ intensity: 'open' }),
    });
    expect(res.status).toBe(422);
  });
});
