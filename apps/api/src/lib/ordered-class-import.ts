import { eq, inArray } from 'drizzle-orm';
import type { AddClassTrack, ClassTrack, ImportClassTracks } from '@ritmofit/shared';
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
    .select({ id: classPlanBlocks.id, position: classPlanBlocks.position })
    .from(classPlanBlocks)
    .where(eq(classPlanBlocks.classId, classId))
    .all();
  const blockPositions = new Map(blocks.map((b) => [b.id, b.position]));
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
      if (present.trackId !== p.trackId || present.planBlockId !== (body.planBlockId ?? null))
        throw conflict();
      continue;
    }
    const row: typeof classTracks.$inferSelect = {
      id: p.id,
      classId,
      trackId: p.trackId,
      planBlockId: body.planBlockId ?? null,
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
  let ordered = body.orderedIds.map((id, position) => ({ ...byId.get(id)!, position }));
  const planned = orderTrackIdsByPlan(ordered, blockPositions);
  ordered = planned.map((id, position) => ({ ...byId.get(id)!, position }));
  const isFree = cls.timelineMode === 'free';
  if (
    isFree &&
    ordered
      .filter((r) => !newRows.some((n) => n.id === r.id))
      .some((r, i) => r.id !== existing[i]?.id)
  )
    throw conflict();
  let offset = 0;
  const result = ordered.map((row, i) => {
    const isNew = newRows.some((n) => n.id === row.id);
    const startOffsetMs = isFree && !isNew ? (row.startOffsetMs ?? 0) : offset;
    const end = startOffsetMs + durations.get(row.id)!;
    if (isFree && isNew) {
      const next = ordered.slice(i + 1).find((r) => !newRows.some((n) => n.id === r.id));
      if (next && end > (next.startOffsetMs ?? 0)) {
        throw new HttpError(
          409,
          'CONFLICT',
          'There is no room for this song on the free timeline. Use sequential mode to restore playlist order.',
        );
      }
    }
    offset = Math.max(offset, end);
    const old = byId.get(row.id)!;
    return serializeClassTrack({
      ...row,
      startOffsetMs,
      updatedAt:
        old.position !== row.position || old.startOffsetMs !== startOffsetMs
          ? Math.max(now, old.updatedAt + 1)
          : old.updatedAt,
    });
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
      SELECT json_extract(value, '$.id'), ?, json_extract(value, '$.trackId'), ?,
        json_extract(value, '$.position'), json_extract(value, '$.intensity'), json_extract(value, '$.startOffsetMs'), ?, json_extract(value, '$.updatedAt'),
        json_extract(value, '$.displayBpmOverride'), json_extract(value, '$.durationMsOverride'),
        json_extract(value, '$.clipStartMs'), json_extract(value, '$.clipEndMs'), json_extract(value, '$.beatAnchorMs'),
        json_extract(value, '$.notes'), json_extract(value, '$.displayRpm'), json_extract(value, '$.holdCount')
      FROM json_each(?) WHERE ${guard}`,
    ).bind(
      classId,
      body.planBlockId ?? null,
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
  if (addition?.inlineTrack) {
    const query = db.insert(tracks).values(addition.inlineTrack).toSQL();
    statements.unshift(env.DB.prepare(query.sql).bind(...query.params));
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
  return (await readReceipt())!;
}
