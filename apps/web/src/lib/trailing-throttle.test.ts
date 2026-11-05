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

  it('firedLast is true only for the value fn actually ran with last (RF-108, RF-185)', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(60_000); // tap down: leading edge fires
    expect(throttle.firedLast(60_000)).toBe(true);
    expect(throttle.firedLast(61_000)).toBe(false);
    clock.advance(10);
    throttle.call(90_000); // drag: queued, not yet fired
    expect(throttle.firedLast(90_000)).toBe(false);
    expect(throttle.firedLast(60_000)).toBe(true);
    clock.advance(190);
    vi.advanceTimersByTime(190); // trailing fires 90_000
    expect(throttle.firedLast(90_000)).toBe(true);
    throttle.flush(30_000); // flush runs fn, so it is what fired last
    expect(fn).toHaveBeenCalledTimes(3);
    expect(throttle.firedLast(30_000)).toBe(true);
    expect(throttle.firedLast(90_000)).toBe(false);
    throttle.cancel();
    expect(throttle.firedLast(30_000)).toBe(false);
  });

  it('a same-value call inside the window stays fired: the release can skip and drop it (RF-185)', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(60_000); // pointerdown fires A
    clock.advance(16);
    throttle.call(60_000); // a still-finger pointermove maps to the same ms: pending A
    // Release at A: A is what fired last, so the host skips it and drops the pending call.
    expect(throttle.firedLast(60_000)).toBe(true);
    throttle.cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a value fired under another epoch never counts as sent; pending still fires (RF-185)', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    let epoch = 1;
    const throttle = createTrailingThrottle(fn, 200, clock.now, () => epoch);
    throttle.call(60_000); // sent under epoch 1
    expect(throttle.firedLast(60_000)).toBe(true);
    clock.advance(10);
    throttle.call(90_000); // pending, not sent
    epoch = 2; // e.g. Retry built a new coordinator
    expect(throttle.firedLast(60_000)).toBe(false);
    expect(throttle.firedLast(90_000)).toBe(false);
    clock.advance(190);
    vi.advanceTimersByTime(190);
    expect(fn.mock.calls).toEqual([[60_000], [90_000]]);
    expect(throttle.firedLast(90_000)).toBe(true); // fired under epoch 2
  });

  it('never treats a pending, unfired value as sent: down A, pending B, release B sends B (RF-185)', () => {
    const clock = fakeNow();
    const fn = vi.fn();
    const throttle = createTrailingThrottle(fn, 200, clock.now);
    throttle.call(60_000); // down fires A
    clock.advance(16);
    throttle.call(120_000); // fast move: pending B
    expect(throttle.firedLast(120_000)).toBe(false);
    throttle.flush(120_000); // the release sends B
    vi.advanceTimersByTime(1000);
    expect(fn.mock.calls).toEqual([[60_000], [120_000]]);
  });
});
