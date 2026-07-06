import { describe, it, expect } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  avgBpm,
  cardSummaryFromPayload,
  formatDuration,
  formatTemplateLabel,
} from './class-summary.js';

/** Minimal track entry; only the fields the summary helpers read need to be real. */
function entry(displayBpm: number | null): RunPayloadTrackEntry {
  return { displayBpm } as RunPayloadTrackEntry;
}

function payload(...bpms: (number | null)[]): RunPayload {
  return { tracks: bpms.map(entry) } as RunPayload;
}

describe('avgBpm', () => {
  it('averages the tracks that have a BPM, rounded', () => {
    expect(avgBpm(payload(120, 121))).toBe(121); // 120.5 → 121
    expect(avgBpm(payload(100, 110, 130))).toBe(113); // 113.33 → 113
  });

  it('excludes tracks without a BPM rather than counting them as zero', () => {
    expect(avgBpm(payload(100, null, 200))).toBe(150);
  });

  it('returns null when no track has a BPM', () => {
    expect(avgBpm(payload(null, null))).toBeNull();
    expect(avgBpm(payload())).toBeNull();
  });
});

describe('cardSummaryFromPayload', () => {
  /** Build a payload with a class total and a list of (albumArtUrl) tracks. */
  function artPayload(totalDurationMs: number, arts: (string | null)[]): RunPayload {
    return {
      class: { totalDurationMs },
      tracks: arts.map((albumArtUrl) => ({ track: { albumArtUrl } })),
    } as RunPayload;
  }

  it('derives count + total runtime and distinct art in order, capped at 4', () => {
    const summary = cardSummaryFromPayload(
      artPayload(630_000, [
        'https://art/a.jpg',
        null,
        'https://art/a.jpg', // dup
        'https://art/b.jpg',
        'https://art/c.jpg',
        'https://art/d.jpg',
        'https://art/e.jpg', // beyond the cap
      ]),
    );
    expect(summary.trackCount).toBe(7);
    expect(summary.totalDurationMs).toBe(630_000);
    expect(summary.albumArtUrls).toEqual([
      'https://art/a.jpg',
      'https://art/b.jpg',
      'https://art/c.jpg',
      'https://art/d.jpg',
    ]);
  });

  it('is all-empty for a class with no tracks', () => {
    expect(cardSummaryFromPayload(artPayload(0, []))).toEqual({
      trackCount: 0,
      totalDurationMs: 0,
      albumArtUrls: [],
    });
  });
});

describe('formatDuration', () => {
  it('formats sub-hour durations as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9000)).toBe('0:09');
    expect(formatDuration(380000)).toBe('6:20');
    expect(formatDuration(1422000)).toBe('23:42');
  });

  it('formats hour-plus durations as h:mm:ss', () => {
    expect(formatDuration(3600000)).toBe('1:00:00');
    expect(formatDuration(3661000)).toBe('1:01:01');
  });

  it('clamps negative input to 0', () => {
    expect(formatDuration(-5000)).toBe('0:00');
  });
});

describe('formatTemplateLabel', () => {
  it('shows the current D21 Pilates label over the stored sculpt enum', () => {
    expect(formatTemplateLabel('cycle')).toBe('Cycle');
    expect(formatTemplateLabel('sculpt')).toBe('Pilates');
    expect(formatTemplateLabel('hiit')).toBe('HIIT');
  });
});
