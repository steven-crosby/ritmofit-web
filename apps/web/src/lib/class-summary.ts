/**
 * Pure derivations for the class-header summary (builder center column):
 * track count · total duration · average BPM. All computed from the existing
 * run-payload — no new schema or data. Kept here so they're unit-testable and
 * the layout component stays presentational.
 */
import type { RunPayload } from '@ritmofit/shared';

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
