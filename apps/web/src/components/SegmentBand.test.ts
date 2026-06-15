import { describe, it, expect } from 'vitest';
import type { SegmentType } from '@ritmofit/shared';
import { computeSegmentBands } from './SegmentBand.js';

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
