/**
 * Presentation helpers for deterministic class scaffolds. Recipe identity and
 * planned-versus-actual duration stay here so the dialog and block list can
 * share one mapping without reading the API recipe tables.
 */
import {
  MAX_DURATION_MS,
  type ClassPlanBlock,
  type ClassPlanBlockGuidance,
  type ClassTemplate,
  type ClassTrack,
  type RunPayload,
  type ScaffoldRecipeId,
} from '@ritmofit/shared';
import { formatDuration } from './class-summary.js';

export const SCAFFOLD_DISCIPLINES = [
  { value: 'cycle', label: 'Cycle' },
  { value: 'sculpt', label: 'Pilates' },
  { value: 'hiit', label: 'HIIT' },
] as const;

export const SCAFFOLD_DURATIONS = [30, 45, 60] as const;
export const DEFAULT_SCAFFOLD_DURATION = 45;

export type ScaffoldDiscipline = (typeof SCAFFOLD_DISCIPLINES)[number]['value'];
export type ScaffoldDuration = (typeof SCAFFOLD_DURATIONS)[number];
export type PlanFit = 'under' | 'over' | 'on_plan';

const RECIPE_PREFIX: Record<ScaffoldDiscipline, 'cycle' | 'pilates' | 'hiit'> = {
  cycle: 'cycle',
  sculpt: 'pilates',
  hiit: 'hiit',
};

export function isScaffoldDiscipline(value: ClassTemplate | null): value is ScaffoldDiscipline {
  return value === 'cycle' || value === 'sculpt' || value === 'hiit';
}

export function scaffoldRecipeId(
  discipline: ScaffoldDiscipline,
  duration: ScaffoldDuration,
): ScaffoldRecipeId {
  return `${RECIPE_PREFIX[discipline]}_${duration}_v1`;
}

export function tracksForPlanBlock(blockId: string, tracks: readonly ClassTrack[]): ClassTrack[] {
  return tracks.filter((track) => track.planBlockId === blockId);
}

export function unassignedClassTracks(tracks: readonly ClassTrack[]): ClassTrack[] {
  return tracks.filter((track) => track.planBlockId == null);
}

/** Actual assembled music for a block. Empty or payload-less blocks contribute 0. */
export function planBlockActualMs(
  blockId: string,
  tracks: readonly ClassTrack[],
  payload: RunPayload | null,
): number {
  const assigned = new Set(tracksForPlanBlock(blockId, tracks).map((track) => track.id));
  if (!payload) return 0;
  return payload.tracks.reduce((sum, entry) => {
    if (!assigned.has(entry.classTrackId)) return sum;
    return sum + (entry.track.durationMs ?? 0);
  }, 0);
}

export function planBlockFit(
  targetMs: number,
  actualMs: number,
): {
  targetMs: number;
  actualMs: number;
  deltaMs: number;
  fit: PlanFit;
} {
  const deltaMs = actualMs - targetMs;
  return {
    targetMs,
    actualMs,
    deltaMs,
    fit: deltaMs < 0 ? 'under' : deltaMs > 0 ? 'over' : 'on_plan',
  };
}

export function planFitLabel(fit: PlanFit, formattedDelta: string): string {
  if (fit === 'on_plan') return 'On plan';
  if (fit === 'under') return `${formattedDelta} under`;
  return `${formattedDelta} over`;
}

/** Sum of planned block time. Independent of the class target and of music. */
export function planTotalMs(blocks: readonly ClassPlanBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.targetDurationMs, 0);
}

/**
 * Gap between the class's chosen target length and the planned blocks. The
 * target never follows block edits, so this is how a resize becomes visible.
 * Null when the class has no target (legacy/empty classes).
 */
export function classTargetGap(
  targetMs: number | null,
  plannedMs: number,
): { deltaMs: number; fit: PlanFit } | null {
  if (targetMs == null) return null;
  const { deltaMs, fit } = planBlockFit(targetMs, plannedMs);
  return { deltaMs, fit };
}

export function classTargetGapLabel(fit: PlanFit, formattedDelta: string): string {
  if (fit === 'on_plan') return 'On target';
  return `${formattedDelta} ${fit === 'under' ? 'under' : 'over'} target`;
}

/**
 * Timed HIIT interval total (rounds × (work + recovery)). Null for continuous
 * blocks and non-HIIT guidance: there is nothing to compare.
 */
export function hiitIntervalTotalMs(guidance: ClassPlanBlockGuidance): number | null {
  if (guidance.kind !== 'hiit') return null;
  const { rounds, workMs, recoveryMs } = guidance;
  if (rounds == null || workMs == null || recoveryMs == null) return null;
  return rounds * (workMs + recoveryMs);
}

/**
 * Interval total when it differs from planned block time. Neither value is
 * rewritten to match the other; the editor shows both.
 */
