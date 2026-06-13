/**
 * Team routes — teams, membership, and member management (decision D9, built last).
 *
 * Governance is by `teams.owner_user_id` (authoritative) + `team_memberships.role`
 * for admins (lib/team-authz.ts) — NOT requireAccess. A team role never grants
 * class access; that's always ownership + shares.
 */
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import {
  createTeamSchema,
  addTeamMemberSchema,
  type TeamWithRole,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { HttpError, isUniqueViolation } from '../lib/errors.js';
import { serializeTeam, serializeTeamMembership, serializeTeamMemberView } from '../lib/serialize.js';
import { requireTeamMembership, requireTeamManager } from '../lib/team-authz.js';
import { resolveMemberTarget } from '../lib/member-target.js';
import { teams, teamMemberships, users } from '../db/schema.js';

export const teamRoutes = new Hono<AppEnv>();
teamRoutes.use('*', requireSession);

/** POST /teams — create a team; the caller becomes owner and gets an owner membership. */
teamRoutes.post('/teams', async (c) => {
  const db = createDb(c.env);
  const me = c.get('userId');
  const body = createTeamSchema.parse(await c.req.json());
  const now = Date.now();
  const teamRow = { id: crypto.randomUUID(), name: body.name, ownerUserId: me, createdAt: now, updatedAt: now };
  await db.batch([
    db.insert(teams).values(teamRow),
    db.insert(teamMemberships).values({
      id: crypto.randomUUID(),
      userId: me,
      teamId: teamRow.id,
      role: 'owner',
      joinedAt: now,
    }),
  ]);
  return c.json(serializeTeam(teamRow), 201);
});

/** GET /teams — teams the caller belongs to, with their role. */
teamRoutes.get('/teams', async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      ownerUserId: teams.ownerUserId,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      role: teamMemberships.role,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
    .where(eq(teamMemberships.userId, c.get('userId')))
    .all();
  const out: TeamWithRole[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    ownerUserId: r.ownerUserId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    role: r.role,
  }));
  return c.json(out);
});

/** GET /teams/:id — fetch a team (member only). */
teamRoutes.get('/teams/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireTeamMembership(db, c.get('userId'), id);
  const row = await db.select().from(teams).where(eq(teams.id, id)).get();
  return c.json(serializeTeam(row!));
});

/** GET /teams/:id/members — list members with their profiles (member only). */
teamRoutes.get('/teams/:id/members', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireTeamMembership(db, c.get('userId'), id);
  const rows = await db
    .select({
      userId: teamMemberships.userId,
      role: teamMemberships.role,
      joinedAt: teamMemberships.joinedAt,
      displayName: users.displayName,
      email: users.email,
    })
    .from(teamMemberships)
    .innerJoin(users, eq(users.id, teamMemberships.userId))
    .where(eq(teamMemberships.teamId, id))
    .all();
  return c.json(rows.map(serializeTeamMemberView));
});

/** POST /teams/:id/members — add a member (owner/admin only). 409 if already a member. */
teamRoutes.post('/teams/:id/members', async (c) => {
  const db = createDb(c.env);
  const teamId = c.req.param('id');
  await requireTeamManager(db, c.get('userId'), teamId);
  const body = addTeamMemberSchema.parse(await c.req.json());

  // Resolve the target to a user id. `email` is resolved here (no user-search
  // endpoint — privacy); a directly-supplied id must still exist.
  let emailUserId: string | null = null;
  if (body.email != null) {
    const u = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).get();
    emailUserId = u?.id ?? null;
  } else {
    const u = await db.select({ id: users.id }).from(users).where(eq(users.id, body.userId!)).get();
    if (!u) throw new HttpError(422, 'VALIDATION_ERROR', 'No such user.');
  }
  const userId = resolveMemberTarget({
    directUserId: body.userId ?? null,
    emailGiven: body.email != null,
    emailUserId,
  });

  const row = {
    id: crypto.randomUUID(),
    userId,
    teamId,
    role: body.role ?? 'member',
    joinedAt: Date.now(),
  };
  try {
    await db.insert(teamMemberships).values(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'CONFLICT', 'Already a member of this team.');
    throw err;
  }
  return c.json(serializeTeamMembership(row), 201);
});

/**
 * DELETE /teams/:id/members/:userId — remove a member. Owner/admin may remove
 * others; anyone may remove themselves (self-leave). The team owner can't be
 * removed (ownership is authoritative — transfer/delete is a separate concern).
 */
teamRoutes.delete('/teams/:id/members/:userId', async (c) => {
  const db = createDb(c.env);
  const teamId = c.req.param('id');
  const targetUserId = c.req.param('userId');
  const me = c.get('userId');

  if (targetUserId === me) {
    await requireTeamMembership(db, me, teamId); // self-leave: just be a member
  } else {
    await requireTeamManager(db, me, teamId);
  }

  const team = await db.select({ ownerUserId: teams.ownerUserId }).from(teams).where(eq(teams.id, teamId)).get();
  if (team && team.ownerUserId === targetUserId) {
    throw new HttpError(409, 'CONFLICT', 'The team owner cannot be removed.');
  }

  await db
    .delete(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)));
  return c.body(null, 204);
});
