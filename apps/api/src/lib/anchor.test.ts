import { describe, expect, it } from 'vitest';
import { anchorOutsideClipWindow } from './anchor.js';

describe('anchorOutsideClipWindow', () => {
  it('allows an anchor inside the window', () => {
    expect(anchorOutsideClipWindow(60_000, 30_000, 120_000)).toBeNull();
  });

  it('allows an anchor exactly at the clip start (inclusive lower bound)', () => {
    expect(anchorOutsideClipWindow(30_000, 30_000, 120_000)).toBeNull();
  });

  it('allows an anchor exactly at the clip end (inclusive upper bound)', () => {
    expect(anchorOutsideClipWindow(120_000, 30_000, 120_000)).toBeNull();
  });

  it('rejects an anchor before the clip start', () => {
    expect(anchorOutsideClipWindow(10_000, 30_000, 120_000)).toMatch(/before the clip start/);
  });

  it('rejects an anchor past the clip end', () => {
    expect(anchorOutsideClipWindow(150_000, 30_000, 120_000)).toMatch(/past the clip end/);
  });

  it('applies only the lower bound when the clip end is unknown (null)', () => {
    expect(anchorOutsideClipWindow(999_999, 30_000, null)).toBeNull();
    expect(anchorOutsideClipWindow(10_000, 30_000, null)).toMatch(/before the clip start/);
  });

  it('for an untrimmed track (start 0), only the end bounds', () => {
    expect(anchorOutsideClipWindow(0, 0, 180_000)).toBeNull();
    expect(anchorOutsideClipWindow(180_001, 0, 180_000)).toMatch(/past the clip end/);
  });
});
