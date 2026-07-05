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
 * The slice of the MusicKit on the Web (v3) surface RitmoFit drives. Two callers
 * share it: the connect flow (`authorizeAppleMusic`) needs only `configure` +
 * `authorize`; the playback adapter (`playback/apple-music-adapter.ts`) also
 * drives the queue and transport. MusicKit is a page-level singleton
 * (`getInstance`), so every track's adapter remote-controls the same instance —
 * RitmoFit owns the class timeline, Apple owns the audio stream (D19). Times in
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
}

/** The `setQueue` options RitmoFit uses — one catalog song cued at `startTime`. */
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
  /** Playback-state name → numeric code — the two the adapter treats as finish. */
  readonly PlaybackStates: {
    completed: number;
    ended: number;
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
    const settle = () => {
      if (window.MusicKit) resolve(window.MusicKit);
      else reject(new Error('Apple MusicKit failed to initialize.'));
    };
    // MusicKit v3 fires `musickitloaded` on document once its global is ready.
    document.addEventListener('musickitloaded', settle, { once: true });

    const script = document.createElement('script');
    script.src = MUSICKIT_SRC;
    script.async = true;
    script.onerror = () => {
      loadPromise = null; // allow a retry after a transient load failure
      reject(new Error('Could not load Apple MusicKit.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Load + configure MusicKit and prompt the user to authorize, returning the
 * Music-User-Token. Rejects if the user cancels or the library can't load.
 */
export async function authorizeAppleMusic(config: AppleMusicClientConfig): Promise<string> {
  const MusicKit = await loadMusicKit();
  const instance = await MusicKit.configure({
    developerToken: config.developerToken,
    app: { name: 'Ritmo Studio', build: '1.0.0' },
    ...(config.storefront ? { storefrontId: config.storefront } : {}),
  });
  const token = await instance.authorize();
  if (!token) throw new Error('Apple Music authorization was cancelled.');
  return token;
}
