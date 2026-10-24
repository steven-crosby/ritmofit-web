/**
 * Cue + placed-move authoring for the selected track (design system
 * `09-class-builder-guidelines.md`: cues and moves are separate concepts, both
 * anchored to a class_track by `anchorMs`). Cues are an ordered teaching list:
 * move name, duration, BPM she sets, intensity (including Open), and a note.
 * The list starts empty. Nothing is copied from a recipe or from the track BPM.
 *
 * The run-payload's per-track cues/moves lack ids, so editing reads the real
 * `GET /class-tracks/:id/cues` + `/moves` (which carry ids).
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type Ref } from 'react';
import {
  cueIntensityValues,
  intensityValues,
  snapToBeat,
  beatPositionAt,
  type Cue,
  type CueIntensity,
  type ClassTrackMove,
  type ClassTemplate,
  type Move,
  type UserMove,
  type Intensity,
  type PlaceClassTrackMove,
} from '@ritmofit/shared';
import {
  listCues,
  createCue,
  updateCue,
  deleteCue,
  listPlacedMoves,
  placeMove,
  updatePlacedMove,
  deletePlacedMove,
  listMoves,
  listUserMoves,
  createUserMove,
} from '../lib/api.js';
import { IntensityReadout, INTENSITY_LABEL } from './IntensityReadout.js';
import { CUE_COLOR_TAGS, tagLabel } from '../lib/cue-colors.js';
import { CUSTOM, NEW, parseMovePick, pickForPlacement } from '../lib/move-pick.js';
import { groupMovesByTemplate, moveOptionLabel } from '../lib/move-groups.js';
import { formatTemplateLabel } from '../lib/class-summary.js';
import { CustomMovesDialog } from './CustomMovesDialog.js';
import { anchorFieldState, formatClockFromMs } from '../lib/duration.js';
import {
  CUE_INTENSITY_LABEL,
  formatCueDurationInput,
  formatCueDurationLabel,
  parseCueBpm,
  parseCueDurationSeconds,
  parseCueIntensity,
} from '../lib/cue-list.js';
import { errMessage } from '../lib/errors.js';

type RowMutationFocus = { kind: 'edit'; id: string } | { kind: 'add' };
type PendingRowFocus = { target: RowMutationFocus; revision: number };

/** A later focus choice wins over delayed save/delete restoration, even if it later blurs. */
function useFocusRevision() {
  const revision = useRef(0);
  useEffect(() => {
    const changed = () => {
      revision.current += 1;
    };
    document.addEventListener('focusin', changed);
    return () => document.removeEventListener('focusin', changed);
  }, []);
  return revision;
}

/** Prefer the next row, then the previous row, then the section's add control. */
function focusAfterRowDelete<T extends { id: string }>(
  rows: T[] | null,
  id: string,
): RowMutationFocus {
  const index = rows?.findIndex((row) => row.id === id) ?? -1;
  const successor = index >= 0 ? (rows?.[index + 1] ?? rows?.[index - 1]) : null;
  return successor ? { kind: 'edit', id: successor.id } : { kind: 'add' };
}

/** "bar.beat" label for a track-relative anchor (e.g. "12.1"), or null without a tempo. */
function beatLabel(anchorMs: number, bpm: number | null, beatAnchorMs: number): string | null {
  const p = beatPositionAt(anchorMs, bpm, beatAnchorMs);
  return p && p.bar >= 1 ? `${p.bar}.${p.beat}` : null;
}

/**
 * Beat-snapping wiring shared by the cue + move sections: a "snap to beat" toggle
 * (defaulting on when a tempo is known) and a snapper that rounds a track-relative
 * anchor to the grid. Returns the anchor unchanged when snapping is off or there's
 * no tempo. A small reusable checkbox renders the toggle.
 */
function useBeatSnap(bpm: number | null, beatAnchorMs: number) {
  const canSnap = bpm != null && bpm > 0;
  const [snap, setSnap] = useState(canSnap);
  const maybeSnap = (anchorMs: number) =>
    snap && canSnap ? snapToBeat(anchorMs, bpm, beatAnchorMs).anchorMs : anchorMs;
  return { canSnap, snap, setSnap, maybeSnap };
}

function SnapToggle({
  canSnap,
  snap,
  onChange,
}: {
  canSnap: boolean;
  snap: boolean;
  onChange: (v: boolean) => void;
}) {
  if (!canSnap) return null;
  return (
    <label className="flex min-h-11 items-center gap-2 font-ui text-xs text-text-secondary">
      <input type="checkbox" checked={snap} onChange={(e) => onChange(e.target.checked)} />
      Snap to beat
    </label>
  );
}

/**
 * The moves library is a global read-only seed, so fetch it once per session and
 * share the promise — MovesSection mounts on every track selection, and refetching
 * the whole library each time is wasted work. A failed fetch clears the cache so a
 * later mount retries.
 */
let movesLibraryPromise: Promise<Move[]> | null = null;
function loadMovesLibrary(): Promise<Move[]> {
  if (!movesLibraryPromise) {
    movesLibraryPromise = listMoves().catch((e) => {
      movesLibraryPromise = null;
      throw e;
    });
  }
  return movesLibraryPromise;
}

const fieldClass =
  'min-h-11 rounded-control border border-interactive/30 bg-bg-sunken px-3 font-ui text-sm text-text-primary sm:rounded-pill';
// Anchor inputs take `m:ss` (parsed + bounded to the track length via
// `anchorFieldState`), matching the Duration/Trim fields and the row display; an
// out-of-range or malformed value is caught client-side rather than as a 422.
const anchorInputClass = (invalid: boolean) =>
  `w-20 ${fieldClass} font-data ${invalid ? 'border-state-danger' : ''}`;

/** A request to focus a cue/move row (from a timeline marker click). */
export type RowFocus = { id: string; anchorMs: number; nonce: number } | null;

/**
 * Which row a focus targets: prefer an exact **id** match (run-payload cues/moves
 * carry stable ids), falling back to the first row at the same `anchorMs` — for a
 * legacy payload without ids, or an id that has since changed. Pure + unit-tested:
 * two cues/moves sharing an `anchorMs` now disambiguate by id.
 */
