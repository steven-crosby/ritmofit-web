/**
 * M3 live mode — the cue prompter + player the instructor runs a class against,
 * consuming the hardened run-payload (one fetch). A preflight screen resolves
 * every track to a connected provider before start; the class then runs
 * hands-free with official provider-authorized playback (D19,
 * ritmofit_dev_plan/provider-playback-implementation.md) — or prompter-only via
 * "Run without music", the pre-playback behavior.
 *
 * A single virtual clock (`elapsedMs`) drives everything: which track is live,
 * the current/next cue, the countdowns, the intensity readout, AND provider
 * playback — the rAF loop ticks the RuntimePlaybackCoordinator, so Ritmo Studio's
 * class timeline stays the master and provider SDKs follow. Playback failure is
 * a serious recoverable alert (retry / handoff / continue without music), never
 * a silent skip; handoff links live only inside that recovery surface. Two
 * views: Cue-by-Cue (one big current cue + what's next) and Full List (the
 * whole timeline). Intensity is redundantly encoded (color + label + filled
 * bars) per the accessibility rules — never color alone.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import type {
  MusicConnectionView,
  RunPayload,
  RunPayloadTrackEntry,
  Intensity,
  SegmentType,
} from '@ritmofit/shared';
import { listConnections } from '../lib/api.js';
import { preflightPayload } from '../lib/playback/coordinator.js';
import { RuntimePlaybackCoordinator, type CoordinatorStatus } from '../lib/playback/runtime.js';
import { PLAYBACK_ADAPTERS, PLAYBACK_ADAPTER_PROVIDERS } from '../lib/playback/registry.js';
import { PROVIDER_ORDER, providerHandoffHref, providerLabel } from '../lib/providers.js';
import { useWakeLock, type WakeLockStatus } from '../lib/use-wake-lock.js';
import { ConnectionsDialog } from './ConnectionsDialog.js';
import { IntensityReadout } from './IntensityReadout.js';
import { IntensityRibbon } from './IntensityRibbon.js';
import { LivePreflight } from './LivePreflight.js';
import { LiveTimeline } from './LiveTimeline.js';
import { SEGMENT_META, SegmentIcon } from './SegmentBand.js';

type View = 'cue' | 'list';

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** A cue or move flattened onto the class-absolute timeline. */
export interface TimelineEvent {
  atMs: number; // absolute ms from class start
  kind: 'cue' | 'move';
  text: string;
  color: string | null;
  intensity: Intensity | null;
}

/** Stable empty reference so a track-less / pre-roll frame doesn't churn memos. */
const NO_EVENTS: TimelineEvent[] = [];

/**
 * Provider handoff links — recovery-surface only (plan: "not a primary or
 * casual fallback"). Rendered inside the playback-failure alert for rare
 * browser/session issues (stale provider auth, SDK load failure), never on the
 * normal prompter surfaces.
 */
