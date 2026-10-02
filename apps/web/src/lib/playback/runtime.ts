/**
 * The runtime playback coordinator — drives provider adapters against the Live
 * Mode virtual clock (provider-playback-implementation.md). Builds on the pure
 * decision core in `coordinator.ts`: selection/preflight decide *what* can
 * play; this state machine decides *when*, handling auto-advance, free-timeline
 * silence gaps, mid-track entry after a seek, and error surfacing.
 *
 * Live subscribes to provider-confirmed position during songs. Only declared
 * gaps and explicit prompter-only runs use host elapsed time. Preparation,
 * unknown transport, and failures hold position; early finish is recoverable.
 */
import type { Provider, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  playbackWindowFor,
  preflightPayload,
  providerMsAt,
  selectProvider,
  type ConnectionLike,
  type SelectionOptions,
} from './coordinator.js';
import type { LivenessObserver } from './liveness.js';
import type {
  AdapterRegistry,
  PlaybackAdapter,
  PreflightResult,
  TransportReading,
} from './types.js';

/**
 * Where a class-absolute time falls on the timeline. Unlike the prompter's
 * `trackIndexAt` (which snaps to the surrounding track for display), playback
 * needs the literal segment: audio must only run inside a track's window.
 */
export type TimelineSegment =
  /** Inside track `index`'s window — audio should be playing. */
  | { kind: 'track'; index: number }
  /**
   * Intentional silence: before the first track, a free-timeline gap, or after
   * a track that ended relative to the next start. `nextIndex` is null only
   * for trailing silence with no track ahead.
   */
  | { kind: 'silence'; nextIndex: number | null; untilMs: number }
  /** At or past the class end. */
  | { kind: 'ended' };

/**
 * Resolve the playback segment at a class-absolute time. Tracks without a
 * duration have zero-width windows and never match `track` (preflight already
 * rejects them for hands-free playback).
 */
export function segmentAt(payload: RunPayload, elapsedMs: number): TimelineSegment {
  const totalMs = payload.class.totalDurationMs;
  if (payload.tracks.length === 0 || (totalMs > 0 && elapsedMs >= totalMs)) {
    return { kind: 'ended' };
  }
  for (let i = 0; i < payload.tracks.length; i++) {
    const entry = payload.tracks[i]!;
    const start = entry.startOffsetMs ?? 0;
    const end = start + (entry.track.durationMs ?? 0);
    if (elapsedMs >= start && elapsedMs < end) return { kind: 'track', index: i };
    if (elapsedMs < start) return { kind: 'silence', nextIndex: i, untilMs: start };
  }
  return { kind: 'silence', nextIndex: null, untilMs: totalMs };
}

/** Which lifecycle step failed — drives the recovery copy, not just logging. */
export type RuntimeErrorPhase = 'preflight' | 'prepare' | 'adapter';

/**
 * A serious-but-recoverable runtime failure (the plan's error doctrine). The
 * host offers retry / reconnect / switch-provider; it never quietly falls back
 * to handoff links. `resume()` from the error state retries the segment.
 */
export interface PlaybackRuntimeError {
  phase: RuntimeErrorPhase;
  provider: Provider | null;
  classTrackId: string | null;
  message: string;
}

/** The coordinator's externally visible state, pushed via `onStatus`. */
export type CoordinatorStatus =
  | { kind: 'idle' }
  | { kind: 'preparing'; index: number; provider: Provider }
  /** Blocked on the provider's human consent sheet — a cancellable pause, not a
   *  frozen `preparing`; resolves to `playing` or a recoverable `error`. */
  | { kind: 'awaiting_authorization'; index: number; provider: Provider }
  | { kind: 'buffering'; index: number; provider: Provider }
  | { kind: 'playing'; index: number; provider: Provider }
  | { kind: 'silence'; nextIndex: number | null; untilMs: number }
  | { kind: 'paused' }
  | { kind: 'ended' }
  | { kind: 'error'; error: PlaybackRuntimeError };

/** Slow on purpose: "has it been dead for seconds", not frame-accurate sync. */
const DEFAULT_LIVENESS_INTERVAL_MS = 2_500;

