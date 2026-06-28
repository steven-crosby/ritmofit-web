import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadChunkWithReload } from './lazyWithReload.js';

/** Minimal in-memory stand-in for the sessionStorage methods we use. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    has: (k: string) => map.has(k),
  };
}

/** Let queued microtasks (the async body up to the catch) run. */
const flush = () => Promise.resolve().then(() => Promise.resolve());

afterEach(() => vi.restoreAllMocks());

describe('loadChunkWithReload', () => {
  it('returns the module and clears the guard on success', async () => {
    const storage = fakeStorage({ 'ritmofit:chunk-reloaded': '1' });
    const reload = vi.fn();
    const mod = { default: 'component' };

    const result = await loadChunkWithReload(() => Promise.resolve(mod), storage, reload);

    expect(result).toBe(mod);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.has('ritmofit:chunk-reloaded')).toBe(false);
  });

  it('reloads once and sets the guard on a stale-chunk failure', async () => {
    const storage = fakeStorage();
    const reload = vi.fn();

    // Hangs (never settles) so Suspense keeps its fallback through the reload.
    let settled = false;
    void loadChunkWithReload(
      () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
      storage,
      reload,
    ).then(() => {
      settled = true;
    });
    await flush();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.has('ritmofit:chunk-reloaded')).toBe(true);
    expect(settled).toBe(false);
  });

  it('rethrows instead of looping when the guard is already set', async () => {
    const storage = fakeStorage({ 'ritmofit:chunk-reloaded': '1' });
    const reload = vi.fn();
    const err = new Error('still failing');

    await expect(loadChunkWithReload(() => Promise.reject(err), storage, reload)).rejects.toBe(err);
    expect(reload).not.toHaveBeenCalled();
  });
});
