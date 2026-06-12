/**
 * Moves library — `moves` (global, seeded) and `user_moves` (custom) (schema.md, D8).
 */
import { z } from 'zod';
import { uuidSchema, timestampsShape } from '../common.js';
import { classTemplateSchema } from '../enums.js';

/** Global, seeded movement library (Climb, Sprint, Jog, …). Seeded in step 3. */
export const moveSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  template: classTemplateSchema.nullable(),
  ...timestampsShape,
});
export type Move = z.infer<typeof moveSchema>;

/** A user's custom moves / personal coaching language. Ships from v1. */
export const userMoveSchema = z.object({
  id: uuidSchema,
  userId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  baseMoveId: uuidSchema.nullable(),
  template: classTemplateSchema.nullable(),
  ...timestampsShape,
});
export type UserMove = z.infer<typeof userMoveSchema>;

// ── Request variants (step 7 routes) ────────────────────────────────────────

/** Create a custom move. Server sets id / userId / timestamps. */
export const createUserMoveSchema = userMoveSchema
  .pick({ name: true, description: true, baseMoveId: true, template: true })
  .partial({ description: true, baseMoveId: true, template: true });
export type CreateUserMove = z.infer<typeof createUserMoveSchema>;

/** Patch a custom move — every field optional. */
export const updateUserMoveSchema = createUserMoveSchema.partial();
export type UpdateUserMove = z.infer<typeof updateUserMoveSchema>;

/** Query for the global moves list — optional template filter. */
export const moveListQuerySchema = z.object({ template: classTemplateSchema.optional() });
export type MoveListQuery = z.infer<typeof moveListQuerySchema>;