export interface RuntimeCoordinatorOptions extends SelectionOptions {
  adapters: AdapterRegistry;
  onStatus?: (status: CoordinatorStatus) => void;
  onError?: (error: PlaybackRuntimeError) => void;
  /**
   * Optional recording-only instrumentation, independent from operational
   * transport polling. The composition root wires the observer.
   *
   * **Recording only.** Nothing the observer sees can reach `fail()` or change
   * status — see `liveness.ts` for why that is deliberate.
   */
  liveness?: LivenessObserver;
  livenessIntervalMs?: number;
  /** Music-led runs publish confirmed class position here. Without a subscriber,
   * tick remains the legacy externally-clocked coordinator contract. */
  onPosition?: (classMs: number) => void;
}

/** The currently prepared provider job. */
interface ActiveJob {
  adapter: PlaybackAdapter;
  index: number;
  provider: Provider;
  entry: RunPayloadTrackEntry;
}

/**
 * Drives one class run. Lifecycle: `preflight()` → `start(fromMs)` →
 * `tick(elapsedMs)` per host frame → `pause()`/`resume()`/`seek()` as the
 * instructor intervenes → `destroy()` on exit.
 *
 * Concurrency model: transitions are async (adapter `prepare` awaits an SDK),
 * so an epoch guards each transition and active job. A pending old SDK call
 * cannot block a new epoch; every user action invalidates stale results and
 * destroys the adapter it built, so a stale `prepare` resolving after a
 * seek/stop/destroy can never resurrect dead audio.
 */
export class RuntimePlaybackCoordinator {
  private status: CoordinatorStatus = { kind: 'idle' };
  private active: ActiveJob | null = null;
  private transitioningAdapter: PlaybackAdapter | null = null;
  private transitionAbort: AbortController | null = null;
  private running = false;
  private epoch = 0;
  private transitionEpoch: number | null = null;
  private transportTimer: ReturnType<typeof setInterval> | null = null;
  private transportRead: { job: ActiveJob; promise: Promise<TransportReading> } | null = null;
  private samplingJob: ActiveJob | null = null;
  private progressAt = 0;
  private providerPosition = 0;
  private finishedJob: ActiveJob | null = null;
  private transportRevision = 0;
  /** Diagnostic observation never changes operational status or position. */
  private livenessTimer: ReturnType<typeof setInterval> | null = null;
  private livenessProbeInFlight = false;
  /** rAF ticks since the last sample; zero means the host loop stalled too. */
  private hostTicksSinceSample = 0;

  constructor(
    private readonly payload: RunPayload,
    private readonly connections: ConnectionLike[],
    private readonly options: RuntimeCoordinatorOptions,
  ) {}

  getStatus(): CoordinatorStatus {
    return this.status;
  }

  /** Static preflight (connections/refs/durations) — run before offering Start. */
  preflight(): PreflightResult {
    return preflightPayload(this.payload, this.connections, this.options);
  }

  /**
   * Begin the run at `fromMs` (normally 0). Refuses to start hands-free
   * playback when static preflight fails — the host shows the preflight screen
   * instead. The host must call this from a user gesture: browser autoplay
   * policies require it, and adapters inherit that activation.
   */
  async start(fromMs = 0): Promise<void> {
    const preflight = this.preflight();
    if (!preflight.ok) {
      const first = preflight.unplayable[0]!;
      this.fail({
        phase: 'preflight',
        provider: null,
        classTrackId: first.classTrackId,
        message: `Preflight failed: ${preflight.unplayable.length} track(s) cannot play.`,
      });
      return;
    }
    this.running = true;
    await this.enter(fromMs, ++this.epoch);
  }

  /**
   * Follow the host clock. Cheap when nothing changed; performs the
   * auto-advance (release old adapter → prepare next → play) exactly when the
   * clock crosses a segment boundary. Frames arriving while a transition is in
   * flight are skipped — the next frame re-resolves from the clock, so nothing
   * is lost.
   */
  async tick(elapsedMs: number): Promise<void> {
    if (!this.running || this.transitionEpoch === this.epoch) return;
    // Host frames can drive only declared gaps. Songs advance from sampleTransport.
    if (this.options.onPosition && this.active) return;
    // Counted before the steady-state early return below, since the frames that
    // change nothing are exactly the ones that prove the host loop is alive.
    this.hostTicksSinceSample++;
    const segment = segmentAt(this.payload, elapsedMs);
    if (segment.kind === 'track' && this.active?.index === segment.index) return;
    if (segment.kind === 'silence' && this.status.kind === 'silence' && !this.active) return;
    await this.enter(elapsedMs, ++this.epoch);
  }

