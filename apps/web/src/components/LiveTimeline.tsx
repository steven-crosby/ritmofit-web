/**
 * The Live-mode timeline scrubber (design system 09/10): the builder's static
 * `TimelineStrip` brought into Live with a moving **playhead** and tap/drag-to-seek.
 * It reuses `computeTimeline()` for the proportional track blocks + cue (▲) / move
 * (◆) markers, fills the played portion up to the current time, and behaves as an
 * accessible slider over the whole class (pointer + keyboard).
 *
 * It does NOT play audio. A drag only moves the virtual prompter clock; the
 * host sends one provider seek when the finger lifts (RF-188). A tap jumps to
 * the start of the track under the finger, and a visible hint says so. The
 * blocks/markers are decorative reinforcement here; the slider's label, value
 * text and hint carry the meaning, so they are `aria-hidden`.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { type RunPayload } from '@ritmofit/shared';
import { computeTimeline, type TimelineBlock } from './TimelineStrip.js';
import { formatDuration } from '../lib/class-summary.js';
import type { ClockStore } from '../lib/use-virtual-clock.js';
import { playbackTimingEnabled, timingLine } from '../lib/playback/start-timing.js';

/** Keyboard seek increments (ms): arrows nudge, PageUp/Down jump. */
const STEP_MS = 5000;
const PAGE_MS = 30000;
/**
 * How far (CSS px) a pressed pointer may wander and still count as resting
 * (RF-185): from pointerdown for a tap, and from the last previewed spot for a
 * drag that rests before release. A still finger reports sub-pixel jitter and
 * a touch centroid can shift a pixel or two on lift, while one CSS px is
 * several seconds of class time on a phone-width strip (about 10 s for a
 * 60-minute class at 360 px), so the rule is in pixels, not milliseconds.
 *
 * Why 3 px and not UIKit's ~10 pt tap-vs-pan slop: here the two mistakes cost
 * differently. Treating jitter as movement turns a tap (track start) into an
 * exact-time jump a little way into that track. Treating a deliberate nudge as a tap
 * silently drops the instructor's chosen position, and at 8 px that was over
 * a minute of class time. 3 px still covers sub-pixel and 1-2 px jitter,
 * and keeps a swallowed nudge to about 30 s on a 60-minute class.
 */
export const TAP_SLOP_PX = 3;
/** Debug timing logs the first moves of a gesture; the release line carries the count. */
const LOGGED_MOVES = 5;
const TIMING_PREFIX = '[ritmo live-timeline]';
/**
 * A gesture with no pointer event for this long stops holding the host
 * (RF-188 round 3): the clock and provider position sync run again even if
 * the browser lost the release. The gesture itself is kept, so a finger held
 * still past this and then lifted still commits its one seek.
 */
export const SCRUB_WATCHDOG_MS = 10_000;

interface Gesture {
  pointerId: number;
  downX: number;
  /** The class time under pointerdown; a tap commits it. */
  downMs: number | null;
  /** The position this gesture last previewed, and the clientX it came from. */
  lastMs: number | null;
  lastX: number;
  /** Moved past the tap slop at least once; previews follow the pointer from then on. */
  dragging: boolean;
  moves: number;
  /** The clock before pointerdown previewed the tap target; an unmoved cancel restores it. */
  beforeMs: number;
}

/** Map a 0..1 position along the strip to a clamped, whole-ms class time. */
export function fractionToMs(fraction: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  const clamped = Math.max(0, Math.min(1, fraction));
  return Math.round(clamped * totalMs);
}

/**
 * The seek target (ms) for a keyboard key while focused on the scrubber, or `null`
 * when the key isn't a seek control (so the handler can ignore it). Results are
 * clamped to `[0, totalMs]`.
 */
export function keyboardSeekMs(key: string, currentMs: number, totalMs: number): number | null {
  const up = (delta: number) => Math.min(totalMs, currentMs + delta);
  const down = (delta: number) => Math.max(0, currentMs - delta);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return up(STEP_MS);
    case 'ArrowLeft':
    case 'ArrowDown':
      return down(STEP_MS);
    case 'PageUp':
      return up(PAGE_MS);
    case 'PageDown':
      return down(PAGE_MS);
    case 'Home':
      return 0;
    case 'End':
      return totalMs;
    default:
      return null;
  }
}

