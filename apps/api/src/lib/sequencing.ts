/**
 * Timeline sequencing for a class's tracks (schema.md → `class_tracks`).
 *
 * M1 is sequential, back-to-back: `position` is contiguous from 0, and
 * `startOffsetMs` is the cumulative sum of preceding tracks' `durationMs` (a null
 * duration contributes 0 — manual entry may leave it blank). Both are
 * **server-derived**; clients treat `startOffsetMs` as read-only. Free placement /
 * gaps are a later milestone — deliberately not modelled here.
 */
import { eq } from 'drizzle-orm';
import { classTracks, tracks } from '../db/schema.js';
import type { Db } from './db.js';
import { effectiveDurationMs } from './duration.js';

export interface SequenceInput {
  id: string;
  durationMs: number | null;
}
export interface SequenceEntry {
  id: string;
  position: number;
  startOffsetMs: number;
}

/**
 * Pure position/offset math over an already-ordered list — the unit-tested core.
 */
export function computeSequence(items: ReadonlyArray<SequenceInput>): SequenceEntry[] {
  let offset = 0;
  return items.map((item, index) => {
    const entry: SequenceEntry = { id: item.id, position: index, startOffsetMs: offset };
    offset += item.durationMs ?? 0;
    return entry;
  });
}

/**
 * Recompute and persist `position` + `startOffsetMs` for a class's tracks. Call
 * after any add / delete / reorder / copy. Pass `orderedIds` to impose an explicit
 * order (reorder); otherwise the current `position` order is preserved and merely
 * made contiguous. Writes atomically via `db.batch` (D1 has no interactive txns).
 */
export async function resequence(db: Db, classId: string, orderedIds?: string[]): Promise<void> {
  const rows = await db
    .select({
      id: classTracks.id,
      trackDurationMs: tracks.durationMs,
      durationMsOverride: classTracks.durationMsOverride,
    })
    .from(classTracks)
    .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();

  let ordered: SequenceInput[] = rows.map((row) => ({
    id: row.id,
    durationMs: effectiveDurationMs(row.trackDurationMs, row.durationMsOverride),
  }));
  if (orderedIds) {
    const byId = new Map(ordered.map((r) => [r.id, r]));
    ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((r): r is SequenceInput => r !== undefined);
  }

  const sequence = computeSequence(ordered);
  if (sequence.length === 0) return;

  const now = Date.now();
  const statements = sequence.map((s) =>
    db
      .update(classTracks)
      .set({ position: s.position, startOffsetMs: s.startOffsetMs, updatedAt: now })
      .where(eq(classTracks.id, s.id)),
  );
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
}