  /** Pause provider audio. The host pauses its clock in the same gesture. */
  async pause(): Promise<void> {
    this.epoch++;
    this.running = false;
    this.stopTransportTimer();
    this.destroyTransitioningAdapter();
    this.setStatus({ kind: 'paused' });
    if (this.active) {
      try {
        await this.bounded(this.active.adapter.pause(), 2_000);
      } catch {
        // Pausing a dying adapter is best-effort; the paused state stands.
      }
    }
  }

  /**
   * Resume at the host clock's current position (a user gesture). Also the
   * retry path from the error state: it re-resolves the segment from scratch.
   */
  async resume(elapsedMs: number): Promise<void> {
    this.running = true;
    await this.enter(elapsedMs, ++this.epoch);
  }

  /**
   * Jump the run to a new class time (transport seek). Re-resolves the segment
   * from scratch: a seek can land mid-track (prepare + provider seek), in a
   * gap, or past the end. No-op while paused — the host seeks its clock and
   * the next `resume` picks the position up.
   */
  async seek(elapsedMs: number): Promise<void> {
    if (!this.running) return;
    await this.enter(elapsedMs, ++this.epoch);
  }

  /** Stop the run and release the active adapter. Safe to call repeatedly. */
  async stop(): Promise<void> {
    this.epoch++;
    this.running = false;
    this.destroyTransitioningAdapter();
    if (this.active) {
      const job = this.active;
      this.active = null;
      await this.releaseJob(job);
    }
    this.setStatus({ kind: 'idle' });
  }

  /** Synchronous teardown for unmount. */
  destroy(): void {
    this.epoch++;
    this.running = false;
    // Assigns `status` directly below rather than via setStatus, so the probe
    // timer would otherwise outlive the unmounted coordinator.
    this.stopLivenessTimer();
    this.stopTransportTimer();
    this.destroyTransitioningAdapter();
    if (this.active) {
      try {
        this.active.adapter.destroy();
      } catch {
        // Unmount teardown must never throw into React.
      }
      this.active = null;
    }
    this.status = { kind: 'idle' };
  }

  /**
   * Resolve the segment at `elapsedMs` and drive the adapters to match it:
   * the shared path behind start/resume/seek/auto-advance. `epoch` pins the
   * transition — if another begins while an adapter call is awaited, this one
   * abandons its result.
   */
  private async enter(elapsedMs: number, epoch: number): Promise<void> {
    this.destroyTransitioningAdapter();
    this.stopTransportTimer();
    this.transitionEpoch = epoch;
    if (this.options.onPosition) this.setStatus({ kind: 'idle' });
    try {
      // Release whatever is playing first; a fresh prepare follows if needed.
      if (this.active) {
        const job = this.active;
        this.active = null;
        await this.releaseJob(job);
      }
      if (epoch !== this.epoch) return;

      const segment = segmentAt(this.payload, elapsedMs);
      if (segment.kind === 'ended') {
        this.running = false;
        this.setStatus({ kind: 'ended' });
        return;
      }
      if (segment.kind === 'silence') {
        this.setStatus({
          kind: 'silence',
          nextIndex: segment.nextIndex,
          untilMs: segment.untilMs,
        });
        return;
      }
      await this.enterTrack(segment.index, elapsedMs, epoch);
    } finally {
      if (this.transitionEpoch === epoch) this.transitionEpoch = null;
    }
  }

