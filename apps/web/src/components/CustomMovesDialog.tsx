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
import type { UserMove } from '@ritmofit/shared';
import { listUserMoves, updateUserMove, deleteUserMove } from '../lib/api.js';
import { errMessage } from '../lib/errors.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { Dialog } from './Dialog.js';
import { PendingList } from './PendingList.js';

export function CustomMovesDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  /** Called after a successful rename/description-edit/delete. */
  onChanged: () => void;
}) {
  const [moves, setMoves] = useState<UserMove[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setMoves(await listUserMoves());
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
            <CustomMoveRow key={m.id} move={m} onChanged={afterChange} onError={setError} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function CustomMoveRow({
  move,
  onChanged,
  onError,
}: {
  move: UserMove;
  onChanged: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(move.name);
  const [description, setDescription] = useState(move.description ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // useAsyncAction owns the in-flight flag + error capture, so `busy` always clears
  // (the old hand-rolled remove left it stuck true on success).
  const { busy, run } = useAsyncAction(onError);

  const startEdit = () => {
    setName(move.name);
    setDescription(move.description ?? '');
    setEditing(true);
  };

  const save = () => {
    if (!name.trim()) return;
    void run(async () => {
      await updateUserMove(move.id, {
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
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
