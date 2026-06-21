import { describe, it, expect } from 'vitest';
import type { Intensity, RunPayload } from '@ritmofit/shared';
import { computeRibbonSegments } from './IntensityRibbon.js';

type Entry = RunPayload['tracks'][number];

/** Minimal run-payload track entry — only the fields the ribbon geometry reads matter. */
function entry(
  intensity: Intensity,
  durationMs: number | null,
  position = 0,
  startOffsetMs = 0,
): Entry {
  return {
    classTrackId: `00000000-0000-0000-0000-00000000000${position}`,
    position,
    displayBpm: null,
    intensity,
    startOffsetMs,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: `10000000-0000-0000-0000-00000000000${position}`,
      title: `Track ${position}`,
      artist: 'Tester',
      durationMs,
      albumArtUrl: null,
    },
    providerRefs: [],
    cues: [],
    moves: [],
  };
}

describe('computeRibbonSegments', () => {
  it('returns nothing to draw when the assembled total is zero or negative', () => {
    expect(computeRibbonSegments([entry('mod', 1000)], 0)).toEqual([]);
    expect(computeRibbonSegments([entry('mod', 1000)], -5)).toEqual([]);
    expect(computeRibbonSegments([], 0)).toEqual([]);
  });

  it('lays a single track across the full width', () => {
    const [seg, ...rest] = computeRibbonSegments([entry('all_out', 1000)], 1000);
    expect(rest).toHaveLength(0);
    expect(seg).toMatchObject({ x: 0, width: 1000, intensity: 'all_out' });
  });

  it('sizes each block by its share of the total and places them by offset', () => {
    const segs = computeRibbonSegments([entry('easy', 1000, 0, 0), entry('hard', 3000, 1, 1000)], 4000);
    expect(segs.map((s) => s.width)).toEqual([250, 750]);
    expect(segs.map((s) => s.x)).toEqual([0, 250]);
    // widths tile the full normalized space with no gap
    const last = segs.at(-1)!;
    expect(last.x + last.width).toBe(1000);
  });

  it('leaves uncolored space for a free-placement gap', () => {
    // easy [0,1000), gap, hard [2000,3000) of a 4000 total → x at 0 and 500 (of 1000).
    const segs = computeRibbonSegments([entry('easy', 1000, 0, 0), entry('hard', 1000, 1, 2000)], 4000);
    expect(segs.map((s) => s.x)).toEqual([0, 500]);
  });

  it('maps intensity to crest height (all_out is tallest, none is shortest)', () => {
    const tops = (['none', 'easy', 'mod', 'hard', 'all_out'] as const).map(
      (i) => computeRibbonSegments([entry(i, 1000)], 1000)[0]!.top,
    );
    // top is measured from the top edge (0), so smaller = taller (closeTo: float noise)
    [88, 66, 45, 22, 0].forEach((expected, i) => expect(tops[i]).toBeCloseTo(expected, 6));
    // strictly descending: each zone is taller than the one below it
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeLessThan(tops[i - 1]);
  });

  it('skips tracks with no duration (they contribute 0 width and do not advance x)', () => {
    const segs = computeRibbonSegments(
      [entry('mod', null, 0), entry('hard', 1000, 1), entry('easy', 0, 2)],
      1000,
    );
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ x: 0, width: 1000, intensity: 'hard' });
  });
});
