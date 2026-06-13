/**
 * Sharing (Google Drive model) — `shares` (schema.md, D6).
 */
import { z } from 'zod';
import { uuidSchema, timestampsShape } from '../common.js';
import { shareResourceTypeSchema, sharePermissionSchema } from '../enums.js';

/** The stored share columns, before the exactly-one-target invariant is applied. */
const shareFields = {
  id: uuidSchema,
  resourceType: shareResourceTypeSchema,
  resourceId: uuidSchema,
  sharedByUserId: z.string().min(1),
  targetUserId: z.string().min(1).nullable(),
  targetTeamId: uuidSchema.nullable(),
  permission: sharePermissionSchema,
  ...timestampsShape,
};

/** Exactly one of `targetUserId` / `targetTeamId` is set (schema.md). */
const exactlyOneTarget = (s: { targetUserId: string | null; targetTeamId: string | null }) =>
  (s.targetUserId !== null) !== (s.targetTeamId !== null);

/**
 * A generic, additive, revocable access grant. Ownership is untouched.
 *
 * Invariant (schema.md): **exactly one** of `targetUserId` / `targetTeamId` is set.
 * At most one share per (resource, target) — re-sharing updates the existing row.
 */
export const shareSchema = z.object(shareFields).refine(exactlyOneTarget, {
  error: 'A share targets exactly one of targetUserId / targetTeamId.',
  path: ['targetUserId'],
});
export type Share = z.infer<typeof shareSchema>;

/**
 * A share enriched with its target's display fields — the `GET /classes/:id/shares`
 * row shape, so the UI can render *who* a class is shared with (email / team name)
 * without a second lookup. Display fields are nullable: the matching join side is
 * null for the other target kind (and a deleted user/team leaves them null).
 */
export const shareViewSchema = z
  .object({
    ...shareFields,
    targetEmail: z.email().nullable(),
    targetDisplayName: z.string().nullable(),
    targetTeamName: z.string().min(1).nullable(),
  })
  .refine(exactlyOneTarget, {
    error: 'A share targets exactly one of targetUserId / targetTeamId.',
    path: ['targetUserId'],
  });
export type ShareView = z.infer<typeof shareViewSchema>;

// ── Request variants (step 11 routes) ───────────────────────────────────────

/**
 * Create (or re-share) a share. `resourceType` defaults to `class` (M1). Targets
 * **exactly one** of: a user by id (`targetUserId`), a team (`targetTeamId`), or a
 * user by email (`targetEmail`, resolved to an id server-side so the web UI can
 * share without first discovering ids — there is deliberately no user-search
 * endpoint). Re-sharing the same (resource, target) updates the existing row's
 * permission (api.md).
 */
export const createShareSchema = z
  .object({
    resourceType: shareResourceTypeSchema.default('class'),
    resourceId: uuidSchema,
    targetUserId: z.string().min(1).nullish(),
    targetTeamId: uuidSchema.nullish(),
    targetEmail: z.email().nullish(),
    permission: sharePermissionSchema,
  })
  .refine(
    (s) => [s.targetUserId, s.targetTeamId, s.targetEmail].filter((v) => v != null).length === 1,
    {
      error: 'A share targets exactly one of targetUserId / targetTeamId / targetEmail.',
      path: ['targetEmail'],
    },
  );
export type CreateShare = z.infer<typeof createShareSchema>;

/** Change a share's permission. */
export const updateShareSchema = z.object({ permission: sharePermissionSchema });
export type UpdateShare = z.infer<typeof updateShareSchema>;
