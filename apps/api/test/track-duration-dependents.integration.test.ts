/**
 * A library track's duration is inherited by every class_track without an override.
 * Correcting that shared duration must not collapse an existing clipped placement to
 * zero and make the class's run-payload fail response validation.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { authed, signUpUser, type TestUser } from './helpers.js';
import { createDb } from '../src/lib/db.js';
import { assertAnchorWithinTrack, throwAnchorWriteConflict } from '../src/lib/anchor.js';
import { cues, tracks } from '../src/db/schema.js';
import { insertCueWithinCurrentTrack } from '../src/routes/cues.js';

const choreographyCases = [
  { kind: 'cue', collection: 'cues', itemRoute: 'cues', fields: { text: 'Push' } },
  {
    kind: 'move',
    collection: 'moves',
    itemRoute: 'class-track-moves',
    fields: { nameOverride: 'Sprint' },
  },
] as const;

async function createPlacement(
  api: ReturnType<typeof authed>,
  label: string,
): Promise<{ classId: string; classTrackId: string; trackId: string }> {
  const track = await api('/api/v1/tracks', {
    method: 'POST',
    body: JSON.stringify({ title: `${label} track`, artist: 'Artist', durationMs: 180_000 }),
  });
  expect(track.status).toBe(201);
  const trackId = ((await track.json()) as { id: string }).id;

  const cls = await api('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title: `${label} class` }),
  });
  expect(cls.status).toBe(201);
  const classId = ((await cls.json()) as { id: string }).id;

  const placement = await api(`/api/v1/classes/${classId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ trackId }),
  });
  expect(placement.status).toBe(201);
  const classTrackId = ((await placement.json()) as { id: string }).id;
  return { classId, classTrackId, trackId };
}

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

    const cue = await api(`/api/v1/class-tracks/${classTrackId}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 100_000, text: 'Override-backed cue' }),
    });
    expect(cue.status).toBe(201);
    const move = await api(`/api/v1/class-tracks/${classTrackId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 100_000, nameOverride: 'Override-backed move' }),
    });
    expect(move.status).toBe(201);

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

describe('library-track duration choreography bounds', () => {
  it('rejects a cue write when a duration shrink makes its preflight read stale', async () => {
    const owner = await signUpUser();
    const api = authed(owner.cookie);
    const { classTrackId, trackId } = await createPlacement(api, 'stale preflight');
    const db = createDb(env);
    const anchorMs = 60_000;

    // Simulate the request's precise-message preflight on the original duration,
    // then serialize the competing shrink before its authoritative write.
    await assertAnchorWithinTrack(db, classTrackId, anchorMs);
    await db.update(tracks).set({ durationMs: anchorMs }).where(eq(tracks.id, trackId));

    const now = Date.now();
    const cueId = crypto.randomUUID();
    const inserted = await insertCueWithinCurrentTrack(db, {
      id: cueId,
      classTrackId,
      anchorMs,
      beat: null,
      bar: null,
      text: 'Must not persist',
      color: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(inserted).toEqual([]);
    expect(await db.select().from(cues).where(eq(cues.id, cueId)).get()).toBeUndefined();
  });

  it.each(choreographyCases)(
    'rejects a duration whose exclusive end lands on an inherited $kind',
    async ({ collection, fields }) => {
      const owner = await signUpUser();
      const api = authed(owner.cookie);

      const track = await api('/api/v1/tracks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Anchored duration source',
          artist: 'Artist',
          durationMs: 180_000,
        }),
      });
      expect(track.status).toBe(201);
      const trackId = ((await track.json()) as { id: string }).id;

      const cls = await api('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Anchored dependent placement' }),
      });
      expect(cls.status).toBe(201);
      const classId = ((await cls.json()) as { id: string }).id;

      const placement = await api(`/api/v1/classes/${classId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ trackId }),
      });
      expect(placement.status).toBe(201);
      const classTrackId = ((await placement.json()) as { id: string }).id;

      const choreography = await api(`/api/v1/class-tracks/${classTrackId}/${collection}`, {
        method: 'POST',
        body: JSON.stringify({ anchorMs: 60_000, ...fields }),
      });
      expect(choreography.status).toBe(201);

      const shrink = await api(`/api/v1/tracks/${trackId}`, {
        method: 'PATCH',
        body: JSON.stringify({ durationMs: 60_000 }),
      });
      expect(shrink.status).toBe(422);
      expect(((await shrink.json()) as { error: { message: string } }).error.message).toContain(
        'clip start, cue, or move',
      );

      const persisted = await api(`/api/v1/tracks/${trackId}`);
      expect(persisted.status).toBe(200);
      expect(((await persisted.json()) as { durationMs: number }).durationMs).toBe(180_000);

      const validShrink = await api(`/api/v1/tracks/${trackId}`, {
        method: 'PATCH',
        body: JSON.stringify({ durationMs: 60_001 }),
      });
      expect(validShrink.status).toBe(200);

      const payload = await api(`/api/v1/classes/${classId}/run-payload`);
      expect(payload.status).toBe(200);
      const payloadTrack = (
        (await payload.json()) as {
          tracks: Array<{
            track: { durationMs: number };
            cues: Array<{ id: string; anchorMs: number }>;
            moves: Array<{ id: string; anchorMs: number }>;
          }>;
        }
      ).tracks[0]!;
      expect(payloadTrack.track.durationMs).toBe(60_001);
      expect(
        [...payloadTrack.cues, ...payloadTrack.moves].some((item) => item.anchorMs === 60_000),
      ).toBe(true);
    },
  );

  it.each(choreographyCases)(
    'rejects an inherited $kind create and anchor update after the duration shrinks first',
    async ({ collection, itemRoute, fields }) => {
      const owner = await signUpUser();
      const api = authed(owner.cookie);
      const { classId, classTrackId, trackId } = await createPlacement(
        api,
        `duration-first ${collection}`,
      );

      const shrink = await api(`/api/v1/tracks/${trackId}`, {
        method: 'PATCH',
        body: JSON.stringify({ durationMs: 60_000 }),
      });
      expect(shrink.status).toBe(200);

      const atEnd = await api(`/api/v1/class-tracks/${classTrackId}/${collection}`, {
        method: 'POST',
        body: JSON.stringify({ anchorMs: 60_000, ...fields }),
      });
      expect(atEnd.status).toBe(422);
      expect(((await atEnd.json()) as { error: { message: string } }).error.message).toMatch(
        /before the clip end/,
      );

      const interior = await api(`/api/v1/class-tracks/${classTrackId}/${collection}`, {
        method: 'POST',
        body: JSON.stringify({ anchorMs: 30_000, ...fields }),
      });
      expect(interior.status).toBe(201);
      const itemId = ((await interior.json()) as { id: string }).id;

      const updateAtEnd = await api(`/api/v1/${itemRoute}/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ anchorMs: 60_000 }),
      });
      expect(updateAtEnd.status).toBe(422);

      const persisted = await api(`/api/v1/class-tracks/${classTrackId}/${collection}`);
      expect(persisted.status).toBe(200);
      expect((await persisted.json()) as Array<{ id: string; anchorMs: number }>).toEqual([
        expect.objectContaining({ id: itemId, anchorMs: 30_000 }),
      ]);

      const updateInside = await api(`/api/v1/${itemRoute}/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ anchorMs: 59_999 }),
      });
      expect(updateInside.status).toBe(200);
      expect(((await updateInside.json()) as { anchorMs: number }).anchorMs).toBe(59_999);
      expect((await api(`/api/v1/classes/${classId}/run-payload`)).status).toBe(200);
    },
  );

  it.each(choreographyCases)(
    'rejects the duration shrink after an inherited $kind anchor update serializes first',
    async ({ collection, itemRoute, fields }) => {
      const owner = await signUpUser();
      const api = authed(owner.cookie);
      const { classId, classTrackId, trackId } = await createPlacement(
        api,
        `anchor-first ${collection}`,
      );

      const created = await api(`/api/v1/class-tracks/${classTrackId}/${collection}`, {
        method: 'POST',
        body: JSON.stringify({ anchorMs: 30_000, ...fields }),
      });
      expect(created.status).toBe(201);
      const itemId = ((await created.json()) as { id: string }).id;

      const moved = await api(`/api/v1/${itemRoute}/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ anchorMs: 60_000 }),
      });
      expect(moved.status).toBe(200);

      const shrink = await api(`/api/v1/tracks/${trackId}`, {
        method: 'PATCH',
        body: JSON.stringify({ durationMs: 60_000 }),
      });
      expect(shrink.status).toBe(422);

      const persisted = await api(`/api/v1/tracks/${trackId}`);
      expect(persisted.status).toBe(200);
      expect(((await persisted.json()) as { durationMs: number }).durationMs).toBe(180_000);
      expect((await api(`/api/v1/classes/${classId}/run-payload`)).status).toBe(200);
    },
  );

  it('maps a zero-row write whose anchor is valid again to an explicit retryable conflict', async () => {
    const owner = await signUpUser();
    const api = authed(owner.cookie);
    const { classTrackId } = await createPlacement(api, 'retry conflict');

    await expect(
      throwAnchorWriteConflict(createDb(env), classTrackId, 30_000),
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringMatching(/retry/i),
    });
  });
});
