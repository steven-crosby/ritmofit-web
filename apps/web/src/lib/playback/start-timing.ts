/**
 * Debug-only playback timing (RF-128). It is off by default, and when off it
 * writes nothing and changes no behaviour, so production playback is the same
 * as without it.
 *
 * The opt-in is read once, at app boot (`main.tsx` calls `initPlaybackTiming`),
 * and every later check uses that cached value:
 *   - `?playback-timing=1` turns it on for this tab (kept in sessionStorage).
 *   - `?playback-timing=0` turns it off and clears both the tab opt-in and
 *     the browser opt-in.
 *   - `localStorage['ritmo-playback-timing'] = '1'` turns it on for the browser.
 * Blocked storage means it stays off.
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

let cachedEnabled: boolean | null = null;

function readOptIn(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const param = new URLSearchParams(window.location.search).get(PLAYBACK_TIMING_PARAM);
    if (param === '1') window.sessionStorage.setItem(PLAYBACK_TIMING_KEY, '1');
    if (param === '0') {
      window.sessionStorage.removeItem(PLAYBACK_TIMING_KEY);
      window.localStorage.removeItem(PLAYBACK_TIMING_KEY);
      return false;
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

/**
 * Read the opt-in once and cache it. App boot calls this before any in-app
 * navigation can drop the query string; later calls return the cached value.
 */
export function initPlaybackTiming(): boolean {
  if (cachedEnabled === null) cachedEnabled = readOptIn();
  return cachedEnabled;
}

/** The cached opt-in (read once; see `initPlaybackTiming`). */
export function playbackTimingEnabled(): boolean {
  return initPlaybackTiming();
}

/** Test-only: forget the cached opt-in so the next check reads it again. */
export function resetPlaybackTimingForTests(): void {
  cachedEnabled = null;
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
