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
