/**
 * Timeline sequencing for a class's tracks (schema.md → `class_tracks`).
 *
 * Two modes (`classes.timeline_mode`):
 * - **sequential** (default): `position` is contiguous from 0 and `startOffsetMs`
 *   is the cumulative sum of preceding tracks' effective durations (a null duration
 *   contributes 0). Both are **server-derived**; clients treat `startOffsetMs` as
 *   read-only.
 * - **free**: `startOffsetMs` is **user-authored** (gaps allowed, overlaps rejected
 *   by the route); `position` is **derived** by ranking tracks on their offset, so
 *   the list order always matches the timeline order. `resequence` re-ranks position
 *   but never rewrites the authored offsets.
 */
import { eq } from 'drizzle-orm';
import { classes, classTracks, tracks } from '../db/schema.js';
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
 * Pure position/offset math over an already-ordered list — the unit-tested core of
 * the **sequential** layout.
 */
export function computeSequence(items: ReadonlyArray<SequenceInput>): SequenceEntry[] {
  let offset = 0;
  return items.map((item, index) => {
    const entry: SequenceEntry = { id: item.id, position: index, startOffsetMs: offset };
    offset += item.durationMs ?? 0;
    return entry;
  });
}

interface ClassTrackRow {
  id: string;
  position: number;
  startOffsetMs: number | null;
  trackDurationMs: number | null;
  durationMsOverride: number | null;
  clipStartMs: number;
  clipEndMs: number | null;
}

/** Load a class's tracks (position order) with everything the layout math needs. */
async function loadRows(db: Db, classId: string): Promise<ClassTrackRow[]> {
  return db
    .select({
      id: classTracks.id,
      position: classTracks.position,
      startOffsetMs: classTracks.startOffsetMs,
      trackDurationMs: tracks.durationMs,
      durationMsOverride: classTracks.durationMsOverride,
      clipStartMs: classTracks.clipStartMs,
      clipEndMs: classTracks.clipEndMs,
    })
    .from(classTracks)
    .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();
}

const rowDuration = (r: ClassTrackRow) =>
  effectiveDurationMs(r.trackDurationMs, r.durationMsOverride, r.clipStartMs, r.clipEndMs);

/** The class's timeline mode (defaults sequential if the row is somehow missing). */
export async function timelineModeOf(db: Db, classId: string): Promise<'sequential' | 'free'> {
  const cls = await db
    .select({ mode: classes.timelineMode })
    .from(classes)
    .where(eq(classes.id, classId))
    .get();
  return cls?.mode === 'free' ? 'free' : 'sequential';
}

/**
 * Recompute and persist the layout for a class's tracks. Call after any add /
 * delete / reorder / copy / offset change. In **sequential** mode it makes
 * `position` contiguous and rewrites `startOffsetMs` (pass `orderedIds` to impose a
 * reorder). In **free** mode it re-ranks `position` by the authored `startOffsetMs`
 * and leaves offsets untouched. Writes atomically via `db.batch` (D1 has no txns).
 */
export async function resequence(db: Db, classId: string, orderedIds?: string[]): Promise<void> {
  const mode = await timelineModeOf(db, classId);
  const rows = await loadRows(db, classId);
  if (rows.length === 0) return;
  const now = Date.now();

  if (mode === 'free') {
    // Rank by authored offset (stable on the current position order for ties);
    // assign contiguous position, never touching startOffsetMs.
    const ranked = [...rows].sort((a, b) => (a.startOffsetMs ?? 0) - (b.startOffsetMs ?? 0));
    const statements = ranked.flatMap((r, i) =>
      r.position === i
        ? []
        : [db.update(classTracks).set({ position: i, updatedAt: now }).where(eq(classTracks.id, r.id))],
    );
    if (statements.length > 0) {
      await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
    }
    return;
  }

  // Sequential: position contiguous + offsets cumulative (optionally reordered).
  let ordered: SequenceInput[] = rows.map((r) => ({ id: r.id, durationMs: rowDuration(r) }));
  if (orderedIds) {
    const byId = new Map(ordered.map((r) => [r.id, r]));
    ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((r): r is SequenceInput => r !== undefined);
  }
  const sequence = computeSequence(ordered);
  const statements = sequence.map((s) =>
    db
      .update(classTracks)
      .set({ position: s.position, startOffsetMs: s.startOffsetMs, updatedAt: now })
      .where(eq(classTracks.id, s.id)),
  );
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
}

/**
 * Seed authored offsets when a class switches **into** free mode: write each track's
 * current sequential offset so the timeline looks identical, then the instructor can
 * drag tracks apart. Positions stay contiguous. No-op for an empty class.
 */
export async function seedFreeOffsets(db: Db, classId: string): Promise<void> {
  const rows = await loadRows(db, classId);
  if (rows.length === 0) return;
  const sequence = computeSequence(rows.map((r) => ({ id: r.id, durationMs: rowDuration(r) })));
  const now = Date.now();
  const statements = sequence.map((s) =>
    db
      .update(classTracks)
      .set({ position: s.position, startOffsetMs: s.startOffsetMs, updatedAt: now })
      .where(eq(classTracks.id, s.id)),
  );
  await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
}

/**
 * The next free-mode append offset: the end of the latest-ending track, or 0 for an
 * empty class. So a newly added track lands right after the current material.
 */
export async function freeAppendOffsetMs(db: Db, classId: string): Promise<number> {
  const rows = await loadRows(db, classId);
  return rows.reduce((max, r) => Math.max(max, (r.startOffsetMs ?? 0) + (rowDuration(r) ?? 0)), 0);
}

/**
 * Would placing `classTrackId` at `[startOffsetMs, startOffsetMs + duration)` overlap
 * any sibling's window? Pass `selfDurationMs` to reflect a duration/clip change made
 * in the same request (else the stored duration is used). Unknown durations count as
 * a zero-width point. Pure decision lives in `overlapsAny`; this loads the siblings.
 */
export async function wouldOverlap(
  db: Db,
  classId: string,
  classTrackId: string,
  startOffsetMs: number,
  selfDurationMs?: number | null,
): Promise<boolean> {
  const rows = await loadRows(db, classId);
  const self = rows.find((r) => r.id === classTrackId);
  const selfDur =
    selfDurationMs !== undefined ? (selfDurationMs ?? 0) : self ? (rowDuration(self) ?? 0) : 0;
  const others = rows
    .filter((r) => r.id !== classTrackId)
    .map((r) => ({ start: r.startOffsetMs ?? 0, dur: rowDuration(r) ?? 0 }));
  return overlapsAny({ start: startOffsetMs, dur: selfDur }, others);
}

/** Pure overlap test: does `candidate` intersect any window in `others`? (half-open) */
export function overlapsAny(
  candidate: { start: number; dur: number },
  others: ReadonlyArray<{ start: number; dur: number }>,
): boolean {
  const aStart = candidate.start;
  const aEnd = candidate.start + candidate.dur;
  return others.some((o) => {
    const bEnd = o.start + o.dur;
    // Zero-width windows can't overlap; touching edges (aEnd === bStart) are allowed.
    if (candidate.dur === 0 || o.dur === 0) return false;
    return aStart < bEnd && o.start < aEnd;
  });
}
