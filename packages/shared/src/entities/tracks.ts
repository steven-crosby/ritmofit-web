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
