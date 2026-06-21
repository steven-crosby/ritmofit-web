import { describe, expect, it } from 'vitest';
import {
  msPerBeat,
  beatPositionAt,
  snapToBeat,
  beatGridTicks,
  beatGridLayout,
} from '@ritmofit/shared';

describe('msPerBeat', () => {
  it('converts bpm to ms per beat', () => {
    expect(msPerBeat(120)).toBe(500);
    expect(msPerBeat(60)).toBe(1000);
  });
  it('is null for missing/invalid tempo', () => {
    expect(msPerBeat(null)).toBeNull();
    expect(msPerBeat(0)).toBeNull();
    expect(msPerBeat(-5)).toBeNull();
  });
});

describe('beatPositionAt (4/4 at 120bpm, beatLen 500ms)', () => {
  it('maps the downbeat to bar 1, beat 1', () => {
    expect(beatPositionAt(0, 120)).toEqual({ beat: 1, bar: 1 });
  });
  it('counts beats within the first bar', () => {
    expect(beatPositionAt(500, 120)).toEqual({ beat: 2, bar: 1 });
    expect(beatPositionAt(1500, 120)).toEqual({ beat: 4, bar: 1 });
  });
  it('rolls into the next bar', () => {
    expect(beatPositionAt(2000, 120)).toEqual({ beat: 1, bar: 2 });
  });
  it('honors a downbeat offset (grid shifted by the intro)', () => {
    // downbeat at 2000ms: that instant is bar 1 beat 1.
    expect(beatPositionAt(2000, 120, 2000)).toEqual({ beat: 1, bar: 1 });
    expect(beatPositionAt(2500, 120, 2000)).toEqual({ beat: 2, bar: 1 });
  });
  it('is null without a tempo', () => {
    expect(beatPositionAt(1000, null)).toBeNull();
  });
});

describe('snapToBeat', () => {
  it('rounds to the nearest beat and reports beat/bar', () => {
    expect(snapToBeat(1490, 120)).toEqual({ anchorMs: 1500, beat: 4, bar: 1 });
    expect(snapToBeat(1740, 120)).toEqual({ anchorMs: 1500, beat: 4, bar: 1 }); // < halfway to next
    expect(snapToBeat(1760, 120)).toEqual({ anchorMs: 2000, beat: 1, bar: 2 }); // > halfway
  });
  it('snaps against a shifted downbeat', () => {
    // grid origin 300ms, beatLen 500: beats at 300, 800, 1300...
    expect(snapToBeat(820, 120, 300)).toEqual({ anchorMs: 800, beat: 2, bar: 1 });
  });
  it('clamps the snapped anchor to ≥ 0', () => {
    expect(snapToBeat(100, 120, 0).anchorMs).toBe(0);
  });
  it('returns the anchor unchanged with null beat/bar when tempo is unknown', () => {
    expect(snapToBeat(1234, null)).toEqual({ anchorMs: 1234, beat: null, bar: null });
  });
});

describe('beatGridTicks', () => {
  it('emits beats across the span, flagging downbeats every 4', () => {
    const ticks = beatGridTicks(0, 120, 2000); // beats at 0,500,1000,1500,2000
    expect(ticks.map((t) => t.ms)).toEqual([0, 500, 1000, 1500, 2000]);
    expect(ticks.filter((t) => t.isDownbeat).map((t) => t.ms)).toEqual([0, 2000]);
  });
  it('starts at the first tick ≥ 0 for a negative origin (clip after the downbeat)', () => {
    // origin -300 (downbeat 300ms before the clip): ticks at -300+n*500 ≥ 0 → 200, 700, ...
    const ticks = beatGridTicks(-300, 120, 1000);
    expect(ticks.map((t) => t.ms)).toEqual([200, 700]);
  });
  it('is empty without a tempo or for an empty span', () => {
    expect(beatGridTicks(0, null, 1000)).toEqual([]);
    expect(beatGridTicks(0, 120, 0)).toEqual([]);
  });
});

describe('beatGridLayout', () => {
  it('gives spacing + phase as percentages of the span', () => {
    // span 2000ms, beatLen 500 → beatPct 25, barPct 100; origin 0 → phases 0.
    expect(beatGridLayout(0, 120, 2000)).toEqual({
      beatPct: 25,
      barPct: 100,
      beatPhasePct: 0,
      barPhasePct: 0,
    });
  });
  it('wraps the phase by the beat/bar length (handles negative origin)', () => {
    // origin -300, beatLen 500, barLen 2000, span 1000.
    // beat phase: (-300 mod 500)=200 → 20%; bar phase: (-300 mod 2000)=1700 → 170%.
    expect(beatGridLayout(-300, 120, 1000)).toEqual({
      beatPct: 50,
      barPct: 200,
      beatPhasePct: 20,
      barPhasePct: 170,
    });
  });
  it('is null without a tempo', () => {
    expect(beatGridLayout(0, null, 1000)).toBeNull();
  });
});
