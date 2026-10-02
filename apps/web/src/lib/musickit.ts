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
  if (!configuration) {
    const existing = music.getInstance();
    if (existing) return existing;
    const pending = Promise.resolve().then(() =>
      music.configure({
        developerToken: config.developerToken,
        app: { name: 'Ritmo Studio', build: '1.0.0' },
        ...(config.storefront ? { storefrontId: config.storefront } : {}),
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
