/**
 * Cue routes — coaching prompts anchored to a class_track. Class-scoped via the
 * `cue → class_track → class` chain; reads need VIEW, writes need EDIT.
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createCueSchema, updateCueSchema } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireClassTrackAccess, requireCueAccess } from '../lib/authz.js';
import { assertAnchorWithinTrack } from '../lib/anchor.js';
import { buildPatch } from '../lib/patch.js';
import { serializeCue } from '../lib/serialize.js';
import { cues } from '../db/schema.js';
import { touchClassTrackParentUpdatedAt } from '../lib/class-recency.js';

export const cueRoutes = new Hono<AppEnv>();
cueRoutes.use('*', requireSession);

/** GET /class-tracks/:id/cues — cues for a class_track, anchor order (view access). */
cueRoutes.get('/class-tracks/:id/cues', async (c) => {
  const db = createDb(c.env);
  const classTrackId = c.req.param('id');
  await requireClassTrackAccess(db, c.get('userId'), classTrackId, 'view');
  const rows = await db
    .select()
    .from(cues)
    .where(eq(cues.classTrackId, classTrackId))
    .orderBy(cues.anchorMs)
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
  const row = {
    id: crypto.randomUUID(),
    classTrackId,
    anchorMs: body.anchorMs,
    beat: body.beat ?? null,
    bar: body.bar ?? null,
    text: body.text,
    color: body.color ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(cues).values(row);
  await touchClassTrackParentUpdatedAt(db, classTrackId);
  return c.json(serializeCue(row), 201);
});

/** PATCH /cues/:id — update a cue (edit access). */
cueRoutes.patch('/cues/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classTrackId } = await requireCueAccess(db, c.get('userId'), id, 'edit');
  const body = updateCueSchema.parse(await c.req.json());
  if ('anchorMs' in body) await assertAnchorWithinTrack(db, classTrackId, body.anchorMs!);

  await db.update(cues).set(buildPatch(body)).where(eq(cues.id, id));
  await touchClassTrackParentUpdatedAt(db, classTrackId);
  const row = await db.select().from(cues).where(eq(cues.id, id)).get();
  return c.json(serializeCue(row!));
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
