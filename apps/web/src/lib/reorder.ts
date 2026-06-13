/**
 * Pure list-reorder helper for the builder's drag-and-keyboard track reordering.
 * Returns a new array with the item at `from` moved to index `to`; both indices
 * are clamped into range, so a no-op (out-of-range or same index) returns an
 * equal-ordered copy. Kept pure + unit-tested so the Dashboard wiring stays thin.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(to, next.length - 1));
  // `from` is in range, so splice removes exactly one element.
  const [moved] = next.splice(from, 1) as [T];
  next.splice(target, 0, moved);
  return next;
}
