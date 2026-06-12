/**
 * The run-payload — the iOS live contract (api.md, decision D12). Everything
 * needed to run a class in one fetch, versioned via `schemaVersion`. This is a
 * read-optimized **projection**: the granular entity endpoints remain the edit
 * surface. Server-resolved fields (displayBpm, move name, startOffsetMs) are
 * computed during assembly — see `apps/api/src/lib/run-payload.ts`.
 */
import { z } from 'zod';
import { uuidSchema, offsetMsSchema, timestampMsSchema } from '../common.js';
import { classTemplateSchema, intensitySchema, providerSchema } from '../enums.js';

/** Schema version of the run-payload (bump on a breaking shape change; D12). */
export const RUN_PAYLOAD_SCHEMA_VERSION = 1 as const;

const runPayloadClassSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1),
  template: classTemplateSchema.nullable(),
  targetDurationMs: timestampMsSchema.nullable(),
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
  anchorMs: offsetMsSchema,
  beat: z.int().nonnegative().nullable(),
  bar: z.int().nonnegative().nullable(),
  text: z.string().min(1),
  color: z.string().nullable(),
});

const runPayloadMoveSchema = z.object({
  anchorMs: offsetMsSchema,
  name: z.string().min(1),
  intensity: intensitySchema.nullable(),
});

const runPayloadTrackEntrySchema = z.object({
  classTrackId: uuidSchema,
  position: z.int().nonnegative(),
  displayBpm: z.int().positive().nullable(),
  intensity: intensitySchema,
  startOffsetMs: timestampMsSchema.nullable(),
  notes: z.string().nullable(),
  track: runPayloadTrackSchema,
  providerRefs: z.array(runPayloadProviderRefSchema),
  cues: z.array(runPayloadCueSchema),
  moves: z.array(runPayloadMoveSchema),
});

/** `GET /classes/:id/run-payload` response. */
export const runPayloadSchema = z.object({
  schemaVersion: z.literal(RUN_PAYLOAD_SCHEMA_VERSION),
  class: runPayloadClassSchema,
  tracks: z.array(runPayloadTrackEntrySchema),
});
export type RunPayload = z.infer<typeof runPayloadSchema>;
export type RunPayloadTrackEntry = z.infer<typeof runPayloadTrackEntrySchema>;
