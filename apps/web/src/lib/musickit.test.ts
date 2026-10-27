// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MUSICKIT_SAFARI_MODERN_EME_KEY,
  selectSafariModernFairPlay,
  type MusicKitGlobal,
} from './musickit.js';
afterEach(() => {
  delete window.MusicKit;
  delete (window as Window & { WebKitMediaKeys?: unknown }).WebKitMediaKeys;
  localStorage.removeItem(MUSICKIT_SAFARI_MODERN_EME_KEY);
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

describe('Safari modern FairPlay', () => {
  it('writes the enabled value only when legacy WebKitMediaKeys exists', () => {
    const storage = { setItem: vi.fn() };
    selectSafariModernFairPlay(undefined, storage);
    expect(storage.setItem).not.toHaveBeenCalled();

    selectSafariModernFairPlay({ isTypeSupported: () => true }, storage);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(MUSICKIT_SAFARI_MODERN_EME_KEY, '1');
  });

  it('ignores a storage write that Safari private mode rejects', () => {
    expect(() =>
      selectSafariModernFairPlay(
        {},
        {
          setItem() {
            throw new Error('denied');
          },
        },
      ),
    ).not.toThrow();
  });

  it('selects modern FairPlay before injecting the MusicKit script', async () => {
    (window as Window & { WebKitMediaKeys?: object }).WebKitMediaKeys = {};
    const append = vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      expect(localStorage.getItem(MUSICKIT_SAFARI_MODERN_EME_KEY)).toBe('1');
      return HTMLElement.prototype.appendChild.call(document.head, node);
    });
    const { loadMusicKit } = await import('./musickit.js');
    const pending = loadMusicKit();
    expect(append).toHaveBeenCalled();
    const script = document.querySelector('script');
    expect(script?.getAttribute('src')).toContain('musickit.js');
    window.MusicKit = {} as MusicKitGlobal;
    document.dispatchEvent(new Event('musickitloaded'));
    await pending;
    append.mockRestore();
  });

  it('does not set the FairPlay flag in a browser without WebKitMediaKeys', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { loadMusicKit } = await import('./musickit.js');
    const pending = loadMusicKit();
    expect(setItem).not.toHaveBeenCalledWith(MUSICKIT_SAFARI_MODERN_EME_KEY, '1');
    window.MusicKit = {} as MusicKitGlobal;
    document.dispatchEvent(new Event('musickitloaded'));
    await pending;
    setItem.mockRestore();
  });
});
