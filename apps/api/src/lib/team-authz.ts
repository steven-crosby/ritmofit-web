/**
 * Team-management authorization — **separate** from class access (authz.ts).
 *
 * authorization.md: team membership management is gated by `teams.owner_user_id`
 * (the authoritative owner) plus `team_memberships.role` for admins. A team role
 * never, by itself, grants class access — that always derives from ownership +
 * shares. Non-members get 404 (existence hidden), like class NONE.
 */
import { and, eq } from 'drizzle-orm';
import type { TeamRole } from '@ritmofit/shared';
import { teams, teamMemberships } from '../db/schema.js';
import { HttpError } from './errors.js';
import type { Db } from './db.js';

export interface TeamAccess {
  /** The caller's effective role (owner via `owner_user_id` reports `owner`). */
  role: TeamRole;
  isOwner: boolean;
}

/** Require the caller to be a member (or the owner) of the team; else 404. */
export async function requireTeamMembership(
  db: Db,
  userId: string,
  teamId: string,
): Promise<TeamAccess> {
  const team = await db
    .select({ ownerUserId: teams.ownerUserId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .get();
  if (!team) throw new HttpError(404, 'NOT_FOUND', 'Not found.');

  const membership = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
    .get();

  const isOwner = team.ownerUserId === userId;
  if (!membership && !isOwner) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  return { role: isOwner ? 'owner' : membership!.role, isOwner };
}

/** Require the caller to manage the team (owner or admin); else 403 (404 if not a member). */
export async function requireTeamManager(
  db: Db,
  userId: string,
  teamId: string,
): Promise<TeamAccess> {
  const access = await requireTeamMembership(db, userId, teamId);
  if (!access.isOwner && access.role !== 'admin' && access.role !== 'owner') {
    throw new HttpError(403, 'FORBIDDEN', 'Only a team owner or admin may do that.');
  }
  return access;
}
