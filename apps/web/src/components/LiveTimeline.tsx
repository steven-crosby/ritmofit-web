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
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { type RunPayload } from '@ritmofit/shared';
import { computeTimeline } from './TimelineStrip.js';
import { formatDuration } from '../lib/class-summary.js';

/** Keyboard seek increments (ms): arrows nudge, PageUp/Down jump. */
const STEP_MS = 5000;
const PAGE_MS = 30000;

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
  elapsedMs,
  onSeek,
}: {
  payload: RunPayload;
  elapsedMs: number;
  onSeek: (ms: number) => void;
}) {
  const totalMs = payload.class.totalDurationMs;
  const trackRef = useRef<HTMLDivElement>(null);
  const { blocks, markers } = computeTimeline(payload.tracks, totalMs);
  // Nothing positionable to scrub (no track has a usable duration). Live mode is
  // gated on durations upstream, so this is just a safe empty state — Play/Reset
  // in the transport still work without a scrubber.
  if (blocks.length === 0) return null;

  const playheadPct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

  const seekToClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    onSeek(fractionToMs((clientX - rect.left) / rect.width, totalMs));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    // Drag-seek only while a button is held (the captured pointer reports buttons).
    if (e.buttons === 0) return;
    seekToClientX(e.clientX);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = keyboardSeekMs(e.key, elapsedMs, totalMs);
    if (next === null) return;
    e.preventDefault();
    onSeek(next);
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
      onKeyDown={onKeyDown}
      className="relative h-10 flex-1 cursor-pointer touch-none rounded-card bg-bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
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
