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
