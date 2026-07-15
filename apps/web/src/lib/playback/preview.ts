/**
 * Builder preview controller — drives ONE provider adapter for the selected
 * track so an instructor can test a climb/sprint/drop while choreographing
 * (provider-playback-implementation.md §"Builder preview is manual"). It shares
 * the adapter/coordinator stack with Live Mode but is deliberately NOT the
 * runtime coordinator: preview is single-track and manual, so there is no
 * class clock, no preflight over other tracks, and — structurally — no
 * auto-advance. When one track's preview ends there is simply nothing to play.
 *
 * Range fidelity: preview plays the selected track's saved clip window (the
 * non-destructive "shortening" from D13) — cued at `clipStartMs` and stopped at
 * the window end — so what the instructor hears is exactly the range the class
 * will run, never the whole provider track. The host owns the clock exactly as
 * Live Mode does: it runs a small rAF loop while playing and calls
 * `tick(previewElapsedMs)`; this controller owns no timer of its own, which
 * keeps it pure and unit-testable without a real SDK. Ritmo Studio owns the
 * window; the provider SDK owns the audio stream (music-providers.md, D19).
 */
import type { Provider, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  playbackWindowFor,
  selectProvider,
  type ConnectionLike,
  type SelectionOptions,
} from './coordinator.js';
import type { AdapterRegistry, PlaybackAdapter } from './types.js';

/** Which lifecycle step failed — drives the recovery copy, not just logging. */
export type PreviewErrorPhase = 'select' | 'prepare' | 'adapter';

/**
 * A recoverable preview failure. The host offers retry / reconnect; preview
 * never silently falls back to a handoff link (that stays a Live Mode
 * recovery-only affordance).
 */
export interface PreviewError {
  phase: PreviewErrorPhase;
  provider: Provider | null;
  classTrackId: string;
  message: string;
}

/** The controller's externally visible state, pushed via `onStatus`. */
export type PreviewStatus =
  | { kind: 'idle' }
  | { kind: 'preparing'; classTrackId: string; provider: Provider }
  /** Blocked on the provider's human consent sheet — cancellable, resolves to
   *  `playing` or a recoverable `error`. */
  | { kind: 'awaiting_authorization'; classTrackId: string; provider: Provider }
  | { kind: 'playing'; classTrackId: string; provider: Provider }
  | { kind: 'paused'; classTrackId: string; provider: Provider }
  /** Reached the clip-window end (or the provider stream finished first). */
  | { kind: 'ended'; classTrackId: string }
  | { kind: 'error'; error: PreviewError };

export interface PreviewControllerOptions extends Omit<SelectionOptions, 'now'> {
  adapters: AdapterRegistry;
  /**
   * Clock accessor for provider-expiry checks. A function, not a frozen number,
   * because the controller is long-lived (built once when connections load and
   * reused across previews): a token can expire between load and the instructor
   * clicking Preview, so selection must read the time at each `play()`, not at
   * construction. Defaults to `Date.now`; injectable for deterministic tests.
   */
  now?: () => number;
  onStatus?: (status: PreviewStatus) => void;
  onError?: (error: PreviewError) => void;
}

/** The currently prepared preview job. */
interface PreviewJob {
  adapter: PlaybackAdapter;
  classTrackId: string;
  provider: Provider;
  /**
   * Clip-window length in provider ms — where `tick` stops preview. A track
   * with no known duration has an open-ended window (`Infinity`): preview plays
   * from the clip start and only a manual stop or the provider's own `finish`
   * ends it, since there is no window end to honor.
   */
  windowDurationMs: number;
}

