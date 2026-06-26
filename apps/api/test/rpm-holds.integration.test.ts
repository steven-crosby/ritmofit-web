/**
 * Coverage for D14 (M6): per-track manual cadence (RPM) and hold count. These are
 * authored independently of music tempo (BPM) and must round-trip through the
 * add/patch class-track routes and surface on the assembled run-payload. The
 * column check constraints (rpm > 0, holds >= 0) back up the Zod contract.
 */
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';

const TRACK_MS = 180_000;

type ClassTrackBody = {
  id: string;
  displayRpm: number | null;
  holdCount: number | null;
};

type RunPayloadBody = {
  tracks: { classTrackId: string; displayRpm: number | null; holdCount: number | null }[];
};

describe('per-track RPM & holds (integration)', () => {
  it('persists RPM/holds on add and surfaces them on the run-payload', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const classId = (
      (await (
        await api('/api/v1/classes', { method: 'POST', body: JSON.stringify({ title: 'Cadence' }) })
      ).json()) as { id: string }
    ).id;

    const addRes = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Song', artist: 'Artist', durationMs: TRACK_MS },
        intensity: 'hard',
        displayRpm: 85,
        holdCount: 3,
      }),
    });
    expect(addRes.status).toBe(201);
    const added = (await addRes.json()) as ClassTrackBody;
    expect(added.displayRpm).toBe(85);
    expect(added.holdCount).toBe(3);

    const payload = (await (
      await api(`/api/v1/classes/${classId}/run-payload`)
    ).json()) as RunPayloadBody;
    const entry = payload.tracks.find((t) => t.classTrackId === added.id);
    expect(entry?.displayRpm).toBe(85);
    expect(entry?.holdCount).toBe(3);
  });

  it('PATCH updates RPM/holds, keeps a 0 hold count, and clears with null', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const classId = (
      (await (
        await api('/api/v1/classes', { method: 'POST', body: JSON.stringify({ title: 'Cadence' }) })
      ).json()) as { id: string }
    ).id;
    const ctId = (
      (await (
        await api(`/api/v1/classes/${classId}/tracks`, {
          method: 'POST',
          body: JSON.stringify({
            track: { title: 'Song', artist: 'Artist', durationMs: TRACK_MS },
            intensity: 'mod',
          }),
        })
      ).json()) as { id: string }
    ).id;

    // 0 holds ("no holds") is a meaningful value, distinct from unset/null.
    const patched = (await (
      await api(`/api/v1/class-tracks/${ctId}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayRpm: 90, holdCount: 0 }),
      })
    ).json()) as ClassTrackBody;
    expect(patched.displayRpm).toBe(90);
    expect(patched.holdCount).toBe(0);

    // Explicit null clears the cadence target back to unset.
    const cleared = (await (
      await api(`/api/v1/class-tracks/${ctId}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayRpm: null }),
      })
    ).json()) as ClassTrackBody;
    expect(cleared.displayRpm).toBeNull();
    expect(cleared.holdCount).toBe(0); // untouched fields keep their value
  });

  it('rejects a non-positive RPM and a negative hold count', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const classId = (
      (await (
        await api('/api/v1/classes', { method: 'POST', body: JSON.stringify({ title: 'Cadence' }) })
      ).json()) as { id: string }
    ).id;
    const ctId = (
      (await (
        await api(`/api/v1/classes/${classId}/tracks`, {
          method: 'POST',
          body: JSON.stringify({
            track: { title: 'Song', artist: 'Artist', durationMs: TRACK_MS },
            intensity: 'mod',
          }),
        })
      ).json()) as { id: string }
    ).id;

    const badRpm = await api(`/api/v1/class-tracks/${ctId}`, {
      method: 'PATCH',
      body: JSON.stringify({ displayRpm: 0 }),
    });
    expect(badRpm.status).toBe(422);

    const badHolds = await api(`/api/v1/class-tracks/${ctId}`, {
      method: 'PATCH',
      body: JSON.stringify({ holdCount: -1 }),
    });
    expect(badHolds.status).toBe(422);
  });
});
