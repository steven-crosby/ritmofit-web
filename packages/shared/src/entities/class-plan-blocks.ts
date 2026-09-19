/**
 * Deterministic class-scaffold plan blocks.
 *
 * A plan block is music-independent: it carries the intended teaching structure,
 * while real `class_tracks` assigned to it carry playback and choreography.
 */
import { z } from 'zod';
import { MAX_DURATION_MS, timestampsShape, uuidSchema } from '../common.js';
import { intensitySchema, segmentTypeSchema } from '../enums.js';

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
] as const;
export const scaffoldRecipeIdSchema = z.enum(scaffoldRecipeIdValues);
export type ScaffoldRecipeId = z.infer<typeof scaffoldRecipeIdSchema>;

export const planBlockGuidanceKindValues = ['cycle', 'pilates', 'hiit'] as const;
export const planBlockGuidanceKindSchema = z.enum(planBlockGuidanceKindValues);
export type PlanBlockGuidanceKind = z.infer<typeof planBlockGuidanceKindSchema>;

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
