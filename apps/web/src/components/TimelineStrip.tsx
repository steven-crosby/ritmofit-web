/**
 * The timeline strip (design system `09-class-builder-guidelines.md`): a thin band
 * beneath the energy ribbon that shares its time axis — proportional track blocks
 * with cue (▲) and placed-move (◆) markers at their absolute time. Cues and moves
 * are **distinct shapes**, not just colors (09: "distinct shapes/icons, not just
 * colors"); color is decorative reinforcement, and the shape + position + title
 * carry the meaning. Derived entirely from the run-payload.
 *
 * With edit access it also shows a faint **beat/bar grid** per track (from the
 * resolved BPM + downbeat) and lets markers be **dragged to re-time** their cue/move,
 * snapping to the grid when enabled. Without an `onMoveMarker` handler it stays
 * read-only (it reflects edits made in the inspector after a reload).
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { beatGridLayout, msPerBeat, snapToBeat, type RunPayload } from '@ritmofit/shared';
import { formatDuration } from '../lib/class-summary.js';

export type TimelineBlock = {
  /** The class_track this block represents (for click-to-select). */
  classTrackId: string;
  /** Left edge as a percentage of the assembled total. */
  leftPct: number;
  /** Width as a percentage of the assembled total. */
  widthPct: number;
  /** 0-based index in the track list (display is `position + 1`). */
  position: number;
  /** Absolute start on the class timeline (ms). */
  startMs: number;
  /** Clipped (effective) duration of the block (ms). */
  durMs: number;
  /** Trim start (track-relative ms) — converts a block-relative drag back to an anchor. */
  clipStartMs: number;
  /** Downbeat offset (track-relative ms) for the beat grid / snapping. */
  beatAnchorMs: number;
  /** Resolved BPM, or null (no grid / no snapping). */
  bpm: number | null;
};

export type TimelineMarker = {
  key: string;
  /** The cue / placed-move id (run-payload), so a row correlates uniquely even
   *  when two markers share an `anchorMs`. */
  id: string;
  /** The class_track this marker sits on (for click-to-select). */
  classTrackId: string;
  /** 0-based index of the marker's track (display is `position + 1`). */
  position: number;
  leftPct: number;
  kind: 'cue' | 'move';
  /** Absolute time on the class timeline (ms from start). */
  absMs: number;
  /** In-track anchor (ms from the track's start) — correlates to the inspector row. */
  anchorMs: number;
  /** Cue text or move name (resolved server-side in the run-payload). */
  label: string;
  /** A ready-to-use CSS color (cue tag hex / move intensity var), or null. */
  color: string | null;
};

