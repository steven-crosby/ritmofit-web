/**
 * The runtime playback coordinator — drives provider adapters against the Live
 * Mode virtual clock (provider-playback-implementation.md). Builds on the pure
 * decision core in `coordinator.ts`: selection/preflight decide *what* can
 * play; this state machine decides *when*, handling auto-advance, free-timeline
 * silence gaps, mid-track entry after a seek, and error surfacing.
 *
 * The host (Live Mode) owns the clock and calls `tick(elapsedMs)` from its
 * existing rAF loop; the coordinator never runs its own timer. Ritmo Studio's class
 * timeline is the master: adapters are told to play/stop when segments change,
 * and an early provider `finish` just means silence until the next scheduled
 * start. Runtime playback failures surface as serious recoverable errors
 * (retry/reconnect/switch-provider UI), never as silent skips or handoff links.
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
import type { AdapterRegistry, PlaybackAdapter, PreflightResult } from './types.js';

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
  | { kind: 'playing'; index: number; provider: Provider }
  | { kind: 'silence'; nextIndex: number | null; untilMs: number }
  | { kind: 'paused' }
  | { kind: 'ended' }
  | { kind: 'error'; error: PlaybackRuntimeError };

export interface RuntimeCoordinatorOptions extends SelectionOptions {
  adapters: AdapterRegistry;
  onStatus?: (status: CoordinatorStatus) => void;
  onError?: (error: PlaybackRuntimeError) => void;
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
 * so two guards keep them sane. `transitions` (a counter) makes the rAF `tick`
 * skip frames while any transition is in flight; `epoch` (bumped by every
 * user-initiated action) makes a superseded transition abandon its result and
 * destroy the adapter it built, so a stale `prepare` resolving after a
 * seek/stop/destroy can never resurrect dead audio.
 */
export class RuntimePlaybackCoordinator {
  private status: CoordinatorStatus = { kind: 'idle' };
  private active: ActiveJob | null = null;
  private running = false;
  private epoch = 0;
  private transitions = 0;

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
    if (!this.running || this.transitions > 0) return;
    const segment = segmentAt(this.payload, elapsedMs);
    if (segment.kind === 'track' && this.active?.index === segment.index) return;
    if (segment.kind === 'silence' && this.status.kind === 'silence' && !this.active) return;
    await this.enter(elapsedMs, this.epoch);
  }

  /** Pause provider audio. The host pauses its clock in the same gesture. */
  async pause(): Promise<void> {
    this.epoch++;
    this.running = false;
    if (this.active) {
      try {
        await this.active.adapter.pause();
      } catch {
        // Pausing a dying adapter is best-effort; the paused state stands.
      }
    }
    this.setStatus({ kind: 'paused' });
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
    this.transitions++;
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
      this.transitions--;
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
    const adapter = factory({
      // Early provider finish = silence until the next scheduled start; the
      // class clock is master, so there is nothing to advance here.
      onFinish: () => {},
      onAwaitingAuthorization: () => {
        // The adapter is blocked on the provider's consent sheet. Surface a
        // distinct, cancellable state instead of a frozen `preparing`. Epoch-
        // guarded so a superseded transition's late signal can't clobber a
        // newer status.
        if (epoch !== this.epoch) return;
        this.setStatus({ kind: 'awaiting_authorization', index, provider: selection.provider });
      },
      onError: ({ message }) => {
        // Ignore a dead adapter's late errors (already superseded).
        if (this.active?.adapter !== adapter) return;
        this.fail({
          phase: 'adapter',
          provider: selection.provider,
          classTrackId: entry.classTrackId,
          message,
        });
      },
    });

    try {
      const window = playbackWindowFor(entry);
      await adapter.prepare(entry, window);
      if (epoch !== this.epoch) {
        adapter.destroy();
        return;
      }
      // Entering mid-track (seek/resume): cue the provider past the window start.
      const providerMs = providerMsAt(entry, elapsedMs);
      if (providerMs > window.startMs) {
        await adapter.seek(providerMs);
        if (epoch !== this.epoch) {
          adapter.destroy();
          return;
        }
      }
      await adapter.play();
      if (epoch !== this.epoch) {
        adapter.destroy();
        return;
      }
      this.active = { adapter, index, provider: selection.provider, entry };
      this.setStatus({ kind: 'playing', index, provider: selection.provider });
    } catch (cause) {
      try {
        adapter.destroy();
      } catch {
        // The prepare failure below is the state that matters.
      }
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
      await job.adapter.stop();
    } catch {
      // A failing stop must not block the transition; destroy still runs.
    }
    try {
      job.adapter.destroy();
    } catch {
      // Teardown is best-effort.
    }
  }

  private setStatus(status: CoordinatorStatus): void {
    this.status = status;
    this.options.onStatus?.(status);
  }

  /** Enter the error state: playback halts, the host offers recovery actions. */
  private fail(error: PlaybackRuntimeError): void {
    this.running = false;
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
