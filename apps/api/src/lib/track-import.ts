/**
 * Import a provider search candidate into a user's library — shared by the M2
 * provider route and the M1 dev-only mock seam, so both create tracks identically.
 *
 * Provider-ID resolution (M2 slice 5): a candidate is resolved against the user's
 * existing library before a new track is forged, so one song handed off to several
 * provider apps stays a single `track` with many `track_provider_ids`:
 *  1. Exact ref — `(provider, providerTrackId)` already imported. If it's the
 *     caller's, return it idempotently; if another user's, 409 (the global unique
 *     index means the ref can't be re-attached anyway).
 *  2. Same song, new provider — fuzzy match (`same-song.ts`) attaches the new
 *     provider ID to the existing track instead of duplicating it.
 *  3. Otherwise create a fresh owner-scoped track (manual BPM — never a
 *     provider-sourced BPM, per the music rules) plus its provider id.
 */
import type { TrackSearchResult, TrackWithProviderIds, Provider } from '@ritmofit/shared';
import { and, eq } from 'drizzle-orm';
import type { Db } from './db.js';
import { HttpError, isUniqueViolation } from './errors.js';
import { serializeTrack, serializeTrackProviderId } from './serialize.js';
import { findSameSongMatch, type MatchableTrack } from './same-song.js';
import { tracks, trackProviderIds } from '../db/schema.js';

/** Load a track with its provider ids and shape it as the contract DTO. */
async function loadTrackWithProviders(db: Db, trackId: string): Promise<TrackWithProviderIds> {
  const track = await db.select().from(tracks).where(eq(tracks.id, trackId)).get();
  if (!track) throw new HttpError(404, 'NOT_FOUND', 'Track not found.');
  const providers = await db
    .select()
    .from(trackProviderIds)
    .where(eq(trackProviderIds.trackId, trackId))
    .all();
  return { ...serializeTrack(track), providerIds: providers.map(serializeTrackProviderId) };
}

/** Attach a new provider id row to an existing track, then return the merged track. */
async function attachProviderId(
  db: Db,
  trackId: string,
  candidate: TrackSearchResult,
): Promise<TrackWithProviderIds> {
  const now = Date.now();
  try {
    await db.insert(trackProviderIds).values({
      id: crypto.randomUUID(),
      trackId,
      provider: candidate.provider,
      providerTrackId: candidate.providerTrackId,
      providerUri: candidate.providerUri,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Raced with another import of the same ref — it's already attached somewhere.
      throw new HttpError(409, 'CONFLICT', 'That provider track is already in a library.');
    }
    throw err;
  }
  return loadTrackWithProviders(db, trackId);
}

/** The caller's tracks reduced to the shape `findSameSongMatch` needs. */
async function loadMatchableLibrary(db: Db, ownerUserId: string): Promise<MatchableTrack[]> {
  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      artist: tracks.artist,
      durationMs: tracks.durationMs,
      provider: trackProviderIds.provider,
    })
    .from(tracks)
    .leftJoin(trackProviderIds, eq(trackProviderIds.trackId, tracks.id))
    .where(eq(tracks.ownerUserId, ownerUserId))
    .all();

  const byId = new Map<string, MatchableTrack>();
  for (const r of rows) {
    let t = byId.get(r.id);
    if (!t) {
      t = { id: r.id, title: r.title, artist: r.artist, durationMs: r.durationMs, providers: [] };
      byId.set(r.id, t);
    }
    if (r.provider) t.providers.push(r.provider as Provider);
  }
  return [...byId.values()];
}

export async function importTrackFromCandidate(
  db: Db,
  ownerUserId: string,
  candidate: TrackSearchResult,
): Promise<TrackWithProviderIds> {
  // 1. Exact ref — the provider track is already imported somewhere.
  const existingRef = await db
    .select({ trackId: trackProviderIds.trackId, ownerUserId: tracks.ownerUserId })
    .from(trackProviderIds)
    .innerJoin(tracks, eq(tracks.id, trackProviderIds.trackId))
    .where(
      and(
        eq(trackProviderIds.provider, candidate.provider),
        eq(trackProviderIds.providerTrackId, candidate.providerTrackId),
      ),
    )
    .get();
  if (existingRef) {
    if (existingRef.ownerUserId !== ownerUserId) {
      throw new HttpError(409, 'CONFLICT', 'That provider track is already in a library.');
    }
    return loadTrackWithProviders(db, existingRef.trackId); // idempotent re-import
  }

  // 2. Same song from a different provider — attach to the existing track.
  const match = findSameSongMatch(candidate, await loadMatchableLibrary(db, ownerUserId));
  if (match) return attachProviderId(db, match, candidate);

  // 3. New song — create the track and its first provider id.
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
