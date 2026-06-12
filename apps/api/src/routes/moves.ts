/**
 * Moves-library routes — the global seeded library (read-only) and the caller's
 * custom `user_moves`. user_moves are **owner-scoped** (a simple `user_id == me`
 * check, NOT requireAccess — authorization.md §Non-class).
 */
import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import {
  createUserMoveSchema,
  updateUserMoveSchema,
  moveListQuerySchema,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { buildPatch } from '../lib/patch.js';
import { serializeMove, serializeUserMove } from '../lib/serialize.js';
import { moves, userMoves, classTrackMoves } from '../db/schema.js';
import type { Db } from '../lib/db.js';

/** A `baseMoveId` link must reference a known global move. */
async function assertValidBaseMove(db: Db, baseMoveId: string | null): Promise<void> {
  if (baseMoveId == null) return;
  const m = await db.select({ id: moves.id }).from(moves).where(eq(moves.id, baseMoveId)).get();
  if (!m) throw new HttpError(422, 'VALIDATION_ERROR', 'baseMoveId does not reference a known move.');
}

export const moveRoutes = new Hono<AppEnv>();
moveRoutes.use('*', requireSession);

/** GET /moves?template=cycle — the global library, optionally filtered by template. */
moveRoutes.get('/moves', async (c) => {
  const db = createDb(c.env);
  const { template } = moveListQuerySchema.parse(c.req.query());
  const rows = await db
    .select()
    .from(moves)
    .where(template ? eq(moves.template, template) : undefined)
    .orderBy(moves.name)
    .all();
  return c.json(rows.map(serializeMove));
});

/** GET /user-moves — the caller's custom moves. */
moveRoutes.get('/user-moves', async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(userMoves)
    .where(eq(userMoves.userId, c.get('userId')))
    .orderBy(userMoves.name)
    .all();
  return c.json(rows.map(serializeUserMove));
});

/** POST /user-moves — create a custom move owned by the caller. */
moveRoutes.post('/user-moves', async (c) => {
  const db = createDb(c.env);
  const me = c.get('userId');
  const body = createUserMoveSchema.parse(await c.req.json());
  await assertValidBaseMove(db, body.baseMoveId ?? null);

  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    userId: me,
    name: body.name,
    description: body.description ?? null,
    baseMoveId: body.baseMoveId ?? null,
    template: body.template ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(userMoves).values(row);
  return c.json(serializeUserMove(row), 201);
});

/** PATCH /user-moves/:id — update a custom move (owner only). */
moveRoutes.patch('/user-moves/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const me = c.get('userId');
  const owned = await db
    .select({ id: userMoves.id })
    .from(userMoves)
    .where(and(eq(userMoves.id, id), eq(userMoves.userId, me)))
    .get();
  if (!owned) throw new HttpError(404, 'NOT_FOUND', 'Not found.');

  const body = updateUserMoveSchema.parse(await c.req.json());
  if ('baseMoveId' in body) await assertValidBaseMove(db, body.baseMoveId ?? null);

  await db.update(userMoves).set(buildPatch(body)).where(eq(userMoves.id, id));
  const row = await db.select().from(userMoves).where(eq(userMoves.id, id)).get();
  return c.json(serializeUserMove(row!));
});

/**
 * DELETE /user-moves/:id — delete a custom move (owner only).
 *
 * Library-delete safety (schema.md): the FK is `ON DELETE SET NULL` on
 * `class_track_moves.user_move_id`, but the at-most-one CHECK requires a
 * `name_override` when both refs go null. So before deleting, snapshot this
 * move's name into any referencing placement that lacks an override — then the
 * placement survives the SET NULL with its name intact.
 */
moveRoutes.delete('/user-moves/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const me = c.get('userId');
  const move = await db
    .select({ name: userMoves.name })
    .from(userMoves)
    .where(and(eq(userMoves.id, id), eq(userMoves.userId, me)))
    .get();
  if (!move) throw new HttpError(404, 'NOT_FOUND', 'Not found.');

  await db.batch([
    db
      .update(classTrackMoves)
      .set({ nameOverride: move.name, updatedAt: Date.now() })
      .where(and(eq(classTrackMoves.userMoveId, id), isNull(classTrackMoves.nameOverride))),
    db.delete(userMoves).where(eq(userMoves.id, id)),
  ]);
  return c.body(null, 204);
});
