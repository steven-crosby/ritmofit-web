/**
 * Immutable deterministic scaffold recipes.
 *
 * These are creation recipes, not live templates: generation materializes every
 * block into the class, so later recipe versions cannot rewrite existing work.
 */
import {
  scaffoldPlanBlockSchema,
  scaffoldRecipeIdSchema,
  type ClassTemplate,
  type ScaffoldPlanBlock,
  type ScaffoldRecipeId,
} from '@ritmofit/shared';

const MINUTE_MS = 60_000;

type Duration = 30 | 45 | 60;
type BaseBlock = Omit<ScaffoldPlanBlock, 'position' | 'targetDurationMs'> & {
  minutes: Record<Duration, number>;
};

export interface GeneratedScaffold {
  recipeId: ScaffoldRecipeId;
  template: ClassTemplate;
  targetDurationMs: number;
  blocks: ScaffoldPlanBlock[];
}

const cycleBlocks: BaseBlock[] = [
  {
    recipeBlockKey: 'cycle_arrive',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'warm_up',
    label: 'Arrive on the bike',
    intensity: 'easy',
    teachingGoal: 'Establish rhythm and preview the ride shape.',
    movementFocus: 'Comfortable pedal stroke and relaxed upper body.',
    guidance: {
      kind: 'cycle',
      posture: 'seated',
      cadenceMinRpm: 80,
      cadenceMaxRpm: 95,
      rpeMin: 2,
      rpeMax: 3,
    },
  },
  {
    recipeBlockKey: 'cycle_build_base',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'climb',
    label: 'Build the base',
    intensity: 'mod',
    teachingGoal: 'Add sustainable work without spending the peak.',
    movementFocus: 'Smooth pressure through the full pedal stroke.',
    guidance: {
      kind: 'cycle',
      posture: 'mixed',
      cadenceMinRpm: 75,
      cadenceMaxRpm: 90,
      rpeMin: 4,
      rpeMax: 5,
    },
  },
  {
    recipeBlockKey: 'cycle_seated_climb',
    minutes: { 30: 5, 45: 7, 60: 10 },
    segmentType: 'climb',
    label: 'Seated climb',
    intensity: 'mod',
    teachingGoal: 'Hold controlled climbing effort.',
    movementFocus: 'Stable hips and consistent cadence.',
    guidance: {
      kind: 'cycle',
      posture: 'seated',
      cadenceMinRpm: 60,
      cadenceMaxRpm: 75,
      rpeMin: 5,
      rpeMax: 6,
    },
  },
  {
    recipeBlockKey: 'cycle_speed_control',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'sprint',
    label: 'Speed control',
    intensity: 'hard',
    teachingGoal: 'Practice faster cadence while keeping control.',
    movementFocus: 'Quick, even turnover.',
    guidance: {
      kind: 'cycle',
      posture: 'seated',
      cadenceMinRpm: 95,
      cadenceMaxRpm: 110,
      rpeMin: 6,
      rpeMax: 7,
    },
  },
  {
    recipeBlockKey: 'cycle_standing_climb',
    minutes: { 30: 5, 45: 7, 60: 10 },
    segmentType: 'climb',
    label: 'Standing climb',
    intensity: 'hard',
    teachingGoal: 'Build the main sustained challenge.',
    movementFocus: 'Balanced standing posture and steady rhythm.',
    guidance: {
      kind: 'cycle',
      posture: 'standing',
      cadenceMinRpm: 60,
      cadenceMaxRpm: 75,
      rpeMin: 7,
      rpeMax: 8,
    },
  },
  {
    recipeBlockKey: 'cycle_peak',
    minutes: { 30: 4, 45: 7, 60: 8 },
    segmentType: 'sprint',
    label: 'Peak effort',
    intensity: 'hard',
    teachingGoal: 'Deliver one clear peak with recoverable form.',
    movementFocus: 'Strong acceleration followed by control.',
    guidance: {
      kind: 'cycle',
      posture: 'mixed',
      cadenceMinRpm: 85,
      cadenceMaxRpm: 105,
      rpeMin: 8,
      rpeMax: 9,
    },
  },
  {
    recipeBlockKey: 'cycle_release',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'cool_down',
    label: 'Return and release',
    intensity: 'easy',
    teachingGoal: 'Bring effort down and close the ride.',
    movementFocus: 'Easy cadence and relaxed breathing.',
    guidance: {
      kind: 'cycle',
      posture: 'seated',
      cadenceMinRpm: 70,
      cadenceMaxRpm: 90,
      rpeMin: 1,
      rpeMax: 3,
    },
  },
];

