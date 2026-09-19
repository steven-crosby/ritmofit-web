import { describe, expect, it } from 'vitest';
import { isTrackPlanOrderValid, orderTrackIdsByPlan } from './plan-block-ordering.js';

const blocks = new Map([
  ['a', 0],
  ['b', 1],
]);

describe('plan-block track ordering', () => {
  it('groups tracks by block while preserving order inside each block', () => {
    const tracks = [
      { id: 'b1', position: 0, planBlockId: 'b' },
      { id: 'a1', position: 1, planBlockId: 'a' },
      { id: 'a2', position: 2, planBlockId: 'a' },
      { id: 'loose', position: 3, planBlockId: null },
    ];
    expect(orderTrackIdsByPlan(tracks, blocks)).toEqual(['a1', 'a2', 'b1', 'loose']);
    expect(isTrackPlanOrderValid(tracks, blocks)).toBe(false);
  });

  it('accepts already grouped tracks', () => {
    expect(
      isTrackPlanOrderValid(
        [
          { id: 'a1', position: 0, planBlockId: 'a' },
          { id: 'b1', position: 1, planBlockId: 'b' },
          { id: 'loose', position: 2, planBlockId: null },
        ],
        blocks,
      ),
    ).toBe(true);
  });
});
