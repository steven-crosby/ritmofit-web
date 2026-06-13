/**
 * Identity & teams — `users`, `teams`, `team_memberships` (schema.md).
 */
import { z } from 'zod';
import { uuidSchema, timestampMsSchema, timestampsShape } from '../common.js';
import { teamRoleSchema } from '../enums.js';

/**
 * The canonical user record (Better Auth's user table, extended).
 *
 * `id` is whatever Better Auth's D1 adapter issues — **not** assumed to be a
 * UUIDv4 — so it is a plain non-empty string, unlike every other entity's id.
 */
export const userSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  displayName: z.string().nullable(),
  imageUrl: z.url().nullable(),
  ...timestampsShape,
});
export type User = z.infer<typeof userSchema>;

/** A studio or group. `ownerUserId` is authoritative for owner-only operations. */
export const teamSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  ownerUserId: z.string().min(1),
  ...timestampsShape,
});
export type Team = z.infer<typeof teamSchema>;

/** Many-to-many join between users and teams. Unique on (userId, teamId). */
export const teamMembershipSchema = z.object({
  id: uuidSchema,
  userId: z.string().min(1),
  teamId: uuidSchema,
  role: teamRoleSchema,
  joinedAt: timestampMsSchema,
});
export type TeamMembership = z.infer<typeof teamMembershipSchema>;

// ── Request / response variants (step 11 routes) ────────────────────────────

/** Create a team. Server sets id / ownerUserId / timestamps and the owner membership. */
export const createTeamSchema = teamSchema.pick({ name: true });
export type CreateTeam = z.infer<typeof createTeamSchema>;

/** A team plus the caller's role in it — the `GET /teams` list shape. */
export const teamWithRoleSchema = teamSchema.extend({ role: teamRoleSchema });
export type TeamWithRole = z.infer<typeof teamWithRoleSchema>;

/**
 * Add a member to a team. Targets **exactly one** of a user by id (`userId`) or by
 * `email` (resolved to an id server-side, so the UI can add members without a
 * user-search endpoint — same privacy stance as `createShareSchema`). `role`
 * defaults to `member` server-side.
 */
export const addTeamMemberSchema = z
  .object({
    userId: z.string().min(1).nullish(),
    email: z.email().nullish(),
    role: teamRoleSchema.optional(),
  })
  .refine((m) => (m.userId != null) !== (m.email != null), {
    error: 'Provide exactly one of userId / email.',
    path: ['email'],
  });
export type AddTeamMember = z.infer<typeof addTeamMemberSchema>;

/** A team member with their profile — the `GET /teams/:id/members` row shape. */
export const teamMemberViewSchema = z.object({
  userId: z.string().min(1),
  role: teamRoleSchema,
  joinedAt: timestampMsSchema,
  displayName: z.string().nullable(),
  email: z.email(),
});
export type TeamMemberView = z.infer<typeof teamMemberViewSchema>;
