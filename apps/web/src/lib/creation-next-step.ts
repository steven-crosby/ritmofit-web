/**
 * Classes-home next step while the instructor is still building the class.
 * Live queue keeps `classNextStep` (payload-only readiness). This helper lets
 * an unfinished teaching plan outrank "Add the missing tempo" so a half-filled
 * scaffold is not promoted as closest to teachable.
 */
import type { ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import { classNextStep, type ClassDetailState, type ClassNextStep } from './class-ordering.js';
import { planNextStep } from './class-scaffold.js';

export type CreationPlanContext = {
  blocks: readonly ClassPlanBlock[];
  tracks: readonly ClassTrack[];
};

export type CreationClassRef = {
  scaffoldRecipeId: string | null;
  trackCount: number;
};

function planWork(action: string, detail: string): ClassNextStep {
  // One step more finished than an empty draft (work 0 / teach 4), so Ready to
  // teach ranks a mid-build scaffold above a blank class. Needs work still
  // puts empty drafts first.
  return {
    workRank: 1,
    teachRank: 3,
    eyebrow: 'Fill the plan',
    action,
    detail,
    teachable: false,
  };
}

export function actionFromPlanLead(lead: string): string {
  if (lead.includes('not in a plan block')) return 'Put songs in the plan';
  if (lead.includes('over')) return 'Fix overflowing blocks';
  return 'Add music to the plan';
}

export function creationNextStep(
  cls: CreationClassRef,
  state: ClassDetailState | undefined,
  plan?: CreationPlanContext | null,
): ClassNextStep {
  const payload: RunPayload | null = state?.status === 'ready' ? state.payload : null;
  if (plan && plan.blocks.length > 0) {
    const lead = planNextStep(plan.blocks, plan.tracks, payload);
    if (lead) return planWork(actionFromPlanLead(lead), lead);
  }

  if (cls.scaffoldRecipeId && cls.trackCount === 0) {
    return planWork('Add music to the plan', 'Teaching plan · no music yet');
  }

  return classNextStep(state);
}
