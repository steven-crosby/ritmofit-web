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
  track: {
    id: '00000000-0000-4000-8000-000000000102',
    title: 'Legacy Grant',
    artist: 'The Scopes',
    durationMs: 180_000,
    albumArtUrl: null,
  },
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
