// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { MusicConnectionView, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { listConnections } from '../lib/api.js';
import { soundcloudAdapterFactory } from '../lib/playback/soundcloud-adapter.js';
import type { PlaybackAdapter } from '../lib/playback/types.js';
import {
  LiveMode,
  lastAtOrBefore,
  liveSectionAt,
  trackIndexAt,
  type TimelineEvent,
} from './LiveMode.js';

vi.mock('../lib/api.js', () => ({
  listConnections: vi.fn(),
}));
vi.mock('../lib/playback/soundcloud-adapter.js', () => ({
  soundcloudAdapterFactory: vi.fn(),
}));

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

const soundcloudConnection: MusicConnectionView = {
  id: '00000000-0000-4000-8000-00000000000c',
  userId: 'user-1',
  provider: 'soundcloud',
  providerUserId: null,
  scope: null,
  expiresAt: null,
  createdAt: 1,
  updatedAt: 1,
};

/** A playback adapter whose prepare resolves immediately (widget stubbed out). */
function workingAdapter(): PlaybackAdapter {
  return {
    provider: 'soundcloud',
    prepare: (entry) =>
      Promise.resolve({ provider: 'soundcloud' as const, classTrackId: entry.classTrackId }),
    play: () => Promise.resolve(),
    pause: () => Promise.resolve(),
    seek: () => Promise.resolve(),
    stop: () => Promise.resolve(),
    destroy: () => {},
  };
}

beforeEach(() => {
  vi.mocked(listConnections).mockReset().mockResolvedValue([]);
  vi.mocked(soundcloudAdapterFactory)
    .mockReset()
    .mockImplementation(() => workingAdapter());
});

/**
 * Render Live Mode and pass the preflight gate into the prompter without
 * music — the path every pre-playback behavior lives behind now.
 */
async function renderLive(p: RunPayload = payload) {
  render(<LiveMode payload={p} onExit={() => {}} />);
  if (p.tracks.length > 0) {
    // Wait for connections to land so the async state update stays inside RTL.
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Run without music' }));
  }
}

describe('LiveMode preflight', () => {
  it('lists per-track verdicts and blocks hands-free start when a track cannot play', async () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);
    const list = await screen.findByRole('list', { name: 'Track playback check' });
    expect(within(list).getByText('Active Track')).toBeTruthy();
    // No connections → the soundcloud ref has no connected playable provider.
    expect(within(list).getByText('No connected provider can play this')).toBeTruthy();
    expect(screen.getByText('1 track can’t play yet.')).toBeTruthy();
    const start = screen.getByRole('button', { name: 'Start class' });
    expect((start as HTMLButtonElement).disabled).toBe(true);
    // The prompter path stays available.
    expect(screen.getByRole('button', { name: 'Run without music' })).toBeTruthy();
  });

  it('passes preflight with a connected provider and starts hands-free playback', async () => {
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    render(<LiveMode payload={payload} onExit={() => {}} />);
    const list = await screen.findByRole('list', { name: 'Track playback check' });
    expect(within(list).getByText('Plays on SoundCloud')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    // Start = begin the class: the clock runs (Pause offered) and the player
    // rail names the provider once playback is live.
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(await screen.findByText('SoundCloud')).toBeTruthy();
  });

  it('skips the preflight screen entirely for an empty class', () => {
    const empty = { ...payload, tracks: [] } satisfies RunPayload;
    render(<LiveMode payload={empty} onExit={() => {}} />);
    expect(screen.getByText('This class has no tracks yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start class' })).toBeNull();
  });

  it('states prompter-only mode explicitly in the player rail', async () => {
    await renderLive();
    expect(screen.getByText('Music off')).toBeTruthy();
  });

  it('surfaces a connections failure with a retry, keeping the prompter available', async () => {
    vi.mocked(listConnections)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([soundcloudConnection]);
    render(<LiveMode payload={payload} onExit={() => {}} />);
    expect(
      await screen.findByText(/Could not check your provider connections: network down/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run without music' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const list = await screen.findByRole('list', { name: 'Track playback check' });
    expect(within(list).getByText('Plays on SoundCloud')).toBeTruthy();
  });
});

