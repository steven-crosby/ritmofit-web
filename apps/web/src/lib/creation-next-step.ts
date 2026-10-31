/**
 * Classes-home next step while the instructor is still building the class.
 * Live queue keeps `classNextStep` (payload-only readiness). This helper lets
 * an unfinished teaching plan outrank Live refinements so a half-filled
 * scaffold is not promoted as closest to teachable.
 *
 * One run rule (RF-131 answer 1b, RF-133): plan gaps and over-time blocks are
 * guidance, never a run gate. A class whose timeline can run keeps its "Can run
 * live" standing here, exactly as in the builder and the Live queue; the plan
 * gap only names the next refinement.
 */
import type { ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import { classNextStep, type ClassDetailState, type ClassNextStep } from './class-ordering.js';
import { planGap } from './class-scaffold.js';
import { canRunPayload } from './duration.js';

export type CreationPlanContext = {
  blocks: readonly ClassPlanBlock[];
  tracks: readonly ClassTrack[];
};

export type CreationClassRef = {
  scaffoldRecipeId: string | null;
  trackCount: number;
};

function planWork(action: string, detail: string, label: string): ClassNextStep {
  // One step more finished than an empty draft (work 0 / teach 4), so Ready to
  // teach ranks a mid-build scaffold above a blank class. Needs work still
  // puts empty drafts first.
  return {
    workRank: 1,
    teachRank: 3,
    eyebrow: 'Fill the plan',
    action,
    detail,
    label,
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
    const gap = planGap(plan.blocks, plan.tracks, payload);
    if (gap) {
      const { lead, label } = gap;
      if (payload && canRunPayload(payload)) {
        // Runnable: the plan gap is guidance on top of the payload's own standing.
        // A fully ready class with plan gaps ranks as "Refine before teaching"
        // (work 3 / teach 1), never level with a class that has nothing left.
        const base = classNextStep(state);
        return {
          workRank: base.teachable ? 3 : base.workRank,
          teachRank: base.teachable ? 1 : base.teachRank,
          eyebrow: 'Refine before teaching',
          action: actionFromPlanLead(lead),
          detail: `Can run live · ${lead}`,
          label,
          teachable: false,
        };
      }
      return planWork(actionFromPlanLead(lead), lead, label);
    }
  }

  if (cls.scaffoldRecipeId && cls.trackCount === 0) {
    return planWork('Add music to the plan', 'Teaching plan · no music yet', 'Plan has no music');
  }

  return classNextStep(state);
}
