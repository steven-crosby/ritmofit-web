/**
 * Classes library shell (pull request A). Recents and Jump back in share one
 * clock: last opened or taught, including starting Live. Last edited is not
 * that clock. The library reads `lastOpenedAt`, which open and Live start write.
 */
import type { ClassTemplate } from '@ritmofit/shared';
import type { ClassNextStep } from './class-ordering.js';

export const JUMP_BACK_LIMIT = 4;

export type OpenedClass = {
  title: string;
  lastOpenedAt: number | null;
};

/** Verification classes are real library rows. Jump back in skips this prefix. */
export function isQaClassTitle(title: string): boolean {
  return title.startsWith('[QA]');
}

/**
 * Most recently opened or taught first. A class that has never been opened
 * sinks. Ties break by title. `updatedAt` is not an input.
 */
export function compareLastOpenedOrTaught(a: OpenedClass, b: OpenedClass): number {
  if (a.lastOpenedAt == null && b.lastOpenedAt == null) return a.title.localeCompare(b.title);
  if (a.lastOpenedAt == null) return 1;
  if (b.lastOpenedAt == null) return -1;
  return b.lastOpenedAt - a.lastOpenedAt || a.title.localeCompare(b.title);
}

export function recentClasses<T extends OpenedClass>(classes: readonly T[]): T[] {
  return [...classes].sort(compareLastOpenedOrTaught);
}

/** Up to four classes for Jump back in. Names that start with `[QA]` are omitted. */
export function jumpBackInClasses<T extends OpenedClass>(
  classes: readonly T[],
  limit = JUMP_BACK_LIMIT,
): T[] {
  return recentClasses(classes.filter((cls) => !isQaClassTitle(cls.title))).slice(0, limit);
}

/**
 * Short readiness phrase. The orange dot may repeat this; the words are the signal.
 */
export function readinessLabel(
  step: Pick<ClassNextStep, 'eyebrow' | 'action' | 'teachable'>,
): string {
  if (step.eyebrow === 'Reading class') return 'Checking';
  if (step.eyebrow === 'Details unavailable') return 'Unavailable';
  if (step.teachable) return 'Ready';
  switch (step.action) {
    case 'Set track durations':
      return 'Needs duration';
    case 'Add cues and moves':
      return 'Needs cues';
    case 'Score the effort arc':
      return 'Needs effort';
    case 'Add the first track':
    case 'Link music to tracks':
    case 'Add music to the plan':
    case 'Put songs in the plan':
      return 'Needs music';
    case 'Fix overflowing blocks':
      return 'Over time';
    default:
      return 'Needs work';
  }
}

export function readinessMark(step: Pick<ClassNextStep, 'eyebrow' | 'action' | 'teachable'>): {
  label: string;
  dot: boolean;
} {
  const label = readinessLabel(step);
  return { label, dot: label !== 'Ready' && label !== 'Checking' };
}

/** Stored cover wins. Otherwise a type gradient — never provider artwork. */
export function coverGradientClass(template: ClassTemplate | null | undefined): string {
  switch (template) {
    case 'cycle':
      return 'bg-gradient-to-br from-brand to-bg-sunken';
    case 'sculpt':
      return 'bg-gradient-to-br from-interactive to-bg-sunken';
    case 'hiit':
      return 'bg-gradient-to-br from-intensity-hard to-bg-sunken';
    default:
      return 'bg-gradient-to-br from-border-strong to-bg-sunken';
  }
}

/** Home template cards. Same disciplines, order and labels as the Create dialog (D21). */
export const LIBRARY_TEMPLATES = [
  { template: 'cycle', label: 'Cycle', detail: 'Blocks for a ride.' },
  { template: 'sculpt', label: 'Pilates', detail: 'Blocks for the mat.' },
  { template: 'hiit', label: 'HIIT', detail: 'Blocks for intervals.' },
] as const;

export type LibraryTemplate = (typeof LIBRARY_TEMPLATES)[number]['template'];
