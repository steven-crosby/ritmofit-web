import { describe, it, expect } from 'vitest';
import type { SegmentType } from '@ritmofit/shared';
import {
  adjacentBoundary,
  boundaryMsFromPointer,
  clampSectionStart,
  computeSegmentBands,
  deriveProvisionalSections,
  snapToTrackStart,
  trackBoundaries,
} from './SegmentBand.js';

const sec = (type: SegmentType, startOffsetMs: number) => ({ type, startOffsetMs });

describe('computeSegmentBands', () => {
  it('returns nothing when total is zero/negative or there are no sections', () => {
    expect(computeSegmentBands([sec('warm_up', 0)], 0)).toEqual([]);
    expect(computeSegmentBands([sec('warm_up', 0)], -1)).toEqual([]);
    expect(computeSegmentBands([], 1000)).toEqual([]);
  });

  it('tiles each band from its start to the next start, last to the class end', () => {
    const bands = computeSegmentBands(
      [sec('warm_up', 0), sec('climb', 250), sec('sprint', 750)],
      1000,
    );
    expect(bands.map((b) => b.type)).toEqual(['warm_up', 'climb', 'sprint']);
    expect(bands.map((b) => b.leftPct)).toEqual([0, 25, 75]);
    expect(bands.map((b) => b.widthPct)).toEqual([25, 50, 25]);
    const last = bands.at(-1)!;
    expect(last.leftPct + last.widthPct).toBe(100);
  });

  it('sorts unordered sections by start', () => {
    const bands = computeSegmentBands([sec('sprint', 600), sec('warm_up', 0)], 1200);
    expect(bands.map((b) => b.type)).toEqual(['warm_up', 'sprint']);
    expect(bands.map((b) => b.leftPct)).toEqual([0, 50]);
  });

  it('leaves a leading gap untiled when the first section starts after 0', () => {
    const bands = computeSegmentBands([sec('climb', 400)], 1000);
    expect(bands).toHaveLength(1);
    expect(bands[0]).toMatchObject({ type: 'climb', leftPct: 40, widthPct: 60 });
  });

  it('drops zero-width bands (duplicate starts) and clamps beyond the total', () => {
    const dup = computeSegmentBands([sec('warm_up', 500), sec('climb', 500)], 1000);
    // The first (warm_up→climb) has zero width and is dropped; climb runs 500→1000.
    expect(dup).toEqual([{ type: 'climb', leftPct: 50, widthPct: 50 }]);

    const beyond = computeSegmentBands([sec('warm_up', 0), sec('sprint', 5000)], 1000);
    // sprint starts at/after the total → clamped to 1000, zero width, dropped.
    expect(beyond).toEqual([{ type: 'warm_up', leftPct: 0, widthPct: 100 }]);
  });
});

describe('deriveProvisionalSections (alive at rest)', () => {
  it('derives a warm-up → climb → sprint → recovery → cool-down arc from the class length', () => {
    const secs = deriveProvisionalSections(100000);
    expect(secs.map((s) => s.type)).toEqual([
      'warm_up',
      'climb',
      'sprint',
      'recovery',
      'cool_down',
    ]);
    // Fixed fractions of the total (peak in the sprint third), strictly increasing.
    expect(secs.map((s) => s.startOffsetMs)).toEqual([0, 20000, 45000, 70000, 85000]);
  });

  it('feeds computeSegmentBands to five non-empty bands spanning the class', () => {
    const bands = computeSegmentBands(deriveProvisionalSections(100000), 100000);
    expect(bands.map((b) => b.type)).toEqual([
      'warm_up',
      'climb',
      'sprint',
      'recovery',
      'cool_down',
    ]);
    const last = bands.at(-1)!;
    expect(last.leftPct + last.widthPct).toBe(100);
  });

  it('returns nothing when there is no duration to band', () => {
    expect(deriveProvisionalSections(0)).toEqual([]);
    expect(deriveProvisionalSections(-5)).toEqual([]);
  });
});