/**
 * Drives a single track's manual preview. Lifecycle: `play(entry)` prepares +
 * plays the clip window → the host `tick(previewElapsedMs)`s a preview-relative
 * clock while playing → `pause()`/`resume()` / re-`play()` a different track /
 * `stop()` as the instructor intervenes → `destroy()` on unmount.
 *
 * Concurrency model mirrors `RuntimePlaybackCoordinator`: `epoch` (bumped by
 * every user action) makes a superseded transition abandon its result and
 * destroy the adapter it built, so a stale `prepare` resolving after the
 * instructor picked a different track can never resurrect dead audio;
 * `transitions` makes `tick` skip frames while a transition is in flight.
 */
export class PreviewPlaybackController {
  private status: PreviewStatus = { kind: 'idle' };
  private active: PreviewJob | null = null;
  private transitioningAdapter: PlaybackAdapter | null = null;
  private epoch = 0;
  private transitions = 0;

  constructor(
    private readonly connections: ConnectionLike[],
    private readonly options: PreviewControllerOptions,
  ) {}

  getStatus(): PreviewStatus {
    return this.status;
  }

  /** Selection inputs with the time read *now* (see `options.now`). */
  private selectionOptions(): SelectionOptions {
    return {
      preferredProvider: this.options.preferredProvider,
      now: (this.options.now ?? Date.now)(),
      availableProviders: this.options.availableProviders,
    };
  }

