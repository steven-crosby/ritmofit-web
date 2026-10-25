/**
 * Deterministic class-scaffold plan blocks.
 *
 * A plan block is music-independent: it carries the intended teaching structure,
 * while real `class_tracks` assigned to it carry playback and choreography.
 */
import { z } from 'zod';
import { MAX_DURATION_MS, timestampsShape, uuidSchema } from '../common.js';
import { intensitySchema, segmentTypeSchema, type ClassTemplate } from '../enums.js';

export const scaffoldRecipeIdValues = [
  'cycle_30_v1',
  'cycle_45_v1',
  'cycle_60_v1',
  'pilates_30_v1',
  'pilates_45_v1',
  'pilates_60_v1',
  'hiit_30_v1',
  'hiit_45_v1',
  'hiit_60_v1',
  // v2 (2026-09-28): distinct Cycle peak; fixed 4-minute HIIT finisher. Append-only.
  'cycle_30_v2',
  'cycle_45_v2',
  'cycle_60_v2',
  'hiit_45_v2',
  'hiit_60_v2',
] as const;
export const scaffoldRecipeIdSchema = z.enum(scaffoldRecipeIdValues);
export type ScaffoldRecipeId = z.infer<typeof scaffoldRecipeIdSchema>;

export type ScaffoldRecipeFamily = 'cycle' | 'pilates' | 'hiit';
export type ScaffoldRecipeDuration = 30 | 45 | 60;

/** The recipe new classes receive; older ids stay valid for existing classes and clients. */
export const CURRENT_SCAFFOLD_RECIPES = {
  cycle: { 30: 'cycle_30_v2', 45: 'cycle_45_v2', 60: 'cycle_60_v2' },
  pilates: { 30: 'pilates_30_v1', 45: 'pilates_45_v1', 60: 'pilates_60_v1' },
  hiit: { 30: 'hiit_30_v1', 45: 'hiit_45_v2', 60: 'hiit_60_v2' },
} as const satisfies Record<ScaffoldRecipeFamily, Record<ScaffoldRecipeDuration, ScaffoldRecipeId>>;

export const planBlockGuidanceKindValues = ['cycle', 'pilates', 'hiit'] as const;
export const planBlockGuidanceKindSchema = z.enum(planBlockGuidanceKindValues);
export type PlanBlockGuidanceKind = z.infer<typeof planBlockGuidanceKindSchema>;

/**
 * Playlist-import marker on `recipeBlockKey`. Those rows store structural titles
 * and hidden guidance until an instructor edit clears the key. It is not a recipe id.
 */
export const PLAYLIST_SONG_BLOCK_KEY = 'playlist_song';

/** Planned length used until the song has a positive effective duration. */
export const PLAYLIST_SONG_FALLBACK_TARGET_MS = 60_000;

const PLAYLIST_SONG_LABEL_MAX = 100;
const PLAYLIST_SONG_TEXT_MAX = 500;

export const cyclePostureValues = ['seated', 'standing', 'mixed'] as const;
export const cyclePostureSchema = z.enum(cyclePostureValues);

export const pilatesEquipmentValues = ['mat', 'band', 'light_weights'] as const;
export const pilatesEquipmentSchema = z.enum(pilatesEquipmentValues);

export const hiitEquipmentValues = ['bodyweight', 'dumbbells_optional'] as const;
export const hiitEquipmentSchema = z.enum(hiitEquipmentValues);

const cycleGuidanceSchema = z
  .object({
    kind: z.literal('cycle'),
    posture: cyclePostureSchema,
    cadenceMinRpm: z.int().positive().max(300),
    cadenceMaxRpm: z.int().positive().max(300),
    rpeMin: z.int().min(1).max(10),
    rpeMax: z.int().min(1).max(10),
  })
  .refine((value) => value.cadenceMinRpm <= value.cadenceMaxRpm, {
    message: 'cadenceMinRpm must be less than or equal to cadenceMaxRpm',
  })
  .refine((value) => value.rpeMin <= value.rpeMax, {
    message: 'rpeMin must be less than or equal to rpeMax',
  });

