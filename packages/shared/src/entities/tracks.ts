/**
 * Tracks & provider IDs — `tracks`, `track_provider_ids` (schema.md).
 */
import { z } from 'zod';
import { uuidSchema, timestampsShape } from '../common.js';
import { providerSchema } from '../enums.js';

/**
 * The provider-agnostic song — a **per-user library** in M1 (decision D4); only
 * the owner may edit. `displayBpm` is manual entry in M1 (never Spotify BPM).
 */
export const trackSchema = z.object({
  id: uuidSchema,
  ownerUserId: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  albumArtUrl: z.url().nullable(),
  durationMs: z.int().positive().nullable(),
  displayBpm: z.int().positive().nullable(),
  isrc: z.string().nullable(),
  ...timestampsShape,
});
export type Track = z.infer<typeof trackSchema>;

/**
 * Request body to create a track. Server sets `id` / `ownerUserId` / timestamps.
 * Used by the inline-create branch of `POST /classes/:id/tracks` (step 6) and
 * reused verbatim by `POST /tracks` (step 8) — one shape for both entry points.
 */
export const createTrackSchema = trackSchema
  .pick({
    title: true,
    artist: true,
    albumArtUrl: true,
    durationMs: true,
    displayBpm: true,
    isrc: true,
  })
  .partial({ albumArtUrl: true, durationMs: true, displayBpm: true, isrc: true });
export type CreateTrack = z.infer<typeof createTrackSchema>;

/** One row per provider for a track. Unique on (provider, providerTrackId). */
export const trackProviderIdSchema = z.object({
  id: uuidSchema,
  trackId: uuidSchema,
  provider: providerSchema,
  providerTrackId: z.string().min(1),
  providerUri: z.string().nullable(),
  ...timestampsShape,
});
export type TrackProviderId = z.infer<typeof trackProviderIdSchema>;

// ── Request / response variants (step 8 routes) ─────────────────────────────

/** Patch a track — every mutable field optional (e.g. set/correct manual BPM). */
export const updateTrackSchema = createTrackSchema.partial();
export type UpdateTrack = z.infer<typeof updateTrackSchema>;

/** Attach a provider id to a track. Server sets id / trackId / timestamps. */
export const createTrackProviderIdSchema = trackProviderIdSchema
  .pick({ provider: true, providerTrackId: true, providerUri: true })
  .partial({ providerUri: true });
export type CreateTrackProviderId = z.infer<typeof createTrackProviderIdSchema>;

/** A track with its provider ids — the `GET /tracks/:id` response shape. */
export const trackWithProviderIdsSchema = trackSchema.extend({
  providerIds: z.array(trackProviderIdSchema),
});
export type TrackWithProviderIds = z.infer<typeof trackWithProviderIdsSchema>;
