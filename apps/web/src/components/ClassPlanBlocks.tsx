/**
 * Basic Builder rendering for music-independent plan blocks. Empty blocks stay
 * visible as teaching structure; they never become Live tracks.
 *
 * Assignment is block-scoped end to end: `onChooseMusic` hands the caller the
 * whole block so the picker can name its real destination, and every song row
 * carries the control that moves it between blocks (or out of the plan), so a
 * misplaced song is a correction rather than a delete-and-re-add.
 */
import { useEffect, useState } from 'react';
import type { ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import { assignClassTrackPlanBlock, listClassPlanBlocks } from '../lib/api.js';
import {
  guidanceSummary,
  planBlockActualMs,
  planBlockFit,
  planFitLabel,
  tracksForPlanBlock,
  unassignedClassTracks,
} from '../lib/class-scaffold.js';
import { formatDuration } from '../lib/class-summary.js';
import { errMessage } from '../lib/errors.js';
import { IntensityReadout } from './IntensityReadout.js';
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
  tracks,
  payload,
  canEdit,
  assigningPlanBlockId,
  onChooseMusic,
  onSelectTrack,
  onTracksChanged,
}: {
  classId: string;
  tracks: ClassTrack[];
  payload: RunPayload | null;
  canEdit: boolean;
  assigningPlanBlockId: string | null;
  onChooseMusic: (block: PlanBlockTarget) => void;
  onSelectTrack: (classTrackId: string) => void;
  onTracksChanged: () => void;
}) {
  const [blocks, setBlocks] = useState<ClassPlanBlock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  const unassigned = unassignedClassTracks(tracks);

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
      </div>
      <ol className="flex flex-col gap-2">
        {blocks.map((block) => (
          <PlanBlockCard
            key={block.id}
            block={block}
            blocks={blocks}
            tracks={tracks}
            payload={payload}
            canEdit={canEdit}
            assigning={assigningPlanBlockId === block.id}
            onChooseMusic={() =>
              onChooseMusic({ id: block.id, label: block.label, position: block.position })
            }
            onSelectTrack={onSelectTrack}
            onTracksChanged={onTracksChanged}
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
  onChooseMusic,
  onSelectTrack,
  onTracksChanged,
}: {
  block: ClassPlanBlock;
  blocks: ClassPlanBlock[];
  tracks: ClassTrack[];
  payload: RunPayload | null;
  canEdit: boolean;
  assigning: boolean;
  onChooseMusic: () => void;
  onSelectTrack: (classTrackId: string) => void;
  onTracksChanged: () => void;
}) {
  const assigned = tracksForPlanBlock(block.id, tracks);
  const actualMs = planBlockActualMs(block.id, tracks, payload);
  const fit = planBlockFit(block.targetDurationMs, actualMs);
  const fitText = planFitLabel(fit.fit, formatDuration(Math.abs(fit.deltaMs)));
  const empty = assigned.length === 0;
  const blockName = planBlockOptionLabel(block);

  return (
    <li
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
      <p className="font-ui text-xs leading-4 text-text-tertiary">
        {block.movementFocus} · {guidanceSummary(block)}
      </p>
      <p className="font-data text-xs text-text-secondary">
        Planned {formatDuration(block.targetDurationMs)} · Music {formatDuration(actualMs)} ·{' '}
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
      </p>
      {empty ? (
        <div className="rounded-control border border-dashed border-border-subtle bg-bg-sunken px-3 py-2">
          <StatusLabel kind="empty" label="No music yet" />
          {canEdit && (
            <button
              type="button"
              onClick={onChooseMusic}
              aria-label={`Choose music for ${blockName}`}
              className="mt-2 min-h-11 rounded-control border border-interactive/50 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
            >
              Choose music
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
                  />
                )}
              </li>
            );
          })}
          {canEdit && (
            <li>
              <button
                type="button"
                onClick={onChooseMusic}
                aria-label={`Add another song to ${blockName}`}
                className="min-h-11 rounded-control px-2 font-ui text-sm font-semibold text-interactive rf-focus-ring"
              >
                Add another song
              </button>
            </li>
          )}
        </ul>
      )}
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
}: {
  track: ClassTrack;
  title: string;
  blocks: ClassPlanBlock[];
  onTracksChanged: () => void;
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
