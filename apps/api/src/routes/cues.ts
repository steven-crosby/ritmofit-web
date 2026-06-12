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
import { serializeCue } from '../lib/serialize.js';
import { cues } from '../db/schema.js';

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
  return c.json(serializeCue(row), 201);
});

/** PATCH /cues/:id — update a cue (edit access). */
cueRoutes.patch('/cues/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireCueAccess(db, c.get('userId'), id, 'edit');
  const body = updateCueSchema.parse(await c.req.json());

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if ('anchorMs' in body) patch.anchorMs = body.anchorMs;
  if ('beat' in body) patch.beat = body.beat ?? null;
  if ('bar' in body) patch.bar = body.bar ?? null;
  if ('text' in body) patch.text = body.text;
  if ('color' in body) patch.color = body.color ?? null;

  await db.update(cues).set(patch).where(eq(cues.id, id));
  const row = await db.select().from(cues).where(eq(cues.id, id)).get();
  return c.json(serializeCue(row!));
});

/** DELETE /cues/:id — remove a cue (edit access). */
cueRoutes.delete('/cues/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireCueAccess(db, c.get('userId'), id, 'edit');
  await db.delete(cues).where(eq(cues.id, id));
  return c.body(null, 204);
});
