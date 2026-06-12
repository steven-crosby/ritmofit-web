/**
 * Run-payload assembly (step 10) — composes the read-optimized live contract for
 * `GET /classes/:id/run-payload`. Access is checked by the route (VIEW); this
 * just builds the projection with batched queries (no N+1) and the server-side
 * field resolutions the clients depend on (api.md):
 *   - displayBpm = class_track.display_bpm_override ?? track.display_bpm
 *   - move name  = move.name ?? user_move.name ?? class_track_move.name_override
 *   - tracks in position order; the timeline (startOffsetMs + class totalDurationMs)
 *     is recomputed here (M3 hardening) so it is authoritative even if a persisted
 *     start_offset_ms ever drifts.
 */
import { eq, inArray } from 'drizzle-orm';
import { runPayloadSchema, RUN_PAYLOAD_SCHEMA_VERSION, type RunPayload } from '@ritmofit/shared';
import {
  classes,
  classTracks,
  tracks,
  trackProviderIds,
  cues,
  classTrackMoves,
  moves,
  userMoves,
} from '../db/schema.js';
import type { Db } from './db.js';
import { computeSequence } from './sequencing.js';

/**
 * Resolve a placement's display name. The placement invariant guarantees a source
 * exists (a library ref, or a snapshotted/freeform name), so the fallback is only
 * a defensive last resort.
 */
export function resolveMoveName(
  libraryName: string | null | undefined,
  userMoveName: string | null | undefined,
  nameOverride: string | null,
): string {
  return libraryName ?? userMoveName ?? nameOverride ?? '';
}

/**
 * The class timeline derived from position-ordered (classTrackId, durationMs)
 * pairs: each track's absolute `startOffsetMs` (back-to-back, null duration = 0)
 * and the class `totalDurationMs`. Recomputed at read time so the live contract
 * is authoritative even if a persisted offset drifted (M3 hardening). Pure, so it
 * is unit-tested without a database.
 */
export function computeClassTimeline(
  ordered: ReadonlyArray<{ id: string; durationMs: number | null }>,
): { startOffsetByCt: Map<string, number>; totalDurationMs: number } {
  const sequence = computeSequence(ordered);
  const startOffsetByCt = new Map(sequence.map((s) => [s.id, s.startOffsetMs]));
  const totalDurationMs = ordered.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  return { startOffsetByCt, totalDurationMs };
}

/** Group rows into a Map keyed by one of their fields. */
function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/** Assemble the run-payload for a class (caller already authorized for VIEW). */
export async function assembleRunPayload(db: Db, classId: string): Promise<RunPayload> {
  // Wave 1: the class and its ordered class_tracks are independent.
  const [cls, cts] = await Promise.all([
    db.select().from(classes).where(eq(classes.id, classId)).get(),
    db.select().from(classTracks).where(eq(classTracks.classId, classId)).orderBy(classTracks.position).all(),
  ]);
  if (!cls) throw new Error(`class ${classId} not found during run-payload assembly`);

  const trackIds = [...new Set(cts.map((ct) => ct.trackId))];
  const ctIds = cts.map((ct) => ct.id);

  // Wave 2: tracks / provider refs / cues / moves all depend only on the ct list,
  // so fire them together. Each is guarded against an empty `IN ()`.
  const [trackRows, providerRows, cueRows, moveRows] = await Promise.all([
    trackIds.length ? db.select().from(tracks).where(inArray(tracks.id, trackIds)).all() : [],
    trackIds.length
      ? db.select().from(trackProviderIds).where(inArray(trackProviderIds.trackId, trackIds)).all()
      : [],
    ctIds.length
      ? db.select().from(cues).where(inArray(cues.classTrackId, ctIds)).orderBy(cues.anchorMs).all()
      : [],
    ctIds.length
      ? db
          .select()
          .from(classTrackMoves)
          .where(inArray(classTrackMoves.classTrackId, ctIds))
          .orderBy(classTrackMoves.anchorMs)
          .all()
      : [],
  ]);

  // Wave 3: resolve the library names referenced by placements (both independent).
  const refMoveIds = [...new Set(moveRows.map((m) => m.moveId).filter((v): v is string => v != null))];
  const refUserMoveIds = [
    ...new Set(moveRows.map((m) => m.userMoveId).filter((v): v is string => v != null)),
  ];
  const [moveNameRows, userMoveNameRows] = await Promise.all([
    refMoveIds.length
      ? db.select({ id: moves.id, name: moves.name }).from(moves).where(inArray(moves.id, refMoveIds)).all()
      : [],
    refUserMoveIds.length
      ? db.select({ id: userMoves.id, name: userMoves.name }).from(userMoves).where(inArray(userMoves.id, refUserMoveIds)).all()
      : [],
  ]);
  const moveNameById = new Map(moveNameRows.map((m) => [m.id, m.name]));
  const userMoveNameById = new Map(userMoveNameRows.map((m) => [m.id, m.name]));

  const trackById = new Map(trackRows.map((t) => [t.id, t]));
  const providersByTrack = groupBy(providerRows, (p) => p.trackId);
  const cuesByCt = groupBy(cueRows, (c) => c.classTrackId);
  const movesByCt = groupBy(moveRows, (m) => m.classTrackId);

  // Recompute the timeline at read time (M3 hardening) so per-track offsets and the
  // class total are authoritative even if a persisted start_offset_ms drifted.
  const { startOffsetByCt, totalDurationMs } = computeClassTimeline(
    cts.map((ct) => ({ id: ct.id, durationMs: trackById.get(ct.trackId)?.durationMs ?? null })),
  );

  const payload: RunPayload = {
    schemaVersion: RUN_PAYLOAD_SCHEMA_VERSION,
    class: {
      id: cls.id,
      title: cls.title,
      template: cls.template,
      targetDurationMs: cls.targetDurationMs,
      totalDurationMs,
    },
    tracks: cts.map((ct) => {
      const track = trackById.get(ct.trackId)!;
      return {
        classTrackId: ct.id,
        position: ct.position,
        displayBpm: ct.displayBpmOverride ?? track.displayBpm,
        intensity: ct.intensity,
        startOffsetMs: startOffsetByCt.get(ct.id) ?? ct.startOffsetMs,
        notes: ct.notes,
        track: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          durationMs: track.durationMs,
          albumArtUrl: track.albumArtUrl,
        },
        providerRefs: (providersByTrack.get(ct.trackId) ?? []).map((p) => ({
          provider: p.provider,
          providerTrackId: p.providerTrackId,
          providerUri: p.providerUri,
        })),
        cues: (cuesByCt.get(ct.id) ?? []).map((cue) => ({
          anchorMs: cue.anchorMs,
          beat: cue.beat,
          bar: cue.bar,
          text: cue.text,
          color: cue.color,
        })),
        moves: (movesByCt.get(ct.id) ?? []).map((m) => ({
          anchorMs: m.anchorMs,
          name: resolveMoveName(
            m.moveId ? moveNameById.get(m.moveId) : null,
            m.userMoveId ? userMoveNameById.get(m.userMoveId) : null,
            m.nameOverride,
          ),
          intensity: m.intensity,
        })),
      };
    }),
  };

  // Validate the projection against the contract before it leaves the server.
  return runPayloadSchema.parse(payload);
}
