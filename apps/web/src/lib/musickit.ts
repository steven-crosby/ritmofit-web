/**
 * Apple Music connect via MusicKit JS (v3).
 *
 * Apple Music has no redirect OAuth: the browser loads the MusicKit JS library,
 * configures it with our developer token, and the user authorizes in an Apple
 * consent surface. MusicKit returns a **Music-User-Token** which the caller posts
 * to `POST /providers/apple_music/connection` to store (encrypted) server-side.
 *
 * The library is loaded **on demand** (only when a user starts the Apple Music
 * connect flow) so the third-party script never runs for users who don't use it.
 * RUNTIME-UNVERIFIED in CI: the authorize handshake needs a real developer token
 * and an Apple Music subscriber consenting in a browser, so this path is exercised
 * by live verification, not the headless test suite.
 */
import type { AppleMusicClientConfig } from '@ritmofit/shared';

const MUSICKIT_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';

/**
 * MusicKit's BooleanDevFlag for Safari FairPlay. `enable()` writes `"1"`, and
 * `enabled` is true only for `"1"` or `"true"`. The flag is read when the audio
 * player attaches a key session, not when the script loads.
 */
export const MUSICKIT_SAFARI_MODERN_EME_KEY = 'mk-safari-modern-eme';

type FairPlayStorage = { setItem(key: string, value: string): void };

function navigatorUserAgent(): string {
  try {
    return typeof navigator === 'undefined' ? '' : navigator.userAgent;
  } catch {
    return '';
  }
}

function navigatorMaxTouchPoints(): number {
  try {
    return typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints;
  } catch {
    return 0;
  }
}

/**
 * iPhone, iPad, and iPod Safari, including an iPad that reports a desktop Macintosh
 * UA. Chrome, Firefox, and Edge on iOS identify themselves with CriOS, FxiOS, or
 * EdgiOS and are not Safari. Desktop Chrome uses Widevine and must not match.
 */
export function isIosSafari(
  userAgent: string = navigatorUserAgent(),
  maxTouchPoints: number = navigatorMaxTouchPoints(),
): boolean {
  if (!userAgent || /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)) return false;
  const iphoneFamily = /iPhone|iPad|iPod/.test(userAgent);
  const ipadDesktopSite = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  if (!iphoneFamily && !ipadDesktopSite) return false;
  if (/Chrome|Chromium|Android/.test(userAgent)) return false;
  return /Safari\//.test(userAgent);
}

/**
 * MusicKit takes the legacy FairPlay path unless `mk-safari-modern-eme` is `"1"`.
 * iOS 27 Safari can do that without exposing `WebKitMediaKeys`: `play()` is
 * accepted, then the hidden `<audio id="apple-music-player">` errors.
 * `configureMusicKit` passes `suppressErrorDialog` so MusicKit does not also
 * open its in-page OK box. Desktop Chrome has no `WebKitMediaKeys` and uses
 * Widevine, so this flag stays unset there. The flag selects
 * `requestMediaKeySystemAccess('com.apple.fps')`. If that access fails,
 * MusicKit falls back to the legacy session on its own.
 */
export function selectSafariModernFairPlay(
  webKitMediaKeys: unknown = typeof window === 'undefined'
    ? undefined
    : (window as Window & { WebKitMediaKeys?: unknown }).WebKitMediaKeys,
  storage?: FairPlayStorage | null,
  iosSafari: boolean = isIosSafari(),
): void {
  // Desktop Chrome is neither iOS Safari nor legacy WebKit. Leave storage
  // alone there: reading `localStorage` can throw, and that must not run
  // before this check.
  if (!webKitMediaKeys && !iosSafari) return;
  try {
    const target = storage === undefined ? localStorage : storage;
    if (!target) return;
    target.setItem(MUSICKIT_SAFARI_MODERN_EME_KEY, '1');
  } catch {
    // A blocked getter or a rejected write stays on legacy FairPlay.
  }
}

/** MusicKit's FairPlay key system. The probe and MusicKit both request this one. */
const FAIRPLAY_KEY_SYSTEM = 'com.apple.fps';

/**
 * MusicKit's audio capability (`audio/mp4;codecs="mp4a.40.2"`). MusicKit also
 * sends that type as a video capability. This probe leaves video out.
 */
const FAIRPLAY_AUDIO_CONTENT_TYPE = 'audio/mp4;codecs="mp4a.40.2"';

/** Succeeded `requestMediaKeySystemAccess`. Anything else remembered is a DOMException name. */
const SAFARI_MODERN_ACCESS_OK = 'ok';

const CONSOLE_PREFIX = '[ritmo apple-music]';

