/**
 * Apple Music playback adapter — wraps MusicKit on the Web (v3) behind the
 * `PlaybackAdapter` contract. MusicKit is a page-level singleton that owns the
 * audio stream, the subscriber authorization, and catalog availability; this
 * adapter only remote-controls it (configure/authorize, setQueue, play, pause,
 * seek, stop) and never touches audio bytes (music-providers.md, D19). Apple's
 * terms are strict: no download, proxy, cache, decode, or analysis — "shortening"
 * a track is only ever a saved playback window over the untouched provider stream.
 *
 * Two things differ from the SoundCloud adapter and shape this file:
 *   1. MusicKit speaks SECONDS; the playback contract speaks milliseconds, so
 *      every boundary converts (`msToSeconds`).
 *   2. `seekToTime` needs a now-playing item, which exists only once playback has
 *      started. The runtime can `seek()` a mid-track entry BEFORE `play()`
 *      (runtime.ts), so a pre-play seek re-cues via `setQueue.startTime` and only
 *      a live seek uses `seekToTime`.
 *
 * Unlike SoundCloud (one hidden iframe per track, removed on destroy), every
 * track's adapter shares the one MusicKit instance, so `destroy()` drops only
 * this adapter's listeners and halts audio — it never tears the singleton down.
 * The developer token comes from the same `GET /providers/apple_music/config`
 * endpoint the connect flow uses; tokens live in memory only, never logged or
 * persisted (AGENTS.md), and are never used for catalog/BPM shortcuts.
 */
import type { AppleMusicClientConfig, RunPayloadTrackEntry } from '@ritmofit/shared';
import { getAppleMusicConfig } from '../api.js';
import {
  loadMusicKit,
  type MusicKitGlobal,
  type MusicKitInstance,
  type MusicKitPlaybackEvent,
} from '../musickit.js';
import type {
  AdapterEvents,
  AdapterFactory,
  PlaybackAdapter,
  PlaybackReady,
  PlaybackWindow,
} from './types.js';

const DEFAULT_PREPARE_TIMEOUT_MS = 20_000;
const APP_META = { name: 'RitmoFit', build: '1.0.0' };

const msToSeconds = (ms: number): number => ms / 1000;

/** Test seams: MusicKit loading, developer-token fetch, and the queue timeout. */
export interface AppleMusicAdapterHost {
  loadMusicKit?: () => Promise<MusicKitGlobal>;
  loadConfig?: () => Promise<AppleMusicClientConfig>;
  prepareTimeoutMs?: number;
}

export class AppleMusicAdapter implements PlaybackAdapter {
  readonly provider = 'apple_music' as const;
  private music: MusicKitGlobal | null = null;
  private instance: MusicKitInstance | null = null;
  private songId: string | null = null;
  private windowStartSeconds = 0;
  /** Pending cue position (seconds) applied by the next play(); see seek(). */
  private cueSeconds = 0;
  private cueDirty = false;
  private started = false;
  private destroyed = false;
  private trackTitle = '';

  // One bound handler pair for this adapter's life, so removeEventListener in
  // destroy() matches the addEventListener in prepare().
  private readonly onStateChange = (event: MusicKitPlaybackEvent): void => {
    const states = this.music?.PlaybackStates;
    // A single-song queue ending reads as `completed`; treat `ended` the same so
    // a stale/region-shortened stream still yields the one advisory finish.
    if (states && (event.state === states.completed || event.state === states.ended)) {
      this.events.onFinish?.();
    }
  };
  private readonly onPlaybackError = (): void => {
    this.events.onError?.({ message: `Apple Music playback failed for "${this.trackTitle}".` });
  };

  constructor(
    private readonly events: AdapterEvents = {},
    private readonly host: AppleMusicAdapterHost = {},
  ) {}

  /**
   * Configure + authorize MusicKit and cue this track at its window start, so a
   * later play() begins inside the clip with no audible seek from zero. Resolves
   * once the queue is loaded; a load failure (bad/unavailable track, timeout)
   * rejects so preflight/start can surface it instead of hanging the class.
   */
  async prepare(entry: RunPayloadTrackEntry, window: PlaybackWindow): Promise<PlaybackReady> {
    const ref = entry.providerRefs.find((candidate) => candidate.provider === 'apple_music');
    if (!ref) {
      throw new Error(`"${entry.track.title}" has no Apple Music reference.`);
    }
    this.destroyed = false;
    this.started = false;
    this.trackTitle = entry.track.title;
    this.songId = ref.providerTrackId;
    this.windowStartSeconds = msToSeconds(window.startMs);
    this.cueSeconds = this.windowStartSeconds;
    this.cueDirty = false;

    await this.configureAndCue(ref.providerTrackId);
    if (this.destroyed) throw new Error('Apple Music player was torn down while loading.');
    return { provider: 'apple_music', classTrackId: entry.classTrackId };
  }

