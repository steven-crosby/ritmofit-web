import { afterEach, describe, expect, it, vi } from 'vitest';
import { raceTimer } from './race-timer.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('raceTimer', () => {
  it('settles with the work when it wins and clears the timer', async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn(() => 'late');
    await expect(raceTimer(Promise.resolve('work'), 1_000, onTimeout)).resolves.toBe('work');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles with onTimeout once the bound passes', async () => {
    vi.useFakeTimers();
    const raced = raceTimer(new Promise<string>(() => {}), 50, () => 'timed out');
    await vi.advanceTimersByTimeAsync(50);
    await expect(raced).resolves.toBe('timed out');
  });

  it('rejects when onTimeout throws, and passes a work rejection through', async () => {
    vi.useFakeTimers();
    const raced = raceTimer(new Promise<never>(() => {}), 10, () => {
      throw new Error('bound passed');
    });
    const failure = expect(raced).rejects.toThrow('bound passed');
    await vi.advanceTimersByTimeAsync(10);
    await failure;
    await expect(raceTimer(Promise.reject(new Error('sdk')), 10, () => 'x')).rejects.toThrow('sdk');
  });
});
