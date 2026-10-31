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

type FairPlayStorage = { removeItem(key: string): void };

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
 * Keep MusicKit on its default (legacy) FairPlay path by clearing
 * `mk-safari-modern-eme`. With that flag at `"1"`, iPhone Safari (iOS 27.0.1)
 * plays the first song of a page and then fails every later song load: Next,
 * Resume (which re-queues) and auto-advance all left MusicKit stopped with no
 * item. With the flag cleared, Start, Pause/Resume, Next and auto-advance all
 * played on the owner's iPhone on 2026-10-29 (RF-124). The earlier iPhone
 * silence this flag was added for was the page CSP `media-src` (RF-122).
 * Ritmo set the flag on iOS until RF-124, so browsers can still hold `"1"`;
 * this removes it before MusicKit loads and before each queue/play. Desktop
 * Chrome has no `WebKitMediaKeys` and uses Widevine, so storage is left alone
 * there.
 */
export function clearSafariModernFairPlay(
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
    target.removeItem(MUSICKIT_SAFARI_MODERN_EME_KEY);
  } catch {
    // A blocked getter or a rejected write leaves storage as it was.
  }
}

/** MusicKit's FairPlay key system. The probe and MusicKit both request this one. */
const FAIRPLAY_KEY_SYSTEM = 'com.apple.fps';

/**
 * MusicKit's audio capability (`audio/mp4;codecs="mp4a.40.2"`). MusicKit also
 * sends that type as a video capability. This probe leaves video out.
 */
const FAIRPLAY_AUDIO_CONTENT_TYPE = 'audio/mp4;codecs="mp4a.40.2"';

/**
 * Succeeded `requestMediaKeySystemAccess`. Anything else remembered is a probe
 * word from `safariModernAccessErrorWord`, or `timeout`.
 */
const SAFARI_MODERN_ACCESS_OK = 'ok';

/** The request had not settled within `SAFARI_MODERN_ACCESS_TIMEOUT_MS`. */
const SAFARI_MODERN_ACCESS_TIMEOUT = 'timeout';

/** A rejection whose name is not safe to show (custom class, crafted name, non-error value). */
const SAFARI_MODERN_ACCESS_OTHER = 'other';

/** Short, so a hung key-system request cannot hold the error banner for long. */
export const SAFARI_MODERN_ACCESS_TIMEOUT_MS = 2_000;

/**
 * Standard built-in error constructors whose fixed `name` may appear on the
 * banner (owner decision, 2026-10-28). Resolved lazily: `AggregateError` is
 * absent in older engines.
 */
function builtInErrorConstructors(): ErrorConstructor[] {
  const names = [
    'TypeError',
    'RangeError',
    'SyntaxError',
    'ReferenceError',
    'EvalError',
    'URIError',
    'AggregateError',
    'Error',
  ] as const;
  const scope = globalThis as unknown as Record<string, unknown>;
  return names
    .map((name) => scope[name])
    .filter((ctor): ctor is ErrorConstructor => typeof ctor === 'function');
}

const CONSOLE_PREFIX = '[ritmo apple-music]';

let modernAccessWord: string | null = null;
let modernAccessProbe: Promise<string | null> | null = null;
let modernAccessInFlight: Promise<string | null> | null = null;
/** Bumped by the test reset so a late settle from an older probe is dropped. */
let modernAccessGeneration = 0;

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

/**
 * The one word a probe rejection may put on the banner: a DOMException name,
 * or the standard name of a built-in error. A subclass or crafted `name` maps
 * to `other`. Never the message or stack, which can carry tokens.
 */