  /**
   * Prepare and play `entry`'s clip window from its start (a user gesture, so
   * browser autoplay policies and MusicKit authorization are satisfied). Any
   * previously previewing track is released first. Selection/registry failures
   * surface as the error state, never as a silent no-op.
   */
  async play(entry: RunPayloadTrackEntry): Promise<void> {
    const epoch = ++this.epoch;
    this.transitions++;
    try {
      this.destroyTransitioningAdapter();
      await this.releaseActive();
      if (epoch !== this.epoch) return;

      const selection = selectProvider(entry, this.connections, this.selectionOptions());
      if (selection.status !== 'playable') {
        this.fail({
          phase: 'select',
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

      this.setStatus({
        kind: 'preparing',
        classTrackId: entry.classTrackId,
        provider: selection.provider,
      });
      const adapter = factory({
        // The provider stream reached its end before we stopped it — treat as a
        // clean preview end (nothing to advance to).
        onFinish: () => {
          if (this.active?.adapter !== adapter) return;
          void this.endActive();
        },
        onAwaitingAuthorization: () => {
          // Blocked on the provider's consent sheet: a distinct, cancellable
          // state, epoch-guarded against a superseded transition's late signal.
          if (epoch !== this.epoch) return;
          this.setStatus({
            kind: 'awaiting_authorization',
            classTrackId: entry.classTrackId,
            provider: selection.provider,
          });
        },
        onError: ({ message }) => {
          // Ignore a superseded adapter's late errors.
          if (this.active?.adapter !== adapter) return;
          this.fail({
            phase: 'adapter',
            provider: selection.provider,
            classTrackId: entry.classTrackId,
            message,
          });
        },
      });
      this.transitioningAdapter = adapter;

      try {
        const window = playbackWindowFor(entry);
        await adapter.prepare(entry, window);
        if (epoch !== this.epoch) {
          this.destroyTransitioningAdapter(adapter);
          return;
        }
        await adapter.play();
        if (epoch !== this.epoch) {
          this.destroyTransitioningAdapter(adapter);
          return;
        }
        if (this.transitioningAdapter !== adapter) return;
        this.transitioningAdapter = null;
        this.active = {
          adapter,
          classTrackId: entry.classTrackId,
          provider: selection.provider,
          // durationMs in the run-payload is already the effective clipped
          // length, so the window duration IS the clip length. Missing duration
          // ⇒ open-ended preview (manual/`finish` stop only).
          windowDurationMs: entry.track.durationMs ?? Number.POSITIVE_INFINITY,
        };
        this.setStatus({
          kind: 'playing',
          classTrackId: entry.classTrackId,
          provider: selection.provider,
        });
      } catch (cause) {
        this.destroyTransitioningAdapter(adapter);
        if (epoch !== this.epoch) return;
        this.fail({
          phase: 'prepare',
          provider: selection.provider,
          classTrackId: entry.classTrackId,
          message:
            cause instanceof Error ? cause.message : `Could not start "${entry.track.title}".`,
        });
      }
    } finally {
      this.transitions--;
    }
  }

  /**
   * Follow the host's preview clock. `previewElapsedMs` is measured from the
   * start of the current play, so preview stops once it reaches the clip-window
   * length. Cheap and idempotent; frames arriving mid-transition are skipped.
   */
  async tick(previewElapsedMs: number): Promise<void> {
    if (this.transitions > 0 || this.status.kind !== 'playing' || !this.active) return;
    if (previewElapsedMs < this.active.windowDurationMs) return;
    await this.endActive();
  }

  /** Pause provider audio; the host pauses its preview clock in the same gesture. */
  async pause(): Promise<void> {
    if (this.status.kind !== 'playing' || !this.active) return;
    const epoch = ++this.epoch;
    const { classTrackId, provider } = this.active;
    try {
      await this.active.adapter.pause();
    } catch {
      // Pausing a dying adapter is best-effort; the paused state stands.
    }
    // A stop/destroy/new-play that interleaved this await already moved us on;
    // don't overwrite its status with a stale `paused` (see runtime.enter's guard).
    if (epoch !== this.epoch) return;
    this.setStatus({ kind: 'paused', classTrackId, provider });
  }

  /** Resume the paused track from where the host clock left off (a user gesture). */
  async resume(): Promise<void> {
    if (this.status.kind !== 'paused' || !this.active) return;
    const epoch = ++this.epoch;
    const { classTrackId, provider } = this.active;
    try {
      await this.active.adapter.play();
      if (epoch !== this.epoch) return;
      this.setStatus({ kind: 'playing', classTrackId, provider });
    } catch (cause) {
      if (epoch !== this.epoch) return;
      this.fail({
        phase: 'adapter',
        provider,
        classTrackId,
        message: cause instanceof Error ? cause.message : 'Could not resume preview.',
      });
    }
  }

  /** Stop preview and release the adapter — back to idle. Safe to call repeatedly. */
  async stop(): Promise<void> {
    const epoch = ++this.epoch;
    this.destroyTransitioningAdapter();
    await this.releaseActive();
    if (epoch !== this.epoch) return;
    this.setStatus({ kind: 'idle' });
  }

  /** Synchronous teardown for unmount. */
  destroy(): void {
    this.epoch++;
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

  /** Stop + release the active job and settle into the ended state. */
  private async endActive(): Promise<void> {
    const job = this.active;
    if (!job) return;
    const epoch = ++this.epoch;
    await this.releaseActive();
    // If a new play() superseded us during the release await, it now owns the
    // status — writing `ended` here would clobber a live preview and, because
    // `tick` only fires while status is `playing`, leave it unable to stop.
    if (epoch !== this.epoch) return;
    this.setStatus({ kind: 'ended', classTrackId: job.classTrackId });
  }

  /** Stop + destroy the active adapter without letting its errors block us. */
  private async releaseActive(): Promise<void> {
    const job = this.active;
    if (!job) return;
    this.active = null;
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

  /**
   * Tear down an adapter that has been built but not yet promoted to `active`.
   * The identity check is essential: a canceled transition may settle after a
   * newer preview has already installed its own adapter.
   */
  private destroyTransitioningAdapter(adapter = this.transitioningAdapter): void {
    if (!adapter || this.transitioningAdapter !== adapter) return;
    this.transitioningAdapter = null;
    try {
      adapter.destroy();
    } catch {
      // Cancellation must still settle the controller even if teardown fails.
    }
  }

  private setStatus(status: PreviewStatus): void {
    this.status = status;
    this.options.onStatus?.(status);
  }

  /** Enter the error state: preview halts, the host offers retry/reconnect. */
  private fail(error: PreviewError): void {
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
