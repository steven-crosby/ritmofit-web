import { describe, it, expect } from 'vitest';
import { resolveMoveName, computeClassTimeline } from './run-payload.js';

describe('resolveMoveName', () => {
  it('prefers the global library name', () => {
    expect(resolveMoveName('Climb', 'My Climb', 'Freeform')).toBe('Climb');
  });
  it('falls back to the user-move name', () => {
    expect(resolveMoveName(null, 'My Climb', 'Freeform')).toBe('My Climb');
  });
  it('falls back to the freeform override', () => {
    expect(resolveMoveName(null, null, 'Freeform')).toBe('Freeform');
  });
  it('treats undefined library lookups like null', () => {
    expect(resolveMoveName(undefined, undefined, 'Freeform')).toBe('Freeform');
  });
});

describe('computeClassTimeline', () => {
  it('lays tracks back-to-back and totals their durations', () => {
    const { startOffsetByCt, totalDurationMs } = computeClassTimeline([
      { id: 'a', durationMs: 180000 },
      { id: 'b', durationMs: 200000 },
      { id: 'c', durationMs: 60000 },
    ]);
    expect(startOffsetByCt.get('a')).toBe(0);
    expect(startOffsetByCt.get('b')).toBe(180000);
    expect(startOffsetByCt.get('c')).toBe(380000);
    expect(totalDurationMs).toBe(440000);
  });

  it('treats a null duration as 0 (offset unchanged, total unaffected)', () => {
    const { startOffsetByCt, totalDurationMs } = computeClassTimeline([
      { id: 'a', durationMs: 180000 },
      { id: 'b', durationMs: null },
      { id: 'c', durationMs: 60000 },
    ]);
    expect(startOffsetByCt.get('b')).toBe(180000);
    expect(startOffsetByCt.get('c')).toBe(180000); // null b adds nothing
    expect(totalDurationMs).toBe(240000);
  });

  it('the last offset plus its duration equals the class total', () => {
    const tracks = [
      { id: 'a', durationMs: 120000 },
      { id: 'b', durationMs: 90000 },
    ];
    const { startOffsetByCt, totalDurationMs } = computeClassTimeline(tracks);
    const last = tracks[tracks.length - 1]!;
    expect(startOffsetByCt.get(last.id)! + (last.durationMs ?? 0)).toBe(totalDurationMs);
  });

  it('is 0 / empty for a class with no tracks', () => {
    const { startOffsetByCt, totalDurationMs } = computeClassTimeline([]);
    expect(totalDurationMs).toBe(0);
    expect(startOffsetByCt.size).toBe(0);
  });
});
