/**
 * Library-card date copy (Session 3). Turns a `lastOpenedAt` timestamp into a short,
 * human "Opened …" label. Day-granular and calendar-aware (compares start-of-day, not
 * a raw ms delta) so "yesterday" reads right across a midnight boundary. `now` is
 * injected so the mapping is pure and unit-testable.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * "Opened today" / "Opened yesterday" / "Opened N days ago" (under a week) / "Opened
 * Mon D" otherwise. Returns null for a class never opened, so the caller can omit the
 * line entirely. Future/clock-skewed timestamps clamp to "today".
 */
export function formatLastOpened(openedAtMs: number | null, nowMs: number): string | null {
  if (openedAtMs == null) return null;
  const opened = new Date(openedAtMs);
  const now = new Date(nowMs);
  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(opened)) / 86_400_000);
  if (dayDiff <= 0) return 'Opened today';
  if (dayDiff === 1) return 'Opened yesterday';
  if (dayDiff < 7) return `Opened ${dayDiff} days ago`;
  return `Opened ${MONTHS[opened.getMonth()]} ${opened.getDate()}`;
}
