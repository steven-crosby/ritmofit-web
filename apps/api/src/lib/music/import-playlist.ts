/**
 * Server-side bulk playlist import (D21). Collapses the client-side "Import all N"
 * loop (`TrackSearch.tsx`) — which spent one `provider-track-import` limiter hit and
 * re-ran dedup per track — into a single authed call: fetch the saved playlist's
 * tracks over the caller's provider token, dedup by same-song match key, and import
 * the distinct songs as **references** in one bounded fan-out.
 *
 * Imports store references only (`track_provider_ids` via `importTrackFromCandidate`):
 * never provider audio, never a Spotify-sourced BPM. Works for all three providers —
 * the per-provider token/refresh/reauth handling lives in `fetchUserPlaylistTracks`.
 */
import type { TrackSearchResult, TrackWithProviderIds } from '@ritmofit/shared';
import { MAX_PLAYLIST_IMPORT_TRACKS } from '@ritmofit/shared';
import type { Provider } from '@ritmofit/shared';
import type { Db } from '../db.js';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { makeMatchKey } from '../same-song.js';
import { importTrackFromCandidate } from '../track-import.js';
import { fetchUserPlaylistTracks } from './user-playlists.js';

/** Result of a bulk import — mirrors `providerPlaylistImportResultSchema`. */
export interface PlaylistImportSummary {
  created: number;
  existing: number;
  skipped: number;
  tracks: TrackWithProviderIds[];
}

/**
 * Collapse same-song candidates by normalized match key, keeping the first
 * occurrence. `importTrackFromCandidate` already merges same-song imports in the
 * library, so duplicates would only add work (or race when resolved concurrently);
 * deduping first leaves distinct songs whose per-library dedup touches disjoint
 * match-key buckets and is safe in parallel. Pure so the collapse is unit-tested
 * without a DB (mirrors `playlist-import.ts`).
 */
export function dedupeByMatchKey(candidates: TrackSearchResult[]): TrackSearchResult[] {
  const seen = new Set<string>();
  return candidates.filter((cand) => {
    const key = makeMatchKey(cand.title, cand.artist);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Bound the per-request fan-out (upstream lookups + D1 writes). */
const CONCURRENCY = 5;

/**
 * Fetch a saved playlist's tracks for `provider` and import the distinct songs as
 * references. Upstream connection errors (not connected / reauth / forbidden) from
 * `fetchUserPlaylistTracks` propagate verbatim. A playlist with more distinct songs
 * than the cap is rejected (422) rather than silently truncated. Per-track import
 * failures are best-effort: the track is counted in `skipped`, never fatal.
 */
export async function importUserPlaylist(
  db: Db,
  env: Env,
  userId: string,
  provider: Provider,
  playlistId: string,
): Promise<PlaylistImportSummary> {
  const candidates = await fetchUserPlaylistTracks(db, env, userId, provider, playlistId);
  const unique = dedupeByMatchKey(candidates);

  if (unique.length > MAX_PLAYLIST_IMPORT_TRACKS) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      `Playlist has too many tracks to import at once (limit ${MAX_PLAYLIST_IMPORT_TRACKS}).`,
    );
  }

  let created = 0;
  let existing = 0;
  let skipped = 0;
  const tracks: TrackWithProviderIds[] = [];

  // Resolve with bounded concurrency rather than one sequential round-trip per track.
  // `allSettled` keeps a single failing track (e.g. a raced 409) from aborting the batch.
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((cand) => importTrackFromCandidate(db, userId, cand)),
    );
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        if (outcome.value.created) created += 1;
        else existing += 1;
        tracks.push(outcome.value.track);
      } else {
        skipped += 1;
      }
    }
  }

  return { created, existing, skipped, tracks };
}
