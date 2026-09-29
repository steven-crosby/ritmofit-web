/**
 * Basic Builder rendering for music-independent plan blocks. Empty blocks stay
 * visible as teaching structure; they never become Live tracks.
 *
 * Assignment is block-scoped end to end: `onChooseMusic` hands the caller the
 * whole block so the picker can name its real destination, the dest card hosts
 * the picker so add and overflow stay on the block she acted on, and every
 * song row carries the control that moves it between blocks (or out of the
 * plan), so a misplaced song is a correction rather than a delete-and-re-add.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  MAX_DURATION_MS,
  cyclePostureValues,
  hiitEquipmentValues,
  pilatesEquipmentValues,
  type ClassPlanBlock,
  type ClassPlanBlockGuidance,
  type ClassTrack,
  type CreateClassPlanBlock,
  type Intensity,
  type RunPayload,
  type ScaffoldRecipeId,
  type UpdateClassPlanBlock,
} from '@ritmofit/shared';
import {
  assignClassTrackPlanBlock,
  createClassPlanBlock,
  deleteClassPlanBlock,
  listClassPlanBlocks,
  reorderClassPlanBlocks,
  updateClassPlanBlock,
} from '../lib/api.js';
import { ApiError } from '../lib/api.js';
import {
  classTargetGap,
  classTargetGapLabel,
  formatPlannedDurationInput,
  hiitIntervalMismatch,
  hiitIntervalTotalMs,
  parsePlannedDuration,
  planBlockActualMs,
  planBlockDetailLine,
  planBlockFit,
  planFitLabel,
  planNextStep,
  planTotalMs,
  syncHiitSequenceFocus,
  tracksForPlanBlock,
  unassignedClassTracks,
} from '../lib/class-scaffold.js';
import { formatDuration } from '../lib/class-summary.js';
import { errMessage } from '../lib/errors.js';
import { IntensityReadout } from './IntensityReadout.js';
import { IntensitySegmentedControl } from './IntensitySegmentedControl.js';
import { PendingList } from './PendingList.js';
import { StatusLabel } from './SharedState.js';

/** What the picker needs to state where a song is about to land. */
export type PlanBlockTarget = { id: string; label: string; position: number };

export const planBlockOptionLabel = (block: { label: string; position: number }) =>
  `Block ${block.position + 1} · ${block.label}`;

const isConflict = (error: unknown): boolean =>
  error instanceof ApiError
    ? error.status === 409
    : typeof error === 'object' && error !== null && 'status' in error && error.status === 409;

/** Title for a class track, preferring the resolved payload entry. */
function trackTitle(track: ClassTrack, payload: RunPayload | null): string {
  const entry = payload?.tracks.find((row) => row.classTrackId === track.id);
  return entry ? `${entry.track.title} — ${entry.track.artist}` : `Song ${track.position + 1}`;
}