  private async configureAndCue(songId: string): Promise<void> {
    const music = await (this.host.loadMusicKit ?? loadMusicKit)();
    if (this.destroyed) return;
    // Reuse the page singleton when it exists (e.g. connected earlier this
    // session) so we skip a redundant configure + token fetch.
    const instance = music.getInstance() ?? (await this.configure(music));
    if (this.destroyed) return;

    // Lazy authorize (the chosen posture): the first prepared track's play
    // gesture also covers Apple's consent surface, and an already-authorized
    // browser resolves immediately. The stored Music-User-Token is server-only
    // and never returned to the client, so the SDK re-establishes it here.
    if (!instance.isAuthorized) await instance.authorize();
    if (this.destroyed) return;

    await this.withTimeout(
      instance.setQueue({ songs: [songId], startTime: this.cueSeconds }),
      this.trackTitle,
    );
    if (this.destroyed) return;

    // Bind runtime listeners only once cued: a load failure surfaces as the
    // setQueue rejection above (a 'prepare' error), never a runtime error.
    instance.addEventListener(music.Events.playbackStateDidChange, this.onStateChange);
    instance.addEventListener(music.Events.mediaPlaybackError, this.onPlaybackError);
    this.music = music;
    this.instance = instance;
  }

  private async configure(music: MusicKitGlobal): Promise<MusicKitInstance> {
    const config = await (this.host.loadConfig ?? getAppleMusicConfig)();
    return music.configure({
      developerToken: config.developerToken,
      app: APP_META,
      ...(config.storefront ? { storefrontId: config.storefront } : {}),
    });
  }

  async play(): Promise<void> {
    const instance = this.requireInstance();
    // A pre-play seek (mid-track entry) re-cues here, since seekToTime has no
    // now-playing item to seek until playback has started.
    if (this.cueDirty && this.songId) {
      await instance.setQueue({ songs: [this.songId], startTime: this.cueSeconds });
      this.cueDirty = false;
    }
    await instance.play();
    this.started = true;
  }

  async pause(): Promise<void> {
    await this.requireInstance().pause();
  }

  async seek(providerMs: number): Promise<void> {
    const instance = this.requireInstance();
    const seconds = msToSeconds(providerMs);
    if (this.started) {
      await instance.seekToTime(seconds);
    } else {
      // Defer to play()'s re-cue: a pre-play seekToTime has no now-playing item.
      this.cueSeconds = seconds;
      this.cueDirty = true;
    }
  }

  /** Halt audio and re-cue the window start (stop ≠ destroy: re-playable). */
  async stop(): Promise<void> {
    const instance = this.requireInstance();
    await instance.stop();
    this.started = false;
    this.cueSeconds = this.windowStartSeconds;
    this.cueDirty = true;
  }

  destroy(): void {
    this.destroyed = true;
    const instance = this.instance;
    const music = this.music;
    if (instance && music) {
      try {
        instance.removeEventListener(music.Events.playbackStateDidChange, this.onStateChange);
        instance.removeEventListener(music.Events.mediaPlaybackError, this.onPlaybackError);
        // Halt this adapter's audio without tearing down the shared singleton;
        // the next track's adapter re-cues and plays on the same instance.
        void instance.stop();
      } catch {
        // Best-effort teardown — the next setQueue/play supersedes any audio.
      }
    }
    this.instance = null;
    this.music = null;
  }

  private requireInstance(): MusicKitInstance {
    if (!this.instance || this.destroyed) {
      throw new Error('Apple Music player is not prepared.');
    }
    return this.instance;
  }

  /**
   * Bound the queue-load step so a hung SDK rejects instead of wedging class
   * start. Wraps only setQueue — never authorize(), which waits on human consent.
   */
  private async withTimeout<T>(work: Promise<T>, title: string): Promise<T> {
    const timeoutMs = this.host.prepareTimeoutMs ?? DEFAULT_PREPARE_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`The Apple Music player timed out loading "${title}".`)),
        timeoutMs,
      );
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Registry entry for the runtime coordinator. */
export const appleMusicAdapterFactory: AdapterFactory = (events) => new AppleMusicAdapter(events);