let modernAccessWord: string | null = null;
let modernAccessProbe: Promise<string | null> | null = null;

function webKitMediaKeys(): unknown {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { WebKitMediaKeys?: unknown }).WebKitMediaKeys;
}

/** MusicKit's modern FairPlay configuration with the video capability removed. */
function audioOnlyFairPlayConfiguration(): MediaKeySystemConfiguration {
  return {
    initDataTypes: ['skd'],
    audioCapabilities: [{ contentType: FAIRPLAY_AUDIO_CONTENT_TYPE, robustness: '' }],
    distinctiveIdentifier: 'not-allowed',
    persistentState: 'not-allowed',
    sessionTypes: ['temporary'],
  };
}

function domExceptionName(error: unknown): string | null {
  if (!(error instanceof DOMException)) return null;
  return /^[A-Za-z][A-Za-z0-9]*$/.test(error.name) ? error.name : null;
}

/** Log whether our flag write stuck. Never log the stored value, a token, or an exception message. */
function logSafariModernEmeFlag(): void {
  let enabled = false;
  try {
    enabled = localStorage.getItem(MUSICKIT_SAFARI_MODERN_EME_KEY) === '1';
  } catch {
    enabled = false;
  }
  console.info(`${CONSOLE_PREFIX} mk-safari-modern-eme ${enabled ? '1' : 'not-1'}`);
}

async function runSafariModernAccessProbe(): Promise<string | null> {
  logSafariModernEmeFlag();
  const request = navigator.requestMediaKeySystemAccess;
  if (typeof request !== 'function') return null;
  try {
    // The access object is intentionally discarded. Creating media keys or a
    // session here would attach a key session this page does not control.
    await request(FAIRPLAY_KEY_SYSTEM, [audioOnlyFairPlayConfiguration()]);
    return SAFARI_MODERN_ACCESS_OK;
  } catch (error) {
    return domExceptionName(error);
  }
}

/**
 * One audio-only FairPlay probe for this page on iOS Safari, including iOS 27
 * where `WebKitMediaKeys` is absent. Legacy WebKit still probes too.
 * Resolves to `"ok"`, a DOMException name, or null when the call cannot be
 * made or the rejection is not a DOMException. A second call reuses the first
 * result and does not request again. Returns null (not a promise) on other
 * browsers, so `play()` does not yield before MusicKit's own `play()`.
 */
export function probeSafariModernFairPlayAccess(): Promise<string | null> | null {
  if (!webKitMediaKeys() && !isIosSafari()) return null;
  if (!modernAccessProbe) {
    // A probe failure must not become "would not play". Remember the word, or null.
    modernAccessProbe = runSafariModernAccessProbe().then(
      (word) => {
        modernAccessWord = word;
        return word;
      },
      () => null,
    );
  }
  return modernAccessProbe;
}

/** The probe word already remembered, or null before the probe settles or when it was skipped. */
export function safariModernAccessWord(): string | null {
  return modernAccessWord;
}

export function resetSafariModernAccessProbeForTests(): void {
  modernAccessWord = null;
  modernAccessProbe = null;
}

/**
 * The slice of the MusicKit on the Web (v3) surface Ritmo Studio drives. Two callers
 * share it: the connect flow (`prepareAppleMusic`) needs `configure` +
 * `authorize`; the playback adapter (`playback/apple-music-adapter.ts`) also
 * drives the queue and transport. MusicKit is a page-level singleton
 * (`getInstance`), so every track's adapter remote-controls the same instance —
 * Ritmo Studio owns the class timeline, Apple owns the audio stream (D19). Times in
 * this surface are SECONDS (MusicKit's unit); the adapter converts at the
 * millisecond playback-contract boundary.
 */
export interface MusicKitInstance {
  /** True once the user has authorized this browser for their Apple Music account. */
  readonly isAuthorized: boolean;
  /** Prompt Apple's consent surface; resolves with the Music-User-Token. */
  authorize(): Promise<string>;
  /** Load a queue; `song`/`songs` are catalog ids, `startTime` is seconds. */
  setQueue(options: MusicKitSetQueueOptions): Promise<unknown>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  /** Seek the now-playing item — SECONDS, and only valid once playback started. */
  seekToTime(seconds: number): Promise<void>;
  addEventListener(name: string, handler: (event: MusicKitPlaybackEvent) => void): void;
  removeEventListener(name: string, handler: (event: MusicKitPlaybackEvent) => void): void;
  /**
   * Current playhead in SECONDS, and the current state as a `PlaybackStates`
   * code. Read-only transport status for liveness observation
   * (`playback/liveness.ts`) — the same official channel as play/pause/seek,
   * never stream inspection.
   *
   * Optional because MusicKit populates them only once a queue is playing, and
   * because test doubles predate them; an instance that cannot answer is exempt
   * from observation rather than treated as dead.
   */
  readonly currentPlaybackTime?: number;
  readonly currentPlaybackDuration?: number;
  readonly playbackState?: number;
}

