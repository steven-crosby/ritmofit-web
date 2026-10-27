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

  it('aborts instead of sleeping past the preview deadline', async () => {
    const { fetchImpl, calls } = queuedFetch([503, 200]);
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    await expect(
      fetchWithRetry(fetchImpl, 'https://x/y', undefined, {
        sleep,
        now: () => 1_000,
        deadlineAt: 1_100,
        baseDelayMs: 200,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('does not start a request once the preview deadline has passed', async () => {
    const { fetchImpl, calls } = queuedFetch([200]);
    await expect(
      fetchWithRetry(fetchImpl, 'https://x/y', undefined, {
        now: () => 2_000,
        deadlineAt: 1_000,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toHaveLength(0);
  });

  it('does not fetch when the preview signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { fetchImpl, calls } = queuedFetch([200]);
    await expect(
      fetchWithRetry(fetchImpl, 'https://x/y', undefined, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toHaveLength(0);
  });

  it('does not fetch again when the preview signal aborts during backoff', async () => {
    const controller = new AbortController();
    let fetches = 0;
    const fetchImpl: FetchLike = async () => {
      fetches += 1;
      return {
        ok: false,
        status: 503,
        json: async () => ({}),
        text: async () => '',
        headers: { get: () => null },
      };
    };
    const sleep = vi.fn(async () => {
      controller.abort();
    });
    await expect(
      fetchWithRetry(fetchImpl, 'https://x/y', undefined, {
        sleep,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetches).toBe(1);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 429 QUOTA_EXCEEDED and keeps its body readable', async () => {
    const body = JSON.stringify({
      error: { status: 429, message: 'Too many requests', reason: 'QUOTA_EXCEEDED' },
    });
    let fetches = 0;
    const fetchImpl: FetchLike = async () => {
      fetches += 1;
      return {
        ok: false,
        status: 429,
        json: async () => JSON.parse(body) as unknown,
        text: async () => body,
        headers: { get: () => null },
      };
    };
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(429);
    expect(fetches).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(await res.text()).toBe(body);
    expect(await res.text()).toBe(body);
  });

  it('retries a plain 429 with exponential backoff', async () => {
    const { fetchImpl, calls } = queuedFetch([429, 429, 200]);
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([200, 400]);
  });

  it('fails fast instead of sleeping a long Retry-After with no deadline', async () => {
    let fetches = 0;
    const fetchImpl: FetchLike = async () => {
      fetches += 1;
      return {
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => '',
        headers: { get: (n: string) => (n.toLowerCase() === 'retry-after' ? '120' : null) },
      };
    };
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(429);
    expect(fetches).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('still waits a Retry-After within the cap', async () => {
    let fetches = 0;
    const fetchImpl: FetchLike = async () => {
      fetches += 1;
      const limited = fetches === 1;
      return {
        ok: !limited,
        status: limited ? 429 : 200,
        json: async () => ({}),
        text: async () => '',
        headers: {
          get: (n: string) => (limited && n.toLowerCase() === 'retry-after' ? '5' : null),
        },
      };
    };
    const sleep = vi.fn<(ms: number) => Promise<void>>();
    const res = await fetchWithRetry(fetchImpl, 'https://x/y', undefined, { sleep });
    expect(res.status).toBe(200);
    expect(sleep).toHaveBeenCalledWith(5000);
  });
});
