/**
 * Run-payload assembly (step 10) — composes the read-optimized live contract for
 * `GET /classes/:id/run-payload`. Access is checked by the route (VIEW); this
 * just builds the projection with batched queries (no N+1) and the server-side
 * field resolutions the clients depend on (api.md):
 *   - displayBpm = class_track.display_bpm_override ?? track.display_bpm
 *   - move name  = move.name ?? user_move.name ?? class_track_move.name_override
 *   - tracks in position order; startOffsetMs already server-derived.
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
  const cls = await db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!cls) throw new Error(`class ${classId} not found during run-payload assembly`);

  const cts = await db
    .select()
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();

  const trackIds = [...new Set(cts.map((ct) => ct.trackId))];
  const ctIds = cts.map((ct) => ct.id);

  // Batched lookups — each guarded against an empty `IN ()`.
  const trackRows = trackIds.length
    ? await db.select().from(tracks).where(inArray(tracks.id, trackIds)).all()
    : [];
  const providerRows = trackIds.length
    ? await db.select().from(trackProviderIds).where(inArray(trackProviderIds.trackId, trackIds)).all()
    : [];
  const cueRows = ctIds.length
    ? await db.select().from(cues).where(inArray(cues.classTrackId, ctIds)).orderBy(cues.anchorMs).all()
    : [];
  const moveRows = ctIds.length
    ? await db
        .select()
        .from(classTrackMoves)
        .where(inArray(classTrackMoves.classTrackId, ctIds))
        .orderBy(classTrackMoves.anchorMs)
        .all()
    : [];

  // Resolve library names referenced by placements.
  const refMoveIds = [...new Set(moveRows.map((m) => m.moveId).filter((v): v is string => v != null))];
  const refUserMoveIds = [
    ...new Set(moveRows.map((m) => m.userMoveId).filter((v): v is string => v != null)),
  ];
  const moveNameById = new Map(
    (refMoveIds.length
      ? await db.select({ id: moves.id, name: moves.name }).from(moves).where(inArray(moves.id, refMoveIds)).all()
      : []
    ).map((m) => [m.id, m.name]),
  );
  const userMoveNameById = new Map(
    (refUserMoveIds.length
      ? await db
          .select({ id: userMoves.id, name: userMoves.name })
          .from(userMoves)
          .where(inArray(userMoves.id, refUserMoveIds))
          .all()
      : []
    ).map((m) => [m.id, m.name]),
  );

  const trackById = new Map(trackRows.map((t) => [t.id, t]));
  const providersByTrack = groupBy(providerRows, (p) => p.trackId);
  const cuesByCt = groupBy(cueRows, (c) => c.classTrackId);
  const movesByCt = groupBy(moveRows, (m) => m.classTrackId);

  const payload: RunPayload = {
    schemaVersion: RUN_PAYLOAD_SCHEMA_VERSION,
    class: {
      id: cls.id,
      title: cls.title,
      template: cls.template,
      targetDurationMs: cls.targetDurationMs,
    },
    tracks: cts.map((ct) => {
      const track = trackById.get(ct.trackId)!;
      return {
        classTrackId: ct.id,
        position: ct.position,
        displayBpm: ct.displayBpmOverride ?? track.displayBpm,
        intensity: ct.intensity,
        startOffsetMs: ct.startOffsetMs,
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
