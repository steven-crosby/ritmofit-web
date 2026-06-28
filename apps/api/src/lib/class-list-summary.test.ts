import { describe, it, expect } from 'vitest';
import {
  aggregateClassCards,
  emptyClassCardSummary,
  type ClassTrackSummaryRow,
} from './class-list-summary.js';
import type { TimelineMode } from '@ritmofit/shared';

/** Build a summary row with sensible defaults; override only what a case cares about. */
function row(over: Partial<ClassTrackSummaryRow> & { classId: string }): ClassTrackSummaryRow {
  return {
    position: 0,
    startOffsetMs: null,
    durationMsOverride: null,
    clipStartMs: 0,
    clipEndMs: null,
    trackDurationMs: null,
    albumArtUrl: null,
    ...over,
  };
}

const ART = 4;

describe('emptyClassCardSummary', () => {
  it('is all zero/empty for a class with no tracks', () => {
    expect(emptyClassCardSummary()).toEqual({
      trackCount: 0,
      totalDurationMs: 0,
      albumArtUrls: [],
    });
  });
});

describe('aggregateClassCards', () => {
  it('returns an empty map for no rows', () => {
    expect(aggregateClassCards([], new Map(), ART).size).toBe(0);
  });

  it('sums sequential track durations and counts tracks', () => {
    const rows = [
      row({ classId: 'c1', position: 0, trackDurationMs: 180_000 }),
      row({ classId: 'c1', position: 1, trackDurationMs: 200_000 }),
    ];
    const out = aggregateClassCards(rows, new Map([['c1', 'sequential' as TimelineMode]]), ART);
    expect(out.get('c1')).toMatchObject({ trackCount: 2, totalDurationMs: 380_000 });
  });

  it('defaults a class missing from the mode map to sequential (sum)', () => {
    const rows = [
      row({ classId: 'c1', position: 0, trackDurationMs: 60_000 }),
      row({ classId: 'c1', position: 1, trackDurationMs: 90_000 }),
    ];
    const out = aggregateClassCards(rows, new Map(), ART);
    expect(out.get('c1')?.totalDurationMs).toBe(150_000);
  });

  it('honors the clip window (effective duration) when summing', () => {
    // 180s track clipped to [30s, 90s) contributes 60s, not 180s.
    const rows = [
      row({ classId: 'c1', trackDurationMs: 180_000, clipStartMs: 30_000, clipEndMs: 90_000 }),
    ];
    const out = aggregateClassCards(rows, new Map([['c1', 'sequential' as TimelineMode]]), ART);
    expect(out.get('c1')?.totalDurationMs).toBe(60_000);
  });

  it('treats unknown-length tracks as zero duration but still counts them', () => {
    const rows = [
      row({ classId: 'c1', position: 0, trackDurationMs: null }),
      row({ classId: 'c1', position: 1, trackDurationMs: 120_000 }),
    ];
    const out = aggregateClassCards(rows, new Map([['c1', 'sequential' as TimelineMode]]), ART);
    expect(out.get('c1')).toMatchObject({ trackCount: 2, totalDurationMs: 120_000 });
  });

  it('uses latest track end for free-mode total (gaps count, trailing gaps do not)', () => {
    const rows = [
      row({ classId: 'c1', position: 0, startOffsetMs: 0, trackDurationMs: 60_000 }),
      // Placed at 120s with a 60s track → ends at 180s, the latest end.
      row({ classId: 'c1', position: 1, startOffsetMs: 120_000, trackDurationMs: 60_000 }),
    ];
    const out = aggregateClassCards(rows, new Map([['c1', 'free' as TimelineMode]]), ART);
    expect(out.get('c1')?.totalDurationMs).toBe(180_000);
  });

  it('collects distinct album art in track order, skipping nulls and capping at the limit', () => {
    const rows = [
      row({ classId: 'c1', position: 0, albumArtUrl: 'https://art/a.jpg' }),
      row({ classId: 'c1', position: 1, albumArtUrl: null }),
      row({ classId: 'c1', position: 2, albumArtUrl: 'https://art/a.jpg' }), // dup
      row({ classId: 'c1', position: 3, albumArtUrl: 'https://art/b.jpg' }),
      row({ classId: 'c1', position: 4, albumArtUrl: 'https://art/c.jpg' }),
      row({ classId: 'c1', position: 5, albumArtUrl: 'https://art/d.jpg' }),
      row({ classId: 'c1', position: 6, albumArtUrl: 'https://art/e.jpg' }),
    ];
    const out = aggregateClassCards(rows, new Map([['c1', 'sequential' as TimelineMode]]), ART);
    expect(out.get('c1')?.albumArtUrls).toEqual([
      'https://art/a.jpg',
      'https://art/b.jpg',
      'https://art/c.jpg',
      'https://art/d.jpg',
    ]);
  });

  it('separates rows by class', () => {
    const rows = [
      row({ classId: 'c1', trackDurationMs: 60_000 }),
      row({ classId: 'c2', trackDurationMs: 90_000 }),
    ];
    const out = aggregateClassCards(
      rows,
      new Map([
        ['c1', 'sequential' as TimelineMode],
        ['c2', 'sequential' as TimelineMode],
      ]),
      ART,
    );
    expect(out.get('c1')?.totalDurationMs).toBe(60_000);
    expect(out.get('c2')?.totalDurationMs).toBe(90_000);
  });
});
