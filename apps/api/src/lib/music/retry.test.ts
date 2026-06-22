import { describe, it, expect, vi } from 'vitest';
import {
  fetchWithRetry,
  isTransientStatus,
  parseRetryAfterMs,
  type FetchLike,
} from '@ritmofit/music';

/** A fetch fake that replays a queue of statuses and records each call + sleep. */
function queuedFetch(statuses: number[]) {
  const calls: string[] = [];
  let i = 0;
  const fetchImpl: FetchLike = async (url) => {
    calls.push(url);
    const status = statuses[Math.min(i, statuses.length - 1)] ?? 500;
    i += 1;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({}),
      text: async () => '',
    };
  };
  return { fetchImpl, calls };
}

describe('isTransientStatus', () => {
  it('treats 429 and 5xx as transient, others not', () => {
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(500)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(200)).toBe(false);
    expect(isTransientStatus(401)).toBe(false);
    expect(isTransientStatus(404)).toBe(false);
  });
});

describe('parseRetryAfterMs', () => {
  it('parses delta-seconds', () => {
    expect(parseRetryAfterMs('2')).toBe(2000);
    expect(parseRetryAfterMs('0')).toBe(0);
  });

  it('parses an HTTP date relative to now', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfterMs('Thu, 01 Jan 2026 00:00:05 GMT', now)).toBe(5000);
  });

  it('returns null for absent/garbage and never negative', () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs('')).toBeNull();
    expect(parseRetryAfterMs('nonsense')).toBeNull();
    const now = Date.parse('2026-01-01T00:00:10Z');
    expect(parseRetryAfterMs('Thu, 01 Jan 2026 00:00:05 GMT', now)).toBe(0);
  });
});

describe('fetchWithRetry', () => {
  it('returns immediately on a 2xx without sleeping', async () => {
    const { fetchImpl, calls } = queuedFetch([200]);
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a transient 503 then succeeds', async () => {
    const { fetchImpl, calls } = queuedFetch([503, 503, 200]);
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(3);
    // Exponential backoff: 200ms then 400ms.
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([200, 400]);
  });

  it('gives up after maxRetries and returns the last transient response', async () => {
    const { fetchImpl, calls } = queuedFetch([429, 429, 429, 429]);
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { maxRetries: 2, sleep });
    expect(res.status).toBe(429);
    expect(calls).toHaveLength(3); // 1 + 2 retries
  });

  it('does not retry a non-transient status (e.g. 401)', async () => {
    const { fetchImpl, calls } = queuedFetch([401, 200]);
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('honors a Retry-After header over the exponential backoff', async () => {
    const calls: string[] = [];
    let first = true;
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      const retryAfter = first ? '1' : null;
      first = false;
      return {
        ok: retryAfter == null,
        status: retryAfter == null ? 200 : 503,
        json: async () => ({}),
        text: async () => '',
        headers: { get: (n: string) => (n.toLowerCase() === 'retry-after' ? retryAfter : null) },
      };
    };
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(200);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
