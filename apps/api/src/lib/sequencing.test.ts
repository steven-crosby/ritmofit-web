import { describe, it, expect } from 'vitest';
import { computeSequence, overlapsAny } from './sequencing.js';

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

describe('overlapsAny (free-mode placement)', () => {
  const others = [
    { start: 0, dur: 1000 }, // [0, 1000)
    { start: 2000, dur: 1000 }, // [2000, 3000)
  ];
  it('allows a gap between tracks', () => {
    expect(overlapsAny({ start: 1200, dur: 500 }, others)).toBe(false);
  });
  it('allows touching edges (end meets next start)', () => {
    expect(overlapsAny({ start: 1000, dur: 1000 }, others)).toBe(false); // [1000, 2000)
  });
  it('rejects a window that intrudes into a neighbor', () => {
    expect(overlapsAny({ start: 900, dur: 500 }, others)).toBe(true); // [900,1400) hits [0,1000)
    expect(overlapsAny({ start: 2500, dur: 1000 }, others)).toBe(true); // hits [2000,3000)
  });
  it('zero-width windows never overlap', () => {
    expect(overlapsAny({ start: 500, dur: 0 }, others)).toBe(false);
    expect(overlapsAny({ start: 500, dur: 500 }, [{ start: 400, dur: 0 }])).toBe(false);
  });
});
