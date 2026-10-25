import { eq, inArray } from 'drizzle-orm';
import {
  PLAYLIST_SONG_BLOCK_CAP,
  playlistSongBlockDraft,
  songBlockIdsToDelete,
  songBlockWriteMode,
  type AddClassTrack,
  type ClassTrack,
  type ImportClassTracks,
} from '@ritmofit/shared';
import { classPlanBlocks, classes, classTracks, tracks } from '../db/schema.js';
import { createDb } from './db.js';
import type { Env } from './types.js';
import { AccessError } from './authz.js';
import { HttpError } from './errors.js';
import { effectiveDurationMs } from './duration.js';
import { orderTrackIdsByPlan } from './plan-block-ordering.js';
import { serializeClassTrack } from './serialize.js';

const compareId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

const conflict = () =>
  new HttpError(
    409,
    'CONFLICT',
    'The class changed during import. Retry to use its current order.',
  );

const songBlockCapError = () =>
  new HttpError(
    422,
    'VALIDATION_ERROR',
    `Playlist import accepts at most ${PLAYLIST_SONG_BLOCK_CAP} songs in one import.`,
  );

type ClassTrackRow = typeof classTracks.$inferSelect;

/** Song-block commits append in placement order and do not reshuffle existing songs. */
function layoutSongBlockCommit(input: {
  orderedIds: string[];
  existing: ClassTrackRow[];
  existingIds: Set<string>;
  newRows: ClassTrackRow[];
  durations: Map<string, number>;
  now: number;
}): ClassTrack[] {
  const existingOrdered = [...input.existing].sort((a, b) => a.position - b.position);
  const orderedExisting = input.orderedIds.filter((id) => input.existingIds.has(id));
  if (
    orderedExisting.length !== existingOrdered.length ||
    orderedExisting.some((id, index) => id !== existingOrdered[index]?.id)
  ) {
    throw conflict();
  }
  let offset = 0;
  for (const row of existingOrdered) {
    offset = Math.max(offset, (row.startOffsetMs ?? 0) + (input.durations.get(row.id) ?? 0));
  }
  const maxPosition = existingOrdered.reduce((max, row) => Math.max(max, row.position), -1);
  const placedNew = input.newRows.map((row, index) => {
    const startOffsetMs = offset;
    offset += input.durations.get(row.id) ?? 0;
    return serializeClassTrack({
      ...row,
      position: maxPosition + 1 + index,
      startOffsetMs,
      updatedAt: input.now,
    });
  });
  return [...existingOrdered.map((row) => serializeClassTrack(row)), ...placedNew];
}

/** Today's ordered import: one plan block for the batch, playback follows plan order. */
function layoutImportedTracks(input: {
  orderedIds: string[];
  byId: Map<string, ClassTrackRow>;
  newRows: ClassTrackRow[];
  blockPositions: ReadonlyMap<string, number>;
  existing: ClassTrackRow[];
  durations: Map<string, number>;
  isFree: boolean;
  now: number;
}): ClassTrack[] {
  let ordered = input.orderedIds.map((id, position) => ({ ...input.byId.get(id)!, position }));
  const planned = orderTrackIdsByPlan(ordered, input.blockPositions);
  ordered = planned.map((id, position) => ({ ...input.byId.get(id)!, position }));
  if (
    input.isFree &&
    ordered
      .filter((row) => !input.newRows.some((candidate) => candidate.id === row.id))
      .some((row, index) => row.id !== input.existing[index]?.id)
  ) {
    throw conflict();
  }
  let offset = 0;
  return ordered.map((row, index) => {
    const isNew = input.newRows.some((candidate) => candidate.id === row.id);
    const startOffsetMs = input.isFree && !isNew ? (row.startOffsetMs ?? 0) : offset;
    const end = startOffsetMs + input.durations.get(row.id)!;
    if (input.isFree && isNew) {
      const next = ordered
        .slice(index + 1)
        .find((candidate) => !input.newRows.some((row) => row.id === candidate.id));
      if (next && end > (next.startOffsetMs ?? 0)) {
        throw new HttpError(
          409,
          'CONFLICT',
          'There is no room for this song on the free timeline. Use sequential mode to restore playlist order.',
        );
      }
    }
    offset = Math.max(offset, end);
    const old = input.byId.get(row.id)!;
    return serializeClassTrack({
      ...row,
      startOffsetMs,
      updatedAt:
        old.position !== row.position || old.startOffsetMs !== startOffsetMs
          ? Math.max(input.now, old.updatedAt + 1)
          : old.updatedAt,
    });
  });
}

