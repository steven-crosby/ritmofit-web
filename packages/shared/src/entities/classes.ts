/**
 * Classes & their tracks — `classes`, `class_tracks` (schema.md).
 */
import { z } from 'zod';
import { uuidSchema, timestampMsSchema, timestampsShape } from '../common.js';
import { classTemplateSchema, classStatusSchema, intensitySchema } from '../enums.js';

/**
 * A class, owned by exactly one user. No `teamId` — others get access via shares.
 */
export const classSchema = z.object({
  id: uuidSchema,
  ownerUserId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  template: classTemplateSchema.nullable(),
  status: classStatusSchema,
  targetDurationMs: timestampMsSchema.nullable(),
  ...timestampsShape,
  lastOpenedAt: timestampMsSchema.nullable(),
});
export type Class = z.infer<typeof classSchema>;

/**
 * A track's place within a class — carries the per-class choreography context.
 *
 * `startOffsetMs` is **server-derived in M1** (sequential, back-to-back from the
 * sum of preceding tracks' durations); clients treat it as read-only. `position`
 * is the authoritative ordering.
 */
export const classTrackSchema = z.object({
  id: uuidSchema,
  classId: uuidSchema,
  trackId: uuidSchema,
  position: z.int().nonnegative(),
  intensity: intensitySchema,
  displayBpmOverride: z.int().positive().nullable(),
  startOffsetMs: timestampMsSchema.nullable(),
  notes: z.string().nullable(),
  ...timestampsShape,
});
export type ClassTrack = z.infer<typeof classTrackSchema>;
