/**
 * The segment band (design system `09-class-builder-guidelines.md`, `02-color-system.md`):
 * Warm-up → Climb → Sprint → Recovery → Cool-down bands under the timeline,
 * sharing its time axis. Each section is time-anchored (`startOffsetMs`) and runs
 * to the next section's start (or the class end); bands tile the timeline. The
 * segment **type** is identified by **label + an icon + a tint** (never color
 * alone, 02).
 *
 * Renders from the granular `/classes/:id/sections` (which carry ids for editing);
 * the run-payload also ships `sections` for the live/iOS contract. Authoring is
 * edit-access-only: add / re-time / retype / delete. With edit access, each band
 * boundary is also a drag-resize handle (re-times `startOffsetMs` directly on the
 * band); the numeric editor below stays the precise/secondary path.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { segmentTypeValues, type ClassSection, type SegmentType } from '@ritmofit/shared';
import { listSections, createSection, updateSection, deleteSection } from '../lib/api.js';
import { formatDuration } from '../lib/class-summary.js';

/** Presentation for each fixed segment type: label + a reinforcing tint (02-color-system). */
export const SEGMENT_META: Record<SegmentType, { label: string; tint: string }> = {
  warm_up: { label: 'Warm-up', tint: 'var(--rf-color-segment-warmup)' }, // amber-400
  climb: { label: 'Climb', tint: 'var(--rf-color-segment-climb)' }, // copper-600
  sprint: { label: 'Sprint', tint: 'var(--rf-color-segment-sprint)' }, // ember-400
  recovery: { label: 'Recovery', tint: 'var(--rf-color-segment-recovery)' }, // violet-400
  cool_down: { label: 'Cool-down', tint: 'var(--rf-color-segment-cooldown)' }, // bone-400
};

/**
 * A tiny energy-arc glyph per type (a polyline in a 16×16 box), reinforcing the
 * label + tint. Inline SVG — no icon-font/CDN dependency, so the tightened
 * `font-src 'self'` CSP is unaffected. Decorative: the label carries the meaning.
 */
const SEGMENT_ICON_POINTS: Record<SegmentType, string> = {
  warm_up: '2,11 8,7 14,9', // gentle rise
  climb: '2,13 8,8 14,3', // steady steep climb
  sprint: '2,12 5,4 8,12 11,4 14,12', // intense spikes
  recovery: '2,7 6,11 10,7 14,8', // dip and recover
  cool_down: '2,5 8,10 14,11', // settle down
};

function SegmentIcon({ type }: { type: SegmentType }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points={SEGMENT_ICON_POINTS[type]} />
    </svg>
  );
}

