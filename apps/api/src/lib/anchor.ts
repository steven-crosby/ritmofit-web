/**
 * Anchor validation for choreography (cues + placed moves). A placement's
 * `anchorMs` (track-relative) must fall inside the class-track's effective **clip
 * window** `[clipStartMs, endMs)`, or the live prompter surfaces a cue/move that
 * never reaches its moment: the run-payload re-bases anchors to the clip start
 * (`run-payload.ts`), so an anchor before the start silently collapses to 0 and an
 * anchor past the end lands beyond the (clipped) track's duration.
 *
 * Zod already guarantees `anchorMs >= 0` (offsetMsSchema); this adds the
 * clip-window bounds, which need the persisted window and so can't live in the
 * static schema. This is the symmetric partner of the clip-change guard in
 * `PATCH /class-tracks/:id`, which rejects a window that would exclude an existing
 * anchor — together they keep every stored anchor inside its clip window.
 *
 * A class-specific duration override wins over the library track duration. When the
 * clip has no known end (unknown length and no explicit clip end), we can't bound
 * the top — apply only the lower bound rather than guess.
 */
import { and, eq, gt, isNotNull, isNull, lte, or, type SQL } from 'drizzle-orm';
import { classTracks, tracks } from '../db/schema.js';
import { HttpError } from './errors.js';
import type { Db } from './db.js';
import { resolveClipWindow } from './duration.js';

/**
 * Pure bounds check: is `anchorMs` outside the track-relative clip window
 * `[clipStartMs, endMs)`? Returns a user-facing message when it is, else null.
 * `endMs === null` means the clip runs to an unknown end, so only the lower bound
 * applies. The start is inclusive; the end is exclusive because Live advances to
 * the next track (or completes the class) at that exact instant.
 */
export function anchorOutsideClipWindow(
  anchorMs: number,
  clipStartMs: number,
  endMs: number | null,
): string | null {
  if (anchorMs < clipStartMs) {
    return `anchorMs (${anchorMs}) is before the clip start (${clipStartMs}ms).`;
  }
  if (endMs != null && anchorMs >= endMs) {
    return `anchorMs (${anchorMs}) must be before the clip end (${endMs}ms).`;
  }
  return null;
}

/**
 * SQL twin of `anchorOutsideClipWindow` / `resolveClipWindow`, scoped to one
 * class_track. Use this inside anchor-writing INSERT/UPDATE statements so a
 * concurrent duration change cannot land between validation and persistence.
 */
export function anchorWithinTrackWhere(classTrackId: string, anchorMs: number): SQL | undefined {
  return and(
    eq(classTracks.id, classTrackId),
    lte(classTracks.clipStartMs, anchorMs),
    or(isNull(classTracks.clipEndMs), gt(classTracks.clipEndMs, anchorMs)),
    or(
      and(isNotNull(classTracks.durationMsOverride), gt(classTracks.durationMsOverride, anchorMs)),
      and(
        isNull(classTracks.durationMsOverride),
        or(isNull(tracks.durationMs), gt(tracks.durationMs, anchorMs)),
      ),
    ),
  );
}

export async function assertAnchorWithinTrack(
  db: Db,
  classTrackId: string,
  anchorMs: number,
): Promise<void> {
  const row = await db
    .select({
      trackDurationMs: tracks.durationMs,
      durationMsOverride: classTracks.durationMsOverride,
      clipStartMs: classTracks.clipStartMs,
      clipEndMs: classTracks.clipEndMs,
    })
    .from(classTracks)
    .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
    .where(eq(classTracks.id, classTrackId))
    .get();
  // Missing class_track: the caller's authz already 404s before this; nothing to bound.
  if (!row) return;
  const { startMs, endMs } = resolveClipWindow(
    row.trackDurationMs,
    row.durationMsOverride,
    row.clipStartMs,
    row.clipEndMs,
  );
  const error = anchorOutsideClipWindow(anchorMs, startMs, endMs);
  if (error) throw new HttpError(422, 'VALIDATION_ERROR', error);
}

/**
 * A conditional anchor write returned no row. Re-read only to preserve the
 * route's precise validation message; the write statement itself remains the
 * authoritative guard. If the window changed back before this diagnostic read,
 * surface an explicit retryable conflict rather than misreporting validation.
 */
export async function throwAnchorWriteConflict(
  db: Db,
  classTrackId: string,
  anchorMs: number,
): Promise<never> {
  await assertAnchorWithinTrack(db, classTrackId, anchorMs);
  throw new HttpError(
    409,
    'CONFLICT',
    'Track timing changed while saving choreography. Retry your change.',
  );
}