export function ClassPlanBlocks({
  classId,
  scaffoldRecipeId = null,
  targetDurationMs = null,
  tracks,
  payload,
  canEdit,
  assigningPlanBlockId,
  focusFirstChoose = false,
  musicPicker = null,
  onChooseMusic,
  onCloseMusic,
  onSelectTrack,
  onTracksChanged,
  onPlanNextStep,
  onHasPlanBlocks,
  onPlanBlocks,
}: {
  classId: string;
  /** Only scaffold classes gain add, reorder, and delete controls. */
  scaffoldRecipeId?: ScaffoldRecipeId | null;
  /** The class's chosen length. Block edits never change it; the header shows the gap. */
  targetDurationMs?: number | null;
  tracks: ClassTrack[];
  payload: RunPayload | null;
  canEdit: boolean;
  assigningPlanBlockId: string | null;
  /** After a 0-track scaffold lands, put focus on the first Choose music. */
  focusFirstChoose?: boolean;
  /** Open picker for the dest block — rendered on that card, not under the stack. */
  musicPicker?: ReactNode;
  onChooseMusic: (block: PlanBlockTarget, options?: { stay?: boolean }) => void;
  onCloseMusic?: () => void;
  onSelectTrack: (classTrackId: string) => void;
  onTracksChanged: () => void;
  onPlanNextStep?: (label: string | null) => void;
  onHasPlanBlocks?: (hasBlocks: boolean) => void;
  onPlanBlocks?: (blocks: ClassPlanBlock[]) => void;
}) {
  const [blocks, setBlocks] = useState<ClassPlanBlock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addReturnFocusRef = useRef(false);
  const focusAfterMutationRef = useRef<string | 'add' | null>(null);
  const [moveIntent, setMoveIntent] = useState<{
    trackId: string;
    planBlockId: string | null;
  } | null>(null);
  const visibleTracks = moveIntent
    ? tracks.map((track) =>
        track.id === moveIntent.trackId ? { ...track, planBlockId: moveIntent.planBlockId } : track,
      )
    : tracks;

  useEffect(() => {
    let alive = true;
    setError(null);
    setBlocks(null);
    void (async () => {
      try {
        const rows = await listClassPlanBlocks(classId);
        if (!alive) return;
        setBlocks(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!alive) return;
        setError(errMessage(e));
        setBlocks([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [classId, scaffoldRecipeId, reloadKey]);

  useEffect(() => {
    if (blocks == null) return;
    onPlanNextStep?.(planNextStep(blocks, visibleTracks, payload));
    onHasPlanBlocks?.(blocks.length > 0);
    onPlanBlocks?.(blocks);
  }, [blocks, visibleTracks, payload, onPlanNextStep, onHasPlanBlocks, onPlanBlocks]);

  useEffect(() => () => onPlanNextStep?.(null), [classId, onPlanNextStep]);

  // Once per landing (load, class switch, or back to zero songs) — not on every
  // block edit, or a planned-time save would steal focus from its Edit button.
  const choseFocusRef = useRef(false);
  useLayoutEffect(() => {
    if (blocks == null || tracks.length > 0) choseFocusRef.current = false;
    if (!focusFirstChoose || !canEdit || !blocks?.length || tracks.length > 0) return;
    if (focusAfterMutationRef.current) return;
    if (choseFocusRef.current) return;
    choseFocusRef.current = true;
    const firstBlock = [...blocks].sort((a, b) => a.position - b.position)[0]!;
    const first = document.querySelector<HTMLButtonElement>(
      `#plan-block-card-${firstBlock.id} button[aria-label^="Choose music"]`,
    );
    first?.focus();
  }, [focusFirstChoose, canEdit, blocks, tracks.length, classId]);

  useLayoutEffect(() => {
    if (adding || blocks == null) return;
    const target = focusAfterMutationRef.current;
    if (target) {
      focusAfterMutationRef.current = null;
      if (target === 'add') addButtonRef.current?.focus();
      else
        document
          .querySelector<HTMLButtonElement>(
            `#plan-block-card-${target} button[aria-label^="Edit Block"]`,
          )
          ?.focus();
    } else if (addReturnFocusRef.current) {
      addReturnFocusRef.current = false;
      addButtonRef.current?.focus();
    }
  }, [adding, blocks]);

  const moveBlock = async (index: number, delta: -1 | 1) => {
    if (!blocks || orderBusy || deleteBusy || adding) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + delta, 0, moved);
    const previous = blocks;
    setActionError(null);
    setOrderBusy(true);
    focusAfterMutationRef.current = moved.id;
    setBlocks(next.map((block, position) => ({ ...block, position })));
    try {
      const saved = await reorderClassPlanBlocks(classId, {
        planBlockIds: next.map((row) => row.id),
      });
      setBlocks(saved);
      setAnnouncement(`${moved.label} moved to block ${index + delta + 1}.`);
      onTracksChanged();
    } catch (e) {
      focusAfterMutationRef.current = moved.id;
      setBlocks(previous);
      setActionError(
        isConflict(e)
          ? 'The current music order prevents that move on the free timeline. Move the songs first, then try again.'
          : errMessage(e),
      );
    } finally {
      setOrderBusy(false);
    }
  };

  const removeBlock = async (id: string) => {
    setDeleteBusy(true);
    setActionError(null);
    try {
      await deleteClassPlanBlock(id);
      if (assigningPlanBlockId === id) onCloseMusic?.();
      let remaining: ClassPlanBlock[];
      try {
        remaining = await listClassPlanBlocks(classId);
      } catch {
        remaining = (blocks ?? [])
          .filter((row) => row.id !== id)
          .map((row, position) => ({ ...row, position }));
        setActionError(
          'The block was deleted, but the plan could not be refreshed. Reload to check its order.',
        );
      }
      const removedPosition = blocks?.findIndex((row) => row.id === id) ?? 0;
      focusAfterMutationRef.current =
        remaining[removedPosition]?.id ?? remaining.at(-1)?.id ?? 'add';
      setBlocks(remaining);
      setAnnouncement('Empty block deleted.');
    } finally {
      setDeleteBusy(false);
    }
  };

  useEffect(() => {
    if (!moveIntent) return;
    const track = tracks.find((row) => row.id === moveIntent.trackId);
    if (track && (track.planBlockId ?? null) === moveIntent.planBlockId) {
      setMoveIntent(null);
    }
  }, [tracks, moveIntent]);

  useLayoutEffect(() => {
    if (!moveIntent) return;
    const el = document.getElementById(`plan-block-for-${moveIntent.trackId}`);
    if (el instanceof HTMLSelectElement) el.focus();
  }, [visibleTracks, moveIntent]);

  if (blocks == null) {
    return (
      <div className="rounded-card bg-bg-raised p-4 shadow-card">
        <StatusLabel kind="loading" label="Loading teaching plan" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-start gap-2 rounded-card bg-bg-raised p-4 shadow-card"
        role="alert"
      >
        <StatusLabel kind="error" label="Couldn’t load the teaching plan" />
        <p className="font-ui text-sm text-text-secondary">{error}</p>
        <PendingList error={error} onRetry={() => setReloadKey((key) => key + 1)} />
      </div>
    );
  }

  if (blocks.length === 0 && scaffoldRecipeId == null) return null;

  const guidanceKind: ClassPlanBlockGuidance['kind'] | null = scaffoldRecipeId?.startsWith('cycle')
    ? 'cycle'
    : scaffoldRecipeId?.startsWith('pilates')
      ? 'pilates'
      : scaffoldRecipeId?.startsWith('hiit')
        ? 'hiit'
        : null;
  const canManage = canEdit && guidanceKind != null;

  const unassigned = unassignedClassTracks(visibleTracks);
  const plannedMs = planTotalMs(blocks);
  const targetGap = classTargetGap(targetDurationMs, plannedMs);

  return (
    <section className="flex flex-col gap-3 rounded-card bg-bg-raised p-4 shadow-card">
      <div>
        <span className="rf-eyebrow">Teaching plan</span>
        <h3 className="mt-1 font-display text-lg font-semibold text-text-primary">
          Planned blocks
        </h3>
        <p className="mt-1 font-ui text-sm leading-5 text-text-secondary">
          Planned time is the target. Music duration is whatever you actually add.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-2 font-data text-xs text-text-secondary">
          {targetDurationMs != null && <span>Class target {formatDuration(targetDurationMs)}</span>}
          {targetDurationMs != null && <span aria-hidden="true">·</span>}
          <span>Blocks total {formatDuration(plannedMs)}</span>
          {targetGap && (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={
                  targetGap.fit === 'on_plan' ? 'text-text-secondary' : 'text-state-caution'
                }
              >
                {classTargetGapLabel(targetGap.fit, formatDuration(Math.abs(targetGap.deltaMs)))}
              </span>
            </>
          )}
        </p>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {actionError && (
        <div role="alert" className="flex flex-col gap-1">
          <StatusLabel kind="error" label="Teaching plan needs attention" />
          <p className="font-ui text-xs text-text-secondary">{actionError}</p>
        </div>
      )}
      {blocks.length === 0 && (
        <div className="rounded-control border border-dashed border-border-subtle bg-bg-sunken p-3">
          <StatusLabel kind="empty" label="No teaching blocks yet" />
          <p className="mt-1 font-ui text-sm text-text-secondary">
            {canManage
              ? 'Add a block to rebuild this class’s teaching plan.'
              : 'This class has no teaching blocks.'}
          </p>
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {blocks.map((block, index) => (
          <PlanBlockCard
            key={block.id}
            block={block}
            blocks={blocks}
            tracks={visibleTracks}
            payload={payload}
            canEdit={canEdit}
            canManage={canManage}
            manageBusy={orderBusy || deleteBusy || adding}
            canMoveEarlier={index > 0}
            canMoveLater={index < blocks.length - 1}
            onMoveEarlier={() => void moveBlock(index, -1)}
            onMoveLater={() => void moveBlock(index, 1)}
            onDelete={() => removeBlock(block.id)}
            assigning={assigningPlanBlockId === block.id}
            musicPicker={assigningPlanBlockId === block.id ? musicPicker : null}
            onChooseMusic={(options) => {
              const target = { id: block.id, label: block.label, position: block.position };
              if (options) onChooseMusic(target, options);
              else onChooseMusic(target);
            }}
            onCloseMusic={onCloseMusic}
            onSelectTrack={onSelectTrack}
            onTracksChanged={onTracksChanged}
            onMoved={(trackId, planBlockId) => setMoveIntent({ trackId, planBlockId })}
            onSaved={(saved) =>
              setBlocks((rows) => rows?.map((row) => (row.id === saved.id ? saved : row)) ?? rows)
            }
          />
        ))}
      </ol>
      {canManage &&
        (adding ? (
          <PlanBlockEditor
            block={null}
            classId={classId}
            guidanceKind={guidanceKind}
            blockName="new block"
            onSaved={(saved) => {
              setActionError(null);
              focusAfterMutationRef.current = saved.id;
              setBlocks((rows) => [...(rows ?? []), saved]);
              setAdding(false);
              setAnnouncement(`${saved.label} added as block ${saved.position + 1}.`);
            }}
            onCancel={() => {
              addReturnFocusRef.current = true;
              setAdding(false);
            }}
          />
        ) : (
          <button
            ref={addButtonRef}
            type="button"
            disabled={orderBusy || deleteBusy}
            onClick={() => {
              setActionError(null);
              setAdding(true);
            }}
            className="min-h-11 self-start rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring disabled:opacity-40"
          >
            Add block
          </button>
        ))}
      {unassigned.length > 0 && (
        <div className="rounded-card border border-border-subtle bg-bg-sunken p-3">
          <StatusLabel kind="empty" label="Unassigned music" />
          <p className="mt-1 font-ui text-sm text-text-secondary">
            {unassigned.length === 1
              ? '1 song is not in a plan block yet. Put it in one to give it a place in the class.'
              : `${unassigned.length} songs are not in a plan block yet. Put them in one to give them a place in the class.`}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {unassigned.map((track) => (
              <li key={track.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onSelectTrack(track.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-control px-2 text-left font-ui text-sm text-text-primary rf-focus-ring hover:bg-bg-raised"
                >
                  <span className="min-w-0 truncate">{trackTitle(track, payload)}</span>
                </button>
                {canEdit && (
                  <PlanBlockAssignSelect
                    track={track}
                    title={trackTitle(track, payload)}
                    blocks={blocks}
                    onTracksChanged={onTracksChanged}
                    onMoved={(trackId, planBlockId) => setMoveIntent({ trackId, planBlockId })}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PlanBlockCard({
  block,
  blocks,
  tracks,
  payload,
  canEdit,
  canManage,
  manageBusy,
  canMoveEarlier,
  canMoveLater,
  onMoveEarlier,
  onMoveLater,
  onDelete,
  assigning,
  musicPicker,
  onChooseMusic,
  onCloseMusic,
  onSelectTrack,
  onTracksChanged,
  onMoved,
  onSaved,
}: {
  block: ClassPlanBlock;
  blocks: ClassPlanBlock[];
  tracks: ClassTrack[];
  payload: RunPayload | null;
  canEdit: boolean;
  canManage: boolean;
  manageBusy: boolean;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  onDelete: () => Promise<void>;
  assigning: boolean;
  musicPicker: ReactNode;
  onChooseMusic: (options?: { stay?: boolean }) => void;
  onCloseMusic?: () => void;
  onSelectTrack: (classTrackId: string) => void;
  onTracksChanged: () => void;
  onMoved: (classTrackId: string, planBlockId: string | null) => void;
  onSaved: (block: ClassPlanBlock) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const deleteReturnFocusRef = useRef(false);
  const returnFocusRef = useRef(false);
  useLayoutEffect(() => {
    if (editing || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    editRef.current?.focus();
  }, [editing]);
  useLayoutEffect(() => {
    if (confirmDelete) confirmRef.current?.focus();
    else if (deleteReturnFocusRef.current) {
      deleteReturnFocusRef.current = false;
      deleteRef.current?.focus();
    }
  }, [confirmDelete]);
  const closeEditor = () => {
    returnFocusRef.current = true;
    setEditing(false);
  };
  const intervalMismatch = hiitIntervalMismatch(block.guidance, block.targetDurationMs);
  const assigned = tracksForPlanBlock(block.id, tracks);
  const empty = assigned.length === 0;
  const showMusicFit =
    !empty &&
    assigned.every((track) =>
      payload?.tracks.some(
        (entry) => entry.classTrackId === track.id && entry.track.durationMs != null,
      ),
    );
  const actualMs = showMusicFit ? planBlockActualMs(block.id, tracks, payload) : 0;
  const fit = showMusicFit ? planBlockFit(block.targetDurationMs, actualMs) : null;
  const fitText = fit ? planFitLabel(fit.fit, formatDuration(Math.abs(fit.deltaMs))) : null;
  const blockName = planBlockOptionLabel(block);
  const destOpen = assigning && musicPicker != null;

  return (
    <li
      id={`plan-block-card-${block.id}`}
      className={`flex flex-col gap-2 rounded-card border p-3 motion-reduce:transition-none ${
        assigning ? 'border-interactive bg-interactive/10' : 'border-border-subtle bg-bg-base'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-ui text-xs text-text-tertiary">Block {block.position + 1}</p>
          <h4 className="font-display text-base font-semibold text-text-primary">{block.label}</h4>
        </div>
        <IntensityReadout intensity={block.intensity} />
      </div>
      <p className="font-ui text-sm leading-5 text-text-secondary">{block.teachingGoal}</p>
      <p className="font-ui text-xs leading-4 text-text-tertiary">{planBlockDetailLine(block)}</p>
      <p className="font-data text-xs text-text-secondary">
        Planned {formatDuration(block.targetDurationMs)}
        {fit && (
          <>
            {' · '}Music {formatDuration(actualMs)} ·{' '}
            <span
              className={
                fit.fit === 'on_plan'
                  ? 'text-text-secondary'
                  : fit.fit === 'over'
                    ? 'text-state-caution'
                    : 'text-text-tertiary'
              }
            >
              {fitText}
            </span>
          </>
        )}
      </p>
      {intervalMismatch && !editing && <IntervalMismatch mismatch={intervalMismatch} />}
      {canEdit &&
        (editing ? (
          <PlanBlockEditor
            block={block}
            classId={block.classId}
            guidanceKind={block.guidance.kind}
            blockName={blockName}
            onSaved={(saved) => {
              onSaved(saved);
              closeEditor();
            }}
            onCancel={closeEditor}
          />
        ) : (
          <div>
            <button
              ref={editRef}
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${blockName}`}
              className="min-h-11 rounded-control px-2 font-ui text-sm font-semibold text-interactive rf-focus-ring"
            >
              Edit block
            </button>
          </div>
        ))}
      {canManage && !editing && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2">
          <button
            type="button"
            disabled={!canMoveEarlier || manageBusy || deleting || confirmDelete}
            onClick={onMoveEarlier}
            aria-label={`Move ${blockName} earlier`}
            className="min-h-11 rounded-control border border-border px-3 font-ui text-xs text-text-secondary rf-focus-ring disabled:opacity-40"
          >
            Move earlier
          </button>
          <button
            type="button"
            disabled={!canMoveLater || manageBusy || deleting || confirmDelete}
            onClick={onMoveLater}
            aria-label={`Move ${blockName} later`}
            className="min-h-11 rounded-control border border-border px-3 font-ui text-xs text-text-secondary rf-focus-ring disabled:opacity-40"
          >
            Move later
          </button>
          {empty ? (
            confirmDelete ? (
              <div
                className="flex w-full flex-wrap items-center gap-2"
                role="group"
                aria-label={`Delete ${blockName}`}
              >
                <span className="font-ui text-xs text-text-secondary">
                  Delete this empty block?
                </span>
                <button
                  ref={confirmRef}
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleting(true);
                    setDeleteError(null);
                    void onDelete().catch((e) => {
                      const conflict = isConflict(e);
                      setDeleteError(
                        conflict
                          ? 'Music was assigned to this block. Move or detach its songs, then try again.'
                          : errMessage(e),
                      );
                      if (conflict) {
                        setConfirmDelete(false);
                        editRef.current?.focus();
                        onTracksChanged();
                      }
                      setDeleting(false);
                    });
                  }}
                  className="min-h-11 rounded-control border border-state-danger px-3 font-ui text-xs font-semibold text-state-danger rf-focus-ring disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Delete block'}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    deleteReturnFocusRef.current = true;
                    setConfirmDelete(false);
                    setDeleteError(null);
                  }}
                  className="min-h-11 rounded-control px-3 font-ui text-xs text-text-secondary rf-focus-ring disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                ref={deleteRef}
                type="button"
                disabled={manageBusy}
                onClick={() => setConfirmDelete(true)}
                aria-label={`Delete ${blockName}`}
                className="min-h-11 rounded-control px-3 font-ui text-xs text-state-danger rf-focus-ring disabled:opacity-40"
              >
                Delete block
              </button>
            )
          ) : (
            <p className="w-full font-ui text-xs text-text-tertiary">
              To delete this block, move each song with its Teaching block selector or choose “Not
              in a block” first.
            </p>
          )}
          {deleteError && (
            <p role="alert" className="w-full font-ui text-xs text-state-danger">
              {deleteError}
            </p>
          )}
        </div>
      )}
      {empty ? (
        <div className="rounded-control border border-dashed border-border-subtle bg-bg-sunken px-3 py-2">
          <StatusLabel kind="empty" label="No music yet" />
          {canEdit && (
            <button
              type="button"
              onClick={() => (destOpen ? onCloseMusic?.() : onChooseMusic())}
              aria-expanded={destOpen}
              aria-label={destOpen ? 'Close music' : `Choose music for ${blockName}`}
              className="mt-2 min-h-11 rounded-control border border-interactive/50 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
            >
              {destOpen ? 'Close music' : 'Choose music'}
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {assigned.map((track) => {
            const entry = payload?.tracks.find((row) => row.classTrackId === track.id);
            return (
              <li key={track.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onSelectTrack(track.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-control px-2 text-left font-ui text-sm text-text-primary rf-focus-ring hover:bg-bg-raised"
                >
                  <span className="min-w-0 truncate">
                    {entry
                      ? `${entry.track.title} — ${entry.track.artist}`
                      : `Song ${track.position + 1}`}
                  </span>
                  <span className="shrink-0 font-data text-xs text-text-tertiary">
                    {entry?.track.durationMs != null ? formatDuration(entry.track.durationMs) : '—'}
                  </span>
                </button>
                {canEdit && (
                  <PlanBlockAssignSelect
                    track={track}
                    title={trackTitle(track, payload)}
                    blocks={blocks}
                    onTracksChanged={onTracksChanged}
                    onMoved={onMoved}
                  />
                )}
              </li>
            );
          })}
          {canEdit && (
            <li>
              <button
                type="button"
                onClick={() => (destOpen ? onCloseMusic?.() : onChooseMusic({ stay: true }))}
                aria-expanded={destOpen}
                aria-label={destOpen ? 'Close music' : `Add another song to ${blockName}`}
                className="min-h-11 rounded-control px-2 font-ui text-sm font-semibold text-interactive rf-focus-ring"
              >
                {destOpen ? 'Close music' : 'Add another song'}
              </button>
            </li>
          )}
        </ul>
      )}
      {destOpen ? musicPicker : null}
    </li>
  );
}

/**
 * The move control. `PATCH /class-tracks/:id/plan-block` already existed and
 * already had a client binding; only the control was missing, so a song that
 * landed in the wrong block had to be deleted and re-added.
 */
function PlanBlockAssignSelect({
  track,
  title,
  blocks,
  onTracksChanged,
  onMoved,
}: {
  track: ClassTrack;
  title: string;
  blocks: ClassPlanBlock[];
  onTracksChanged: () => void;
  onMoved: (classTrackId: string, planBlockId: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectId = `plan-block-for-${track.id}`;

  const move = (value: string) => {
    const planBlockId = value === '' ? null : value;
    if (planBlockId === (track.planBlockId ?? null)) return;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await assignClassTrackPlanBlock(track.id, { planBlockId });
        onMoved(track.id, planBlockId);
        onTracksChanged();
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="flex flex-col gap-1 px-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="font-ui text-xs text-text-tertiary">
          Teaching block
        </label>
        <select
          id={selectId}
          value={track.planBlockId ?? ''}
          disabled={busy}
          aria-label={`Teaching block for ${title}`}
          onChange={(event) => move(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-bg-sunken px-2 font-ui text-xs text-text-primary rf-focus-ring disabled:opacity-40"
        >
          <option value="">Not in a block</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {planBlockOptionLabel(block)}
            </option>
          ))}
        </select>
        {busy && <StatusLabel kind="loading" label="Moving" />}
      </div>
      {error && (
        <div role="alert" className="flex flex-col gap-1">
          <StatusLabel kind="error" label="Couldn’t move this song" />
          <p className="font-ui text-xs text-text-secondary">{error}</p>
        </div>
      )}
    </div>
  );
}

function IntervalMismatch({ mismatch }: { mismatch: { intervalMs: number; plannedMs: number } }) {
  return (
    <div className="flex flex-col gap-0.5">
      <StatusLabel kind="unavailable" label="Intervals don’t match planned time" />
      <p className="font-data text-xs text-text-secondary">
        Intervals {formatDuration(mismatch.intervalMs)} · Planned{' '}
        {formatDuration(mismatch.plannedMs)}
      </p>
    </div>
  );
}

const MAX_INTERVAL_SECONDS = MAX_DURATION_MS / 1000;

/** Whole number in [min, max], or null. Rejects decimals, blanks, and signs. */
function parseWhole(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return value >= min && value <= max ? value : null;
}

function sameGuidance(a: ClassPlanBlockGuidance, b: ClassPlanBlockGuidance): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'cycle' && b.kind === 'cycle') {
    return (
      a.posture === b.posture &&
      a.cadenceMinRpm === b.cadenceMinRpm &&
      a.cadenceMaxRpm === b.cadenceMaxRpm &&
      a.rpeMin === b.rpeMin &&
      a.rpeMax === b.rpeMax
    );
  }
  if (a.kind === 'pilates' && b.kind === 'pilates') {
    return (
      a.optionalEquipment.length === b.optionalEquipment.length &&
      a.optionalEquipment.every((item) => b.optionalEquipment.includes(item))
    );
  }
  if (a.kind === 'hiit' && b.kind === 'hiit') {
    return (
      a.workMs === b.workMs &&
      a.recoveryMs === b.recoveryMs &&
      a.rounds === b.rounds &&
      a.sequenceFocus === b.sequenceFocus &&
      a.equipment === b.equipment
    );
  }
  return false;
}

type NumericField =
  | 'duration'
  | 'rounds'
  | 'work'
  | 'recovery'
  | 'cadenceMin'
  | 'cadenceMax'
  | 'rpeMin'
  | 'rpeMax';
type EditField = 'label' | 'teachingGoal' | 'movementFocus' | NumericField;

const LABEL_MAX = 100;
const TEXT_MAX = 500;

/**
 * Shared add/edit form. Edits save only what changed. Planned time and HIIT
 * intervals stay independent of each other and of the class target.
 */
function PlanBlockEditor({
  block,
  classId,
  guidanceKind,
  blockName,
  onSaved,
  onCancel,
}: {
  block: ClassPlanBlock | null;
  classId: string;
  guidanceKind: ClassPlanBlockGuidance['kind'];
  blockName: string;
  onSaved: (block: ClassPlanBlock) => void;
  onCancel: () => void;
}) {
  const idBase = useId();
  const initialGuidance = block?.guidance;
  const initialHiit = initialGuidance?.kind === 'hiit' ? initialGuidance : null;
  const [label, setLabel] = useState(block?.label ?? '');
  const [intensity, setIntensity] = useState<Intensity>(block?.intensity ?? 'mod');
  const [teachingGoal, setTeachingGoal] = useState(block?.teachingGoal ?? '');
  const [movementFocus, setMovementFocus] = useState(block?.movementFocus ?? '');
  const [duration, setDuration] = useState(
    block ? formatPlannedDurationInput(block.targetDurationMs) : '',
  );
  const [timed, setTimed] = useState(
    initialHiit != null && hiitIntervalTotalMs(initialHiit) != null,
  );
  const [rounds, setRounds] = useState(initialHiit?.rounds?.toString() ?? '');
  const [work, setWork] = useState(initialHiit?.workMs ? String(initialHiit.workMs / 1000) : '');
  const [recovery, setRecovery] = useState(
    initialHiit?.recoveryMs ? String(initialHiit.recoveryMs / 1000) : '',
  );
  const [posture, setPosture] = useState<(typeof cyclePostureValues)[number]>(
    initialGuidance?.kind === 'cycle' ? initialGuidance.posture : 'seated',
  );
  const [cadenceMin, setCadenceMin] = useState(
    initialGuidance?.kind === 'cycle' ? String(initialGuidance.cadenceMinRpm) : '',
  );
  const [cadenceMax, setCadenceMax] = useState(
    initialGuidance?.kind === 'cycle' ? String(initialGuidance.cadenceMaxRpm) : '',
  );
  const [rpeMin, setRpeMin] = useState(
    initialGuidance?.kind === 'cycle' ? String(initialGuidance.rpeMin) : '',
  );
  const [rpeMax, setRpeMax] = useState(
    initialGuidance?.kind === 'cycle' ? String(initialGuidance.rpeMax) : '',
  );
  const [optionalEquipment, setOptionalEquipment] = useState<
    (typeof pilatesEquipmentValues)[number][]
  >(initialGuidance?.kind === 'pilates' ? initialGuidance.optionalEquipment : []);
  const [hiitEquipment, setHiitEquipment] = useState<(typeof hiitEquipmentValues)[number]>(
    initialHiit?.equipment ?? 'bodyweight',
  );
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLTextAreaElement>(null);
  const focusRef = useRef<HTMLTextAreaElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const roundsRef = useRef<HTMLInputElement>(null);
  const workRef = useRef<HTMLInputElement>(null);
  const recoveryRef = useRef<HTMLInputElement>(null);
  const cadenceMinRef = useRef<HTMLInputElement>(null);
  const cadenceMaxRef = useRef<HTMLInputElement>(null);
  const rpeMinRef = useRef<HTMLInputElement>(null);
  const rpeMaxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelRef.current?.focus();
    if (block) labelRef.current?.select();
  }, []);

  const plannedMs = parsePlannedDuration(duration);
  const roundsValue = guidanceKind === 'hiit' && timed ? parseWhole(rounds, 1, 100) : null;
  const workValue =
    guidanceKind === 'hiit' && timed ? parseWhole(work, 1, MAX_INTERVAL_SECONDS) : null;
  const recoveryValue =
    guidanceKind === 'hiit' && timed ? parseWhole(recovery, 1, MAX_INTERVAL_SECONDS) : null;
  const cadenceMinValue = guidanceKind === 'cycle' ? parseWhole(cadenceMin, 1, 300) : null;
  const cadenceMaxValue = guidanceKind === 'cycle' ? parseWhole(cadenceMax, 1, 300) : null;
  const rpeMinValue = guidanceKind === 'cycle' ? parseWhole(rpeMin, 1, 10) : null;
  const rpeMaxValue = guidanceKind === 'cycle' ? parseWhole(rpeMax, 1, 10) : null;
  const invalid: Record<EditField, boolean> = {
    label: label.trim() === '',
    teachingGoal: teachingGoal.trim() === '',
    movementFocus: movementFocus.trim() === '',
    duration: plannedMs == null,
    rounds: guidanceKind === 'hiit' && timed && roundsValue == null,
    work: guidanceKind === 'hiit' && timed && workValue == null,
    recovery: guidanceKind === 'hiit' && timed && recoveryValue == null,
    cadenceMin: guidanceKind === 'cycle' && cadenceMinValue == null,
    cadenceMax:
      guidanceKind === 'cycle' &&
      (cadenceMaxValue == null || (cadenceMinValue != null && cadenceMinValue > cadenceMaxValue)),
    rpeMin: guidanceKind === 'cycle' && rpeMinValue == null,
    rpeMax:
      guidanceKind === 'cycle' &&
      (rpeMaxValue == null || (rpeMinValue != null && rpeMinValue > rpeMaxValue)),
  };
  let draftGuidance: ClassPlanBlockGuidance | null = null;
  if (
    guidanceKind === 'cycle' &&
    cadenceMinValue != null &&
    cadenceMaxValue != null &&
    rpeMinValue != null &&
    rpeMaxValue != null &&
    !invalid.cadenceMax &&
    !invalid.rpeMax
  ) {
    draftGuidance = {
      kind: 'cycle',
      posture,
      cadenceMinRpm: cadenceMinValue,
      cadenceMaxRpm: cadenceMaxValue,
      rpeMin: rpeMinValue,
      rpeMax: rpeMaxValue,
    };
  } else if (guidanceKind === 'pilates') {
    draftGuidance = { kind: 'pilates', optionalEquipment };
  } else if (
    guidanceKind === 'hiit' &&
    (!timed || (roundsValue != null && workValue != null && recoveryValue != null))
  ) {
    draftGuidance = {
      kind: 'hiit',
      rounds: timed ? roundsValue : null,
      workMs: timed ? workValue! * 1000 : null,
      recoveryMs: timed ? recoveryValue! * 1000 : null,
      sequenceFocus: initialHiit?.sequenceFocus ?? movementFocus.trim(),
      equipment: hiitEquipment,
    };
  }
  const draftMismatch =
    draftGuidance && plannedMs != null ? hiitIntervalMismatch(draftGuidance, plannedMs) : null;

  const step = (deltaMs: number) => {
    const base = plannedMs ?? block?.targetDurationMs ?? 0;
    const next = Math.min(MAX_DURATION_MS, Math.max(60_000, base + deltaMs));
    setDuration(formatPlannedDurationInput(next));
  };

  const submit = () => {
    if (saving) return;
    setAttempted(true);
    const refs: Record<EditField, RefObject<HTMLInputElement | HTMLTextAreaElement>> = {
      label: labelRef,
      teachingGoal: goalRef,
      movementFocus: focusRef,
      duration: durationRef,
      rounds: roundsRef,
      work: workRef,
      recovery: recoveryRef,
      cadenceMin: cadenceMinRef,
      cadenceMax: cadenceMaxRef,
      rpeMin: rpeMinRef,
      rpeMax: rpeMaxRef,
    };
    const firstInvalid = (Object.keys(invalid) as EditField[]).find((field) => invalid[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }
    if (!draftGuidance || plannedMs == null) return;
    const nextLabel = label.trim();
    const nextGoal = teachingGoal.trim();
    const nextFocus = movementFocus.trim();
    if (block) {
      const body: UpdateClassPlanBlock = {};
      if (nextLabel !== block.label) body.label = nextLabel;
      if (intensity !== block.intensity) body.intensity = intensity;
      if (nextGoal !== block.teachingGoal) body.teachingGoal = nextGoal;
      if (nextFocus !== block.movementFocus) body.movementFocus = nextFocus;
      if (plannedMs !== block.targetDurationMs) body.targetDurationMs = plannedMs;
      const guidance = syncHiitSequenceFocus(draftGuidance, body.movementFocus);
      if (!sameGuidance(guidance, block.guidance)) body.guidance = guidance;
      if (Object.keys(body).length === 0) {
        onCancel();
        return;
      }
      setSaving(true);
      setError(null);
      void (async () => {
        try {
          onSaved(await updateClassPlanBlock(block.id, body));
        } catch (e) {
          setError(errMessage(e));
          setSaving(false);
        }
      })();
    } else {
      const body: CreateClassPlanBlock = {
        segmentType: null,
        label: nextLabel,
        targetDurationMs: plannedMs,
        intensity,
        teachingGoal: nextGoal,
        movementFocus: nextFocus,
        guidance: syncHiitSequenceFocus(draftGuidance, nextFocus),
      };
      setSaving(true);
      setError(null);
      void (async () => {
        try {
          onSaved(await createClassPlanBlock(classId, body));
        } catch (e) {
          setError(errMessage(e));
          setSaving(false);
        }
      })();
    }
  };

  const fieldId = (field: EditField) => `${idBase}-${field}`;
  const helpId = (field: EditField) => `${idBase}-${field}-help`;
  const showInvalid = (field: EditField) => attempted && invalid[field];
  const borderClass = (field: EditField) =>
    showInvalid(field) ? 'border-state-danger' : 'border-border';
  const inputClass = (field: NumericField) =>
    `min-h-11 w-20 rounded-control border bg-bg-sunken px-2 font-data text-sm text-text-primary rf-focus-ring disabled:opacity-40 ${borderClass(field)}`;
  const fieldError = (field: EditField, message: string) =>
    showInvalid(field) ? (
      <span
        id={helpId(field)}
        className="flex items-center gap-1 font-ui text-xs text-state-danger"
      >
        <span aria-hidden>!</span> {message}
      </span>
    ) : null;
  const fieldLabel = (field: EditField, text: string) => (
    <label htmlFor={fieldId(field)} className="font-ui text-xs font-semibold text-text-secondary">
      {text}
    </label>
  );
  const textArea = (
    field: 'teachingGoal' | 'movementFocus',
    text: string,
    value: string,
    setValue: (value: string) => void,
    ref: RefObject<HTMLTextAreaElement>,
  ) => (
    <div className="flex min-w-0 flex-col gap-1">
      {fieldLabel(field, text)}
      <textarea
        ref={ref}
        id={fieldId(field)}
        // Three rows hold a recipe goal whole at 320px; longer text scrolls.
        rows={3}
        maxLength={TEXT_MAX}
        value={value}
        disabled={saving}
        aria-invalid={showInvalid(field)}
        aria-describedby={showInvalid(field) ? helpId(field) : undefined}
        onChange={(event) => setValue(event.target.value)}
        className={`w-full min-w-0 resize-y rounded-control border bg-bg-sunken px-3 py-2 font-ui text-sm leading-5 text-text-primary rf-focus-ring disabled:opacity-40 ${borderClass(field)}`}
      />
      {fieldError(field, `Add a ${text.toLowerCase()}, or cancel to keep the current one.`)}
    </div>
  );
  const numberField = (
    field: Exclude<NumericField, 'duration'>,
    text: string,
    value: string,
    setValue: (value: string) => void,
    ref: RefObject<HTMLInputElement>,
    message: string,
  ) => (
    <div className="flex min-w-0 flex-col gap-1">
      {fieldLabel(field, text)}
      <input
        ref={ref}
        id={fieldId(field)}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={saving}
        aria-invalid={showInvalid(field)}
        aria-describedby={showInvalid(field) ? helpId(field) : undefined}
        onChange={(event) => setValue(event.target.value)}
        className={inputClass(field)}
      />
      {fieldError(field, message)}
    </div>
  );

  return (
    <form
      aria-label={block ? `Editing ${blockName}` : 'Adding a block'}
      className="flex min-w-0 flex-col gap-3 rounded-control border border-border-subtle bg-bg-sunken p-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || saving) return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {fieldLabel('label', 'Block name')}
        <input
          ref={labelRef}
          id={fieldId('label')}
          type="text"
          autoComplete="off"
          maxLength={LABEL_MAX}
          value={label}
          disabled={saving}
          aria-invalid={showInvalid('label')}
          aria-describedby={showInvalid('label') ? helpId('label') : undefined}
          onChange={(event) => setLabel(event.target.value)}
          className={`min-h-11 w-full min-w-0 rounded-control border bg-bg-sunken px-3 font-ui text-sm text-text-primary rf-focus-ring disabled:opacity-40 ${borderClass('label')}`}
        />
        {fieldError('label', 'Name the block before saving.')}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-ui text-xs font-semibold text-text-secondary">Intensity</span>
        <IntensitySegmentedControl
          value={intensity}
          onChange={setIntensity}
          ariaLabel={`Intensity for ${blockName}`}
          disabled={saving}
        />
      </div>
      {textArea('teachingGoal', 'Teaching goal', teachingGoal, setTeachingGoal, goalRef)}
      {textArea('movementFocus', 'Movement focus', movementFocus, setMovementFocus, focusRef)}
      <div className="flex min-w-0 flex-col gap-1">
        {fieldLabel('duration', 'Planned time (m:ss)')}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving || (plannedMs ?? block?.targetDurationMs ?? 0) <= 60_000}
            onClick={() => step(-60_000)}
            aria-label="One minute less"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border font-data text-sm text-text-primary rf-focus-ring disabled:opacity-40"
          >
            −
          </button>
          <input
            ref={durationRef}
            id={fieldId('duration')}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={duration}
            disabled={saving}
            aria-invalid={showInvalid('duration')}
            aria-describedby={helpId('duration')}
            onChange={(event) => setDuration(event.target.value)}
            className={inputClass('duration')}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => step(60_000)}
            aria-label="One minute more"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border font-data text-sm text-text-primary rf-focus-ring disabled:opacity-40"
          >
            +
          </button>
        </div>
        {fieldError('duration', 'Use minutes and seconds, like 6:30.') ?? (
          <span id={helpId('duration')} className="font-ui text-xs text-text-tertiary">
            Changes this block only. The class target stays the same.
          </span>
        )}
      </div>
      {guidanceKind === 'cycle' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-ui text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Cycle guidance
          </legend>
          <div className="flex min-w-0 flex-col gap-1">
            <label
              htmlFor={`${idBase}-posture`}
              className="font-ui text-xs font-semibold text-text-secondary"
            >
              Posture
            </label>
            <select
              id={`${idBase}-posture`}
              value={posture}
              disabled={saving}
              onChange={(event) => setPosture(event.target.value as typeof posture)}
              className="min-h-11 w-full rounded-control border border-border bg-bg-sunken px-3 font-ui text-sm text-text-primary rf-focus-ring disabled:opacity-40"
            >
              {cyclePostureValues.map((value) => (
                <option key={value} value={value}>
                  {value[0]!.toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            {numberField(
              'cadenceMin',
              'Cadence min (RPM)',
              cadenceMin,
              setCadenceMin,
              cadenceMinRef,
              'Use 1–300 RPM.',
            )}
            {numberField(
              'cadenceMax',
              'Cadence max (RPM)',
              cadenceMax,
              setCadenceMax,
              cadenceMaxRef,
              'Use 1–300 RPM, at least the minimum.',
            )}
            {numberField('rpeMin', 'Effort min (RPE)', rpeMin, setRpeMin, rpeMinRef, 'Use 1–10.')}
            {numberField(
              'rpeMax',
              'Effort max (RPE)',
              rpeMax,
              setRpeMax,
              rpeMaxRef,
              'Use 1–10, at least the minimum.',
            )}
          </div>
        </fieldset>
      )}
      {guidanceKind === 'pilates' && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-ui text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Optional equipment
          </legend>
          {pilatesEquipmentValues.map((item) => (
            <label
              key={item}
              className="flex min-h-11 items-center gap-2 font-ui text-sm text-text-secondary"
            >
              <input
                type="checkbox"
                checked={optionalEquipment.includes(item)}
                disabled={saving}
                onChange={(event) =>
                  setOptionalEquipment((current) =>
                    event.target.checked
                      ? [...current, item]
                      : current.filter((value) => value !== item),
                  )
                }
                className="rf-focus-ring"
              />
              {item === 'light_weights' ? 'Light weights' : item[0]!.toUpperCase() + item.slice(1)}
            </label>
          ))}
        </fieldset>
      )}
      {guidanceKind === 'hiit' && (
        <div className="flex min-w-0 flex-col gap-1">
          <label
            htmlFor={`${idBase}-equipment`}
            className="font-ui text-xs font-semibold text-text-secondary"
          >
            Equipment
          </label>
          <select
            id={`${idBase}-equipment`}
            value={hiitEquipment}
            disabled={saving}
            onChange={(event) => setHiitEquipment(event.target.value as typeof hiitEquipment)}
            className="min-h-11 w-full rounded-control border border-border bg-bg-sunken px-3 font-ui text-sm text-text-primary rf-focus-ring disabled:opacity-40"
          >
            {hiitEquipmentValues.map((item) => (
              <option key={item} value={item}>
                {item === 'bodyweight' ? 'Bodyweight' : 'Dumbbells optional'}
              </option>
            ))}
          </select>
        </div>
      )}
      {guidanceKind === 'hiit' && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Intervals
          </legend>
          <label className="flex min-h-11 items-center gap-2 font-ui text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={timed}
              disabled={saving}
              onChange={(event) => setTimed(event.target.checked)}
              className="rf-focus-ring"
            />
            Timed rounds
          </label>
          {timed && (
            <div className="flex flex-wrap gap-3">
              {numberField('rounds', 'Rounds', rounds, setRounds, roundsRef, 'Use 1–100.')}
              {numberField('work', 'Work (s)', work, setWork, workRef, 'Use whole seconds.')}
              {numberField(
                'recovery',
                'Recovery (s)',
                recovery,
                setRecovery,
                recoveryRef,
                'Use whole seconds.',
              )}
            </div>
          )}
        </fieldset>
      )}
      {draftMismatch && <IntervalMismatch mismatch={draftMismatch} />}
      {error && (
        <div role="alert" className="flex flex-col gap-1">
          <StatusLabel
            kind="error"
            label={block ? 'Couldn’t save the block' : 'Couldn’t add the block'}
          />
          <p className="font-ui text-xs text-text-secondary">{error}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 motion-reduce:transition-none"
        >
          {saving ? 'Saving…' : block ? 'Save' : 'Add block'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="min-h-11 rounded-control px-3 font-ui text-sm text-text-tertiary hover:text-text-secondary disabled:opacity-40 rf-focus-ring"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
