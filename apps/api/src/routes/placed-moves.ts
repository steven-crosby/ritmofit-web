/**
 * Placed-move routes — `class_track_moves` anchored to a class_track. Class-scoped
 * via the `class_track_move → class_track → class` chain; reads VIEW, writes EDIT.
 *
 * Each placement references at most one library source (a global `move` or the
 * caller's `user_move`); with neither, a freeform `nameOverride` is required (the
 * schema invariant). References are also checked to exist / be owned (→ 422).
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { placeClassTrackMoveSchema, updateClassTrackMoveSchema } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireClassTrackAccess, requireClassTrackMoveAccess } from '../lib/authz.js';
import { assertAnchorWithinTrack } from '../lib/anchor.js';
import { buildPatch } from '../lib/patch.js';
import { HttpError } from '../lib/errors.js';
import { serializeClassTrackMove } from '../lib/serialize.js';
import { classTrackMoves, moves, userMoves } from '../db/schema.js';
import type { Db } from '../lib/db.js';

/** A `moveId` must be a known global move; a `userMoveId` must be the caller's own. */
async function assertValidMoveRefs(
  db: Db,
  userId: string,
  moveId: string | null,
  userMoveId: string | null,
): Promise<void> {
  if (moveId != null) {
    const m = await db.select({ id: moves.id }).from(moves).where(eq(moves.id, moveId)).get();
    if (!m) throw new HttpError(422, 'VALIDATION_ERROR', 'moveId does not reference a known move.');
  }
  if (userMoveId != null) {
    const um = await db
      .select({ userId: userMoves.userId })
      .from(userMoves)
      .where(eq(userMoves.id, userMoveId))
      .get();
    if (!um || um.userId !== userId) {
      throw new HttpError(
        422,
        'VALIDATION_ERROR',
        'userMoveId does not reference one of your moves.',
      );
    }
  }
}

export const placedMoveRoutes = new Hono<AppEnv>();
placedMoveRoutes.use('*', requireSession);

/** GET /class-tracks/:id/moves — placements in anchor order (view access). */
placedMoveRoutes.get('/class-tracks/:id/moves', async (c) => {
  const db = createDb(c.env);
  const classTrackId = c.req.param('id');
  await requireClassTrackAccess(db, c.get('userId'), classTrackId, 'view');
  const rows = await db
    .select()
    .from(classTrackMoves)
    .where(eq(classTrackMoves.classTrackId, classTrackId))
    .orderBy(classTrackMoves.anchorMs)
    .all();
  return c.json(rows.map(serializeClassTrackMove));
});

/** POST /class-tracks/:id/moves — place a move (edit access). */
placedMoveRoutes.post('/class-tracks/:id/moves', async (c) => {
  const db = createDb(c.env);
  const classTrackId = c.req.param('id');
  const me = c.get('userId');
  await requireClassTrackAccess(db, me, classTrackId, 'edit');
  const body = placeClassTrackMoveSchema.parse(await c.req.json());

  const moveId = body.moveId ?? null;
  const userMoveId = body.userMoveId ?? null;
  await assertValidMoveRefs(db, me, moveId, userMoveId);
  await assertAnchorWithinTrack(db, classTrackId, body.anchorMs);

  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    classTrackId,
    anchorMs: body.anchorMs,
    moveId,
    userMoveId,
    nameOverride: body.nameOverride ?? null,
    intensity: body.intensity ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(classTrackMoves).values(row);
  return c.json(serializeClassTrackMove(row), 201);
});

/** PATCH /class-track-moves/:id — update a placement (edit access). */
placedMoveRoutes.patch('/class-track-moves/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const me = c.get('userId');
  const { classTrackId } = await requireClassTrackMoveAccess(db, me, id, 'edit');
  const body = updateClassTrackMoveSchema.parse(await c.req.json());

  const existing = await db.select().from(classTrackMoves).where(eq(classTrackMoves.id, id)).get();
  // Merge patch over the existing row, then re-validate the invariant on the result
  // (a partial patch can't be checked in isolation).
  const merged = {
    anchorMs: 'anchorMs' in body ? body.anchorMs! : existing!.anchorMs,
    moveId: 'moveId' in body ? (body.moveId ?? null) : existing!.moveId,
    userMoveId: 'userMoveId' in body ? (body.userMoveId ?? null) : existing!.userMoveId,
    nameOverride: 'nameOverride' in body ? (body.nameOverride ?? null) : existing!.nameOverride,
    intensity: 'intensity' in body ? (body.intensity ?? null) : existing!.intensity,
  };
  placeClassTrackMoveSchema.parse(merged);
  await assertValidMoveRefs(db, me, merged.moveId, merged.userMoveId);
  await assertAnchorWithinTrack(db, classTrackId, merged.anchorMs);

  await db.update(classTrackMoves).set(buildPatch(merged)).where(eq(classTrackMoves.id, id));
  const row = await db.select().from(classTrackMoves).where(eq(classTrackMoves.id, id)).get();
  return c.json(serializeClassTrackMove(row!));
});

/** DELETE /class-track-moves/:id — remove a placement (edit access). */
placedMoveRoutes.delete('/class-track-moves/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireClassTrackMoveAccess(db, c.get('userId'), id, 'edit');
  await db.delete(classTrackMoves).where(eq(classTrackMoves.id, id));
  return c.body(null, 204);
});