function ProviderHandoffLinks({ entry }: { entry: RunPayloadTrackEntry }) {
  const refs = PROVIDER_ORDER.flatMap((provider) => {
    const ref = entry.providerRefs.find((candidate) => candidate.provider === provider);
    const href = providerHandoffHref(provider, ref?.providerUri ?? null);
    return href ? [{ provider, href }] : [];
  });
  if (refs.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label={`Open ${entry.track.title} in a music provider`}
    >
      {refs.map(({ provider, href }) => (
        <a
          key={provider}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${entry.track.title} in ${providerLabel(provider)}`}
          className="inline-flex min-h-11 items-center rounded-pill border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
        >
          Open in {providerLabel(provider)}
        </a>
      ))}
    </nav>
  );
}

/**
 * Index of the live track for a class-absolute time: the last track whose start
 * offset has been reached, or `0` before the first track's offset. Returns `-1`
 * only for an empty class. A primitive index (not a fresh object) so frame-rate
 * memos that depend on "which track" don't invalidate while the index is stable.
 */
export function trackIndexAt(payload: RunPayload, elapsedMs: number): number {
  if (payload.tracks.length === 0) return -1;
  let current = 0;
  payload.tracks.forEach((t, i) => {
    if ((t.startOffsetMs ?? 0) <= elapsedMs) current = i;
  });
  return current;
}

/**
 * Index of the last event at or before `t` (or `-1`), via binary search over the
 * `atMs`-sorted list. With ties it returns the last of the equal run, matching the
 * prior backward linear scan. The next event is simply the following index.
 */
export function lastAtOrBefore(events: TimelineEvent[], t: number): number {
  let lo = 0;
  let hi = events.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid]!.atMs <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/** All cues + moves of a track as class-absolute events, time-ordered. */
function eventsFor(entry: RunPayloadTrackEntry): TimelineEvent[] {
  const base = entry.startOffsetMs ?? 0;
  const cues: TimelineEvent[] = entry.cues.map((c) => ({
    atMs: base + c.anchorMs,
    kind: 'cue',
    text: c.text,
    color: c.color,
    intensity: null,
  }));
  const moves: TimelineEvent[] = entry.moves.map((m) => ({
    atMs: base + m.anchorMs,
    kind: 'move',
    text: m.name,
    color: null,
    intensity: m.intensity,
  }));
  return [...cues, ...moves].sort((a, b) => a.atMs - b.atMs);
}

/** The active section + the one after it, for the live energy-arc indicator. */
export interface LiveSection {
  type: SegmentType;
  /** The next section ahead (null when the current one runs to the class end). */
  next: { type: SegmentType; inMs: number } | null;
}

/**
 * The section band active at a class-absolute time: the last section whose start
 * has been reached, or `null` before the first section (a leading gap with no
 * band) or when the class has no sections. Defensively sorts by `startOffsetMs`
 * so an unordered payload still resolves correctly.
 */
export function liveSectionAt(
  sections: RunPayload['sections'],
  elapsedMs: number,
): LiveSection | null {
  if (sections.length === 0) return null;
  const sorted = [...sections].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
  let idx = -1;
  sorted.forEach((s, i) => {
    if (s.startOffsetMs <= elapsedMs) idx = i;
  });
  if (idx < 0) return null; // before the first section
  const upcoming = sorted[idx + 1];
  return {
    type: sorted[idx]!.type,
    next: upcoming ? { type: upcoming.type, inMs: upcoming.startOffsetMs - elapsedMs } : null,
  };
}

/**
 * The compact live energy-arc indicator: a slim, full-width band under the header
 * naming the current section (icon + tint + label, never color alone) and, when a
 * later section is ahead, a muted countdown to it. View-independent (shows in both
 * Cue-by-Cue and Full List) so the instructor always knows where they are in the
 * arc. Static — no motion to gate under reduced-motion.
 */
function LiveSectionBar({ section }: { section: LiveSection }) {
  const meta = SEGMENT_META[section.type];
  // Accessible name comes from real text in reading order (sr-only framing + the
  // visible label/countdown), not a container `aria-label` — a name-replacing label
  // on this text-bearing element would mask the countdown from AT. Matches the
  // IntensityReadout pattern: icon decorative (aria-hidden), text carries meaning.
  return (
    <div className="flex items-center justify-between gap-3 border-b border-interactive/15 px-6 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden style={{ color: meta.tint }}>
          <SegmentIcon type={section.type} />
        </span>
        <span className="truncate font-ui text-sm font-semibold text-text-secondary">
          <span className="sr-only">Current section: </span>
          {meta.label}
        </span>
      </span>
      {section.next && (
        <span className="shrink-0 font-data text-xs text-text-tertiary">
          <span className="sr-only">Next: </span>
          {SEGMENT_META[section.next.type].label} in {fmt(section.next.inMs)}
        </span>
      )}
    </div>
  );
}

export function LiveMode({ payload, onExit }: { payload: RunPayload; onExit: () => void }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<View>('cue');
  // Preflight gates class start (plan: "preflight every track before class
  // start"). An empty class has nothing to preflight — straight to the prompter.
  const [phase, setPhase] = useState<'preflight' | 'live'>(
    payload.tracks.length === 0 ? 'live' : 'preflight',
  );
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  // Connection truth can change inside the recovery dialog. Re-enter the unknown
  // state for every refresh so preflight fails closed, and accept only the newest
  // completion so a late request cannot restore stale playback readiness.
  const connectionsRequestId = useRef(0);
  const [playback, setPlayback] = useState<CoordinatorStatus>({ kind: 'idle' });
  // Null = prompter-only (no music started, or the instructor bailed out of a
  // playback failure). The coordinator is imperative on purpose: the rAF clock
  // drives it, and React state only mirrors its status for display.
  const coordinatorRef = useRef<RuntimePlaybackCoordinator | null>(null);
  // Focus targets for the full-screen takeover (see the focus effects below): the
  // preflight class-title heading, and the transport's primary Play/Pause control.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  const refreshConnections = useCallback(async () => {
    const requestId = ++connectionsRequestId.current;
    setConnections(null);
    setConnectionsError(null);
    try {
      const rows = await listConnections();
      if (requestId !== connectionsRequestId.current) return;
      setConnections(rows);
    } catch (e) {
      if (requestId !== connectionsRequestId.current) return;
      setConnectionsError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refreshConnections();
    return () => {
      // Prevent both success and failure writes after unmount (and invalidate the
      // first request during React Strict Mode's setup/cleanup replay).
      connectionsRequestId.current += 1;
    };
  }, [refreshConnections]);
  // Release the provider SDK/widget when the instructor exits Live Mode.
  useEffect(
    () => () => {
      coordinatorRef.current?.destroy();
    },
    [],
  );

  // Focus management for the full-screen takeover. LiveMode replaces the dashboard
  // (Dashboard unmounts behind it), so the control that opened it — and the preflight
  // Start/Run button the instructor activates — are gone, and focus would otherwise
  // fall to <body>. Nothing renders behind, so this is focus *placement*, not a trap:
  // land the instructor somewhere named on entry, then on their next control the
  // moment the class goes live. Follow-up, intentionally out of scope here (parent's
  // job): Dashboard's onExit/setLive(null) should restore focus to the control that
  // opened Live Mode.

  // On entry, focus the class-title heading so keyboard/SR users land on a named
  // element rather than <body>. Gated on the mount-time phase so the empty-class path
  // (which starts in 'live') never fires this and races the transport effect below.
  // Mount-only: the initial phase is read once at entry; the 'live' transition is
  // owned by the effect below, keyed on phase.
  useEffect(() => {
    if (phase === 'preflight') headingRef.current?.focus();
  }, []);

  // When the class goes live — Start class, Run without music, or an empty class that
  // skips preflight straight to 'live' — move focus to the transport's primary control
  // (Play/Pause), the instructor's next action, instead of stranding it on <body>
  // after the preflight button unmounts.
  useEffect(() => {
    if (phase === 'live') primaryButtonRef.current?.focus();
  }, [phase]);

  // Static preflight against the providers the player can actually drive.
  const preflight = useMemo(
    () =>
      connections
        ? preflightPayload(payload, connections, {
            now: Date.now(),
            availableProviders: PLAYBACK_ADAPTER_PROVIDERS,
          })
        : null,
    [connections, payload],
  );

  // Virtual clock: accumulate real time only while playing, via rAF.
  const baseRef = useRef(0); // elapsed banked before the current play segment
  const startRef = useRef(0); // performance.now() when the segment began
  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const live = baseRef.current + (performance.now() - startRef.current);
      const capped = Math.min(live, payload.class.totalDurationMs);
      setElapsedMs(capped);
      // The class clock is master: each frame lets the playback coordinator
      // follow it (auto-advance, gap silence, end). Fire-and-forget — a frame
      // is a poll, and the coordinator absorbs overlapping ticks itself.
      void coordinatorRef.current?.tick(capped);
      if (capped >= payload.class.totalDurationMs) {
        baseRef.current = payload.class.totalDurationMs;
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      baseRef.current += performance.now() - startRef.current;
      cancelAnimationFrame(raf);
    };
  }, [playing, payload.class.totalDurationMs]);

  // Keep the studio screen awake while the class is running, and surface whether
  // it's actually holding so the instructor isn't guessing (the transport chip).
  const wakeStatus = useWakeLock(playing);

  const seek = (ms: number) => {
    const clamped = Math.max(0, Math.min(ms, payload.class.totalDurationMs));
    baseRef.current = clamped;
    // Rebase the running segment to *now*, or a seek while playing would re-add the
    // time already elapsed since play started (jumping the clock forward).
    startRef.current = performance.now();
    setElapsedMs(clamped);
    // Re-cue provider playback at the new position (no-op while paused — the
    // next resume enters at the clock position anyway).
    void coordinatorRef.current?.seek(clamped);
  };

  /** Start hands-free: build the coordinator and begin playback at 0 (a user gesture). */
  const startClass = () => {
    const coordinator = new RuntimePlaybackCoordinator(payload, connections ?? [], {
      now: Date.now(),
      adapters: PLAYBACK_ADAPTERS,
      availableProviders: PLAYBACK_ADAPTER_PROVIDERS,
      onStatus: setPlayback,
    });
    coordinatorRef.current = coordinator;
    setPhase('live');
    setPlaying(true);
    void coordinator.start(0);
  };

  const togglePlay = () => {
    const next = !playing;
    const coordinator = coordinatorRef.current;
    if (coordinator) {
      if (next) void coordinator.resume(elapsedMs);
      else void coordinator.pause();
    }
    setPlaying(next);
  };

  /** Retry from a playback failure: re-enter the segment at the clock position. */
  const retryPlayback = () => {
    if (!playing) setPlaying(true);
    void coordinatorRef.current?.resume(elapsedMs);
  };

  /** Abandon playback but keep the class running (prompter + timers stay live). */
  const continueWithoutMusic = () => {
    coordinatorRef.current?.destroy();
    coordinatorRef.current = null;
    setPlayback({ kind: 'idle' });
  };

  // Flatten + sort each track's cues/moves once per payload, not on every animation
  // frame. The frame-rate clock only changes *which* index we read, never these arrays.
  const eventsByTrack = useMemo(() => payload.tracks.map(eventsFor), [payload]);
  const liveIndex = useMemo(() => trackIndexAt(payload, elapsedMs), [payload, elapsedMs]);
  const live = useMemo(
    () => (liveIndex >= 0 ? { entry: payload.tracks[liveIndex]!, index: liveIndex } : null),
    [payload, liveIndex],
  );
  const events = liveIndex >= 0 ? eventsByTrack[liveIndex]! : NO_EVENTS;
  // One binary search over the stable, pre-sorted array yields both current and next.
  const { currentEvent, nextEvent } = useMemo(() => {
    const i = lastAtOrBefore(events, elapsedMs);
    return {
      currentEvent: i >= 0 ? events[i]! : null,
      nextEvent: i + 1 < events.length ? events[i + 1]! : null,
    };
  }, [events, elapsedMs]);

  // A track with no entered duration occupies zero timeline width, so a per-track
  // countdown would read a misleading 0:00. Track whether we have a real window.
  const trackDurationMs = live ? live.entry.track.durationMs : null;
  const liveStartMs = live ? (live.entry.startOffsetMs ?? 0) : 0;
  const trackEndMs = liveStartMs + (trackDurationMs ?? 0);

  // Free-mode gaps: we're in silence either before the live track starts (leading
  // gap) or after it ends with a later track still ahead. trackIndexAt returns the
  // surrounding track in both cases, so derive the gap from its window.
  const nextEntry =
    liveIndex >= 0 && liveIndex + 1 < payload.tracks.length ? payload.tracks[liveIndex + 1] : null;
  const nextStartMs = nextEntry ? (nextEntry.startOffsetMs ?? 0) : null;
  const beforeLive = live != null && elapsedMs < liveStartMs;
  const afterLive = live != null && trackDurationMs != null && elapsedMs >= trackEndMs;
  const inGap = beforeLive || (afterLive && nextStartMs != null && elapsedMs < nextStartMs);
  const gap = inGap
    ? {
        untilMs: beforeLive ? liveStartMs : (nextStartMs ?? 0),
        nextTitle: beforeLive
          ? (live?.entry.track.title ?? null)
          : (nextEntry?.track.title ?? null),
      }
    : null;

  // Screen-reader announcement of the focal state. Built from stable values (cue
  // text, gap, end) — never the per-frame countdown — so it speaks once per change
  // rather than continuously. The live region below re-announces only when this
  // string actually changes.
  const section = useMemo(
    () => liveSectionAt(payload.sections, elapsedMs),
    [payload.sections, elapsedMs],
  );

  const ended = payload.class.totalDurationMs > 0 && elapsedMs >= payload.class.totalDurationMs;
  let announcement = '';
  if (payload.tracks.length === 0) {
    announcement = '';
  } else if (ended) {
    announcement = 'Class complete.';
  } else if (gap) {
    announcement = gap.nextTitle ? `Silence. Next track: ${gap.nextTitle}.` : 'Silence.';
  } else if (currentEvent) {
    announcement = `${currentEvent.kind === 'move' ? 'Move' : 'Cue'}: ${currentEvent.text}.`;
  } else if (live) {
    announcement = `Track ${live.index + 1}: ${live.entry.track.title}.`;
  }

  // Section/energy-arc transitions get their own *polite* region, separate from
  // the assertive cue stream above: a Climb→Sprint change is context, not a cue,
  // and must never interrupt the cue the instructor is acting on. The text is
  // derived only from the section type, so the DOM string changes solely at a
  // boundary — which is exactly when a live region re-announces. On-change only,
  // no per-frame churn. (The visible LiveSectionBar is not itself a live region.)
  const sectionAnnouncement = section ? `${SEGMENT_META[section.type].label} section.` : '';

  // Identity of the focal announcement — advances once per cue/track/gap/end change,
  // never per frame. It mirrors the `announcement` branches above but discriminates a
  // cue by its class-absolute time (`atMs`), not its text: two consecutive cues that
  // read verbatim the same ("Push!" → "Push!") share the same string yet have distinct
  // atMs, so the key still advances. That's what drives the ping-pong below to
  // re-announce a repeated cue. Per-frame elapsedMs never enters the key, so the
  // on-change-only discipline holds — no announcing on unrelated re-renders.
  const announcementKey =
    payload.tracks.length === 0
      ? ''
      : ended
        ? 'ended'
        : gap
          ? `gap:${gap.nextTitle ?? ''}`
          : currentEvent
            ? `cue:${liveIndex}:${currentEvent.kind}:${currentEvent.atMs}`
            : live
              ? `track:${live.index}`
              : '';

  // Assertive live-region ping-pong. An aria-live region only re-announces when its
  // text content *changes*, so a single region stays silent when a cue repeats
  // verbatim. Instead we keep two persistent assertive regions and, on each identity
  // change, write the cue into the toggled slot while clearing the other: the target
  // goes '' → text, a real mutation the screen reader always speaks, even when the
  // words are identical. (This is the react-aria LiveAnnouncer technique; it relies on
  // the cleared region being silent, which mainstream SRs are for empty content.)
  const [announced, setAnnounced] = useState<{ text: string; slot: 0 | 1 }>({
    text: '',
    slot: 0,
  });
  useEffect(() => {
    // At-rest / empty class: nothing to say. Early-return keeps both slots empty and
    // silent rather than announcing a blank string.
    if (!announcement) return;
    setAnnounced((prev) => ({ text: announcement, slot: prev.slot === 0 ? 1 : 0 }));
    // Keyed on identity, not text: the effect fires once per focal change (including a
    // repeated-text cue), never per animation frame. `announcement` is read fresh here —
    // it changes in lockstep with the key, so the closure is never stale.
  }, [announcementKey]);

  // Live runs on bg-live (ink-950, darker than bg-base) for maximum AAA contrast
  // in a dim studio — and stays dark in both themes (02/04-layout).
  if (phase === 'preflight') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-live">
        <header className="flex items-center justify-between border-b border-interactive/20 px-6 py-3">
          {/* Scripted focus target on entry (tabIndex -1, not keyboard-reachable);
              outline suppressed so a mouse entry never shows a stray ring. */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-lg font-semibold text-text-primary focus:outline-none"
          >
            {payload.class.title}
          </h1>
          <button
            className="rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive"
            onClick={onExit}
          >
            Exit
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          <LivePreflight
            preflight={preflight}
            connectionsError={connectionsError}
            onRetryConnections={() => void refreshConnections()}
            onManageConnections={() => setConnectionsOpen(true)}
            onStart={startClass}
            onRunWithoutMusic={() => setPhase('live')}
          />
        </div>
        {connectionsOpen && (
          <ConnectionsDialog
            onClose={() => setConnectionsOpen(false)}
            onConnectionsChanged={() => void refreshConnections()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-live">
      {/* The advancing cue, spoken for screen readers — the prompter's core function.
          Visually hidden; the Cue-by-Cue card carries the same content on screen. Two
          assertive regions ping-pong (see `announced` above): the cue is written to one
          and the other cleared, so a verbatim-repeated cue still re-announces (a single
          region would stay unchanged and stay silent). Only one slot holds text at a
          time; the empty one is silent. */}
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {announced.slot === 0 ? announced.text : ''}
      </p>
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {announced.slot === 1 ? announced.text : ''}
      </p>
      {/* Section/energy-arc transitions, announced politely so they don't cut off
          the cue above. The visible band (LiveSectionBar) carries this on screen. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {sectionAnnouncement}
      </p>
      <header className="flex items-center justify-between border-b border-interactive/20 px-6 py-3">
        <div>
          <h1 className="font-display text-lg font-semibold text-text-primary">
            {payload.class.title}
          </h1>
          <p className="font-data text-xs text-text-tertiary">
            {fmt(elapsedMs)} / {fmt(payload.class.totalDurationMs)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} setView={setView} />
          <button
            className="rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive"
            onClick={onExit}
          >
            Exit
          </button>
        </div>
      </header>

      {section && <LiveSectionBar section={section} />}

      <div className="min-h-0 flex-1 overflow-auto">
        {view === 'cue' ? (
          <CueByCue
            payload={payload}
            live={live}
            currentEvent={currentEvent}
            nextEvent={nextEvent}
            elapsedMs={elapsedMs}
            trackEndMs={trackEndMs}
            trackHasDuration={trackDurationMs != null}
            classTotalMs={payload.class.totalDurationMs}
            playing={playing}
            gap={gap}
          />
        ) : (
          <FullList
            payload={payload}
            eventsByTrack={eventsByTrack}
            liveIndex={liveIndex}
            elapsedMs={elapsedMs}
            onSeek={seek}
          />
        )}
      </div>

      {/* Playback failure — serious and recoverable (plan): the class clock and
          prompter keep running while the instructor retries, hands off to the
          provider app (recovery-only surface), or continues without music. */}
      {playback.kind === 'error' && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-state-danger/40 bg-bg-raised px-6 py-3"
        >
          <p className="font-ui text-sm font-semibold text-text-primary">
            <span aria-hidden className="mr-1.5 text-state-danger">
              ⚠
            </span>
            Playback stopped: {playback.error.message}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="min-h-11 rounded-pill rf-btn-primary px-4 py-2 font-ui text-sm font-semibold text-text-on-accent"
              onClick={retryPlayback}
            >
              Retry
            </button>
            <button
              className="min-h-11 rounded-pill border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
              onClick={continueWithoutMusic}
            >
              Continue without music
            </button>
            {live && <ProviderHandoffLinks entry={live.entry} />}
          </div>
        </div>
      )}

      <Transport
        playing={playing}
        onToggle={togglePlay}
        onReset={() => {
          setPlaying(false);
          void coordinatorRef.current?.pause();
          seek(0);
        }}
        payload={payload}
        elapsedMs={elapsedMs}
        onSeek={seek}
        playback={coordinatorRef.current ? playback : null}
        wakeStatus={wakeStatus}
        primaryButtonRef={primaryButtonRef}
      />
    </div>
  );
}

/**
 * The player rail chip: an always-explicit statement of what the music is
 * doing (glyph + label, never color alone). `status` is null in prompter-only
 * mode, which is itself stated — silence must be legible as a choice, not a
 * mystery, to an instructor mid-class.
 */
function PlaybackRail({ status }: { status: CoordinatorStatus | null }) {
  let text: string;
  if (status == null) {
    text = 'Music off';
  } else {
    switch (status.kind) {
      case 'preparing':
        text = `Preparing ${providerLabel(status.provider)}…`;
        break;
      case 'awaiting_authorization':
        text = `Waiting for ${providerLabel(status.provider)} authorization…`;
        break;
      case 'playing':
        text = providerLabel(status.provider);
        break;
      case 'silence':
        text = 'Silence';
        break;
      case 'paused':
        text = 'Paused';
        break;
      case 'ended':
        text = 'Playback ended';
        break;
      case 'error':
        text = 'Playback error';
        break;
      default:
        text = 'Music ready';
    }
  }
  const isError = status?.kind === 'error';
  const isWaiting = status?.kind === 'awaiting_authorization';
  return (
    <p
      className={`flex shrink-0 items-center gap-1.5 font-data text-xs ${
        isError ? 'font-semibold text-state-danger' : 'text-text-tertiary'
      }`}
    >
      <span aria-hidden>{isError ? '⚠' : isWaiting ? '⏳' : '♪'}</span>
      <span className="sr-only">Playback: </span>
      {text}
    </p>
  );
}

/**
 * Whether the screen is being kept awake — a glyph + label chip (never color
 * alone, 05/07) beside the player rail, so the instructor knows the studio
 * display won't dim mid-class. A polite live region announces the state, and a
 * transition to caution, once per change. Hidden at rest (`idle`): the wake lock
 * is only promised while the class runs, so there's nothing to state when
 * paused. Static — no motion to gate under reduced-motion.
 */
function WakeRail({ status }: { status: WakeLockStatus }) {
  if (status === 'idle') return null;
  const awake = status === 'awake';
  return (
    <p
      role="status"
      className={`flex shrink-0 items-center gap-1.5 font-data text-xs ${
        awake ? 'text-text-tertiary' : 'text-state-caution'
      }`}
    >
      <span aria-hidden>{awake ? '◉' : '⊘'}</span>
      <span className="sr-only">Display: </span>
      {awake ? 'Screen awake' : 'Screen may dim'}
    </p>
  );
}

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div
      className="flex rounded-pill border border-interactive/30 p-0.5"
      role="tablist"
      aria-label="Prompter view"
    >
      {(['cue', 'list'] as const).map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={view === v}
          onClick={() => setView(v)}
          className={`rounded-pill px-3 py-1 font-ui text-sm ${
            view === v ? 'bg-interactive text-text-on-accent' : 'text-text-secondary'
          }`}
        >
          {v === 'cue' ? 'Cue-by-Cue' : 'Full List'}
        </button>
      ))}
    </div>
  );
}

/**
 * The focal card's vitals footer: current effort + the tempo rendered as the
 * `data-hero` numeral (design system 03 §data-hero — 88px Azeret Mono, the
 * "screenshot" of the instrument). Pairing it with the cue makes the class's
 * energy state a single glanceable object rather than a card buried in a side
 * rail. The BPM readout carries the one on-beat pulse the rhythm system allows
 * (10 §1–2) — a single focal heartbeat while playing, needing a BPM to time the
 * beat and removed under reduced motion by CSS, so the giant cue stays steady.
 * A missing tempo is a readiness state stated on the caution channel, never
 * quiet metadata (audit P0 #3; rhythm-system §1a).
 */
function FocalVitals({ entry, playing }: { entry: RunPayloadTrackEntry; playing: boolean }) {
  const pulse = playing && entry.displayBpm != null;
  return (
    <div className="relative mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-interactive/10 pt-4">
      <div className="flex flex-col gap-1.5">
        <span className="font-data text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
          Effort
        </span>
        <IntensityReadout intensity={entry.intensity} />
      </div>
      {entry.displayBpm != null ? (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          {/* data-hero tempo: 88px (5.5rem) Azeret Mono, tracking -0.04em, weight 700. */}
          <p
            className={`flex items-baseline ${pulse ? 'rf-beat-pulse' : ''}`}
            style={pulse ? ({ '--rf-bpm': entry.displayBpm } as CSSProperties) : undefined}
          >
            <span className="font-data text-[clamp(3rem,8vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.04em] text-text-primary">
              {entry.displayBpm}
            </span>
            <span className="ml-2 font-data text-sm uppercase tracking-wide text-text-tertiary">
              BPM
            </span>
          </p>
          {entry.displayRpm != null && (
            <p className="flex items-baseline gap-1.5">
              <span className="font-data text-2xl font-semibold text-text-secondary">
                {entry.displayRpm}
              </span>
              <span className="font-data text-xs uppercase text-text-tertiary">RPM</span>
            </p>
          )}
          {entry.holdCount != null && (
            <p className="flex items-baseline gap-1.5">
              <span className="font-data text-2xl font-semibold text-text-secondary">
                {entry.holdCount}
              </span>
              <span className="font-data text-xs uppercase text-text-tertiary">
                {entry.holdCount === 1 ? 'Hold' : 'Holds'}
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="flex flex-col gap-0.5 text-right">
          <span className="font-data text-2xl font-semibold text-state-caution">Tempo missing</span>
          <span className="font-ui text-xs text-text-tertiary">Pulse off</span>
        </p>
      )}
    </div>
  );
}

function CueByCue({
  payload,
  live,
  currentEvent,
  nextEvent,
  elapsedMs,
  trackEndMs,
  trackHasDuration,
  classTotalMs,
  playing,
  gap,
}: {
  payload: RunPayload;
  live: { entry: RunPayloadTrackEntry; index: number } | null;
  currentEvent: TimelineEvent | null;
  nextEvent: TimelineEvent | null;
  elapsedMs: number;
  trackEndMs: number;
  trackHasDuration: boolean;
  classTotalMs: number;
  playing: boolean;
  /** Free-mode silence between tracks: a countdown to the next track. */
  gap: { untilMs: number; nextTitle: string | null } | null;
}) {
  if (!live) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <p className="font-ui text-text-tertiary">This class has no tracks yet.</p>
      </div>
    );
  }
  if (gap) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center sm:p-10">
        <div className="flex flex-col items-center gap-2">
          <p className="font-data text-[11px] uppercase tracking-[0.22em] text-text-tertiary">
            Silence
          </p>
          <p className="font-display text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[0.95] text-text-secondary">
            No track playing
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3">
          <div className="rounded-card bg-bg-raised p-5 shadow-card">
            <p className="font-data text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              Next track
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate font-display text-lg font-semibold text-text-primary">
                {gap.nextTitle ?? '—'}
              </p>
              <span
                className="shrink-0 font-data text-3xl text-interactive"
                aria-label="Time to next track"
              >
                {fmt(gap.untilMs - elapsedMs)}
              </span>
            </div>
          </div>
          <p className="font-data text-sm text-text-tertiary">
            Class ends in {fmt(classTotalMs - elapsedMs)}
          </p>
        </div>
      </div>
    );
  }
  const { entry } = live;
  // "The drop" (design system 10 §5): the one big motion spend, rationed to All-Out
  // tracks. On each cue advance there, a plasma glow blooms behind the focal cue and
  // the cue text cross-fades in. Reduced motion degrades both to an instant swap (CSS).
  const isAllOut = entry.intensity === 'all_out';
  // At rest before playback begins (a paused mid-class has elapsed > 0) with no cue
  // at this instant: lead with the affirmative ready state + a class-shape mini-map
  // instead of "No cue set" (alive at rest, design system 05 §Live). Once playing —
  // or paused mid-class — the normal cue / no-cue prompter takes over.
  const showReadyHero = !playing && elapsedMs === 0 && currentEvent == null;
  return (
    <div className="flex min-h-full flex-col gap-4 p-4 sm:p-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:p-8">
      {/* LEFT — the focal cue: the one thing the instructor reads across the room.
          Carries the All-Out drop; otherwise it holds still so it's always legible. */}
      <div className="relative flex min-h-[42vh] flex-col overflow-hidden rounded-card bg-bg-raised p-6 shadow-card sm:p-8 lg:col-span-3 lg:min-h-0">
        {/* The drop's plasma bloom — keyed on the cue so it replays per advance. */}
        {isAllOut && currentEvent && (
          <span
            key={currentEvent.text}
            aria-hidden
            className="rf-drop-bloom pointer-events-none absolute inset-0 rounded-card"
          />
        )}
        {/* The cue itself holds the center; the vitals footer pins to the bottom so
            the tempo numeral and the cue read as one state-object. */}
        <div className="relative flex flex-1 flex-col justify-center">
          <p className="font-data text-[11px] uppercase tracking-[0.22em] text-text-tertiary">
            {showReadyHero ? 'Ready' : 'Now'}
          </p>
          {currentEvent ? (
            <>
              <p
                key={currentEvent.text}
                className={`relative mt-3 break-words font-display text-[clamp(2.75rem,7vw,6rem)] font-semibold leading-[0.95] text-text-primary ${
                  isAllOut ? 'rf-drop-in' : ''
                }`}
                style={currentEvent.color ? { color: currentEvent.color } : undefined}
              >
                {currentEvent.text}
              </p>
              {currentEvent.kind === 'move' && currentEvent.intensity && (
                <div className="relative mt-5">
                  <IntensityReadout intensity={currentEvent.intensity} />
                </div>
              )}
            </>
          ) : showReadyHero ? (
            // Live at rest leads with the affirmative ready state, never absence
            // (design system 01 §3, 05 §Live: "'Ready — press play' beats 'No cue set'").
            // The next cue + BPM sit in the rail; the class-shape mini-map shows the arc.
            <>
              <p className="relative mt-3 font-display text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[0.95] text-text-primary">
                Press play to start
              </p>
              <p className="relative mt-4 flex min-w-0 items-baseline gap-2">
                <span aria-hidden className="shrink-0 font-data text-base text-text-tertiary">
                  ♫
                </span>
                <span className="truncate font-display text-[clamp(1.5rem,3.5vw,2.5rem)] font-semibold text-text-primary">
                  {entry.track.title}
                </span>
              </p>
              {/* Class-shape mini-map: the whole arc, visible before the first beat.
                Reuses the builder ribbon (and its provisional "auto shape" when unshaped). */}
              <div className="relative mt-6">
                <IntensityRibbon payload={payload} />
              </div>
            </>
          ) : (
            // No cue at this moment: never a bare dash. Name the state, then what's
            // playing, so the focal card stays meaningful across a dim room (audit P0
            // #3; prescription §8 "No cue set + current track"). Mirrors the assertive
            // screen-reader announcement, which already falls back to the track.
            <>
              <p className="relative mt-3 font-display text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[0.95] text-text-secondary">
                No cue set
              </p>
              <p className="relative mt-4 flex min-w-0 items-baseline gap-2">
                <span aria-hidden className="shrink-0 font-data text-base text-text-tertiary">
                  ♫
                </span>
                <span className="truncate font-display text-[clamp(1.5rem,3.5vw,2.5rem)] font-semibold text-text-primary">
                  {entry.track.title}
                </span>
              </p>
            </>
          )}
        </div>
        {/* Vitals footer — current effort + the tempo as the data-hero screenshot
            numeral, paired with the cue instead of buried in a side rail. */}
        <FocalVitals entry={entry} playing={playing} />
      </div>

      {/* RIGHT — the instrument rail: what's next, the timers, the track. */}
      <div className="flex min-w-0 flex-col gap-3 lg:col-span-2 lg:gap-4">
        {/* Next cue + countdown. */}
        <div className="rounded-card bg-bg-raised p-4 shadow-card sm:p-5">
          <p className="font-data text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            Next
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="min-w-0 font-display text-xl font-semibold text-text-primary">
              {nextEvent ? nextEvent.text : 'End of track'}
            </p>
            {nextEvent && (
              <span
                className="shrink-0 font-data text-3xl text-interactive"
                aria-label="Time to next cue"
              >
                {fmt(nextEvent.atMs - elapsedMs)}
              </span>
            )}
          </div>
        </div>

        {/* Timers — track + class countdowns, the performance's running clock. */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card bg-bg-raised p-4 shadow-card">
            <p className="font-data text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              Track left
            </p>
            <p className="mt-1 font-data text-2xl text-text-primary">
              {trackHasDuration ? fmt(trackEndMs - elapsedMs) : '—'}
            </p>
            {!trackHasDuration && (
              <p className="mt-0.5 font-ui text-xs text-text-tertiary">No duration set</p>
            )}
          </div>
          <div className="rounded-card bg-bg-raised p-4 shadow-card">
            <p className="font-data text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              Class left
            </p>
            <p className="mt-1 font-data text-2xl text-text-primary">
              {fmt(classTotalMs - elapsedMs)}
            </p>
          </div>
        </div>

        {/* Track identity (+ any instructor notes). Provider handoff links left
            this card for the playback-failure recovery surface (D19). */}
        <div className="rounded-card bg-bg-raised p-4 shadow-card sm:p-5">
          <p className="font-data text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            Track {live.index + 1}
          </p>
          <p className="mt-1 truncate font-display text-lg font-semibold text-text-primary">
            {entry.track.title}
          </p>
          <p className="truncate font-ui text-sm text-text-secondary">{entry.track.artist}</p>
          {entry.notes && (
            <div className="mt-3 border-t border-interactive/15 pt-3">
              <p className="font-data text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap font-ui text-sm text-text-secondary">
                {entry.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FullList({
  payload,
  eventsByTrack,
  liveIndex,
  elapsedMs,
  onSeek,
}: {
  payload: RunPayload;
  eventsByTrack: TimelineEvent[][];
  liveIndex: number;
  elapsedMs: number;
  onSeek: (ms: number) => void;
}) {
  return (
    <ol className="mx-auto flex max-w-2xl flex-col gap-3 p-6">
      {payload.tracks.map((t, i) => {
        const start = t.startOffsetMs ?? 0;
        const isLive = i === liveIndex;
        return (
          <li
            key={t.classTrackId}
            className={`rounded-card bg-bg-raised p-4 shadow-card ${isLive ? 'ring-2 ring-interactive' : ''}`}
          >
            <div className="flex items-center justify-between">
              <button
                className="text-left"
                onClick={() => onSeek(start)}
                aria-label={`Jump to track ${i + 1}`}
              >
                <span className="font-data text-xs text-text-tertiary">
                  {fmt(start)} · #{i + 1}
                </span>
                <p className="font-display font-semibold text-text-primary">{t.track.title}</p>
                <p className="font-ui text-sm text-text-secondary">{t.track.artist}</p>
              </button>
              <div className="flex flex-col items-end gap-1">
                <IntensityReadout intensity={t.intensity} />
                {t.displayBpm != null && (
                  <span className="font-data text-xs text-text-tertiary">{t.displayBpm} BPM</span>
                )}
                {t.displayRpm != null && (
                  <span className="font-data text-xs text-text-tertiary">{t.displayRpm} RPM</span>
                )}
                {t.holdCount != null && (
                  <span className="font-data text-xs text-text-tertiary">
                    {t.holdCount} {t.holdCount === 1 ? 'Hold' : 'Holds'}
                  </span>
                )}
              </div>
            </div>
            {t.notes && (
              <p className="mt-2 whitespace-pre-wrap font-ui text-sm text-text-secondary">
                <span className="mr-1 font-ui text-xs uppercase tracking-wide text-text-tertiary">
                  Notes:
                </span>
                {t.notes}
              </p>
            )}
            {(t.cues.length > 0 || t.moves.length > 0) && (
              <ul className="mt-3 flex flex-col gap-1 border-t border-interactive/15 pt-2">
                {eventsByTrack[i]!.map((e, j) => {
                  const past = e.atMs <= elapsedMs && isLive;
                  return (
                    <li
                      key={j}
                      className={`flex items-center gap-2 font-ui text-sm ${past ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}
                    >
                      <span className="font-data text-xs text-text-tertiary">
                        {fmt(e.atMs - start)}
                      </span>
                      <span
                        className="rounded-pill px-1.5 py-0.5 font-data text-[10px] uppercase"
                        style={{
                          backgroundColor:
                            e.kind === 'cue'
                              ? (e.color ?? 'var(--rf-color-semantic-interactive-default)')
                              : 'var(--rf-color-semantic-bg-base)',
                          color:
                            e.kind === 'cue'
                              ? 'var(--rf-color-semantic-text-on-accent)'
                              : undefined,
                        }}
                      >
                        {e.kind}
                      </span>
                      <span>{e.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
      {payload.tracks.length === 0 && (
        <li className="font-ui text-text-tertiary">This class has no tracks yet.</li>
      )}
    </ol>
  );
}

function Transport({
  playing,
  onToggle,
  onReset,
  payload,
  elapsedMs,
  onSeek,
  playback,
  wakeStatus,
  primaryButtonRef,
}: {
  playing: boolean;
  onToggle: () => void;
  onReset: () => void;
  payload: RunPayload;
  elapsedMs: number;
  onSeek: (ms: number) => void;
  /** Coordinator status while music runs; null in prompter-only mode. */
  playback: CoordinatorStatus | null;
  /** Whether the screen wake lock is holding — surfaced beside the player rail. */
  wakeStatus: WakeLockStatus;
  /** Focused when the class goes live so start never strands focus on <body>. */
  primaryButtonRef: RefObject<HTMLButtonElement>;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-interactive/20 px-6 py-4">
      <button
        ref={primaryButtonRef}
        className="rounded-pill rf-btn-primary px-6 py-2 font-ui font-semibold text-text-on-accent"
        onClick={onToggle}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        className="rounded-pill border border-interactive px-4 py-2 font-ui text-sm text-interactive"
        onClick={onReset}
      >
        Reset
      </button>
      <PlaybackRail status={playback} />
      <WakeRail status={wakeStatus} />
      <LiveTimeline payload={payload} elapsedMs={elapsedMs} onSeek={onSeek} />
    </div>
  );
}
