import { describe, expect, it } from 'vitest';
import {
  hasPlacedMoveIntensity,
  isUnshapedClass,
  isUnshapedSequence,
  refineTrackSpans,
} from './energy-arc.js';

describe('isUnshapedClass', () => {
  it('stays unshaped when every track shares one zone and no move is scored', () => {
    expect(
      isUnshapedClass([
        { intensity: 'mod', moves: [] },
        { intensity: 'mod', moves: [{ anchorMs: 1000, intensity: null }] },
      ]),
    ).toBe(true);
    expect(isUnshapedSequence(['mod', 'mod'])).toBe(true);
  });

  it('becomes authored when a placed move carries intensity', () => {
    expect(
      isUnshapedClass([
        { intensity: 'mod', moves: [] },
        { intensity: 'mod', moves: [{ anchorMs: 1000, intensity: 'hard' }] },
      ]),
    ).toBe(false);
  });
});

describe('hasPlacedMoveIntensity', () => {
  it('ignores missing lists and null intensities', () => {
    expect(hasPlacedMoveIntensity(undefined)).toBe(false);
    expect(hasPlacedMoveIntensity([])).toBe(false);
    expect(hasPlacedMoveIntensity([{ anchorMs: 0, intensity: null }])).toBe(false);
  });
});

describe('refineTrackSpans', () => {
  it('returns a single baseline span when there are no scored moves', () => {
    expect(refineTrackSpans('ct-1', 4000, 'mod', [])).toEqual([
      { classTrackId: 'ct-1', startMs: 0, durationMs: 4000, intensity: 'mod', source: 'baseline' },
    ]);
  });

  it('keeps baseline until the first scored move, then holds that zone to the end', () => {
    expect(refineTrackSpans('ct-1', 4000, 'mod', [{ anchorMs: 1000, intensity: 'hard' }])).toEqual([
      { classTrackId: 'ct-1', startMs: 0, durationMs: 1000, intensity: 'mod', source: 'baseline' },
      { classTrackId: 'ct-1', startMs: 1000, durationMs: 3000, intensity: 'hard', source: 'move' },
    ]);
  });

  it('lets a track rise and fall across two scored moves', () => {
    const spans = refineTrackSpans('ct-1', 6000, 'easy', [
      { anchorMs: 2000, intensity: 'all_out' },
      { anchorMs: 4000, intensity: 'mod' },
    ]);
    expect(spans.map((span) => span.intensity)).toEqual(['easy', 'all_out', 'mod']);
    expect(spans.map((span) => span.durationMs)).toEqual([2000, 2000, 2000]);
  });

  it('starts on the move when the first scored placement is at 0', () => {
    expect(refineTrackSpans('ct-1', 3000, 'mod', [{ anchorMs: 0, intensity: 'hard' }])).toEqual([
      { classTrackId: 'ct-1', startMs: 0, durationMs: 3000, intensity: 'hard', source: 'move' },
    ]);
  });

  it('ignores null intensity, out-of-range anchors, and last-writes a same-anchor pair', () => {
    expect(
      refineTrackSpans('ct-1', 4000, 'easy', [
        { anchorMs: 1000, intensity: null },
        { anchorMs: 5000, intensity: 'hard' },
        { anchorMs: -1, intensity: 'hard' },
        { anchorMs: 2000, intensity: 'mod' },
        { anchorMs: 2000, intensity: 'all_out' },
      ]),
    ).toEqual([
      { classTrackId: 'ct-1', startMs: 0, durationMs: 2000, intensity: 'easy', source: 'baseline' },
      {
        classTrackId: 'ct-1',
        startMs: 2000,
        durationMs: 2000,
        intensity: 'all_out',
        source: 'move',
      },
    ]);
  });

  it('returns nothing for a non-drawable duration', () => {
    expect(refineTrackSpans('ct-1', 0, 'mod', [{ anchorMs: 0, intensity: 'hard' }])).toEqual([]);
  });
});
