/**
 * Import a provider search candidate into a user's library — shared by the M2
 * provider route and the M1 dev-only mock seam, so both create tracks identically.
 *
 * An imported track lands exactly like a hand-entered one (owner-scoped, manual
 * BPM — never a provider-sourced BPM, per the music rules) plus its provider id.
 * The unique constraint on (provider, providerTrackId) surfaces as a 409.
 */
import type { TrackSearchResult, TrackWithProviderIds } from '@ritmofit/shared';
import type { Db } from './db.js';
import { HttpError, isUniqueViolation } from './errors.js';
import { serializeTrack, serializeTrackProviderId } from './serialize.js';
import { tracks, trackProviderIds } from '../db/schema.js';

export async function importTrackFromCandidate(
  db: Db,
  ownerUserId: string,
  candidate: TrackSearchResult,
): Promise<TrackWithProviderIds> {
  const now = Date.now();
  const trackRow = {
    id: crypto.randomUUID(),
    ownerUserId,
    title: candidate.title,
    artist: candidate.artist,
    albumArtUrl: candidate.albumArtUrl,
    durationMs: candidate.durationMs,
    displayBpm: null, // manual in M1 — never imported from a provider
    isrc: null,
    createdAt: now,
    updatedAt: now,
  };
  const providerRow = {
    id: crypto.randomUUID(),
    trackId: trackRow.id,
    provider: candidate.provider,
    providerTrackId: candidate.providerTrackId,
    providerUri: candidate.providerUri,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.batch([
      db.insert(tracks).values(trackRow),
      db.insert(trackProviderIds).values(providerRow),
    ]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'CONFLICT', 'That provider track is already in a library.');
    }
    throw err;
  }

  return {
    ...serializeTrack(trackRow),
    providerIds: [serializeTrackProviderId(providerRow)],
  };
}
