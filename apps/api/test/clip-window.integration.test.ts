/**
 * Regression coverage for the clip-window guard: a clip start at/past the track
 * length collapses the effective playback window to zero, which would make the
 * run-payload's `track.durationMs` non-positive and 422 the whole class. The add
 * and patch routes must reject it up front, and a valid window must keep the
 * run-payload loading.
 */
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';

const TRACK_MS = 180_000;

async function createClassWithTrack(
  cookie: string,
): Promise<{ classId: string; classTrackId: string }> {
  const api = authed(cookie);
  const classRes = await api('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title: 'Clip test' }),
  });
  expect(classRes.status).toBe(201);
  const classId = ((await classRes.json()) as { id: string }).id;

  const trackRes = await api(`/api/v1/classes/${classId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({
      track: { title: 'Song', artist: 'Artist', durationMs: TRACK_MS },
      intensity: 'mod',
    }),
  });
  expect(trackRes.status).toBe(201);
  const classTrackId = ((await trackRes.json()) as { id: string }).id;
  return { classId, classTrackId };
}

describe('clip-window guard (integration)', () => {
  it('rejects a PATCH clip start at/past the track length and keeps run-payload healthy', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const { classId, classTrackId } = await createClassWithTrack(user.cookie);

    const bad = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: TRACK_MS }),
    });
    expect(bad.status).toBe(422);
    const body = (await bad.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toMatch(/before the track length/);

    // The bad patch must not have persisted, so the run-payload still loads.
    const payload = await api(`/api/v1/classes/${classId}/run-payload`);
    expect(payload.status).toBe(200);

    // A valid clip window inside the track is accepted.
    const ok = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: 30_000, clipEndMs: 120_000 }),
    });
    expect(ok.status).toBe(200);
    expect((await api(`/api/v1/classes/${classId}/run-payload`)).status).toBe(200);
  });

  it('rejects an add-track clip start at/past the track length', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Clip add test' }),
    });
    const classId = ((await classRes.json()) as { id: string }).id;

    const res = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Song', artist: 'Artist', durationMs: TRACK_MS },
        intensity: 'mod',
        clipStartMs: TRACK_MS + 1,
      }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects cue/move anchors outside a trimmed clip window and accepts one inside', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const { classTrackId } = await createClassWithTrack(user.cookie);

    // Trim to [30_000, 120_000): anchors outside this window would be silently
    // re-based (before start → 0) or land past the clipped end in the run-payload.
    const trim = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: 30_000, clipEndMs: 120_000 }),
    });
    expect(trim.status).toBe(200);

    const postCue = (anchorMs: number) =>
      api(`/api/v1/class-tracks/${classTrackId}/cues`, {
        method: 'POST',
        body: JSON.stringify({ anchorMs, text: 'Sprint' }),
      });
    const postMove = (anchorMs: number) =>
      api(`/api/v1/class-tracks/${classTrackId}/moves`, {
        method: 'POST',
        body: JSON.stringify({ anchorMs, nameOverride: 'Jump' }),
      });

    // Before the clip start.
    const cueBefore = await postCue(10_000);
    expect(cueBefore.status).toBe(422);
    expect(((await cueBefore.json()) as { error: { message: string } }).error.message).toMatch(
      /before the clip start/,
    );

    // Past the clip end.
    const cueAfter = await postCue(150_000);
    expect(cueAfter.status).toBe(422);
    expect(((await cueAfter.json()) as { error: { message: string } }).error.message).toMatch(
      /past the clip end/,
    );

    const moveAfter = await postMove(150_000);
    expect(moveAfter.status).toBe(422);

    // Inside the window is accepted.
    expect((await postCue(60_000)).status).toBe(201);
    expect((await postMove(90_000)).status).toBe(201);
  });
});
