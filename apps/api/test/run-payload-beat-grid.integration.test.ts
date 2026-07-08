/**
 * Regression coverage for the run-payload's pre-downbeat beat/bar clamp. A track's
 * downbeat (`beatAnchorMs`) can sit *after* the track start — modeling an intro /
 * pickup before beat 1 of bar 1. Choreography placed inside that intro lands in a
 * bar ≤ 0, which has no meaningful label, so `assembleRunPayload` emits
 * `{ beat: null, bar: null }` for it (the `p.bar >= 1` guard in run-payload.ts).
 *
 * Every other beat/bar test uses `beatAnchorMs: 0` with forward anchors, so the
 * false branch of that guard is otherwise unexercised: without it, a pre-downbeat
 * cue would surface a garbage `bar: 0` in Live mode. The positive control (a cue on
 * the downbeat → bar 1) keeps a future tempo/grid regression from turning the null
 * into a false pass.
 */
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';

const TRACK_MS = 180_000;
// 120 BPM → 500ms/beat, 4/4. Downbeat sits 4s into the track (a pre-beat intro).
const BEAT_ANCHOR_MS = 4_000;

describe('run-payload pre-downbeat beat/bar clamp (integration)', () => {
  it('emits null beat/bar for a cue before the first downbeat, real bar/beat on it', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const classRes = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Pre-downbeat grid' }),
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

    // Pin the grid: 120 BPM, downbeat at 4s (no clip, so anchors stay track-relative).
    const grid = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ displayBpmOverride: 120, beatAnchorMs: BEAT_ANCHOR_MS }),
    });
    expect(grid.status).toBe(200);
    expect((await grid.json()).beatAnchorMs).toBe(BEAT_ANCHOR_MS);

    // Cue at 2s: beat index round((2000 − 4000) / 500) = −4 → bar 0 (one full bar
    // before bar 1). No bar label exists there → null beat/bar in the run-payload.
    const preDownbeat = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 2_000, text: 'Intro' }),
    });
    expect(preDownbeat.status).toBe(201);

    // Positive control — cue on the downbeat (4s): index 0 → bar 1, beat 1. Proves
    // the grid is live, so the null above is specifically the pre-downbeat clamp.
    const onDownbeat = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: BEAT_ANCHOR_MS, text: 'Bar 1' }),
    });
    expect(onDownbeat.status).toBe(201);

    const payload = (await (await api(`/api/v1/classes/${classId}/run-payload`)).json()) as {
      tracks: Array<{
        displayBpm: number | null;
        beatAnchorMs: number;
        cues: Array<{ anchorMs: number; beat: number | null; bar: number | null }>;
      }>;
    };
    const entry = payload.tracks[0]!;
    expect(entry.displayBpm).toBe(120);
    expect(entry.beatAnchorMs).toBe(BEAT_ANCHOR_MS);

    // Cues are emitted in anchor order: [2000 (pre-downbeat), 4000 (downbeat)].
    expect(entry.cues.map((cue) => cue.anchorMs)).toEqual([2_000, BEAT_ANCHOR_MS]);
    // Pre-downbeat cue: anchor preserved, beat/bar clamped to null (bar 0 has no label).
    expect(entry.cues[0]).toMatchObject({ anchorMs: 2_000, beat: null, bar: null });
    // On the downbeat: the first real bar/beat.
    expect(entry.cues[1]).toMatchObject({ anchorMs: BEAT_ANCHOR_MS, beat: 1, bar: 1 });
  });
});
