import { describe, it, expect } from 'vitest';
import { formatLastOpened } from './relative-time.js';

// A fixed "now": 2026-06-28 12:00 local time.
const NOW = new Date(2026, 5, 28, 12, 0, 0).getTime();
const atLocal = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).getTime();

describe('formatLastOpened', () => {
  it('returns null for a class never opened', () => {
    expect(formatLastOpened(null, NOW)).toBeNull();
  });

  it('says "today" for earlier the same calendar day', () => {
    expect(formatLastOpened(atLocal(2026, 5, 28, 8), NOW)).toBe('Opened today');
  });

  it('clamps a future/clock-skewed timestamp to "today"', () => {
    expect(formatLastOpened(atLocal(2026, 5, 28, 23), NOW)).toBe('Opened today');
  });

  it('says "yesterday" across a midnight boundary, not by 24h delta', () => {
    // 11pm the prior day is < 24h before noon today but is the previous calendar day.
    expect(formatLastOpened(atLocal(2026, 5, 27, 23), NOW)).toBe('Opened yesterday');
  });

  it('uses "N days ago" within the past week', () => {
    expect(formatLastOpened(atLocal(2026, 5, 25), NOW)).toBe('Opened 3 days ago');
  });

  it('falls back to a short month-day date a week or more out', () => {
    expect(formatLastOpened(atLocal(2026, 5, 1), NOW)).toBe('Opened Jun 1');
  });
});
