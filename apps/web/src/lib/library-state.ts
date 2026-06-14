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
