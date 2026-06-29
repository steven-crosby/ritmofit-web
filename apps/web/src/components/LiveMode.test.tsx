// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  LiveMode,
  lastAtOrBefore,
  liveSectionAt,
  trackIndexAt,
  type TimelineEvent,
} from './LiveMode.js';

afterEach(cleanup);

const activeTrack = {
  classTrackId: '00000000-0000-4000-8000-000000000001',
  position: 0,
  displayBpm: 124,
  displayRpm: null,
  holdCount: null,
  intensity: 'hard',
  startOffsetMs: 0,
  clipStartMs: 0,
  beatAnchorMs: 0,
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
    timelineMode: 'sequential',
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

function trackAt(startOffsetMs: number): RunPayloadTrackEntry {
  return { ...activeTrack, startOffsetMs };
}

describe('LiveMode track notes', () => {
  const notedPayload = {
    ...payload,
    tracks: [{ ...activeTrack, notes: 'Watch the new rider in row 2' }],
  } satisfies RunPayload;

  it('surfaces the active track notes in Cue-by-Cue without making them the focal cue', () => {
    render(<LiveMode payload={notedPayload} onExit={() => {}} />);

    expect(screen.getByText('Watch the new rider in row 2')).toBeTruthy();
    // The notes are a subordinate block, not the focal cue: the "Now" card and its
    // "Notes" label both render, distinctly.
    expect(screen.getByText('Now')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
  });

  it('shows the notes in Full List too', () => {
    render(<LiveMode payload={notedPayload} onExit={() => {}} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));

    expect(screen.getByText('Watch the new rider in row 2')).toBeTruthy();
  });

  it('renders no notes block when the track has none', () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);

    expect(screen.queryByText(/Notes/)).toBeNull();
  });
});

describe('LiveMode screen-reader announcements', () => {
  it('announces the live track when no cue is active', () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);
    expect(screen.getByText('Track 1: Active Track.')).toBeTruthy();
  });

  it('announces the current cue once one is reached', () => {
    const withCue: RunPayload = {
      ...payload,
      tracks: [
        {
          ...activeTrack,
          cues: [
            {
              id: '00000000-0000-4000-8000-0000000000aa',
              anchorMs: 0,
              beat: null,
              bar: null,
              text: 'Stand and sprint',
              color: null,
            },
          ],
        },
      ],
    };
    render(<LiveMode payload={withCue} onExit={() => {}} />);
    expect(screen.getByText('Cue: Stand and sprint.')).toBeTruthy();
  });
});

describe('LiveMode timeline scrubber', () => {
  it('seeks the virtual clock from the timeline (keyboard)', () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);
    // The transport scrubber replaces the old plain range input.
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    // Clock starts at 0:00 / 3:00; a right-arrow nudges +5s.
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('0:05 / 3:00')).toBeTruthy();
    expect(slider.getAttribute('aria-valuenow')).toBe('5000');
  });
});

describe('trackIndexAt', () => {
  const threeTracks = {
    ...payload,
    tracks: [trackAt(0), trackAt(60000), trackAt(120000)],
  } satisfies RunPayload;

  it('returns -1 for an empty class', () => {
    expect(trackIndexAt({ ...payload, tracks: [] }, 0)).toBe(-1);
  });

  it('selects the last track whose start offset has been reached', () => {
    expect(trackIndexAt(threeTracks, 0)).toBe(0);
    expect(trackIndexAt(threeTracks, 59999)).toBe(0);
    expect(trackIndexAt(threeTracks, 60000)).toBe(1);
    expect(trackIndexAt(threeTracks, 130000)).toBe(2);
  });

  it('clamps to the first track before its start offset', () => {
    const delayed = { ...payload, tracks: [trackAt(5000), trackAt(60000)] } satisfies RunPayload;
    expect(trackIndexAt(delayed, 0)).toBe(0);
  });
});

