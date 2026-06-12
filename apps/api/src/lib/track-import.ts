/**
 * Import a provider search candidate into a user's library — shared by the M2
 * provider route and the M1 dev-only mock seam, so both create tracks identically.
 *
 * Provider-ID resolution (M2 slice 5): a candidate is resolved against the user's
 * existing library before a new track is forged, so one song handed off to several
 * provider apps stays a single `track` with many `track_provider_ids`:
 *  1. Exact ref — `(owner, provider, providerTrackId)` already in the caller's
 *     library: return it idempotently. Another user owning the same provider ref is
 *     irrelevant (per-user libraries, D4); the owner-scoped unique index lets each
 *     user import the same song into their own library.
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
import { findSameSongMatch, makeMatchKey, type MatchableTrack } from './same-song.js';
import { tracks, trackProviderIds } from '../db/schema.js';

/** Outcome of an import: the resolved track and whether a NEW track row was created. */
export interface ImportResult {
  track: TrackWithProviderIds;
  created: boolean;
}

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

/**
 * Attach a new provider id row to an existing track and return the merged track —
 * or `null` if that track no longer exists (it was deleted between the same-song
 * match and this insert), so the caller can fall back to creating a fresh track.
 */
async function attachProviderId(
  db: Db,
  ownerUserId: string,
  trackId: string,
  candidate: TrackSearchResult,
): Promise<TrackWithProviderIds | null> {
  const now = Date.now();
  try {
    await db.insert(trackProviderIds).values({
      id: crypto.randomUUID(),
      trackId,
      ownerUserId,
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
    // The matched track may have been deleted between match and insert (FK fail) —
    // signal the caller to create a fresh track instead of surfacing a 500.
    const stillExists = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, trackId)).get();
    if (!stillExists) return null;
    throw err;
  }
  return loadTrackWithProviders(db, trackId);
}

/**
 * The caller's tracks that share the candidate's normalized match key, reduced to
 * the shape `findSameSongMatch` needs. Filtering on the indexed `match_key` avoids
 * scanning + normalizing the whole library on every import.
 */
async function loadMatchableLibrary(
  db: Db,
  ownerUserId: string,
  matchKey: string,
): Promise<MatchableTrack[]> {
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
    .where(and(eq(tracks.ownerUserId, ownerUserId), eq(tracks.matchKey, matchKey)))
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

/** Create a fresh owner-scoped track + its first provider id (the no-match path). */
async function createNewTrack(
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
    matchKey: makeMatchKey(candidate.title, candidate.artist),
    createdAt: now,
    updatedAt: now,
  };
  const providerRow = {
    id: crypto.randomUUID(),
    trackId: trackRow.id,
    ownerUserId,
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

  return { ...serializeTrack(trackRow), providerIds: [serializeTrackProviderId(providerRow)] };
}

export async function importTrackFromCandidate(
  db: Db,
  ownerUserId: string,
  candidate: TrackSearchResult,
): Promise<ImportResult> {
  // 1. Exact ref — the provider track is already in THIS user's library. Scoped to
  //    the caller (tracks are a per-user library, D4): another user owning the same
  //    provider ref is irrelevant — it lives on a different track row, and the
  //    owner-scoped unique index lets the caller import it into their own library.
  const existingRef = await db
    .select({ trackId: trackProviderIds.trackId })
    .from(trackProviderIds)
    .where(
      and(
        eq(trackProviderIds.ownerUserId, ownerUserId),
        eq(trackProviderIds.provider, candidate.provider),
        eq(trackProviderIds.providerTrackId, candidate.providerTrackId),
      ),
    )
    .get();
  if (existingRef) {
    // Idempotent re-import — the track already exists, nothing created.
    return { track: await loadTrackWithProviders(db, existingRef.trackId), created: false };
  }

  // 2. Same song from a different provider — attach to the existing track.
  const matchKey = makeMatchKey(candidate.title, candidate.artist);
  const match = findSameSongMatch(candidate, await loadMatchableLibrary(db, ownerUserId, matchKey));
  if (match) {
    const merged = await attachProviderId(db, ownerUserId, match, candidate);
    // merged === null means the matched track vanished mid-flight → fall through to create.
    if (merged) return { track: merged, created: false };
  }

  // 3. New song — create the track and its first provider id.
  return { track: await createNewTrack(db, ownerUserId, candidate), created: true };
}
