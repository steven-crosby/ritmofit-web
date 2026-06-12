/**
 * Anchor validation for choreography (cues + placed moves). A placement's
 * `anchorMs` must fall within the track it's anchored to, or the live prompter
 * surfaces a cue/move that never reaches its moment. Zod already guarantees
 * `anchorMs >= 0` (offsetMsSchema); this adds the upper bound, which needs the
 * track's duration and so can't live in the static schema.
 *
 * When the track's `durationMs` is unknown (null), we can't bound it — allow the
 * anchor rather than guess.
 */
import { eq } from 'drizzle-orm';
import { classTracks, tracks } from '../db/schema.js';
import { HttpError } from './errors.js';
import type { Db } from './db.js';

export async function assertAnchorWithinTrack(
  db: Db,
  classTrackId: string,
  anchorMs: number,
): Promise<void> {
  const row = await db
    .select({ durationMs: tracks.durationMs })
    .from(classTracks)
    .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
    .where(eq(classTracks.id, classTrackId))
    .get();
  if (row?.durationMs != null && anchorMs > row.durationMs) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      `anchorMs (${anchorMs}) is past the end of the track (${row.durationMs}ms).`,
    );
  }
}
