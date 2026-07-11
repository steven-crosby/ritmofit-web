import { describe, it, expect } from 'vitest';
import type { Intensity, RunPayload } from '@ritmofit/shared';
import {
  computeTimeline,
  snapTrackStart,
  trackStartGrid,
  type TimelineBlock,
} from './TimelineStrip.js';

type Entry = RunPayload['tracks'][number];
type Cue = Entry['cues'][number];
type Move = Entry['moves'][number];

/** Minimal run-payload track entry — only the fields the timeline geometry reads matter. */
function entry(
  durationMs: number | null,
  position = 0,
  cues: Cue[] = [],
  moves: Move[] = [],
  startOffsetMs = 0,
): Entry {
  return {
    classTrackId: `00000000-0000-0000-0000-00000000000${position}`,
    position,
    displayBpm: null,
    displayRpm: null,
    holdCount: null,
    intensity: 'mod',
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
    cues,
    moves,
  };
}

const cue = (
  anchorMs: number,
  text = 'Cue',
  color: string | null = null,
  id = `cue-${anchorMs}`,
): Cue => ({ id, anchorMs, beat: null, bar: null, text, color }) as Cue;
const move = (
  anchorMs: number,
  name = 'Move',
  intensity: Intensity | null = null,
  id = `move-${anchorMs}`,
): Move => ({ id, anchorMs, name, intensity }) as Move;

describe('computeTimeline — blocks', () => {
  it('returns nothing when the assembled total is zero or negative', () => {
    expect(computeTimeline([entry(1000)], 0)).toEqual({ blocks: [], markers: [] });
    expect(computeTimeline([entry(1000)], -5)).toEqual({ blocks: [], markers: [] });
  });

  it('sizes blocks by their share of the total and places them by offset', () => {
    const { blocks } = computeTimeline(
      [entry(1000, 0, [], [], 0), entry(3000, 1, [], [], 1000)],
      4000,
    );
    expect(blocks.map((b) => b.leftPct)).toEqual([0, 25]);
    expect(blocks.map((b) => b.widthPct)).toEqual([25, 75]);
    expect(blocks.map((b) => b.position)).toEqual([0, 1]);
  });

  it('honors an authored offset gap (free placement)', () => {
    // Track B starts at 2000 with a gap after A (which ends at 1000).
    const { blocks } = computeTimeline(
      [entry(1000, 0, [], [], 0), entry(1000, 1, [], [], 2000)],
      4000,
    );
    expect(blocks.map((b) => b.leftPct)).toEqual([0, 50]);
  });

  it('skips null/zero-duration tracks (no block, no advance)', () => {
    const { blocks } = computeTimeline([entry(null, 0), entry(1000, 1), entry(0, 2)], 1000);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ leftPct: 0, widthPct: 100, position: 1 });
  });

  it('carries the classTrackId on each block (for click-to-select)', () => {
    const { blocks } = computeTimeline([entry(1000, 0), entry(1000, 1)], 2000);
    expect(blocks.map((b) => b.classTrackId)).toEqual([
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
    ]);
  });
});

describe('computeTimeline — markers', () => {
  it('positions a cue/move at trackStart + anchor, as a percentage of total', () => {
    const { markers } = computeTimeline(
      [entry(1000, 0, [cue(500, 'A')], [], 0), entry(1000, 1, [], [move(250, 'B', 'hard')], 1000)],
      2000,
    );
    expect(markers).toHaveLength(2);
    // cue at 0 + 500 = 500 / 2000 = 25%; in-track anchor preserved for correlation
    expect(markers[0]).toMatchObject({
      kind: 'cue',
      absMs: 500,
      anchorMs: 500,
      leftPct: 25,
      label: 'A',
      color: null,
    });
    // move at 1000 + 250 = 1250 / 2000 = 62.5%, anchor 250; intensity → CSS var
    expect(markers[1]).toMatchObject({
      kind: 'move',
      absMs: 1250,
      anchorMs: 250,
      leftPct: 62.5,
      label: 'B',
      color: 'var(--rf-color-intensity-hard)',
    });
  });

  it('clamps an anchor past the track duration to the track end', () => {
    const { markers } = computeTimeline([entry(1000, 0, [cue(9999)])], 1000);
    expect(markers[0]!.absMs).toBe(1000); // clamped to dur, not 9999
  });

  it('carries a cue color through, and gives a no-intensity move no color', () => {
    const { markers } = computeTimeline(
      [entry(1000, 0, [cue(0, 'tagged', '#E07E3C')], [move(0, 'plain', null)])],
      1000,
    );
    expect(markers.find((m) => m.kind === 'cue')!.color).toBe('#E07E3C');
    expect(markers.find((m) => m.kind === 'move')!.color).toBeNull();
  });

  it('drops markers on a zero-duration track (cannot be positioned)', () => {
    const { markers } = computeTimeline([entry(0, 0, [cue(100)], [move(100)])], 1000);
    expect(markers).toEqual([]);
  });

  it('carries the marker’s track classTrackId + position (for click-to-select)', () => {
    const { markers } = computeTimeline([entry(1000, 0), entry(1000, 1, [cue(100)])], 2000);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      classTrackId: '00000000-0000-0000-0000-000000000001',
      position: 1,
    });
  });

  it('carries each cue/move id so two markers at the same anchor stay distinct', () => {
    const { markers } = computeTimeline(
      [entry(1000, 0, [cue(500, 'first', null, 'cue-A'), cue(500, 'second', null, 'cue-B')])],
      1000,
    );
    expect(markers).toHaveLength(2);
    expect(markers.map((m) => m.id)).toEqual(['cue-A', 'cue-B']);
    // Same anchor/position, but distinct ids — the disambiguator.
    expect(markers[0]!.anchorMs).toBe(markers[1]!.anchorMs);
  });
});