export function hiitIntervalMismatch(
  guidance: ClassPlanBlockGuidance,
  plannedMs: number,
): { intervalMs: number; plannedMs: number } | null {
  const intervalMs = hiitIntervalTotalMs(guidance);
  if (intervalMs == null || intervalMs === plannedMs) return null;
  return { intervalMs, plannedMs };
}

/**
 * Parse an instructor-typed planned duration: `m:ss` or whole minutes (`12`).
 * Returns null for anything that is not a positive, bounded duration.
 */
export function parsePlannedDuration(text: string): number | null {
  const value = text.trim();
  const match = /^(\d{1,4})(?::([0-5]\d))?$/.exec(value);
  if (!match) return null;
  const ms = (Number(match[1]) * 60 + Number(match[2] ?? 0)) * 1000;
  if (ms <= 0 || ms > MAX_DURATION_MS) return null;
  return ms;
}

/** `m:ss` for the duration field, never with an hours part (the parser takes minutes). */
export function formatPlannedDurationInput(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * The planning next step, when a class has plan blocks. Live readiness answers a
 * different question (can the class run); this names empty / over / unassigned
 * so "Can run live" is not the first thing she reads mid-build.
 * Underfill is the normal mid-build state and does not lead.
 * Unassigned songs are a placement mistake and lead first. While any block is
 * still empty, filling it leads — overflow stays on the card and must not steal
 * the fill job.
 */
export function planNextStep(
  blocks: readonly ClassPlanBlock[],
  tracks: readonly ClassTrack[],
  payload: RunPayload | null,
): string | null {
  if (blocks.length === 0) return null;

  const unassigned = unassignedClassTracks(tracks);
  if (unassigned.length === 1) return '1 song is not in a plan block';
  if (unassigned.length > 1) return `${unassigned.length} songs are not in a plan block`;

  const fits = blocks.map((block) => ({
    block,
    ...planBlockFit(block.targetDurationMs, planBlockActualMs(block.id, tracks, payload)),
  }));

  const empty = fits.filter((row) => tracksForPlanBlock(row.block.id, tracks).length === 0);
  if (empty.length === 1) {
    return `Block ${empty[0]!.block.position + 1} still needs music`;
  }
  if (empty.length > 1) return `${empty.length} blocks still need music`;

  const over = fits.filter((row) => row.fit === 'over').sort((a, b) => b.deltaMs - a.deltaMs);
  if (over.length === 1) {
    const row = over[0]!;
    return `Block ${row.block.position + 1} is ${formatDuration(row.deltaMs)} over`;
  }
  if (over.length > 1) return `${over.length} blocks are over their planned time`;

  return null;
}

/**
 * First block without assigned music in plan order. `skipBlockId` is the block
 * a song just landed in, before the track list has refreshed.
 */
export function nextEmptyPlanBlock(
  blocks: readonly ClassPlanBlock[],
  tracks: readonly ClassTrack[],
  _payload: RunPayload | null,
  skipBlockId?: string | null,
): ClassPlanBlock | null {
  return (
    [...blocks]
      .sort((a, b) => a.position - b.position)
      .find(
        (block) => block.id !== skipBlockId && tracksForPlanBlock(block.id, tracks).length === 0,
      ) ?? null
  );
}

/**
 * Discipline-specific structure for a block card, read beside `movementFocus`.
 * Says only what the focus line does not: HIIT sequence focus repeats the
 * movement focus, and a mat is a given in mat Pilates. Equipment beyond that is
 * always optional. Empty when there is nothing to add.
 */
export function guidanceSummary(block: ClassPlanBlock): string {
  const { guidance } = block;
  if (guidance.kind === 'cycle') {
    return `${capitalize(guidance.posture)} · ${guidance.cadenceMinRpm}–${guidance.cadenceMaxRpm} rpm · RPE ${guidance.rpeMin}–${guidance.rpeMax}`;
  }
  if (guidance.kind === 'pilates') {
    return guidance.optionalEquipment
      .filter((value) => value !== 'mat')
      .map((value) => (value === 'light_weights' ? 'Optional light weights' : 'Optional band'))
      .join(' · ');
  }
  const interval =
    guidance.workMs != null && guidance.recoveryMs != null
      ? `${guidance.workMs / 1000}/${guidance.recoveryMs / 1000}`
      : 'Continuous';
  const rounds = guidance.rounds != null ? ` · ${guidance.rounds} rounds` : '';
  const equipment = guidance.equipment === 'dumbbells_optional' ? ' · Optional dumbbells' : '';
  return `${interval}${rounds}${equipment}`;
}

/** The block card's secondary line: movement focus plus any structure it lacks. */
export function planBlockDetailLine(block: ClassPlanBlock): string {
  return [block.movementFocus, guidanceSummary(block)].filter(Boolean).join(' · ');
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
