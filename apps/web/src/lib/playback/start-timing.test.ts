// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLAYBACK_TIMING_KEY, playbackTimingEnabled, startTimer } from './start-timing.js';

afterEach(() => {
  sessionStorage.removeItem(PLAYBACK_TIMING_KEY);
  localStorage.removeItem(PLAYBACK_TIMING_KEY);
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('debug-only Start timing (RF-128)', () => {
  it('is off by default and logs nothing', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(playbackTimingEnabled()).toBe(false);
    startTimer('[ritmo apple-music]').mark('prepare');
    expect(info).not.toHaveBeenCalled();
  });

  it('turns on from ?playback-timing=1, survives in-tab navigation, and logs step offsets', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    window.history.replaceState(null, '', '/?playback-timing=1');
    let clock = 1_000;
    const timer = startTimer('[ritmo apple-music]', () => clock);
    clock = 1_042.4;
    timer.mark('set-queue-call');
    clock = 1_310;
    timer.mark('set-queue-call');
    expect(info.mock.calls).toEqual([
      ['[ritmo apple-music] timing set-queue-call +42ms'],
      ['[ritmo apple-music] timing set-queue-call (again) +310ms'],
    ]);
    window.history.replaceState(null, '', '/');
    expect(playbackTimingEnabled()).toBe(true);
  });

  it('turns on from localStorage and stays off when storage throws', () => {
    localStorage.setItem(PLAYBACK_TIMING_KEY, '1');
    expect(playbackTimingEnabled()).toBe(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(playbackTimingEnabled()).toBe(false);
  });
});
