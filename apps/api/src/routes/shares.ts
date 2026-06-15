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
import { resolveShareTarget } from '../lib/share-target.js';
import { HttpError } from '../lib/errors.js';
import { serializeShare, serializeShareView } from '../lib/serialize.js';
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

  // Resolve the target to a stored (userId | teamId) pair. The target must exist
  // (clean 422 rather than a raw FK failure). `targetEmail` is resolved here so
  // the UI can share by email without a separate user-search endpoint.
  let targetUser: { id: string; emailVerified: boolean } | null = null;
  if (body.targetEmail != null) {
    targetUser =
      (await db
        .select({ id: users.id, emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.email, body.targetEmail))
        .get()) ?? null;
  } else if (body.targetUserId != null) {
    targetUser =
      (await db
        .select({ id: users.id, emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.id, body.targetUserId))
        .get()) ?? null;
    if (!targetUser) throw new HttpError(422, 'VALIDATION_ERROR', 'No such target user.');
  } else {
    const t = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, body.targetTeamId!))
      .get();
    if (!t) throw new HttpError(422, 'VALIDATION_ERROR', 'No such target team.');
  }
  if (targetUser && !targetUser.emailVerified) {
    throw new HttpError(
      422,
      'EMAIL_NOT_VERIFIED',
      'That user must verify their email before receiving access.',
    );
  }

  const { targetUserId, targetTeamId } = resolveShareTarget({
    directUserId: body.targetUserId ?? null,
    teamId: body.targetTeamId ?? null,
    emailGiven: body.targetEmail != null,
    emailUserId: targetUser?.id ?? null,
    selfUserId: c.get('userId'),
  });

  const targetMatch =
    targetUserId != null
      ? eq(shares.targetUserId, targetUserId)
      : eq(shares.targetTeamId, targetTeamId!);
  const existing = await db
    .select()
    .from(shares)
    .where(
      and(
        eq(shares.resourceType, body.resourceType),
        eq(shares.resourceId, body.resourceId),
        targetMatch,
      ),
    )
    .get();

  const now = Date.now();
  if (existing) {
    await db
      .update(shares)
      .set({ permission: body.permission, updatedAt: now })
      .where(eq(shares.id, existing.id));
    const row = await db.select().from(shares).where(eq(shares.id, existing.id)).get();
    return c.json(serializeShare(row!));
  }

  const row = {
    id: crypto.randomUUID(),
    resourceType: body.resourceType,
    resourceId: body.resourceId,
    sharedByUserId: c.get('userId'),
    targetUserId,
    targetTeamId,
    permission: body.permission,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(shares).values(row);
  return c.json(serializeShare(row), 201);
});

/**
 * GET /classes/:id/shares — list shares on a class (owner only), each enriched
 * with its target's display fields (user email/name or team name) so the UI can
 * show *who* a class is shared with. Left joins keep the unmatched target side null.
 */
shareRoutes.get('/classes/:id/shares', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'owner');
  const rows = await db
    .select({
      share: shares,
      email: users.email,
      displayName: users.displayName,
      teamName: teams.name,
    })
    .from(shares)
    .leftJoin(users, eq(users.id, shares.targetUserId))
    .leftJoin(teams, eq(teams.id, shares.targetTeamId))
    .where(and(eq(shares.resourceType, 'class'), eq(shares.resourceId, classId)))
    .all();
  return c.json(
    rows.map((r) =>
      serializeShareView(r.share, {
        email: r.email,
        displayName: r.displayName,
        teamName: r.teamName,
      }),
    ),
  );
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
  await db
    .update(shares)
    .set({ permission: body.permission, updatedAt: Date.now() })
    .where(eq(shares.id, id));
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