describe('liveSectionAt', () => {
  const sections = [
    { type: 'warm_up', startOffsetMs: 0 },
    { type: 'sprint', startOffsetMs: 60000 },
    { type: 'cool_down', startOffsetMs: 150000 },
  ] satisfies RunPayload['sections'];

  it('returns null when the class has no sections', () => {
    expect(liveSectionAt([], 0)).toBeNull();
  });

  it('returns null before the first section starts', () => {
    const delayed = [{ type: 'sprint', startOffsetMs: 5000 }] satisfies RunPayload['sections'];
    expect(liveSectionAt(delayed, 0)).toBeNull();
  });

  it('selects the last section whose start has been reached, with the next ahead', () => {
    expect(liveSectionAt(sections, 0)).toEqual({
      type: 'warm_up',
      next: { type: 'sprint', inMs: 60000 },
    });
    expect(liveSectionAt(sections, 59999)).toEqual({
      type: 'warm_up',
      next: { type: 'sprint', inMs: 1 },
    });
    expect(liveSectionAt(sections, 60000)).toEqual({
      type: 'sprint',
      next: { type: 'cool_down', inMs: 90000 },
    });
  });

  it('leaves no next section once the final band is active', () => {
    expect(liveSectionAt(sections, 150000)).toEqual({ type: 'cool_down', next: null });
  });

  it('resolves correctly even when sections arrive unsorted', () => {
    const unsorted = [
      { type: 'sprint', startOffsetMs: 60000 },
      { type: 'warm_up', startOffsetMs: 0 },
    ] satisfies RunPayload['sections'];
    expect(liveSectionAt(unsorted, 30000)).toEqual({
      type: 'warm_up',
      next: { type: 'sprint', inMs: 30000 },
    });
  });
});

describe('LiveMode section indicator', () => {
  const sectionedPayload = {
    ...payload,
    sections: [
      { type: 'warm_up', startOffsetMs: 0 },
      { type: 'sprint', startOffsetMs: 60000 },
    ],
  } satisfies RunPayload;

  it('shows the current section and a countdown to the next, in both views', () => {
    render(<LiveMode payload={sectionedPayload} onExit={() => {}} />);

    // The accessible content is real text in reading order (sr-only framing + the
    // visible label/countdown), so AT gets the current section AND what's next.
    expect(screen.getByText('Current section:')).toBeTruthy();
    expect(screen.getByText('Warm-up')).toBeTruthy();
    expect(screen.getByText(/Sprint in 1:00/)).toBeTruthy();

    // View-independent: it persists in Full List.
    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));
    expect(screen.getByText('Current section:')).toBeTruthy();
    expect(screen.getByText('Warm-up')).toBeTruthy();
  });

  it('renders no section indicator when the class has no sections', () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);
    expect(screen.queryByText('Current section:')).toBeNull();
  });
});

describe('lastAtOrBefore', () => {
  const ev = (atMs: number): TimelineEvent => ({
    atMs,
    kind: 'cue',
    text: `@${atMs}`,
    color: null,
    intensity: null,
  });
  // Includes a tie at 1000 to confirm the last-of-equals behavior current/next rely on.
  const events = [ev(1000), ev(1000), ev(2000), ev(5000)];

  it('returns -1 before the first event', () => {
    expect(lastAtOrBefore(events, 999)).toBe(-1);
  });

  it('returns the last index of an equal run on a tie', () => {
    expect(lastAtOrBefore(events, 1000)).toBe(1);
  });

  it('returns the last event at or before the time between events', () => {
    expect(lastAtOrBefore(events, 1500)).toBe(1);
    expect(lastAtOrBefore(events, 2000)).toBe(2);
  });

  it('returns the final index past the last event, leaving no next', () => {
    const i = lastAtOrBefore(events, 10000);
    expect(i).toBe(3);
    expect(i + 1 < events.length).toBe(false);
  });

  it('handles an empty event list', () => {
    expect(lastAtOrBefore([], 0)).toBe(-1);
  });
});
