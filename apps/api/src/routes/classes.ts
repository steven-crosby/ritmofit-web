/**
 * Class routes — CRUD + the visible-classes union. Every handler is gated by the
 * centralized `requireAccess` (D1 has no RLS; a missing check is a security bug).
 */
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import {
  createClassSchema,
  updateClassSchema,
  type AccessLevel,
  type ClassWithAccess,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireAccess, accessRank } from '../lib/authz.js';
import { serializeClass } from '../lib/serialize.js';
import { assembleRunPayload } from '../lib/run-payload.js';
import { classes, shares, teamMemberships } from '../db/schema.js';

export const classRoutes = new Hono<AppEnv>();
classRoutes.use('*', requireSession);

/** POST /classes — create a class owned by the caller. */
classRoutes.post('/', async (c) => {
  const body = createClassSchema.parse(await c.req.json());
  const db = createDb(c.env);
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    ownerUserId: c.get('userId'),
    title: body.title,
    description: body.description ?? null,
    template: body.template ?? null,
    status: body.status ?? 'draft',
    targetDurationMs: body.targetDurationMs ?? null,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
  };
  await db.insert(classes).values(row);
  return c.json(serializeClass(row), 201);
});

/**
 * GET /classes — classes the caller can see: owned ∪ shared-directly ∪
 * shared-via-team (authorization.md), each tagged with its effective access level
 * (highest wins). No shares can be created until step 11, so today this is the
 * owned set — but the union shape is final, so step 11 only adds share creation.
 */
classRoutes.get('/', async (c) => {
  const db = createDb(c.env);
  const me = c.get('userId');

  const owned = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.ownerUserId, me))
    .all();
  const direct = await db
    .select({ id: shares.resourceId, permission: shares.permission })
    .from(shares)
    .where(and(eq(shares.resourceType, 'class'), eq(shares.targetUserId, me)))
    .all();
  const viaTeam = await db
    .select({ id: shares.resourceId, permission: shares.permission })
    .from(shares)
    .innerJoin(teamMemberships, eq(teamMemberships.teamId, shares.targetTeamId))
    .where(and(eq(shares.resourceType, 'class'), eq(teamMemberships.userId, me)))
    .all();

  // Reduce to the highest access level per class id.
  const levelById = new Map<string, AccessLevel>();
  const bump = (id: string, level: AccessLevel) => {
    const current = levelById.get(id);
    if (!current || accessRank(level) > accessRank(current)) levelById.set(id, level);
  };
  owned.forEach((r) => bump(r.id, 'owner'));
  [...direct, ...viaTeam].forEach((r) => bump(r.id, r.permission));

  if (levelById.size === 0) return c.json([] as ClassWithAccess[]);

  const rows = await db
    .select()
    .from(classes)
    .where(inArray(classes.id, [...levelById.keys()]))
    .all();
  const out: ClassWithAccess[] = rows
    .map((row) => ({ ...serializeClass(row), accessLevel: levelById.get(row.id)! }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return c.json(out);
});

/**
 * GET /classes/:id/run-payload — the versioned single-fetch live contract (D12).
 * VIEW access; assembles class + ordered tracks + provider refs + cues + moves
 * with server-resolved displayBpm / move names (lib/run-payload.ts).
 */
classRoutes.get('/:id/run-payload', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'view');
  return c.json(await assembleRunPayload(db, id));
});

/** GET /classes/:id — fetch one class (any access); 404 when not visible. */
classRoutes.get('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const accessLevel = await requireAccess(db, c.get('userId'), id, 'view');
  const row = await db.select().from(classes).where(eq(classes.id, id)).get();
  const result: ClassWithAccess = { ...serializeClass(row!), accessLevel };
  return c.json(result);
});

/** PATCH /classes/:id — update mutable fields (edit access). */
classRoutes.patch('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'edit');
  const body = updateClassSchema.parse(await c.req.json());

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if ('title' in body) patch.title = body.title;
  if ('description' in body) patch.description = body.description ?? null;
  if ('template' in body) patch.template = body.template ?? null;
  if ('status' in body) patch.status = body.status;
  if ('targetDurationMs' in body) patch.targetDurationMs = body.targetDurationMs ?? null;

  await db.update(classes).set(patch).where(eq(classes.id, id));
  const row = await db.select().from(classes).where(eq(classes.id, id)).get();
  return c.json(serializeClass(row!));
});

/**
 * DELETE /classes/:id — owner only. FK cascade removes class_tracks → cues/moves;
 * the class's polymorphic `shares` are deleted at the app level (resource_id has
 * no FK — flagged in step 3).
 */
classRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'owner');
  await db.batch([
    db.delete(shares).where(and(eq(shares.resourceType, 'class'), eq(shares.resourceId, id))),
    db.delete(classes).where(eq(classes.id, id)),
  ]);
  return c.body(null, 204);
});
