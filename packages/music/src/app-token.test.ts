import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppTokenCache } from './app-token.js';
import { ProviderError } from './errors.js';
import type { FetchLike } from './provider.js';

declare const btoa: (data: string) => string;

describe('AppTokenCache', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockNow = vi.fn(() => 1000000);
  });

  const createCache = () =>
    new AppTokenCache({
      provider: 'test-provider',
      clientId: 'id',
      clientSecret: 'secret',
      tokenUrl: 'https://test/token',
      fetchImpl: mockFetch as unknown as FetchLike,
      now: mockNow,
    });

  it('mints a new token on first get', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token1', expires_in: 3600 }),
    });

    const cache = createCache();
    const token = await cache.get();

    expect(token).toBe('token1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0] as unknown as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    const init = callArgs[1];
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Basic ${btoa('id:secret')}`);
    expect(init.body).toBe('grant_type=client_credentials');
  });

  it('returns cached token if within TTL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token1', expires_in: 3600 }),
    });

    const cache = createCache();
    await cache.get();

    // Advance time by 30 mins
    mockNow.mockReturnValue(1000000 + 30 * 60 * 1000);

    const token = await cache.get();
    expect(token).toBe('token1');
    expect(mockFetch).toHaveBeenCalledTimes(1); // No new fetch
  });

  it('remints token if early skew window is reached', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token1', expires_in: 3600 }), // Expires in 3600s
    });

    const cache = createCache();
    await cache.get();

    // Advance time to 10 seconds before expiry (skew is 30s)
    mockNow.mockReturnValue(1000000 + 3600 * 1000 - 10 * 1000);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token2', expires_in: 3600 }),
    });

    const token = await cache.get();
    expect(token).toBe('token2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('forces remint after invalidate()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token1', expires_in: 3600 }),
    });

    const cache = createCache();
    await cache.get();

    cache.invalidate();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token2', expires_in: 3600 }),
    });

    const token = await cache.get();
    expect(token).toBe('token2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws ProviderError on non-ok status', async () => {
    // Persistent (not `...Once`): failures are never cached, so each `get()`
    // re-fetches — both assertions below trigger a fresh request.
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const cache = createCache();
    await expect(cache.get()).rejects.toThrow(ProviderError);
    await expect(cache.get()).rejects.toThrow(/test-provider token request failed/);
  });
});
