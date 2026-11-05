/**
 * Music › Songs ▶ preview (RF-172). A liked song is a provider search result, not
 * a class track, so it has no class placement, clip window or stored id. This
 * adapter shapes it as the one-track entry the builder preview controller plays:
 * the whole song from 0:00, through the song's own provider ref. Building it
 * imports nothing, saves nothing and calls no API, so previewing has no side
 * effect (no import, no provider-id attach).
 */
import type { RunPayloadTrackEntry, TrackSearchResult } from '@ritmofit/shared';
import { songPickKey } from './song-picks.js';

export function songPreviewEntry(track: TrackSearchResult): RunPayloadTrackEntry {
  const key = songPickKey(track);
  return {
    // The preview controller only uses this to name its status; the pick key is
    // already unique per song in the list.
    classTrackId: key,
    position: 0,
    displayBpm: null,
    displayRpm: null,
    holdCount: null,
    intensity: 'moderate',
    startOffsetMs: null,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: key,
      title: track.title,
      artist: track.artist,
      durationMs: track.durationMs,
      baseDurationMs: track.durationMs,
      albumArtUrl: track.albumArtUrl,
    },
    providerRefs: [
      {
        provider: track.provider,
        providerTrackId: track.providerTrackId,
        providerUri: track.providerUri,
      },
    ],
    cues: [],
    moves: [],
  };
}

/** `m:ss` for the inline player's elapsed time. */
export function previewClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
