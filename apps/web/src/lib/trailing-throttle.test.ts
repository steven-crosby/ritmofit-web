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
  it('cancels a pending seek without issuing another provider command', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(1);
    clock.advance(10);
    throttle.call(2);
    throttle.cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });
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

  it('a tap (call then flush of the same value) runs fn once (RF-108)', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(60_000); // pointer down: leading edge fires
    clock.advance(60);
    throttle.flush(60_000); // pointer up at the same position
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(60_000);
  });

  it('a drag release on the value the trailing call already fired runs fn once more at most', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(1); // leading edge
    clock.advance(10);
    throttle.call(2); // queued
    vi.advanceTimersByTime(190); // trailing fires 2
    expect(fn).toHaveBeenCalledTimes(2);
    throttle.flush(2); // released where the trailing call left it
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('still runs a flush with a different value, and a later discrete flush of the same value', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(1);
    throttle.flush(2); // a different position commits
    expect(fn).toHaveBeenLastCalledWith(2);
    throttle.flush(2); // a later discrete seek (e.g. Next) is never swallowed
    expect(fn).toHaveBeenCalledTimes(3);
    throttle.call(4);
    clock.advance(500);
    throttle.cancel();
    throttle.flush(4); // cancel forgets the fired value
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
