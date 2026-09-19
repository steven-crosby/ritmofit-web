/**
 * Presentation helpers for deterministic class scaffolds. Recipe identity and
 * planned-versus-actual duration stay here so the dialog and block list can
 * share one mapping without reading the API recipe tables.
 */
import type {
  ClassPlanBlock,
  ClassTemplate,
  ClassTrack,
  RunPayload,
  ScaffoldRecipeId,
} from '@ritmofit/shared';

export const SCAFFOLD_DISCIPLINES = [
  { value: 'cycle', label: 'Cycle' },
  { value: 'sculpt', label: 'Pilates' },
  { value: 'hiit', label: 'HIIT' },
] as const;

export const SCAFFOLD_DURATIONS = [30, 45, 60] as const;
export const DEFAULT_SCAFFOLD_DURATION = 45;
export const SCAFFOLD_BLOCK_COUNT = 7;

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

export function guidanceSummary(block: ClassPlanBlock): string {
  const { guidance } = block;
  if (guidance.kind === 'cycle') {
    const posture = guidance.posture === 'mixed' ? 'Seated/mixed' : capitalize(guidance.posture);
    return `${posture} · ${guidance.cadenceMinRpm}–${guidance.cadenceMaxRpm} rpm · RPE ${guidance.rpeMin}–${guidance.rpeMax}`;
  }
  if (guidance.kind === 'pilates') {
    if (guidance.optionalEquipment.length === 0) return 'Mat';
    return guidance.optionalEquipment.map(pilatesEquipmentLabel).join(' · ');
  }
  const interval =
    guidance.workMs != null && guidance.recoveryMs != null
      ? `${guidance.workMs / 1000}/${guidance.recoveryMs / 1000}`
      : 'Continuous';
  const rounds = guidance.rounds != null ? ` · ${guidance.rounds} rounds` : '';
  return `${interval}${rounds} · ${guidance.sequenceFocus}`;
}

function pilatesEquipmentLabel(value: 'mat' | 'band' | 'light_weights'): string {
  if (value === 'light_weights') return 'Light weights';
  return capitalize(value);
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