const pilatesGuidanceSchema = z.object({
  kind: z.literal('pilates'),
  optionalEquipment: z.array(pilatesEquipmentSchema).max(pilatesEquipmentValues.length),
});

const hiitGuidanceSchema = z.object({
  kind: z.literal('hiit'),
  workMs: z.int().positive().max(MAX_DURATION_MS).nullable(),
  recoveryMs: z.int().positive().max(MAX_DURATION_MS).nullable(),
  rounds: z.int().positive().max(100).nullable(),
  sequenceFocus: z.string().min(1).max(500),
  equipment: hiitEquipmentSchema,
});

export const classPlanBlockGuidanceSchema = z.discriminatedUnion('kind', [
  cycleGuidanceSchema,
  pilatesGuidanceSchema,
  hiitGuidanceSchema,
]);
export type ClassPlanBlockGuidance = z.infer<typeof classPlanBlockGuidanceSchema>;

export type SongBlockWriteMode = 'replace' | 'append';

/** Positive lengths win. Missing or non-positive lengths keep Run Live's length gate closed. */
export function playlistSongTargetMs(durationMs: number | null): number {
  return durationMs != null && durationMs > 0 ? durationMs : PLAYLIST_SONG_FALLBACK_TARGET_MS;
}

/**
 * Title stored on the block. Trim, collapse whitespace, and cut at the teaching-text
 * max. An empty title becomes `Song N` using the 1-based position in this write.
 */
export function playlistSongIdentifier(rawTitle: string, index: number): string {
  const collapsed = rawTitle.trim().replace(/\s+/g, ' ');
  const title = collapsed.length === 0 ? `Song ${index + 1}` : collapsed;
  return title.slice(0, PLAYLIST_SONG_TEXT_MAX);
}

/** Hidden guidance that satisfies NOT NULL columns without coaching copy. */
export function playlistSongGuidance(
  template: ClassTemplate | null,
  title: string,
): ClassPlanBlockGuidance {
  if (template === 'cycle') {
    return {
      kind: 'cycle',
      posture: 'mixed',
      cadenceMinRpm: 1,
      cadenceMaxRpm: 1,
      rpeMin: 1,
      rpeMax: 1,
    };
  }
  if (template === 'hiit') {
    return {
      kind: 'hiit',
      workMs: null,
      recoveryMs: null,
      rounds: null,
      sequenceFocus: title,
      equipment: 'bodyweight',
    };
  }
  return { kind: 'pilates', optionalEquipment: [] };
}

export interface PlaylistSongBlockDraft {
  recipeBlockKey: typeof PLAYLIST_SONG_BLOCK_KEY;
  label: string;
  segmentType: 'warm_up' | 'cool_down' | null;
  teachingGoal: string;
  movementFocus: string;
  intensity: 'none';
  targetDurationMs: number;
  guidance: ClassPlanBlockGuidance;
}

/**
 * One song in a song-block write. Warm-up and cooldown labels apply only when this
 * write replaces the class's whole block list. One song is the opener only.
 */
export function playlistSongBlockDraft(input: {
  title: string;
  index: number;
  count: number;
  mode: SongBlockWriteMode;
  durationMs: number | null;
  template: ClassTemplate | null;
}): PlaylistSongBlockDraft {
  const identifier = playlistSongIdentifier(input.title, input.index);
  const opener = input.mode === 'replace' && input.index === 0;
  const closer = input.mode === 'replace' && input.count >= 2 && input.index === input.count - 1;
  const label = opener
    ? 'Warm-up'
    : closer
      ? 'Cooldown'
      : identifier.slice(0, PLAYLIST_SONG_LABEL_MAX);
  const segmentType = opener ? 'warm_up' : closer ? 'cool_down' : null;
  return {
    recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
    label,
    segmentType,
    teachingGoal: identifier,
    movementFocus: identifier,
    intensity: 'none',
    targetDurationMs: playlistSongTargetMs(input.durationMs),
    guidance: playlistSongGuidance(input.template, identifier),
  };
}

/**
 * Replace when the class has no songs and every block is still an untouched recipe
 * block. Zero blocks counts as replace. Anything the instructor has started is an append.
 */