/** The track block under a class time, or null in a gap (free timeline mode). */
export function blockAt(blocks: readonly TimelineBlock[], ms: number): TimelineBlock | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!;
    // The last block owns the class's final instant, so a tap on the far
    // right edge still lands on a track.
    const last = i === blocks.length - 1;
    if (ms >= b.startMs && (ms < b.startMs + b.durMs || (last && ms === b.startMs + b.durMs)))
      return b;
  }
  return null;
}

/**
 * Where a tap jumps (RF-188): the start of the track under the finger, so the
 * numbered blocks do what they look like they do. A tap in a gap between
 * tracks (free timeline mode) keeps its exact time.
 */
export function tapTargetMs(blocks: readonly TimelineBlock[], ms: number): number {
  return blockAt(blocks, ms)?.startMs ?? ms;
}

export function LiveTimeline({
  payload,
  clock,
  onSeekPreview,
  onSeekCommit,
  onSeekRelease = onSeekCommit,
  onScrubChange,
  onClockHoldChange,
  onShowAllTracks,
}: {
  payload: RunPayload;
  /** The raw, frame-rate clock (SPC-18): subscribing directly to it here —
   * rather than receiving `elapsedMs` as a normal prop — is what keeps the
   * 60fps playhead from re-rendering the rest of Live Mode. */
  clock: ClockStore;
  /** Cheap, high-frequency position update while dragging — no provider call. */
  onSeekPreview: (ms: number) => void;
  /** The authoritative seek: keyboard (and pointer release unless `onSeekRelease` is given). */
  onSeekCommit: (ms: number) => void;
  /**
   * Pointer release/cancel with the gesture's final position: the one
   * provider seek per gesture (RF-108, RF-185, RF-188).
   */
  onSeekRelease?: (ms: number) => void;
  /** True from pointerdown until the gesture really ends (release, cancel,
   * lost capture or a lost release seen by the window): a finger is on the
   * strip, so the host keeps the waiting panel quiet and defers its reveal
   * (RF-188). */
  onScrubChange?: (active: boolean) => void;
  /** True while the host should hold the clock and provider position sync
   * for the finger. It starts with the gesture and ends with it, but the
   * no-event watchdog can end it early (and a move restarts it), so a lost
   * release cannot stop the class clock (RF-188 round 4). */
  onClockHoldChange?: (held: boolean) => void;
  /** Opens the Full List, where every track is a full-size jump target. */
  onShowAllTracks?: () => void;
}) {
  const totalMs = payload.class.totalDurationMs;
  const trackRef = useRef<HTMLDivElement>(null);
  /** The pointer gesture in progress, from pointerdown until release or cancel. */
  const gesture = useRef<Gesture | null>(null);
  /** Drives the "Track N · mm:ss" callout; the gesture ref stays the source of truth. */
  const [pressed, setPressed] = useState(false);
  const hintId = useId();
  const elapsedMs = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  // What the host was last told, as two signals (RF-188 round 4): the finger
  // is down (until the gesture really ends), and the clock is held (which
  // the watchdog can release while the gesture stays open).
  const hostFinger = useRef(false);
  const hostHold = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScrubChangeRef = useRef(onScrubChange);
  onScrubChangeRef.current = onScrubChange;
  const onClockHoldChangeRef = useRef(onClockHoldChange);
  onClockHoldChangeRef.current = onClockHoldChange;
  const reportFinger = (active: boolean) => {
    if (hostFinger.current === active) return;
    hostFinger.current = active;
    onScrubChangeRef.current?.(active);
  };
  const reportHold = (held: boolean) => {
    if (hostHold.current === held) return;
    hostHold.current = held;
    onClockHoldChangeRef.current?.(held);
  };
  const clearWatchdog = () => {
    if (watchdog.current !== null) clearTimeout(watchdog.current);
    watchdog.current = null;
  };
  /** Restart the no-event timer; when it fires, release only the clock hold. */
  const armWatchdog = () => {
    clearWatchdog();
    watchdog.current = setTimeout(() => {
      watchdog.current = null;
      reportHold(false);
    }, SCRUB_WATCHDOG_MS);
  };
  // A gesture still open when the strip unmounts must not leave the host
  // holding position sync and the waiting panel.
  useEffect(
    () => () => {
      if (watchdog.current !== null) clearTimeout(watchdog.current);
      if (hostHold.current) {
        hostHold.current = false;
        onClockHoldChangeRef.current?.(false);
      }
      if (hostFinger.current) {
        hostFinger.current = false;
        onScrubChangeRef.current?.(false);
      }
    },
    [],
  );
  // A release the strip never saw (the browser dropped it, the page lost
  // focus or was hidden) ends the gesture from the window instead, so a lost
  // pointerup cannot hold the class clock (RF-188 round 3). Each listener
  // calls the latest handler; a normal release ends the gesture first, so
  // the window copy of the same event finds nothing to end.
  const endLostGesture = useRef<(step: string, pointerId: number | null) => void>(() => {});
  useEffect(() => {
    if (!pressed) return;
    const onPointerEnd = (e: Event) =>
      endLostGesture.current(`window-${e.type}`, (e as globalThis.PointerEvent).pointerId ?? null);
    const onBlur = () => endLostGesture.current('window-blur', null);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') endLostGesture.current('page-hidden', null);
    };
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pressed]);
  const { blocks, markers } = computeTimeline(payload.tracks, totalMs);
  // Nothing positionable to scrub (no track has a usable duration). Live mode is
  // gated on durations upstream, so this is just a safe empty state — Play/Reset
  // in the transport still work without a scrubber.
  if (blocks.length === 0) return null;

  const playheadPct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

  /** The class time under `clientX`, or null when the strip has no measurable box. */
  const msAtClientX = (clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    return fractionToMs((clientX - rect.left) / rect.width, totalMs);
  };

  const preview = (g: Gesture, ms: number, clientX: number) => {
    g.lastMs = ms;
    g.lastX = clientX;
    onSeekPreview(ms);
  };

  /** Debug timing only (`?playback-timing=1`, RF-185): one line per pointer event.
   * The line is built only when timing is on. */
  const logPointer = (
    step: string,
    e: PointerEvent<HTMLDivElement>,
    ms: number | null,
    note = '',
  ) => {
    if (!playbackTimingEnabled()) return;
    const x = Number.isFinite(e.clientX) ? e.clientX.toFixed(1) : 'n/a';
    const type = e.pointerType || 'unknown';
    const id = Number.isFinite(e.pointerId) ? e.pointerId : 'n/a';
    timingLine(
      TIMING_PREFIX,
      step,
      `x=${x} ms=${ms ?? 'n/a'} id=${id} type=${type}${note ? ` ${note}` : ''}`,
    );
  };

  /** An event from a pointer other than the one this gesture follows (a second
   * finger, a palm) is ignored, so it cannot move or end the gesture (RF-185). */
  const otherPointer = (e: PointerEvent<HTMLDivElement>) =>
    gesture.current !== null && e.pointerId !== gesture.current.pointerId;

  /** Start following a pointer; tells the host a finger is on the strip. */
  const beginGesture = (g: Gesture) => {
    gesture.current = g;
    setPressed(true);
    reportFinger(true);
    reportHold(true);
    armWatchdog();
  };
  /** Stop following the pointer and hand position sync back to the host. */
  const endGesture = () => {
    clearWatchdog();
    gesture.current = null;
    setPressed(false);
    reportHold(false);
    reportFinger(false);
  };
  /**
   * End a gesture without a release position (a cancel, a lost capture, or
   * a lost release seen from the window). A drag commits what it last
   * previewed, so the playhead and the provider agree. A press that never
   * moved commits nothing and puts the clock back where it was before the
   * press: a system cancel must not restart the track (RF-188 round 3).
   * Returns the committed time, or null.
   */
  const cancelGesture = (g: Gesture): number | null => {
    if (g.dragging && g.lastMs !== null) {
      endGesture();
      onSeekRelease(g.lastMs);
      return g.lastMs;
    }
    // Restore before ending: the host banks the clock as the hold ends, so
    // its display tier (cue card, header, countdown) shows the pre-press
    // time, not the tap target (RF-188 round 4).
    onSeekPreview(g.beforeMs);
    endGesture();
    return null;
  };
  endLostGesture.current = (step, pointerId) => {
    const g = gesture.current;
    if (!g || (pointerId !== null && pointerId !== g.pointerId)) return;
    const ms = cancelGesture(g);
    if (playbackTimingEnabled())
      timingLine(TIMING_PREFIX, step, `ms=${ms ?? 'n/a'} id=${g.pointerId}`);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Only the main mouse button scrubs: a right- or middle-click never
    // starts a gesture or a seek (RF-204 item 6).
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // A second finger (not primary) never takes over the gesture. A new
    // primary pointer means every earlier pointer has lifted, so a gesture
    // still held here lost its release: drop it without a commit rather than
    // let it lock out every later touch (RF-185).
    if (otherPointer(e) && !e.isPrimary) {
      logPointer('pointer-down', e, null, '(other pointer, ignored)');
      return;
    }
    if (gesture.current) logPointer('stale-gesture-dropped', e, null);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // A tap jumps to the start of the track under the finger (RF-188), and
    // the preview shows that target from pointerdown, so what the callout
    // says is what a release commits.
    const exact = msAtClientX(e.clientX);
    const ms = exact === null ? null : tapTargetMs(blocks, exact);
    const g: Gesture = {
      pointerId: e.pointerId,
      downX: e.clientX,
      downMs: ms,
      lastMs: null,
      lastX: e.clientX,
      dragging: false,
      moves: 0,
      beforeMs: clock.getSnapshot(),
    };
    beginGesture(g);
    logPointer('pointer-down', e, ms);
    if (ms !== null) preview(g, ms, e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    // Drag-seek only while a button is held (the captured pointer reports
    // buttons), and only for a gesture that began with pointerdown here: a
    // move alone never starts one (RF-185).
    const g = gesture.current;
    if (!g || e.buttons === 0 || otherPointer(e)) return;
    // The pointer is alive: hold the clock again (the watchdog may have let
    // go of a finger that rested) and restart the no-event timer.
    reportHold(true);
    armWatchdog();
    const ms = msAtClientX(e.clientX);
    g.moves++;
    // A still finger can report a move, with sub-pixel jitter, right after
    // pointerdown. Inside the tap slop it is still the tap: no preview, so a
    // tap release reports the pointerdown target (RF-185). Past the slop it is
    // a drag from then on.
    const withinSlop = !g.dragging && Math.abs(e.clientX - g.downX) < TAP_SLOP_PX;
    if (g.moves <= LOGGED_MOVES) logPointer('pointer-move', e, ms, withinSlop ? '(tap slop)' : '');
    if (withinSlop) return;
    g.dragging = true;
    if (ms !== null) preview(g, ms, e.clientX);
  };
  // A release is a tap only when no move left the slop and the release itself
  // is inside it: then it commits the pointerdown target (the track start). A
  // drag released within the slop of its last previewed spot (a drag that
  // rested) commits that previewed value, not a fresh reading of pointerup's
  // clientX, so sub-pixel lift jitter cannot move what the callout showed.
  // Otherwise it is a deliberate nudge or move and commits where the pointer
  // was released, even when no move event reached us (iOS can coalesce a
  // quick nudge into down + up). Either way the host sends one seek.
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (otherPointer(e)) return;
    const g = gesture.current;
    if (!g) {
      logPointer('pointer-up', e, null, '(no gesture, ignored)');
      return;
    }
    endGesture();
    const tap = !g.dragging && Math.abs(e.clientX - g.downX) < TAP_SLOP_PX;
    const rested = g.dragging && g.lastMs !== null && Math.abs(e.clientX - g.lastX) < TAP_SLOP_PX;
    const ms = tap ? g.downMs : rested ? g.lastMs : (msAtClientX(e.clientX) ?? g.lastMs);
    const extra = g.moves > LOGGED_MOVES ? ` moves=${g.moves}` : '';
    logPointer('pointer-up', e, ms, `${tap ? 'tap' : 'drag'}${extra}`);
    if (ms === null) return;
    if (ms !== g.lastMs) onSeekPreview(ms);
    onSeekRelease(ms);
  };
  // A cancel carries no reliable position (see cancelGesture): a cancelled
  // drag commits what it last previewed, an unmoved press commits nothing.
  // A release or cancel with no gesture in progress (a second event
  // after pointerup, or a pointer that never went down here) sends nothing:
  // it would re-send the current position as a new start (RF-185).
  // Lost capture without a pointerup (the element hid, the browser took the
  // touch) ends the gesture the same way, so a lost release cannot leave a
  // stale gesture that ignores every later pointer.
  const endWithoutPosition = (step: string) => (e: PointerEvent<HTMLDivElement>) => {
    if (otherPointer(e)) return;
    const g = gesture.current;
    if (!g && step === 'lost-capture') return; // the normal tail of every release
    const ms = g ? cancelGesture(g) : null;
    logPointer(step, e, ms, g ? '' : '(no gesture, ignored)');
  };
  const onPointerCancel = endWithoutPosition('pointer-cancel');
  const onLostPointerCapture = endWithoutPosition('lost-capture');
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = keyboardSeekMs(e.key, elapsedMs, totalMs);
    if (next === null) return;
    e.preventDefault();
    // A finger is on the strip: its release is the one seek (RF-188).
    if (gesture.current) return;
    onSeekCommit(next);
  };

  const currentBlock = blockAt(blocks, elapsedMs);
  const trackText = currentBlock ? `Track ${currentBlock.position + 1}` : null;
  // Keep the callout on screen near either end of the strip.
  const calloutShift = playheadPct < 12 ? '0%' : playheadPct > 88 ? '-100%' : '-50%';

  return (
    <div className="min-w-0">
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <p id={hintId} className="min-w-0 font-ui text-xs text-text-secondary">
          Drag to move · tap to jump
        </p>
        {onShowAllTracks && (
          <button
            type="button"
            onClick={onShowAllTracks}
            className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs font-semibold text-interactive underline-offset-2 hover:underline rf-focus-ring"
          >
            All tracks
          </button>
        )}
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek class timeline"
        aria-describedby={hintId}
        aria-valuemin={0}
        aria-valuemax={Math.round(totalMs)}
        aria-valuenow={Math.round(elapsedMs)}
        aria-valuetext={`${formatDuration(elapsedMs)} of ${formatDuration(totalMs)}${
          trackText ? `, ${trackText}` : ''
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onKeyDown={onKeyDown}
        className="relative h-11 w-full min-w-0 cursor-pointer touch-none rounded-card bg-bg-base rf-focus-ring"
      >
        {/* Track blocks — the upper band, numbered, divided by quiet rules (decorative). */}
        {blocks.map((b) => (
          <div
            key={b.position}
            aria-hidden
            style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
            className="absolute top-0 flex h-5 items-center justify-center overflow-hidden border-l border-interactive/25 first:border-l-0"
          >
            <span className="font-data text-xs text-text-secondary">{b.position + 1}</span>
          </div>
        ))}
        {/* The played portion, filled up to the playhead (decorative). */}
        <div
          aria-hidden
          style={{ width: `${playheadPct}%` }}
          className="absolute inset-y-0 left-0 rounded-l-card bg-interactive/10"
        />
        {/* Markers — the lower band: ▲ cue / ◆ move; shape distinguishes kind, color reinforces. */}
        {markers.map((m) => (
          <span
            key={m.key}
            aria-hidden
            style={{ left: `${m.leftPct}%`, color: m.color ?? undefined }}
            className="absolute bottom-0 -translate-x-1/2 font-data text-[11px] leading-none text-text-secondary"
          >
            {m.kind === 'cue' ? '▲' : '◆'}
          </span>
        ))}
        {/* The playhead. */}
        <div
          aria-hidden
          style={{ left: `${playheadPct}%` }}
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-interactive"
        />
        {/* While pressed: where a release lands (RF-188). The slider's value
            text carries the same words for assistive tech. */}
        {pressed && (
          <span
            aria-hidden
            data-testid="live-timeline-callout"
            style={{ left: `${playheadPct}%`, transform: `translateX(${calloutShift})` }}
            className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-control border border-interactive/40 bg-bg-raised px-2 py-1 font-data text-xs text-text-primary shadow-lifted"
          >
            {trackText ? `${trackText} · ` : ''}
            {formatDuration(elapsedMs)}
          </span>
        )}
      </div>
    </div>
  );
}