/** Minimal timeline block — only the fields the start-snap math reads matter. */
function blk(
  over: Partial<TimelineBlock> & Pick<TimelineBlock, 'classTrackId' | 'startMs'>,
): TimelineBlock {
  return {
    leftPct: 0,
    widthPct: 0,
    position: 0,
    durMs: 10_000,
    clipStartMs: 0,
    beatAnchorMs: 0,
    bpm: null,
    ...over,
  };
}

describe('trackStartGrid — the reference grid for a dragged track start', () => {
  it('uses the nearest preceding other block with a tempo, ignoring later blocks', () => {
    const blocks = [
      blk({ classTrackId: 'a', startMs: 0, bpm: 120 }),
      blk({ classTrackId: 'b', startMs: 20_000, bpm: 100 }),
      blk({ classTrackId: 'c', startMs: 40_000, bpm: 90 }),
    ];
    // Candidate between b and c → b's grid (600 ms beats), not a's or c's.
    expect(trackStartGrid(22_900, 'x', blocks)).toEqual({ originMs: 20_000, beatLenMs: 600 });
  });

  it('shifts the grid origin by the downbeat and the clip window (beatAnchor − clipStart)', () => {
    const blocks = [
      blk({ classTrackId: 'a', startMs: 1000, bpm: 120, beatAnchorMs: 250, clipStartMs: 400 }),
    ];
    expect(trackStartGrid(3000, 'x', blocks)).toEqual({ originMs: 850, beatLenMs: 500 });
  });

  it('never uses the dragged block itself as its own reference', () => {
    const blocks = [blk({ classTrackId: 'a', startMs: 0, bpm: 120 })];
    expect(trackStartGrid(5000, 'a', blocks)).toBeNull();
  });

  it('is null when no preceding block has a tempo', () => {
    const noBpm = [blk({ classTrackId: 'a', startMs: 0 })];
    expect(trackStartGrid(5000, 'x', noBpm)).toBeNull();
    // A tempo'd block that starts after the candidate does not count.
    const later = [blk({ classTrackId: 'a', startMs: 20_000, bpm: 120 })];
    expect(trackStartGrid(500, 'x', later)).toBeNull();
  });
});

describe('snapTrackStart — dragged track starts snap to the preceding grid', () => {
  const blocks = [blk({ classTrackId: 'a', startMs: 0, bpm: 120, durMs: 10_000 })];

  it('snaps to the nearest beat of the preceding grid, extended past its end', () => {
    // 120 bpm → 500 ms beats; 10 740 sits in the gap after a (ends 10 000) → beat 21.
    expect(snapTrackStart(10_740, 'x', blocks, true)).toBe(10_500);
  });

  it('honors the grid phase (downbeat + clip window)', () => {
    const phased = [
      blk({ classTrackId: 'a', startMs: 1000, bpm: 120, beatAnchorMs: 250, clipStartMs: 400 }),
    ];
    // Origin 850, beats of 500 → 3020 snaps to 850 + 4×500.
    expect(snapTrackStart(3020, 'x', phased, true)).toBe(2850);
  });

  it('falls back to whole seconds when snap is off', () => {
    expect(snapTrackStart(10_740, 'x', blocks, false)).toBe(11_000);
  });

  it('falls back to whole seconds when no reference grid exists', () => {
    expect(snapTrackStart(10_740, 'a', blocks, true)).toBe(11_000); // own grid excluded
    expect(snapTrackStart(3720, 'x', [blk({ classTrackId: 'a', startMs: 0 })], true)).toBe(4000);
  });

  it('clamps a snapped start below zero to zero', () => {
    // Origin −300 (clip starts after the downbeat), 1000 ms beats → beat 0 sits at −300.
    const neg = [blk({ classTrackId: 'a', startMs: 0, bpm: 60, clipStartMs: 300 })];
    expect(snapTrackStart(0, 'x', neg, true)).toBe(0);
  });
});
