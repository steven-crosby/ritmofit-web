/**
 * Class ordering — the shared answer to "what am I teaching next, and what does
 * it still need?" (design audit 2026-07-24, P0-02/P0-03).
 *
 * Two orderings are legitimate and the instructor picks between them:
 *   • READY TO TEACH (default, PDR-01) — the class closest to teachable first.
 *   • NEEDS WORK — the least-finished first; the behaviour that shipped before
 *     this module existed ("the next creative step, then readiness and recency").
 *
 * Both read the same per-class next step, so a card's primary verb and its rank
 * can never disagree. The derivation is pure and lives here rather than in a
 * component because Classes (`ClassRunOfShowShelf`) and Live (`LiveWorkspace`)
 * must rank identically — a class that leads on Classes leads in the Live queue.
 *
 * No schema change: every input is derived from the run-payload, and the chosen
 * ordering is session state (see `readStoredOrdering`), never a persisted field.
 */
import type { RunPayload } from '@ritmofit/shared';
import { classPulseFromPayload } from './class-pulse.js';
import { classReadiness } from './readiness.js';

export type ClassOrdering = 'ready_to_teach' | 'needs_work';

/** PDR-01, owner-resolved 2026-07-24: teaching readiness is the default. */
export const DEFAULT_CLASS_ORDERING: ClassOrdering = 'ready_to_teach';

/**
 * The switch's options, in menu order. `summary` is rendered as visible text so
 * the active ordering is stated, not implied by which control looks selected.
 */
export const CLASS_ORDERING_OPTIONS: ReadonlyArray<{
  value: ClassOrdering;
  label: string;
  summary: string;
}> = [
  {
    value: 'ready_to_teach',
    label: 'Ready to teach',
    summary: 'Ordered by ready to teach — closest to teachable first.',
  },
  {
    value: 'needs_work',
    label: 'Needs work',
    summary: 'Ordered by the next creative step, then readiness and recency.',
  },
];

export function orderingSummary(ordering: ClassOrdering): string {
  const match = CLASS_ORDERING_OPTIONS.find((option) => option.value === ordering);
  return match ? match.summary : 'Ordered by ready to teach — closest to teachable first.';
}

export function isClassOrdering(value: unknown): value is ClassOrdering {
  return value === 'ready_to_teach' || value === 'needs_work';
}

/**
 * Per-class detail as a consuming surface holds it. Ranking has to cope with
 * classes whose payload has not arrived (or failed), so those are states rather
 * than an absent payload.
 */
export type ClassDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; payload: RunPayload };

export type ClassNextStep = {
  /** Ascending = least finished first. The "needs work" ordering. */
  workRank: number;
  /** Ascending = closest to teachable first. The "ready to teach" ordering. */
  teachRank: number;
  /** Short state phrase above the class title. */
  eyebrow: string;
  /** The primary verb — names this class's actual next step (P0-03). */
  action: string;
  /** One line of supporting fact for the status label. */
  detail: string;
  /** Runnable with nothing left outstanding. */
  teachable: boolean;
};

/**
 * Known states are ranked 0–4 by how finished the class is; the two orderings are
 * mirror images of that scale (`teachRank = KNOWN_RANKS - 1 - workRank`).
 *
 * A class whose details are loading or failed is ranked *last in both* rather
 * than assumed either way: promoting an unread class to the top of "ready to
 * teach" would be a claim the system cannot support.
 */
const KNOWN_RANKS = 5;
const UNKNOWN_ERROR_RANK = 5;
const UNKNOWN_LOADING_RANK = 6;

function known(
  workRank: number,
  rest: Omit<ClassNextStep, 'workRank' | 'teachRank'>,
): ClassNextStep {
  return { workRank, teachRank: KNOWN_RANKS - 1 - workRank, ...rest };
}

/**
 * The one next step for a class, and where that step places it in both orderings.
 *
 * The verb comes from the specific readiness gap rather than a generic "continue"
 * (P0-03): `readiness.ts` already knows whether the class is missing durations,
 * tempo, choreography, or music, so the button says which. Dimensions are checked
 * in readiness display order, so the named step is always the one the instructor
 * would reach for first.
 */
