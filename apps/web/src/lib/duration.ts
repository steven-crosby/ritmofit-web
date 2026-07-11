import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';

/** Format milliseconds for the builder's editable duration field. */
export function formatDurationInput(ms: number | null): string {
  if (ms == null) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Parse a positive `m:ss` timecode. */
export function parseDurationInput(value: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const milliseconds = (Number(match[1]) * 60 + Number(match[2])) * 1000;
  return milliseconds > 0 ? milliseconds : null;
}

/**
 * Format an in-track anchor (ms) as `m:ss`. Unlike `formatDurationInput`, `0`
 * renders as `0:00` — a cue/move/segment at the very start is a valid anchor,
 * not an empty field. Negatives clamp to 0.
 */
export function formatClockFromMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse an in-track anchor `m:ss` timecode to ms. Unlike `parseDurationInput`,
 * `0:00` is valid and returns `0` (an anchor at the track/class start). Returns
 * `null` on malformed input.
 */
export function parseClockToMs(value: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 1000;
}

/** UI-ready validation of an `m:ss` anchor field against an optional upper bound. */
export type AnchorFieldState = {
  /** Parsed anchor in ms, or `null` when the field can't be submitted (malformed or past `maxMs`). */
  ms: number | null;
  /** True when the current value is non-submittable. */
  invalid: boolean;
  /** Inline message to show, or `null` (an untouched/empty field shows nothing). */
  message: string | null;
};

/**
 * Validate an `m:ss` anchor field for the cue/move/segment editors: parse it and
 * bound it to `maxMs` (the track or class length) so an out-of-range anchor is
 * caught client-side with a friendly message instead of the server's generic 422.
 * An empty field is invalid (callers disable submit) but shows no message.
 */
export function anchorFieldState(value: string, maxMs: number | null): AnchorFieldState {
  const ms = parseClockToMs(value);
  if (ms == null) {
    return { ms: null, invalid: true, message: value.trim() ? 'Use m:ss (e.g. 1:30).' : null };
  }
  if (maxMs != null && ms > maxMs) {
    return { ms: null, invalid: true, message: `Past the end (max ${formatClockFromMs(maxMs)}).` };
  }
  return { ms, invalid: false, message: null };
}

export function tracksMissingDuration(payload: RunPayload): RunPayloadTrackEntry[] {
  return payload.tracks.filter((entry) => entry.track.durationMs == null);
}

export function canRunPayload(payload: RunPayload): boolean {
  return payload.tracks.length > 0 && tracksMissingDuration(payload).length === 0;
}

export function runBlockedMessage(payload: RunPayload): string | null {
  if (payload.tracks.length === 0) return 'Add a track before starting Live mode.';
  const missing = tracksMissingDuration(payload);
  if (missing.length === 0) return null;
  const names = missing.map((entry) => entry.track.title).join(', ');
  return `Set a duration for ${names} before starting Live mode.`;
}
