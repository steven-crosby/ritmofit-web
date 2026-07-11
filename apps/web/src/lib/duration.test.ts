import { describe, expect, it } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  anchorFieldState,
  canRunPayload,
  formatClockFromMs,
  formatDurationInput,
  parseClockToMs,
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

describe('anchor clock (cue/move/segment m:ss)', () => {
  it('formats an in-track anchor as m:ss, with 0 → 0:00', () => {
    // Unlike a duration field, the start of the track is a valid, non-empty anchor.
    expect(formatClockFromMs(0)).toBe('0:00');
    expect(formatClockFromMs(150000)).toBe('2:30');
    expect(formatClockFromMs(3900000)).toBe('65:00');
    expect(formatClockFromMs(-500)).toBe('0:00'); // clamps negatives
    expect(formatClockFromMs(1499)).toBe('0:01'); // rounds to the nearest second
  });

  it('parses m:ss to ms and accepts 0:00 (the very start)', () => {
    expect(parseClockToMs('0:00')).toBe(0);
    expect(parseClockToMs('2:30')).toBe(150000);
    expect(parseClockToMs(' 65:00 ')).toBe(3900000);
  });

  it('rejects malformed anchor timecodes', () => {
    expect(parseClockToMs('150')).toBeNull();
    expect(parseClockToMs('2:3')).toBeNull();
    expect(parseClockToMs('2:60')).toBeNull();
    expect(parseClockToMs('')).toBeNull();
  });

  it('round-trips a persisted anchor through format → parse', () => {
    expect(parseClockToMs(formatClockFromMs(0))).toBe(0);
    expect(parseClockToMs(formatClockFromMs(150000))).toBe(150000);
  });
});

describe('anchorFieldState', () => {
  it('accepts 0:00 as a submittable anchor at the start', () => {
    expect(anchorFieldState('0:00', 240000)).toEqual({ ms: 0, invalid: false, message: null });
  });

  it('accepts an in-range anchor', () => {
    expect(anchorFieldState('2:30', 240000)).toEqual({ ms: 150000, invalid: false, message: null });
  });

  it('flags a malformed value as invalid with a hint (non-empty only)', () => {
    expect(anchorFieldState('150', 240000)).toEqual({
      ms: null,
      invalid: true,
      message: 'Use m:ss (e.g. 1:30).',
    });
    // An empty/untouched field is non-submittable but shows no message.
    expect(anchorFieldState('', 240000)).toEqual({ ms: null, invalid: true, message: null });
  });

  it('flags an anchor past the track/class length (closing the generic-422 edge)', () => {
    expect(anchorFieldState('5:00', 240000)).toEqual({
      ms: null,
      invalid: true,
      message: 'Past the end (max 4:00).',
    });
    // Exactly at the end is allowed.
    expect(anchorFieldState('4:00', 240000).ms).toBe(240000);
  });

  it('skips the bound when no max is known', () => {
    expect(anchorFieldState('9:30', null).ms).toBe(570000);
    expect(anchorFieldState('99:00', null).invalid).toBe(false);
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
