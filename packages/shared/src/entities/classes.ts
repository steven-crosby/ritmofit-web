/**
 * Classes & their tracks — `classes`, `class_tracks` (schema.md).
 */
import { z } from 'zod';
import { uuidSchema, timestampMsSchema, timestampsShape } from '../common.js';
import {
  classTemplateSchema,
  classStatusSchema,
  classVisibilitySchema,
  intensitySchema,
  accessLevelSchema,
} from '../enums.js';
import { createTrackSchema } from './tracks.js';

/** Maximum accepted custom class-cover size (5 MiB), shared by web and API validation. */
export const MAX_CLASS_COVER_BYTES = 5 * 1024 * 1024;

/**
 * A class, owned by exactly one user. No `teamId` — others get access via shares.
 */
export const classSchema = z.object({
  id: uuidSchema,
  ownerUserId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  template: classTemplateSchema.nullable(),
  status: classStatusSchema,
  visibility: classVisibilitySchema,
  targetDurationMs: timestampMsSchema.nullable(),
  featuredCategory: z.string().max(100).nullable(),
  coverImageUrl: z.string().url().max(1000).nullable(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  ...timestampsShape,
  lastOpenedAt: timestampMsSchema.nullable(),
});
export type Class = z.infer<typeof classSchema>;

/**
 * A track's place within a class — carries the per-class choreography context.
 *
 * `startOffsetMs` is **server-derived in M1** (sequential, back-to-back from the
 * sum of preceding effective durations); clients treat it as read-only.
 * `durationMsOverride` lets a class editor repair an unknown/incorrect provider
 * duration without mutating another user's library track. `position` is the
 * authoritative ordering.
 */
export const classTrackSchema = z.object({
  id: uuidSchema,
  classId: uuidSchema,
  trackId: uuidSchema,
  position: z.int().nonnegative(),
  intensity: intensitySchema,
  displayBpmOverride: z.int().positive().nullable(),
  durationMsOverride: z.int().positive().nullable(),
  startOffsetMs: timestampMsSchema.nullable(),
  notes: z.string().max(2000).nullable(),
  ...timestampsShape,
});
export type ClassTrack = z.infer<typeof classTrackSchema>;

// ── Request / response variants (step 6 routes) ─────────────────────────────

/**
 * Create a class. Server sets `id` / `ownerUserId` / timestamps; `status` defaults
 * `draft` and `visibility` defaults `private` (a class is never born public).
 */
export const createClassSchema = classSchema
  // `coverImageUrl` is written only by the `/classes/:id/cover` upload endpoint and
  // `tags` only by the `/classes/:id/tags` endpoints (tags aren't even a column on
  // `classes`), so neither belongs in the create/update JSON contract.
  .pick({
    title: true,
    description: true,
    template: true,
    targetDurationMs: true,
    status: true,
    visibility: true,
    featuredCategory: true,
  })
  .partial({
    description: true,
    template: true,
    targetDurationMs: true,
    status: true,
    visibility: true,
    featuredCategory: true,
  });
export type CreateClass = z.infer<typeof createClassSchema>;

/**
 * Patch a class — every mutable field optional. Ownership and ids are immutable.
 * `visibility` is how an owner publishes to / unpublishes from Explore (M4).
 */
export const updateClassSchema = createClassSchema.partial();
export type UpdateClass = z.infer<typeof updateClassSchema>;

/** A class plus the caller's effective access level — the shape of list / get responses. */
export const classWithAccessSchema = classSchema.extend({ accessLevel: accessLevelSchema });
export type ClassWithAccess = z.infer<typeof classWithAccessSchema>;

/** Bounded keyset pagination for the private class library. */
export const CLASS_LIST_DEFAULT_LIMIT = 30;
export const CLASS_LIST_MAX_LIMIT = 50;
export const CLASS_LIST_NEXT_CURSOR_HEADER = 'X-RitmoFit-Next-Cursor';

export const classListCursorSchema = z.object({
  updatedAt: timestampMsSchema,
  id: uuidSchema,
});
export type ClassListCursor = z.infer<typeof classListCursorSchema>;

export const classListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(CLASS_LIST_MAX_LIMIT).optional(),
  cursor: z.string().min(1).max(512).optional(),
});
export type ClassListQuery = z.infer<typeof classListQuerySchema>;

/**
 * A public class as it appears in the Explore feed (M4): the class plus its
 * owner's display label and track count, so a discovery card needs no extra
 * fetch. Read-only — discovering is not access; a viewer copies it to edit.
 */
export const exploreClassSchema = classSchema.extend({
  ownerName: z.string().min(1),
  trackCount: z.int().nonnegative(),
});
export type ExploreClass = z.infer<typeof exploreClassSchema>;

/** Per-class context a caller may set when placing / editing a class_track. */
const classTrackInputFields = z.object({
  intensity: intensitySchema.optional(),
  displayBpmOverride: z.int().positive().nullish(),
  durationMsOverride: z.int().positive().nullish(),
  notes: z.string().max(2000).nullish(),
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

/**
 * Copy a whole class into the caller's library (M4 slice 3b — "save a copy" from
 * Explore). Optional `title` overrides the default `Copy of …`. The copy is always
 * a fresh `draft` / `private` class owned by the caller; foreign tracks + private
 * moves are cloned/snapshotted (same cross-user safety as the class_track copy).
 */
export const copyClassSchema = z.object({ title: z.string().min(1).max(200).optional() });
export type CopyClass = z.infer<typeof copyClassSchema>;
