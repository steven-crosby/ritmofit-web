/**
 * Library-card aggregates (Session 3) — the per-class summary the class list returns
 * so the Library rail can show a track count, total runtime, and a track-art collage
 * without opening each class.
 *
 * The total runtime is resolved the **same way** as the run-payload (clip windows via
 * `effectiveDurationMs`, then `computeClassTimeline` / `computeFreeTimeline` by timeline
 * mode), so a card's duration matches the header shown once the class is opened. This
 * module is pure (no DB) so the aggregation is unit-tested against fixed rows; the
 * Drizzle fetch lives in `authz.ts` next to the list query.
 */
import { effectiveDurationMs } from './duration.js';
import { computeClassTimeline, computeFreeTimeline } from './run-payload.js';
import type { TimelineMode } from '@ritmofit/shared';

/** One class_track row (joined to its track) needed to summarize a class card. */
export interface ClassTrackSummaryRow {
  classId: string;
  /** Position order within the class; rows must be passed in this order per class. */
  position: number;
  startOffsetMs: number | null;
  durationMsOverride: number | null;
  clipStartMs: number | null;
  clipEndMs: number | null;
  trackDurationMs: number | null;
  albumArtUrl: string | null;
}

/** The card aggregates for one class. */
export interface ClassCardSummary {
  trackCount: number;
  totalDurationMs: number;
  albumArtUrls: string[];
}

const EMPTY: ClassCardSummary = { trackCount: 0, totalDurationMs: 0, albumArtUrls: [] };

/** The summary for a class with no tracks (a fresh draft) — all zero/empty. */
export function emptyClassCardSummary(): ClassCardSummary {
  return { ...EMPTY, albumArtUrls: [] };
}

/**
 * Aggregate position-ordered class_track rows into per-class card summaries. Rows for a
 * class must arrive in `position` order (the list query orders by class then position).
 * `timelineModeByClass` selects the same total-duration resolution the run-payload uses;
 * a class missing from the map defaults to sequential. `artLimit` bounds the collage.
 */
export function aggregateClassCards(
  rows: readonly ClassTrackSummaryRow[],
  timelineModeByClass: Map<string, TimelineMode>,
  artLimit: number,
): Map<string, ClassCardSummary> {
  const byClass = new Map<string, ClassTrackSummaryRow[]>();
  for (const row of rows) {
    const list = byClass.get(row.classId);
    if (list) list.push(row);
    else byClass.set(row.classId, [row]);
  }

  const result = new Map<string, ClassCardSummary>();
  for (const [classId, classRows] of byClass) {
    const entries = classRows.map((r, i) => ({
      id: String(i),
      startOffsetMs: r.startOffsetMs,
      durationMs: effectiveDurationMs(
        r.trackDurationMs,
        r.durationMsOverride,
        r.clipStartMs,
        r.clipEndMs,
      ),
    }));
    const mode = timelineModeByClass.get(classId) ?? 'sequential';
    const { totalDurationMs } =
      mode === 'free' ? computeFreeTimeline(entries) : computeClassTimeline(entries);

    // Distinct, non-null album art in track order, capped for a fixed collage layout.
    const albumArtUrls: string[] = [];
    const seen = new Set<string>();
    for (const r of classRows) {
      if (albumArtUrls.length >= artLimit) break;
      if (r.albumArtUrl && !seen.has(r.albumArtUrl)) {
        seen.add(r.albumArtUrl);
        albumArtUrls.push(r.albumArtUrl);
      }
    }

    result.set(classId, { trackCount: classRows.length, totalDurationMs, albumArtUrls });
  }
  return result;
}