// These snapshots are evaluated again INSIDE the write batch. A read followed by
// an unconditional batch would still lose concurrent appends / duration edits.
const layoutSnapshot = `SELECT json_group_array(json_array(id, position, updated_at,
  start_offset_ms, plan_block_id, duration_ms_override, clip_start_ms, clip_end_ms, duration_ms))
  FROM (SELECT ct.*, t.duration_ms FROM class_tracks ct JOIN tracks t ON t.id = ct.track_id
    WHERE ct.class_id = ? ORDER BY ct.id)`;
const blockSnapshot = `SELECT json_group_array(json_array(id, position))
  FROM (SELECT id, position FROM class_plan_blocks WHERE class_id = ? ORDER BY id)`;
const librarySnapshot = `SELECT json_group_array(json_array(id, owner_user_id, duration_ms, updated_at))
  FROM (SELECT id, owner_user_id, duration_ms, updated_at FROM tracks
    WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id)`;

/** Commit resolved occurrences atomically. Receipts survive response loss; retry
 * with the same operation/body is a read, including after later instructor edits.
 * No provider work, audio, choreography, or library dedup happens in this layer.
 */
export async function commitOrderedClassImport(
  env: Env,
  classId: string,
  userId: string,
  body: ImportClassTracks,
  addition?: {
    fields: AddClassTrack;
    inlineTrack: typeof tracks.$inferInsert | null;
  },
): Promise<ClassTrack[]> {
  const db = createDb(env);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(addition ? { body, addition } : body)),
  );
  const hash = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
  const readReceipt = async () => {
    const receipt = await env.DB.prepare(
      'SELECT class_id, request_hash, result_json FROM class_track_import_operations WHERE id = ?',
    )
      .bind(body.operationId)
      .first<{ class_id: string; request_hash: string; result_json: string }>();
    if (!receipt) return null;
    if (receipt.class_id !== classId || receipt.request_hash !== hash) {
      throw new HttpError(
        409,
        'CONFLICT',
        'This import operation was already used for a different request.',
      );
    }
    return JSON.parse(receipt.result_json) as ClassTrack[];
  };
  const previous = await readReceipt();
  if (previous) return previous;

  const cls = await db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!cls) throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  const joined = await db
    .select({ placement: classTracks, duration: tracks.durationMs })
    .from(classTracks)
    .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();
  const existing = joined.map((r) => r.placement);
  const snapshot = existing.map(({ id, position, updatedAt }) => ({ id, position, updatedAt }));
  if (JSON.stringify(snapshot) !== JSON.stringify(body.expectedTracks)) throw conflict();
  const expectedLayout = JSON.stringify(
    [...joined]
      .sort((a, b) => compareId(a.placement, b.placement))
      .map(({ placement: r, duration }) => [
        r.id,
        r.position,
        r.updatedAt,
        r.startOffsetMs,
        r.planBlockId,
        r.durationMsOverride,
        r.clipStartMs,
        r.clipEndMs,
        duration,
      ]),
  );
  const blocks = await db
    .select({
      id: classPlanBlocks.id,
      position: classPlanBlocks.position,
      recipeBlockKey: classPlanBlocks.recipeBlockKey,
    })
    .from(classPlanBlocks)
    .where(eq(classPlanBlocks.classId, classId))
    .all();
  const blockPositions = new Map(blocks.map((b) => [b.id, b.position]));
  if (body.songBlocks && body.planBlockId) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'songBlocks cannot be combined with planBlockId.');
  }
  if (
    body.songBlocks &&
    (body.placements.length < 1 || body.placements.length > PLAYLIST_SONG_BLOCK_CAP)
  ) {
    throw songBlockCapError();
  }
  if (body.planBlockId && !blockPositions.has(body.planBlockId))
    throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  const expectedBlocks = JSON.stringify([...blocks].sort(compareId).map((b) => [b.id, b.position]));
  if (new Set(body.placements.map((p) => p.id)).size !== body.placements.length) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'Each playlist occurrence needs a distinct placement ID.',
    );
  }
  const libraryIds = [...new Set(body.placements.map((p) => p.trackId))];
  const library = await db.select().from(tracks).where(inArray(tracks.id, libraryIds)).all();
  if (addition?.inlineTrack) {
    // The inline library row is inserted in the same guarded batch as its placement.
    library.push({
      ...addition.inlineTrack,
      albumArtUrl: addition.inlineTrack.albumArtUrl ?? null,
      durationMs: addition.inlineTrack.durationMs ?? null,
      displayBpm: addition.inlineTrack.displayBpm ?? null,
      isrc: addition.inlineTrack.isrc ?? null,
      matchKey: addition.inlineTrack.matchKey ?? null,
    });
  }
  if (library.length !== libraryIds.length || library.some((t) => t.ownerUserId !== userId)) {
    throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  }
  const expectedLibrary = JSON.stringify(
    [...library].sort(compareId).map((t) => [t.id, t.ownerUserId, t.durationMs, t.updatedAt]),
  );
  const existingIds = new Set(existing.map((row) => row.id));
  const tracksOnBlock = new Map<string, number>();
  for (const row of existing) {
    if (!row.planBlockId) continue;
    tracksOnBlock.set(row.planBlockId, (tracksOnBlock.get(row.planBlockId) ?? 0) + 1);
  }
  const songMode = body.songBlocks ? songBlockWriteMode(existing.length, blocks) : null;
  const deleteBlockIds =
    songMode == null
      ? []
      : songBlockIdsToDelete(
          songMode,
          blocks.map((block) => ({
            id: block.id,
            recipeBlockKey: block.recipeBlockKey,
            trackCount: tracksOnBlock.get(block.id) ?? 0,
          })),
        );
  const deleteBlockIdSet = new Set(deleteBlockIds);
  const nextBlockPosition =
    blocks
      .filter((block) => !deleteBlockIdSet.has(block.id))
      .reduce((max, block) => Math.max(max, block.position), -1) + 1;
  const newPlacements = body.placements.filter((placement) => !existingIds.has(placement.id));
  const blockIdByPlacement = new Map<string, string>();
  const blocksToInsert: {
    id: string;
    recipeBlockKey: string;
    position: number;
    segmentType: string | null;
    label: string;
    targetDurationMs: number;
    intensity: string;
    teachingGoal: string;
    movementFocus: string;
    guidanceKind: string;
    guidanceJson: string;
  }[] = [];
  if (songMode) {
    newPlacements.forEach((placement, index) => {
      const track = library.find((row) => row.id === placement.trackId)!;
      const draft = playlistSongBlockDraft({
        title: track.title,
        index,
        count: newPlacements.length,
        mode: songMode,
        durationMs: track.durationMs,
        template: cls.template,
      });
      const id = crypto.randomUUID();
      blockIdByPlacement.set(placement.id, id);
      blocksToInsert.push({
        id,
        recipeBlockKey: draft.recipeBlockKey,
        position: nextBlockPosition + index,
        segmentType: draft.segmentType,
        label: draft.label,
        targetDurationMs: draft.targetDurationMs,
        intensity: draft.intensity,
        teachingGoal: draft.teachingGoal,
        movementFocus: draft.movementFocus,
        guidanceKind: draft.guidance.kind,
        guidanceJson: JSON.stringify(draft.guidance),
      });
    });
  }
  const byId = new Map(existing.map((r) => [r.id, r]));
  const durations = new Map(
    joined.map(({ placement: r, duration }) => [
      r.id,
      effectiveDurationMs(duration, r.durationMsOverride, r.clipStartMs, r.clipEndMs) ?? 0,
    ]),
  );
  const now = Date.now();
  const newRows: (typeof classTracks.$inferSelect)[] = [];
  for (const p of body.placements) {
    const present = byId.get(p.id);
    if (present) {
      if (present.trackId !== p.trackId) throw conflict();
      if (!body.songBlocks && present.planBlockId !== (body.planBlockId ?? null)) throw conflict();
      continue;
    }
    const row: typeof classTracks.$inferSelect = {
      id: p.id,
      classId,
      trackId: p.trackId,
      planBlockId: body.songBlocks ? blockIdByPlacement.get(p.id)! : (body.planBlockId ?? null),
      position: 0,
      intensity: addition ? (addition.fields.intensity ?? 'none') : 'mod',
      displayBpmOverride: addition?.fields.displayBpmOverride ?? null,
      durationMsOverride: addition?.fields.durationMsOverride ?? null,
      clipStartMs: addition?.fields.clipStartMs ?? 0,
      clipEndMs: addition?.fields.clipEndMs ?? null,
      beatAnchorMs: addition?.fields.beatAnchorMs ?? 0,
      startOffsetMs: null,
      notes: addition?.fields.notes ?? null,
      displayRpm: addition?.fields.displayRpm ?? null,
      holdCount: addition?.fields.holdCount ?? null,
      createdAt: now,
      updatedAt: now,
    };
    newRows.push(row);
    byId.set(row.id, row);
    durations.set(
      row.id,
      effectiveDurationMs(
        library.find((t) => t.id === row.trackId)!.durationMs,
        row.durationMsOverride,
        row.clipStartMs,
        row.clipEndMs,
      ) ?? 0,
    );
  }
  if (
    body.orderedIds.length !== byId.size ||
    new Set(body.orderedIds).size !== byId.size ||
    body.orderedIds.some((id) => !byId.has(id))
  ) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'Import order must include every class placement exactly once.',
    );
  }
  const result = body.songBlocks
    ? layoutSongBlockCommit({
        orderedIds: body.orderedIds,
        existing,
        existingIds,
        newRows,
        durations,
        now,
      })
    : layoutImportedTracks({
        orderedIds: body.orderedIds,
        byId,
        newRows,
        blockPositions,
        existing,
        durations,
        isFree: cls.timelineMode === 'free',
        now,
      });
  const token = crypto.randomUUID();
  const guard =
    'EXISTS (SELECT 1 FROM class_track_import_operations WHERE id = ? AND writer_token = ?)';
  const statements = [
    env.DB.prepare(
      `INSERT INTO class_track_import_operations
      (id, class_id, request_hash, writer_token, snapshot_valid, result_json, created_at)
      VALUES (?, ?, ?, ?, (${layoutSnapshot}) = ? AND (${blockSnapshot}) = ?
        AND (${librarySnapshot}) = ? AND (SELECT timeline_mode FROM classes WHERE id = ?) = ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`,
    ).bind(
      body.operationId,
      classId,
      hash,
      token,
      classId,
      expectedLayout,
      classId,
      expectedBlocks,
      JSON.stringify(libraryIds),
      expectedLibrary,
      classId,
      cls.timelineMode,
      JSON.stringify(result),
      now,
    ),
    env.DB.prepare(
      `INSERT INTO class_tracks
      (id, class_id, track_id, plan_block_id, position, intensity, start_offset_ms, created_at, updated_at,
       display_bpm_override, duration_ms_override, clip_start_ms, clip_end_ms, beat_anchor_ms, notes, display_rpm, hold_count)
      SELECT json_extract(value, '$.id'), ?, json_extract(value, '$.trackId'),
        json_extract(value, '$.planBlockId'),
        json_extract(value, '$.position'), json_extract(value, '$.intensity'), json_extract(value, '$.startOffsetMs'), ?, json_extract(value, '$.updatedAt'),
        json_extract(value, '$.displayBpmOverride'), json_extract(value, '$.durationMsOverride'),
        json_extract(value, '$.clipStartMs'), json_extract(value, '$.clipEndMs'), json_extract(value, '$.beatAnchorMs'),
        json_extract(value, '$.notes'), json_extract(value, '$.displayRpm'), json_extract(value, '$.holdCount')
      FROM json_each(?) WHERE ${guard}`,
    ).bind(
      classId,
      now,
      JSON.stringify(result.filter((r) => newRows.some((n) => n.id === r.id))),
      body.operationId,
      token,
    ),
    env.DB.prepare(
      `UPDATE class_tracks SET
      position = json_extract((SELECT value FROM json_each(?) WHERE json_extract(value, '$.id') = class_tracks.id), '$.position'),
      start_offset_ms = json_extract((SELECT value FROM json_each(?) WHERE json_extract(value, '$.id') = class_tracks.id), '$.startOffsetMs'),
      updated_at = json_extract((SELECT value FROM json_each(?) WHERE json_extract(value, '$.id') = class_tracks.id), '$.updatedAt')
      WHERE class_id = ? AND ${guard}`,
    ).bind(
      JSON.stringify(result),
      JSON.stringify(result),
      JSON.stringify(result),
      classId,
      body.operationId,
      token,
    ),
    env.DB.prepare(
      `UPDATE classes SET updated_at = max(updated_at + 1, ?) WHERE id = ? AND ${guard}`,
    ).bind(now, classId, body.operationId, token),
  ];
  // Block deletes and inserts share the operation's snapshot guard, so a stale
  // plan rolls the receipt and the new blocks back together.
  const blockStatements: D1PreparedStatement[] = [];
  if (deleteBlockIds.length > 0) {
    blockStatements.push(
      env.DB.prepare(
        `DELETE FROM class_plan_blocks
        WHERE class_id = ? AND id IN (SELECT value FROM json_each(?))
          AND NOT EXISTS (
            SELECT 1 FROM class_tracks WHERE class_tracks.plan_block_id = class_plan_blocks.id
          )
          AND ${guard}`,
      ).bind(classId, JSON.stringify(deleteBlockIds), body.operationId, token),
    );
  }
  if (blocksToInsert.length > 0) {
    blockStatements.push(
      env.DB.prepare(
        `INSERT INTO class_plan_blocks
        (id, class_id, recipe_block_key, position, segment_type, label, target_duration_ms,
         intensity, teaching_goal, movement_focus, guidance_kind, guidance_json, created_at, updated_at)
        SELECT json_extract(value, '$.id'), ?, json_extract(value, '$.recipeBlockKey'),
          json_extract(value, '$.position'), json_extract(value, '$.segmentType'),
          json_extract(value, '$.label'), json_extract(value, '$.targetDurationMs'),
          json_extract(value, '$.intensity'), json_extract(value, '$.teachingGoal'),
          json_extract(value, '$.movementFocus'), json_extract(value, '$.guidanceKind'),
          json_extract(value, '$.guidanceJson'), ?, ?
        FROM json_each(?) WHERE ${guard}`,
      ).bind(classId, now, now, JSON.stringify(blocksToInsert), body.operationId, token),
    );
  }
  // Deletes leave gaps (a kept block can stay at position 2 while the new song
  // block lands at 3). Add-block uses the row count as the next position, so a
  // gap equal to that count hits the (class_id, position) unique index and the
  // request 500s. Block numbers are also position+1, so the gap mislabels the
  // class. Compact downward, low positions first, so each target slot is free.
  if (songMode) {
    const orderedBlocks = [
      ...blocks
        .filter((block) => !deleteBlockIdSet.has(block.id))
        .sort((a, b) => a.position - b.position || compareId(a, b)),
      ...blocksToInsert,
    ];
    orderedBlocks.forEach((block, index) => {
      if (block.position === index) return;
      blockStatements.push(
        env.DB.prepare(
          `UPDATE class_plan_blocks SET position = ?, updated_at = ?
           WHERE class_id = ? AND id = ? AND ${guard}`,
        ).bind(index, now, classId, block.id, body.operationId, token),
      );
    });
  }
  statements.splice(1, 0, ...blockStatements);
  if (addition?.inlineTrack) {
    const query = db.insert(tracks).values(addition.inlineTrack).toSQL();
    statements.unshift(env.DB.prepare(query.sql).bind(...query.params));
  }
  if (addition) {
    // Single adds cannot replay their server-generated operation ID. Retain the
    // writer guard only for this batch, rather than accumulating class snapshots.
    statements.push(
      env.DB.prepare(
        'DELETE FROM class_track_import_operations WHERE id = ? AND writer_token = ?',
      ).bind(body.operationId, token),
    );
  }
  try {
    await env.DB.batch(statements);
  } catch (error) {
    // A concurrent identical operation may have won while this request read its
    // snapshot. Return its receipt without replaying any layout writes.
    const won = await readReceipt();
    if (won) return won;
    if (
      String(error).includes('class_track_import_snapshot_check') ||
      String(error).includes('UNIQUE constraint')
    )
      throw conflict();
    throw error;
  }
  return addition ? result : (await readReceipt())!;
}
