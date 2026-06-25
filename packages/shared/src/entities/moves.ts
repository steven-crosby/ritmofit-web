/**
 * Moves library — `moves` (global, seeded) and `user_moves` (custom) (schema.md, D8).
 */
import { z } from 'zod';
import { uuidSchema, offsetMsSchema, timestampsShape } from '../common.js';
import { classTemplateSchema, intensitySchema } from '../enums.js';
import { trackSchema } from './tracks.js';

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
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
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

// ── "Songs by move" reverse search (GET /moves/:id/songs, /user-moves/:id/songs) ─

/**
 * One occurrence of a move on a track within a specific class — enough for the
 * UI to label the class and deep-link into it. `classTrackId` + `anchorMs`
 * locate the exact placement in the builder.
 */
export const songByMovePlacementSchema = z.object({
  classId: uuidSchema,
  classTitle: z.string(),
  classTrackId: uuidSchema,
  anchorMs: offsetMsSchema,
  intensity: intensitySchema.nullable(),
});
export type SongByMovePlacement = z.infer<typeof songByMovePlacementSchema>;

/**
 * A song the caller has previously choreographed with a given move, grouped with
 * every placement of that move across the caller's own classes. The response to
 * `GET /moves/:id/songs` and `GET /user-moves/:id/songs` is an array of these,
 * scoped to classes the caller owns (their personal "what have I used this on?"
 * history). A track used in several classes appears once with multiple placements.
 */
export const songByMoveSchema = z.object({
  track: trackSchema,
  placements: z.array(songByMovePlacementSchema).min(1),
});
export type SongByMove = z.infer<typeof songByMoveSchema>;
