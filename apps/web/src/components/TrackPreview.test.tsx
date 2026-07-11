// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MusicConnectionView, RunPayloadTrackEntry } from '@ritmofit/shared';
import { TrackPreview } from './TrackPreview.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');
vi.mock('../lib/playback/registry.js', () => ({
  PLAYBACK_ADAPTERS: { spotify: () => ({}) },
  PLAYBACK_ADAPTER_PROVIDERS: ['spotify'],
}));

function spotifyConnection(scope: string): MusicConnectionView {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    userId: 'user-1',
    provider: 'spotify',
    providerUserId: 'spotify-user',
    scope,
    expiresAt: Date.now() + 3_600_000,
    createdAt: 1,
    updatedAt: 1,
  };
}

const baseTrack = {
  id: '00000000-0000-4000-8000-000000000102',
  title: 'Legacy Grant',
  artist: 'The Scopes',
  durationMs: 180_000,
  albumArtUrl: null,
};

const spotifyEntry: RunPayloadTrackEntry = {
  classTrackId: '00000000-0000-4000-8000-000000000101',
  position: 0,
  displayBpm: null,
  displayRpm: null,
  holdCount: null,
  intensity: 'mod',
  startOffsetMs: 0,
  clipStartMs: 0,
  beatAnchorMs: 0,
  notes: null,
  track: baseTrack,
  providerRefs: [
    {
      provider: 'spotify',
      providerTrackId: 'spotify-id',
      providerUri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    },
  ],
  cues: [],
  moves: [],
};

/** Manual-add / no-link track — selectProvider returns no_provider_ref. */
const noRefEntry: RunPayloadTrackEntry = {
  ...spotifyEntry,
  track: { ...baseTrack, title: 'Manual Climb', artist: 'Studio Notes' },
  providerRefs: [],
};

/** Spotify-only ref with no other playable adapter — provider_not_playable when
 * Spotify is the only registered adapter… wait: if Spotify is registered and
 * connected, it's playable. For provider_not_playable we need a ref whose
 * provider is NOT in PLAYBACK_ADAPTER_PROVIDERS. */
const unplayableProviderEntry: RunPayloadTrackEntry = {
  ...spotifyEntry,
  track: { ...baseTrack, title: 'Apple Only', artist: 'Catalog' },
  providerRefs: [
    {
      provider: 'apple_music',
      providerTrackId: 'apple-id',
      providerUri: null,
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TrackPreview Spotify reconnect', () => {
  it('offers a playback reconnect when Spotify is connected with the old library-only scope', async () => {
    vi.mocked(api.listConnections)
      .mockResolvedValueOnce([spotifyConnection('user-library-read')])
      .mockResolvedValueOnce([spotifyConnection('user-library-read streaming')]);
    vi.mocked(api.connectProvider).mockResolvedValue({ authorizeUrl: null, connected: true });

    render(<TrackPreview entry={spotifyEntry} />);

    expect(await screen.findByText(/Spotify is connected for library access/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Reconnect Spotify for playback/i }));

    await waitFor(() => expect(api.connectProvider).toHaveBeenCalledWith('spotify'));
    expect(await screen.findByRole('button', { name: 'Preview on Spotify' })).toBeTruthy();
  });
});

describe('TrackPreview no_provider_ref resolve', () => {
  it('offers a Find CTA with no-link lead-in (not the provider_not_playable copy)', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      spotifyConnection('user-library-read streaming'),
    ]);

    render(<TrackPreview entry={noRefEntry} />);

    expect(await screen.findByText(/No provider link yet/i)).toBeTruthy();
    expect(screen.queryByText(/Not on a provider Ritmo can play yet/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Find on Spotify/i })).toBeTruthy();
  });

  it('flips to playable preview controls after a strong resolve match', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      spotifyConnection('user-library-read streaming'),
    ]);
    vi.mocked(api.resolveTrackProvider).mockResolvedValue({
      resolved: true,
      provider: 'spotify',
      track: {
        ...baseTrack,
        title: 'Manual Climb',
        artist: 'Studio Notes',
        createdAt: 1,
        updatedAt: 1,
        displayBpm: null,
        providerIds: [
          {
            id: '00000000-0000-4000-8000-000000000201',
            trackId: baseTrack.id,
            provider: 'spotify',
            providerTrackId: 'resolved-spotify-id',
            providerUri: 'spotify:track:resolved',
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      },
    });

    render(<TrackPreview entry={noRefEntry} />);

    fireEvent.click(await screen.findByRole('button', { name: /Find on Spotify/i }));

    await waitFor(() =>
      expect(api.resolveTrackProvider).toHaveBeenCalledWith(noRefEntry.track.id, ['spotify']),
    );
    expect(await screen.findByRole('button', { name: 'Preview on Spotify' })).toBeTruthy();
    // Resolve CTA gone once the overlay makes the track playable.
    expect(screen.queryByRole('button', { name: /Find on Spotify/i })).toBeNull();
    expect(screen.queryByText(/No provider link yet/i)).toBeNull();
  });

  it('surfaces a resolve error without dead-ending the retry', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([
      spotifyConnection('user-library-read streaming'),
    ]);
    vi.mocked(api.resolveTrackProvider).mockRejectedValue(new Error('catalog unreachable'));

    render(<TrackPreview entry={noRefEntry} />);

    fireEvent.click(await screen.findByRole('button', { name: /Find on Spotify/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('catalog unreachable');
    // CTA remains so the instructor can try again.
    expect(screen.getByRole('button', { name: /Find on Spotify/i })).toBeTruthy();
    expect(screen.getByText(/No provider link yet/i)).toBeTruthy();
  });
});

describe('TrackPreview provider_not_playable resolve (unchanged lead-in)', () => {
  it('keeps the not-playable lead-in and Find CTA for non-adapter refs', async () => {
    // No live Spotify connection needed — apple_music is not in the mocked
    // PLAYBACK_ADAPTER_PROVIDERS, so selection is provider_not_playable.
    vi.mocked(api.listConnections).mockResolvedValue([]);

    render(<TrackPreview entry={unplayableProviderEntry} />);

    expect(await screen.findByText(/Not on a provider Ritmo can play yet/i)).toBeTruthy();
    expect(screen.queryByText(/No provider link yet/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Find on Spotify/i })).toBeTruthy();
  });
});