export type Timeline = { blocks: TimelineBlock[]; markers: TimelineMarker[] };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Pure geometry: lay tracks out by their share of the assembled total (same math
 * as `computeRibbonSegments`, so the strip lines up under the ribbon), and place
 * each track's cues/moves at `trackStart + clamp(anchorMs, 0, trackDuration)`.
 * A null/zero-duration track contributes no block and drops its markers (they
 * can't be positioned on a time axis). Returns empty when there's nothing to draw.
 */
export function computeTimeline(tracks: RunPayload['tracks'], totalDurationMs: number): Timeline {
  if (totalDurationMs <= 0) return { blocks: [], markers: [] };
  const blocks: TimelineBlock[] = [];
  const markers: TimelineMarker[] = [];
  tracks.forEach((t, i) => {
    const dur = t.track.durationMs ?? 0;
    if (dur <= 0) return;
    // Position by the (server-resolved) offset — back-to-back in sequential mode,
    // authored with gaps in free mode. Both come straight from the run-payload.
    const startMs = t.startOffsetMs ?? 0;
    blocks.push({
      classTrackId: t.classTrackId,
      leftPct: (startMs / totalDurationMs) * 100,
      widthPct: (dur / totalDurationMs) * 100,
      position: i,
      startMs,
      durMs: dur,
      clipStartMs: t.clipStartMs,
      beatAnchorMs: t.beatAnchorMs,
      bpm: t.displayBpm,
    });
    t.cues.forEach((cue, ci) => {
      const anchorMs = clamp(cue.anchorMs, 0, dur);
      const absMs = startMs + anchorMs;
      markers.push({
        key: `c-${i}-${ci}`,
        id: cue.id,
        classTrackId: t.classTrackId,
        position: i,
        leftPct: (absMs / totalDurationMs) * 100,
        kind: 'cue',
        absMs,
        anchorMs,
        label: cue.text,
        color: cue.color ?? null,
      });
    });
    t.moves.forEach((mv, mi) => {
      const anchorMs = clamp(mv.anchorMs, 0, dur);
      const absMs = startMs + anchorMs;
      markers.push({
        key: `m-${i}-${mi}`,
        id: mv.id,
        classTrackId: t.classTrackId,
        position: i,
        leftPct: (absMs / totalDurationMs) * 100,
        kind: 'move',
        absMs,
        anchorMs,
        label: mv.name,
        color: mv.intensity ? `var(--rf-color-intensity-${mv.intensity})` : null,
      });
    });
  });
  return { blocks, markers };
}

/** The faint beat/bar grid background for one block, or null without a tempo. */
function blockGridStyle(block: TimelineBlock): CSSProperties | null {
  const layout = beatGridLayout(block.beatAnchorMs - block.clipStartMs, block.bpm, block.durMs);
  if (!layout) return null;
  // Bar lines stronger than beat lines; bar layer first so it paints on top.
  // Bone-tinted border tokens (not raw white) so the grid follows the divider
  // language and flips to ink under [data-theme="light"] instead of vanishing.
  const bar = `repeating-linear-gradient(to right, var(--rf-color-semantic-border-strong) 0 1px, transparent 1px ${layout.barPct}%)`;
  const beat = `repeating-linear-gradient(to right, var(--rf-color-semantic-border-subtle) 0 1px, transparent 1px ${layout.beatPct}%)`;
  return {
    backgroundImage: `${bar}, ${beat}`,
    backgroundPosition: `${layout.barPhasePct}% 0, ${layout.beatPhasePct}% 0`,
    backgroundRepeat: 'repeat',
  };
}

export function TimelineStrip({
  payload,
  selectedTrackId = null,
  onSelectTrack,
  onMoveMarker,
  onMoveTrack,
}: {
  payload: RunPayload;
  /** The class_track currently open in the inspector — its block is highlighted. */
  selectedTrackId?: string | null;
  /**
   * Click/keyboard-select a track from the timeline (opens it in the inspector).
   * A marker click also passes its `{ kind, id, anchorMs }` so the inspector can
   * focus the matching cue/move row (by `id`, with `anchorMs` as a fallback); a
   * block click passes no marker.
   */
  onSelectTrack?: (
    classTrackId: string,
    marker?: { kind: 'cue' | 'move'; id: string; anchorMs: number },
  ) => void;
  /**
   * Persist a marker dragged to a new **track-relative** anchor (edit access).
   * When provided, markers become draggable handles; when omitted the strip is
   * read-only.
   */
  onMoveMarker?: (
    marker: { kind: 'cue' | 'move'; id: string },
    anchorMs: number,
  ) => Promise<void> | void;
  /**
   * Persist a track dragged to a new class-timeline `startOffsetMs` (free mode +
   * edit access). When provided, the track blocks become draggable; a click still
   * selects. Overlaps are rejected server-side (the drag reverts on failure).
   */
  onMoveTrack?: (classTrackId: string, startOffsetMs: number) => Promise<void> | void;
}) {
  const { blocks, markers } = computeTimeline(payload.tracks, payload.class.totalDurationMs);
  const stripRef = useRef<HTMLDivElement>(null);
  const blockById = new Map(blocks.map((b) => [b.classTrackId, b]));
  const total = payload.class.totalDurationMs;
  const editable = !!onMoveMarker;
  const gridAvailable = blocks.some((b) => b.bpm != null);
  const [snap, setSnap] = useState(true);

  if (blocks.length === 0) return null;

  const cueCount = markers.filter((m) => m.kind === 'cue').length;
  const moveCount = markers.length - cueCount;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const summary = `Timeline: ${plural(blocks.length, 'track')}, ${plural(cueCount, 'cue')}, ${plural(moveCount, 'move')}`;
  const interactive = !!onSelectTrack;

  return (
    // Frameless: rides directly under the energy arc on the workbench's shared
    // shape surface (same time axis). The arc is the labeled hero; this is its
    // base. The Snap control stays here, right-aligned, only when it applies.
    <figure className="flex flex-col gap-1">
      {editable && gridAvailable && (
        <figcaption className="flex items-center justify-end font-ui text-xs text-text-tertiary">
          <label className="flex items-center gap-1.5 text-text-secondary">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Snap to beat
          </label>
        </figcaption>
      )}
      <div
        ref={stripRef}
        role={interactive ? undefined : 'img'}
        aria-label={interactive ? undefined : summary}
        className="relative h-10 w-full"
      >
        {/* Beat/bar grid — faint, full-height, behind blocks and markers. */}
        {blocks.map((b) => {
          const style = blockGridStyle(b);
          if (!style) return null;
          return (
            <div
              key={`g-${b.position}`}
              aria-hidden
              className="absolute inset-y-0"
              style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%`, ...style }}
            />
          );
        })}
        {/* Track blocks — the upper band, numbered, divided by quiet rules. Click to
            open the track in the inspector; the open track's block is ringed. */}
        {blocks.map((b) => {
          const selected = b.classTrackId === selectedTrackId;
          const ring = selected ? 'ring-2 ring-interactive' : '';
          // The active track's block carries the subtle on-beat pulse (design system
          // 10 §2) — the planning timeline's single sanctioned pulse, retimed by the
          // track's own BPM via --rf-bpm. Only when a tempo is known; the static ring
          // marks selection on its own (and survives reduced motion).
          const pulse = selected && b.bpm != null;
          const style: CSSProperties = pulse
            ? ({
                left: `${b.leftPct}%`,
                width: `${b.widthPct}%`,
                '--rf-bpm': b.bpm,
              } as CSSProperties)
            : { left: `${b.leftPct}%`, width: `${b.widthPct}%` };
          const pulseClass = pulse ? ' rf-beat-pulse-subtle' : '';
          const inner = (
            <span className="font-data text-[10px] text-text-tertiary">{b.position + 1}</span>
          );
          if (onMoveTrack) {
            return (
              <TrackBlockHandle
                key={b.position}
                block={b}
                totalMs={total}
                selected={selected}
                getRect={() => stripRef.current?.getBoundingClientRect()}
                onSelect={() => onSelectTrack?.(b.classTrackId)}
                onCommit={(startOffsetMs) => onMoveTrack(b.classTrackId, startOffsetMs)}
              />
            );
          }
          return interactive ? (
            <button
              key={b.position}
              type="button"
              aria-pressed={selected}
              aria-label={`Select track ${b.position + 1}`}
              onClick={() => onSelectTrack(b.classTrackId)}
              style={style}
              className={`absolute top-0 flex h-5 items-center justify-center overflow-hidden rounded-sm border-l border-interactive/15 first:border-l-0 hover:bg-bg-raised ${ring}${pulseClass}`}
            >
              {inner}
            </button>
          ) : (
            <div
              key={b.position}
              aria-hidden
              style={style}
              className={`absolute top-0 flex h-5 items-center justify-center overflow-hidden border-l border-interactive/15 first:border-l-0 ${ring}`}
            >
              {inner}
            </div>
          );
        })}
        {/* Markers — the lower band. ▲ cue / ◆ move; shape distinguishes kind, color reinforces. */}
        {markers.map((m) => {
          const block = blockById.get(m.classTrackId)!;
          const select = () =>
            onSelectTrack?.(m.classTrackId, { kind: m.kind, id: m.id, anchorMs: m.anchorMs });
          if (editable) {
            return (
              <MarkerHandle
                key={m.key}
                marker={m}
                block={block}
                totalMs={total}
                snap={snap}
                getRect={() => stripRef.current?.getBoundingClientRect()}
                onSelect={select}
                onCommit={(anchorMs) => onMoveMarker!({ kind: m.kind, id: m.id }, anchorMs)}
              />
            );
          }
          // View-but-selectable: a click focuses the cue/move row (no drag).
          return interactive ? (
            <button
              key={m.key}
              type="button"
              onClick={select}
              style={{ left: `${m.leftPct}%` }}
              title={`${m.kind} ${formatDuration(m.absMs)} — ${m.label}`}
              aria-label={`${m.kind} at ${formatDuration(m.absMs)}: ${m.label}, select track ${m.position + 1}`}
              className="absolute bottom-0 -translate-x-1/2 px-1 py-0.5 text-text-secondary"
            >
              <Glyph kind={m.kind} color={m.color} />
            </button>
          ) : (
            <span
              key={m.key}
              className="absolute bottom-0 -translate-x-1/2 text-text-secondary"
              style={{ left: `${m.leftPct}%` }}
              title={`${m.kind} ${formatDuration(m.absMs)} — ${m.label}`}
              aria-label={`${m.kind} at ${formatDuration(m.absMs)}: ${m.label}`}
            >
              <Glyph kind={m.kind} color={m.color} />
            </span>
          );
        })}
      </div>
    </figure>
  );
}

/** Snap a dragged track start to the nearest whole second (free placement is coarse). */
const snapStart = (ms: number) => Math.max(0, Math.round(ms / 1000) * 1000);

/**
 * A draggable track block (free mode): drag horizontally to set the track's
 * class-timeline `startOffsetMs`; a click with no movement selects the track. The
 * draft re-syncs to the server value after a reload, and reverts if the commit
 * fails (e.g. the server rejects an overlap). Arrow keys nudge by 1s (5s with Shift).
 */
function TrackBlockHandle({
  block,
  totalMs,
  selected,
  getRect,
  onSelect,
  onCommit,
}: {
  block: TimelineBlock;
  totalMs: number;
  selected: boolean;
  getRect: () => DOMRect | undefined;
  onSelect: () => void;
  onCommit: (startOffsetMs: number) => Promise<void> | void;
}) {
  const [draftStart, setDraftStart] = useState(block.startMs);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setDraftStart(block.startMs);
  }, [block.startMs]);

  const leftPct = totalMs > 0 ? clamp((draftStart / totalMs) * 100, 0, 100) : 0;
  const widthPct = totalMs > 0 ? (block.durMs / totalMs) * 100 : 0;
  // Same single planning-timeline pulse as the non-draggable block (design system
  // 10 §2): the active block breathes at its own BPM, only when a tempo is known.
  const pulse = selected && block.bpm != null;

  // Pointer x → the block's new (snapped, ≥ 0) start, keeping its left edge under the cursor.
  const fromPointer = (clientX: number): number => {
    const rect = getRect();
    if (!rect) return block.startMs;
    const abs = clamp((clientX - rect.left) / rect.width, 0, 1) * totalMs;
    return snapStart(abs);
  };

  const commit = async (next: number) => {
    if (next === block.startMs) return;
    try {
      await onCommit(next);
    } catch {
      setDraftStart(block.startMs);
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    movedRef.current = false;
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    movedRef.current = true;
    setDraftStart(fromPointer(e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!movedRef.current) {
      onSelect();
      return;
    }
    const final = fromPointer(e.clientX);
    setDraftStart(final);
    void commit(final);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 5000 : 1000;
    const set = (raw: number) => {
      e.preventDefault();
      setDraftStart(Math.max(0, raw));
    };
    switch (e.key) {
      case 'ArrowRight':
        return set(draftStart + step);
      case 'ArrowLeft':
        return set(draftStart - step);
      case 'Enter':
        e.preventDefault();
        return void commit(draftStart);
      default:
        return undefined;
    }
  };

  return (
    <button
      type="button"
      role="slider"
      aria-label={`Track ${block.position + 1} start at ${formatDuration(draftStart)}. Drag or arrow keys to move; Enter to select.`}
      aria-valuemin={0}
      aria-valuemax={Math.round(totalMs)}
      aria-valuenow={Math.round(draftStart)}
      aria-valuetext={formatDuration(draftStart)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      onBlur={() => void commit(draftStart)}
      style={
        pulse
          ? ({ left: `${leftPct}%`, width: `${widthPct}%`, '--rf-bpm': block.bpm } as CSSProperties)
          : { left: `${leftPct}%`, width: `${widthPct}%` }
      }
      className={`absolute top-0 flex h-5 cursor-ew-resize touch-none items-center justify-center overflow-hidden rounded-sm border-l border-interactive/15 hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive ${selected ? 'ring-2 ring-interactive' : ''}${pulse ? ' rf-beat-pulse-subtle' : ''}`}
    >
      <span className="font-data text-[10px] text-text-tertiary">{block.position + 1}</span>
    </button>
  );
}

function Glyph({ kind, color }: { kind: 'cue' | 'move'; color: string | null }) {
  return (
    <span className="font-data text-[11px] leading-none" style={{ color: color ?? undefined }}>
      {kind === 'cue' ? '▲' : '◆'}
    </span>
  );
}

/**
 * A draggable cue/move marker (edit access): an accessible slider re-timing one
 * cue/move's anchor. A pointer drag (or arrow keys) updates a local draft; a real
 * drag commits the new **track-relative** anchor on pointer-up, while a click with
 * no movement falls through to selecting the track + focusing the row. Arrow keys
 * step by a beat when the tempo is known (else 1s), and the draft re-syncs to the
 * server value after a reload. Snapping (when enabled) rounds to the beat grid.
 */
function MarkerHandle({
  marker,
  block,
  totalMs,
  snap,
  getRect,
  onSelect,
  onCommit,
}: {
  marker: TimelineMarker;
  block: TimelineBlock;
  totalMs: number;
  snap: boolean;
  getRect: () => DOMRect | undefined;
  onSelect: () => void;
  onCommit: (anchorMs: number) => Promise<void> | void;
}) {
  // Draft in track-relative ms (the stored anchor); marker.anchorMs is block-relative.
  const committed = marker.anchorMs + block.clipStartMs;
  const [draftTrackRel, setDraftTrackRel] = useState(committed);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setDraftTrackRel(committed);
  }, [committed]);

  const windowLo = block.clipStartMs;
  const windowHi = block.clipStartMs + block.durMs;
  const absMs = block.startMs + (draftTrackRel - block.clipStartMs);
  const leftPct = totalMs > 0 ? clamp((absMs / totalMs) * 100, 0, 100) : 0;

  /** Pointer x → snapped, clamped track-relative anchor. */
  const fromPointer = (clientX: number): number => {
    const rect = getRect();
    if (!rect) return committed;
    const abs = clamp((clientX - rect.left) / rect.width, 0, 1) * totalMs;
    const blockRel = clamp(abs - block.startMs, 0, block.durMs);
    let trackRel = blockRel + block.clipStartMs;
    if (snap) trackRel = snapToBeat(trackRel, block.bpm, block.beatAnchorMs).anchorMs;
    return clamp(trackRel, windowLo, windowHi);
  };

  const commit = async (next: number) => {
    if (next === committed) return;
    try {
      await onCommit(next);
    } catch {
      setDraftTrackRel(committed); // revert; server stays authoritative
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    movedRef.current = false;
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    movedRef.current = true;
    setDraftTrackRel(fromPointer(e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!movedRef.current) {
      onSelect(); // a click, not a drag
      return;
    }
    const final = fromPointer(e.clientX);
    setDraftTrackRel(final);
    void commit(final);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = msPerBeat(block.bpm) ?? 1000;
    const set = (raw: number) => {
      e.preventDefault();
      setDraftTrackRel(clamp(Math.round(raw), windowLo, windowHi));
    };
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        return set(draftTrackRel + step);
      case 'ArrowLeft':
      case 'ArrowDown':
        return set(draftTrackRel - step);
      case 'Enter':
      case ' ':
        e.preventDefault();
        return void commit(draftTrackRel);
      default:
        return undefined;
    }
  };

  return (
    <button
      type="button"
      role="slider"
      aria-label={`${marker.kind} at ${formatDuration(marker.absMs)}: ${marker.label}. Drag or use arrow keys to re-time; Enter to select.`}
      aria-valuemin={Math.round(windowLo)}
      aria-valuemax={Math.round(windowHi)}
      aria-valuenow={Math.round(draftTrackRel)}
      aria-valuetext={formatDuration(absMs)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      onBlur={() => void commit(draftTrackRel)}
      style={{ left: `${leftPct}%` }}
      title={`${marker.kind} ${formatDuration(absMs)} — ${marker.label}`}
      className="absolute bottom-0 -translate-x-1/2 cursor-ew-resize touch-none px-1 py-0.5 text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
    >
      <Glyph kind={marker.kind} color={marker.color} />
    </button>
  );
}
