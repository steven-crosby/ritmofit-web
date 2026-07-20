import { describe, it, expect } from 'vitest';
import {
  providerValues,
  providerCapabilities,
  supportsUserAccount,
  playbackRequiresConnection,
} from '@ritmofit/shared';
import {
  PROVIDER_LABELS,
  PROVIDER_ORDER,
  DEFAULT_PROVIDER,
  providerLabel,
  providerHandoffHref,
  providerPlaylistHref,
  providerConnectionState,
  ALL_PROVIDERS_LABELLED,
  spotifyScopeHasSavedPlaylists,
  connectionHasSavedPlaylistScope,
  providerCapabilityTruth,
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

  it('accepts only provider-owned playlist attribution targets', () => {
    expect(
      providerPlaylistHref('spotify', 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'),
    ).toBe('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    expect(providerPlaylistHref('soundcloud', 'https://soundcloud.com/coach/sets/warmup')).toBe(
      'https://soundcloud.com/coach/sets/warmup',
    );
    expect(providerPlaylistHref('spotify', 'https://example.com/playlist/abc')).toBeNull();
    expect(providerPlaylistHref('spotify', 'javascript:alert(1)')).toBeNull();
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

  it('requires a connection to play only the account-authorized providers', () => {
    // SoundCloud plays via the public Widget (no token); MusicKit / the Spotify
    // Web Playback SDK authorize the user, so those need a live connection.
    expect(playbackRequiresConnection('soundcloud')).toBe(false);
    expect(playbackRequiresConnection('apple_music')).toBe(true);
    expect(playbackRequiresConnection('spotify')).toBe(true);
    for (const p of providerValues) {
      expect(playbackRequiresConnection(p)).toBe(
        providerCapabilities[p].playbackRequiresConnection,
      );
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

describe('spotifyScopeHasSavedPlaylists', () => {
  it('is true only when the stored scope granted `playlist-read-private`', () => {
    expect(spotifyScopeHasSavedPlaylists('user-library-read playlist-read-private')).toBe(true);
    expect(spotifyScopeHasSavedPlaylists('playlist-read-private')).toBe(true);
  });

  it('is true for the dev mock seam scope', () => {
    expect(spotifyScopeHasSavedPlaylists('mock')).toBe(true);
  });

  it('is false for a pre-expansion (playback-only) connection', () => {
    expect(spotifyScopeHasSavedPlaylists('user-library-read streaming')).toBe(false);
  });

  it('is false for a missing scope and does not match a substring', () => {
    expect(spotifyScopeHasSavedPlaylists(null)).toBe(false);
    expect(spotifyScopeHasSavedPlaylists(undefined)).toBe(false);
    expect(spotifyScopeHasSavedPlaylists('')).toBe(false);
    expect(spotifyScopeHasSavedPlaylists('playlist-read-private-analytics')).toBe(false);
  });
});

describe('connectionHasSavedPlaylistScope', () => {
  it('is always true for non-Spotify providers (no scope gate)', () => {
    expect(connectionHasSavedPlaylistScope('soundcloud', undefined)).toBe(true);
    expect(connectionHasSavedPlaylistScope('apple_music', { scope: null })).toBe(true);
  });

  it('delegates to the Spotify scope detector', () => {
    expect(connectionHasSavedPlaylistScope('spotify', { scope: 'playlist-read-private' })).toBe(
      true,
    );
    expect(connectionHasSavedPlaylistScope('spotify', { scope: 'streaming' })).toBe(false);
    expect(connectionHasSavedPlaylistScope('spotify', undefined)).toBe(false);
  });
});

describe('providerCapabilityTruth', () => {
  const NOW = 1_000_000;

  it('keeps catalog available while account-backed capabilities require connection', () => {
    const truth = providerCapabilityTruth('spotify', undefined, NOW);
    expect(truth.catalog).toEqual({ state: 'ready', label: 'Browse catalog' });
    expect(truth.library).toEqual({ state: 'action-required', label: 'Connect account' });
    expect(truth.playback).toEqual({ state: 'action-required', label: 'Connect account' });
  });

  it('surfaces partial Spotify scope instead of calling every capability ready', () => {
    const truth = providerCapabilityTruth(
      'spotify',
      { expiresAt: null, scope: 'user-library-read streaming' },
      NOW,
    );
    expect(truth.library).toEqual({
      state: 'partial',
      label: 'Likes ready · reconnect playlists',
    });
    expect(truth.playback).toEqual({ state: 'ready', label: 'Authorized' });
  });

  it('marks last-known account capabilities unverified after status failure', () => {
    const truth = providerCapabilityTruth(
      'apple_music',
      { expiresAt: null, scope: null },
      NOW,
      'unverified',
    );
    expect(truth.catalog.state).toBe('ready');
    expect(truth.library).toEqual({ state: 'unverified', label: 'Last known linked' });
    expect(truth.playback).toEqual({
      state: 'unverified',
      label: 'Authorization unverified',
    });
  });

  it('keeps the initial account check distinct from unavailable status', () => {
    const truth = providerCapabilityTruth('spotify', undefined, NOW, 'checking');
    expect(truth.library).toEqual({ state: 'checking', label: 'Checking account' });
    expect(truth.playback).toEqual({
      state: 'checking',
      label: 'Checking authorization',
    });
  });

  it('keeps SoundCloud widget playback independent from account status', () => {
    const truth = providerCapabilityTruth('soundcloud', undefined, NOW, 'unverified');
    expect(truth.library).toEqual({ state: 'unverified', label: 'Status unavailable' });
    expect(truth.playback).toEqual({ state: 'ready', label: 'Public widget ready' });
  });
});
