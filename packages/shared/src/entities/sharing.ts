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
