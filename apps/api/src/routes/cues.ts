/**
 * Cue routes — coaching prompts anchored to a class_track. Class-scoped via the
 * `cue → class_track → class` chain; reads need VIEW, writes need EDIT.
 */
import { Hono } from 'hono';
import { and, asc, eq, exists, max, sql } from 'drizzle-orm';
import { createCueSchema, updateCueSchema } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireClassTrackAccess, requireCueAccess } from '../lib/authz.js';
import {
  anchorWithinTrackWhere,
  assertAnchorWithinTrack,
  throwAnchorWriteConflict,
} from '../lib/anchor.js';
import { buildPatch } from '../lib/patch.js';
import { cueNote, nextCuePosition } from '../lib/cue-order.js';
import { serializeCue } from '../lib/serialize.js';
import { classTracks, cues, tracks } from '../db/schema.js';
import { touchClassTrackParentUpdatedAt } from '../lib/class-recency.js';
import type { Db } from '../lib/db.js';

export const cueRoutes = new Hono<AppEnv>();

/**
 * Persist a cue only while its inherited track window still contains the
 * anchor. Keeping the exact production statement callable also lets the race
 * regression test simulate a preflight read that became stale before write.
 */
export async function insertCueWithinCurrentTrack(
  db: Db,
  row: typeof cues.$inferInsert,
): Promise<(typeof cues.$inferSelect)[]> {
  return db
    .insert(cues)
    .select(
      db
        .select({
          id: sql<string>`${row.id}`.as('id'),
          classTrackId: classTracks.id,
          position: sql<number>`${row.position ?? 0}`.as('position'),
          anchorMs: sql<number>`${row.anchorMs}`.as('anchor_ms'),
          beat: sql<number | null>`${row.beat}`.as('beat'),
          bar: sql<number | null>`${row.bar}`.as('bar'),
          text: sql<string>`${row.text}`.as('text'),
          durationMs: sql<number | null>`${row.durationMs ?? null}`.as('duration_ms'),
          bpm: sql<number | null>`${row.bpm ?? null}`.as('bpm'),
          intensity: sql<string | null>`${row.intensity ?? null}`.as('intensity'),
          note: sql<string | null>`${row.note ?? null}`.as('note'),
          color: sql<string | null>`${row.color}`.as('color'),
          createdAt: sql<number>`${row.createdAt}`.as('created_at'),
          updatedAt: sql<number>`${row.updatedAt}`.as('updated_at'),
        })
        .from(classTracks)
        .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
        .where(anchorWithinTrackWhere(row.classTrackId, row.anchorMs)),
    )
    .returning();
}
cueRoutes.use('*', requireSession);

/** GET /class-tracks/:id/cues — cues for a class_track, teaching order (view access). */
cueRoutes.get('/class-tracks/:id/cues', async (c) => {
  const db = createDb(c.env);
  const classTrackId = c.req.param('id');
  await requireClassTrackAccess(db, c.get('userId'), classTrackId, 'view');
  const rows = await db
    .select()
    .from(cues)
    .where(eq(cues.classTrackId, classTrackId))
    .orderBy(asc(cues.position), asc(cues.anchorMs), asc(cues.createdAt))
    .all();
  return c.json(rows.map(serializeCue));
});

/** POST /class-tracks/:id/cues — create a cue (edit access). */
cueRoutes.post('/class-tracks/:id/cues', async (c) => {
  const db = createDb(c.env);
  const classTrackId = c.req.param('id');
  await requireClassTrackAccess(db, c.get('userId'), classTrackId, 'edit');
  const body = createCueSchema.parse(await c.req.json());
  await assertAnchorWithinTrack(db, classTrackId, body.anchorMs);

  const now = Date.now();
  const current = await db
    .select({ maxPosition: max(cues.position) })
    .from(cues)
    .where(eq(cues.classTrackId, classTrackId))
    .get();
  const row = {
    id: crypto.randomUUID(),
    classTrackId,
    position: nextCuePosition(current?.maxPosition ?? null),
    anchorMs: body.anchorMs,
    beat: body.beat ?? null,
    bar: body.bar ?? null,
    text: body.text,
    durationMs: body.durationMs ?? null,
    bpm: body.bpm ?? null,
    intensity: body.intensity ?? null,
    note: cueNote(body.note),
    color: body.color ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const inserted = await insertCueWithinCurrentTrack(db, row);
  if (inserted.length === 0) {
    await throwAnchorWriteConflict(db, classTrackId, body.anchorMs);
  }
  await touchClassTrackParentUpdatedAt(db, classTrackId);
  return c.json(serializeCue(inserted[0]!), 201);
});

/** PATCH /cues/:id — update a cue (edit access). */
cueRoutes.patch('/cues/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classTrackId } = await requireCueAccess(db, c.get('userId'), id, 'edit');
  const parsed = updateCueSchema.parse(await c.req.json());
  const body = 'note' in parsed ? { ...parsed, note: cueNote(parsed.note) } : parsed;
  if ('anchorMs' in body) await assertAnchorWithinTrack(db, classTrackId, body.anchorMs!);

  let updated: (typeof cues.$inferSelect)[];
  if ('anchorMs' in body) {
    const validParent = db
      .select({ id: classTracks.id })
      .from(classTracks)
      .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
      .where(anchorWithinTrackWhere(classTrackId, body.anchorMs!));
    updated = await db
      .update(cues)
      .set(buildPatch(body))
      .where(and(eq(cues.id, id), exists(validParent)))
      .returning();
    if (updated.length === 0) {
      await throwAnchorWriteConflict(db, classTrackId, body.anchorMs!);
    }
  } else {
    updated = await db.update(cues).set(buildPatch(body)).where(eq(cues.id, id)).returning();
  }
  await touchClassTrackParentUpdatedAt(db, classTrackId);
  return c.json(serializeCue(updated[0]!));
});

/** DELETE /cues/:id — remove a cue (edit access). */
cueRoutes.delete('/cues/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classTrackId } = await requireCueAccess(db, c.get('userId'), id, 'edit');
  await db.delete(cues).where(eq(cues.id, id));
  await touchClassTrackParentUpdatedAt(db, classTrackId);
  return c.body(null, 204);
});
