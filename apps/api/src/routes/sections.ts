/**
 * Section routes — the energy-arc segment bands of a class (`class_sections`).
 * Class-scoped: list/create go through the class id (`requireAccess`); patch/delete
 * resolve `section → class` (`requireSectionAccess`). Reads need VIEW, writes EDIT.
 * `start_offset_ms` is a free anchor (no bound to the assembled duration — the total
 * shifts as tracks change); bands order by it and tile the timeline at read time.
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createClassSectionSchema, updateClassSectionSchema } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireAccess, requireSectionAccess } from '../lib/authz.js';
import { buildPatch } from '../lib/patch.js';
import { serializeClassSection } from '../lib/serialize.js';
import { classSections } from '../db/schema.js';

export const sectionRoutes = new Hono<AppEnv>();
sectionRoutes.use('*', requireSession);

/** GET /classes/:id/sections — sections in start order (view access). */
sectionRoutes.get('/classes/:id/sections', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'view');
  const rows = await db
    .select()
    .from(classSections)
    .where(eq(classSections.classId, classId))
    .orderBy(classSections.startOffsetMs)
    .all();
  return c.json(rows.map(serializeClassSection));
});

/** POST /classes/:id/sections — add a segment band (edit access). */
sectionRoutes.post('/classes/:id/sections', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'edit');
  const body = createClassSectionSchema.parse(await c.req.json());

  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    classId,
    type: body.type,
    startOffsetMs: body.startOffsetMs,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(classSections).values(row);
  return c.json(serializeClassSection(row), 201);
});

/** PATCH /sections/:id — update a segment band (edit access). */
sectionRoutes.patch('/sections/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireSectionAccess(db, c.get('userId'), id, 'edit');
  const body = updateClassSectionSchema.parse(await c.req.json());

  await db.update(classSections).set(buildPatch(body)).where(eq(classSections.id, id));
  const row = await db.select().from(classSections).where(eq(classSections.id, id)).get();
  return c.json(serializeClassSection(row!));
});

/** DELETE /sections/:id — remove a segment band (edit access). */
sectionRoutes.delete('/sections/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireSectionAccess(db, c.get('userId'), id, 'edit');
  await db.delete(classSections).where(eq(classSections.id, id));
  return c.body(null, 204);
});