  /** Prepare, cue, and play one track's provider job. */
  private async enterTrack(index: number, elapsedMs: number, epoch: number): Promise<void> {
    const entry = this.payload.tracks[index]!;
    const selection = selectProvider(entry, this.connections, this.options);
    if (selection.status !== 'playable') {
      // start() preflights, so this means connections changed mid-class.
      this.fail({
        phase: 'prepare',
        provider: null,
        classTrackId: entry.classTrackId,
        message: `No connected provider can play "${entry.track.title}".`,
      });
      return;
    }

    const factory = this.options.adapters[selection.provider];
    if (!factory) {
      this.fail({
        phase: 'prepare',
        provider: selection.provider,
        classTrackId: entry.classTrackId,
        message: `${selection.provider} playback is not available in this build.`,
      });
      return;
    }

    this.setStatus({ kind: 'preparing', index, provider: selection.provider });
    let authorizationAt: number | null = null;
    const adapter = factory({
      // FINISH requires fresh endpoint evidence; a short stream is a mismatch.
      onFinish: () => {
        const job = this.active;
        if (!this.options.onPosition || epoch !== this.epoch || job?.adapter !== adapter) return;
        this.finishedJob = job;
        void this.sampleTransport();
      },
      onTransportState: (state) => {
        const job = this.active;
        if (!this.options.onPosition || epoch !== this.epoch || job?.adapter !== adapter) return;
        if (state !== 'playing' && state !== 'ended') {
          this.transportRevision++;
          this.setStatus({ kind: 'buffering', index, provider: selection.provider });
        }
      },
      onAwaitingAuthorization: () => {
        // The adapter is blocked on the provider's consent sheet. Surface a
        // distinct, cancellable state instead of a frozen `preparing`. Epoch-
        // guarded so a superseded transition's late signal can't clobber a
        // newer status.
        if (epoch !== this.epoch) return;
        authorizationAt = Date.now();
        this.setStatus({ kind: 'awaiting_authorization', index, provider: selection.provider });
      },
      onError: ({ message }) => {
        // Ignore a dead adapter's late errors (already superseded).
        if (epoch !== this.epoch || !this.running || this.active?.adapter !== adapter) return;
        this.fail({
          phase: 'adapter',
          provider: selection.provider,
          classTrackId: entry.classTrackId,
          message,
        });
      },
    });
    this.transitioningAdapter = adapter;
    const abort = new AbortController();
    this.transitionAbort = abort;

    try {
      const window = playbackWindowFor(entry);
      await this.bounded(
        adapter.prepare(entry, window),
        20_000,
        () => authorizationAt,
        abort.signal,
      );
      if (epoch !== this.epoch) {
        this.destroyTransitioningAdapter(adapter);
        return;
      }
      // Entering mid-track (seek/resume): cue the provider past the window start.
      const providerMs = providerMsAt(entry, elapsedMs);
      if (providerMs > window.startMs) {
        await this.bounded(adapter.seek(providerMs), 20_000, undefined, abort.signal);
        if (epoch !== this.epoch) {
          this.destroyTransitioningAdapter(adapter);
          return;
        }
      }
      await this.bounded(adapter.play(), 20_000, undefined, abort.signal);
      if (epoch !== this.epoch) {
        this.destroyTransitioningAdapter(adapter);
        return;
      }
      if (this.transitioningAdapter !== adapter) return;
      this.transitioningAdapter = null;
      this.transitionAbort = null;
      this.active = { adapter, index, provider: selection.provider, entry };
      if (this.options.onPosition) {
        this.providerPosition = providerMs;
        this.progressAt = Date.now();
        this.finishedJob = null;
        this.setStatus({ kind: 'buffering', index, provider: selection.provider });
        this.transportTimer = setInterval(() => void this.sampleTransport(), 250);
      } else {
        this.setStatus({ kind: 'playing', index, provider: selection.provider });
      }
    } catch (cause) {
      this.destroyTransitioningAdapter(adapter);
      if (epoch !== this.epoch) return;
      this.fail({
        phase: 'prepare',
        provider: selection.provider,
        classTrackId: entry.classTrackId,
        message: cause instanceof Error ? cause.message : `Could not start "${entry.track.title}".`,
      });
    }
  }

  /** Stop + destroy a job without letting adapter errors block the transition. */
  private async releaseJob(job: ActiveJob): Promise<void> {
    try {
      await this.bounded(job.adapter.stop(), 2_000);
    } catch {
      // A failing stop must not block the transition; destroy still runs.
    }
    try {
      job.adapter.destroy();
    } catch {
      // Teardown is best-effort.
    }
  }

