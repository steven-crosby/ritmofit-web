/**
 * Cue + placed-move authoring for the selected track (design system
 * `09-class-builder-guidelines.md`: cues and moves are separate concepts, both
 * anchored to a class_track by `anchorMs`). This slice covers add / list / delete;
 * inline-editing existing entries and custom user-move creation are deferred.
 *
 * The run-payload's per-track cues/moves lack ids, so editing reads the real
 * `GET /class-tracks/:id/cues` + `/moves` (which carry ids).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  intensityValues,
  type Cue,
  type ClassTrackMove,
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
import { IntensityReadout } from './IntensityReadout.js';
import { CUE_COLOR_TAGS, tagLabel } from '../lib/cue-colors.js';
import { CUSTOM, NEW, parseMovePick, pickForPlacement } from '../lib/move-pick.js';

/** ms → m:ss for an in-track anchor. */
function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Seconds string → nonnegative integer ms (offsetMsSchema). '' → 0. */
function secToMs(sec: string): number {
  const n = Number(sec.trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : 0;
}

/** ms → whole-seconds string, for seeding an edit field from a persisted anchor. */
function msToSec(ms: number): string {
  return String(Math.round(ms / 1000));
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
  'rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-ui text-sm text-text-primary';
// TODO(anchor-range): this is only a hint — the anchor-seconds inputs below don't
// enforce it. An anchor past the track length returns a generic 422 ("Request body
// failed validation") in the section's error line (the server bounds anchorMs to the
// track duration and rejects rather than clamps). Add a client-side max + a friendlier
// message in a later polish slice. (Found during the 2026-06-12 verification pass.)
const anchorHint = (durationMs: number | null) =>
  durationMs ? ` (0–${Math.round(durationMs / 1000)}s)` : '';

/** A request to focus a cue/move row (from a timeline marker click). */
export type RowFocus = { anchorMs: number; nonce: number } | null;

/**
 * Flash + scroll a cue/move row into view when a timeline marker targets it.
 * Correlation is by in-track `anchorMs` (the run-payload markers carry no id).
 * `ready` gates until the section's rows have loaded, so a focus that arrives
 * before the fetch still fires; the `nonce` re-triggers on a repeat marker click.
 * Returns the ms to ring (transient, ~1.6s) and a ref for the matching row.
 */
function useFlashFocus(focus: RowFocus, ready: boolean) {
  const [flashAnchorMs, setFlashAnchorMs] = useState<number | null>(null);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const nonce = focus?.nonce;
  useEffect(() => {
    if (!focus || !ready) return;
    setFlashAnchorMs(focus.anchorMs);
    const raf = requestAnimationFrame(() => rowRef.current?.scrollIntoView({ block: 'nearest' }));
    const clear = setTimeout(() => setFlashAnchorMs(null), 1600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clear);
    };
    // Intentionally keyed on the marker nonce + readiness only: re-flash on a new
    // marker click, or once the rows have loaded — not on every focus.anchorMs read.
  }, [nonce, ready]);
  return { flashAnchorMs, rowRef };
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
    <div role="group" aria-label="Cue color tag" className="flex items-center gap-1.5">
      <button
        type="button"
        aria-pressed={value == null}
        aria-label="No color"
        title="No color"
        onClick={() => onChange(null)}
        className={`flex h-5 w-5 items-center justify-center rounded-full border border-interactive/40 text-[10px] leading-none text-text-tertiary ${
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
            style={{ backgroundColor: t.hex }}
            className={`h-5 w-5 rounded-full ${selected ? 'ring-2 ring-interactive ring-offset-1 ring-offset-bg-base' : ''}`}
          />
        );
      })}
      {value != null && !inPalette && (
        <button
          type="button"
          aria-pressed
          aria-label="Current custom color"
          title={value}
          onClick={() => onChange(value)}
          style={{ backgroundColor: value }}
          className="h-5 w-5 rounded-full ring-2 ring-interactive ring-offset-1 ring-offset-bg-base"
        />
      )}
    </div>
  );
}

export function CuesSection({
  classTrackId,
  durationMs,
  focus = null,
}: {
  classTrackId: string;
  durationMs: number | null;
  focus?: RowFocus;
}) {
  const [cues, setCues] = useState<Cue[] | null>(null);
  const { flashAnchorMs, rowRef } = useFlashFocus(focus, cues != null);
  const [text, setText] = useState('');
  const [anchorSec, setAnchorSec] = useState('0');
  const [color, setColor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline edit: at most one cue editable at a time, seeded from the persisted row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editAnchorSec, setEditAnchorSec] = useState('0');
  const [editColor, setEditColor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCues(await listCues(classTrackId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [classTrackId]);
  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (cue: Cue) => {
    setEditingId(cue.id);
    setEditText(cue.text);
    setEditAnchorSec(msToSec(cue.anchorMs));
    setEditColor(cue.color);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // Always send `color` (hex or null) so a cleared tag persists (buildPatch
      // sets explicit null; an omitted field would leave the old color).
      await updateCue(editingId, {
        anchorMs: secToMs(editAnchorSec),
        text: editText.trim(),
        color: editColor,
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCue(classTrackId, {
        anchorMs: secToMs(anchorSec),
        text: text.trim(),
        color,
      });
      setText('');
      setAnchorSec('0');
      setColor(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteCue(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Cues</span>
      <ul className="flex flex-col gap-1">
        {cues?.length === 0 && <li className="font-ui text-xs text-text-tertiary">No cues yet.</li>}
        {cues?.map((cue) =>
          editingId === cue.id ? (
            <li
              key={cue.id}
              className="flex flex-wrap items-center gap-2 rounded-card bg-bg-raised px-3 py-2"
            >
              <input
                className={`w-16 ${fieldClass} font-data`}
                type="number"
                min={0}
                inputMode="numeric"
                value={editAnchorSec}
                onChange={(e) => setEditAnchorSec(e.target.value)}
                aria-label={`Cue time in seconds${anchorHint(durationMs)}`}
                title={`Time in seconds${anchorHint(durationMs)}`}
              />
              <input
                className={`min-w-0 flex-1 ${fieldClass}`}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                aria-label="Cue text"
                autoFocus
              />
              <CueColorPicker value={editColor} onChange={setEditColor} />
              <button
                className="shrink-0 font-ui text-xs text-interactive disabled:opacity-40"
                onClick={saveEdit}
                disabled={busy || !editText.trim()}
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
              key={cue.id}
              ref={focus && cue.anchorMs === focus.anchorMs ? rowRef : undefined}
              className={`flex items-center gap-2 rounded-pill bg-bg-raised px-3 py-1.5 ${
                flashAnchorMs != null && cue.anchorMs === flashAnchorMs ? 'ring-2 ring-interactive' : ''
              }`}
            >
              {/* Color tag — decorative reinforcement; time + text always carry the meaning. */}
              {cue.color && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cue.color }}
                  title={`${tagLabel(cue.color) ?? 'Color'} tag`}
                  aria-hidden
                />
              )}
              <span className="shrink-0 font-data text-xs text-text-tertiary">{clock(cue.anchorMs)}</span>
              <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary">{cue.text}</span>
              <button
                className="shrink-0 font-ui text-xs text-interactive disabled:opacity-40"
                onClick={() => startEdit(cue)}
                disabled={busy}
                aria-label={`Edit cue ${cue.text}`}
              >
                Edit
              </button>
              <button
                className="shrink-0 font-ui text-xs text-intensity-all_out disabled:opacity-40"
                onClick={() => remove(cue.id)}
                disabled={busy}
                aria-label={`Delete cue ${cue.text}`}
              >
                Delete
              </button>
            </li>
          ),
        )}
      </ul>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            className={`w-20 ${fieldClass} font-data`}
            type="number"
            min={0}
            inputMode="numeric"
            value={anchorSec}
            onChange={(e) => setAnchorSec(e.target.value)}
            aria-label={`Cue time in seconds${anchorHint(durationMs)}`}
            title={`Time in seconds${anchorHint(durationMs)}`}
          />
          <input
            className={`flex-1 ${fieldClass}`}
            placeholder="Cue text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="shrink-0 rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive disabled:opacity-40"
            onClick={add}
            disabled={busy || !text.trim()}
          >
            Add cue
          </button>
        </div>
        <CueColorPicker value={color} onChange={setColor} />
      </div>
      {error && <p className="font-ui text-xs text-intensity-all_out">{error}</p>}
    </div>
  );
}

// ── Placed moves ──────────────────────────────────────────────────────────────

export function MovesSection({
  classTrackId,
  durationMs,
  focus = null,
}: {
  classTrackId: string;
  durationMs: number | null;
  focus?: RowFocus;
}) {
  const [moves, setMoves] = useState<ClassTrackMove[] | null>(null);
  const { flashAnchorMs, rowRef } = useFlashFocus(focus, moves != null);
  const [library, setLibrary] = useState<Move[]>([]);
  // The caller's reusable custom moves. Unlike the read-only library these mutate
  // (creating one here), so they're component state refreshed on demand, not the
  // session-cached library promise.
  const [userMoves, setUserMoves] = useState<UserMove[]>([]);
  const [pick, setPick] = useState<string>(CUSTOM); // CUSTOM | NEW | m:<id> | u:<id>
  const [customName, setCustomName] = useState(''); // freeform name (CUSTOM) or new-move name (NEW)
  const [anchorSec, setAnchorSec] = useState('0');
  const [intensity, setIntensity] = useState<Intensity | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline edit: at most one placement editable at a time, seeded from the row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPick, setEditPick] = useState<string>(CUSTOM); // CUSTOM | m:<id> | u:<id>
  const [editCustom, setEditCustom] = useState('');
  const [editAnchorSec, setEditAnchorSec] = useState('0');
  const [editIntensity, setEditIntensity] = useState<Intensity | ''>('');

  const load = useCallback(async () => {
    try {
      setMoves(await listPlacedMoves(classTrackId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [classTrackId]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadMovesLibrary()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, []);
  const loadUserMoves = useCallback(async () => {
    try {
      setUserMoves(await listUserMoves());
    } catch {
      setUserMoves([]);
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
  const moveOptionGroups = (
    <>
      {library.length > 0 && (
        <optgroup label="Library">
          {library.map((m) => (
            <option key={m.id} value={`m:${m.id}`}>
              {m.name}
            </option>
          ))}
        </optgroup>
      )}
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

  const add = async () => {
    const sel = parseMovePick(pick);
    const needsName = sel.kind === 'custom' || sel.kind === 'new';
    if (needsName && !customName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let ref: ReturnType<typeof refFields>;
      if (sel.kind === 'new') {
        // Create the reusable custom move, then place it by id; surface it in
        // "Your moves" and select it so a repeat Add re-uses (not re-creates) it.
        const created = await createUserMove({ name: customName.trim() });
        await loadUserMoves();
        setPick(`u:${created.id}`);
        ref = { userMoveId: created.id, moveId: null, nameOverride: null };
      } else {
        ref = refFields(pick, customName);
      }
      const body: PlaceClassTrackMove = {
        anchorMs: secToMs(anchorSec),
        intensity: intensity === '' ? null : intensity,
        ...ref,
      };
      await placeMove(classTrackId, body);
      setCustomName('');
      setAnchorSec('0');
      setIntensity('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (m: ClassTrackMove) => {
    setEditingId(m.id);
    setEditAnchorSec(msToSec(m.anchorMs));
    setEditIntensity(m.intensity ?? '');
    // Seed the selector from the placement's reference (library / user move / one-off).
    setEditPick(pickForPlacement(m.moveId, m.userMoveId));
    setEditCustom(m.moveId || m.userMoveId ? '' : (m.nameOverride ?? ''));
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const sel = parseMovePick(editPick);
    if (sel.kind === 'custom' && !editCustom.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // Switching the reference nulls the others to hold the at-most-one invariant
      // (the server re-checks the merged result).
      await updatePlacedMove(editingId, {
        anchorMs: secToMs(editAnchorSec),
        intensity: editIntensity === '' ? null : editIntensity,
        ...refFields(editPick, editCustom),
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deletePlacedMove(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
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
      <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Moves</span>
      <ul className="flex flex-col gap-1">
        {moves?.length === 0 && <li className="font-ui text-xs text-text-tertiary">No moves yet.</li>}
        {moves?.map((m) =>
          editingId === m.id ? (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-2 rounded-card bg-bg-raised px-3 py-2"
            >
              <input
                className={`w-16 ${fieldClass} font-data`}
                type="number"
                min={0}
                inputMode="numeric"
                value={editAnchorSec}
                onChange={(e) => setEditAnchorSec(e.target.value)}
                aria-label={`Move time in seconds${anchorHint(durationMs)}`}
                title={`Time in seconds${anchorHint(durationMs)}`}
              />
              <select
                className={fieldClass}
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
                    {v}
                  </option>
                ))}
              </select>
              <button
                className="shrink-0 font-ui text-xs text-interactive disabled:opacity-40"
                onClick={saveEdit}
                disabled={busy || (editSel.kind === 'custom' && !editCustom.trim())}
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
              key={m.id}
              ref={focus && m.anchorMs === focus.anchorMs ? rowRef : undefined}
              className={`flex items-center gap-2 rounded-pill bg-bg-raised px-3 py-1.5 ${
                flashAnchorMs != null && m.anchorMs === flashAnchorMs ? 'ring-2 ring-interactive' : ''
              }`}
            >
              <span className="shrink-0 font-data text-xs text-text-tertiary">{clock(m.anchorMs)}</span>
              <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary">{nameOf(m)}</span>
              {m.intensity && <IntensityReadout intensity={m.intensity} />}
              <button
                className="shrink-0 font-ui text-xs text-interactive disabled:opacity-40"
                onClick={() => startEdit(m)}
                disabled={busy}
                aria-label={`Edit move ${nameOf(m)}`}
              >
                Edit
              </button>
              <button
                className="shrink-0 font-ui text-xs text-intensity-all_out disabled:opacity-40"
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
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`w-20 ${fieldClass} font-data`}
          type="number"
          min={0}
          inputMode="numeric"
          value={anchorSec}
          onChange={(e) => setAnchorSec(e.target.value)}
          aria-label={`Move time in seconds${anchorHint(durationMs)}`}
          title={`Time in seconds${anchorHint(durationMs)}`}
        />
        <select
          className={fieldClass}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          aria-label="Move"
        >
          <option value={CUSTOM}>Custom (one-off)…</option>
          <option value={NEW}>＋ New custom move…</option>
          {moveOptionGroups}
        </select>
        {addNeedsName && (
          <input
            className={`flex-1 ${fieldClass}`}
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
              {v}
            </option>
          ))}
        </select>
        <button
          className="shrink-0 rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive disabled:opacity-40"
          onClick={add}
          disabled={busy || (addNeedsName && !customName.trim())}
        >
          Add move
        </button>
      </div>
      {error && <p className="font-ui text-xs text-intensity-all_out">{error}</p>}
    </div>
  );
}
