/** A trailing-edge throttle: the first call in a quiet window fires immediately;
 * subsequent calls within `waitMs` of the last fire are coalesced into one
 * final call once the window elapses, so a burst of calls with the same
 * (latest) value fires far fewer times than it's called. `flush` bypasses the
 * window entirely — used for a caller-guaranteed immediate call (e.g. commit
 * on pointer release) that also cancels anything still pending.
 *
 * `firedLast(value)` says whether `call` already ran `fn` with exactly this
 * value and nothing is pending or called since. A Live timeline release uses
 * it: when the gesture's position was already sent to the provider (a tap,
 * or a drag that rested), the release sends nothing and leaves the clock to
 * follow the provider. Re-sending it started a second provider adapter about
 * 60 ms later (RF-108). */
export interface TrailingThrottle<T> {
  call: (value: T) => void;
  flush: (value: T) => void;
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
  /** The value `call` last fired, until the next `call`, `flush` or `cancel`. */
  let calledFire: { value: T } | null = null;

  const clearPending = () => {
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
  };

  const fire = (value: T) => {
    lastFireAt = now();
    fn(value);
  };

  const flush = (value: T) => {
    calledFire = null;
    clearPending();
    fire(value);
  };

  const call = (value: T) => {
    calledFire = null;
    const elapsed = now() - lastFireAt;
    clearPending();
    if (elapsed >= waitMs) {
      calledFire = { value };
      fire(value);
      return;
    }
    pending = setTimeout(() => {
      pending = null;
      calledFire = { value };
      fire(value);
    }, waitMs - elapsed);
  };

  return {
    call,
    flush,
    cancel: () => {
      calledFire = null;
      clearPending();
    },
    firedLast: (value) =>
      pending === null && calledFire !== null && Object.is(calledFire.value, value),
  };
}
