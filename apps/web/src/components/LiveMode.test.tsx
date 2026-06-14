// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { LiveMode } from './LiveMode.js';

afterEach(cleanup);

const activeTrack = {
  classTrackId: '00000000-0000-4000-8000-000000000001',
  position: 0,
  displayBpm: 124,
  intensity: 'hard',
  startOffsetMs: 0,
  notes: null,
  track: {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Active Track',
    artist: 'Instructor',
    durationMs: 180000,
    albumArtUrl: null,
  },
  providerRefs: [
    {
      provider: 'spotify',
      providerTrackId: 'spotify-id',
      providerUri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    },
    {
      provider: 'apple_music',
      providerTrackId: 'apple-id',
      providerUri: 'https://music.apple.com/us/song/active-track/123',
    },
    {
      provider: 'soundcloud',
      providerTrackId: 'soundcloud-id',
      providerUri: 'javascript:alert(1)',
    },
  ],
  cues: [],
  moves: [],
} satisfies RunPayloadTrackEntry;

const payload = {
  schemaVersion: 1,
  class: {
    id: '00000000-0000-4000-8000-000000000003',
    title: 'Handoff Ride',
    template: 'cycle',
    targetDurationMs: null,
    totalDurationMs: 180000,
  },
  tracks: [activeTrack],
  sections: [],
} satisfies RunPayload;

describe('LiveMode provider handoff', () => {
  it('shows only trusted provider links for the active track in Cue-by-Cue', () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);

    const spotify = screen.getByRole('link', { name: 'Open Active Track in Spotify' });
    expect(spotify.getAttribute('href')).toBe('spotify:track:4cOdK2wGLETKBW3PvgPWqT');
    expect(spotify.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name: 'Open Active Track in Apple Music' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /SoundCloud/ })).toBeNull();
  });

  it('keeps the active-track handoff available in Full List', () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));

    expect(screen.getByRole('link', { name: 'Open Active Track in Spotify' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open Active Track in Apple Music' })).toBeTruthy();
  });

  it('renders no handoff control when the active track has no trusted URI', () => {
    const noHandoffPayload: RunPayload = {
      ...payload,
      tracks: [
        {
          ...activeTrack,
          providerRefs: [
            {
              provider: 'soundcloud',
              providerTrackId: 'soundcloud-id',
              providerUri: 'https://example.com/not-soundcloud',
            },
          ],
        },
      ],
    };
    render(<LiveMode payload={noHandoffPayload} onExit={() => {}} />);

    expect(screen.queryByRole('navigation', { name: /music provider/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Open / })).toBeNull();
  });
});
