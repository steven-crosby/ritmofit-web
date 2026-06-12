/**
 * Class-track routes — placing/editing/reordering/copying tracks within a class.
 * Add/list/reorder hang off `/classes/:id/...`; item ops off `/class-tracks/:id`.
 * Every handler resolves the parent class and gates via `requireAccess`.
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import {
  addClassTrackSchema,
  updateClassTrackSchema,
  reorderClassTracksSchema,
  copyClassTrackSchema,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireAccess, requireClassTrackAccess, AccessError } from '../lib/authz.js';
import { HttpError } from '../lib/errors.js';
import { serializeClassTrack } from '../lib/serialize.js';
import { resequence } from '../lib/sequencing.js';
import { classTracks, tracks, cues, classTrackMoves } from '../db/schema.js';

export const classTrackRoutes = new Hono<AppEnv>();
classTrackRoutes.use('*', requireSession);

/**
 * POST /classes/:id/tracks — add a track to a class (edit access). Body either
 * references an existing track the caller owns, or inline-creates one (owner =
 * caller). Appends at the end; position/offset are server-derived via resequence.
 */
classTrackRoutes.post('/classes/:id/tracks', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  const me = c.get('userId');
  await requireAccess(db, me, classId, 'edit');
  const body = addClassTrackSchema.parse(await c.req.json());

  let trackId: string;
  if ('trackId' in body) {
    // Reference an existing track — must be in the caller's library (D4).
    const t = await db
      .select({ ownerUserId: tracks.ownerUserId })
      .from(tracks)
      .where(eq(tracks.id, body.trackId))
      .get();
    if (!t || t.ownerUserId !== me) {
      throw new AccessError(404, 'NOT_FOUND', 'Not found.');
    }
    trackId = body.trackId;
  } else {
    // Inline-create a track owned by the caller (same shape as POST /tracks, step 8).
    const now = Date.now();
    trackId = crypto.randomUUID();
    await db.insert(tracks).values({
      id: trackId,
      ownerUserId: me,
      title: body.track.title,
      artist: body.track.artist,
      albumArtUrl: body.track.albumArtUrl ?? null,
      durationMs: body.track.durationMs ?? null,
      displayBpm: body.track.displayBpm ?? null,
      isrc: body.track.isrc ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const existing = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .all();

  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(classTracks).values({
    id,
    classId,
    trackId,
    position: existing.length,
    intensity: body.intensity ?? 'none',
    displayBpmOverride: body.displayBpmOverride ?? null,
    startOffsetMs: null,
    notes: body.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await resequence(db, classId);

  const row = await db.select().from(classTracks).where(eq(classTracks.id, id)).get();
  return c.json(serializeClassTrack(row!), 201);
});

/** GET /classes/:id/tracks — class_tracks in position order (view access). */
classTrackRoutes.get('/classes/:id/tracks', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'view');
  const rows = await db
    .select()
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();
  return c.json(rows.map(serializeClassTrack));
});

/**
 * POST /classes/:id/tracks/reorder — set the complete new ordering (edit access).
 * The id list must be exactly the class's current class_tracks (a permutation).
 */
classTrackRoutes.post('/classes/:id/tracks/reorder', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'edit');
  const { classTrackIds } = reorderClassTracksSchema.parse(await c.req.json());

  const current = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .all();
  const currentIds = new Set(current.map((r) => r.id));
  const requested = new Set(classTrackIds);
  const isPermutation =
    classTrackIds.length === currentIds.size &&
    requested.size === classTrackIds.length &&
    classTrackIds.every((id) => currentIds.has(id));
  if (!isPermutation) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      "classTrackIds must be exactly this class's class_tracks, with no duplicates.",
    );
  }

  await resequence(db, classId, classTrackIds);
  const rows = await db
    .select()
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();
  return c.json(rows.map(serializeClassTrack));
});

/** PATCH /class-tracks/:id — intensity / bpm override / notes (edit access). */
classTrackRoutes.patch('/class-tracks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireClassTrackAccess(db, c.get('userId'), id, 'edit');
  const body = updateClassTrackSchema.parse(await c.req.json());

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if ('intensity' in body) patch.intensity = body.intensity;
  if ('displayBpmOverride' in body) patch.displayBpmOverride = body.displayBpmOverride ?? null;
  if ('notes' in body) patch.notes = body.notes ?? null;

  await db.update(classTracks).set(patch).where(eq(classTracks.id, id));
  const row = await db.select().from(classTracks).where(eq(classTracks.id, id)).get();
  return c.json(serializeClassTrack(row!));
});

/** DELETE /class-tracks/:id — remove from the class (edit access); cues/moves cascade. */
classTrackRoutes.delete('/class-tracks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classId } = await requireClassTrackAccess(db, c.get('userId'), id, 'edit');
  await db.delete(classTracks).where(eq(classTracks.id, id));
  await resequence(db, classId);
  return c.body(null, 204);
});

/**
 * POST /class-tracks/:id/copy — duplicate this class_track, with its cues and
 * placed moves, into a target class (D7). Requires edit on both source and target.
 */
classTrackRoutes.post('/class-tracks/:id/copy', async (c) => {
  const db = createDb(c.env);
  const sourceId = c.req.param('id');
  const me = c.get('userId');
  await requireClassTrackAccess(db, me, sourceId, 'edit');
  const { targetClassId } = copyClassTrackSchema.parse(await c.req.json());
  await requireAccess(db, me, targetClassId, 'edit');

  const source = await db.select().from(classTracks).where(eq(classTracks.id, sourceId)).get();
  const sourceCues = await db.select().from(cues).where(eq(cues.classTrackId, sourceId)).all();
  const sourceMoves = await db
    .select()
    .from(classTrackMoves)
    .where(eq(classTrackMoves.classTrackId, sourceId))
    .all();
  const targetExisting = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, targetClassId))
    .all();

  const now = Date.now();
  const newId = crypto.randomUUID();
  const statements = [
    db.insert(classTracks).values({
      ...source!,
      id: newId,
      classId: targetClassId,
      position: targetExisting.length,
      startOffsetMs: null,
      createdAt: now,
      updatedAt: now,
    }),
    ...sourceCues.map((cue) =>
      db.insert(cues).values({ ...cue, id: crypto.randomUUID(), classTrackId: newId, createdAt: now, updatedAt: now }),
    ),
    ...sourceMoves.map((move) =>
      db
        .insert(classTrackMoves)
        .values({ ...move, id: crypto.randomUUID(), classTrackId: newId, createdAt: now, updatedAt: now }),
    ),
  ];
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
  await resequence(db, targetClassId);

  const row = await db.select().from(classTracks).where(eq(classTracks.id, newId)).get();
  return c.json(serializeClassTrack(row!), 201);
});
