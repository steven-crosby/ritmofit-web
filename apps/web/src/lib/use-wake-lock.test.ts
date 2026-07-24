// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from './use-wake-lock.js';

/** A fake WakeLock whose sentinel records release() and can emit a 'release' event. */
function fakeWakeLock() {
  const releaseListeners: Array<() => void> = [];
  const sentinel = {
    released: false,
    release: vi.fn(async () => {
      sentinel.released = true;
    }),
    addEventListener: (type: string, cb: () => void) => {
      if (type === 'release') releaseListeners.push(cb);
    },
  };
  const request = vi.fn(async () => sentinel);
  const emitRelease = () => releaseListeners.forEach((cb) => cb());
  return { wakeLock: { request }, sentinel, request, emitRelease };
}

function setWakeLock(value: unknown) {
  Object.defineProperty(navigator, 'wakeLock', { value, configurable: true });
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

afterEach(() => {
  setWakeLock(undefined);
  vi.restoreAllMocks();
});

describe('useWakeLock', () => {
  it('does nothing (and never throws) when the API is unsupported', () => {
    setWakeLock(undefined);
    expect(() => renderHook(() => useWakeLock(true)).unmount()).not.toThrow();
  });

  it('does not request a lock while inactive', () => {
    const fake = fakeWakeLock();
    setWakeLock(fake.wakeLock);
    renderHook(() => useWakeLock(false));
    expect(fake.request).not.toHaveBeenCalled();
  });

  it('acquires while active and releases on unmount', async () => {
    const fake = fakeWakeLock();
    setWakeLock(fake.wakeLock);
    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(fake.request).toHaveBeenCalledWith('screen'));
    unmount();
    expect(fake.sentinel.release).toHaveBeenCalled();
  });

  it('releases when it flips from active to inactive', async () => {
    const fake = fakeWakeLock();
    setWakeLock(fake.wakeLock);
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    });
    await waitFor(() => expect(fake.request).toHaveBeenCalledTimes(1));
    rerender({ active: false });
    expect(fake.sentinel.release).toHaveBeenCalled();
  });

  it('re-acquires when the page becomes visible again after an auto-release', async () => {
    const fake = fakeWakeLock();
    setWakeLock(fake.wakeLock);
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(fake.request).toHaveBeenCalledTimes(1));

    // Platform hides the page and auto-releases the lock.
    fake.emitRelease();
    setVisibility('hidden');
    // Returning to the page re-acquires.
    setVisibility('visible');
    await waitFor(() => expect(fake.request).toHaveBeenCalledTimes(2));
  });

  it('does not start another acquisition while the first request is pending', async () => {
    const pending = deferred<WakeLockSentinel>();
    const sentinel = fakeWakeLock().sentinel as unknown as WakeLockSentinel;
    const request = vi.fn(() => pending.promise);
    setWakeLock({ request });

    const { result } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    setVisibility('visible');
    setVisibility('visible');
    expect(request).toHaveBeenCalledTimes(1);

    pending.resolve(sentinel);
    await waitFor(() => expect(result.current).toBe('awake'));
  });

  it('ignores a stale sentinel release after a newer lock is acquired', async () => {
    const releaseListeners: Array<() => void> = [];
    const sentinels = [0, 1].map((index) => ({
      released: false,
      release: vi.fn(async () => undefined),
      addEventListener: (type: string, cb: () => void) => {
        if (type === 'release') releaseListeners[index] = cb;
      },
    }));
    const request = vi
      .fn<() => Promise<WakeLockSentinel>>()
      .mockResolvedValueOnce(sentinels[0] as unknown as WakeLockSentinel)
      .mockResolvedValueOnce(sentinels[1] as unknown as WakeLockSentinel);
    setWakeLock({ request });

    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    releaseListeners[0]!();
    setVisibility('visible');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));

    releaseListeners[0]!();
    setVisibility('visible');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('releases a pending acquisition that resolves after becoming inactive', async () => {
    const pending = deferred<WakeLockSentinel>();
    const fake = fakeWakeLock();
    const request = vi.fn(() => pending.promise);
    setWakeLock({ request });
    const { result, rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    rerender({ active: false });
    pending.resolve(fake.sentinel as unknown as WakeLockSentinel);

    await waitFor(() => expect(fake.sentinel.release).toHaveBeenCalledTimes(1));
    expect(result.current).toBe('idle');
  });

  describe('status reporting', () => {
    it('is idle while inactive', () => {
      const fake = fakeWakeLock();
      setWakeLock(fake.wakeLock);
      const { result } = renderHook(() => useWakeLock(false));
      expect(result.current).toBe('idle');
    });

    it('reports awake once the lock is held', async () => {
      const fake = fakeWakeLock();
      setWakeLock(fake.wakeLock);
      const { result } = renderHook(() => useWakeLock(true));
      await waitFor(() => expect(result.current).toBe('awake'));
    });

    it('reports unavailable when the API is unsupported', () => {
      setWakeLock(undefined);
      const { result } = renderHook(() => useWakeLock(true));
      expect(result.current).toBe('unavailable');
    });

    it('reports unavailable when the request is denied', async () => {
      const request = vi.fn(async () => {
        throw new Error('denied');
      });
      setWakeLock({ request });
      const { result } = renderHook(() => useWakeLock(true));
      await waitFor(() => expect(result.current).toBe('unavailable'));
    });

    it('returns to idle when it flips from active to inactive', async () => {
      const fake = fakeWakeLock();
      setWakeLock(fake.wakeLock);
      const { result, rerender } = renderHook(({ active }) => useWakeLock(active), {
        initialProps: { active: true },
      });
      await waitFor(() => expect(result.current).toBe('awake'));
      rerender({ active: false });
      await waitFor(() => expect(result.current).toBe('idle'));
    });

    it('stays awake across a hide/return auto-release (no flicker to caution)', async () => {
      const fake = fakeWakeLock();
      setWakeLock(fake.wakeLock);
      const { result } = renderHook(() => useWakeLock(true));
      await waitFor(() => expect(result.current).toBe('awake'));
      // Platform auto-releases behind a hidden tab; the capability still holds.
      fake.emitRelease();
      setVisibility('hidden');
      expect(result.current).toBe('awake');
      setVisibility('visible');
      await waitFor(() => expect(result.current).toBe('awake'));
    });
  });
});
