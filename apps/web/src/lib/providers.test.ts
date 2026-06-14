import { describe, it, expect } from 'vitest';
import { providerValues, providerCapabilities, supportsUserAccount } from '@ritmofit/shared';
import {
  PROVIDER_LABELS,
  PROVIDER_ORDER,
  DEFAULT_PROVIDER,
  providerLabel,
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
});

describe('provider capability matrix', () => {
  it('has an entry for every provider (no enum drift)', () => {
    for (const p of providerValues) expect(providerCapabilities[p]).toBeDefined();
  });

  it('offers catalog search for every provider', () => {
    for (const p of providerValues) expect(providerCapabilities[p].catalogSearch).toBe(true);
  });

  it('integrates per-user connect + likes for SoundCloud only', () => {
    expect(providerCapabilities.soundcloud.userConnect).toBe(true);
    expect(providerCapabilities.soundcloud.userLikes).toBe(true);
    for (const p of ['spotify', 'apple_music'] as const) {
      expect(providerCapabilities[p].userConnect).toBe(false);
      expect(providerCapabilities[p].userLikes).toBe(false);
    }
  });

  it('supportsUserAccount tracks the userConnect capability', () => {
    for (const p of providerValues) {
      expect(supportsUserAccount(p)).toBe(providerCapabilities[p].userConnect);
    }
  });
});
