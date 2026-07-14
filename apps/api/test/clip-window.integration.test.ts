/**
 * Regression coverage for the clip-window guard: a clip start at/past the track
 * length collapses the effective playback window to zero, which would make the
 * run-payload's `track.durationMs` non-positive and 422 the whole class. The add
 * and patch routes must reject it up front, and a valid window must keep the
 * run-payload loading.
 */
import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
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

  it('rejects an inverted/equal clip window (clipEndMs <= clipStartMs) with a clean 422, not a 500', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const { classId, classTrackId } = await createClassWithTrack(user.cookie);

    // clipEndMs before clipStartMs — a start-vs-length guard passes (both inside the
    // track), so without the cross-field guard this reaches the DB CHECK
    // (clip_end_ms > clip_start_ms) and surfaces as an unhandled 500.
    const inverted = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: 90_000, clipEndMs: 30_000 }),
    });
    expect(inverted.status).toBe(422);
    const invertedBody = (await inverted.json()) as { error: { code: string; message: string } };
    expect(invertedBody.error.code).toBe('VALIDATION_ERROR');
    expect(invertedBody.error.message).toMatch(/clip end/i);

    // A zero-width window (end === start) is equally invalid (CHECK requires strictly >).
    const equal = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: 45_000, clipEndMs: 45_000 }),
    });
    expect(equal.status).toBe(422);
    expect(((await equal.json()) as { error: { code: string } }).error.code).toBe(
      'VALIDATION_ERROR',
    );

    // A partial patch that lowers only clipEndMs below the persisted clipStartMs must
    // also be caught (the guard runs on the merged window, not the patch alone).
    const trimmed = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: 60_000, clipEndMs: 150_000 }),
    });
    expect(trimmed.status).toBe(200);
    const partial = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipEndMs: 30_000 }),
    });
    expect(partial.status).toBe(422);

    // None of the rejected patches persisted, so the run-payload still loads.
    expect((await api(`/api/v1/classes/${classId}/run-payload`)).status).toBe(200);
  });

  it('rejects an add-track with an inverted clip window (clipEndMs <= clipStartMs) with a 422', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Clip invert add test' }),
    });
    const classId = ((await classRes.json()) as { id: string }).id;

    const res = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        track: { title: 'Song', artist: 'Artist', durationMs: TRACK_MS },
        intensity: 'mod',
        clipStartMs: 90_000,
        clipEndMs: 30_000,
      }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toMatch(/clip end/i);

    const trackCount = await env.DB.prepare(
      'SELECT count(*) AS count FROM tracks WHERE owner_user_id = ?',
    )
      .bind(user.userId)
      .first<{ count: number }>();
    expect(trackCount?.count).toBe(0);
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

    const trackCount = await env.DB.prepare(
      'SELECT count(*) AS count FROM tracks WHERE owner_user_id = ?',
    )
      .bind(user.userId)
      .first<{ count: number }>();
    expect(trackCount?.count).toBe(0);
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

  it('run-payload re-bases anchors to the clip start but keeps beat/bar track-relative', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const { classId, classTrackId } = await createClassWithTrack(user.cookie);

    // Trim to [30_000, 120_000) and pin a beat grid: 120 BPM (500ms/beat), downbeat
    // at the track start (beatAnchorMs stays track-relative, i.e. 0), 4/4.
    const set = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        clipStartMs: 30_000,
        clipEndMs: 120_000,
        displayBpmOverride: 120,
        beatAnchorMs: 0,
      }),
    });
    expect(set.status).toBe(200);

    // Place choreography at track-relative anchors inside the window.
    const cue = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 32_000, text: 'Sprint' }),
    });
    expect(cue.status).toBe(201);
    const move = await api(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 90_000, nameOverride: 'Jump' }),
    });
    expect(move.status).toBe(201);

    const payload = (await (await api(`/api/v1/classes/${classId}/run-payload`)).json()) as {
      tracks: Array<{
        clipStartMs: number;
        beatAnchorMs: number;
        track: { durationMs: number };
        cues: Array<{ anchorMs: number; beat: number | null; bar: number | null }>;
        moves: Array<{ anchorMs: number; beat: number | null; bar: number | null }>;
      }>;
    };
    const entry = payload.tracks[0]!;
    expect(entry.clipStartMs).toBe(30_000);
    expect(entry.beatAnchorMs).toBe(0);
    // Effective duration is the clipped window length (120_000 − 30_000).
    expect(entry.track.durationMs).toBe(90_000);

    // anchorMs is emitted clip-relative (track-relative − clipStartMs), but beat/bar
    // are derived from the pre-rebase track-relative anchor + downbeat, so the two
    // stay consistent (a client re-deriving in clip-relative space lands on the same
    // beat index). Cue at 32_000ms → rebased 2_000; index 64 → bar 17, beat 1.
    expect(entry.cues[0]).toMatchObject({ anchorMs: 2_000, beat: 1, bar: 17 });
    // Move at 90_000ms → rebased 60_000; index 180 → bar 46, beat 1.
    expect(entry.moves[0]).toMatchObject({ anchorMs: 60_000, beat: 1, bar: 46 });
  });
});
