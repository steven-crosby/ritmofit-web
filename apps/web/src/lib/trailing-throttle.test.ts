import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTrailingThrottle } from './trailing-throttle.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A controllable clock so tests can advance time deterministically instead of
 * depending on wall-clock `performance.now()`. */
function fakeNow() {
  let ms = 0;
  return { now: () => ms, advance: (delta: number) => (ms += delta) };
}

describe('createTrailingThrottle', () => {
  it('fires the first call immediately (leading edge, quiet window)', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('coalesces a burst within the window into one trailing call', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(1); // fires immediately (leading edge)
    clock.advance(10);
    throttle.call(2);
    clock.advance(10);
    throttle.call(3);
    clock.advance(10);
    throttle.call(4);
    expect(fn).toHaveBeenCalledTimes(1); // only the leading call so far
    // The window (200ms from the first fire) hasn't elapsed yet.
    vi.advanceTimersByTime(169);
    expect(fn).toHaveBeenCalledTimes(1);
    // Now it has — the trailing call fires with the *latest* queued value.
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(4);
  });

  it('fires again immediately once the window has fully elapsed', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(1);
    clock.advance(200);
    throttle.call(2);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(2);
  });

  it('flush fires immediately and cancels any pending trailing call', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(1); // leading edge
    clock.advance(10);
    throttle.call(2); // queued, not yet due
    throttle.flush(3);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
    // The call(2) trailing timer must not still be pending and fire later.
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('flush before any call still fires immediately', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.flush(5);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(5);
  });
});
