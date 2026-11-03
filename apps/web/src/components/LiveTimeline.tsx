/**
 * The Live-mode timeline scrubber (design system 09/10): the builder's static
 * `TimelineStrip` brought into Live with a moving **playhead** and tap/drag-to-seek.
 * It reuses `computeTimeline()` for the proportional track blocks + cue (▲) / move
 * (◆) markers, fills the played portion up to the current time, and behaves as an
 * accessible slider over the whole class (pointer + keyboard).
 *
 * It does NOT play audio — seek only moves the virtual prompter clock (the three
 * music rules hold). The blocks/markers are decorative reinforcement here; the
 * slider's label + value text carry the meaning, so they are `aria-hidden`.
 */
import { useRef, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from 'react';
import { type RunPayload } from '@ritmofit/shared';
import { computeTimeline } from './TimelineStrip.js';
import { formatDuration } from '../lib/class-summary.js';
import type { ClockStore } from '../lib/use-virtual-clock.js';
import { timingLine } from '../lib/playback/start-timing.js';

/** Keyboard seek increments (ms): arrows nudge, PageUp/Down jump. */
const STEP_MS = 5000;
const PAGE_MS = 30000;
/**
 * How far (CSS px) a pressed pointer may wander from pointerdown and still be
 * a tap (RF-185). A still finger reports sub-pixel jitter, and one CSS px is
 * several seconds of class time on a phone-width strip (about 10 s for a
 * 60-minute class at 360 px), so the tap rule cannot be a millisecond
 * tolerance. 8 px is under UIKit's ~10 pt tap-vs-pan slop and far below the
 * 44 px target height, so a deliberate drag still starts almost at once.
 */
export const TAP_SLOP_PX = 8;
/** Debug timing logs the first moves of a gesture; the release line carries the count. */
const LOGGED_MOVES = 5;
const TIMING_PREFIX = '[ritmo live-timeline]';

interface Gesture {
  downX: number;
  /** Moved past the tap slop at least once; previews follow the pointer from then on. */
  dragging: boolean;
  moves: number;
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

export function LiveTimeline({
  payload,
  clock,
  onSeekPreview,
  onSeekCommit,
  onSeekRelease = onSeekCommit,
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
   * Pointer release/cancel with the position this gesture last previewed. The
   * host may skip it when that position was already sent to the provider, so
   * a tap or a resting drag does not start a second adapter (RF-108).
   */
  onSeekRelease?: (ms: number) => void;
}) {
  const totalMs = payload.class.totalDurationMs;
  const trackRef = useRef<HTMLDivElement>(null);
  /** The position this pointer gesture last previewed; release commits it. */
  const gestureMs = useRef<number | null>(null);
  /** The pointer gesture in progress, from pointerdown until release or cancel. */
  const gesture = useRef<Gesture | null>(null);
  const elapsedMs = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
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

  const preview = (ms: number) => {
    gestureMs.current = ms;
    onSeekPreview(ms);
  };

  /** Debug timing only (`?playback-timing=1`, RF-185): one line per pointer event. */
  const logPointer = (
    step: string,
    e: PointerEvent<HTMLDivElement>,
    ms: number | null,
    note = '',
  ) => {
    const x = Number.isFinite(e.clientX) ? e.clientX.toFixed(1) : 'n/a';
    const type = e.pointerType || 'unknown';
    timingLine(
      TIMING_PREFIX,
      step,
      `x=${x} ms=${ms ?? 'n/a'} type=${type}${note ? ` ${note}` : ''}`,
    );
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const ms = msAtClientX(e.clientX);
    gesture.current = {
      downX: e.clientX,
      dragging: false,
      moves: 0,
    };
    logPointer('pointer-down', e, ms);
    if (ms !== null) preview(ms);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    // Drag-seek only while a button is held (the captured pointer reports buttons).
    if (e.buttons === 0) return;
    const ms = msAtClientX(e.clientX);
    // A held pointer that entered without a pointerdown here is a drag already.
    const g = (gesture.current ??= {
      downX: e.clientX,
      dragging: true,
      moves: 0,
    });
    g.moves++;
    // A still finger can report a move, with sub-pixel jitter, right after
    // pointerdown. Inside the tap slop it is still the tap: no preview, so the
    // release reports the pointerdown position the provider already has and
    // one tap sends one seek (RF-185). Past the slop it is a drag from then on.
    const withinSlop = !g.dragging && Math.abs(e.clientX - g.downX) < TAP_SLOP_PX;
    if (g.moves <= LOGGED_MOVES) logPointer('pointer-move', e, ms, withinSlop ? '(tap slop)' : '');
    if (withinSlop) return;
    g.dragging = true;
    if (ms !== null) preview(ms);
  };
  // Release and cancel both commit the current preview position — a cancelled
  // drag still ends coherent (the playhead and provider audio agree) rather
  // than silently diverging from what's on screen. It is the position this
  // gesture previewed, so the host can tell whether the provider already has
  // it (RF-108). A release or cancel with no gesture in progress (a second
  // event after pointerup, or a pointer that never went down here) sends
  // nothing: it would re-send the current position as a new start (RF-185).
  const commitGesture = (step: string, e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const ms = gestureMs.current;
    if (!g || ms === null) {
      logPointer(step, e, null, '(no gesture, ignored)');
      gesture.current = null;
      gestureMs.current = null;
      return;
    }
    const extra = g.moves > LOGGED_MOVES ? ` moves=${g.moves}` : '';
    logPointer(step, e, ms, `${g.dragging ? 'drag' : 'tap'}${extra}`);
    gesture.current = null;
    gestureMs.current = null;
    onSeekRelease(ms);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => commitGesture('pointer-up', e);
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => commitGesture('pointer-cancel', e);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = keyboardSeekMs(e.key, elapsedMs, totalMs);
    if (next === null) return;
    e.preventDefault();
    onSeekCommit(next);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek class timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(totalMs)}
      aria-valuenow={Math.round(elapsedMs)}
      aria-valuetext={`${formatDuration(elapsedMs)} of ${formatDuration(totalMs)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      className="relative h-11 w-full min-w-0 cursor-pointer touch-none rounded-card bg-bg-base rf-focus-ring"
    >
      {/* Track blocks — the upper band, numbered, divided by quiet rules (decorative). */}
      {blocks.map((b) => (
        <div
          key={b.position}
          aria-hidden
          style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
          className="absolute top-0 flex h-5 items-center justify-center overflow-hidden border-l border-interactive/15 first:border-l-0"
        >
          <span className="font-data text-[10px] text-text-tertiary">{b.position + 1}</span>
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
    </div>
  );
}
