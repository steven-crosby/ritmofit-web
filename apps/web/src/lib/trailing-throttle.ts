/** A trailing-edge throttle: the first call in a quiet window fires immediately;
 * subsequent calls within `waitMs` of the last fire are coalesced into one
 * final call once the window elapses, so a burst of calls with the same
 * (latest) value fires far fewer times than it's called. `flush` bypasses the
 * window entirely — used for a caller-guaranteed immediate call (e.g. commit
 * on pointer release) that also cancels anything still pending.
 *
 * A `flush` with the value that `call` last fired, and no `call` since, is a
 * no-op: `fn` already ran with that value. That is what a tap on the Live
 * timeline is (pointer down fires the preview, pointer up commits the same
 * position), and running `fn` twice there started two provider adapters
 * about 60 ms apart (RF-108). */
export interface TrailingThrottle<T> {
  call: (value: T) => void;
  flush: (value: T) => void;
  cancel: () => void;
}

export function createTrailingThrottle<T>(
  fn: (value: T) => void,
  waitMs: number,
  now: () => number = () => performance.now(),
): TrailingThrottle<T> {
  let lastFireAt = -Infinity;
  let pending: ReturnType<typeof setTimeout> | null = null;
  /** The value `call` last fired, until the next `call` or `flush`. */
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
    const already = pending === null && calledFire !== null && Object.is(calledFire.value, value);
    calledFire = null;
    clearPending();
    if (already) return;
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
  };
}