describe('LiveMode playback failure', () => {
  it('halts into a recoverable alert with retry, handoff, and prompter-only options', async () => {
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    vi.mocked(soundcloudAdapterFactory).mockImplementation(
      (): PlaybackAdapter => ({
        ...workingAdapter(),
        prepare: () => Promise.reject(new Error('widget failed')),
      }),
    );
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Playback stopped: widget failed/)).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeTruthy();

    // Handoff links live ONLY here (recovery surface), and only trusted URIs:
    // the track's soundcloud ref is a javascript: URI and must not render.
    const spotify = within(alert).getByRole('link', { name: 'Open Active Track in Spotify' });
    expect(spotify.getAttribute('href')).toBe('spotify:track:4cOdK2wGLETKBW3PvgPWqT');
    expect(
      within(alert).getByRole('link', { name: 'Open Active Track in Apple Music' }),
    ).toBeTruthy();
    expect(within(alert).queryByRole('link', { name: /SoundCloud/ })).toBeNull();

    // Bailing out keeps the class running, prompter-only.
    fireEvent.click(within(alert).getByRole('button', { name: 'Continue without music' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Music off')).toBeTruthy();
  });
});

describe('LiveMode provider handoff', () => {
  it('keeps handoff links off the prompter surfaces (recovery alert only)', async () => {
    await renderLive();
    expect(screen.queryByRole('link', { name: /^Open / })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));
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

  it('surfaces the active track notes in Cue-by-Cue without making them the focal cue', async () => {
    await renderLive(notedPayload);

    expect(screen.getByText('Watch the new rider in row 2')).toBeTruthy();
    // The notes are a subordinate block, not the focal cue: the "Now" card and its
    // "Notes" label both render, distinctly.
    expect(screen.getByText('Now')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
  });

  it('shows the notes in Full List too', async () => {
    await renderLive(notedPayload);

    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));

    expect(screen.getByText('Watch the new rider in row 2')).toBeTruthy();
  });

  it('renders no notes block when the track has none', async () => {
    await renderLive();

    expect(screen.queryByText(/Notes/)).toBeNull();
  });
});

describe('LiveMode screen-reader announcements', () => {
  it('announces the live track when no cue is active', async () => {
    await renderLive();
    expect(screen.getByText('Track 1: Active Track.')).toBeTruthy();
  });

  it('announces the current cue once one is reached', async () => {
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
    await renderLive(withCue);
    expect(screen.getByText('Cue: Stand and sprint.')).toBeTruthy();
  });

  it('announces the current section in a polite region, apart from the assertive cue', async () => {
    const sectioned = {
      ...payload,
      sections: [
        { type: 'warm_up', startOffsetMs: 0 },
        { type: 'sprint', startOffsetMs: 60000 },
      ],
    } satisfies RunPayload;
    await renderLive(sectioned);
    const region = screen.getByText('Warm-up section.');
    // Section context must not interrupt the cue: it lives in aria-live="polite",
    // not the assertive cue region.
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('announces the new section when a boundary is crossed', async () => {
    const sectioned = {
      ...payload,
      sections: [
        { type: 'warm_up', startOffsetMs: 0 },
        { type: 'sprint', startOffsetMs: 60000 },
      ],
    } satisfies RunPayload;
    await renderLive(sectioned);
    expect(screen.getByText('Warm-up section.')).toBeTruthy();
    // Seek across the 60s boundary (PageUp jumps +30s) — the polite text updates,
    // which is what re-announces. On-change only: it tracks section.type, not frames.
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    fireEvent.keyDown(slider, { key: 'PageUp' }); // 30s — still warm-up
    expect(screen.getByText('Warm-up section.')).toBeTruthy();
    fireEvent.keyDown(slider, { key: 'PageUp' }); // 60s — sprint begins
    expect(screen.getByText('Sprint section.')).toBeTruthy();
  });

  it('makes no section announcement when the class has no sections', async () => {
    await renderLive();
    expect(screen.queryByText(/ section\.$/)).toBeNull();
  });
});

describe('LiveMode timeline scrubber', () => {
  it('seeks the virtual clock from the timeline (keyboard)', async () => {
    await renderLive();
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

  it('shows the current section and a countdown to the next, in both views', async () => {
    await renderLive(sectionedPayload);

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

  it('renders no section indicator when the class has no sections', async () => {
    await renderLive();
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
