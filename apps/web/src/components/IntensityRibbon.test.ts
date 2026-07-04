import { describe, it, expect } from 'vitest';
import type { Intensity, RunPayload } from '@ritmofit/shared';
import {
  computeRibbonSegments,
  computeRibbonShape,
  deriveProvisionalIntensity,
} from './IntensityRibbon.js';

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
    displayRpm: null,
    holdCount: null,
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
    const segs = computeRibbonSegments(
      [entry('easy', 1000, 0, 0), entry('hard', 3000, 1, 1000)],
      4000,
    );
    expect(segs.map((s) => s.width)).toEqual([250, 750]);
    expect(segs.map((s) => s.x)).toEqual([0, 250]);
    // widths tile the full normalized space with no gap
    const last = segs.at(-1)!;
    expect(last.x + last.width).toBe(1000);
  });

  it('leaves uncolored space for a free-placement gap', () => {
    // easy [0,1000), gap, hard [2000,3000) of a 4000 total → x at 0 and 500 (of 1000).
    const segs = computeRibbonSegments(
      [entry('easy', 1000, 0, 0), entry('hard', 1000, 1, 2000)],
      4000,
    );
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

  it('tags each segment with its class-track id (so the ribbon can share the timeline selection)', () => {
    const segs = computeRibbonSegments([entry('mod', 1000, 0), entry('hard', 1000, 1)], 2000);
    expect(segs.map((s) => s.classTrackId)).toEqual([
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
    ]);
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

describe('deriveProvisionalIntensity', () => {
  it('maps a track midpoint to a warm-up → build → peak → release arc', () => {
    // Band boundaries: [0,0.22)=easy, [0.22,0.48)=mod, [0.48,0.8)=hard, [0.8,1)=mod.
    expect(deriveProvisionalIntensity(0)).toBe('easy');
    expect(deriveProvisionalIntensity(0.21)).toBe('easy');
    expect(deriveProvisionalIntensity(0.22)).toBe('mod');
    expect(deriveProvisionalIntensity(0.47)).toBe('mod');
    expect(deriveProvisionalIntensity(0.48)).toBe('hard');
    expect(deriveProvisionalIntensity(0.79)).toBe('hard');
    expect(deriveProvisionalIntensity(0.8)).toBe('mod');
    expect(deriveProvisionalIntensity(0.99)).toBe('mod');
  });

  it('never claims an all-out peak or the flat none floor (no plasma, no dead slab)', () => {
    for (let p = 0; p < 1; p += 0.01) {
      const zone = deriveProvisionalIntensity(p);
      expect(zone).not.toBe('all_out');
      expect(zone).not.toBe('none');
    }
  });
});

describe('computeRibbonShape (alive at rest)', () => {
  it('returns nothing to draw and is not provisional when the total is zero', () => {
    expect(computeRibbonShape([entry('mod', 1000)], 0)).toEqual({
      segments: [],
      provisional: false,
    });
  });

  it('keeps a single track authored — one track cannot form a derived arc', () => {
    const shape = computeRibbonShape([entry('none', 1000)], 1000);
    expect(shape.provisional).toBe(false);
    expect(shape.segments.map((s) => s.intensity)).toEqual(['none']);
  });

  it('keeps authored zones once the instructor has differentiated intensity', () => {
    const shape = computeRibbonShape(
      [entry('easy', 1000, 0, 0), entry('hard', 1000, 1, 1000)],
      2000,
    );
    expect(shape.provisional).toBe(false);
    expect(shape.segments.map((s) => s.intensity)).toEqual(['easy', 'hard']);
  });

  it('derives a provisional arc when every track shares one intensity (unshaped class)', () => {
    // Five equal back-to-back tracks all stored as `none` → midpoints 0.1..0.9 →
    // a real arc instead of a flat 12% slab. The stored zone is irrelevant to the draft.
    const tracks = [0, 1, 2, 3, 4].map((i) => entry('none', 1000, i, i * 1000));
    const shape = computeRibbonShape(tracks, 5000);
    expect(shape.provisional).toBe(true);
    expect(shape.segments.map((s) => s.intensity)).toEqual(['easy', 'mod', 'hard', 'hard', 'mod']);
    // never flat, never plasma-eligible
    expect(shape.segments.every((s) => s.intensity !== 'none' && s.intensity !== 'all_out')).toBe(
      true,
    );
  });

  it('treats a same-intensity class as unshaped regardless of which zone it is', () => {
    const tracks = [entry('hard', 1000, 0, 0), entry('hard', 1000, 1, 1000)];
    const shape = computeRibbonShape(tracks, 2000);
    expect(shape.provisional).toBe(true);
    // midpoints 0.25, 0.75 → build, peak
    expect(shape.segments.map((s) => s.intensity)).toEqual(['mod', 'hard']);
  });

  it('ignores zero-duration tracks when deciding whether a class is unshaped', () => {
    // Two drawable tracks share `mod`; the null-duration `easy` track is not drawable
    // and must not flip the class to "differentiated".
    const tracks = [entry('mod', 1000, 0, 0), entry('easy', null, 1), entry('mod', 1000, 2, 1000)];
    const shape = computeRibbonShape(tracks, 2000);
    expect(shape.provisional).toBe(true);
    expect(shape.segments).toHaveLength(2);
  });
});
