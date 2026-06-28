/**
 * Pure derivations for the class-header summary (builder center column):
 * track count · total duration · average BPM. All computed from the existing
 * run-payload — no new schema or data. Kept here so they're unit-testable and
 * the layout component stays presentational.
 */
import { CLASS_LIST_ITEM_ART_LIMIT, type ClassListItem, type RunPayload } from '@ritmofit/shared';

/** The Library-card aggregates a class list item carries. */
export type CardSummary = Pick<ClassListItem, 'trackCount' | 'totalDurationMs' | 'albumArtUrls'>;

/**
 * Derive the Library-card aggregates from a class's run-payload — the *same* values
 * `GET /classes` computes server-side (the run-payload uses the identical timeline +
 * clip-window resolution, and album art is collected in track order). Lets the open
 * class's card update in place after a track change without refetching the whole list.
 */
export function cardSummaryFromPayload(payload: RunPayload): CardSummary {
  const albumArtUrls: string[] = [];
  const seen = new Set<string>();
  for (const entry of payload.tracks) {
    if (albumArtUrls.length >= CLASS_LIST_ITEM_ART_LIMIT) break;
    const url = entry.track.albumArtUrl;
    if (url && !seen.has(url)) {
      seen.add(url);
      albumArtUrls.push(url);
    }
  }
  return {
    trackCount: payload.tracks.length,
    totalDurationMs: payload.class.totalDurationMs,
    albumArtUrls,
  };
}

/**
 * Average display BPM across the tracks that have one, rounded to a whole
 * number. Tracks without a `displayBpm` are excluded from the mean (not counted
 * as zero); `null` when no track has a BPM so the caller can omit the stat.
 */
export function avgBpm(payload: RunPayload): number | null {
  const bpms = payload.tracks.map((t) => t.displayBpm).filter((b): b is number => b != null);
  if (bpms.length === 0) return null;
  return Math.round(bpms.reduce((sum, b) => sum + b, 0) / bpms.length);
}

/**
 * Format a millisecond duration as a clock string: `m:ss`, or `h:mm:ss` once it
 * reaches an hour. Negative inputs clamp to 0. Used for the assembled
 * `totalDurationMs` in the header.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = seconds.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}