export function resolveFlashRowId(
  rows: ReadonlyArray<{ id: string; anchorMs: number }>,
  target: { id: string; anchorMs: number } | null,
): string | null {
  if (!target) return null;
  if (rows.some((r) => r.id === target.id)) return target.id;
  return rows.find((r) => r.anchorMs === target.anchorMs)?.id ?? null;
}

/**
 * Flash + scroll a cue/move row into view when a timeline marker targets it.
 * Correlation is by row **id** (with an `anchorMs` fallback — see `resolveFlashRowId`).
 * Gates until the section's rows have loaded, so a focus that arrives before the
 * fetch still fires; the `nonce` re-triggers on a repeat marker click. Returns the
 * id to ring (transient, ~1.6s), the id to attach the scroll ref to, and that ref.
 */
function useFlashFocus(
  focus: RowFocus,
  rows: ReadonlyArray<{ id: string; anchorMs: number }> | null,
) {
  const ready = rows != null;
  const [flashTarget, setFlashTarget] = useState<{ id: string; anchorMs: number } | null>(null);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const nonce = focus?.nonce;
  useEffect(() => {
    if (!focus || !ready) return;
    setFlashTarget({ id: focus.id, anchorMs: focus.anchorMs });
    const raf = requestAnimationFrame(() => rowRef.current?.scrollIntoView({ block: 'nearest' }));
    const clear = setTimeout(() => setFlashTarget(null), 1600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clear);
    };
    // Intentionally keyed on the marker nonce + readiness only: re-flash on a new
    // marker click, or once the rows have loaded — not on every focus read.
  }, [nonce, ready]);
  // The scroll ref attaches as soon as `focus` arrives (so the effect's
  // scrollIntoView lands); the ring follows the transient `flashTarget`.
  const refRowId = resolveFlashRowId(
    rows ?? [],
    focus ? { id: focus.id, anchorMs: focus.anchorMs } : null,
  );
  const flashRowId = resolveFlashRowId(rows ?? [], flashTarget);
  return { refRowId, flashRowId, rowRef };
}

// ── Cues ─────────────────────────────────────────────────────────────────────

/**
 * Cue color tag picker (design system `02-color-system.md`): a None option plus
 * the rationed copper/cyan/amber/ember/bone palette — never plasma. A labelled
 * group of `aria-pressed` toggle buttons (each Tab-focusable and operable — not
 * the arrow-key radio pattern); each swatch carries a text label (aria + title),
 * and the selected one shows the cyan interactive ring, so the choice never
 * rests on color alone. A stored color outside the palette (legacy/custom)
 * renders as a trailing "current" swatch so editing + Save never silently drops it.
 */
function CueColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (hex: string | null) => void;
}) {
  const inPalette =
    value != null && CUE_COLOR_TAGS.some((t) => t.hex.toLowerCase() === value.toLowerCase());
  return (
    <div role="group" aria-label="Cue color tag" className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={value == null}
        aria-label="No color"
        title="No color"
        onClick={() => onChange(null)}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-interactive/40 text-[10px] leading-none text-text-tertiary ${
          value == null ? 'ring-2 ring-interactive' : ''
        }`}
      >
        ∅
      </button>
      {CUE_COLOR_TAGS.map((t) => {
        const selected = value != null && value.toLowerCase() === t.hex.toLowerCase();
        return (
          <button
            key={t.hex}
            type="button"
            aria-pressed={selected}
            aria-label={t.name}
            title={t.name}
            onClick={() => onChange(t.hex)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
          >
            <span
              aria-hidden
              style={{ backgroundColor: t.hex }}
              className={`h-5 w-5 rounded-full ${selected ? 'ring-2 ring-interactive ring-offset-1 ring-offset-bg-base' : ''}`}
            />
          </button>
        );
      })}
      {value != null && !inPalette && (
        <button
          type="button"
          aria-pressed
          aria-label="Current custom color"
          title={value}
          onClick={() => onChange(value)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
        >
          <span
            aria-hidden
            style={{ backgroundColor: value }}
            className="h-5 w-5 rounded-full ring-2 ring-interactive ring-offset-1 ring-offset-bg-base"
          />
        </button>
      )}
    </div>
  );
}

const labelClass = 'font-ui text-xs uppercase tracking-wide text-text-tertiary';

/**
 * Move, duration, BPM, intensity, and note for one cue draft. The time anchor
 * stays outside this cluster so the existing timeline placement is unchanged.
 * Fields start empty — this does not copy the track BPM or a recipe line.
 */
function CueListFields({
  move,
  onMove,
  moveRef,
  autoFocus = false,
  duration,
  onDuration,
  durationRef,
  durationInvalid,
  durationMessage,
  durationMessageId,
  bpm,
  onBpm,
  bpmRef,
  bpmInvalid,
  bpmMessage,
  bpmMessageId,
  intensity,
  onIntensity,
  note,
  onNote,
}: {
  move: string;
  onMove: (value: string) => void;
  moveRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  duration: string;
  onDuration: (value: string) => void;
  durationRef?: Ref<HTMLInputElement>;
  durationInvalid: boolean;
  durationMessage: string | null;
  durationMessageId?: string;
  bpm: string;
  onBpm: (value: string) => void;
  bpmRef?: Ref<HTMLInputElement>;
  bpmInvalid: boolean;
  bpmMessage: string | null;
  bpmMessageId?: string;
  intensity: CueIntensity | '';
  onIntensity: (value: CueIntensity | '') => void;
  note: string;
  onNote: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-full flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Move name</span>
        <input
          ref={moveRef}
          className={`min-w-0 ${fieldClass}`}
          value={move}
          onChange={(e) => onMove(e.target.value)}
          aria-label="Move name"
          autoFocus={autoFocus}
        />
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Duration</span>
            <input
              ref={durationRef}
              className={`${fieldClass} font-data ${durationInvalid ? 'border-state-danger' : ''}`}
              type="text"
              inputMode="numeric"
              value={duration}
              onChange={(e) => onDuration(e.target.value)}
              aria-label="Duration (seconds)"
              aria-invalid={durationInvalid || undefined}
              aria-describedby={durationMessage ? durationMessageId : undefined}
            />
          </label>
          <span className="font-ui text-xs text-text-tertiary">Seconds</span>
          {durationMessage && (
            <p id={durationMessageId} className="font-ui text-xs text-state-danger" role="alert">
              {durationMessage}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>BPM</span>
            <input
              ref={bpmRef}
              className={`${fieldClass} font-data ${bpmInvalid ? 'border-state-danger' : ''}`}
              type="text"
              inputMode="numeric"
              value={bpm}
              onChange={(e) => onBpm(e.target.value)}
              aria-label="Cue BPM"
              aria-invalid={bpmInvalid || undefined}
              aria-describedby={bpmMessage ? bpmMessageId : undefined}
            />
          </label>
          <span className="font-ui text-xs text-text-tertiary">Set on this cue</span>
          {bpmMessage && (
            <p id={bpmMessageId} className="font-ui text-xs text-state-danger" role="alert">
              {bpmMessage}
            </p>
          )}
        </div>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Intensity</span>
          <select
            className={fieldClass}
            value={intensity}
            onChange={(e) => onIntensity(parseCueIntensity(e.target.value) ?? '')}
            aria-label="Intensity"
          >
            <option value="">Not set</option>
            {cueIntensityValues.map((value) => (
              <option key={value} value={value}>
                {CUE_INTENSITY_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Note</span>
        <input
          className={`min-w-0 ${fieldClass}`}
          value={note}
          onChange={(e) => onNote(e.target.value)}
          aria-label="Note"
        />
      </label>
    </div>
  );
}

function cueCountMessage(
  result: { ok: true; value: number | null } | { ok: false; message: string },
): string | null {
  return result.ok ? null : result.message;
}

export function CuesSection({
  classTrackId,
  durationMs,
  bpm = null,
  beatAnchorMs = 0,
  focus = null,
  startEntryNonce = 0,
  onChanged,
}: {
  classTrackId: string;
  durationMs: number | null;
  /** Resolved BPM + downbeat offset for beat-snapping (no snapping without a tempo). */
  bpm?: number | null;
  beatAnchorMs?: number;
  focus?: RowFocus;
  /**
   * Bumped when readiness sends the instructor here to write their first cue:
   * bring the entry row into view and put the caret in it. A nonce rather than a
   * boolean so asking twice works.
   */
  startEntryNonce?: number;
  /** Refresh run-payload-derived readiness and timeline after cue mutations. */
  onChanged?: () => void;
}) {
  const { canSnap, snap, setSnap, maybeSnap } = useBeatSnap(bpm, beatAnchorMs);
  const [cues, setCues] = useState<Cue[] | null>(null);
  const { refRowId, flashRowId, rowRef } = useFlashFocus(focus, cues);
  const [text, setText] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [cueBpm, setCueBpm] = useState('');
  const [intensity, setIntensity] = useState<CueIntensity | ''>('');
  const [note, setNote] = useState('');
  const [anchorClock, setAnchorClock] = useState('0:00');
  const [color, setColor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline edit: at most one cue editable at a time, seeded from the persisted row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDurationSeconds, setEditDurationSeconds] = useState('');
  const [editCueBpm, setEditCueBpm] = useState('');
  const [editIntensity, setEditIntensity] = useState<CueIntensity | ''>('');
  const [editNote, setEditNote] = useState('');
  const [editAnchorClock, setEditAnchorClock] = useState('0:00');
  const [editColor, setEditColor] = useState<string | null>(null);
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const addAnchorRef = useRef<HTMLInputElement>(null);
  const addTextRef = useRef<HTMLInputElement>(null);
  const addDurationRef = useRef<HTMLInputElement>(null);
  const addBpmRef = useRef<HTMLInputElement>(null);
  const editAnchorRef = useRef<HTMLInputElement>(null);
  const editDurationRef = useRef<HTMLInputElement>(null);
  const editBpmRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [pendingFocus, setPendingFocus] = useState<PendingRowFocus | null>(null);
  const focusRevision = useFocusRevision();
  const addRevision = useRef(0);
  const editRevision = useRef(0);
  const active = useRef(false);
  const loadRevision = useRef(0);
  const validationId = useId();

  const addAnchor = anchorFieldState(anchorClock, durationMs);
  const editAnchor = anchorFieldState(editAnchorClock, durationMs);
  const addDuration = parseCueDurationSeconds(durationSeconds);
  const addBpm = parseCueBpm(cueBpm);
  const editDuration = parseCueDurationSeconds(editDurationSeconds);
  const editBpm = parseCueBpm(editCueBpm);

  // Instant scroll, not smooth: this also has to land under
  // `prefers-reduced-motion`, and the arrival is the point, not the travel.
  useEffect(() => {
    if (startEntryNonce <= 0) return;
    // Optional: jsdom has no scrollIntoView, and reduced-motion still needs
    // the caret to land without a travel animation.
    sectionRef.current?.scrollIntoView?.({ block: 'center' });
    addTextRef.current?.focus();
  }, [startEntryNonce]);

  useEffect(() => {
    if (!pendingFocus) return;
    if (pendingFocus.revision !== focusRevision.current) {
      setPendingFocus(null);
      return;
    }
    const target =
      pendingFocus.target.kind === 'edit'
        ? editButtonRefs.current.get(pendingFocus.target.id)
        : addAnchorRef.current;
    if (!target) return;
    target.focus();
    setPendingFocus(null);
  }, [pendingFocus, cues, editingId, focusRevision]);

  const load = useCallback(async () => {
    if (!active.current) return;
    const revision = ++loadRevision.current;
    try {
      const rows = await listCues(classTrackId);
      if (active.current && revision === loadRevision.current) setCues(rows);
    } catch (e) {
      if (active.current && revision === loadRevision.current) {
        setError(errMessage(e, 'Could not load cues. Try again.'));
      }
    }
  }, [classTrackId]);
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
      loadRevision.current += 1;
    };
  }, [load]);

  const startEdit = (cue: Cue) => {
    setEditingId(cue.id);
    setEditText(cue.text);
    setEditDurationSeconds(formatCueDurationInput(cue.durationMs));
    setEditCueBpm(cue.bpm == null ? '' : String(cue.bpm));
    setEditIntensity(cue.intensity ?? '');
    setEditNote(cue.note ?? '');
    setEditAnchorClock(formatClockFromMs(cue.anchorMs));
    setEditColor(cue.color);
    setError(null);
  };

  const saveEdit = async () => {
    const anchorMs = editAnchor.ms;
    if (!editingId || !editText.trim() || anchorMs == null || !editDuration.ok || !editBpm.ok) {
      if (anchorMs == null) editAnchorRef.current?.focus();
      else if (!editDuration.ok) editDurationRef.current?.focus();
      else if (!editBpm.ok) editBpmRef.current?.focus();
      return;
    }
    const savedId = editingId;
    const submittedRevision = editRevision.current;
    const submittedFocus = focusRevision.current;
    setBusy(true);
    setError(null);
    try {
      // Always send the builder fields (including null) so a cleared duration,
      // BPM, intensity, note, or color persists. An omitted field would leave
      // the old value.
      await updateCue(editingId, {
        anchorMs: maybeSnap(anchorMs),
        text: editText.trim(),
        durationMs: editDuration.value,
        bpm: editBpm.value,
        intensity: editIntensity === '' ? null : editIntensity,
        note: editNote.trim() ? editNote.trim() : null,
        color: editColor,
      });
      if (!active.current) return;
      const draftUnchanged = editRevision.current === submittedRevision;
      if (draftUnchanged) setEditingId(null);
      await load();
      if (!active.current) return;
      if (draftUnchanged) {
        setPendingFocus({ target: { kind: 'edit', id: savedId }, revision: submittedFocus });
      }
      onChanged?.();
    } catch (e) {
      if (active.current) setError(errMessage(e, 'Could not save the cue. Try again.'));
    } finally {
      if (active.current) setBusy(false);
    }
  };

  const add = async () => {
    const anchorMs = addAnchor.ms;
    if (!text.trim() || anchorMs == null || !addDuration.ok || !addBpm.ok) {
      if (anchorMs == null) addAnchorRef.current?.focus();
      else if (!addDuration.ok) addDurationRef.current?.focus();
      else if (!addBpm.ok) addBpmRef.current?.focus();
      return;
    }
    const submittedRevision = addRevision.current;
    setBusy(true);
    setError(null);
    try {
      // BPM is only what she typed. The track tempo (`bpm`) is for beat
      // snapping and is never copied onto the cue.
      await createCue(classTrackId, {
        anchorMs: maybeSnap(anchorMs),
        text: text.trim(),
        durationMs: addDuration.value,
        bpm: addBpm.value,
        intensity: intensity === '' ? null : intensity,
        note: note.trim() ? note.trim() : null,
        color,
      });
      if (!active.current) return;
      if (addRevision.current === submittedRevision) {
        setText('');
        setDurationSeconds('');
        setCueBpm('');
        setIntensity('');
        setNote('');
        setAnchorClock('0:00');
        setColor(null);
      }
      await load();
      if (active.current) onChanged?.();
    } catch (e) {
      if (active.current) setError(errMessage(e, 'Could not add the cue. Try again.'));
    } finally {
      if (active.current) setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const nextFocus = focusAfterRowDelete(cues, id);
    const submittedFocus = focusRevision.current;
    setBusy(true);
    setError(null);
    try {
      await deleteCue(id);
      if (!active.current) return;
      await load();
      if (!active.current) return;
      setPendingFocus({ target: nextFocus, revision: submittedFocus });
      onChanged?.();
    } catch (e) {
      if (active.current) setError(errMessage(e, 'Could not delete the cue. Try again.'));
    } finally {
      if (active.current) setBusy(false);
    }
  };

  return (
    <div ref={sectionRef} className="flex flex-col gap-2">
      <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Cues</span>
      <ul className="flex flex-col gap-1">
        {cues?.length === 0 && <li className="font-ui text-xs text-text-tertiary">No cues yet.</li>}
        {cues?.map((cue) =>
          editingId === cue.id ? (
            <li
              key={cue.id}
              onChangeCapture={() => {
                editRevision.current += 1;
              }}
              className="flex flex-wrap items-center gap-2 rounded-card bg-bg-raised px-3 py-2"
            >
              <CueListFields
                move={editText}
                onMove={setEditText}
                autoFocus
                duration={editDurationSeconds}
                onDuration={setEditDurationSeconds}
                durationRef={editDurationRef}
                durationInvalid={!editDuration.ok}
                durationMessage={cueCountMessage(editDuration)}
                durationMessageId={`${validationId}-edit-duration`}
                bpm={editCueBpm}
                onBpm={setEditCueBpm}
                bpmRef={editBpmRef}
                bpmInvalid={!editBpm.ok}
                bpmMessage={cueCountMessage(editBpm)}
                bpmMessageId={`${validationId}-edit-bpm`}
                intensity={editIntensity}
                onIntensity={setEditIntensity}
                note={editNote}
                onNote={setEditNote}
              />
              <input
                ref={editAnchorRef}
                className={anchorInputClass(editAnchor.invalid)}
                type="text"
                inputMode="numeric"
                placeholder="m:ss"
                value={editAnchorClock}
                onChange={(e) => setEditAnchorClock(e.target.value)}
                aria-label="Cue time (m:ss)"
                aria-invalid={editAnchor.invalid || undefined}
                aria-describedby={editAnchor.message ? `${validationId}-edit-anchor` : undefined}
                title="Cue time (m:ss)"
              />
              <CueColorPicker
                value={editColor}
                onChange={(value) => {
                  editRevision.current += 1;
                  setEditColor(value);
                }}
              />
              <button
                className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-interactive disabled:opacity-40"
                onClick={saveEdit}
                disabled={busy || !editText.trim()}
              >
                Save
              </button>
              <button
                className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-text-tertiary disabled:opacity-40"
                onClick={() => {
                  const cancelledId = editingId;
                  setEditingId(null);
                  if (cancelledId) {
                    setPendingFocus({
                      target: { kind: 'edit', id: cancelledId },
                      revision: focusRevision.current,
                    });
                  }
                }}
                disabled={busy}
              >
                Cancel
              </button>
              {editAnchor.message && (
                <p
                  id={`${validationId}-edit-anchor`}
                  className="basis-full font-ui text-xs text-state-danger"
                  role="alert"
                >
                  {editAnchor.message}
                </p>
              )}
            </li>
          ) : (
            <li
              key={cue.id}
              ref={cue.id === refRowId ? rowRef : undefined}
              className={`flex flex-col gap-1 rounded-card bg-bg-raised px-3 py-2 ${
                cue.id === flashRowId ? 'ring-2 ring-interactive' : ''
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* Color tag — decorative reinforcement; the move name carries the meaning. */}
                {cue.color && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cue.color }}
                    title={`${tagLabel(cue.color) ?? 'Color'} tag`}
                    aria-hidden
                  />
                )}
                <span className="shrink-0 font-data text-xs text-text-tertiary">
                  {formatClockFromMs(cue.anchorMs)}
                </span>
                {beatLabel(cue.anchorMs, bpm, beatAnchorMs) && (
                  <span
                    className="shrink-0 rounded-pill bg-bg-base px-1.5 font-data text-[10px] text-text-tertiary"
                    title={`Bar ${beatLabel(cue.anchorMs, bpm, beatAnchorMs)?.split('.')[0]}, beat ${beatLabel(cue.anchorMs, bpm, beatAnchorMs)?.split('.')[1]}`}
                  >
                    {beatLabel(cue.anchorMs, bpm, beatAnchorMs)}
                  </span>
                )}
                <span className="min-w-0 flex-1 break-words font-ui text-sm text-text-primary">
                  {cue.text}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-ui text-xs text-text-secondary">
                <span>
                  Duration{' '}
                  <span className="font-data text-text-primary">
                    {formatCueDurationLabel(cue.durationMs) ?? '—'}
                  </span>
                </span>
                <span>
                  <span className="font-data text-text-primary">
                    {cue.bpm == null ? 'BPM —' : `${cue.bpm} BPM`}
                  </span>
                </span>
                <span>
                  Intensity{' '}
                  <span className="font-data text-text-primary">
                    {cue.intensity ? CUE_INTENSITY_LABEL[cue.intensity] : '—'}
                  </span>
                </span>
              </div>
              {cue.note ? (
                <p className="break-words font-ui text-sm text-text-primary">
                  <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                    Note{' '}
                  </span>
                  <span>{cue.note}</span>
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <button
                  ref={(node) => {
                    if (node) editButtonRefs.current.set(cue.id, node);
                    else editButtonRefs.current.delete(cue.id);
                  }}
                  className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-interactive disabled:opacity-40"
                  onClick={() => startEdit(cue)}
                  disabled={busy}
                  aria-label={`Edit cue ${cue.text}`}
                >
                  Edit
                </button>
                <button
                  className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-state-danger disabled:opacity-40"
                  onClick={() => remove(cue.id)}
                  disabled={busy}
                  aria-label={`Delete cue ${cue.text}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
      <div
        className="flex flex-col gap-2"
        onChangeCapture={() => {
          addRevision.current += 1;
        }}
      >
        <CueListFields
          move={text}
          onMove={setText}
          moveRef={addTextRef}
          duration={durationSeconds}
          onDuration={setDurationSeconds}
          durationRef={addDurationRef}
          durationInvalid={durationSeconds.trim() !== '' && !addDuration.ok}
          durationMessage={durationSeconds.trim() ? cueCountMessage(addDuration) : null}
          durationMessageId={`${validationId}-add-duration`}
          bpm={cueBpm}
          onBpm={setCueBpm}
          bpmRef={addBpmRef}
          bpmInvalid={cueBpm.trim() !== '' && !addBpm.ok}
          bpmMessage={cueBpm.trim() ? cueCountMessage(addBpm) : null}
          bpmMessageId={`${validationId}-add-bpm`}
          intensity={intensity}
          onIntensity={setIntensity}
          note={note}
          onNote={setNote}
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Time</span>
            <input
              ref={addAnchorRef}
              className={anchorInputClass(addAnchor.invalid)}
              type="text"
              inputMode="numeric"
              placeholder="m:ss"
              value={anchorClock}
              onChange={(e) => setAnchorClock(e.target.value)}
              aria-label="Cue time (m:ss)"
              aria-invalid={addAnchor.invalid || undefined}
              aria-describedby={addAnchor.message ? `${validationId}-add-anchor` : undefined}
              title="Cue time (m:ss)"
            />
          </label>
          <button
            className="min-h-11 shrink-0 rounded-control border border-interactive px-3 font-ui text-sm text-interactive disabled:opacity-40 sm:rounded-pill"
            onClick={add}
            disabled={busy || !text.trim()}
          >
            Add cue
          </button>
        </div>
        {addAnchor.message && (
          <p
            id={`${validationId}-add-anchor`}
            className="font-ui text-xs text-state-danger"
            role="alert"
          >
            {addAnchor.message}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CueColorPicker
            value={color}
            onChange={(value) => {
              addRevision.current += 1;
              setColor(value);
            }}
          />
          <SnapToggle canSnap={canSnap} snap={snap} onChange={setSnap} />
        </div>
      </div>
      {error && (
        <p className="font-ui text-xs text-state-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Placed moves ──────────────────────────────────────────────────────────────

export function MovesSection({
  classTrackId,
  durationMs,
  template = null,
  bpm = null,
  beatAnchorMs = 0,
  focus = null,
  onChanged,
  onOpenSongsByMove,
}: {
  classTrackId: string;
  durationMs: number | null;
  /** The open class's discipline — its moves lead the picker (P1-04). */
  template?: ClassTemplate | null;
  /** Resolved BPM + downbeat offset for beat-snapping (no snapping without a tempo). */
  bpm?: number | null;
  beatAnchorMs?: number;
  focus?: RowFocus;
  /** Parent reload (run-payload → ribbon/timeline) after the custom-move library changes. */
  onChanged?: () => void;
  /** Open the Songs-by-Move dialog — recall songs choreographed with a move. */
  onOpenSongsByMove?: () => void;
}) {
  const { canSnap, snap, setSnap, maybeSnap } = useBeatSnap(bpm, beatAnchorMs);
  const [moves, setMoves] = useState<ClassTrackMove[] | null>(null);
  const [managing, setManaging] = useState(false);
  const { refRowId, flashRowId, rowRef } = useFlashFocus(focus, moves);
  const [library, setLibrary] = useState<Move[]>([]);
  // The caller's reusable custom moves. Unlike the read-only library these mutate
  // (creating one here), so they're component state refreshed on demand, not the
  // session-cached library promise.
  const [userMoves, setUserMoves] = useState<UserMove[]>([]);
  // Other disciplines start collapsed behind an explicit control rather than
  // hidden; once opened it stays open for the session's editing run.
  const [showAllDisciplines, setShowAllDisciplines] = useState(false);
  const [pick, setPick] = useState<string>(CUSTOM); // CUSTOM | NEW | m:<id> | u:<id>
  const [customName, setCustomName] = useState(''); // freeform name (CUSTOM) or new-move name (NEW)
  const [anchorClock, setAnchorClock] = useState('0:00');
  const [intensity, setIntensity] = useState<Intensity | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline edit: at most one placement editable at a time, seeded from the row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPick, setEditPick] = useState<string>(CUSTOM); // CUSTOM | m:<id> | u:<id>
  const [editCustom, setEditCustom] = useState('');
  const [editAnchorClock, setEditAnchorClock] = useState('0:00');
  const [editIntensity, setEditIntensity] = useState<Intensity | ''>('');
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const addAnchorRef = useRef<HTMLInputElement>(null);
  const editAnchorRef = useRef<HTMLInputElement>(null);
  const [pendingFocus, setPendingFocus] = useState<PendingRowFocus | null>(null);
  const focusRevision = useFocusRevision();
  const addRevision = useRef(0);
  const editRevision = useRef(0);
  const active = useRef(false);
  const loadRevision = useRef(0);
  const validationId = useId();

  const addAnchor = anchorFieldState(anchorClock, durationMs);
  const editAnchor = anchorFieldState(editAnchorClock, durationMs);

  useEffect(() => {
    if (!pendingFocus) return;
    if (pendingFocus.revision !== focusRevision.current) {
      setPendingFocus(null);
      return;
    }
    const target =
      pendingFocus.target.kind === 'edit'
        ? editButtonRefs.current.get(pendingFocus.target.id)
        : addAnchorRef.current;
    if (!target) return;
    target.focus();
    setPendingFocus(null);
  }, [pendingFocus, moves, editingId, focusRevision]);

  const load = useCallback(async () => {
    if (!active.current) return;
    const revision = ++loadRevision.current;
    try {
      const rows = await listPlacedMoves(classTrackId);
      if (active.current && revision === loadRevision.current) setMoves(rows);
    } catch (e) {
      if (active.current && revision === loadRevision.current) {
        setError(errMessage(e, 'Could not load moves. Try again.'));
      }
    }
  }, [classTrackId]);
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
      loadRevision.current += 1;
    };
  }, [load]);
  useEffect(() => {
    void loadMovesLibrary()
      .then((rows) => {
        if (active.current) setLibrary(rows);
      })
      .catch(() => {
        if (active.current) setLibrary([]);
      });
  }, []);
  const userMovesRevision = useRef(0);
  const loadUserMoves = useCallback(async () => {
    if (!active.current) return;
    const revision = ++userMovesRevision.current;
    try {
      const rows = await listUserMoves();
      if (active.current && revision === userMovesRevision.current) setUserMoves(rows);
    } catch {
      if (active.current && revision === userMovesRevision.current) setUserMoves([]);
    }
  }, []);
  useEffect(() => {
    void loadUserMoves();
  }, [loadUserMoves]);

  /** Resolve a placement's display name: freeform override → library → user move. */
  const nameOf = (m: ClassTrackMove) =>
    m.nameOverride ??
    library.find((lib) => lib.id === m.moveId)?.name ??
    userMoves.find((u) => u.id === m.userMoveId)?.name ??
    '(move)';

  /**
   * The discipline a placed library move belongs to. Custom moves and one-off
   * names have none — the badge is for provenance, not decoration, so it simply
   * does not render for them.
   */
  const templateOf = (m: ClassTrackMove): string | null => {
    const move = library.find((lib) => lib.id === m.moveId);
    return move?.template ? (formatTemplateLabel(move.template) ?? move.template) : null;
  };

  /** The reference fields for a placement body from a parsed selector value. */
  const refFields = (
    value: string,
    name: string,
  ): { moveId?: string | null; userMoveId?: string | null; nameOverride?: string | null } => {
    const sel = parseMovePick(value);
    switch (sel.kind) {
      case 'library':
        return { moveId: sel.id, userMoveId: null, nameOverride: null };
      case 'user':
        return { userMoveId: sel.id, moveId: null, nameOverride: null };
      default: // 'custom' (NEW is resolved to a user move before this is called)
        return { nameOverride: name.trim(), moveId: null, userMoveId: null };
    }
  };

  // The picker option groups, shared by the add + edit selects.
  //
  // Grouped by discipline with this class's own first (PDR-03: group and demote,
  // never hide). A Cycle class used to offer Burpees, Press-Ups, and Crunches in
  // one flat alphabetical list of all 21 seeded moves. Other disciplines stay one
  // interaction away behind "Show every discipline" — collapsed, never removed,
  // because borrowing across disciplines is deliberate practice, not a mistake.
  const grouped = useMemo(() => groupMovesByTemplate(library, template), [library, template]);
  const ownGroup = template ? grouped.find((group) => group.template === template) : undefined;
  const otherGroups = grouped.filter((group) => group !== ownGroup);
  const visibleGroups = showAllDisciplines || !ownGroup ? grouped : [ownGroup];

  const moveOptionGroups = (
    <>
      {visibleGroups.map((group) => (
        <optgroup key={group.template ?? 'other'} label={group.label}>
          {group.moves.map((m) => (
            <option key={m.id} value={`m:${m.id}`}>
              {moveOptionLabel(m)}
            </option>
          ))}
        </optgroup>
      ))}
      {userMoves.length > 0 && (
        <optgroup label="Your moves">
          {userMoves.map((u) => (
            <option key={u.id} value={`u:${u.id}`}>
              {u.name}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  /** The disclosure that reaches the disciplines this class does not teach. */
  const disciplineToggle =
    ownGroup && otherGroups.length > 0 ? (
      <label className="flex min-h-11 shrink-0 items-center gap-1.5 font-ui text-xs text-text-secondary rf-focus-ring sm:min-h-8">
        <input
          type="checkbox"
          checked={showAllDisciplines}
          onChange={(e) => setShowAllDisciplines(e.target.checked)}
          className="h-4 w-4 accent-interactive"
        />
        Show every discipline
      </label>
    ) : null;

  const add = async () => {
    const sel = parseMovePick(pick);
    const needsName = sel.kind === 'custom' || sel.kind === 'new';
    const anchorMs = addAnchor.ms;
    if ((needsName && !customName.trim()) || anchorMs == null) {
      if (anchorMs == null) addAnchorRef.current?.focus();
      return;
    }
    const submittedRevision = addRevision.current;
    setBusy(true);
    setError(null);
    try {
      let ref: ReturnType<typeof refFields>;
      if (sel.kind === 'new') {
        // Create the reusable custom move, then place it by id; surface it in
        // "Your moves" and select it so a repeat Add re-uses (not re-creates) it.
        const created = await createUserMove({ name: customName.trim() });
        await loadUserMoves();
        if (active.current && addRevision.current === submittedRevision) setPick(`u:${created.id}`);
        ref = { userMoveId: created.id, moveId: null, nameOverride: null };
      } else {
        ref = refFields(pick, customName);
      }
      const body: PlaceClassTrackMove = {
        anchorMs: maybeSnap(anchorMs),
        intensity: intensity === '' ? null : intensity,
        ...ref,
      };
      await placeMove(classTrackId, body);
      if (!active.current) return;
      if (addRevision.current === submittedRevision) {
        setCustomName('');
        setAnchorClock('0:00');
        setIntensity('');
      }
      await load();
      if (active.current) onChanged?.();
    } catch (e) {
      if (active.current) setError(errMessage(e, 'Could not add the move. Try again.'));
    } finally {
      if (active.current) setBusy(false);
    }
  };

  const startEdit = (m: ClassTrackMove) => {
    setEditingId(m.id);
    setEditAnchorClock(formatClockFromMs(m.anchorMs));
    setEditIntensity(m.intensity ?? '');
    // Seed the selector from the placement's reference (library / user move / one-off).
    setEditPick(pickForPlacement(m.moveId, m.userMoveId));
    setEditCustom(m.moveId || m.userMoveId ? '' : (m.nameOverride ?? ''));
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const sel = parseMovePick(editPick);
    const anchorMs = editAnchor.ms;
    if ((sel.kind === 'custom' && !editCustom.trim()) || anchorMs == null) {
      if (anchorMs == null) editAnchorRef.current?.focus();
      return;
    }
    const savedId = editingId;
    const submittedRevision = editRevision.current;
    const submittedFocus = focusRevision.current;
    setBusy(true);
    setError(null);
    try {
      // Switching the reference nulls the others to hold the at-most-one invariant
      // (the server re-checks the merged result).
      await updatePlacedMove(editingId, {
        anchorMs: maybeSnap(anchorMs),
        intensity: editIntensity === '' ? null : editIntensity,
        ...refFields(editPick, editCustom),
      });
      if (!active.current) return;
      const draftUnchanged = editRevision.current === submittedRevision;
      if (draftUnchanged) setEditingId(null);
      await load();
      if (!active.current) return;
      if (draftUnchanged) {
        setPendingFocus({ target: { kind: 'edit', id: savedId }, revision: submittedFocus });
      }
      onChanged?.();
    } catch (e) {
      if (active.current) setError(errMessage(e, 'Could not save the move. Try again.'));
    } finally {
      if (active.current) setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const nextFocus = focusAfterRowDelete(moves, id);
    const submittedFocus = focusRevision.current;
    setBusy(true);
    setError(null);
    try {
      await deletePlacedMove(id);
      if (!active.current) return;
      await load();
      if (!active.current) return;
      setPendingFocus({ target: nextFocus, revision: submittedFocus });
      onChanged?.();
    } catch (e) {
      if (active.current) setError(errMessage(e, 'Could not delete the move. Try again.'));
    } finally {
      if (active.current) setBusy(false);
    }
  };

  // Whether the edit selector's current value is represented by an option. If the
  // library/user-moves fetch failed, a referenced id has no matching <option>, so
  // render a fallback so the display matches state (and Save preserves the id).
  // The add selector's parsed value: custom/new need a typed name.
  const addSel = parseMovePick(pick);
  const addNeedsName = addSel.kind === 'custom' || addSel.kind === 'new';

  const editSel = parseMovePick(editPick);
  const editKnown =
    editSel.kind === 'custom' ||
    (editSel.kind === 'library' && library.some((l) => l.id === editSel.id)) ||
    (editSel.kind === 'user' && userMoves.some((u) => u.id === editSel.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Moves</span>
        <div className="flex items-center gap-3">
          {onOpenSongsByMove && (
            <button
              type="button"
              className="min-h-11 rounded-control px-2 font-ui text-xs text-interactive"
              onClick={onOpenSongsByMove}
              title="Find songs you’ve choreographed with a move"
            >
              Songs by move…
            </button>
          )}
          <button
            type="button"
            className="min-h-11 rounded-control px-2 font-ui text-xs text-interactive"
            onClick={() => setManaging(true)}
          >
            Manage…
          </button>
        </div>
      </div>
      {managing && (
        <CustomMovesDialog
          onClose={() => setManaging(false)}
          onChanged={async () => {
            // Refresh the picker + this track's placements (a delete snapshots the
            // move name into placements), then reload the run-payload-derived views.
            await loadUserMoves();
            await load();
            if (active.current) onChanged?.();
          }}
        />
      )}
      <ul className="flex flex-col gap-1">
        {moves?.length === 0 && (
          <li className="font-ui text-xs text-text-tertiary">No moves yet.</li>
        )}
        {moves?.map((m) =>
          editingId === m.id ? (
            <li
              key={m.id}
              onChangeCapture={() => {
                editRevision.current += 1;
              }}
              className="flex flex-wrap items-center gap-2 rounded-card bg-bg-raised px-3 py-2"
            >
              <input
                ref={editAnchorRef}
                className={anchorInputClass(editAnchor.invalid)}
                type="text"
                inputMode="numeric"
                placeholder="m:ss"
                value={editAnchorClock}
                onChange={(e) => setEditAnchorClock(e.target.value)}
                aria-label="Move time (m:ss)"
                aria-invalid={editAnchor.invalid || undefined}
                aria-describedby={editAnchor.message ? `${validationId}-edit-anchor` : undefined}
                title="Move time (m:ss)"
              />
              <select
                className={`min-w-0 grow basis-48 ${fieldClass}`}
                value={editPick}
                onChange={(e) => setEditPick(e.target.value)}
                aria-label="Move"
              >
                {!editKnown && <option value={editPick}>Current move</option>}
                <option value={CUSTOM}>Custom (one-off)…</option>
                {moveOptionGroups}
              </select>
              {editSel.kind === 'custom' && (
                <input
                  className={`min-w-0 flex-1 ${fieldClass}`}
                  placeholder="Move name"
                  value={editCustom}
                  onChange={(e) => setEditCustom(e.target.value)}
                  aria-label="Custom move name"
                />
              )}
              <select
                className={fieldClass}
                value={editIntensity}
                onChange={(e) => setEditIntensity(e.target.value as Intensity | '')}
                aria-label="Move intensity (optional)"
              >
                <option value="">intensity —</option>
                {intensityValues.map((v) => (
                  <option key={v} value={v}>
                    {INTENSITY_LABEL[v]}
                  </option>
                ))}
              </select>
              <button
                className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-interactive disabled:opacity-40"
                onClick={saveEdit}
                disabled={busy || (editSel.kind === 'custom' && !editCustom.trim())}
              >
                Save
              </button>
              <button
                className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-text-tertiary disabled:opacity-40"
                onClick={() => {
                  const cancelledId = editingId;
                  setEditingId(null);
                  if (cancelledId) {
                    setPendingFocus({
                      target: { kind: 'edit', id: cancelledId },
                      revision: focusRevision.current,
                    });
                  }
                }}
                disabled={busy}
              >
                Cancel
              </button>
              {editAnchor.message && (
                <p
                  id={`${validationId}-edit-anchor`}
                  className="basis-full font-ui text-xs text-state-danger"
                  role="alert"
                >
                  {editAnchor.message}
                </p>
              )}
            </li>
          ) : (
            <li
              key={m.id}
              ref={m.id === refRowId ? rowRef : undefined}
              className={`flex items-center gap-2 rounded-pill bg-bg-raised px-3 py-1.5 ${
                m.id === flashRowId ? 'ring-2 ring-interactive' : ''
              }`}
            >
              <span className="shrink-0 font-data text-xs text-text-tertiary">
                {formatClockFromMs(m.anchorMs)}
              </span>
              {beatLabel(m.anchorMs, bpm, beatAnchorMs) && (
                <span
                  className="shrink-0 rounded-pill bg-bg-base px-1.5 font-data text-[10px] text-text-tertiary"
                  title={`Bar ${beatLabel(m.anchorMs, bpm, beatAnchorMs)?.split('.')[0]}, beat ${beatLabel(m.anchorMs, bpm, beatAnchorMs)?.split('.')[1]}`}
                >
                  {beatLabel(m.anchorMs, bpm, beatAnchorMs)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary">
                {nameOf(m)}
              </span>
              {/* Which discipline a placed move came from, per canon 09 — the one
                  thing a borrowed move otherwise hides once it is on the timeline. */}
              {templateOf(m) && (
                <span className="shrink-0 rounded-pill bg-bg-base px-1.5 font-data text-[10px] uppercase tracking-wide text-text-tertiary">
                  {templateOf(m)}
                </span>
              )}
              {m.intensity && <IntensityReadout intensity={m.intensity} />}
              <button
                ref={(node) => {
                  if (node) editButtonRefs.current.set(m.id, node);
                  else editButtonRefs.current.delete(m.id);
                }}
                className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-interactive disabled:opacity-40"
                onClick={() => startEdit(m)}
                disabled={busy}
                aria-label={`Edit move ${nameOf(m)}`}
              >
                Edit
              </button>
              <button
                className="min-h-11 shrink-0 rounded-control px-2 font-ui text-xs text-state-danger disabled:opacity-40"
                onClick={() => remove(m.id)}
                disabled={busy}
                aria-label={`Delete move ${nameOf(m)}`}
              >
                Delete
              </button>
            </li>
          ),
        )}
      </ul>
      <div
        className="flex flex-wrap items-center gap-2"
        onChangeCapture={() => {
          addRevision.current += 1;
        }}
      >
        <input
          ref={addAnchorRef}
          className={anchorInputClass(addAnchor.invalid)}
          type="text"
          inputMode="numeric"
          placeholder="m:ss"
          value={anchorClock}
          onChange={(e) => setAnchorClock(e.target.value)}
          aria-label="Move time (m:ss)"
          aria-invalid={addAnchor.invalid || undefined}
          aria-describedby={addAnchor.message ? `${validationId}-add-anchor` : undefined}
          title="Move time (m:ss)"
        />
        {/* A native select sizes itself to its widest <option>, so carrying each
            move's description in the label (P1-04) made this control 392px wide
            and pushed the whole page into horizontal scroll at 320 — a WCAG
            1.4.10 failure. Width is layout-driven here instead; `min-w-0` is what
            lets a flex item shrink below its content, and the open dropdown is
            drawn by the platform at full width, so the descriptions still do
            their disambiguating job at the point of choice. */}
        <select
          className={`min-w-0 grow basis-48 ${fieldClass}`}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          aria-label="Move"
        >
          <option value={CUSTOM}>Custom (one-off)…</option>
          <option value={NEW}>＋ New custom move…</option>
          {moveOptionGroups}
        </select>
        {disciplineToggle}
        {addNeedsName && (
          <input
            className={`min-w-0 basis-full sm:basis-auto flex-1 ${fieldClass}`}
            placeholder={addSel.kind === 'new' ? 'New custom move name' : 'Move name'}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            aria-label={addSel.kind === 'new' ? 'New custom move name' : 'Custom move name'}
          />
        )}
        <select
          className={fieldClass}
          value={intensity}
          onChange={(e) => setIntensity(e.target.value as Intensity | '')}
          aria-label="Move intensity (optional)"
        >
          <option value="">intensity —</option>
          {intensityValues.map((v) => (
            <option key={v} value={v}>
              {INTENSITY_LABEL[v]}
            </option>
          ))}
        </select>
        <button
          className="min-h-11 shrink-0 rounded-control border border-interactive px-3 font-ui text-sm text-interactive disabled:opacity-40 sm:rounded-pill"
          onClick={add}
          disabled={busy || (addNeedsName && !customName.trim())}
        >
          Add move
        </button>
        <SnapToggle canSnap={canSnap} snap={snap} onChange={setSnap} />
      </div>
      {addAnchor.message && (
        <p
          id={`${validationId}-add-anchor`}
          className="font-ui text-xs text-state-danger"
          role="alert"
        >
          {addAnchor.message}
        </p>
      )}
      {error && (
        <p className="font-ui text-xs text-state-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
