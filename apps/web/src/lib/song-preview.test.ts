import { describe, expect, it } from 'vitest';
import type { TrackSearchResult } from '@ritmofit/shared';
import { playbackWindowFor } from './playback/coordinator.js';
import { previewClock, songPreviewEntry } from './song-preview.js';

const track: TrackSearchResult = {
  provider: 'apple_music',
  providerTrackId: '1440',
  providerUri: null,
  title: 'Instinct',
  artist: 'Lane 8',
  albumArtUrl: null,
  durationMs: 215_000,
};

describe('songPreviewEntry', () => {
  it('plays the whole song through its own provider ref', () => {
    const entry = songPreviewEntry(track);
    expect(entry.providerRefs).toEqual([
      { provider: 'apple_music', providerTrackId: '1440', providerUri: null },
    ]);
    expect(entry.clipStartMs).toBe(0);
    expect(playbackWindowFor(entry)).toMatchObject({ startMs: 0, endMs: 215_000 });
    expect(entry.track).toMatchObject({ title: 'Instinct', artist: 'Lane 8' });
  });

  it('names the preview by the pick key and has no cues, moves or class placement', () => {
    const entry = songPreviewEntry(track);
    expect(entry.classTrackId).toBe('apple_music:1440');
    expect(entry.cues).toEqual([]);
    expect(entry.moves).toEqual([]);
    expect(entry.startOffsetMs).toBeNull();
  });

  it('passes an unknown length through as null (the preview controller plays it open-ended)', () => {
    expect(songPreviewEntry({ ...track, durationMs: null }).track.durationMs).toBeNull();
  });
});

describe('previewClock', () => {
  it('formats m:ss and floors partial seconds', () => {
    expect(previewClock(0)).toBe('0:00');
    expect(previewClock(65_999)).toBe('1:05');
    expect(previewClock(-5)).toBe('0:00');
  });
});
