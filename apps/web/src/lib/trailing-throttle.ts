/** A trailing-edge throttle: the first call in a quiet window fires immediately;
 * subsequent calls within `waitMs` of the last fire are coalesced into one
 * final call once the window elapses, so a burst of calls with the same
 * (latest) value fires far fewer times than it's called. `flush` bypasses the
 * window entirely — used for a caller-guaranteed immediate call (e.g. commit
 * on pointer release) that also cancels anything still pending.
 *
 * `firedLast(value)` says whether the value `fn` actually ran with last (by
 * `call`, its trailing timer, or `flush`) is exactly this value. A pending,
 * unfired value never counts: it has not reached `fn`. A Live timeline release
 * uses it: when the gesture's position is the one already sent to the provider
 * (a tap, or a drag that rested), the release cancels whatever is still
 * pending, sends nothing, and leaves the clock to follow the provider.
 * Re-sending it started a second provider adapter about 60 ms later (RF-108,
 * RF-185). The rule must keep this case: down fires A, a fast move leaves B
 * pending, release at B. A was fired last, so B is still sent. */
export interface TrailingThrottle<T> {
  call: (value: T) => void;
  flush: (value: T) => void;
  /** Drop a pending call and forget the last fired value. */
  cancel: () => void;
  firedLast: (value: T) => boolean;
}

export function createTrailingThrottle<T>(
  fn: (value: T) => void,
  waitMs: number,
  now: () => number = () => performance.now(),
): TrailingThrottle<T> {
  let lastFireAt = -Infinity;
  let pending: ReturnType<typeof setTimeout> | null = null;
  /** The value `fn` last ran with, until `cancel`. */
  let lastFired: { value: T } | null = null;

  const clearPending = () => {
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
  };

  const fire = (value: T) => {
    lastFireAt = now();
    lastFired = { value };
    fn(value);
  };

  const flush = (value: T) => {
    clearPending();
    fire(value);
  };

  const call = (value: T) => {
    const elapsed = now() - lastFireAt;
    clearPending();
    if (elapsed >= waitMs) {
      fire(value);
      return;
    }
    pending = setTimeout(() => {
      pending = null;
      fire(value);
    }, waitMs - elapsed);
  };

  return {
    call,
    flush,
    cancel: () => {
      lastFired = null;
      clearPending();
    },
    firedLast: (value) => lastFired !== null && Object.is(lastFired.value, value),
  };
}
