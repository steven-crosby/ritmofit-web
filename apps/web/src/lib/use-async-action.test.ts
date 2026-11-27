// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAsyncAction } from './use-async-action.js';

describe('useAsyncAction', () => {
  it('names a blank or non-Error failure instead of reporting an empty message (RF-111)', async () => {
    const report = vi.fn();
    const { result } = renderHook(() => useAsyncAction(report));

    await act(() => result.current.run(() => Promise.reject(new Error(''))));
    expect(report).toHaveBeenLastCalledWith('Something went wrong.');

    await act(() => result.current.run(() => Promise.reject({ code: 1 })));
    expect(report).toHaveBeenLastCalledWith('Something went wrong.');

    await act(() => result.current.run(() => Promise.reject(new Error('copy failed'))));
    expect(report).toHaveBeenLastCalledWith('copy failed');
  });

  it('ignores a second run while the first is in flight, and clears busy after', async () => {
    const report = vi.fn();
    const { result } = renderHook(() => useAsyncAction(report));
    let finish!: () => void;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    let first!: Promise<void>;
    act(() => {
      first = result.current.run(action);
    });
    expect(result.current.busy).toBe(true);
    await act(() => result.current.run(action));
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
      await first;
    });
    expect(result.current.busy).toBe(false);
    expect(report).toHaveBeenCalledWith(null);
  });
});
