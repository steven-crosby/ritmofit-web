import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SpotifyPlaybackTokenError } from './api.js';
import {
  getSpotifyPlayback,
  isRetryableSpotifyTokenError,
  lastSpotifyTokenFailureWasRetryable,
  resetSpotifyPlayback,
  type SpotifyNamespace,
  type SpotifyPlayerConstructorOptions,
} from './spotify-playback.js';

/** A fake SDK whose Player readies at once and exposes the token callback. */
function fakeSdk() {
  let options: SpotifyPlayerConstructorOptions | undefined;
  class Player {
    private readyCb: ((p: { device_id: string }) => void) | undefined;
    constructor(opts: SpotifyPlayerConstructorOptions) {
      options = opts;
    }
    addListener(event: string, cb: (p: { device_id: string }) => void) {
      if (event === 'ready') this.readyCb = cb;
    }
    removeListener() {}
    connect() {
      queueMicrotask(() => this.readyCb?.({ device_id: 'dev-1' }));
      return Promise.resolve(true);
    }
  }
  const sdk = { Player } as unknown as SpotifyNamespace;
  return {
    loadSdk: () => Promise.resolve(sdk),
    requestToken: async (): Promise<string[]> => {
      const tokens: string[] = [];
      options!.getOAuthToken((token) => tokens.push(token));
      return tokens;
    },
  };
}

const TOKEN = { accessToken: 'sp-access', expiresInMs: 3_600_000 };

describe('isRetryableSpotifyTokenError (RF-216)', () => {
  it.each<[unknown, boolean]>([
    [new SpotifyPlaybackTokenError('down', 'PROVIDER_UNAVAILABLE', 502), true],
    [new SpotifyPlaybackTokenError('busy', 'PROVIDER_QUOTA_EXCEEDED', 429), true],
    [new SpotifyPlaybackTokenError('unconfigured', 'PROVIDER_UNAVAILABLE', 503), true],
    [new SpotifyPlaybackTokenError('offline', 'NETWORK_ERROR', 0), true],
    [new ApiError('other route', 'PROVIDER_UNAVAILABLE', 502), false],
    [new TypeError('Cannot read properties of undefined'), false],
    [new SpotifyPlaybackTokenError('reconnect', 'REAUTH_REQUIRED', 409), false],
    [new SpotifyPlaybackTokenError('connect', 'NOT_CONNECTED', 409), false],
    [new SpotifyPlaybackTokenError('scope', 'PLAYBACK_REAUTH_REQUIRED', 409), false],
    [new Error('other'), false],
  ])('%s → %s', (err: unknown, retryable: boolean) => {
    expect(isRetryableSpotifyTokenError(err)).toBe(retryable);
  });
});

describe('SDK token callback (RF-216)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSpotifyPlayback();
  });
  afterEach(() => {
    vi.useRealTimers();
    resetSpotifyPlayback();
  });

  it('retries a temporary failure once and hands the SDK the token', async () => {
    const sdk = fakeSdk();
    const getToken = vi
      .fn()
      .mockRejectedValueOnce(new SpotifyPlaybackTokenError('down', 'PROVIDER_UNAVAILABLE', 502))
      .mockResolvedValueOnce(TOKEN);
    await getSpotifyPlayback({ loadSdk: sdk.loadSdk, getToken });

    const tokens = await sdk.requestToken();
    await vi.runAllTimersAsync();

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(tokens).toEqual(['sp-access']);
    expect(lastSpotifyTokenFailureWasRetryable()).toBe(false);
  });

  it('marks the failure retryable when the retry also fails', async () => {
    const sdk = fakeSdk();
    const getToken = vi
      .fn()
      .mockRejectedValue(new SpotifyPlaybackTokenError('down', 'PROVIDER_UNAVAILABLE', 502));
    await getSpotifyPlayback({ loadSdk: sdk.loadSdk, getToken });

    const tokens = await sdk.requestToken();
    await vi.runAllTimersAsync();

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(tokens).toEqual([]);
    expect(lastSpotifyTokenFailureWasRetryable()).toBe(true);
  });

  it('does not retry a dead grant, and it is not retryable', async () => {
    const sdk = fakeSdk();
    const getToken = vi
      .fn()
      .mockRejectedValue(new SpotifyPlaybackTokenError('reconnect', 'REAUTH_REQUIRED', 409));
    await getSpotifyPlayback({ loadSdk: sdk.loadSdk, getToken });

    await sdk.requestToken();
    await vi.runAllTimersAsync();

    expect(getToken).toHaveBeenCalledTimes(1);
    expect(lastSpotifyTokenFailureWasRetryable()).toBe(false);
  });
});