export type SegmentBandSlice = {
  type: SegmentType;
  leftPct: number;
  widthPct: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Minimum gap between adjacent boundaries so a drag can't invert or collapse bands. */
const MIN_GAP_MS = 1000;

/** Pointer x within a strip's box → a clamped, whole-ms class time. */
export function boundaryMsFromPointer(
  clientX: number,
  rect: { left: number; width: number },
  totalMs: number,
): number {
  if (totalMs <= 0 || rect.width <= 0) return 0;
  const fraction = (clientX - rect.left) / rect.width;
  return Math.round(clamp(fraction, 0, 1) * totalMs);
}

/**
 * Keep a section's start between its neighbors (with a min gap) and inside the
 * class, so re-timing never reorders or collapses bands. `null` neighbors mean
 * "no bound that side" (the first section floors at 0, the last ceils at total).
 */
export function clampSectionStart(
  draftMs: number,
  prevStartMs: number | null,
  nextStartMs: number | null,
  minGapMs: number,
  totalMs: number,
): number {
  const lo = prevStartMs === null ? 0 : prevStartMs + minGapMs;
  const hi = nextStartMs === null ? totalMs : nextStartMs - minGapMs;
  return Math.round(clamp(draftMs, lo, Math.max(lo, hi)));
}

/**
 * The snap targets for track-range binding: the class start (0), each track's
 * start offset, and the class end — unique, in-range, ascending. Interior track
 * starts at/beyond the class bounds are ignored (clamped out). Snapping a section
 * boundary to one of these aligns segment bands to track edges (milestones.md:
 * "snapping boundaries to track starts").
 */
export function trackBoundaries(trackStartsMs: ReadonlyArray<number>, totalMs: number): number[] {
  const total = Math.round(Math.max(0, totalMs));
  const set = new Set<number>([0, total]);
  for (const s of trackStartsMs) {
    const ms = Math.round(s);
    if (ms > 0 && ms < total) set.add(ms);
  }
  return [...set].sort((a, b) => a - b);
}

/** The boundary nearest `rawMs` (ties → the lower one). `boundaries` must be non-empty. */
export function snapToTrackStart(rawMs: number, boundaries: ReadonlyArray<number>): number {
  let best = boundaries[0]!;
  for (const b of boundaries) {
    if (Math.abs(b - rawMs) < Math.abs(best - rawMs)) best = b;
  }
  return best;
}

/**
 * The boundary strictly beyond `fromMs` in direction `dir` (+1 next / -1 prev),
 * for keyboard snapping; falls back to the extreme boundary when there's none
 * further. `boundaries` must be ascending and non-empty.
 */
export function adjacentBoundary(
  fromMs: number,
  boundaries: ReadonlyArray<number>,
  dir: 1 | -1,
): number {
  if (dir > 0) return boundaries.find((b) => b > fromMs) ?? boundaries[boundaries.length - 1]!;
  for (let i = boundaries.length - 1; i >= 0; i--) {
    if (boundaries[i]! < fromMs) return boundaries[i]!;
  }
  return boundaries[0]!;
}

/**
 * Pure geometry: tile bands across the timeline. Each section (ordered by start)
 * runs from its `startOffsetMs` to the next section's start, or the class end.
 * A leading gap before the first section is left untinted. Zero/negative-width
 * bands (duplicate starts, or a start at/after the total) are dropped. Returns []
 * when there's nothing to draw.
 */
export function computeSegmentBands(
  sections: ReadonlyArray<{ type: SegmentType; startOffsetMs: number }>,
  totalDurationMs: number,
): SegmentBandSlice[] {
  if (totalDurationMs <= 0 || sections.length === 0) return [];
  const sorted = [...sections].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
  const bands: SegmentBandSlice[] = [];
  sorted.forEach((s, i) => {
    const start = clamp(s.startOffsetMs, 0, totalDurationMs);
    const end =
      i + 1 < sorted.length
        ? clamp(sorted[i + 1]!.startOffsetMs, 0, totalDurationMs)
        : totalDurationMs;
    if (end <= start) return;
    bands.push({
      type: s.type,
      leftPct: (start / totalDurationMs) * 100,
      widthPct: ((end - start) / totalDurationMs) * 100,
    });
  });
  return bands;
}

/** ms → whole-seconds string and back, for the start-time field. */
const msToSec = (ms: number) => String(Math.round(ms / 1000));
const secToMs = (sec: string) => {
  const n = Number(sec.trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : 0;
};

export function SegmentBand({
  classId,
  totalDurationMs,
  canEdit,
  trackStartsMs = [],
  onChanged,
}: {
  classId: string;
  totalDurationMs: number;
  canEdit: boolean;
  /** Track start offsets (ms) on the class timeline — the snap targets for the
   *  "Snap to tracks" boundary binding. The class start/end are always targets. */
  trackStartsMs?: ReadonlyArray<number>;
  /** Parent reload (run-payload → ribbon/timeline + the live contract) after a change. */
  onChanged?: () => void;
}) {
  const [sections, setSections] = useState<ClassSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track-range binding: snap dragged/keyed boundaries to track edges. Default on;
  // the numeric editor below stays exact regardless, as the precise path.
  const [snapTracks, setSnapTracks] = useState(true);
  const bandRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setSections(await listSections(classId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [classId]);
  useEffect(() => {
    void load();
  }, [load]);

  const afterChange = useCallback(async () => {
    setError(null);
    await load();
    onChanged?.();
  }, [load, onChanged]);

  // Drag/keyboard commit for a boundary handle. Throws on failure so the handle
  // can revert its draft; success reloads so neighbors + the live contract follow.
  const commitStart = useCallback(
    async (id: string, startOffsetMs: number) => {
      await updateSection(id, { startOffsetMs });
      await afterChange();
    },
    [afterChange],
  );

  const bands = computeSegmentBands(sections ?? [], totalDurationMs);
  const hasBand = bands.length > 0;
  const sorted = [...(sections ?? [])].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
  const boundaries = trackBoundaries(trackStartsMs, totalDurationMs);
  // Only offer snapping when there are interior track starts to snap to (more than
  // just the class start/end).
  const canSnap = boundaries.length > 2;
  const snap = snapTracks && canSnap;

  // Nothing to show and not editable → render nothing (keeps a view-only class clean).
  if (!hasBand && !canEdit) return null;

  const arc = bands.map((b) => SEGMENT_META[b.type].label).join(' → ');

  return (
    <figure className="mt-2 flex flex-col gap-1">
      <figcaption className="flex items-center justify-between font-ui text-xs uppercase tracking-wide text-text-tertiary">
        <span>Segments</span>
        {canEdit && canSnap && (
          <label className="flex items-center gap-1.5 normal-case tracking-normal text-text-secondary">
            <input
              type="checkbox"
              checked={snapTracks}
              onChange={(e) => setSnapTracks(e.target.checked)}
            />
            Snap to tracks
          </label>
        )}
      </figcaption>
      {hasBand ? (
        <div
          ref={bandRef}
          className="relative h-6 w-full overflow-hidden rounded-card bg-bg-base"
          role={canEdit ? 'group' : 'img'}
          aria-label={`Segments: ${arc}`}
        >
          {bands.map((b, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute top-0 flex h-full items-center gap-1 overflow-hidden px-1.5"
              style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
            >
              {/* icon + tint + label — type read by label, icon/color only reinforce (02). */}
              <span style={{ color: SEGMENT_META[b.type].tint }}>
                <SegmentIcon type={b.type} />
              </span>
              <span className="truncate font-ui text-[11px] text-text-secondary">
                {SEGMENT_META[b.type].label}
              </span>
            </div>
          ))}
          {/* Edit-access drag handles, one per boundary (re-time startOffsetMs). */}
          {canEdit &&
            sorted.map((s, i) => (
              <SegmentHandle
                key={s.id}
                section={s}
                prevStartMs={i > 0 ? sorted[i - 1]!.startOffsetMs : null}
                nextStartMs={i + 1 < sorted.length ? sorted[i + 1]!.startOffsetMs : null}
                totalMs={totalDurationMs}
                snap={snap}
                boundaries={boundaries}
                getRect={() => bandRef.current?.getBoundingClientRect()}
                onCommit={commitStart}
                onError={setError}
              />
            ))}
        </div>
      ) : (
        <p className="font-ui text-xs text-text-tertiary">No segments yet.</p>
      )}
      {error && <p className="font-ui text-xs text-state-danger">{error}</p>}
      {canEdit && (
        <SegmentEditor
          classId={classId}
          sections={sections ?? []}
          onChanged={afterChange}
          onError={setError}
        />
      )}
    </figure>
  );
}

/**
 * A draggable boundary on the band: an accessible slider that re-times one
 * section's `startOffsetMs`. Pointer drag and arrow keys update a local draft;
 * the change is committed (PATCH) on pointer-up, Enter, or blur, and reverted if
 * the request fails. The draft re-syncs to the server value after a reload.
 */
function SegmentHandle({
  section,
  prevStartMs,
  nextStartMs,
  totalMs,
  snap,
  boundaries,
  getRect,
  onCommit,
  onError,
}: {
  section: ClassSection;
  prevStartMs: number | null;
  nextStartMs: number | null;
  totalMs: number;
  /** Snap a dragged/keyed boundary to the nearest track edge (track-range binding). */
  snap: boolean;
  /** Ascending snap targets (class start, track starts, class end). */
  boundaries: ReadonlyArray<number>;
  getRect: () => DOMRect | undefined;
  onCommit: (id: string, startOffsetMs: number) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [draftMs, setDraftMs] = useState(section.startOffsetMs);
  const draggingRef = useRef(false);

  // Re-sync to the committed value after a reload, but never mid-drag.
  useEffect(() => {
    if (!draggingRef.current) setDraftMs(section.startOffsetMs);
  }, [section.startOffsetMs]);

  const leftPct = totalMs > 0 ? clamp((draftMs / totalMs) * 100, 0, 100) : 0;

  const fromPointer = (clientX: number) => {
    const rect = getRect();
    if (!rect) return section.startOffsetMs;
    const raw = boundaryMsFromPointer(clientX, rect, totalMs);
    const aligned = snap ? snapToTrackStart(raw, boundaries) : raw;
    return clampSectionStart(aligned, prevStartMs, nextStartMs, MIN_GAP_MS, totalMs);
  };

  const commit = async (next: number) => {
    if (next === section.startOffsetMs) return;
    try {
      await onCommit(section.id, next);
    } catch (e) {
      setDraftMs(section.startOffsetMs); // revert; server stays authoritative
      onError((e as Error).message);
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    setDraftMs(fromPointer(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDraftMs(fromPointer(e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const final = fromPointer(e.clientX);
    setDraftMs(final);
    void commit(final);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5000 : 1000;
    const set = (raw: number) => {
      e.preventDefault();
      setDraftMs(clampSectionStart(raw, prevStartMs, nextStartMs, MIN_GAP_MS, totalMs));
    };
    // Under snap, arrows jump between track boundaries (keyboard-accessible
    // snapping); otherwise they nudge by 1s (5s with Shift).
    const stepRight = () => set(snap ? adjacentBoundary(draftMs, boundaries, 1) : draftMs + step);
    const stepLeft = () => set(snap ? adjacentBoundary(draftMs, boundaries, -1) : draftMs - step);
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        return stepRight();
      case 'ArrowLeft':
      case 'ArrowDown':
        return stepLeft();
      case 'Home':
        return set(0);
      case 'End':
        return set(totalMs);
      case 'Enter':
        e.preventDefault();
        return void commit(draftMs);
      default:
        return undefined;
    }
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={`${SEGMENT_META[section.type].label} start`}
      aria-valuemin={prevStartMs ?? 0}
      aria-valuemax={nextStartMs ?? Math.round(totalMs)}
      aria-valuenow={Math.round(draftMs)}
      aria-valuetext={formatDuration(draftMs)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      onBlur={() => void commit(draftMs)}
      style={{ left: `${leftPct}%` }}
      className="absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize touch-none items-stretch justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
    >
      <span aria-hidden className="w-0.5 bg-interactive" />
    </div>
  );
}

function SegmentEditor({
  classId,
  sections,
  onChanged,
  onError,
}: {
  classId: string;
  sections: ClassSection[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [type, setType] = useState<SegmentType>('warm_up');
  const [startSec, setStartSec] = useState('0');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<SegmentType>('warm_up');
  const [editStartSec, setEditStartSec] = useState('0');

  const add = async () => {
    setBusy(true);
    try {
      await createSection(classId, { type, startOffsetMs: secToMs(startSec) });
      setStartSec('0');
      await onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (s: ClassSection) => {
    setEditingId(s.id);
    setEditType(s.type);
    setEditStartSec(msToSec(s.startOffsetMs));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusy(true);
    try {
      await updateSection(editingId, { type: editType, startOffsetMs: secToMs(editStartSec) });
      setEditingId(null);
      await onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteSection(id);
      await onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const typeOptions = segmentTypeValues.map((v) => (
    <option key={v} value={v}>
      {SEGMENT_META[v].label}
    </option>
  ));
  const fieldClass =
    'rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-ui text-sm text-text-primary';

  return (
    <div className="flex flex-col gap-2">
      {sections.length > 0 && (
        <ul className="flex flex-col gap-1">
          {[...sections]
            .sort((a, b) => a.startOffsetMs - b.startOffsetMs)
            .map((s) =>
              editingId === s.id ? (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-card bg-bg-raised px-3 py-2"
                >
                  <input
                    className={`w-20 ${fieldClass} font-data`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={editStartSec}
                    onChange={(e) => setEditStartSec(e.target.value)}
                    aria-label="Segment start in seconds"
                  />
                  <select
                    className={fieldClass}
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as SegmentType)}
                    aria-label="Segment type"
                  >
                    {typeOptions}
                  </select>
                  <button
                    className="shrink-0 font-ui text-xs text-interactive disabled:opacity-40"
                    onClick={saveEdit}
                    disabled={busy}
                  >
                    Save
                  </button>
                  <button
                    className="shrink-0 font-ui text-xs text-text-tertiary disabled:opacity-40"
                    onClick={() => setEditingId(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </li>
              ) : (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-pill bg-bg-raised px-3 py-1.5"
                >
                  <span aria-hidden style={{ color: SEGMENT_META[s.type].tint }}>
                    <SegmentIcon type={s.type} />
                  </span>
                  <span className="shrink-0 font-data text-xs text-text-tertiary">
                    {msToSec(s.startOffsetMs)}s
                  </span>
                  <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary">
                    {SEGMENT_META[s.type].label}
                  </span>
                  <button
                    className="shrink-0 font-ui text-xs text-interactive disabled:opacity-40"
                    onClick={() => startEdit(s)}
                    disabled={busy}
                    aria-label={`Edit ${SEGMENT_META[s.type].label} segment`}
                  >
                    Edit
                  </button>
                  <button
                    className="shrink-0 font-ui text-xs text-text-tertiary hover:text-state-danger disabled:opacity-40"
                    onClick={() => remove(s.id)}
                    disabled={busy}
                    aria-label={`Delete ${SEGMENT_META[s.type].label} segment`}
                  >
                    Delete
                  </button>
                </li>
              ),
            )}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`w-20 ${fieldClass} font-data`}
          type="number"
          min={0}
          inputMode="numeric"
          value={startSec}
          onChange={(e) => setStartSec(e.target.value)}
          aria-label="New segment start in seconds"
        />
        <select
          className={fieldClass}
          value={type}
          onChange={(e) => setType(e.target.value as SegmentType)}
          aria-label="New segment type"
        >
          {typeOptions}
        </select>
        <button
          className="shrink-0 rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive disabled:opacity-40"
          onClick={add}
          disabled={busy}
        >
          Add segment
        </button>
      </div>
    </div>
  );
}
