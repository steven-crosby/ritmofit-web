/**
 * Share routes (Google Drive model, D6/D9). Managing shares on a class —
 * create/update/revoke/list — requires class OWNER (authorization.md). Granting a
 * team share gives all current members access via the GET /classes union.
 */
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createShareSchema, updateShareSchema } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireAccess } from '../lib/authz.js';
import { HttpError } from '../lib/errors.js';
import { serializeShare } from '../lib/serialize.js';
import { shares, users, teams } from '../db/schema.js';

export const shareRoutes = new Hono<AppEnv>();
shareRoutes.use('*', requireSession);

/**
 * POST /shares — share a class with a user OR a team (exactly one), at view/edit.
 * Only the class owner may share. Re-sharing the same (resource, target) updates
 * the existing row's permission rather than duplicating (api.md).
 */
shareRoutes.post('/shares', async (c) => {
  const db = createDb(c.env);
  const body = createShareSchema.parse(await c.req.json());
  // Managing shares on a class requires owning it.
  await requireAccess(db, c.get('userId'), body.resourceId, 'owner');

  // The target must exist (clean 422 rather than a raw FK failure).
  if (body.targetUserId != null) {
    const u = await db.select({ id: users.id }).from(users).where(eq(users.id, body.targetUserId)).get();
    if (!u) throw new HttpError(422, 'VALIDATION_ERROR', 'No such target user.');
  } else {
    const t = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, body.targetTeamId!)).get();
    if (!t) throw new HttpError(422, 'VALIDATION_ERROR', 'No such target team.');
  }

  const targetMatch =
    body.targetUserId != null
      ? eq(shares.targetUserId, body.targetUserId)
      : eq(shares.targetTeamId, body.targetTeamId!);
  const existing = await db
    .select()
    .from(shares)
    .where(and(eq(shares.resourceType, body.resourceType), eq(shares.resourceId, body.resourceId), targetMatch))
    .get();

  const now = Date.now();
  if (existing) {
    await db.update(shares).set({ permission: body.permission, updatedAt: now }).where(eq(shares.id, existing.id));
    const row = await db.select().from(shares).where(eq(shares.id, existing.id)).get();
    return c.json(serializeShare(row!));
  }

  const row = {
    id: crypto.randomUUID(),
    resourceType: body.resourceType,
    resourceId: body.resourceId,
    sharedByUserId: c.get('userId'),
    targetUserId: body.targetUserId ?? null,
    targetTeamId: body.targetTeamId ?? null,
    permission: body.permission,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(shares).values(row);
  return c.json(serializeShare(row), 201);
});

/** GET /classes/:id/shares — list shares on a class (owner only). */
shareRoutes.get('/classes/:id/shares', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'owner');
  const rows = await db
    .select()
    .from(shares)
    .where(and(eq(shares.resourceType, 'class'), eq(shares.resourceId, classId)))
    .all();
  return c.json(rows.map(serializeShare));
});

/** Load a share and require the caller to own its resource; else 404 (existence hidden). */
async function requireOwnedShare(db: ReturnType<typeof createDb>, userId: string, shareId: string) {
  const share = await db.select().from(shares).where(eq(shares.id, shareId)).get();
  if (!share) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  await requireAccess(db, userId, share.resourceId, 'owner');
  return share;
}

/** PATCH /shares/:id — change a share's permission (resource owner only). */
shareRoutes.patch('/shares/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireOwnedShare(db, c.get('userId'), id);
  const body = updateShareSchema.parse(await c.req.json());
  await db.update(shares).set({ permission: body.permission, updatedAt: Date.now() }).where(eq(shares.id, id));
  const row = await db.select().from(shares).where(eq(shares.id, id)).get();
  return c.json(serializeShare(row!));
});

/** DELETE /shares/:id — revoke a share (resource owner only). */
shareRoutes.delete('/shares/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireOwnedShare(db, c.get('userId'), id);
  await db.delete(shares).where(eq(shares.id, id));
  return c.body(null, 204);
});
