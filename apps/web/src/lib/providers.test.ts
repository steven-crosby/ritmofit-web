import { describe, it, expect } from 'vitest';
import { providerValues, providerCapabilities, supportsUserAccount } from '@ritmofit/shared';
import {
  PROVIDER_LABELS,
  PROVIDER_ORDER,
  DEFAULT_PROVIDER,
  providerLabel,
  providerHandoffHref,
  providerConnectionState,
  ALL_PROVIDERS_LABELLED,
} from './providers.js';

describe('provider presentation', () => {
  it('labels every shared provider value (no enum drift)', () => {
    expect(ALL_PROVIDERS_LABELLED).toBe(true);
    for (const p of providerValues) expect(providerLabel(p)).toBeTruthy();
  });

  it('orders SoundCloud first and includes every provider exactly once', () => {
    expect(PROVIDER_ORDER[0]).toBe('soundcloud');
    expect([...PROVIDER_ORDER].sort()).toEqual([...providerValues].sort());
  });

  it('defaults the search box to SoundCloud', () => {
    expect(DEFAULT_PROVIDER).toBe('soundcloud');
  });

  it('maps known labels', () => {
    expect(PROVIDER_LABELS.soundcloud).toBe('SoundCloud');
    expect(PROVIDER_LABELS.apple_music).toBe('Apple Music');
  });

  it('accepts provider-owned track handoff targets', () => {
    expect(providerHandoffHref('spotify', 'spotify:track:4cOdK2wGLETKBW3PvgPWqT')).toBe(
      'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    );
    expect(
      providerHandoffHref(
        'spotify',
        'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc',
      ),
    ).toBe('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc');
    expect(
      providerHandoffHref(
        'apple_music',
        'https://music.apple.com/us/album/bohemian-rhapsody/1440857781',
      ),
    ).toBe('https://music.apple.com/us/album/bohemian-rhapsody/1440857781');
    expect(providerHandoffHref('soundcloud', 'https://soundcloud.com/bakermat/baiana')).toBe(
      'https://soundcloud.com/bakermat/baiana',
    );
  });

  it('rejects missing, malformed, cross-provider, and unsafe handoff targets', () => {
    expect(providerHandoffHref('spotify', null)).toBeNull();
    expect(providerHandoffHref('spotify', 'spotify:playlist:not-a-track')).toBeNull();
    expect(providerHandoffHref('spotify', 'javascript:alert(1)')).toBeNull();
    expect(providerHandoffHref('spotify', 'https://example.com/track/abc')).toBeNull();
    expect(providerHandoffHref('apple_music', 'http://music.apple.com/us/song/1')).toBeNull();
    expect(
      providerHandoffHref('apple_music', 'https://music.apple.com.example.com/song/1'),
    ).toBeNull();
    expect(
      providerHandoffHref('soundcloud', 'https://evil.example/?next=soundcloud.com'),
    ).toBeNull();
  });
});

describe('provider capability matrix', () => {
  it('has an entry for every provider (no enum drift)', () => {
    for (const p of providerValues) expect(providerCapabilities[p]).toBeDefined();
  });

  it('offers catalog search for every provider', () => {
    for (const p of providerValues) expect(providerCapabilities[p].catalogSearch).toBe(true);
  });

  it('integrates per-user connect + likes for every provider', () => {
    for (const p of providerValues) {
      expect(providerCapabilities[p].userConnect).toBe(true);
      expect(providerCapabilities[p].userLikes).toBe(true);
    }
  });

  it('supportsUserAccount tracks the userConnect capability', () => {
    for (const p of providerValues) {
      expect(supportsUserAccount(p)).toBe(providerCapabilities[p].userConnect);
    }
  });
});

describe('providerConnectionState', () => {
  const NOW = 1_000_000;

  it('treats Apple Music as connect-capable (MusicKit), not catalog-only', () => {
    // All three real providers are connect-capable now (catalog-only is a defensive
    // default the matrix no longer triggers); Apple Music reports real link states.
    expect(providerConnectionState('apple_music', undefined, NOW)).toBe('disconnected');
    expect(providerConnectionState('apple_music', { expiresAt: null }, NOW)).toBe('connected');
    expect(providerConnectionState('apple_music', { expiresAt: NOW - 1 }, NOW)).toBe('expired');
  });

  it('reports disconnected when a connect-capable provider has no connection', () => {
    expect(providerConnectionState('soundcloud', undefined, NOW)).toBe('disconnected');
  });

  it('reports connected for a present connection with no/future expiry', () => {
    expect(providerConnectionState('soundcloud', { expiresAt: null }, NOW)).toBe('connected');
    expect(providerConnectionState('soundcloud', { expiresAt: NOW + 1 }, NOW)).toBe('connected');
  });

  it('reports expired once expiresAt has passed', () => {
    expect(providerConnectionState('soundcloud', { expiresAt: NOW }, NOW)).toBe('expired');
    expect(providerConnectionState('soundcloud', { expiresAt: NOW - 1 }, NOW)).toBe('expired');
  });
});