/** The `setQueue` options Ritmo Studio uses — one catalog song cued at `startTime`. */
export interface MusicKitSetQueueOptions {
  song?: string;
  songs?: string[];
  /** Initial playhead in SECONDS: cues a clip start without an audible seek. */
  startTime?: number;
}

/** Payload of the events the adapter binds; `state` indexes `PlaybackStates`. */
export interface MusicKitPlaybackEvent {
  state?: number;
}

export interface MusicKitGlobal {
  configure(opts: {
    developerToken: string;
    app: { name: string; build: string };
    storefrontId?: string;
    /**
     * When true, MusicKit sets `_playbackErrorDialog` false and does not present
     * its in-page "Playback Error" OK box. The adapter banner remains the report.
     */
    suppressErrorDialog?: boolean;
  }): Promise<MusicKitInstance>;
  /** The configured page singleton, or null before the first `configure`. */
  getInstance(): MusicKitInstance | null;
  /** Event-name constants — the two playback events the adapter binds. */
  readonly Events: {
    playbackStateDidChange: string;
    mediaPlaybackError: string;
  };
  /**
   * Playback-state name → numeric code. `completed`/`ended` are the two the
   * adapter treats as finish; the rest are read by liveness observation only.
   *
   * The extra keys are optional so existing callers and doubles that supply
   * just the finish pair keep type-checking — and so a missing key degrades to
   * "cannot answer" rather than to a wrong answer. `stalled` and `waiting` are
   * the states the 2026-07-06 Apple Music incident sat in while the app,
   * reading neither, believed it was playing.
   */
  readonly PlaybackStates: {
    completed: number;
    ended: number;
    playing?: number;
    paused?: number;
    stopped?: number;
    stalled?: number;
    waiting?: number;
    loading?: number;
    seeking?: number;
    none?: number;
  };
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

let loadPromise: Promise<MusicKitGlobal> | null = null;

/** Inject the MusicKit JS script once; resolve when its global is ready. */
export function loadMusicKit(): Promise<MusicKitGlobal> {
  // Before the script, and before a page that already has the singleton: the
  // key session is created on the first play, and it reads this flag then.
  selectSafariModernFairPlay();
  if (window.MusicKit) return Promise.resolve(window.MusicKit);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<MusicKitGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    const cleanup = () => {
      clearTimeout(timer);
      document.removeEventListener('musickitloaded', settle);
      script.onerror = null;
    };
    const fail = (message: string) => {
      cleanup();
      script.remove();
      loadPromise = null;
      reject(new Error(message));
    };
    const settle = () => {
      if (!window.MusicKit) return fail('Apple MusicKit failed to initialize.');
      cleanup();
      resolve(window.MusicKit);
    };
    document.addEventListener('musickitloaded', settle, { once: true });
    script.src = MUSICKIT_SRC;
    script.async = true;
    script.onerror = () => fail('Could not load Apple MusicKit. Try again.');
    const timer = setTimeout(() => fail('Apple MusicKit did not load. Try again.'), 20_000);
    document.head.appendChild(script);
  });
  return loadPromise;
}

let configuration: Promise<MusicKitInstance> | null = null;

/** Keep the underlying SDK operation serialized even after a caller's UI deadline. */
export async function configureMusicKit(
  music: MusicKitGlobal,
  config: AppleMusicClientConfig,
): Promise<MusicKitInstance> {
  selectSafariModernFairPlay();
  if (!configuration) {
    const existing = music.getInstance();
    if (existing) return existing;
    const pending = Promise.resolve().then(() =>
      music.configure({
        developerToken: config.developerToken,
        app: { name: 'Ritmo Studio', build: '1.0.0' },
        ...(config.storefront ? { storefrontId: config.storefront } : {}),
        suppressErrorDialog: true,
      }),
    );
    configuration = pending;
    void pending
      .finally(() => {
        if (configuration === pending) configuration = null;
      })
      .catch(() => {});
  }
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<MusicKitInstance>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            'Apple Music configuration is still pending. Retry after it finishes, or reload if it remains stuck.',
          ),
        ),
      20_000,
    );
  });
  try {
    return await Promise.race([configuration, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Prepare without queuing music; consent belongs to a subsequent explicit tap. */
export async function prepareAppleMusic(config: AppleMusicClientConfig): Promise<MusicKitInstance> {
  return configureMusicKit(await loadMusicKit(), config);
}