function safariModernAccessErrorWord(error: unknown): string {
  if (error instanceof DOMException) {
    return /^[A-Za-z][A-Za-z0-9]*$/.test(error.name) ? error.name : SAFARI_MODERN_ACCESS_OTHER;
  }
  for (const ctor of builtInErrorConstructors()) {
    // Exact constructor and its own standard name: `class X extends TypeError`
    // or `error.name = '...'` must not choose the word.
    if (error instanceof ctor && Object.getPrototypeOf(error) === ctor.prototype) {
      return (error as Error).name === ctor.name ? ctor.name : SAFARI_MODERN_ACCESS_OTHER;
    }
  }
  return SAFARI_MODERN_ACCESS_OTHER;
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

/**
 * Request `com.apple.fps` once. Resolves `"ok"` or a word from
 * `safariModernAccessErrorWord`, and never rejects.
 */
async function requestSafariModernAccess(
  request: Navigator['requestMediaKeySystemAccess'],
): Promise<string> {
  try {
    // Call it on `navigator`: WebIDL rejects any other receiver with a
    // TypeError ("Illegal invocation"), so `request(...)` alone never ran (AUD-002).
    // The access object is intentionally discarded. Creating media keys or a
    // session here would attach a key session this page does not control.
    await request.call(navigator, FAIRPLAY_KEY_SYSTEM, [audioOnlyFairPlayConfiguration()]);
    return SAFARI_MODERN_ACCESS_OK;
  } catch (error) {
    return safariModernAccessErrorWord(error);
  }
}

async function runSafariModernAccessProbe(generation: number): Promise<string | null> {
  logSafariModernEmeFlag();
  const request = navigator.requestMediaKeySystemAccess;
  if (typeof request !== 'function') return null;
  const settled = requestSafariModernAccess(request);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<typeof SAFARI_MODERN_ACCESS_TIMEOUT>((resolve) => {
    timer = setTimeout(
      () => resolve(SAFARI_MODERN_ACCESS_TIMEOUT),
      SAFARI_MODERN_ACCESS_TIMEOUT_MS,
    );
  });
  try {
    const word = await Promise.race([settled, timedOut]);
    if (word === SAFARI_MODERN_ACCESS_TIMEOUT) {
      // A late answer is still better evidence than "timeout" for a later banner.
      void settled.then((late) => {
        if (generation === modernAccessGeneration) modernAccessWord = late;
      });
    }
    return word;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One audio-only FairPlay probe for this page on legacy desktop WebKit (a
 * browser exposing `WebKitMediaKeys` that is not iOS Safari). It never runs on
 * iOS Safari (RF-147): MusicKit uses legacy FairPlay there, and the probe only
 * added a second key-system request. Resolves within
 * `SAFARI_MODERN_ACCESS_TIMEOUT_MS` to `"ok"`, a DOMException or built-in
 * error name, `"other"`, or `"timeout"`; null when the API is missing. A
 * second call reuses the first result and does not request again. Returns null
 * (not a promise) on every other browser. Callers start it after MusicKit's
 * `play()`, never before. Its word goes to the console, not the banner.
 */
export function probeSafariModernFairPlayAccess(): Promise<string | null> | null {
  if (!webKitMediaKeys() || isIosSafari()) return null;
  if (!modernAccessProbe) {
    const generation = modernAccessGeneration;
    // A probe failure must not become "would not play". Remember the word, or null.
    const probe: Promise<string | null> = runSafariModernAccessProbe(generation).then(
      (word) => word,
      () => null,
    );
    modernAccessProbe = probe;
    modernAccessInFlight = probe;
    void probe.then((word) => {
      if (generation !== modernAccessGeneration) return;
      // A real word that arrived just after the timeout fired is kept over "timeout".
      if (word !== SAFARI_MODERN_ACCESS_TIMEOUT || modernAccessWord === null) {
        modernAccessWord = word;
      }
      modernAccessInFlight = null;
    });
  }
  return modernAccessProbe;
}

/** The probe word already remembered, or null before the probe settles or when it was skipped. */
export function safariModernAccessWord(): string | null {
  return modernAccessWord;
}

/**
 * The started probe while it is still unsettled, else null. Does not start a
 * probe. Bounded by `SAFARI_MODERN_ACCESS_TIMEOUT_MS`.
 */
export function safariModernAccessInFlight(): Promise<string | null> | null {
  return modernAccessInFlight;
}

export function resetSafariModernAccessProbeForTests(): void {
  modernAccessWord = null;
  modernAccessProbe = null;
  modernAccessInFlight = null;
  modernAccessGeneration += 1;
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
  clearSafariModernFairPlay();
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
  clearSafariModernFairPlay();
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
