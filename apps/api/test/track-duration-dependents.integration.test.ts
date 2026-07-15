/**
 * A library track's duration is inherited by every class_track without an override.
 * Correcting that shared duration must not collapse an existing clipped placement to
 * zero and make the class's run-payload fail response validation.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, signUpUser, type TestUser } from './helpers.js';

describe('library-track duration dependent placements', () => {
  let owner: TestUser;
  let api: ReturnType<typeof authed>;
  let classId: string;
  let classTrackId: string;
  let trackId: string;

  beforeAll(async () => {
    owner = await signUpUser();
    api = authed(owner.cookie);

    const track = await api('/api/v1/tracks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Duration source', artist: 'Artist', durationMs: 180_000 }),
    });
    expect(track.status).toBe(201);
    trackId = ((await track.json()) as { id: string }).id;

    const cls = await api('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Dependent placement' }),
    });
    expect(cls.status).toBe(201);
    classId = ((await cls.json()) as { id: string }).id;

    const placement = await api(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId }),
    });
    expect(placement.status).toBe(201);
    classTrackId = ((await placement.json()) as { id: string }).id;
  });

  it('rejects a duration shrink that would collapse an inherited clipped placement', async () => {
    const clipped = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ clipStartMs: 60_000 }),
    });
    expect(clipped.status).toBe(200);

    const shrink = await api(`/api/v1/tracks/${trackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMs: 30_000 }),
    });
    expect(shrink.status).toBe(422);
    expect(((await shrink.json()) as { error: { message: string } }).error.message).toContain(
      'clipped class placement',
    );

    const persisted = await api(`/api/v1/tracks/${trackId}`);
    expect(persisted.status).toBe(200);
    expect(((await persisted.json()) as { durationMs: number }).durationMs).toBe(180_000);

    const payload = await api(`/api/v1/classes/${classId}/run-payload`);
    expect(payload.status).toBe(200);
    expect(
      ((await payload.json()) as { tracks: Array<{ track: { durationMs: number } }> }).tracks[0]
        ?.track.durationMs,
    ).toBe(120_000);
  });

  it('allows a library correction when the placement has its own valid duration override', async () => {
    const overridden = await api(`/api/v1/class-tracks/${classTrackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMsOverride: 120_000, clipStartMs: 60_000 }),
    });
    expect(overridden.status).toBe(200);

    const shrink = await api(`/api/v1/tracks/${trackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMs: 30_000 }),
    });
    expect(shrink.status).toBe(200);
    expect(((await shrink.json()) as { durationMs: number }).durationMs).toBe(30_000);

    const payload = await api(`/api/v1/classes/${classId}/run-payload`);
    expect(payload.status).toBe(200);
    expect(
      ((await payload.json()) as { tracks: Array<{ track: { durationMs: number } }> }).tracks[0]
        ?.track.durationMs,
    ).toBe(60_000);
  });
});
