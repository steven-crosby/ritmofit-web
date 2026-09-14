// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVirtualClock } from './use-virtual-clock.js';

const TOTAL_MS = 240000;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Advance the fake clock (and with it `performance.now()`, which the hook
 * reads directly) by `ms`. */
function advancePerfNow(ms: number) {
  vi.advanceTimersByTime(ms);
}

describe('useVirtualClock', () => {
  it('starts at zero on both tiers', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.store.getSnapshot()).toBe(0);
  });

  it('tick publishes to the raw store on every call, but only flushes the throttled tier past the threshold', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    act(() => result.current.startSegment());

    advancePerfNow(50);
    act(() => {
      result.current.tick();
    });
    expect(result.current.store.getSnapshot()).toBe(50);
    // Below the ~200ms display threshold — the throttled tier hasn't moved yet.
    expect(result.current.elapsedMs).toBe(0);

    advancePerfNow(200); // 250ms total — past the threshold
    act(() => {
      result.current.tick();
    });
    expect(result.current.store.getSnapshot()).toBe(250);
    expect(result.current.elapsedMs).toBe(250);
  });

  it('notifies store subscribers on every tick regardless of the display throttle', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    const listener = vi.fn();
    act(() => {
      result.current.store.subscribe(listener);
      result.current.startSegment();
    });

    advancePerfNow(10);
    act(() => result.current.tick());
    advancePerfNow(10);
    act(() => result.current.tick());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('caps at totalMs and never publishes past it', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    act(() => result.current.startSegment());
    advancePerfNow(TOTAL_MS + 50000);
    act(() => {
      result.current.tick();
    });
    expect(result.current.store.getSnapshot()).toBe(TOTAL_MS);
    expect(result.current.elapsedMs).toBe(TOTAL_MS);
  });

  it('seek rebases both tiers immediately, bypassing the throttle', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    act(() => {
      result.current.seek(15000);
    });
    expect(result.current.store.getSnapshot()).toBe(15000);
    expect(result.current.elapsedMs).toBe(15000);
  });

  it('seek clamps to [0, totalMs]', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    act(() => {
      result.current.seek(-500);
    });
    expect(result.current.elapsedMs).toBe(0);
    act(() => {
      result.current.seek(TOTAL_MS + 999999);
    });
    expect(result.current.elapsedMs).toBe(TOTAL_MS);
  });

  it('previewSeek rebases only the raw tier, leaving the throttled display value untouched', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    act(() => {
      result.current.seek(1000); // establish a known baseline on both tiers
    });
    act(() => {
      result.current.previewSeek(60000);
    });
    expect(result.current.store.getSnapshot()).toBe(60000);
    // The broad Live subtree does not re-render off a drag preview (SPC-16/18).
    expect(result.current.elapsedMs).toBe(1000);
  });

  it('endSegment force-syncs the throttled tier to the exact freeze-frame position, even mid-threshold-window', () => {
    const { result } = renderHook(() => useVirtualClock(TOTAL_MS));
    act(() => result.current.startSegment());
    advancePerfNow(50); // well under the 200ms display threshold
    act(() => {
      result.current.tick();
    });
    expect(result.current.elapsedMs).toBe(0); // not flushed yet by tick's own threshold

    act(() => {
      result.current.endSegment();
    });
    // A pause must not leave the throttled tier (used by resume/cue selection)
    // stale by up to a threshold window — this is what keeps SPC-18's
    // throttling from regressing pause/resume precision.
    expect(result.current.elapsedMs).toBe(50);
  });
});
