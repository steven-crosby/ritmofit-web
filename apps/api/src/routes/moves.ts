/**
 * Moves-library routes — the global seeded library (read-only) and the caller's
 * custom `user_moves`. user_moves are **owner-scoped** (a simple `user_id == me`
 * check, NOT requireAccess — authorization.md §Non-class).
 */
import { Hono } from 'hono';
import { and, eq, isNull, type SQL } from 'drizzle-orm';
import {
  createUserMoveSchema,
  updateUserMoveSchema,
  moveListQuerySchema,
  type SongByMove,
  type SongByMovePlacement,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { buildPatch } from '../lib/patch.js';
import { serializeMove, serializeUserMove, serializeSongByMove } from '../lib/serialize.js';
import { moves, userMoves, classTrackMoves, classTracks, classes, tracks } from '../db/schema.js';
import type { Db } from '../lib/db.js';

/** A `baseMoveId` link must reference a known global move. */
async function assertValidBaseMove(db: Db, baseMoveId: string | null): Promise<void> {
  if (baseMoveId == null) return;
  const m = await db.select({ id: moves.id }).from(moves).where(eq(moves.id, baseMoveId)).get();
  if (!m)
    throw new HttpError(422, 'VALIDATION_ERROR', 'baseMoveId does not reference a known move.');
}

/**
 * Reverse "songs by move" lookup: every placement of `moveCond` across the
 * caller's **own** classes, grouped by track. The `classes.owner_user_id = me`
 * filter is the authorization gate — only the caller's classes are ever joined,
 * so no other user's choreography can leak (authorization.md §Non-class). A track
 * used in several classes collapses to one song with multiple placements; results
 * order by track title, then class title, then anchor for a stable, scannable list.
 */
async function songsByMove(db: Db, ownerUserId: string, moveCond: SQL): Promise<SongByMove[]> {
  const rows = await db
    .select({
      track: tracks,
      classId: classes.id,
      classTitle: classes.title,
      classTrackId: classTracks.id,
      anchorMs: classTrackMoves.anchorMs,
      intensity: classTrackMoves.intensity,
    })
    .from(classTrackMoves)
    .innerJoin(classTracks, eq(classTrackMoves.classTrackId, classTracks.id))
    .innerJoin(classes, eq(classTracks.classId, classes.id))
    .innerJoin(tracks, eq(classTracks.trackId, tracks.id))
    .where(and(moveCond, eq(classes.ownerUserId, ownerUserId)))
    .orderBy(tracks.title, classes.title, classTrackMoves.anchorMs)
    .all();

  // Group by track id, preserving the query's ordering (first sight wins).
  const byTrack = new Map<
    string,
    { track: (typeof rows)[number]['track']; placements: SongByMovePlacement[] }
  >();
  for (const r of rows) {
    let group = byTrack.get(r.track.id);
    if (!group) {
      group = { track: r.track, placements: [] };
      byTrack.set(r.track.id, group);
    }
    group.placements.push({
      classId: r.classId,
      classTitle: r.classTitle,
      classTrackId: r.classTrackId,
      anchorMs: r.anchorMs,
      intensity: r.intensity,
    });
  }
  return [...byTrack.values()].map((g) => serializeSongByMove(g.track, g.placements));
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

/**
 * GET /moves/:id/songs — the caller's songs choreographed with this global move.
 * Owner-scoped to the caller's classes (see `songsByMove`); a global move always
 * exists, so an unused one simply returns `[]`.
 */
moveRoutes.get('/moves/:id/songs', async (c) => {
  const db = createDb(c.env);
  const moveId = c.req.param('id');
  return c.json(await songsByMove(db, c.get('userId'), eq(classTrackMoves.moveId, moveId)));
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

/**
 * GET /user-moves/:id/songs — the caller's songs choreographed with this custom
 * move. Owner-scoped: 404 if the caller doesn't own the move (don't reveal that
 * another user's move exists), then the same owner-scoped placement lookup.
 */
moveRoutes.get('/user-moves/:id/songs', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const me = c.get('userId');
  const owned = await db
    .select({ id: userMoves.id })
    .from(userMoves)
    .where(and(eq(userMoves.id, id), eq(userMoves.userId, me)))
    .get();
  if (!owned) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  return c.json(await songsByMove(db, me, eq(classTrackMoves.userMoveId, id)));
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
