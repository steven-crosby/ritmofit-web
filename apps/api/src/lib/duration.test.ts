import { describe, expect, it } from 'vitest';
import { effectiveDurationMs } from './duration.js';

describe('effectiveDurationMs', () => {
  it('uses the class-specific override when present', () => {
    expect(effectiveDurationMs(180000, 210000)).toBe(210000);
    expect(effectiveDurationMs(null, 210000)).toBe(210000);
  });

  it('falls back to the library duration', () => {
    expect(effectiveDurationMs(180000, null)).toBe(180000);
    expect(effectiveDurationMs(null, null)).toBeNull();
  });
});
