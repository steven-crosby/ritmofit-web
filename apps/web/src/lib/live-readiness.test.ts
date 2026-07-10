import { describe, expect, it } from 'vitest';
import type { ClassReadiness, ReadinessDimension, ReadinessLevel } from './readiness.js';
import { summarizeQueue } from './live-readiness.js';

/** Build a ClassReadiness with just the fields summarizeQueue reads. */
function readiness(opts: {
  runnable: boolean;
  fullyReady?: boolean;
  music?: ReadinessLevel;
}): ClassReadiness {
  const music: ReadinessDimension = {
    key: 'music',
    level: opts.music ?? 'ready',
    label: '',
    detail: '',
    tracks: [],
  };
  return {
    dimensions: [music],
    runnable: opts.runnable,
    fullyReady: opts.fullyReady ?? opts.runnable,
    attentionCount: 0,
  } as ClassReadiness;
}

describe('summarizeQueue', () => {
  it('returns all-zero counts for an empty queue', () => {
    expect(summarizeQueue([])).toEqual({
      runnable: 0,
      blocked: 0,
      needsAttention: 0,
      musicIncomplete: 0,
      total: 0,
    });
  });

  it('counts runnable vs blocked classes on the duration gate', () => {
    const summary = summarizeQueue([
      readiness({ runnable: true, fullyReady: true }),
      readiness({ runnable: false }),
      readiness({ runnable: false }),
    ]);
    expect(summary.runnable).toBe(1);
    expect(summary.blocked).toBe(2);
    expect(summary.total).toBe(3);
  });

  it('flags a runnable-but-imperfect class as needing attention, but not a blocked one', () => {
    const summary = summarizeQueue([
      readiness({ runnable: true, fullyReady: false }),
      readiness({ runnable: true, fullyReady: true }),
      readiness({ runnable: false, fullyReady: false }),
    ]);
    // Only the runnable-but-imperfect class counts — a blocked class's headline
    // problem is its duration, not the softer attention gaps.
    expect(summary.needsAttention).toBe(1);
  });

  it('counts every class with a non-ready music dimension as music-incomplete', () => {
    const summary = summarizeQueue([
      readiness({ runnable: true, music: 'ready' }),
      readiness({ runnable: true, music: 'attention' }),
      readiness({ runnable: false, music: 'attention' }),
    ]);
    expect(summary.musicIncomplete).toBe(2);
  });
});
