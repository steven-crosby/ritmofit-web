/**
 * Debug-only playback timing (RF-128). It is off by default, and when off it
 * writes nothing and changes no behaviour, so production playback is the same
 * as without it.
 *
 * To opt in for one tab, open the app with `?playback-timing=1`. The flag is
 * kept in sessionStorage, so in-app navigation keeps it. To opt in for the
 * whole browser, set `localStorage['ritmo-playback-timing'] = '1'`.
 *
 * Each line reads `<prefix> timing <step> +<ms>ms [detail]`, where the offset
 * is measured from the adapter's prepare. On Start class, prepare runs in the
 * same task as the tap. Every Apple adapter gets its own number in the prefix
 * (`[ritmo apple-music #3]`). A cancelled adapter keeps logging its MusicKit
 * calls as they finish, so quick timeline taps show how long a cancelled
 * request takes to end. Lines carry step names, durations and outcomes only:
 * never a token, title, or provider id.
 */
export const PLAYBACK_TIMING_KEY = 'ritmo-playback-timing';
const PLAYBACK_TIMING_PARAM = 'playback-timing';

export interface StartTimer {
  mark(step: string, detail?: string): void;
}

export const NO_START_TIMER: StartTimer = { mark() {} };

/** A monotonic clock for durations; falls back to Date.now where performance is missing. */
export function timingNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

export function playbackTimingEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).get(PLAYBACK_TIMING_PARAM) === '1') {
      window.sessionStorage.setItem(PLAYBACK_TIMING_KEY, '1');
    }
    return (
      window.sessionStorage.getItem(PLAYBACK_TIMING_KEY) === '1' ||
      window.localStorage.getItem(PLAYBACK_TIMING_KEY) === '1'
    );
  } catch {
    // Blocked storage (private mode, sandbox) means timing stays off.
    return false;
  }
}

/** A timer that logs each step's offset from now, or a no-op when timing is off. */
export function startTimer(prefix: string, now: () => number = timingNow): StartTimer {
  if (!playbackTimingEnabled()) return NO_START_TIMER;
  const began = now();
  const seen = new Set<string>();
  return {
    mark(step: string, detail?: string) {
      // A step repeats on a re-cue; keep its first time and label the repeat.
      const label = seen.has(step) ? `${step} (again)` : step;
      seen.add(step);
      const suffix = detail ? ` ${detail}` : '';
      console.info(`${prefix} timing ${label} +${Math.round(now() - began)}ms${suffix}`);
    },
  };
}