describe('boundaryMsFromPointer', () => {
  const rect = { left: 100, width: 200 };

  it('maps the pointer x within the box to a whole-ms time', () => {
    expect(boundaryMsFromPointer(100, rect, 240000)).toBe(0); // left edge
    expect(boundaryMsFromPointer(200, rect, 240000)).toBe(120000); // midpoint
    expect(boundaryMsFromPointer(300, rect, 240000)).toBe(240000); // right edge
  });

  it('clamps a pointer outside the box to the ends', () => {
    expect(boundaryMsFromPointer(0, rect, 240000)).toBe(0);
    expect(boundaryMsFromPointer(9999, rect, 240000)).toBe(240000);
  });

  it('returns 0 for a non-positive total or zero-width box', () => {
    expect(boundaryMsFromPointer(200, rect, 0)).toBe(0);
    expect(boundaryMsFromPointer(200, { left: 0, width: 0 }, 240000)).toBe(0);
  });
});

describe('clampSectionStart', () => {
  it('keeps the start a min-gap inside its neighbors', () => {
    // prev=10000, next=60000, gap=1000 → window [11000, 59000]
    expect(clampSectionStart(30000, 10000, 60000, 1000, 240000)).toBe(30000);
    expect(clampSectionStart(5000, 10000, 60000, 1000, 240000)).toBe(11000);
    expect(clampSectionStart(99000, 10000, 60000, 1000, 240000)).toBe(59000);
  });

  it('floors at 0 with no previous and ceils at total with no next', () => {
    expect(clampSectionStart(-5000, null, 60000, 1000, 240000)).toBe(0);
    expect(clampSectionStart(999999, 10000, null, 1000, 240000)).toBe(240000);
  });

  it('falls back to the low bound when neighbors leave no room', () => {
    // prev=10000, next=10500, gap=1000 → hi(9500) < lo(11000) → clamp to lo
    expect(clampSectionStart(10250, 10000, 10500, 1000, 240000)).toBe(11000);
  });
});

describe('trackBoundaries (track-range snap targets)', () => {
  it('always includes the class start and end, plus interior track starts', () => {
    expect(trackBoundaries([0, 60000, 150000], 240000)).toEqual([0, 60000, 150000, 240000]);
  });

  it('dedupes, sorts, rounds, and drops out-of-range starts', () => {
    // 0 dupes the class start; 240000 dupes the end; 300000 is past the end.
    expect(trackBoundaries([150000.4, 0, 60000, 240000, 300000], 240000)).toEqual([
      0, 60000, 150000, 240000,
    ]);
  });

  it('collapses to just [0, total] when there are no interior starts', () => {
    expect(trackBoundaries([0], 240000)).toEqual([0, 240000]);
  });
});

describe('snapToTrackStart', () => {
  const bounds = [0, 60000, 150000, 240000];

  it('snaps a raw time to the nearest boundary', () => {
    expect(snapToTrackStart(58000, bounds)).toBe(60000);
    expect(snapToTrackStart(100000, bounds)).toBe(60000); // 40k vs 50k away
    expect(snapToTrackStart(120000, bounds)).toBe(150000); // 60k vs 30k away
  });

  it('breaks an exact tie toward the lower boundary', () => {
    // 105000 is equidistant (45000) from 60000 and 150000 → lower wins.
    expect(snapToTrackStart(105000, bounds)).toBe(60000);
  });
});

describe('adjacentBoundary (keyboard snapping)', () => {
  const bounds = [0, 60000, 150000, 240000];

  it('moves to the next/previous boundary strictly past the current value', () => {
    expect(adjacentBoundary(60000, bounds, 1)).toBe(150000);
    expect(adjacentBoundary(60000, bounds, -1)).toBe(0);
    expect(adjacentBoundary(70000, bounds, 1)).toBe(150000);
    expect(adjacentBoundary(70000, bounds, -1)).toBe(60000);
  });

  it('stays at the extreme boundary when there is none further', () => {
    expect(adjacentBoundary(240000, bounds, 1)).toBe(240000);
    expect(adjacentBoundary(0, bounds, -1)).toBe(0);
  });
});
