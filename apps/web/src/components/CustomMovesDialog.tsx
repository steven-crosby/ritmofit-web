/**
 * Manage the caller's custom moves (`user_moves`): rename, edit the description,
 * and delete. Owner-scoped on the backend (a move belongs to one user), so this
 * is independent of any class's access — it's opened from a track's Moves section
 * for discoverability. Creation stays in that picker ("＋ New custom move…").
 *
 * Deleting a move that's referenced by placements is safe: the server snapshots
 * the move's name into those placements' `nameOverride` (they become one-offs).
 * `onChanged` fires after any edit/delete so the caller can refresh the picker,
 * the placed-move rows, and the run-payload-derived views.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ClassTemplate, Move, UserMove } from '@ritmofit/shared';
import { listMoves, listUserMoves, updateUserMove, deleteUserMove } from '../lib/api.js';
import { errMessage } from '../lib/errors.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { Dialog } from './Dialog.js';
import { PendingList } from './PendingList.js';

/**
 * Discipline options for a custom move (`user_moves.template`). `''` is the
 * unset/"no discipline" choice that maps back to a `null` template. Labels are
 * presentation-only and mirror the create-class chooser's wording.
 */
const TEMPLATE_OPTIONS: ReadonlyArray<{ value: ClassTemplate | ''; label: string }> = [
  { value: '', label: 'No discipline' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'sculpt', label: 'Sculpt' },
  { value: 'tread', label: 'Tread' },
];
const TEMPLATE_LABEL: Record<ClassTemplate, string> = {
  cycle: 'Cycle',
  hiit: 'HIIT',
  sculpt: 'Sculpt',
  tread: 'Tread',
};

export function CustomMovesDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  /** Called after a successful rename/description-edit/delete. */
  onChanged: () => void;
}) {
  const [moves, setMoves] = useState<UserMove[] | null>(null);
  // The read-only global library, used to populate the "based on" picker and to
  // resolve a move's baseMoveId → name for display. Fetched with the user moves.
  const [globalMoves, setGlobalMoves] = useState<Move[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [userMoves, global] = await Promise.all([listUserMoves(), listMoves()]);
      setMoves(userMoves);
      setGlobalMoves(global);
    } catch (e) {
      setError(errMessage(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Apply a mutation, then refresh this list and notify the caller.
  const afterChange = useCallback(async () => {
    setError(null);
    await refresh();
    onChanged();
  }, [refresh, onChanged]);

  return (
    <Dialog
      onClose={onClose}
      label="Manage custom moves"
      panelClassName="flex w-full max-w-lg flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">Custom moves</h2>
          <p className="font-ui text-xs text-text-tertiary">
            Your reusable moves. Create new ones from a track’s Moves section.
          </p>
        </div>
        <button
          className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
          onClick={onClose}
          aria-label="Close custom moves dialog"
        >
          ✕
        </button>
      </header>

      {error && (
        <p className="font-ui text-sm text-state-danger" role="alert">
          {error}
        </p>
      )}

      {moves === null ? (
        <PendingList error={error} onRetry={() => void refresh()} />
      ) : moves.length === 0 ? (
        <p className="font-ui text-sm text-text-tertiary">
          No custom moves yet — create one from a track’s Moves section.
        </p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {moves.map((m) => (
            <CustomMoveRow
              key={m.id}
              move={m}
              globalMoves={globalMoves}
              onChanged={afterChange}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function CustomMoveRow({
  move,
  globalMoves,
  onChanged,
  onError,
}: {
  move: UserMove;
  globalMoves: Move[];
  onChanged: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(move.name);
  const [description, setDescription] = useState(move.description ?? '');
  // '' is the unset choice for both selects, mapped back to null on save.
  const [template, setTemplate] = useState<ClassTemplate | ''>(move.template ?? '');
  const [baseMoveId, setBaseMoveId] = useState<string>(move.baseMoveId ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // useAsyncAction owns the in-flight flag + error capture, so `busy` always clears
  // (the old hand-rolled remove left it stuck true on success).
  const { busy, run } = useAsyncAction(onError);

  const baseMove = move.baseMoveId
    ? (globalMoves.find((g) => g.id === move.baseMoveId) ?? null)
    : null;

  const startEdit = () => {
    setName(move.name);
    setDescription(move.description ?? '');
    setTemplate(move.template ?? '');
    setBaseMoveId(move.baseMoveId ?? '');
    setEditing(true);
  };

  const save = () => {
    if (!name.trim()) return;
    void run(async () => {
      await updateUserMove(move.id, {
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        template: template === '' ? null : template,
        baseMoveId: baseMoveId === '' ? null : baseMoveId,
      });
      setEditing(false);
      await onChanged();
    });
  };

  const remove = () =>
    void run(async () => {
      await deleteUserMove(move.id);
      await onChanged();
    });

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-card bg-bg-base p-3">
        <input
          className="rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-ui text-sm text-text-primary"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Move name"
          autoFocus
        />
        <textarea
          rows={2}
          className="resize-none rounded-card border border-interactive/30 bg-bg-raised px-3 py-2 font-ui text-sm text-text-primary"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Move description"
        />
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 font-ui text-xs text-text-tertiary">
            Discipline
            <select
              className="rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-ui text-sm text-text-primary"
              value={template}
              onChange={(e) => setTemplate(e.target.value as ClassTemplate | '')}
              aria-label="Move discipline"
            >
              {TEMPLATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 font-ui text-xs text-text-tertiary">
            Based on
            <select
              className="rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-ui text-sm text-text-primary"
              value={baseMoveId}
              onChange={(e) => setBaseMoveId(e.target.value)}
              aria-label="Based on library move"
            >
              <option value="">No base move</option>
              {globalMoves.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
            onClick={save}
            disabled={busy || !name.trim()}
          >
            Save
          </button>
          <button
            className="rounded-pill px-3 py-1.5 font-ui text-sm text-text-tertiary disabled:opacity-40"
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-card bg-bg-base p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-ui text-sm text-text-primary">{move.name}</p>
        {move.description && (
          <p className="truncate font-ui text-xs text-text-tertiary">{move.description}</p>
        )}
        {(move.template || baseMove) && (
          <p className="truncate font-ui text-xs text-text-tertiary">
            {[
              move.template ? TEMPLATE_LABEL[move.template] : null,
              baseMove ? `based on ${baseMove.name}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      {confirmingDelete ? (
        <>
          <span className="font-ui text-xs text-text-tertiary">Delete?</span>
          <button
            className="rounded-pill px-2 py-1 font-ui text-xs text-state-danger disabled:opacity-40"
            onClick={remove}
            disabled={busy}
            aria-label={`Confirm delete ${move.name}`}
          >
            Yes
          </button>
          <button
            className="rounded-pill px-2 py-1 font-ui text-xs text-text-tertiary disabled:opacity-40"
            onClick={() => setConfirmingDelete(false)}
            disabled={busy}
          >
            No
          </button>
        </>
      ) : (
        <>
          <button
            className="shrink-0 rounded-pill px-2 py-1 font-ui text-xs text-interactive disabled:opacity-40"
            onClick={startEdit}
            disabled={busy}
            aria-label={`Edit ${move.name}`}
          >
            Edit
          </button>
          <button
            className="shrink-0 rounded-pill px-2 py-1 font-ui text-xs text-text-tertiary hover:text-state-danger disabled:opacity-40"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
            aria-label={`Delete ${move.name}`}
            title="Existing placements keep the name as a one-off"
          >
            Delete
          </button>
        </>
      )}
    </li>
  );
}
