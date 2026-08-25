import { describe, it, expect } from 'vitest';
import { LivenessObserver, type LivenessSample, type LivenessVerdict } from './liveness.js';

/** A stepping clock, so sample timestamps are deterministic. */
function fakeClock(stepMs = 2_500) {
  let t = 0;
  return () => {
    const current = t;
    t += stepMs;
    return current;
  };
}

interface Logged {
  message: string;
  detail: Record<string, unknown>;
}

function makeObserver(options: { bufferSize?: number } = {}) {
  const logs: Logged[] = [];
  const observer = new LivenessObserver({
    now: fakeClock(),
    log: (message, detail) => logs.push({ message, detail }),
    ...options,
  });
  const record = (
    reading: Parameters<LivenessObserver['record']>[0]['reading'],
    hostTicks = 60,
    trackIndex = 0,
  ): LivenessSample => observer.record({ provider: 'soundcloud', trackIndex, reading, hostTicks });
  return { observer, logs, record };
}

/** Play a whole sequence of readings and return just the verdicts. */
function verdicts(
  readings: Parameters<LivenessObserver['record']>[0]['reading'][],
  hostTicks = 60,
): LivenessVerdict[] {
  const { record } = makeObserver();
  return readings.map((reading) => record(reading, hostTicks).verdict);
}

describe('LivenessObserver classification', () => {
  it('treats a moving playhead as advancing', () => {
    expect(
      verdicts([
        { positionMs: 1_000, playing: true },
        { positionMs: 3_500, playing: true },
        { positionMs: 6_000, playing: true },
      ]),
    ).toEqual(['advancing', 'advancing', 'advancing']);
  });

  it('reports a frozen playhead the provider still calls playing as not advancing', () => {
    expect(
      verdicts([
        { positionMs: 4_000, playing: true },
        { positionMs: 4_000, playing: true },
      ]),
    ).toEqual(['advancing', 'not_advancing']);
  });

  it('separates a provider that says it stopped from one that froze', () => {
    // The Spotify Connect handoff: paused at a real position, told to us by
    // nobody. Distinct from a stall, because the recovery differs.
    expect(
      verdicts([
        { positionMs: 40_000, playing: true },
        { positionMs: 45_000, playing: false },
      ]),
    ).toEqual(['advancing', 'provider_paused']);
  });

  it('records a provider that stops answering as unresponsive', () => {
    expect(verdicts([{ positionMs: 1_000, playing: true }, 'unresponsive'])).toEqual([
      'advancing',
      'unresponsive',
    ]);
  });

  it('exempts an adapter that cannot answer instead of calling it dead', () => {
    expect(verdicts([null, null])).toEqual(['exempt', 'exempt']);
  });

  it('never blames the provider when the host loop stalled too', () => {
    // A backgrounded tab freezes rAF and the provider alike. Non-advancement
    // here is evidence of nothing, and must not reach the miss counter.
    const { record } = makeObserver();
    record({ positionMs: 5_000, playing: true });
    const stalled = record({ positionMs: 5_000, playing: true }, 0);
    expect(stalled.verdict).toBe('host_stalled');
    expect(stalled.consecutiveMisses).toBe(0);
  });

  it('does not call the first sample of a track stalled for lack of a predecessor', () => {
    const { record } = makeObserver();
    expect(record({ positionMs: 0, playing: true }).verdict).toBe('advancing');
  });
});

describe('LivenessObserver miss counting', () => {
  it('counts consecutive misses and resets on any advance', () => {
    const { record } = makeObserver();
    record({ positionMs: 1_000, playing: true });
    expect(record({ positionMs: 1_000, playing: true }).consecutiveMisses).toBe(1);
    expect(record({ positionMs: 1_000, playing: true }).consecutiveMisses).toBe(2);
    // Buffering that recovers — the exact case a threshold must tolerate.
    expect(record({ positionMs: 2_000, playing: true }).consecutiveMisses).toBe(0);
  });

  it('keeps the peak after the counter resets, so tuning can still read it', () => {
    const { observer, record } = makeObserver();
    record({ positionMs: 1_000, playing: true }); // advancing — nothing to diff yet
    record({ positionMs: 1_000, playing: true }); // miss 1
    record({ positionMs: 1_000, playing: true }); // miss 2
    record({ positionMs: 1_000, playing: true }); // miss 3
    record({ positionMs: 9_000, playing: true }); // recovers, counter clears
    expect(observer.summary().peakConsecutiveMisses).toBe(3);
  });

  it('starts a new track from scratch rather than diffing across tracks', () => {
    // Position is provider-relative, so track 1 at 0ms after track 0 at 200s is
    // not a 200-second regression — it is a different clock.
    const { record } = makeObserver();
    record({ positionMs: 200_000, playing: true }, 60, 0);
    const firstOfNext = record({ positionMs: 0, playing: true }, 60, 1);
    expect(firstOfNext.verdict).toBe('advancing');
    expect(firstOfNext.positionDeltaMs).toBeNull();
    expect(firstOfNext.consecutiveMisses).toBe(0);
  });
});

describe('LivenessObserver recording', () => {
  it('logs only when the verdict changes, not once per sample', () => {
    const { logs, record } = makeObserver();
    record({ positionMs: 1_000, playing: true });
    record({ positionMs: 2_000, playing: true });
    record({ positionMs: 3_000, playing: true });
    expect(logs).toHaveLength(1);
    record({ positionMs: 3_000, playing: true });
    record({ positionMs: 3_000, playing: true });
    expect(logs).toHaveLength(2);
    expect(logs[1]!.message).toContain('advancing → not_advancing');
  });

  it('keeps every sample in the buffer even while the console stays quiet', () => {
    const { observer, record } = makeObserver();
    for (let i = 0; i < 5; i++) record({ positionMs: i * 1_000, playing: true });
    expect(observer.samples()).toHaveLength(5);
  });

  it('bounds the buffer and keeps the most recent samples', () => {
    const { observer, record } = makeObserver({ bufferSize: 3 });
    for (let i = 1; i <= 6; i++) record({ positionMs: i * 1_000, playing: true });
    const kept = observer.samples();
    expect(kept).toHaveLength(3);
    expect(kept.map((s) => s.positionMs)).toEqual([4_000, 5_000, 6_000]);
  });

  it('summarises what a class saw', () => {
    const { observer, record } = makeObserver();
    record({ positionMs: 1_000, playing: true });
    record({ positionMs: 1_000, playing: true });
    record('unresponsive');
    const summary = observer.summary();
    expect(summary.samples).toBe(3);
    expect(summary.byVerdict.advancing).toBe(1);
    expect(summary.byVerdict.not_advancing).toBe(1);
    expect(summary.byVerdict.unresponsive).toBe(1);
  });

  it('records the delta the tuning question is actually about', () => {
    const { record } = makeObserver();
    record({ positionMs: 1_000, playing: true });
    expect(record({ positionMs: 3_400, playing: true }).positionDeltaMs).toBe(2_400);
  });
});
