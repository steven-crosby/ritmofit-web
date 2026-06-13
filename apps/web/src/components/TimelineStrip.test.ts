import { describe, it, expect } from 'vitest';
import type { Intensity, RunPayload } from '@ritmofit/shared';
import { computeTimeline } from './TimelineStrip.js';

type Entry = RunPayload['tracks'][number];
type Cue = Entry['cues'][number];
type Move = Entry['moves'][number];

/** Minimal run-payload track entry — only the fields the timeline geometry reads matter. */
function entry(
  durationMs: number | null,
  position = 0,
  cues: Cue[] = [],
  moves: Move[] = [],
): Entry {
  return {
    classTrackId: `00000000-0000-0000-0000-00000000000${position}`,
    position,
    displayBpm: null,
    intensity: 'mod',
    startOffsetMs: null,
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

const cue = (anchorMs: number, text = 'Cue', color: string | null = null): Cue =>
  ({ anchorMs, beat: null, bar: null, text, color }) as Cue;
const move = (anchorMs: number, name = 'Move', intensity: Intensity | null = null): Move =>
  ({ anchorMs, name, intensity }) as Move;

describe('computeTimeline — blocks', () => {
  it('returns nothing when the assembled total is zero or negative', () => {
    expect(computeTimeline([entry(1000)], 0)).toEqual({ blocks: [], markers: [] });
    expect(computeTimeline([entry(1000)], -5)).toEqual({ blocks: [], markers: [] });
  });

  it('sizes blocks by their share of the total and tiles them end to end', () => {
    const { blocks } = computeTimeline([entry(1000, 0), entry(3000, 1)], 4000);
    expect(blocks.map((b) => b.leftPct)).toEqual([0, 25]);
    expect(blocks.map((b) => b.widthPct)).toEqual([25, 75]);
    expect(blocks.map((b) => b.position)).toEqual([0, 1]);
  });

  it('skips null/zero-duration tracks (no block, no advance)', () => {
    const { blocks } = computeTimeline([entry(null, 0), entry(1000, 1), entry(0, 2)], 1000);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ leftPct: 0, widthPct: 100, position: 1 });
  });
});

describe('computeTimeline — markers', () => {
  it('positions a cue/move at trackStart + anchor, as a percentage of total', () => {
    const { markers } = computeTimeline(
      [entry(1000, 0, [cue(500, 'A')]), entry(1000, 1, [], [move(250, 'B', 'hard')])],
      2000,
    );
    expect(markers).toHaveLength(2);
    // cue at 0 + 500 = 500 / 2000 = 25%
    expect(markers[0]).toMatchObject({ kind: 'cue', absMs: 500, leftPct: 25, label: 'A', color: null });
    // move at 1000 + 250 = 1250 / 2000 = 62.5%, intensity → CSS var
    expect(markers[1]).toMatchObject({
      kind: 'move',
      absMs: 1250,
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
});
