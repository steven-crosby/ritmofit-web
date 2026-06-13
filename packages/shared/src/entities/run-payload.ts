/**
 * The run-payload — the iOS live contract (api.md, decision D12). Everything
 * needed to run a class in one fetch, versioned via `schemaVersion`. This is a
 * read-optimized **projection**: the granular entity endpoints remain the edit
 * surface. Server-resolved fields (displayBpm, move name, startOffsetMs) are
 * computed during assembly — see `apps/api/src/lib/run-payload.ts`.
 */
import { z } from 'zod';
import { uuidSchema, offsetMsSchema, timestampMsSchema } from '../common.js';
import { classTemplateSchema, intensitySchema, providerSchema, segmentTypeSchema } from '../enums.js';

/** Schema version of the run-payload (bump on a breaking shape change; D12). */
export const RUN_PAYLOAD_SCHEMA_VERSION = 1 as const;

const runPayloadClassSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1),
  template: classTemplateSchema.nullable(),
  /** The instructor's planned target length (may be null). Not the assembled total. */
  targetDurationMs: timestampMsSchema.nullable(),
  /**
   * The actual assembled timeline length: the sum of the tracks' `durationMs`
   * (a null track duration contributes 0). Server-derived at assembly so the live
   * interval timer has an authoritative total without summing client-side. 0 for
   * an empty class. M3 hardening — the timeline is recomputed at read time, so it
   * is correct even if a persisted `startOffsetMs` ever drifts.
   */
  totalDurationMs: z.int().nonnegative(),
});

const runPayloadTrackSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1),
  artist: z.string().min(1),
  durationMs: z.int().positive().nullable(),
  albumArtUrl: z.url().nullable(),
});

const runPayloadProviderRefSchema = z.object({
  provider: providerSchema,
  providerTrackId: z.string().min(1),
  providerUri: z.string().nullable(),
});

const runPayloadCueSchema = z.object({
  /** Stable cue id (matches the granular `cues` row). Additive to v1 — lets clients
   *  correlate a cue uniquely even when two share an `anchorMs`. */
  id: uuidSchema,
  anchorMs: offsetMsSchema,
  beat: z.int().nonnegative().nullable(),
  bar: z.int().nonnegative().nullable(),
  text: z.string().min(1),
  color: z.string().nullable(),
});

const runPayloadMoveSchema = z.object({
  /** Stable placement id (matches the granular `class_track_moves` row). Additive
   *  to v1 — unique even when two placements share an `anchorMs`. */
  id: uuidSchema,
  anchorMs: offsetMsSchema,
  name: z.string().min(1),
  intensity: intensitySchema.nullable(),
});

const runPayloadTrackEntrySchema = z.object({
  classTrackId: uuidSchema,
  position: z.int().nonnegative(),
  displayBpm: z.int().positive().nullable(),
  intensity: intensitySchema,
  /**
   * The track's absolute start on the class timeline (ms from class start),
   * sequential/back-to-back. Server-derived and recomputed at assembly (M3),
   * so consumers can drive a countdown directly: this entry runs from
   * `startOffsetMs` to `startOffsetMs + track.durationMs`. Read-only.
   */
  startOffsetMs: timestampMsSchema.nullable(),
  notes: z.string().nullable(),
  track: runPayloadTrackSchema,
  providerRefs: z.array(runPayloadProviderRefSchema),
  cues: z.array(runPayloadCueSchema),
  moves: z.array(runPayloadMoveSchema),
});

/**
 * A class section / segment band, projected onto the timeline. Additive to v1
 * (a non-breaking field; `schemaVersion` stays 1). The band runs from
 * `startOffsetMs` to the next section's start (or the class end).
 */
const runPayloadSectionSchema = z.object({
  type: segmentTypeSchema,
  startOffsetMs: offsetMsSchema,
});

/** `GET /classes/:id/run-payload` response. */
export const runPayloadSchema = z.object({
  schemaVersion: z.literal(RUN_PAYLOAD_SCHEMA_VERSION),
  class: runPayloadClassSchema,
  tracks: z.array(runPayloadTrackEntrySchema),
  /** Segment bands, ordered by `startOffsetMs` (additive v1 field; may be empty). */
  sections: z.array(runPayloadSectionSchema),
});
export type RunPayload = z.infer<typeof runPayloadSchema>;
export type RunPayloadTrackEntry = z.infer<typeof runPayloadTrackEntrySchema>;