export function songBlockWriteMode(
  trackCount: number,
  blocks: readonly { recipeBlockKey: string | null }[],
): SongBlockWriteMode {
  const untouchedRecipe =
    trackCount === 0 &&
    blocks.every(
      (block) => block.recipeBlockKey != null && block.recipeBlockKey !== PLAYLIST_SONG_BLOCK_KEY,
    );
  return untouchedRecipe ? 'replace' : 'append';
}

/** Empty recipe blocks are not instructor-authored structure. Everything else stays. */
export function songBlockIdsToDelete(
  mode: SongBlockWriteMode,
  blocks: readonly { id: string; recipeBlockKey: string | null; trackCount: number }[],
): string[] {
  if (mode === 'replace') return blocks.map((block) => block.id);
  return blocks
    .filter(
      (block) =>
        block.recipeBlockKey != null &&
        block.recipeBlockKey !== PLAYLIST_SONG_BLOCK_KEY &&
        block.trackCount === 0,
    )
    .map((block) => block.id);
}

/**
 * A playlist-song block becomes instructor-authored when teaching text, guidance,
 * intensity, or planned time changes. A label-only save keeps the marker.
 */
export function playlistSongEditClearsKey(
  existing: {
    recipeBlockKey: string | null;
    teachingGoal: string;
    movementFocus: string;
    intensity: string;
    targetDurationMs: number;
    guidance: ClassPlanBlockGuidance;
  },
  patch: {
    teachingGoal?: string;
    movementFocus?: string;
    intensity?: string;
    targetDurationMs?: number;
    guidance?: ClassPlanBlockGuidance;
  },
): boolean {
  if (existing.recipeBlockKey !== PLAYLIST_SONG_BLOCK_KEY) return false;
  if (patch.teachingGoal !== undefined && patch.teachingGoal !== existing.teachingGoal) return true;
  if (patch.movementFocus !== undefined && patch.movementFocus !== existing.movementFocus) {
    return true;
  }
  if (patch.intensity !== undefined && patch.intensity !== existing.intensity) return true;
  if (
    patch.targetDurationMs !== undefined &&
    patch.targetDurationMs !== existing.targetDurationMs
  ) {
    return true;
  }
  if (
    patch.guidance !== undefined &&
    JSON.stringify(patch.guidance) !== JSON.stringify(existing.guidance)
  ) {
    return true;
  }
  return false;
}

const classPlanBlockFields = z.object({
  recipeBlockKey: z.string().min(1).max(100).nullable(),
  position: z.int().nonnegative(),
  segmentType: segmentTypeSchema.nullable(),
  label: z.string().trim().min(1).max(100),
  targetDurationMs: z.int().positive().max(MAX_DURATION_MS),
  intensity: intensitySchema,
  teachingGoal: z.string().trim().min(1).max(500),
  movementFocus: z.string().trim().min(1).max(500),
  guidance: classPlanBlockGuidanceSchema,
});

/** A fully materialized recipe block before server ids/timestamps are assigned. */
export const scaffoldPlanBlockSchema = classPlanBlockFields;
export type ScaffoldPlanBlock = z.infer<typeof scaffoldPlanBlockSchema>;

export const classPlanBlockSchema = classPlanBlockFields.extend({
  id: uuidSchema,
  classId: uuidSchema,
  ...timestampsShape,
});
export type ClassPlanBlock = z.infer<typeof classPlanBlockSchema>;

export const createClassPlanBlockSchema = classPlanBlockFields.omit({
  recipeBlockKey: true,
  position: true,
});
export type CreateClassPlanBlock = z.infer<typeof createClassPlanBlockSchema>;

export const updateClassPlanBlockSchema = createClassPlanBlockSchema.partial();
export type UpdateClassPlanBlock = z.infer<typeof updateClassPlanBlockSchema>;

export const reorderClassPlanBlocksSchema = z.object({
  planBlockIds: z.array(uuidSchema).min(1),
});
export type ReorderClassPlanBlocks = z.infer<typeof reorderClassPlanBlocksSchema>;

export const assignClassTrackPlanBlockSchema = z.object({
  planBlockId: uuidSchema.nullable(),
});
export type AssignClassTrackPlanBlock = z.infer<typeof assignClassTrackPlanBlockSchema>;
