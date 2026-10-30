/**
 * Debug-only Start timing for provider adapters (RF-128). Off by default; it
 * writes nothing and reads no clock unless the tester opts in, so production
 * behaviour is unchanged.
 *
 * Opt in for one tab by opening the app with `?playback-timing=1` (kept in
 * sessionStorage, so in-app navigation keeps it), or for the browser with
 * `localStorage['ritmo-playback-timing'] = '1'`. Two kinds of line, each
 * `<prefix> timing <step> +<ms>ms`:
 *   - `[ritmo playback <provider>] timing settle-wait / settle-wait-done`: the
 *     runtime's bounded wait for a cancelled start of the same provider
 *     (RF-108), timed on its own because it runs before the adapter exists.
 *     Start class from rest never waits, so it never prints these.
 *   - `[ritmo apple-music] timing <step>`: measured from the Apple adapter's
 *     prepare, which on Start class runs in the same task as the tap.
 * Add the two for a start that waited. Lines carry step names only: never a
 * token, title, or provider id.
 */
export const PLAYBACK_TIMING_KEY = 'ritmo-playback-timing';
const PLAYBACK_TIMING_PARAM = 'playback-timing';

export interface StartTimer {
  mark(step: string): void;
}

export const NO_START_TIMER: StartTimer = { mark() {} };

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
export function startTimer(
  prefix: string,
  now: () => number = () => performance.now(),
): StartTimer {
  if (!playbackTimingEnabled()) return NO_START_TIMER;
  const began = now();
  const seen = new Set<string>();
  return {
    mark(step: string) {
      // A step repeats on a re-cue; keep its first time and label the repeat.
      const label = seen.has(step) ? `${step} (again)` : step;
      seen.add(step);
      console.info(`${prefix} timing ${label} +${Math.round(now() - began)}ms`);
    },
  };
}