export function classNextStep(state: ClassDetailState | undefined): ClassNextStep {
  if (!state || state.status === 'loading') {
    return {
      workRank: UNKNOWN_LOADING_RANK,
      teachRank: UNKNOWN_LOADING_RANK,
      eyebrow: 'Reading class',
      action: 'Open class',
      detail: 'Checking shape…',
      teachable: false,
    };
  }
  if (state.status === 'error') {
    return {
      workRank: UNKNOWN_ERROR_RANK,
      teachRank: UNKNOWN_ERROR_RANK,
      eyebrow: 'Details unavailable',
      action: 'Open class',
      detail: 'The class remains in your library.',
      teachable: false,
    };
  }

  const payload = state.payload;
  if (payload.tracks.length === 0) {
    return known(0, {
      eyebrow: 'Start shaping',
      action: 'Add the first track',
      detail: 'Empty draft',
      teachable: false,
    });
  }

  const readiness = classReadiness(payload);
  if (!readiness.runnable) {
    return known(1, {
      eyebrow: 'Complete the clock',
      action: 'Set track durations',
      detail: readiness.dimensions.find((dimension) => dimension.key === 'duration')?.detail ?? '',
      teachable: false,
    });
  }

  const pulse = classPulseFromPayload(payload);
  if (pulse.state === 'partial') {
    return known(2, {
      eyebrow: 'Continue shaping',
      action: 'Score the effort arc',
      detail: `${pulse.coverage.scoredCount} of ${pulse.coverage.trackCount} efforts scored`,
      teachable: false,
    });
  }

  if (!readiness.fullyReady) {
    // The first outstanding dimension in readiness display order names the step.
    // Duration is already handled above (it gates `runnable`), so this is tempo,
    // choreography, or music.
    const gap = readiness.dimensions.find((dimension) => dimension.level !== 'ready');
    const action =
      gap?.key === 'tempo'
        ? 'Add the missing tempo'
        : gap?.key === 'choreography'
          ? 'Add cues and moves'
          : gap?.key === 'music'
            ? 'Link music to tracks'
            : 'Finish refinements';
    return known(3, {
      eyebrow: 'Refine before teaching',
      action,
      detail: `Runnable · ${readiness.attentionCount} to finish`,
      teachable: false,
    });
  }

  return known(4, {
    eyebrow: 'Ready to teach',
    action: 'Open class',
    detail: 'Runnable',
    teachable: true,
  });
}

/**
 * Order classes by the active ordering, breaking ties the way the library always
 * has: most recently updated, then title. `.sort` is stable, so equal-ranked
 * classes keep a deterministic order across re-renders.
 *
 * `stepFor` is supplied by the caller because each surface holds its own payload
 * cache — the ranking rule is shared, the fetching is not.
 */
export function orderClassesBy<T extends { updatedAt: number; title: string }>(
  ordering: ClassOrdering,
  classes: readonly T[],
  stepFor: (cls: T) => ClassNextStep,
): T[] {
  return [...classes].sort((a, b) => {
    const stepA = stepFor(a);
    const stepB = stepFor(b);
    const rank =
      ordering === 'ready_to_teach'
        ? stepA.teachRank - stepB.teachRank
        : stepA.workRank - stepB.workRank;
    return rank || b.updatedAt - a.updatedAt || a.title.localeCompare(b.title);
  });
}

const ORDERING_STORAGE_KEY = 'rf.classOrdering';

/**
 * The chosen ordering persists for the browser session only — deliberately not a
 * user record (no schema change, P0-02). A private-mode `sessionStorage` throw
 * must never take the workspace down, so both accessors swallow it.
 */
export function readStoredOrdering(): ClassOrdering {
  try {
    const stored = window.sessionStorage?.getItem(ORDERING_STORAGE_KEY);
    return isClassOrdering(stored) ? stored : DEFAULT_CLASS_ORDERING;
  } catch {
    return DEFAULT_CLASS_ORDERING;
  }
}

export function storeOrdering(ordering: ClassOrdering): void {
  try {
    window.sessionStorage?.setItem(ORDERING_STORAGE_KEY, ordering);
  } catch {
    /* Session storage is unavailable; the choice simply does not survive a reload. */
  }
}
