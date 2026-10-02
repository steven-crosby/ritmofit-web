// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MusicKitGlobal } from './musickit.js';
afterEach(() => {
  delete window.MusicKit;
  document.querySelectorAll('script').forEach((script) => script.remove());
  vi.useRealTimers();
  vi.resetModules();
});
describe('MusicKit preparation', () => {
  it('bounds an unresponsive script load and allows a clean retry', async () => {
    vi.useFakeTimers();
    const { loadMusicKit } = await import('./musickit.js');
    const first = loadMusicKit();
    const failure = expect(first).rejects.toThrow('did not load');
    await vi.advanceTimersByTimeAsync(20_000);
    await failure;
    expect(document.querySelector('script')).toBeNull();
    const next = loadMusicKit();
    window.MusicKit = {} as MusicKitGlobal;
    document.dispatchEvent(new Event('musickitloaded'));
    expect(await next).toBe(window.MusicKit);
  });
  it('reuses the page singleton without reconfiguring or authorizing', async () => {
    const authorize = vi.fn();
    const instance = { authorize };
    const configure = vi.fn();
    window.MusicKit = { getInstance: () => instance, configure } as unknown as MusicKitGlobal;
    const { prepareAppleMusic } = await import('./musickit.js');
    expect(await prepareAppleMusic({ developerToken: 'test', storefront: null })).toBe(instance);
    expect(configure).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
  });
  it('shares pending configuration and bounds a hung configuration', async () => {
    vi.useFakeTimers();
    const configure = vi.fn().mockReturnValue(new Promise(() => {}));
    window.MusicKit = { getInstance: () => null, configure } as unknown as MusicKitGlobal;
    const { prepareAppleMusic } = await import('./musickit.js');
    const config = { developerToken: 'test', storefront: null };
    const first = prepareAppleMusic(config);
    const second = prepareAppleMusic(config);
    const failures = [
      expect(first).rejects.toThrow('configuration'),
      expect(second).rejects.toThrow('configuration'),
    ];
    await vi.advanceTimersByTimeAsync(20_000);
    await Promise.all(failures);
    expect(configure).toHaveBeenCalledTimes(1);
  });
});

it('keeps a timed-out configuration serialized through retry and late completion', async () => {
  vi.useFakeTimers();
  let resolve!: (value: unknown) => void;
  let singleton: unknown = null;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const configure = vi.fn(() => pending);
  window.MusicKit = { getInstance: () => singleton, configure } as unknown as MusicKitGlobal;
  const { prepareAppleMusic } = await import('./musickit.js');
  const config = { developerToken: 'test', storefront: null };
  const first = prepareAppleMusic(config);
  const timeout = expect(first).rejects.toThrow('still pending');
  await vi.advanceTimersByTimeAsync(20000);
  await timeout;
  const retry = prepareAppleMusic(config);
  await vi.advanceTimersByTimeAsync(0);
  expect(configure).toHaveBeenCalledTimes(1);
  singleton = { isAuthorized: false };
  resolve(singleton);
  expect(await retry).toBe(singleton);
  expect(await prepareAppleMusic(config)).toBe(singleton);
  expect(configure).toHaveBeenCalledTimes(1);
});
