import { describe, expect, it } from 'vitest';
import { clipStartBeyondTrack, effectiveDurationMs, resolveClipWindow } from './duration.js';

describe('effectiveDurationMs', () => {
  it('uses the class-specific override when present', () => {
    expect(effectiveDurationMs(180000, 210000)).toBe(210000);
    expect(effectiveDurationMs(null, 210000)).toBe(210000);
  });

  it('falls back to the library duration', () => {
    expect(effectiveDurationMs(180000, null)).toBe(180000);
    expect(effectiveDurationMs(null, null)).toBeNull();
  });

  describe('with a clip window', () => {
    it('trims the tail (clip end)', () => {
      expect(effectiveDurationMs(180000, null, 0, 120000)).toBe(120000);
    });

    it('trims the intro (clip start)', () => {
      expect(effectiveDurationMs(180000, null, 30000, null)).toBe(150000);
    });

    it('trims both ends (play 0:30–2:15 of a 3:00 track)', () => {
      expect(effectiveDurationMs(180000, null, 30000, 135000)).toBe(105000);
    });

    it('clamps a clip end past the base length to the base', () => {
      expect(effectiveDurationMs(180000, null, 0, 999999)).toBe(180000);
    });

    it('clips relative to the duration override, not the library length', () => {
      expect(effectiveDurationMs(180000, 200000, 0, 190000)).toBe(190000);
    });

    it('keeps a clip end even when the base length is unknown', () => {
      expect(effectiveDurationMs(null, null, 0, 90000)).toBe(90000);
    });

    it('is null when the length is unknown and only a start is set', () => {
      expect(effectiveDurationMs(null, null, 30000, null)).toBeNull();
    });

    it('never returns negative (start past end clamps to 0)', () => {
      expect(effectiveDurationMs(180000, null, 200000, null)).toBe(0);
    });
  });
});

describe('resolveClipWindow', () => {
  it('defaults to the whole track', () => {
    expect(resolveClipWindow(180000, null)).toEqual({ startMs: 0, endMs: 180000 });
  });

  it('caps the end at the base length', () => {
    expect(resolveClipWindow(180000, null, 30000, 999999)).toEqual({
      startMs: 30000,
      endMs: 180000,
    });
  });

  it('reports a null end when the length is unknown and no clip end is set', () => {
    expect(resolveClipWindow(null, null, 30000, null)).toEqual({ startMs: 30000, endMs: null });
  });
});

describe('clipStartBeyondTrack', () => {
  it('permits a clip start inside the track', () => {
    expect(clipStartBeyondTrack(180000, null, 30000)).toBeNull();
    expect(clipStartBeyondTrack(180000, null, 0)).toBeNull();
  });

  it('rejects a clip start at or past the library length', () => {
    expect(clipStartBeyondTrack(180000, null, 180000)).toMatch(/before the track length/);
    expect(clipStartBeyondTrack(180000, null, 200000)).toMatch(/before the track length/);
  });

  it('measures against the duration override when present', () => {
    // start fits the 200000 override even though it exceeds the 180000 library length
    expect(clipStartBeyondTrack(180000, 200000, 190000)).toBeNull();
    expect(clipStartBeyondTrack(180000, 200000, 200000)).toMatch(/before the track length/);
  });

  it('permits any start when the base length is unknown', () => {
    expect(clipStartBeyondTrack(null, null, 30000)).toBeNull();
  });
});
