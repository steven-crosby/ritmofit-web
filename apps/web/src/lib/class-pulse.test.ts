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
      provisional: false,
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

  it('never fabricates a STORED effort, even where it derives a shape', () => {
    // A lone track can't form an arc, so it stays unshaped and flat.
    const single = deriveClassPulse([input({ effort: 'none' })]);
    expect(single.provisional).toBe(false);
    expect(single.segments[0]?.effort).toBeNull();

    const large = deriveClassPulse(
      Array.from({ length: 100 }, (_, index) =>
        input({ classTrackId: `track-${index}`, order: index, effort: 'none' }),
      ),
    );
    expect(large.segments).toHaveLength(100);
    // The shape is derived (that's P0-07) but the stored effort stays unknown, so
    // the bars keep their hatch and nothing claims the instructor scored them.
    expect(large.provisional).toBe(true);
    expect(large.segments.every((segment) => segment.effort == null)).toBe(true);
    expect(large.segments.every((segment) => segment.shapeEffort != null)).toBe(true);
  });

  it('derives a non-flat arc when every track shares one effort (P0-07)', () => {
    const flat = deriveClassPulse(
      Array.from({ length: 6 }, (_, index) =>
        input({ classTrackId: `track-${index}`, order: index, effort: 'mod' }),
      ),
    );
    expect(flat.provisional).toBe(true);
    // The stored zone is untouched; only the drawn shape moves.
    expect(flat.segments.every((segment) => segment.effort === 'mod')).toBe(true);
    expect(new Set(flat.segments.map((segment) => segment.shapeEffort)).size).toBeGreaterThan(1);
    // ...and it reads as an arc: it rises off the floor and comes back down.
    const shape = flat.segments.map((segment) => segment.shapeEffort);
    expect(shape[0]).toBe('easy');
    expect(shape).toContain('hard');
    expect(shape.at(-1)).toBe('mod');
  });

  it('lets a single authored zone win over the derivation', () => {
    const authored = deriveClassPulse([
      input({ classTrackId: 'a', order: 0, effort: 'mod' }),
      input({ classTrackId: 'b', order: 1, effort: 'mod' }),
      input({ classTrackId: 'c', order: 2, effort: 'all_out' }),
    ]);
    expect(authored.provisional).toBe(false);
    expect(authored.segments.map((segment) => segment.shapeEffort)).toEqual([
      'mod',
      'mod',
      'all_out',
    ]);
  });

  it('captions a derived shape with the assumption it made', () => {
    const flat = deriveClassPulse([
      input({ classTrackId: 'a', order: 0, effort: 'hard' }),
      input({ classTrackId: 'b', order: 1, effort: 'hard' }),
    ]);
    expect(classPulseCoverageLabel(flat)).toMatch(/auto-shaped from track order and length/i);
  });
});
