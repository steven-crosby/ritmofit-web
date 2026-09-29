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
  type ClassPlanBlock,
  type ClassTrack,
  type Intensity,
  type RunPayload,
  type UpdateClassPlanBlock,
} from '@ritmofit/shared';
import {
  assignClassTrackPlanBlock,
  listClassPlanBlocks,
  updateClassPlanBlock,
} from '../lib/api.js';
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

/** Title for a class track, preferring the resolved payload entry. */
function trackTitle(track: ClassTrack, payload: RunPayload | null): string {
  const entry = payload?.tracks.find((row) => row.classTrackId === track.id);
  return entry ? `${entry.track.title} — ${entry.track.artist}` : `Song ${track.position + 1}`;
}

export function ClassPlanBlocks({
  classId,
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
  }, [classId, reloadKey]);

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
    if (choseFocusRef.current) return;
    choseFocusRef.current = true;
    const firstBlock = [...blocks].sort((a, b) => a.position - b.position)[0]!;
    const first = document.querySelector<HTMLButtonElement>(
      `#plan-block-card-${firstBlock.id} button[aria-label^="Choose music"]`,
    );
    first?.focus();
  }, [focusFirstChoose, canEdit, blocks, tracks.length, classId]);

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

  if (blocks.length === 0) return null;

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
      <ol className="flex flex-col gap-2">
        {blocks.map((block) => (
          <PlanBlockCard
            key={block.id}
            block={block}
            blocks={blocks}
            tracks={visibleTracks}
            payload={payload}
            canEdit={canEdit}
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
  const editRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef(false);
  useLayoutEffect(() => {
    if (editing || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    editRef.current?.focus();
  }, [editing]);
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

type EditField = 'label' | 'teachingGoal' | 'movementFocus' | TimeField;
type TimeField = 'duration' | 'rounds' | 'work' | 'recovery';

const LABEL_MAX = 100;
const TEXT_MAX = 500;

/**
 * Inline block editor. Saves only what changed. Planned time and HIIT interval
 * guidance stay independent: neither is rewritten to match the other or the
 * class target. Enter in a single-line field saves; Escape cancels.
 */
function PlanBlockEditor({
  block,
  blockName,
  onSaved,
  onCancel,
}: {
  block: ClassPlanBlock;
  blockName: string;
  onSaved: (block: ClassPlanBlock) => void;
  onCancel: () => void;
}) {
  const idBase = useId();
  const hiit =
    block.guidance.kind === 'hiit' && hiitIntervalTotalMs(block.guidance) != null
      ? block.guidance
      : null;
  const [label, setLabel] = useState(block.label);
  const [intensity, setIntensity] = useState<Intensity>(block.intensity);
  const [teachingGoal, setTeachingGoal] = useState(block.teachingGoal);
  const [movementFocus, setMovementFocus] = useState(block.movementFocus);
  const [duration, setDuration] = useState(formatPlannedDurationInput(block.targetDurationMs));
  const [rounds, setRounds] = useState(hiit ? String(hiit.rounds) : '');
  const [work, setWork] = useState(hiit ? String(hiit.workMs! / 1000) : '');
  const [recovery, setRecovery] = useState(hiit ? String(hiit.recoveryMs! / 1000) : '');
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

  useEffect(() => {
    labelRef.current?.focus();
    labelRef.current?.select();
  }, []);

  const plannedMs = parsePlannedDuration(duration);
  const roundsValue = hiit ? parseWhole(rounds, 1, 100) : null;
  const workValue = hiit ? parseWhole(work, 1, MAX_INTERVAL_SECONDS) : null;
  const recoveryValue = hiit ? parseWhole(recovery, 1, MAX_INTERVAL_SECONDS) : null;
  const invalid: Record<EditField, boolean> = {
    label: label.trim() === '',
    teachingGoal: teachingGoal.trim() === '',
    movementFocus: movementFocus.trim() === '',
    duration: plannedMs == null,
    rounds: hiit != null && roundsValue == null,
    work: hiit != null && workValue == null,
    recovery: hiit != null && recoveryValue == null,
  };
  const draftGuidance =
    hiit && roundsValue != null && workValue != null && recoveryValue != null
      ? { ...hiit, rounds: roundsValue, workMs: workValue * 1000, recoveryMs: recoveryValue * 1000 }
      : null;
  const draftMismatch =
    draftGuidance && plannedMs != null ? hiitIntervalMismatch(draftGuidance, plannedMs) : null;

  const step = (deltaMs: number) => {
    const base = plannedMs ?? block.targetDurationMs;
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
    };
    const firstInvalid = (Object.keys(invalid) as EditField[]).find((field) => invalid[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }
    const body: UpdateClassPlanBlock = {};
    const nextLabel = label.trim();
    const nextGoal = teachingGoal.trim();
    const nextFocus = movementFocus.trim();
    if (nextLabel !== block.label) body.label = nextLabel;
    if (intensity !== block.intensity) body.intensity = intensity;
    if (nextGoal !== block.teachingGoal) body.teachingGoal = nextGoal;
    if (nextFocus !== block.movementFocus) body.movementFocus = nextFocus;
    if (plannedMs !== block.targetDurationMs) body.targetDurationMs = plannedMs!;
    const intervalsChanged =
      hiit != null &&
      draftGuidance != null &&
      (draftGuidance.rounds !== hiit.rounds ||
        draftGuidance.workMs !== hiit.workMs ||
        draftGuidance.recoveryMs !== hiit.recoveryMs);
    const guidance = syncHiitSequenceFocus(
      intervalsChanged ? draftGuidance! : block.guidance,
      body.movementFocus,
    );
    if (guidance !== block.guidance) body.guidance = guidance;
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
  };

  const fieldId = (field: EditField) => `${idBase}-${field}`;
  const helpId = (field: EditField) => `${idBase}-${field}-help`;
  const showInvalid = (field: EditField) => attempted && invalid[field];
  const borderClass = (field: EditField) =>
    showInvalid(field) ? 'border-state-danger' : 'border-border';
  const inputClass = (field: TimeField) =>
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
    field: Exclude<TimeField, 'duration'>,
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
      aria-label={`Editing ${blockName}`}
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
        {fieldError('label', 'Name the block, or cancel to keep the current name.')}
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
            disabled={saving || (plannedMs ?? block.targetDurationMs) <= 60_000}
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
      {hiit && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Intervals
          </legend>
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
        </fieldset>
      )}
      {draftMismatch && <IntervalMismatch mismatch={draftMismatch} />}
      {error && (
        <div role="alert" className="flex flex-col gap-1">
          <StatusLabel kind="error" label="Couldn’t save the block" />
          <p className="font-ui text-xs text-text-secondary">{error}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 motion-reduce:transition-none"
        >
          {saving ? 'Saving…' : 'Save'}
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
