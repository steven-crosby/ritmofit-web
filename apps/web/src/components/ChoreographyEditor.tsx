/**
 * Cue + placed-move authoring for the selected track (design system
 * `09-class-builder-guidelines.md`: cues and moves are separate concepts, both
 * anchored to a class_track by `anchorMs`). This slice covers add / list / delete;
 * inline-editing existing entries and custom user-move creation are deferred.
 *
 * The run-payload's per-track cues/moves lack ids, so editing reads the real
 * `GET /class-tracks/:id/cues` + `/moves` (which carry ids).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  intensityValues,
  type Cue,
  type ClassTrackMove,
  type Move,
  type Intensity,
  type PlaceClassTrackMove,
} from '@ritmofit/shared';
import {
  listCues,
  createCue,
  deleteCue,
  listPlacedMoves,
  placeMove,
  deletePlacedMove,
  listMoves,
} from '../lib/api.js';
import { IntensityReadout } from './IntensityReadout.js';

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

// ── Cues ─────────────────────────────────────────────────────────────────────

export function CuesSection({
  classTrackId,
  durationMs,
}: {
  classTrackId: string;
  durationMs: number | null;
}) {
  const [cues, setCues] = useState<Cue[] | null>(null);
  const [text, setText] = useState('');
  const [anchorSec, setAnchorSec] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCue(classTrackId, { anchorMs: secToMs(anchorSec), text: text.trim() });
      setText('');
      setAnchorSec('0');
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
        {cues?.map((cue) => (
          <li
            key={cue.id}
            className="flex items-center gap-2 rounded-pill bg-bg-raised px-3 py-1.5"
          >
            <span className="shrink-0 font-data text-xs text-text-tertiary">{clock(cue.anchorMs)}</span>
            <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary">{cue.text}</span>
            <button
              className="shrink-0 font-ui text-xs text-intensity-all_out disabled:opacity-40"
              onClick={() => remove(cue.id)}
              disabled={busy}
              aria-label={`Delete cue ${cue.text}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
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
      {error && <p className="font-ui text-xs text-intensity-all_out">{error}</p>}
    </div>
  );
}

// ── Placed moves ──────────────────────────────────────────────────────────────

const CUSTOM = '__custom__';

export function MovesSection({
  classTrackId,
  durationMs,
}: {
  classTrackId: string;
  durationMs: number | null;
}) {
  const [moves, setMoves] = useState<ClassTrackMove[] | null>(null);
  const [library, setLibrary] = useState<Move[]>([]);
  const [pick, setPick] = useState<string>(CUSTOM); // a library move id, or CUSTOM
  const [customName, setCustomName] = useState('');
  const [anchorSec, setAnchorSec] = useState('0');
  const [intensity, setIntensity] = useState<Intensity | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  /** Resolve a placement's display name: freeform override, else the library move. */
  const nameOf = (m: ClassTrackMove) =>
    m.nameOverride ?? library.find((lib) => lib.id === m.moveId)?.name ?? '(move)';

  const add = async () => {
    const isCustom = pick === CUSTOM;
    if (isCustom && !customName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // At-most-one reference: either a library moveId or a freeform nameOverride.
      const body: PlaceClassTrackMove = {
        anchorMs: secToMs(anchorSec),
        intensity: intensity === '' ? null : intensity,
        ...(isCustom ? { nameOverride: customName.trim() } : { moveId: pick }),
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

  return (
    <div className="flex flex-col gap-2">
      <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Moves</span>
      <ul className="flex flex-col gap-1">
        {moves?.length === 0 && <li className="font-ui text-xs text-text-tertiary">No moves yet.</li>}
        {moves?.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-pill bg-bg-raised px-3 py-1.5">
            <span className="shrink-0 font-data text-xs text-text-tertiary">{clock(m.anchorMs)}</span>
            <span className="min-w-0 flex-1 truncate font-ui text-sm text-text-primary">{nameOf(m)}</span>
            {m.intensity && <IntensityReadout intensity={m.intensity} />}
            <button
              className="shrink-0 font-ui text-xs text-intensity-all_out disabled:opacity-40"
              onClick={() => remove(m.id)}
              disabled={busy}
              aria-label={`Delete move ${nameOf(m)}`}
            >
              Delete
            </button>
          </li>
        ))}
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
          <option value={CUSTOM}>Custom…</option>
          {library.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {pick === CUSTOM && (
          <input
            className={`flex-1 ${fieldClass}`}
            placeholder="Move name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
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
          disabled={busy || (pick === CUSTOM && !customName.trim())}
        >
          Add move
        </button>
      </div>
      {error && <p className="font-ui text-xs text-intensity-all_out">{error}</p>}
    </div>
  );
}