const pilatesBlocks: BaseBlock[] = [
  {
    recipeBlockKey: 'pilates_arrive',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'warm_up',
    label: 'Arrive and breathe',
    intensity: 'easy',
    teachingGoal: 'Establish breath, alignment, and control.',
    movementFocus: 'Breath with neutral alignment.',
    guidance: { kind: 'pilates', optionalEquipment: ['mat'] },
  },
  {
    recipeBlockKey: 'pilates_mobilize',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'warm_up',
    label: 'Mobilize',
    intensity: 'easy',
    teachingGoal: 'Prepare the spine and major joints for loaded movement.',
    movementFocus: 'Articulation and controlled mobility.',
    guidance: { kind: 'pilates', optionalEquipment: ['mat'] },
  },
  {
    recipeBlockKey: 'pilates_center',
    minutes: { 30: 5, 45: 7, 60: 10 },
    segmentType: null,
    label: 'Center and stabilize',
    intensity: 'mod',
    teachingGoal: 'Build trunk organization before larger ranges.',
    movementFocus: 'Deep core stability and pelvic control.',
    guidance: { kind: 'pilates', optionalEquipment: ['mat'] },
  },
  {
    recipeBlockKey: 'pilates_lower_body',
    minutes: { 30: 5, 45: 7, 60: 10 },
    segmentType: null,
    label: 'Lower-body strength',
    intensity: 'mod',
    teachingGoal: 'Develop controlled hip and leg strength.',
    movementFocus: 'Glutes, hips, and unilateral control.',
    guidance: { kind: 'pilates', optionalEquipment: ['mat', 'band'] },
  },
  {
    recipeBlockKey: 'pilates_upper_body',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: null,
    label: 'Upper-body posture',
    intensity: 'mod',
    teachingGoal: 'Support shoulder stability and upright posture.',
    movementFocus: 'Scapular control and upper-back strength.',
    guidance: { kind: 'pilates', optionalEquipment: ['mat', 'light_weights'] },
  },
  {
    recipeBlockKey: 'pilates_flow',
    minutes: { 30: 4, 45: 7, 60: 8 },
    segmentType: null,
    label: 'Integrated flow',
    intensity: 'hard',
    teachingGoal: 'Connect familiar patterns into one controlled sequence.',
    movementFocus: 'Whole-body coordination without rushing.',
    guidance: { kind: 'pilates', optionalEquipment: ['mat'] },
  },
  {
    recipeBlockKey: 'pilates_release',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'cool_down',
    label: 'Release',
    intensity: 'easy',
    teachingGoal: 'Reduce effort and restore comfortable range.',
    movementFocus: 'Gentle mobility and breath.',
    guidance: { kind: 'pilates', optionalEquipment: ['mat'] },
  },
];

