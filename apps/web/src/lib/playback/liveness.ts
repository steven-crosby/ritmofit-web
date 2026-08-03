/**
 * Playback liveness observation — instrumentation only, deliberately inert.
 *
 * Background: every adapter reports *finished* and *errored*; none reports
 * *stopped without being asked* or *stalled*. So a provider player can die
 * mid-class while the Live runtime keeps advancing the clock and keeps
 * rendering "♪ SoundCloud", and the instructor gets silence with no signal.
 * That is not hypothetical — `ritmofit_dev_plan/HISTORY.md` (2026-07-06)
 * records Apple Music stalling at `readyState 0` with zero errors logged, and a
 * human caught it, not the app. Full analysis:
 * `docs/audits/claude-design-audit-2026-07-24/playback-liveness-investigation.md`.
 *
 * **This module never acts on what it sees.** It does not call `fail()`, change
 * status, or render anything. The owner's decision (2026-08-02) was to
 * instrument first and decide about an alert separately, on the grounds that a
 * watchdog which fires wrongly interrupts a class that is playing fine — and
 * its thresholds cannot be tuned against the local mock seam. What this
 * produces is exactly the evidence that tuning needs: how often a healthy
 * provider looks momentarily stalled, and what a real death looks like beside
 * it.
 *
 * Reading nothing but provider-reported transport state through the official
 * SDK keeps this inside the music constraints (D13/D19) — the same channel as
 * play/pause/seek. No stream is cached, proxied, decoded, or analyzed.
 */
import type { Provider } from '@ritmofit/shared';
import type { LivenessReading } from './types.js';

/** How a single observation was classified. */
export type LivenessVerdict =
  /** The provider's playhead moved since the previous sample. Healthy. */
  | 'advancing'
  /**
   * The provider says it is playing, but its playhead has not moved. Buffering
   * looks exactly like this for a moment, which is precisely why a threshold
   * has to be tuned rather than guessed — one sample means nothing.
   */
  | 'not_advancing'
  /**
   * The provider says it is not playing, and we never asked it to stop. This is
   * the Spotify Connect case: the instructor's phone grabs the session, or they
   * press pause in another client, and we are told nothing.
   */
  | 'provider_paused'
  /**
   * The provider stopped answering entirely — the read timed out or threw. A
   * blanked SoundCloud widget iframe does this: no event, no error, no reply.
   */
  | 'unresponsive'
  /**
   * The host's rAF loop has not ticked since the previous sample, so the class
   * clock is not advancing either. Non-advancement here says nothing about the
   * provider — a backgrounded tab stalls both. Recorded separately so it can
   * never be miscounted as evidence of death.
   */
  | 'host_stalled'
  /** The adapter cannot answer (no SDK member for it). Exempt, not failing. */
  | 'exempt';

/** One observation, as stored in the buffer. */
export interface LivenessSample {
  /** Milliseconds since the observer started, from the injected clock. */
  atMs: number;
  provider: Provider;
  /** Index of the track in the class timeline this sample belongs to. */
  trackIndex: number;
  verdict: LivenessVerdict;
  /** Provider playhead, or null when it could not be read. */
  positionMs: number | null;
  /** How far the playhead moved since the previous sample of this track. */
  positionDeltaMs: number | null;
  /** The provider's own belief about whether it is playing. */
  playing: boolean | null;
  /** Host rAF ticks observed since the previous sample. Zero = host stalled. */
  hostTicks: number;
  /**
   * How many consecutive samples have now been non-advancing. Resets on any
   * advance. **This is the number a future watchdog threshold is tuned
   * against** — the question it answers is "how high does this go during
   * ordinary buffering on a real provider?"
   */
  consecutiveMisses: number;
}

/** Rolling counts, for a one-line answer to "was anything odd this class?" */
export interface LivenessSummary {
  samples: number;
  byVerdict: Record<LivenessVerdict, number>;
  /** The highest `consecutiveMisses` reached — the tuning headline. */
  peakConsecutiveMisses: number;
}

const CONSOLE_PREFIX = '[rf-liveness]';
/** ~41 minutes at the default interval; a ring, so the recent past is always kept. */
const DEFAULT_BUFFER_SIZE = 1000;

export interface LivenessObserverOptions {
  /** Injected clock so tests are deterministic. Defaults to `performance.now()`. */
  now?: () => number;
  /** Injected sink so tests can assert without spying on the console. */
  log?: (message: string, detail: Record<string, unknown>) => void;
  bufferSize?: number;
}

/**
 * Collects liveness samples and keeps the recent ones.
 *
 * Console policy: a sample every few seconds for a 45-minute class is a
 * thousand lines nobody reads, so the console gets **verdict transitions
 * only** — the moments something changed — while the buffer keeps every raw
 * sample for after the fact. Legible live, complete on inspection.
 */
export class LivenessObserver {
  private readonly buffer: LivenessSample[] = [];
  private readonly bufferSize: number;
  private readonly now: () => number;
  private readonly log: (message: string, detail: Record<string, unknown>) => void;
  private readonly startedAt: number;

  private lastVerdict: LivenessVerdict | null = null;
  private lastPositionMs: number | null = null;
  private lastTrackIndex: number | null = null;
  private consecutiveMisses = 0;
  private peakConsecutiveMisses = 0;

