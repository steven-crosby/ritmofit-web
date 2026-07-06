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
 * persisted (CLAUDE.md), and are never used for catalog/BPM shortcuts.
 */
import type { AppleMusicClientConfig, RunPayloadTrackEntry } from '@ritmofit/shared';
import { getAppleMusicConfig } from '../api.js';
import {
  loadMusicKit,
  type MusicKitGlobal,
  type MusicKitInstance,
  type MusicKitPlaybackEvent,
  type MusicKitSetQueueOptions,
} from '../musickit.js';
import type {
  AdapterEvents,
  AdapterFactory,
  PlaybackAdapter,
  PlaybackReady,
  PlaybackWindow,
} from './types.js';

const DEFAULT_PREPARE_TIMEOUT_MS = 20_000;
/**
 * Consent waits on a human, so it gets a far more generous budget than the
 * queue-load timeout — but a blocked/abandoned Apple sheet must not wedge
 * `prepare()` forever, so it is still bounded and fails to the recoverable-
 * error path (which also lets the coordinator tear the orphaned adapter down).
 */
const DEFAULT_AUTHORIZE_TIMEOUT_MS = 60_000;
const APP_META = { name: 'Ritmo Studio', build: '1.0.0' };

const msToSeconds = (ms: number): number => ms / 1000;

/**
 * Which adapter currently owns each shared MusicKit instance's transport. Every
 * track's adapter remote-controls the same singleton, so a superseded adapter
 * (its epoch abandoned mid-prepare/-play by a rapid seek) must NOT stop audio a
 * newer adapter has since claimed and started. Ownership is claimed in play() and
 * only the owner may stop on teardown. Keyed by instance via a WeakMap — never a
 * module global — so it stays correct if a page ever holds more than one instance
 * and never leaks across teardown.
 */
const transportOwners = new WeakMap<MusicKitInstance, AppleMusicAdapter>();

/**
 * Generation guard for the shared MusicKit queue. `setQueue()` is not
 * cancellable: if one adapter is abandoned while MusicKit is still loading, its
 * promise can resolve after a newer adapter has cued the singleton. The newest
 * generation is the only one allowed to finish as a valid cue.
 */
const queueGenerations = new WeakMap<MusicKitInstance, number>();
const pendingQueueGenerations = new WeakMap<MusicKitInstance, number>();

function claimQueueGeneration(instance: MusicKitInstance): number {
  const generation = (queueGenerations.get(instance) ?? 0) + 1;
  queueGenerations.set(instance, generation);
  return generation;
}

function currentQueueGeneration(instance: MusicKitInstance): number {
  return queueGenerations.get(instance) ?? 0;
}

/** Test seams: MusicKit loading, developer-token fetch, and the queue timeout. */
export interface AppleMusicAdapterHost {
  loadMusicKit?: () => Promise<MusicKitGlobal>;
  loadConfig?: () => Promise<AppleMusicClientConfig>;
  prepareTimeoutMs?: number;
  authorizeTimeoutMs?: number;
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
  private queueGeneration: number | null = null;

  // One bound handler pair for this adapter's life, so removeEventListener in
  // destroy() matches the addEventListener in prepare().
  private readonly onStateChange = (event: MusicKitPlaybackEvent): void => {
    // Only a genuine end-of-track while we are the playing owner is a finish. A
    // single-song queue also reports `completed`/`ended` when WE stop or tear
    // down (started is cleared first), which must not misfire onFinish.
    if (!this.started) return;
    const states = this.music?.PlaybackStates;
    // Treat `ended` like `completed` so a stale/region-shortened stream still
    // yields the one advisory finish.
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
    if (!instance.isAuthorized) {
      // Signal the waiting state so the coordinator surfaces a cancellable
      // "waiting for authorization" instead of a frozen `preparing`, and bound
      // the un-cancellable consent with a generous timeout: a blocked/abandoned
      // sheet then rejects to the recoverable-error path rather than hanging.
      this.events.onAwaitingAuthorization?.();
      await this.withTimeout(
        instance.authorize(),
        this.host.authorizeTimeoutMs ?? DEFAULT_AUTHORIZE_TIMEOUT_MS,
        `Apple Music authorization didn't complete for "${this.trackTitle}". Try again or reconnect Apple Music.`,
      );
    }
    if (this.destroyed) return;

    await this.setQueue(instance, { songs: [songId], startTime: this.cueSeconds }, this.trackTitle);
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
    // now-playing item to seek until playback has started. Bounded like the
    // prepare-time cue so a hung queue-load can't wedge the transition.
    if (this.cueDirty && this.songId) {
      await this.setQueue(
        instance,
        { songs: [this.songId], startTime: this.cueSeconds },
        this.trackTitle,
      );
      this.cueDirty = false;
    }
    await instance.play();
    // Claim the shared transport: from here until stop/teardown, only this
    // adapter may stop the singleton (see transportOwners).
    transportOwners.set(instance, this);
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
    // Clear started (so a stop-induced completed/ended is not read as a finish)
    // and release transport ownership before halting.
    this.started = false;
    if (transportOwners.get(instance) === this) transportOwners.delete(instance);
    await instance.stop();
    this.cueSeconds = this.windowStartSeconds;
    this.cueDirty = true;
  }

  destroy(): void {
    this.destroyed = true;
    this.started = false;
    const instance = this.instance;
    const music = this.music;
    if (instance && music) {
      try {
        instance.removeEventListener(music.Events.playbackStateDidChange, this.onStateChange);
        instance.removeEventListener(music.Events.mediaPlaybackError, this.onPlaybackError);
        // Only halt audio if this adapter still owns the shared transport. A
        // superseded adapter (abandoned mid-prepare/-play by a rapid seek) must
        // never stop the newer adapter that has since claimed and started the
        // singleton — but an owner abandoned into a silence gap must stop, so
        // the ownership check keeps both cases correct without tearing the
        // singleton down.
        if (transportOwners.get(instance) === this) {
          transportOwners.delete(instance);
          void instance.stop();
        }
      } catch {
        // Best-effort teardown — the next setQueue/play supersedes any audio.
      }
    }
    if (
      instance &&
      this.queueGeneration !== null &&
      currentQueueGeneration(instance) === this.queueGeneration
    ) {
      claimQueueGeneration(instance);
    }
    this.queueGeneration = null;
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
   * start, under the tight `prepareTimeoutMs`. Human consent (`authorize()`) is
   * bounded separately by the far more generous `authorizeTimeoutMs`.
   */
  private async setQueue(
    instance: MusicKitInstance,
    options: MusicKitSetQueueOptions,
    title: string,
  ): Promise<void> {
    if (pendingQueueGenerations.has(instance)) {
      throw new Error(
        `The Apple Music player is still finishing a previous queue request for "${title}".`,
      );
    }

    const generation = claimQueueGeneration(instance);
    this.queueGeneration = generation;
    pendingQueueGenerations.set(instance, generation);
    const queued = instance
      .setQueue(options)
      .then((result) => {
        if (this.destroyed || currentQueueGeneration(instance) !== generation) {
          throw new Error(`The Apple Music queue request for "${title}" was superseded.`);
        }
        return result;
      })
      .finally(() => {
        if (pendingQueueGenerations.get(instance) === generation) {
          pendingQueueGenerations.delete(instance);
        }
      });

    await this.withTimeout(
      queued,
      this.host.prepareTimeoutMs ?? DEFAULT_PREPARE_TIMEOUT_MS,
      `The Apple Music player timed out loading "${title}".`,
    );
  }

  private async withTimeout<T>(work: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
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
