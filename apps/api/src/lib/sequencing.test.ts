import { describe, it, expect } from 'vitest';
import { computeSequence } from './sequencing.js';

describe('computeSequence', () => {
  it('empty list → empty', () => {
    expect(computeSequence([])).toEqual([]);
  });

  it('assigns contiguous positions from 0', () => {
    const seq = computeSequence([
      { id: 'a', durationMs: 1000 },
      { id: 'b', durationMs: 2000 },
      { id: 'c', durationMs: 500 },
    ]);
    expect(seq.map((s) => s.position)).toEqual([0, 1, 2]);
  });

  it('offset is the cumulative sum of preceding durations (back-to-back)', () => {
    const seq = computeSequence([
      { id: 'a', durationMs: 1000 },
      { id: 'b', durationMs: 2000 },
      { id: 'c', durationMs: 500 },
    ]);
    expect(seq.map((s) => s.startOffsetMs)).toEqual([0, 1000, 3000]);
  });

  it('null durations contribute 0 to the running offset', () => {
    const seq = computeSequence([
      { id: 'a', durationMs: null },
      { id: 'b', durationMs: 2000 },
      { id: 'c', durationMs: null },
      { id: 'd', durationMs: 1000 },
    ]);
    expect(seq.map((s) => s.startOffsetMs)).toEqual([0, 0, 2000, 2000]);
  });

  it('preserves the input order (caller decides ordering)', () => {
    const seq = computeSequence([
      { id: 'x', durationMs: 100 },
      { id: 'y', durationMs: 100 },
    ]);
    expect(seq.map((s) => s.id)).toEqual(['x', 'y']);
  });
});
