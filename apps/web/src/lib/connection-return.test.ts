// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeConnectionReturn, rememberConnectionReturn } from './connection-return.js';
afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});
describe('provider return context', () => {
  it('restores the originating workspace once for the same user/provider', () => {
    rememberConnectionReturn({ userId: 'me', provider: 'spotify', destination: 'music' });
    expect(consumeConnectionReturn('me', 'spotify')?.destination).toBe('music');
    expect(consumeConnectionReturn('me', 'spotify')).toBeNull();
  });
  it('rejects another account, mismatched provider, and expired context', () => {
    rememberConnectionReturn({ userId: 'me', provider: 'spotify', destination: 'music' });
    expect(consumeConnectionReturn('someone-else')).toBeNull();
    rememberConnectionReturn({ userId: 'me', provider: 'spotify', destination: 'music' });
    expect(consumeConnectionReturn('me', 'soundcloud')).toBeNull();
    vi.useFakeTimers();
    rememberConnectionReturn({ userId: 'me', provider: 'spotify', destination: 'music' });
    vi.advanceTimersByTime(16 * 60_000);
    expect(consumeConnectionReturn('me')).toBeNull();
  });
  it('does not accept an arbitrary redirect destination', () => {
    sessionStorage.setItem(
      'rf-provider-return',
      JSON.stringify({
        userId: 'me',
        provider: 'spotify',
        destination: 'https://example.org',
        createdAt: Date.now(),
      }),
    );
    expect(consumeConnectionReturn('me')).toBeNull();
  });
});
