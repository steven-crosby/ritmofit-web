import { describe, expect, it } from 'vitest';
import type { ClassPulseInput } from './class-pulse.js';
import { classPulseCoverageLabel, deriveClassPulse } from './class-pulse.js';

const input = (overrides: Partial<ClassPulseInput> = {}): ClassPulseInput => ({
  classTrackId: 'track-1',
  order: 0,
  durationMs: 60_000,
  effort: 'mod',
  ...overrides,
});

describe('deriveClassPulse', () => {
  it('returns an honest empty model', () => {
    expect(deriveClassPulse([])).toEqual({
      state: 'empty',
      segments: [],
      coverage: {
        trackCount: 0,
        drawableCount: 0,
        scoredCount: 0,
        missingDurationCount: 0,
        unscoredCount: 0,
        invalidCount: 0,
      },
    });
  });

  it('sorts by order and weights width by duration', () => {
    const model = deriveClassPulse([
      input({ classTrackId: 'third', order: 2, durationMs: 30_000, effort: 'hard' }),
      input({ classTrackId: 'first', order: 0, durationMs: 60_000, effort: 'easy' }),
      input({ classTrackId: 'second', order: 1, durationMs: 30_000, effort: 'mod' }),
    ]);

    expect(model.state).toBe('complete');
    expect(model.segments.map((segment) => segment.classTrackId)).toEqual([
      'first',
      'second',
      'third',
    ]);
    expect(model.segments.map((segment) => segment.widthRatio)).toEqual([0.5, 0.25, 0.25]);
    expect(model.segments.map((segment) => segment.startRatio)).toEqual([0, 0.5, 0.75]);
  });

  it('keeps duplicate orders deterministic by retaining input order', () => {
    const model = deriveClassPulse([
      input({ classTrackId: 'a', order: 1 }),
      input({ classTrackId: 'b', order: 1 }),
    ]);
    expect(model.segments.map((segment) => segment.classTrackId)).toEqual(['a', 'b']);
  });

  it('omits invalid durations without shifting effort coverage', () => {
    const model = deriveClassPulse([
      input({ classTrackId: 'missing', durationMs: null, effort: 'hard' }),
      input({ classTrackId: 'zero', durationMs: 0, effort: 'easy' }),
      input({ classTrackId: 'valid', durationMs: 90_000, effort: 'mod' }),
    ]);
    expect(model.state).toBe('partial');
    expect(model.segments).toHaveLength(1);
    expect(model.coverage).toMatchObject({ missingDurationCount: 2, scoredCount: 3 });
  });

  it('represents unscored and hostile effort values as unknown instead of inventing effort', () => {
    const hostile = {
      ...input({ classTrackId: 'hostile' }),
      effort: 'provider_peak',
    } as unknown as ClassPulseInput;
    const model = deriveClassPulse([
      input({ classTrackId: 'none', effort: 'none' }),
      input({ classTrackId: 'null', effort: null }),
      hostile,
    ]);
    expect(model.segments.map((segment) => segment.effort)).toEqual([null, null, null]);
    expect(model.coverage).toMatchObject({ unscoredCount: 2, invalidCount: 1, scoredCount: 0 });
    expect(classPulseCoverageLabel(model)).toContain('2 unscored efforts');
  });

  it('does not fabricate an arc for one track or a large unscored class', () => {
    expect(deriveClassPulse([input({ effort: 'none' })]).segments[0]?.effort).toBeNull();
    const large = deriveClassPulse(
      Array.from({ length: 100 }, (_, index) =>
        input({ classTrackId: `track-${index}`, order: index, effort: 'none' }),
      ),
    );
    expect(large.segments).toHaveLength(100);
    expect(large.segments.every((segment) => segment.effort == null)).toBe(true);
  });
});