const hiitBlocks: BaseBlock[] = [
  {
    recipeBlockKey: 'hiit_prep',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'warm_up',
    label: 'Movement prep',
    intensity: 'easy',
    teachingGoal: 'Prepare joints and rehearse the movement vocabulary.',
    movementFocus: 'Mobility, bracing, and low-impact locomotion.',
    guidance: {
      kind: 'hiit',
      workMs: null,
      recoveryMs: null,
      rounds: null,
      sequenceFocus: 'Mobility, bracing, and low-impact locomotion.',
      equipment: 'bodyweight',
    },
  },
  {
    recipeBlockKey: 'hiit_practice',
    minutes: { 30: 4, 45: 5, 60: 7 },
    segmentType: null,
    label: 'Pattern practice',
    intensity: 'mod',
    teachingGoal: 'Practice the interval rhythm before intensity rises.',
    movementFocus: 'Squat, hinge, push, and trunk patterns.',
    guidance: {
      kind: 'hiit',
      workMs: 30_000,
      recoveryMs: 30_000,
      rounds: null,
      sequenceFocus: 'Squat, hinge, push, and trunk patterns.',
      equipment: 'bodyweight',
    },
  },
  {
    recipeBlockKey: 'hiit_circuit_a',
    minutes: { 30: 6, 45: 9, 60: 12 },
    segmentType: null,
    label: 'Circuit A',
    intensity: 'hard',
    teachingGoal: 'Build repeatable work across major movement patterns.',
    movementFocus: 'Lower body, upper body, locomotion, and trunk.',
    guidance: {
      kind: 'hiit',
      workMs: 30_000,
      recoveryMs: 30_000,
      rounds: null,
      sequenceFocus: 'Lower body, upper body, locomotion, and trunk.',
      equipment: 'bodyweight',
    },
  },
  {
    recipeBlockKey: 'hiit_reset',
    minutes: { 30: 2, 45: 3, 60: 4 },
    segmentType: 'recovery',
    label: 'Reset',
    intensity: 'easy',
    teachingGoal: 'Bring breathing down and prepare the second circuit.',
    movementFocus: 'Walk, breathe, and review the next sequence.',
    guidance: {
      kind: 'hiit',
      workMs: null,
      recoveryMs: null,
      rounds: null,
      sequenceFocus: 'Walk, breathe, and review the next sequence.',
      equipment: 'bodyweight',
    },
  },
  {
    recipeBlockKey: 'hiit_circuit_b',
    minutes: { 30: 6, 45: 9, 60: 12 },
    segmentType: null,
    label: 'Circuit B',
    intensity: 'hard',
    teachingGoal: 'Repeat the structure with new movement emphasis.',
    movementFocus: 'Unilateral legs, upper body, trunk, and locomotion.',
    guidance: {
      kind: 'hiit',
      workMs: 30_000,
      recoveryMs: 30_000,
      rounds: null,
      sequenceFocus: 'Unilateral legs, upper body, trunk, and locomotion.',
      equipment: 'dumbbells_optional',
    },
  },
  {
    recipeBlockKey: 'hiit_finisher',
    minutes: { 30: 4, 45: 7, 60: 9 },
    segmentType: 'sprint',
    label: 'Finisher',
    intensity: 'hard',
    teachingGoal: 'Create one short, clearly bounded peak.',
    movementFocus: 'Simple whole-body patterns with low-complexity options.',
    guidance: {
      kind: 'hiit',
      workMs: 30_000,
      recoveryMs: 30_000,
      rounds: null,
      sequenceFocus: 'Simple whole-body patterns with low-complexity options.',
      equipment: 'bodyweight',
    },
  },
  {
    recipeBlockKey: 'hiit_cool_down',
    minutes: { 30: 4, 45: 6, 60: 8 },
    segmentType: 'cool_down',
    label: 'Cool down',
    intensity: 'easy',
    teachingGoal: 'Reduce effort gradually and close the session.',
    movementFocus: 'Easy locomotion, mobility, and breathing.',
    guidance: {
      kind: 'hiit',
      workMs: null,
      recoveryMs: null,
      rounds: null,
      sequenceFocus: 'Easy locomotion, mobility, and breathing.',
      equipment: 'bodyweight',
    },
  },
];

function parseRecipeId(recipeId: ScaffoldRecipeId): {
  family: 'cycle' | 'pilates' | 'hiit';
  duration: Duration;
} {
  scaffoldRecipeIdSchema.parse(recipeId);
  const [family, rawDuration] = recipeId.split('_');
  return {
    family: family as 'cycle' | 'pilates' | 'hiit',
    duration: Number(rawDuration) as Duration,
  };
}

/** Materialize one immutable recipe into validated, persistence-ready plan blocks. */
export function generateScaffold(recipeId: ScaffoldRecipeId): GeneratedScaffold {
  const { family, duration } = parseRecipeId(recipeId);
  const source =
    family === 'cycle' ? cycleBlocks : family === 'pilates' ? pilatesBlocks : hiitBlocks;
  const template: ClassTemplate = family === 'pilates' ? 'sculpt' : family;

  const blocks = source.map((block, position) => {
    const targetDurationMs = block.minutes[duration] * MINUTE_MS;
    const guidance =
      block.guidance.kind === 'hiit' && block.guidance.workMs != null
        ? { ...block.guidance, rounds: targetDurationMs / MINUTE_MS }
        : block.guidance;
    return scaffoldPlanBlockSchema.parse({
      ...block,
      minutes: undefined,
      position,
      targetDurationMs,
      guidance,
    });
  });
  const targetDurationMs = blocks.reduce((sum, block) => sum + block.targetDurationMs, 0);
  const expectedDurationMs = duration * MINUTE_MS;
  if (targetDurationMs !== expectedDurationMs) {
    throw new Error(
      `Recipe ${recipeId} totals ${targetDurationMs}ms; expected ${expectedDurationMs}ms.`,
    );
  }

  return { recipeId, template, targetDurationMs, blocks };
}
