/**
 * Classes & their tracks — `classes`, `class_tracks` (schema.md).
 */
import { z } from 'zod';
import { uuidSchema, timestampMsSchema, timestampsShape } from '../common.js';
import {
  classTemplateSchema,
  classStatusSchema,
  intensitySchema,
  accessLevelSchema,
} from '../enums.js';
import { createTrackSchema } from './tracks.js';

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

// ── Request / response variants (step 6 routes) ─────────────────────────────

/** Create a class. Server sets `id` / `ownerUserId` / timestamps; `status` defaults `draft`. */
export const createClassSchema = classSchema
  .pick({ title: true, description: true, template: true, targetDurationMs: true, status: true })
  .partial({ description: true, template: true, targetDurationMs: true, status: true });
export type CreateClass = z.infer<typeof createClassSchema>;

/** Patch a class — every mutable field optional. Ownership and ids are immutable. */
export const updateClassSchema = createClassSchema.partial();
export type UpdateClass = z.infer<typeof updateClassSchema>;

/** A class plus the caller's effective access level — the shape of list / get responses. */
export const classWithAccessSchema = classSchema.extend({ accessLevel: accessLevelSchema });
export type ClassWithAccess = z.infer<typeof classWithAccessSchema>;

/** Per-class context a caller may set when placing / editing a class_track. */
const classTrackInputFields = z.object({
  intensity: intensitySchema.optional(),
  displayBpmOverride: z.int().positive().nullish(),
  notes: z.string().nullish(),
});

/**
 * Add a track to a class — either reference an existing (owned) track by id, or
 * inline-create one. `position` and `startOffsetMs` are server-assigned.
 */
export const addClassTrackSchema = z.union([
  classTrackInputFields.extend({ trackId: uuidSchema }),
  classTrackInputFields.extend({ track: createTrackSchema }),
]);
export type AddClassTrack = z.infer<typeof addClassTrackSchema>;

/** Patch a class_track. `startOffsetMs` / `position` are server-derived, so not here. */
export const updateClassTrackSchema = classTrackInputFields;
export type UpdateClassTrack = z.infer<typeof updateClassTrackSchema>;

/** Reorder a class's class_tracks: the complete new ordering of their ids. */
export const reorderClassTracksSchema = z.object({
  classTrackIds: z.array(uuidSchema).min(1),
});
export type ReorderClassTracks = z.infer<typeof reorderClassTracksSchema>;

/** Copy a class_track (with its cues + moves) into another class. */
export const copyClassTrackSchema = z.object({ targetClassId: uuidSchema });
export type CopyClassTrack = z.infer<typeof copyClassTrackSchema>;
