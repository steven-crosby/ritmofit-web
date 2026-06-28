/**
 * "Songs by move" reverse search — pick a move (global library or one of the
 * caller's custom moves) and see the songs they've previously choreographed with
 * it, grouped by track, each linking back to the class. The backend scopes
 * results to the caller's own classes, so this is a personal "what have I used
 * this move on?" history (no other user's choreography is ever returned).
 *
 * Opened from the top bar like Explore/Connections; selecting a class calls
 * `onOpenClass` so the Dashboard can load that class workspace and close this.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Move, UserMove, SongByMove } from '@ritmofit/shared';
import { listMoves, listUserMoves, songsByMove } from '../lib/api.js';
import { errMessage } from '../lib/errors.js';
import { formatDuration } from '../lib/class-summary.js';
import { parseMovePick } from '../lib/move-pick.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { INTENSITY_LABEL } from './IntensityReadout.js';
import { Dialog } from './Dialog.js';

export function SongsByMoveDialog({
  onClose,
  onOpenClass,
  onStartClass,
}: {
  onClose: () => void;
  /** Open a class by id in the Dashboard workspace (the dialog closes after). */
  onOpenClass: (classId: string) => void | Promise<void>;
  /**
   * Start a new class seeded from a choreographed song: copies that class_track
   * (with its cues + placed moves) into a fresh class and opens it. The dialog
   * closes after. `title` seeds the new class name.
   */
  onStartClass: (sourceClassTrackId: string, title: string) => Promise<void>;
}) {
  const [library, setLibrary] = useState<Move[]>([]);
  const [userMoves, setUserMoves] = useState<UserMove[]>([]);
  const [pick, setPick] = useState<string>(''); // '' | m:<id> | u:<id>
  const [songs, setSongs] = useState<SongByMove[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load both move namespaces once. Either failing leaves an empty group rather
  // than blocking the whole picker.
  useEffect(() => {
    void listMoves()
      .then(setLibrary)
      .catch(() => setLibrary([]));
    void listUserMoves()
      .then(setUserMoves)
      .catch(() => setUserMoves([]));
  }, []);

  // The label of the currently picked move, for the empty-state copy.
  const pickedName = useMemo(() => {
    if (!pick) return null;
    const sel = parseMovePick(pick);
    if (sel.kind === 'library') return library.find((m) => m.id === sel.id)?.name ?? null;
    if (sel.kind === 'user') return userMoves.find((m) => m.id === sel.id)?.name ?? null;
    return null;
  }, [pick, library, userMoves]);

  const search = useCallback(async (value: string) => {
    setPick(value);
    if (!value) {
      setSongs(null);
      setError(null);
      return;
    }
    const sel = parseMovePick(value);
    if (sel.kind !== 'library' && sel.kind !== 'user') return;
    setLoading(true);
    setError(null);
    try {
      setSongs(await songsByMove({ kind: sel.kind, id: sel.id }));
    } catch (e) {
      setError(errMessage(e));
      setSongs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Dialog
      onClose={onClose}
      label="Songs by move"
      panelClassName="flex w-full max-w-xl flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">Songs by move</h2>
          <p className="font-ui text-xs text-text-tertiary">
            Find songs you’ve choreographed with a move before, across your classes.
          </p>
        </div>
        <button
          className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
          onClick={onClose}
          aria-label="Close songs by move dialog"
        >
          ✕
        </button>
      </header>

      <label className="flex flex-col gap-1">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Move</span>
        <select
          className="rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
          value={pick}
          onChange={(e) => void search(e.target.value)}
        >
          <option value="">Pick a move…</option>
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
              {userMoves.map((m) => (
                <option key={m.id} value={`u:${m.id}`}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      {error && (
        <p className="font-ui text-sm text-state-danger" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="font-ui text-sm text-text-tertiary">Searching…</p>
      ) : !pick ? (
        <p className="font-ui text-sm text-text-tertiary">
          Pick a move to see the songs you’ve used it with.
        </p>
      ) : songs && songs.length === 0 ? (
        <p className="font-ui text-sm text-text-tertiary">
          You haven’t choreographed any songs with{' '}
          <span className="text-text-secondary">{pickedName ?? 'this move'}</span> yet.
        </p>
      ) : songs && songs.length > 0 ? (
        <ul className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {songs.map((s) => (
            <SongRow
              key={s.track.id}
              song={s}
              onOpenClass={onOpenClass}
              onStartClass={onStartClass}
              onClose={onClose}
              onError={setError}
            />
          ))}
        </ul>
      ) : null}
    </Dialog>
  );
}

function SongRow({
  song,
  onOpenClass,
  onStartClass,
  onClose,
  onError,
}: {
  song: SongByMove;
  onOpenClass: (classId: string) => void | Promise<void>;
  onStartClass: (sourceClassTrackId: string, title: string) => Promise<void>;
  onClose: () => void;
  onError: (msg: string | null) => void;
}) {
  const { track, placements } = song;
  const { busy: starting, run: runStart } = useAsyncAction(onError);
  const open = (classId: string) => {
    void Promise.resolve(onOpenClass(classId)).then(onClose);
  };
  // Seed a new class from this choreographed placement, then close the dialog
  // (Dashboard opens the new class). One in-flight start per song row.
  const start = (classTrackId: string) => {
    void runStart(async () => {
      await onStartClass(classTrackId, track.title);
      onClose();
    });
  };
  return (
    <li className="flex flex-col gap-2 rounded-card bg-bg-base p-3">
      <div className="flex items-center gap-3">
        {track.albumArtUrl ? (
          <img
            src={track.albumArtUrl}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="h-11 w-11 shrink-0 rounded-card object-cover"
          />
        ) : (
          <span className="h-11 w-11 shrink-0 rounded-card bg-bg-raised" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-sm text-text-primary">{track.title}</p>
          <p className="truncate font-ui text-xs text-text-tertiary">{track.artist}</p>
        </div>
        {track.displayBpm != null && (
          <span className="shrink-0 font-data text-xs text-text-tertiary">
            {track.displayBpm} BPM
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1 pl-14">
        {placements.map((p) => (
          <li
            key={`${p.classTrackId}-${p.anchorMs}`}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-xs text-text-tertiary"
          >
            <button
              type="button"
              className="rounded-pill text-interactive hover:underline"
              onClick={() => open(p.classId)}
            >
              {p.classTitle}
            </button>
            <span aria-hidden="true">·</span>
            <span>at {formatDuration(p.anchorMs)}</span>
            {p.intensity && p.intensity !== 'none' && (
              <>
                <span aria-hidden="true">·</span>
                <span>{INTENSITY_LABEL[p.intensity]}</span>
              </>
            )}
            <button
              type="button"
              className="rounded-pill border border-interactive/40 px-2 py-0.5 text-interactive hover:bg-interactive/10 disabled:opacity-40"
              onClick={() => start(p.classTrackId)}
              disabled={starting}
              aria-label={`Start a new class from ${track.title} in ${p.classTitle}`}
            >
              {starting ? 'Starting…' : 'Start a class'}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}
