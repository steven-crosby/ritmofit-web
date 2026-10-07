import type { TransportReading, TransportState } from './types.js';
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
  configureMusicKit,
  loadMusicKit,
  type MusicKitGlobal,
  type MusicKitInstance,
  type MusicKitPlaybackEvent,
  type MusicKitSetQueueOptions,
} from '../musickit.js';
import type {
  AdapterEvents,
  AdapterFactory,
  LivenessReading,
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
const pendingPlays = new WeakSet<MusicKitInstance>();
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
  /** Live requires visible preflight consent; preview retains its explicit play consent. */
  requirePreauthorization?: boolean;
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
  private starting = false;
  private destroyed = false;
  private trackTitle = '';
  private queueGeneration: number | null = null;
  private lastPositionMs: number | null = null;
  private finishedReading: TransportReading | null = null;

  // One bound handler pair for this adapter's life, so removeEventListener in
  // destroy() matches the addEventListener in prepare().
  private readonly onStateChange = (event: MusicKitPlaybackEvent): void => {
    if (!this.started || !this.instance || transportOwners.get(this.instance) !== this) return;
    const state = this.transportState(event.state);
    // Capture before notifying the runtime: MusicKit clears time and duration
    // during single-song teardown (paused -> seeking -> ended -> completed).
    this.captureTransport(state);
    this.events.onTransportState?.(state);
    // stop()/destroy() clear started before their own teardown events.
    if (state === 'ended') this.events.onFinish?.();
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
    if (this.starting) throw new Error('Apple Music is still finishing a previous play request.');
    const ref = entry.providerRefs.find((candidate) => candidate.provider === 'apple_music');
    if (!ref) {
      throw new Error(`"${entry.track.title}" has no Apple Music reference.`);
    }
    this.destroyed = false;
    this.started = false;
    this.clearEndpoint();
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
    if (pendingPlays.has(instance))
      throw new Error(
        'Apple Music is still finishing a cancelled play request. Retry after it finishes, or reload.',
      );

    // Lazy authorize (the chosen posture): the first prepared track's play
    // gesture also covers Apple's consent surface, and an already-authorized
    // browser resolves immediately. The stored Music-User-Token is server-only
    // and never returned to the client, so the SDK re-establishes it here.
    if (!instance.isAuthorized) {
      if (this.host.requirePreauthorization) {
        throw new Error(
          'Apple Music needs browser authorization. Open Manage music connection and authorize Apple Music before retrying.',
        );
      }
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
    return configureMusicKit(music, config);
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
    if (this.destroyed) throw new Error('Apple Music play was cancelled.');
    if (pendingPlays.has(instance))
      throw new Error('Apple Music is still finishing a previous play request.');
    this.starting = true;
    this.clearEndpoint();
    pendingPlays.add(instance);
    transportOwners.set(instance, this);
    try {
      await instance.play();
      if (this.destroyed) throw new Error('Apple Music play was cancelled.');
      this.started = true;
    } finally {
      if (this.destroyed && transportOwners.get(instance) === this) {
        try {
          await instance.stop();
        } catch {
          /* Provider teardown is best-effort. */
        }
        if (transportOwners.get(instance) === this) transportOwners.delete(instance);
      }
      pendingPlays.delete(instance);
      this.starting = false;
    }
  }

  async pause(): Promise<void> {
    await this.requireInstance().pause();
  }

  /**
   * Read MusicKit's own transport status. This is the provider whose silent
   * death this project has actually observed: on 2026-07-06 MusicKit authorized,
   * loaded the track, set `nowPlayingItem` with the full duration, logged zero
   * errors, and then stalled at `readyState 0` under background throttling
   * (`ritmofit_dev_plan/HISTORY.md`). `playbackState` distinguishes that from
   * playing; the adapter had simply never read it.
   *
   * `playing` is asserted only against a state we can positively identify.
   * Anything else — `stalled`, `waiting`, a code we have no name for — is
   * reported as not playing, which is a claim the observer records rather than
   * acts on. Where the state cannot be resolved at all, this returns null and
   * the instance is exempt, since inventing a verdict is the failure mode the
   * F-05 "0 tracks" bug was made of.
   */
  private transportState(state = this.instance?.playbackState): TransportState {
    const states = this.music?.PlaybackStates;
    if (!states || state == null) return 'unknown';
    if (state === states.playing) return 'playing';
    if (state === states.completed || state === states.ended) return 'ended';
    if (state === states.paused || state === states.stopped) return 'paused';
    if (
      state === states.stalled ||
      state === states.waiting ||
      state === states.loading ||
      state === states.seeking
    )
      return 'buffering';
    return 'unknown';
  }
  async getTransport(): Promise<TransportReading> {
    // Read state and position together, without yielding between SDK reads.
    return this.captureTransport(this.transportState());
  }

  private captureTransport(state: TransportState): TransportReading {
    const instance = this.instance;
    if (!instance || this.destroyed || !this.started || transportOwners.get(instance) !== this)
      return { state: 'unknown', positionMs: null };
    if (this.finishedReading) return this.finishedReading;

    const seconds = instance.currentPlaybackTime;
    const positionMs =
      typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0
        ? Math.round(seconds * 1000)
        : null;
    if (state === 'ended') {
      // Duration is not proof of reaching the endpoint. Retain the latest
      // observed playhead through MusicKit's reset; never invent a full-song end.
      this.finishedReading = {
        state,
        positionMs: positionMs != null && positionMs > 0 ? positionMs : this.lastPositionMs,
      };
      return this.finishedReading;
    }
    // MusicKit can reset the playhead to 0 and emit paused again before ended.
    // That zero is not an endpoint. Keep the latest positive playhead so ended
    // can fall back to it; an explicit seek/stop/replay still clears the cache.
    if ((state === 'playing' || state === 'paused') && positionMs != null && positionMs > 0)
      this.lastPositionMs = positionMs;
    return { state, positionMs };
  }

  private clearEndpoint(): void {
    this.lastPositionMs = null;
    this.finishedReading = null;
  }

  async getLiveness(): Promise<LivenessReading | null> {
    const instance = this.instance;
    const states = this.music?.PlaybackStates;
    if (!instance || !states || this.destroyed || !this.started) return null;
    if (transportOwners.get(instance) !== this) return null;

    const seconds = instance.currentPlaybackTime;
    const state = instance.playbackState;
    if (typeof seconds !== 'number' || typeof state !== 'number') return null;
    if (typeof states.playing !== 'number') return null;

    return { positionMs: Math.round(seconds * 1000), playing: state === states.playing };
  }

  async seek(providerMs: number): Promise<void> {
    const instance = this.requireInstance();
    this.clearEndpoint();
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
    this.clearEndpoint();
    if (transportOwners.get(instance) === this) transportOwners.delete(instance);
    await instance.stop();
    this.cueSeconds = this.windowStartSeconds;
    this.cueDirty = true;
  }

  destroy(): void {
    this.destroyed = true;
    this.started = false;
    this.clearEndpoint();
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
          if (!pendingPlays.has(instance)) transportOwners.delete(instance);
          void instance.stop().catch(() => {});
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

/** Live never opens provider consent from an unattended track transition. */
export const preauthorizedAppleMusicAdapterFactory: AdapterFactory = (events) =>
  new AppleMusicAdapter(events, { requirePreauthorization: true });
