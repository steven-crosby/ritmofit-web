/**
 * The segment band (design system `09-class-builder-guidelines.md`, `02-color-system.md`):
 * Warm-up → Climb → Sprint → Recovery → Cool-down bands under the timeline,
 * sharing its time axis. Each section is time-anchored (`startOffsetMs`) and runs
 * to the next section's start (or the class end); bands tile the timeline. The
 * segment **type** is identified by **label + a tint** (never color alone, 02).
 *
 * Renders from the granular `/classes/:id/sections` (which carry ids for editing);
 * the run-payload also ships `sections` for the live/iOS contract. Authoring is
 * edit-access-only: add / re-time / retype / delete.
 */
import { useCallback, useEffect, useState } from 'react';
import { segmentTypeValues, type ClassSection, type SegmentType } from '@ritmofit/shared';
import { listSections, createSection, updateSection, deleteSection } from '../lib/api.js';

/** Presentation for each fixed segment type: label + a reinforcing tint (02-color-system). */
export const SEGMENT_META: Record<SegmentType, { label: string; tint: string }> = {
  warm_up: { label: 'Warm-up', tint: 'var(--rf-color-segment-warmup)' }, // amber-400
  climb: { label: 'Climb', tint: 'var(--rf-color-segment-climb)' }, // copper-600
  sprint: { label: 'Sprint', tint: 'var(--rf-color-segment-sprint)' }, // ember-400
  recovery: { label: 'Recovery', tint: 'var(--rf-color-segment-recovery)' }, // violet-400
  cool_down: { label: 'Cool-down', tint: 'var(--rf-color-segment-cooldown)' }, // bone-400
};

export type SegmentBandSlice = {
  type: SegmentType;
  leftPct: number;
  widthPct: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

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
  onChanged,
}: {
  classId: string;
  totalDurationMs: number;
  canEdit: boolean;
  /** Parent reload (run-payload → ribbon/timeline + the live contract) after a change. */
  onChanged?: () => void;
}) {
  const [sections, setSections] = useState<ClassSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const bands = computeSegmentBands(sections ?? [], totalDurationMs);
  const hasBand = bands.length > 0;

  // Nothing to show and not editable → render nothing (keeps a view-only class clean).
  if (!hasBand && !canEdit) return null;

  const arc = bands.map((b) => SEGMENT_META[b.type].label).join(' → ');

  return (
    <figure className="mt-2 flex flex-col gap-1">
      <figcaption className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
        Segments
      </figcaption>
      {hasBand ? (
        <div
          className="relative h-6 w-full overflow-hidden rounded-card bg-bg-base"
          role="img"
          aria-label={`Segments: ${arc}`}
        >
          {bands.map((b, i) => (
            <div
              key={i}
              className="absolute top-0 flex h-full items-center gap-1 overflow-hidden px-1.5"
              style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
            >
              {/* tint dot + label — type read by label, color only reinforces (02). */}
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: SEGMENT_META[b.type].tint }}
              />
              <span className="truncate font-ui text-[11px] text-text-secondary">
                {SEGMENT_META[b.type].label}
              </span>
            </div>
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
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SEGMENT_META[s.type].tint }}
                  />
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