  constructor(options: LivenessObserverOptions = {}) {
    this.now = options.now ?? (() => performance.now());
    this.bufferSize = options.bufferSize ?? DEFAULT_BUFFER_SIZE;
    this.log =
      options.log ??
      ((message, detail) => {
        console.info(`${CONSOLE_PREFIX} ${message}`, detail);
      });
    this.startedAt = this.now();
  }

  /**
   * Record one observation. `reading` is what the adapter returned: a reading,
   * `null` when it cannot answer, or `'unresponsive'` when the read rejected.
   */
  record(input: {
    provider: Provider;
    trackIndex: number;
    reading: LivenessReading | null | 'unresponsive';
    hostTicks: number;
  }): LivenessSample {
    const { provider, trackIndex, reading, hostTicks } = input;
    // A new track resets the comparison basis — position is provider-relative,
    // so comparing across tracks would manufacture a bogus delta.
    if (this.lastTrackIndex !== trackIndex) {
      this.lastPositionMs = null;
      this.lastVerdict = null;
      this.consecutiveMisses = 0;
      this.lastTrackIndex = trackIndex;
    }

    const positionMs = reading && reading !== 'unresponsive' ? reading.positionMs : null;
    const playing = reading && reading !== 'unresponsive' ? reading.playing : null;
    const positionDeltaMs =
      positionMs !== null && this.lastPositionMs !== null ? positionMs - this.lastPositionMs : null;

    const verdict = this.classify({ reading, hostTicks, positionDeltaMs });

    // Only genuine provider non-advancement counts toward the threshold. A
    // stalled host or an exempt adapter must never inflate it.
    if (
      verdict === 'not_advancing' ||
      verdict === 'provider_paused' ||
      verdict === 'unresponsive'
    ) {
      this.consecutiveMisses += 1;
      this.peakConsecutiveMisses = Math.max(this.peakConsecutiveMisses, this.consecutiveMisses);
    } else if (verdict === 'advancing') {
      this.consecutiveMisses = 0;
    }

    const sample: LivenessSample = {
      atMs: Math.round(this.now() - this.startedAt),
      provider,
      trackIndex,
      verdict,
      positionMs,
      positionDeltaMs,
      playing,
      hostTicks,
      consecutiveMisses: this.consecutiveMisses,
    };

    this.buffer.push(sample);
    if (this.buffer.length > this.bufferSize) this.buffer.shift();

    if (verdict !== this.lastVerdict) {
      this.log(`${provider} track ${trackIndex}: ${this.lastVerdict ?? 'start'} → ${verdict}`, {
        ...sample,
      });
    }
    this.lastVerdict = verdict;
    if (positionMs !== null) this.lastPositionMs = positionMs;
    return sample;
  }

  /**
   * Order matters here, and each rung rules out a cheaper explanation than the
   * one below it: an adapter that cannot answer, then a provider that stopped
   * answering, then a host loop that stalled (which would make *any* provider
   * look frozen), then what the provider actually reports.
   */
  private classify(input: {
    reading: LivenessReading | null | 'unresponsive';
    hostTicks: number;
    positionDeltaMs: number | null;
  }): LivenessVerdict {
    const { reading, hostTicks, positionDeltaMs } = input;
    if (reading === null) return 'exempt';
    if (reading === 'unresponsive') return 'unresponsive';
    if (hostTicks === 0) return 'host_stalled';
    if (!reading.playing) return 'provider_paused';
    // No previous sample to compare against yet — not evidence of anything.
    if (positionDeltaMs === null) return 'advancing';
    return positionDeltaMs > 0 ? 'advancing' : 'not_advancing';
  }

  /** Every retained sample, oldest first. */
  samples(): readonly LivenessSample[] {
    return [...this.buffer];
  }

  summary(): LivenessSummary {
    const byVerdict = {
      advancing: 0,
      not_advancing: 0,
      provider_paused: 0,
      unresponsive: 0,
      host_stalled: 0,
      exempt: 0,
    } satisfies Record<LivenessVerdict, number>;
    for (const sample of this.buffer) byVerdict[sample.verdict] += 1;
    return {
      samples: this.buffer.length,
      byVerdict,
      peakConsecutiveMisses: this.peakConsecutiveMisses,
    };
  }
}

/** What `window.__rfLiveness` exposes. */
export interface LivenessInspector {
  samples(): readonly LivenessSample[];
  summary(): LivenessSummary;
}

declare global {
  interface Window {
    __rfLiveness?: LivenessInspector;
  }
}

/**
 * Publish an observer for inspection from the running page.
 *
 * The console alone is not enough for the case this exists to study: the
 * historical Apple Music stall happened in a *backgrounded* tab, which is
 * exactly when nobody has devtools open on it. After a class that felt wrong,
 * `__rfLiveness.summary()` answers "did the provider ever stop advancing?"
 * without needing to have been watching at the time.
 */
export function publishLivenessInspector(observer: LivenessObserver): void {
  if (typeof window === 'undefined') return;
  window.__rfLiveness = {
    samples: () => observer.samples(),
    summary: () => observer.summary(),
  };
}