  /**
   * Tear down the adapter currently awaiting prepare/seek/play. Identity
   * guarding prevents an old transition from clearing a newer track's adapter
   * when its provider promise settles late.
   */
  private destroyTransitioningAdapter(adapter = this.transitioningAdapter): void {
    if (!adapter || this.transitioningAdapter !== adapter) return;
    this.transitioningAdapter = null;
    this.transitionAbort?.abort();
    this.transitionAbort = null;
    try {
      adapter.destroy();
    } catch {
      // Cancellation must still settle the coordinator if teardown fails.
    }
  }

  /** A silent SDK promise must not hold preparation or teardown indefinitely. */
  private bounded<T>(
    promise: Promise<T>,
    timeoutMs = 20_000,
    authorizationAt?: () => number | null,
    signal?: AbortSignal,
  ): Promise<T> {
    const began = Date.now();
    let timer: ReturnType<typeof setInterval>;
    let onAbort = () => {};
    const timeout = new Promise<T>((_, reject) => {
      onAbort = () => reject(new Error('Music preparation cancelled.'));
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) onAbort();
      timer = setInterval(() => {
        const consent = authorizationAt?.();
        const deadline = consent != null ? consent + 60_000 : began + timeoutMs;
        if (Date.now() >= deadline)
          reject(new Error('Music did not finish preparing. Retry or continue without music.'));
      }, 250);
    });
    return Promise.race([promise, timeout]).finally(() => {
      clearInterval(timer);
      signal?.removeEventListener('abort', onAbort);
    });
  }

  private stopTransportTimer(): void {
    if (this.transportTimer != null) clearInterval(this.transportTimer);
    this.transportTimer = null;
    this.samplingJob = null;
  }

  /** Diagnostics and operational polling share one SDK read per job. */
  private readTransport(job: ActiveJob): Promise<TransportReading> {
    if (this.transportRead?.job === job) return this.transportRead.promise;
    const promise = Promise.resolve().then(async () => {
      if (job.adapter.getTransport) return job.adapter.getTransport();
      const reading = await job.adapter.getLiveness?.();
      return reading
        ? {
            positionMs: reading.positionMs,
            state: reading.playing ? ('playing' as const) : ('paused' as const),
          }
        : { positionMs: null, state: 'unknown' as const };
    });
    this.transportRead = { job, promise };
    void promise
      .finally(() => {
        if (this.transportRead?.promise === promise) this.transportRead = null;
      })
      .catch(() => {});
    return promise;
  }

  private async sampleTransport(): Promise<void> {
    const job = this.active;
    if (!job || !this.running || !this.options.onPosition) return;
    // Do not infer a stall from time spent backgrounded before asking the SDK.
    if (this.samplingJob === job) {
      if (Date.now() - this.progressAt >= 10_000)
        this.transportFailure(job, 'Music stopped reporting progress.');
      return;
    }
    const epoch = this.epoch;
    this.samplingJob = job;
    const finishedWhenReadBegan = this.finishedJob === job;
    const revision = this.transportRevision;
    try {
      const reading = await this.readTransport(job);
      if (
        epoch !== this.epoch ||
        this.active !== job ||
        !this.running ||
        revision !== this.transportRevision
      )
        return;
      // A read begun before FINISH can still describe the final playing frame.
      if (this.finishedJob === job && !finishedWhenReadBegan && reading.state !== 'ended') return;
      const window = playbackWindowFor(job.entry);
      const position = reading.positionMs;
      if (position == null || !Number.isFinite(position)) {
        this.setStatus({ kind: 'buffering', index: job.index, provider: job.provider });
      } else if (
        (this.finishedJob === job || reading.state === 'ended') &&
        position < window.endMs
      ) {
        this.transportFailure(
          job,
          'Music ended before the saved playback window. Check its duration or skip this track.',
        );
        return;
      } else if (
        (reading.state === 'playing' || reading.state === 'ended' || this.finishedJob === job) &&
        position > this.providerPosition
      ) {
        this.providerPosition = position;
        this.progressAt = Date.now();
        const classMs =
          (job.entry.startOffsetMs ?? 0) + Math.min(position, window.endMs) - window.startMs;
        this.setStatus({ kind: 'playing', index: job.index, provider: job.provider });
        this.options.onPosition(classMs);
        const segment = segmentAt(this.payload, classMs);
        if (segment.kind !== 'track' || segment.index !== job.index)
          await this.enter(classMs, ++this.epoch);
        return;
      } else if (reading.state !== 'playing' || this.status.kind !== 'playing') {
        this.setStatus({ kind: 'buffering', index: job.index, provider: job.provider });
      }
      if (Date.now() - this.progressAt >= 10_000)
        this.transportFailure(job, 'Music is paused, stalled, or its position cannot be verified.');
    } catch (cause) {
      if (epoch === this.epoch && this.active === job && this.running) {
        this.transportFailure(
          job,
          cause instanceof Error ? cause.message : 'Music playback could not be verified.',
        );
      }
    } finally {
      if (this.samplingJob === job) this.samplingJob = null;
    }
  }

  private transportFailure(job: ActiveJob, message: string): void {
    this.fail({
      phase: 'adapter',
      provider: job.provider,
      classTrackId: job.entry.classTrackId,
      message,
    });
  }

  private setStatus(status: CoordinatorStatus): void {
    this.status = status;
    if (['paused', 'error', 'ended', 'idle', 'silence'].includes(status.kind))
      this.stopTransportTimer();
    this.syncLivenessTimer(status);
    this.options.onStatus?.(status);
  }

  /**
   * Observe only while we believe audio is running. Every other status is a
   * state we put the player into ourselves, where "not advancing" is the
   * correct behaviour and would be pure noise in the buffer.
   */
  private syncLivenessTimer(status: CoordinatorStatus): void {
    const shouldRun = status.kind === 'playing' && this.options.liveness != null;
    if (shouldRun === (this.livenessTimer !== null)) return;
    if (shouldRun) {
      this.hostTicksSinceSample = 0;
      this.livenessTimer = setInterval(
        () => this.probeLiveness(),
        this.options.livenessIntervalMs ?? DEFAULT_LIVENESS_INTERVAL_MS,
      );
    } else {
      this.stopLivenessTimer();
    }
  }

  private stopLivenessTimer(): void {
    if (this.livenessTimer === null) return;
    clearInterval(this.livenessTimer);
    this.livenessTimer = null;
  }

  /**
   * Take one reading and hand it to the observer. Fire-and-forget with an
   * in-flight guard, so a provider that answers slowly delays the next sample
   * rather than stacking probes on top of it.
   *
   * Every outcome is swallowed. Instrumentation that can break playback is
   * worse than no instrumentation, and this path exists only to watch.
   */
  private probeLiveness(): void {
    const observer = this.options.liveness;
    const job = this.active;
    if (!observer || !job || this.livenessProbeInFlight) return;

    const hostTicks = this.hostTicksSinceSample;
    this.hostTicksSinceSample = 0;

    const record = (reading: Parameters<LivenessObserver['record']>[0]['reading']): void => {
      // A superseded job's late reading describes a track we no longer play.
      if (this.active !== job) return;
      try {
        observer.record({ provider: job.provider, trackIndex: job.index, reading, hostTicks });
      } catch {
        // An observer that throws must not take the class down with it.
      }
    };

    const read = job.adapter.getLiveness?.bind(job.adapter);
    if (!read) {
      record(null);
      return;
    }

    this.livenessProbeInFlight = true;
    void (
      this.options.onPosition
        ? this.readTransport(job).then((reading) =>
            reading.positionMs == null
              ? null
              : { positionMs: reading.positionMs, playing: reading.state === 'playing' },
          )
        : read()
    )
      .then((reading) => record(reading))
      // A rejection *is* the finding: the provider stopped answering.
      .catch(() => record('unresponsive'))
      .finally(() => {
        this.livenessProbeInFlight = false;
      });
  }

  /** Enter the error state: playback halts, the host offers recovery actions. */
  private fail(error: PlaybackRuntimeError): void {
    this.running = false;
    this.epoch++;
    this.destroyTransitioningAdapter();
    if (this.active) {
      try {
        this.active.adapter.destroy();
      } catch {
        // The error state stands regardless of teardown success.
      }
      this.active = null;
    }
    this.setStatus({ kind: 'error', error });
    this.options.onError?.(error);
  }
}
