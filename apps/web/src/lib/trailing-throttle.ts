/** A trailing-edge throttle: the first call in a quiet window fires immediately;
 * subsequent calls within `waitMs` of the last fire are coalesced into one
 * final call once the window elapses, so a burst of calls with the same
 * (latest) value fires far fewer times than it's called. `flush` bypasses the
 * window entirely — used for a caller-guaranteed immediate call (e.g. commit
 * on pointer release) that also cancels anything still pending. */
export interface TrailingThrottle<T> {
  call: (value: T) => void;
  flush: (value: T) => void;
}

export function createTrailingThrottle<T>(
  fn: (value: T) => void,
  waitMs: number,
  now: () => number = () => performance.now(),
): TrailingThrottle<T> {
  let lastFireAt = -Infinity;
  let pending: ReturnType<typeof setTimeout> | null = null;

  const clearPending = () => {
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
  };

  const flush = (value: T) => {
    clearPending();
    lastFireAt = now();
    fn(value);
  };

  const call = (value: T) => {
    const elapsed = now() - lastFireAt;
    if (elapsed >= waitMs) {
      flush(value);
      return;
    }
    clearPending();
    pending = setTimeout(() => {
      pending = null;
      flush(value);
    }, waitMs - elapsed);
  };

  return { call, flush };
}
