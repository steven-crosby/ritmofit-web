/**
 * Grouping for the move picker (design audit 2026-07-24, P1-04).
 *
 * The move library is already grouped in the data — every global move carries a
 * `template` enum — but the picker rendered one flat alphabetical list, so a
 * Cycle class offered Burpees, Press-Ups, Crunches, and Mountain Climbers among
 * its climbs and sprints. This is presentation only: **no schema change, no seed
 * change.**
 *
 * PDR-03, owner-resolved 2026-07-24: group and demote, never hide. The open
 * class's discipline leads; every other discipline stays reachable.
 */
import type { ClassTemplate, Move } from '@ritmofit/shared';
import { formatTemplateLabel } from './class-summary.js';

export type MoveGroup = {
  /** null collects moves whose template the API did not set. */
  template: ClassTemplate | null;
  label: string;
  moves: Move[];
};

/** Stable display order for the disciplines a class is not currently teaching. */
const TEMPLATE_ORDER: ClassTemplate[] = ['cycle', 'hiit', 'sculpt', 'tread'];

function groupLabel(template: ClassTemplate | null): string {
  if (template === null) return 'Other moves';
  return formatTemplateLabel(template) ?? template;
}

/**
 * Group the library by discipline, `first` leading. Groups keep the library's
 * incoming order within themselves (the API returns moves alphabetically), and
 * an empty discipline produces no group at all rather than an empty heading.
 */
export function groupMovesByTemplate(
  library: readonly Move[],
  first: ClassTemplate | null = null,
): MoveGroup[] {
  const byTemplate = new Map<ClassTemplate | null, Move[]>();
  for (const move of library) {
    const key = move.template ?? null;
    const bucket = byTemplate.get(key);
    if (bucket) bucket.push(move);
    else byTemplate.set(key, [move]);
  }

  const order: (ClassTemplate | null)[] = [
    ...(first != null ? [first] : []),
    ...TEMPLATE_ORDER.filter((template) => template !== first),
    null,
  ];

  return order.flatMap((template) => {
    const moves = byTemplate.get(template);
    if (!moves || moves.length === 0) return [];
    return [{ template, label: groupLabel(template), moves }];
  });
}

/**
 * A move's option text. The seed contains genuinely confusable pairs — "Run" and
 * "Running", "Sprint" / "Sprint Hold" / "Sprint on a Hill" — and the description
 * is what tells them apart. It rides in the option text rather than a tooltip so
 * it is there for touch and keyboard, not only for a mouse that hovers.
 */
export function moveOptionLabel(move: Pick<Move, 'name' | 'description'>): string {
  const description = move.description?.trim();
  return description ? `${move.name} — ${description}` : move.name;
}
