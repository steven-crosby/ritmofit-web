// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MUSICKIT_SAFARI_MODERN_EME_KEY,
  selectSafariModernFairPlay,
  type MusicKitGlobal,
} from './musickit.js';

const FAIRPLAY_AUDIO_ONLY = [
  {
    initDataTypes: ['skd'],
    audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"', robustness: '' }],
    distinctiveIdentifier: 'not-allowed',
    persistentState: 'not-allowed',
    sessionTypes: ['temporary'],
  },
];
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

  it('does not throw when reading localStorage throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    let reads = 0;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        reads += 1;
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    try {
      expect(() => selectSafariModernFairPlay(undefined)).not.toThrow();
      expect(reads).toBe(0);
      expect(() => selectSafariModernFairPlay({})).not.toThrow();
      expect(reads).toBe(1);
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
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

  it('asks MusicKit to suppress its in-page playback error dialog', async () => {
    const configure = vi.fn().mockResolvedValue({ isAuthorized: true });
    window.MusicKit = { getInstance: () => null, configure } as unknown as MusicKitGlobal;
    const token = 'dev-token-do-not-log';
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const { prepareAppleMusic } = await import('./musickit.js');
      await prepareAppleMusic({ developerToken: token, storefront: 'us' });
      expect(configure).toHaveBeenCalledWith({
        developerToken: token,
        app: { name: 'Ritmo Studio', build: '1.0.0' },
        storefrontId: 'us',
        suppressErrorDialog: true,
      });
      const dumped = [info, warn, log].flatMap((spy) => spy.mock.calls).join(' ');
      expect(dumped).not.toContain(token);
    } finally {
      info.mockRestore();
      warn.mockRestore();
      log.mockRestore();
    }
  });

  it('suppresses the dialog when no storefront is configured', async () => {
    const configure = vi.fn().mockResolvedValue({ isAuthorized: true });
    window.MusicKit = { getInstance: () => null, configure } as unknown as MusicKitGlobal;
    const { prepareAppleMusic } = await import('./musickit.js');
    await prepareAppleMusic({ developerToken: 'test', storefront: null });
    expect(configure).toHaveBeenCalledWith({
      developerToken: 'test',
      app: { name: 'Ritmo Studio', build: '1.0.0' },
      suppressErrorDialog: true,
    });
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

describe('Safari modern FairPlay access probe', () => {
  const webKitWindow = window as Window & { WebKitMediaKeys?: object };

  function installRequest(request: ReturnType<typeof vi.fn>): void {
    Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {
      configurable: true,
      writable: true,
      value: request,
    });
  }

  afterEach(() => {
    delete webKitWindow.WebKitMediaKeys;
    Reflect.deleteProperty(navigator, 'requestMediaKeySystemAccess');
  });

  it('does not request a key system when WebKitMediaKeys is absent', async () => {
    const request = vi.fn();
    installRequest(request);
    const { probeSafariModernFairPlayAccess } = await import('./musickit.js');
    expect(probeSafariModernFairPlayAccess()).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('probes com.apple.fps once, audio-only, and does not attach a session', async () => {
    webKitWindow.WebKitMediaKeys = {};
    localStorage.setItem(MUSICKIT_SAFARI_MODERN_EME_KEY, '1');
    const createSession = vi.fn();
    const createMediaKeys = vi.fn(async () => ({ createSession }));
    const request = vi.fn(async () => ({ createMediaKeys }));
    installRequest(request);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const { probeSafariModernFairPlayAccess } = await import('./musickit.js');
      const first = probeSafariModernFairPlayAccess();
      const second = probeSafariModernFairPlayAccess();
      await expect(first).resolves.toBe('ok');
      await expect(second).resolves.toBe('ok');
      expect(first).toBe(second);
      expect(request).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledWith('com.apple.fps', FAIRPLAY_AUDIO_ONLY);
      expect(createMediaKeys).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
      expect(info.mock.calls).toEqual([['[ritmo apple-music] mk-safari-modern-eme 1']]);
    } finally {
      info.mockRestore();
    }
  });

  it('remembers a DOMException name and does not log the message or a raw storage value', async () => {
    webKitWindow.WebKitMediaKeys = {};
    localStorage.setItem(MUSICKIT_SAFARI_MODERN_EME_KEY, 'developer-token SECRETVALUE');
    const request = vi.fn(async () => {
      throw new DOMException('music-user-token SECRETVALUE', 'NotSupportedError');
    });
    installRequest(request);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const { probeSafariModernFairPlayAccess, safariModernAccessWord } =
        await import('./musickit.js');
      await expect(probeSafariModernFairPlayAccess()).resolves.toBe('NotSupportedError');
      expect(safariModernAccessWord()).toBe('NotSupportedError');
      await expect(probeSafariModernFairPlayAccess()).resolves.toBe('NotSupportedError');
      expect(request).toHaveBeenCalledTimes(1);
      const dumped = JSON.stringify(info.mock.calls);
      expect(dumped).not.toContain('SECRETVALUE');
      expect(dumped).not.toContain('music-user-token');
      expect(info.mock.calls).toEqual([['[ritmo apple-music] mk-safari-modern-eme not-1']]);
    } finally {
      info.mockRestore();
    }
  });

  it('does not remember a rejection that is not a DOMException', async () => {
    webKitWindow.WebKitMediaKeys = {};
    const request = vi.fn(async () => {
      throw new Error('developer-token SECRETVALUE');
    });
    installRequest(request);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const { probeSafariModernFairPlayAccess } = await import('./musickit.js');
      await expect(probeSafariModernFairPlayAccess()).resolves.toBeNull();
      expect(JSON.stringify(info.mock.calls)).not.toContain('SECRETVALUE');
    } finally {
      info.mockRestore();
    }
  });

  it('logs not-1 when reading the flag throws, and still does not throw', async () => {
    webKitWindow.WebKitMediaKeys = {};
    const request = vi.fn(async () => ({ createMediaKeys: vi.fn() }));
    installRequest(request);
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure. SECRETVALUE', 'SecurityError');
      },
    });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const { probeSafariModernFairPlayAccess } = await import('./musickit.js');
      await expect(probeSafariModernFairPlayAccess()).resolves.toBe('ok');
      expect(info.mock.calls).toEqual([['[ritmo apple-music] mk-safari-modern-eme not-1']]);
      expect(JSON.stringify(info.mock.calls)).not.toContain('SECRETVALUE');
    } finally {
      info.mockRestore();
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
