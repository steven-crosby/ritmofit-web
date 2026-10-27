import { describe, expect, it } from 'vitest';
import { pwaOptions } from '../../vite.config.js';

const denied = (path: string) =>
  pwaOptions.workbox.navigateFallbackDenylist.some((pattern) => pattern.test(path));

describe('PWA service-worker config', () => {
  it('waits for the instructor instead of taking over open tabs', () => {
    expect(pwaOptions.registerType).toBe('prompt');
    const workbox: Record<string, unknown> = pwaOptions.workbox;
    expect(workbox.skipWaiting).toBeUndefined();
    expect(workbox.clientsClaim).toBeUndefined();
  });

  it('keeps API navigations off the cached app shell', () => {
    expect(denied('/api/v1/providers/spotify/callback')).toBe(true);
    expect(denied('/api/auth/callback/google')).toBe(true);
    expect(denied('/classes/abc')).toBe(false);
    expect(denied('/')).toBe(false);
  });
});
