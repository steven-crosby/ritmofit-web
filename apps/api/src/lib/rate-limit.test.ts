import { describe, it, expect } from 'vitest';
import { evaluateFixedWindow } from './rate-limit.js';

const WINDOW = 60_000;
const MAX = 3;

describe('evaluateFixedWindow', () => {
  it('allows and starts a fresh window when there is no record', () => {
    const d = evaluateFixedWindow(null, 1000, WINDOW, MAX);
    expect(d).toEqual({ allowed: true, count: 1, lastRequest: 1000, retryAfterMs: 0 });
  });

  it('increments within an active window without moving the window start', () => {
    const d = evaluateFixedWindow({ count: 1, lastRequest: 1000 }, 1500, WINDOW, MAX);
    expect(d).toEqual({ allowed: true, count: 2, lastRequest: 1000, retryAfterMs: 0 });
  });

  it('blocks once the max is reached and reports time until reset', () => {
    const d = evaluateFixedWindow({ count: 3, lastRequest: 1000 }, 21_000, WINDOW, MAX);
    expect(d.allowed).toBe(false);
    expect(d.count).toBe(3);
    expect(d.retryAfterMs).toBe(WINDOW - 20_000); // 40_000
  });

  it('resets to a new window once the old one has elapsed', () => {
    const d = evaluateFixedWindow({ count: 3, lastRequest: 1000 }, 1000 + WINDOW, WINDOW, MAX);
    expect(d).toEqual({ allowed: true, count: 1, lastRequest: 1000 + WINDOW, retryAfterMs: 0 });
  });

  it('treats the exact window boundary as a reset (>= window)', () => {
    const atBoundary = evaluateFixedWindow({ count: 3, lastRequest: 0 }, WINDOW, WINDOW, MAX);
    expect(atBoundary.allowed).toBe(true);
    const justBefore = evaluateFixedWindow({ count: 3, lastRequest: 0 }, WINDOW - 1, WINDOW, MAX);
    expect(justBefore.allowed).toBe(false);
  });
});
