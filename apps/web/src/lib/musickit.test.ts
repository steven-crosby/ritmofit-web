// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MUSICKIT_SAFARI_MODERN_EME_KEY,
  isIosSafari,
  selectSafariModernFairPlay,
  type MusicKitGlobal,
} from './musickit.js';

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DESKTOP_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15';

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

describe('iOS Safari detection', () => {
  it('matches iPhone Safari and an iPad on the desktop site', () => {
    expect(isIosSafari(IOS_SAFARI_UA, 0)).toBe(true);
    expect(isIosSafari(DESKTOP_SAFARI_UA, 5)).toBe(true);
  });

  it('does not match desktop browsers or iOS Chrome', () => {
    expect(isIosSafari(DESKTOP_CHROME_UA, 0)).toBe(false);
    expect(isIosSafari(DESKTOP_CHROME_UA, 5)).toBe(false);
    expect(isIosSafari(DESKTOP_SAFARI_UA, 0)).toBe(false);
    expect(isIosSafari(IOS_CHROME_UA, 5)).toBe(false);
    expect(isIosSafari('', 5)).toBe(false);
  });
});

describe('Safari modern FairPlay', () => {
  it('writes the enabled value for legacy WebKitMediaKeys and for iOS Safari', () => {
    const storage = { setItem: vi.fn() };
    selectSafariModernFairPlay(undefined, storage, false);
    expect(storage.setItem).not.toHaveBeenCalled();

    selectSafariModernFairPlay({ isTypeSupported: () => true }, storage, false);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(MUSICKIT_SAFARI_MODERN_EME_KEY, '1');

    const iosStorage = { setItem: vi.fn() };
    selectSafariModernFairPlay(undefined, iosStorage, true);
    expect(iosStorage.setItem).toHaveBeenCalledWith(MUSICKIT_SAFARI_MODERN_EME_KEY, '1');
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

  it('selects modern FairPlay on iOS Safari before the script loads, without WebKitMediaKeys', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IOS_SAFARI_UA);
    const append = vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      expect(localStorage.getItem(MUSICKIT_SAFARI_MODERN_EME_KEY)).toBe('1');
      return HTMLElement.prototype.appendChild.call(document.head, node);
    });
    try {
      const { loadMusicKit } = await import('./musickit.js');
      const pending = loadMusicKit();
      expect(append).toHaveBeenCalled();
      expect((window as Window & { WebKitMediaKeys?: unknown }).WebKitMediaKeys).toBeUndefined();
      window.MusicKit = {} as MusicKitGlobal;
      document.dispatchEvent(new Event('musickitloaded'));
      await pending;
    } finally {
      append.mockRestore();
      userAgent.mockRestore();
    }
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

  /**
   * Installs `request` behind a WebIDL-style receiver check ("Illegal invocation"
   * in Blink, "Can only call ... on instances of Navigator" in WebKit). A bare
   * `vi.fn()` ignores `this`, which hid AUD-002, so every probe test goes through this.
   */
  function installRequest(request: (...args: never[]) => unknown): void {
    Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {
      configurable: true,
      writable: true,
      value: function (this: unknown, ...args: never[]) {
        if (this !== navigator) throw new TypeError('Illegal invocation');
        return request(...args);
      },
    });
  }

  async function probeWord(): Promise<string | null> {
    const { probeSafariModernFairPlayAccess } = await import('./musickit.js');
    return probeSafariModernFairPlayAccess();
  }

  afterEach(() => {
    delete webKitWindow.WebKitMediaKeys;
    Reflect.deleteProperty(navigator, 'requestMediaKeySystemAccess');
  });

  it('calls a receiver-checked requestMediaKeySystemAccess as a navigator method and resolves ok', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IOS_SAFARI_UA);
    const calls = vi.fn(async () => ({ createMediaKeys: vi.fn() }));
    installRequest(calls);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const { probeSafariModernFairPlayAccess, safariModernAccessWord } =
        await import('./musickit.js');
      await expect(probeSafariModernFairPlayAccess()).resolves.toBe('ok');
      expect(calls).toHaveBeenCalledTimes(1);
      expect(calls).toHaveBeenCalledWith('com.apple.fps', FAIRPLAY_AUDIO_ONLY);
      expect(safariModernAccessWord()).toBe('ok');
    } finally {
      info.mockRestore();
      userAgent.mockRestore();
    }
  });

  it('does not request a key system on desktop Chrome when WebKitMediaKeys is absent', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(DESKTOP_CHROME_UA);
    const request = vi.fn();
    installRequest(request);
    try {
      const { probeSafariModernFairPlayAccess } = await import('./musickit.js');
      expect(probeSafariModernFairPlayAccess()).toBeNull();
      expect(request).not.toHaveBeenCalled();
    } finally {
      userAgent.mockRestore();
    }
  });

  it('probes com.apple.fps on iOS Safari when WebKitMediaKeys is gone', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IOS_SAFARI_UA);
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
      userAgent.mockRestore();
    }
  });

  it('remembers the DOMException name on iOS Safari without logging it', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IOS_SAFARI_UA);
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
      expect(JSON.stringify(info.mock.calls)).not.toContain('SECRETVALUE');
      expect(JSON.stringify(info.mock.calls)).not.toContain('music-user-token');
    } finally {
      info.mockRestore();
      userAgent.mockRestore();
    }
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

  it('remembers only the built-in name of a plain Error rejection', async () => {
    webKitWindow.WebKitMediaKeys = {};
    const request = vi.fn(async () => {
      throw new Error('developer-token SECRETVALUE');
    });
    installRequest(request);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const { probeSafariModernFairPlayAccess } = await import('./musickit.js');
      await expect(probeSafariModernFairPlayAccess()).resolves.toBe('Error');
      expect(JSON.stringify(info.mock.calls)).not.toContain('SECRETVALUE');
    } finally {
      info.mockRestore();
    }
  });

  it('remembers TypeError for a TypeError rejection, never its message', async () => {
    webKitWindow.WebKitMediaKeys = {};
    installRequest(async () => {
      throw new TypeError('music-user-token SECRETVALUE');
    });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      await expect(probeWord()).resolves.toBe('TypeError');
    } finally {
      info.mockRestore();
    }
  });

  it.each<[string, () => unknown]>([
    [
      'a built-in subclass with a crafted name',
      () => {
        class CraftedError extends TypeError {
          override name = 'SECRETVALUE';
        }
        return new CraftedError('developer-token');
      },
    ],
    [
      'a built-in error with a reassigned name',
      () => Object.assign(new RangeError('developer-token'), { name: 'SECRETVALUE' }),
    ],
    [
      'a custom class that keeps a built-in name',
      () => {
        class Sneaky extends Error {
          override name = 'TypeError';
        }
        return new Sneaky('developer-token SECRETVALUE');
      },
    ],
    ['a non-error value', () => ({ name: 'SECRETVALUE' })],
    ['a DOMException with a non-word name', () => new DOMException('m', 'SECRET VALUE!')],
  ])('maps %s to other without leaking it', async (_label: string, makeError: () => unknown) => {
    webKitWindow.WebKitMediaKeys = {};
    installRequest(async () => {
      throw makeError();
    });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      await expect(probeWord()).resolves.toBe('other');
      expect(JSON.stringify(info.mock.calls)).not.toContain('SECRET');
    } finally {
      info.mockRestore();
    }
  });

  it('records a synchronous TypeError from the request call as TypeError', async () => {
    webKitWindow.WebKitMediaKeys = {};
    installRequest(() => {
      throw new TypeError('Illegal invocation');
    });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      await expect(probeWord()).resolves.toBe('TypeError');
    } finally {
      info.mockRestore();
    }
  });

  it('resolves timeout after about 2 s for a never-settling request, then keeps a late word', async () => {
    vi.useFakeTimers();
    webKitWindow.WebKitMediaKeys = {};
    let resolveLate: (value: object) => void = () => {};
    const request = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveLate = resolve;
        }),
    );
    installRequest(request);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const {
        SAFARI_MODERN_ACCESS_TIMEOUT_MS,
        probeSafariModernFairPlayAccess,
        safariModernAccessInFlight,
        safariModernAccessWord,
      } = await import('./musickit.js');
      expect(SAFARI_MODERN_ACCESS_TIMEOUT_MS).toBe(2_000);
      const probe = probeSafariModernFairPlayAccess();
      let settled: string | null | undefined;
      void probe?.then((word) => {
        settled = word;
      });
      expect(safariModernAccessInFlight()).toBe(probe);
      await vi.advanceTimersByTimeAsync(SAFARI_MODERN_ACCESS_TIMEOUT_MS - 1);
      expect(settled).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1);
      expect(settled).toBe('timeout');
      expect(safariModernAccessWord()).toBe('timeout');
      expect(safariModernAccessInFlight()).toBeNull();
      expect(request).toHaveBeenCalledTimes(1);
      resolveLate({ createMediaKeys: vi.fn() });
      await vi.advanceTimersByTimeAsync(0);
      expect(safariModernAccessWord()).toBe('ok');
      await expect(probeSafariModernFairPlayAccess()).resolves.toBe('timeout');
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      info.mockRestore();
    }
  });

  it('does not report an in-flight probe before one starts or after it settles', async () => {
    webKitWindow.WebKitMediaKeys = {};
    installRequest(async () => ({ createMediaKeys: vi.fn() }));
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const { probeSafariModernFairPlayAccess, safariModernAccessInFlight } =
        await import('./musickit.js');
      expect(safariModernAccessInFlight()).toBeNull();
      await probeSafariModernFairPlayAccess();
      expect(safariModernAccessInFlight()).toBeNull();
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
