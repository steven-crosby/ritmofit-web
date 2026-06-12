/**
 * Sharing (Google Drive model) — `shares` (schema.md, D6).
 */
import { z } from 'zod';
import { uuidSchema, timestampsShape } from '../common.js';
import { shareResourceTypeSchema, sharePermissionSchema } from '../enums.js';

/**
 * A generic, additive, revocable access grant. Ownership is untouched.
 *
 * Invariant (schema.md): **exactly one** of `targetUserId` / `targetTeamId` is set.
 * At most one share per (resource, target) — re-sharing updates the existing row.
 */
export const shareSchema = z
  .object({
    id: uuidSchema,
    resourceType: shareResourceTypeSchema,
    resourceId: uuidSchema,
    sharedByUserId: z.string().min(1),
    targetUserId: z.string().min(1).nullable(),
    targetTeamId: uuidSchema.nullable(),
    permission: sharePermissionSchema,
    ...timestampsShape,
  })
  .refine((s) => (s.targetUserId !== null) !== (s.targetTeamId !== null), {
    error: 'A share targets exactly one of targetUserId / targetTeamId.',
    path: ['targetUserId'],
  });
export type Share = z.infer<typeof shareSchema>;

// ── Request variants (step 11 routes) ───────────────────────────────────────

/**
 * Create (or re-share) a share. `resourceType` defaults to `class` (M1). Carries
 * the same exactly-one-target invariant as the entity; re-sharing the same
 * (resource, target) updates the existing row's permission (api.md).
 */
export const createShareSchema = z
  .object({
    resourceType: shareResourceTypeSchema.default('class'),
    resourceId: uuidSchema,
    targetUserId: z.string().min(1).nullish(),
    targetTeamId: uuidSchema.nullish(),
    permission: sharePermissionSchema,
  })
  .refine((s) => (s.targetUserId != null) !== (s.targetTeamId != null), {
    error: 'A share targets exactly one of targetUserId / targetTeamId.',
    path: ['targetUserId'],
  });
export type CreateShare = z.infer<typeof createShareSchema>;

/** Change a share's permission. */
export const updateShareSchema = z.object({ permission: sharePermissionSchema });
export type UpdateShare = z.infer<typeof updateShareSchema>;
