// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PLAYBACK_TIMING_KEY,
  initPlaybackTiming,
  playbackTimingEnabled,
  resetPlaybackTimingForTests,
  startTimer,
} from './start-timing.js';

beforeEach(() => {
  resetPlaybackTimingForTests();
});

afterEach(() => {
  sessionStorage.removeItem(PLAYBACK_TIMING_KEY);
  localStorage.removeItem(PLAYBACK_TIMING_KEY);
  window.history.replaceState(null, '', '/');
  resetPlaybackTimingForTests();
  vi.restoreAllMocks();
});

describe('debug-only playback timing (RF-128)', () => {
  it('is off by default and logs nothing', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(playbackTimingEnabled()).toBe(false);
    startTimer('[ritmo apple-music]').mark('prepare');
    expect(info).not.toHaveBeenCalled();
  });

  it('turns on from ?playback-timing=1 for the tab, read once at boot, and logs step offsets', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    window.history.replaceState(null, '', '/?playback-timing=1');
    expect(initPlaybackTiming()).toBe(true);
    expect(sessionStorage.getItem(PLAYBACK_TIMING_KEY)).toBe('1');
    // The cached value holds after navigation drops the query.
    window.history.replaceState(null, '', '/');
    expect(playbackTimingEnabled()).toBe(true);

    let clock = 1_000;
    const timer = startTimer('[ritmo apple-music #1]', () => clock);
    clock = 1_042.4;
    timer.mark('set-queue-start');
    clock = 1_310;
    timer.mark('set-queue-start', 'detail');
    expect(info.mock.calls).toEqual([
      ['[ritmo apple-music #1] timing set-queue-start +42ms'],
      ['[ritmo apple-music #1] timing set-queue-start (again) +310ms detail'],
    ]);
  });

  it('reads storage only once; later checks use the cached value', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    initPlaybackTiming();
    const reads = getItem.mock.calls.length;
    playbackTimingEnabled();
    startTimer('[x]');
    expect(getItem.mock.calls.length).toBe(reads);
  });

  it('turns on from the localStorage opt-in', () => {
    localStorage.setItem(PLAYBACK_TIMING_KEY, '1');
    expect(initPlaybackTiming()).toBe(true);
  });

  it('turns off from ?playback-timing=0 and clears both opt-ins', () => {
    sessionStorage.setItem(PLAYBACK_TIMING_KEY, '1');
    localStorage.setItem(PLAYBACK_TIMING_KEY, '1');
    window.history.replaceState(null, '', '/?playback-timing=0');
    expect(initPlaybackTiming()).toBe(false);
    expect(sessionStorage.getItem(PLAYBACK_TIMING_KEY)).toBeNull();
    expect(localStorage.getItem(PLAYBACK_TIMING_KEY)).toBeNull();
  });

  it('stays off when storage is blocked', () => {
    window.history.replaceState(null, '', '/?playback-timing=1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(initPlaybackTiming()).toBe(false);
  });
});
