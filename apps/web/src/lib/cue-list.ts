import { cueIntensityValues, type CueIntensity } from '@ritmofit/shared';

/** Words she uses on a cue. Track intensity keeps its own zone labels. */
export const CUE_INTENSITY_LABEL: Record<CueIntensity, string> = {
  none: 'None',
  easy: 'Easy',
  mod: 'Mod',
  hard: 'Hard',
  all_out: 'All Out',
  open: 'Open',
};

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export type CueCountField = { ok: true; value: number | null } | { ok: false; message: string };

/** Blank is unset. Whole seconds (3, 15, 31, 48) become milliseconds. */
export function parseCueDurationSeconds(raw: string): CueCountField {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return { ok: false, message: 'Use whole seconds, such as 15.' };
  }
  const ms = Number(trimmed) * 1000;
  if (!Number.isSafeInteger(ms) || ms > MAX_DURATION_MS) {
    return { ok: false, message: 'Duration is too long.' };
  }
  return { ok: true, value: ms };
}

/** Blank is unset. She types the cue BPM; nothing copies the track or Spotify. */
export function parseCueBpm(raw: string): CueCountField {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return { ok: false, message: 'Use a whole BPM, such as 128.' };
  }
  const bpm = Number(trimmed);
  if (!Number.isSafeInteger(bpm)) return { ok: false, message: 'BPM is too large.' };
  return { ok: true, value: bpm };
}

export function formatCueDurationLabel(durationMs: number | null | undefined): string | null {
  if (durationMs == null) return null;
  const seconds = durationMs / 1000;
  const text = Number.isInteger(seconds) ? String(seconds) : String(seconds);
  return `${text}s`;
}

/**
 * Glanceable hold remaining. Whole seconds stay `15s`; a tenth stays `1.5s`
 * or `0.4s`. The live clock is fractional, so further digits are rounded off
 * instead of printed on the hero.
 */
export function formatCueHoldCountdown(remainingMs: number): string {
  if (!Number.isFinite(remainingMs)) return '0s';
  const tenths = Math.max(0, Math.round(remainingMs / 100));
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return frac === 0 ? `${whole}s` : `${whole}.${frac}s`;
}

export function formatCueDurationInput(durationMs: number | null | undefined): string {
  if (durationMs == null) return '';
  return String(durationMs / 1000);
}

export function parseCueIntensity(raw: string): CueIntensity | null {
  return (cueIntensityValues as readonly string[]).includes(raw) ? (raw as CueIntensity) : null;
}
