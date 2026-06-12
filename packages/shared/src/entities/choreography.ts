/**
 * Choreography anchored to a class_track — `cues`, `class_track_moves` (schema.md, D7).
 */
import { z } from 'zod';
import { uuidSchema, offsetMsSchema, timestampsShape } from '../common.js';
import { intensitySchema } from '../enums.js';

/**
 * A coaching prompt tied to a moment in the track, shown in the live prompter.
 *
 * `beat` / `bar` are forward-looking and **non-functional in M1** (no downbeat
 * phase to derive from). `color` is free hex; the design system's picker excludes
 * the plasma range (enforced in UI, not here).
 */
export const cueSchema = z.object({
  id: uuidSchema,
  classTrackId: uuidSchema,
  anchorMs: offsetMsSchema,
  beat: z.int().nonnegative().nullable(),
  bar: z.int().nonnegative().nullable(),
  text: z.string().min(1),
  color: z.string().nullable(),
  ...timestampsShape,
});
export type Cue = z.infer<typeof cueSchema>;

/**
 * A placement of a movement on the timeline. References a library move, a user
 * move, or carries a freeform name.
 *
 * Invariant (schema.md): a placement references **at most one** of `moveId` /
 * `userMoveId`; if neither is set, `nameOverride` must be present.
 */
export const classTrackMoveSchema = z
  .object({
    id: uuidSchema,
    classTrackId: uuidSchema,
    anchorMs: offsetMsSchema,
    moveId: uuidSchema.nullable(),
    userMoveId: uuidSchema.nullable(),
    nameOverride: z.string().min(1).nullable(),
    intensity: intensitySchema.nullable(),
    ...timestampsShape,
  })
  .refine((m) => !(m.moveId !== null && m.userMoveId !== null), {
    error: 'A placed move references at most one of moveId / userMoveId.',
    path: ['userMoveId'],
  })
  .refine((m) => m.moveId !== null || m.userMoveId !== null || m.nameOverride !== null, {
    error: 'A placed move with no library reference must have a nameOverride.',
    path: ['nameOverride'],
  });
export type ClassTrackMove = z.infer<typeof classTrackMoveSchema>;
