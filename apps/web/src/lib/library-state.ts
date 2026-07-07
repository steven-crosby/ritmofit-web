import type { ClassListItem } from '@ritmofit/shared';
import { formatTemplateLabel } from './class-summary.js';

/**
 * Library-rail presentation state. The class list starts empty before its first
 * request resolves, so rendering must distinguish "still loading" from a genuine
 * empty library (and from a failed load) — otherwise "No classes yet" flashes
 * before data arrives, and a failed load looks identical to having no classes.
 */
export type ListStatus = 'loading' | 'ready' | 'error';
export type LibraryView = 'loading' | 'empty' | 'error' | 'list';

/**
 * What the library rail should render given the fetch status and the number of
 * classes loaded.
 *
 * - Any loaded classes always show as a list, even mid-refresh or after a later
 *   failure, so a background reload never blanks the rail.
 * - With nothing loaded, the status decides: loading vs a true empty library vs
 *   a load error (the top-level banner carries the error detail).
 */
export function libraryView(status: ListStatus, count: number): LibraryView {
  if (count > 0) return 'list';
  if (status === 'ready') return 'empty';
  if (status === 'error') return 'error';
  return 'loading';
}

/**
 * How the rail orders the loaded classes. `recently_updated` mirrors the server's
 * default keyset order (updated_at desc), so re-applying it client-side is a no-op
 * that keeps the control honest; the others re-sort what's already loaded.
 */
export type ClassSortKey =
  | 'recently_updated'
  | 'recently_opened'
  | 'title'
  | 'longest'
  | 'most_tracks';

export const DEFAULT_CLASS_SORT: ClassSortKey = 'recently_updated';

/** Sort choices in menu order, paired with their human labels. */
export const CLASS_SORT_OPTIONS: ReadonlyArray<{ value: ClassSortKey; label: string }> = [
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'recently_opened', label: 'Recently opened' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'longest', label: 'Longest' },
  { value: 'most_tracks', label: 'Most tracks' },
];

/**
 * Fold case and strip diacritics so "Pilátes" matches a search for "pilates".
 * NFD splits accented letters into base + combining mark, then the mark class is
 * removed; the result is lower-cased and trimmed for substring comparison.
 */
function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * The text a class is searchable by: its title plus both the human template label
 * ("Pilates") and the stored enum value ("sculpt"), so either term finds it.
 */
function searchableText(cls: ClassListItem): string {
  return normalizeSearch(
    [cls.title, formatTemplateLabel(cls.template) ?? '', cls.template ?? ''].join(' '),
  );
}

/** Comparators keyed by sort choice. A `.sort` on these is stable in modern JS, so
 * ties preserve the incoming (server keyset) order rather than reshuffling. */
const SORTERS: Record<ClassSortKey, (a: ClassListItem, b: ClassListItem) => number> = {
  // Server already returns updated_at desc; keep that as the stable identity order.
  recently_updated: (a, b) => b.updatedAt - a.updatedAt,
  // Never-opened classes (null) sink below any that have been opened.
  recently_opened: (a, b) => (b.lastOpenedAt ?? -Infinity) - (a.lastOpenedAt ?? -Infinity),
  title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  longest: (a, b) => b.totalDurationMs - a.totalDurationMs,
  most_tracks: (a, b) => b.trackCount - a.trackCount,
};

/**
 * Client-side organize step for the library rail: filter the already-loaded classes
 * by a free-text query (title + template), then order them by the chosen sort. Pure
 * and non-mutating — it returns a new array and never touches the input.
 *
 * Scope note: this operates on the *loaded* page set only (the list paginates via a
 * server cursor), so the rail frames its count as "N loaded" rather than implying the
 * whole library. A blank query passes everything through; every whitespace-separated
 * token must match (AND), so "cycle 45" narrows more than either term alone.
 */
export function organizeClasses(
  classes: readonly ClassListItem[],
  options: { query: string; sort: ClassSortKey },
): ClassListItem[] {
  const tokens = normalizeSearch(options.query).split(/\s+/).filter(Boolean);
  const matched =
    tokens.length === 0
      ? [...classes]
      : classes.filter((cls) => {
          const text = searchableText(cls);
          return tokens.every((token) => text.includes(token));
        });
  return matched.sort(SORTERS[options.sort]);
}
