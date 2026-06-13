/**
 * Class sections — the energy-arc **segment bands** under the timeline
 * (`09-class-builder-guidelines.md`, `10-rhythm-system.md §4`). Time-anchored: a
 * section begins at `startOffsetMs` on the class timeline and runs until the next
 * section's start (or the class end), so bands tile the timeline like the mockup.
 * The `type` is a fixed enum; labels/tints are presentation only.
 */
import { z } from 'zod';
import { uuidSchema, offsetMsSchema, timestampsShape } from '../common.js';
import { segmentTypeSchema } from '../enums.js';

/** A segment band on a class's timeline. */
export const classSectionSchema = z.object({
  id: uuidSchema,
  classId: uuidSchema,
  type: segmentTypeSchema,
  /** Where the band begins on the class timeline (ms from class start). Free anchor. */
  startOffsetMs: offsetMsSchema,
  ...timestampsShape,
});
export type ClassSection = z.infer<typeof classSectionSchema>;

// ── Request variants ──────────────────────────────────────────────────────

/** Client-settable section fields. Server sets id / classId / timestamps. */
const classSectionInputFields = z.object({
  type: segmentTypeSchema,
  startOffsetMs: offsetMsSchema,
});

/** Create a section on a class. */
export const createClassSectionSchema = classSectionInputFields;
export type CreateClassSection = z.infer<typeof createClassSectionSchema>;

/** Patch a section — every field optional. */
export const updateClassSectionSchema = classSectionInputFields.partial();
export type UpdateClassSection = z.infer<typeof updateClassSectionSchema>;
