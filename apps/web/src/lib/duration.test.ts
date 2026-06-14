import { describe, expect, it } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  canRunPayload,
  formatDurationInput,
  parseDurationInput,
  runBlockedMessage,
  tracksMissingDuration,
} from './duration.js';

function entry(title: string, durationMs: number | null): RunPayloadTrackEntry {
  return { track: { title, durationMs } } as RunPayloadTrackEntry;
}

function payload(...entries: RunPayloadTrackEntry[]): RunPayload {
  return { tracks: entries } as RunPayload;
}

describe('duration input', () => {
  it('formats and parses m:ss values', () => {
    expect(formatDurationInput(225000)).toBe('3:45');
    expect(formatDurationInput(3900000)).toBe('65:00');
    expect(parseDurationInput('3:45')).toBe(225000);
    expect(parseDurationInput(' 65:00 ')).toBe(3900000);
  });

  it('rejects malformed, zero, and out-of-range seconds', () => {
    expect(parseDurationInput('3')).toBeNull();
    expect(parseDurationInput('3:5')).toBeNull();
    expect(parseDurationInput('3:60')).toBeNull();
    expect(parseDurationInput('0:00')).toBeNull();
  });
});

describe('Live readiness', () => {
  it('requires at least one track and a duration for every track', () => {
    const ready = payload(entry('Ready', 180000));
    const missing = payload(entry('Ready', 180000), entry('Unknown', null));

    expect(canRunPayload(ready)).toBe(true);
    expect(canRunPayload(payload())).toBe(false);
    expect(canRunPayload(missing)).toBe(false);
    expect(tracksMissingDuration(missing).map((track) => track.track.title)).toEqual(['Unknown']);
  });

  it('returns an actionable blocked message', () => {
    expect(runBlockedMessage(payload())).toBe('Add a track before starting Live mode.');
    expect(runBlockedMessage(payload(entry('Track A', null), entry('Track B', null)))).toBe(
      'Set a duration for Track A, Track B before starting Live mode.',
    );
    expect(runBlockedMessage(payload(entry('Ready', 180000)))).toBeNull();
  });
});
