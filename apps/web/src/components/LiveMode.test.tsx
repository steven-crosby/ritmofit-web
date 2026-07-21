// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MusicConnectionView, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  connectAppleMusic,
  disconnectProvider,
  getAppleMusicConfig,
  listConnections,
} from '../lib/api.js';
import { authorizeAppleMusic } from '../lib/musickit.js';
import { soundcloudAdapterFactory } from '../lib/playback/soundcloud-adapter.js';
import type { PlaybackAdapter } from '../lib/playback/types.js';
import {
  eventCount,
  LiveMode,
  lastAtOrBefore,
  liveSectionAt,
  trackIndexAt,
  type TimelineEvent,
} from './LiveMode.js';

vi.mock('../lib/api.js', () => ({
  listConnections: vi.fn(),
  connectProvider: vi.fn(),
  disconnectProvider: vi.fn(),
  getAppleMusicConfig: vi.fn(),
  connectAppleMusic: vi.fn(),
}));
vi.mock('../lib/musickit.js', () => ({
  authorizeAppleMusic: vi.fn(),
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

const appleMusicConnection: MusicConnectionView = {
  ...soundcloudConnection,
  id: '00000000-0000-4000-8000-00000000000d',
  provider: 'apple_music',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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
  vi.mocked(getAppleMusicConfig)
    .mockReset()
    .mockResolvedValue({ developerToken: 'developer-token', storefront: null });
  vi.mocked(authorizeAppleMusic).mockReset().mockResolvedValue('music-user-token');
  vi.mocked(connectAppleMusic).mockReset().mockResolvedValue(undefined);
  vi.mocked(disconnectProvider).mockReset().mockResolvedValue(undefined);
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
    // Apple Music needs an authorized user; with no connection this track can't
    // play (unlike SoundCloud, whose public Widget needs no connection).
    const appleOnly = {
      ...activeTrack,
      providerRefs: [
        {
          provider: 'apple_music',
          providerTrackId: 'apple-id',
          providerUri: 'https://music.apple.com/us/song/active-track/123',
        },
      ],
    } satisfies RunPayloadTrackEntry;
    render(<LiveMode payload={{ ...payload, tracks: [appleOnly] }} onExit={() => {}} />);
    const list = await screen.findByRole('list', { name: 'Track playback check' });
    expect(within(list).getByText('Active Track')).toBeTruthy();
    // No Apple Music connection → nothing can play it.
    expect(within(list).getByText('No connected provider can play this')).toBeTruthy();
    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: '0 tracks ready · 1 needs a decision' }),
    ).toBeTruthy();
    expect(screen.getByText('1 track needs a fix before hands-free playback.')).toBeTruthy();
    expect(
      screen.getByText(
        'Prompter-only is ready now. Music can be fixed before the run or left off deliberately.',
      ),
    ).toBeTruthy();
    const exceptionRow = within(list).getByText('Active Track').closest('li');
    expect(exceptionRow?.className).toContain('py-3');
    expect(exceptionRow?.className).not.toContain('shadow-card');
    const start = screen.getByRole('button', { name: 'Start class' });
    expect((start as HTMLButtonElement).disabled).toBe(true);
    // The prompter path stays available.
    expect(screen.getByRole('button', { name: 'Run without music' })).toBeTruthy();
  });

  it('starts a SoundCloud track with no connection (public Widget needs no auth)', async () => {
    // The exact production bug: an all-SoundCloud class with no live connection
    // used to read as unplayable. The Widget needs no token, so it must play.
    const soundcloudOnly = {
      ...activeTrack,
      providerRefs: [
        { provider: 'soundcloud', providerTrackId: 'soundcloud-id', providerUri: null },
      ],
    } satisfies RunPayloadTrackEntry;
    render(<LiveMode payload={{ ...payload, tracks: [soundcloudOnly] }} onExit={() => {}} />);
    const list = await screen.findByRole('list', { name: 'Track playback check' });
    expect(within(list).getByText('Plays on SoundCloud')).toBeTruthy();
    expect(screen.getByText('Live ready')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '1 track ready · 0 need a decision' })).toBeTruthy();
    expect(screen.getByText('All 1 track can play hands-free.')).toBeTruthy();
    const passingRow = within(list).getByText('Active Track').closest('li');
    expect(passingRow?.className).toContain('py-3');
    expect(passingRow?.className).not.toContain('shadow-card');
    const start = screen.getByRole('button', { name: 'Start class' });
    expect((start as HTMLButtonElement).disabled).toBe(false);
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
    expect(screen.getByRole('heading', { name: 'Runnable with warnings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run without music' })).toBeTruthy();

    expect(screen.getByText(/has not marked any provider disconnected/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry check' }));
    const list = await screen.findByRole('list', { name: 'Track playback check' });
    expect(within(list).getByText('Plays on SoundCloud')).toBeTruthy();
  });

  it('opens connection recovery in place and refreshes preflight after Apple Music connects', async () => {
    const appleOnly = {
      ...activeTrack,
      providerRefs: [
        {
          provider: 'apple_music',
          providerTrackId: 'apple-id',
          providerUri: 'https://music.apple.com/us/song/active-track/123',
        },
      ],
    } satisfies RunPayloadTrackEntry;
    vi.mocked(listConnections)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([appleMusicConnection])
      .mockResolvedValueOnce([appleMusicConnection]);

    render(<LiveMode payload={{ ...payload, tracks: [appleOnly] }} onExit={() => {}} />);
    expect(await screen.findByText('No connected provider can play this')).toBeTruthy();
    expect(
      screen.getByText(/Spotify and SoundCloud authorization open a provider page/),
    ).toBeTruthy();

    const manage = screen.getByRole('button', { name: 'Manage connections' });
    manage.focus();
    fireEvent.click(manage);
    const dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    const appleRow = within(dialog).getByText('Apple Music').closest('li');
    expect(appleRow).not.toBeNull();
    fireEvent.click(within(appleRow!).getByRole('button', { name: 'Connect' }));

    expect(await screen.findByText('Plays on Apple Music')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(listConnections).toHaveBeenCalledTimes(4);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));
    expect(screen.queryByRole('dialog', { name: 'Music connections' })).toBeNull();
    expect(document.activeElement).toBe(manage);
  });

  it('fails closed while refreshing after an in-dialog disconnect', async () => {
    const appleOnly = {
      ...activeTrack,
      providerRefs: [
        {
          provider: 'apple_music',
          providerTrackId: 'apple-id',
          providerUri: 'https://music.apple.com/us/song/active-track/123',
        },
      ],
    } satisfies RunPayloadTrackEntry;
    const parentDisconnectRefresh = deferred<MusicConnectionView[]>();
    vi.mocked(listConnections)
      .mockResolvedValueOnce([]) // Live entry
      .mockResolvedValueOnce([]) // first dialog open
      .mockResolvedValueOnce([appleMusicConnection]) // dialog refresh after connect
      .mockResolvedValueOnce([appleMusicConnection]) // Live refresh after connect
      .mockResolvedValueOnce([appleMusicConnection]) // second dialog open
      .mockResolvedValueOnce([]) // dialog refresh after disconnect
      .mockReturnValueOnce(parentDisconnectRefresh.promise); // Live refresh after disconnect
    vi.mocked(disconnectProvider).mockResolvedValue(undefined);

    render(<LiveMode payload={{ ...payload, tracks: [appleOnly] }} onExit={() => {}} />);
    expect(await screen.findByText('No connected provider can play this')).toBeTruthy();

    const manage = screen.getByRole('button', { name: 'Manage connections' });
    fireEvent.click(manage);
    let dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    let appleRow = within(dialog).getByText('Apple Music').closest('li');
    fireEvent.click(within(appleRow!).getByRole('button', { name: 'Connect' }));
    expect(await screen.findByText('Plays on Apple Music')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));

    manage.focus();
    fireEvent.click(manage);
    dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    appleRow = within(dialog).getByText('Apple Music').closest('li');
    fireEvent.click(within(appleRow!).getByRole('button', { name: 'Disconnect' }));
    fireEvent.click(within(appleRow!).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(disconnectProvider).toHaveBeenCalledWith('apple_music'));
    await waitFor(() => expect(listConnections).toHaveBeenCalledTimes(7));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));
    expect(await screen.findByText('Checking provider connections…')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Run without music' })).toBeTruthy();
    expect(document.activeElement).toBe(manage);

    parentDisconnectRefresh.resolve([]);
    expect(await screen.findByText('No connected provider can play this')).toBeTruthy();
  });

  it('ignores a late success from an invalidated connection request', async () => {
    const stale = deferred<MusicConnectionView[]>();
    const current = deferred<MusicConnectionView[]>();
    vi.mocked(listConnections)
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(current.promise);

    render(
      <StrictMode>
        <LiveMode payload={payload} onExit={() => {}} />
      </StrictMode>,
    );
    await waitFor(() => expect(listConnections).toHaveBeenCalledTimes(2));
    current.resolve([]);
    expect(await screen.findByRole('list', { name: 'Track playback check' })).toBeTruthy();

    stale.resolve([appleMusicConnection]);
    await waitFor(() => expect(screen.queryByText('Plays on Apple Music')).toBeNull());
  });

  it('ignores a late failure from an invalidated connection request', async () => {
    const stale = deferred<MusicConnectionView[]>();
    const current = deferred<MusicConnectionView[]>();
    vi.mocked(listConnections)
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(current.promise);

    render(
      <StrictMode>
        <LiveMode payload={payload} onExit={() => {}} />
      </StrictMode>,
    );
    await waitFor(() => expect(listConnections).toHaveBeenCalledTimes(2));
    current.resolve([]);
    expect(await screen.findByRole('list', { name: 'Track playback check' })).toBeTruthy();

    stale.reject(new Error('stale failure'));
    await waitFor(() => expect(screen.queryByText(/stale failure/)).toBeNull());
  });

  it('does not offer connection recovery for builder-only preflight failures', async () => {
    const noProvider = { ...activeTrack, providerRefs: [] } satisfies RunPayloadTrackEntry;
    render(<LiveMode payload={{ ...payload, tracks: [noProvider] }} onExit={() => {}} />);

    expect(await screen.findByText('No provider link')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Manage connections' })).toBeNull();
  });
});

describe('LiveMode focus management', () => {
  // LiveMode is a full-screen takeover (Dashboard unmounts behind it), so the control
  // that opened it — and the preflight Start/Run button — are gone on transition. Without
  // explicit placement, focus falls to <body>: a keyboard/SR instructor is stranded at
  // the top of the document exactly as the class goes hands-free. These pin the fix; the
  // real behavior is also driven live (jsdom focus is fragile).

  it('focuses the class-title heading on entry (preflight)', async () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    const heading = screen.getByRole('heading', { name: 'Handoff Ride' });
    expect(document.activeElement).toBe(heading);
  });

  it('moves focus to the Play control after Run without music', async () => {
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Run without music' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play' }));
  });

  it('moves focus to the Pause control after Start class', async () => {
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    const pause = await screen.findByRole('button', { name: 'Pause' });
    expect(document.activeElement).toBe(pause);
  });

  it('focuses the transport for an empty class that skips preflight straight to live', () => {
    // phase starts 'live' when tracks.length === 0; the heading-on-mount effect is gated
    // on the preflight phase, so it never races the transport-focus effect here.
    render(<LiveMode payload={{ ...payload, tracks: [] }} onExit={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play' }));
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
    expect(within(alert).getByRole('heading', { name: 'Playback stopped' })).toBeTruthy();
    expect(within(alert).getByText('widget failed')).toBeTruthy();
    expect(within(alert).getByText(/cue and class clock are still running/)).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Retry playback' })).toBeTruthy();

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

  it('keeps the current cue, count, clock, and recovery visible when a failure is paused', async () => {
    const countedCue = {
      ...payload,
      tracks: [
        {
          ...activeTrack,
          cues: [
            {
              id: '00000000-0000-4000-8000-0000000000f1',
              anchorMs: 0,
              beat: 4,
              bar: 12,
              text: 'Hands light. Hips lead.',
              color: null,
            },
          ],
        },
      ],
    } satisfies RunPayload;
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    vi.mocked(soundcloudAdapterFactory).mockImplementation(
      (): PlaybackAdapter => ({
        ...workingAdapter(),
        prepare: () => Promise.reject(new Error('widget failed')),
      }),
    );

    render(<LiveMode payload={countedCue} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Hands light. Hips lead.')).toBeTruthy();
    expect(screen.getByLabelText('Bar and count 12.4')).toBeTruthy();
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText(/Paused · Track 1 of 1/)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Hands light. Hips lead.')).toBeTruthy();
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
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
    // The notes are a subordinate block, not the focal cue: at rest the focal card
    // leads with the "Ready" eyebrow, and the "Notes" label renders distinctly.
    expect(screen.getByText('First action')).toBeTruthy();
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

  it('keeps current position, notes, and rehearsal marks in the compact full list', async () => {
    const scored = {
      ...payload,
      tracks: [
        {
          ...activeTrack,
          notes: 'Respira con calma — hold the room through the long transition.',
          cues: [
            {
              id: '00000000-0000-4000-8000-0000000000a1',
              anchorMs: 0,
              beat: 1,
              bar: 1,
              text: 'Hands light. Hips lead.',
              color: null,
            },
          ],
          moves: [
            {
              id: '00000000-0000-4000-8000-0000000000a2',
              anchorMs: 30000,
              beat: 1,
              bar: 9,
              name: 'Stand and climb',
              intensity: 'hard',
            },
          ],
        },
      ],
    } satisfies RunPayload;
    await renderLive(scored);
    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));

    expect(screen.getByRole('heading', { name: 'Track 1 of 1' })).toBeTruthy();
    expect(screen.getByText('▶ Current')).toBeTruthy();
    expect(screen.getByText(/Respira con calma/)).toBeTruthy();
    const marks = screen.getByRole('list', { name: 'Rehearsal marks for Active Track' });
    expect(within(marks).getByText('Hands light. Hips lead.')).toBeTruthy();
    expect(within(marks).getByText('Stand and climb')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Jump to track 1, Active Track' })
        .closest('li')
        ?.getAttribute('aria-current'),
    ).toBe('step');
  });

  it('keeps a twelve-track run compact and preserves every seek target', async () => {
    const tracks = Array.from({ length: 12 }, (_, index) => ({
      ...activeTrack,
      classTrackId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      position: index,
      startOffsetMs: index * 60000,
      providerRefs: [],
      track: {
        ...activeTrack.track,
        id: `00000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`,
        title: `Bloque ${index + 1} — transición larga / 長い移行`,
        durationMs: 60000,
      },
    })) satisfies RunPayloadTrackEntry[];
    const longRun = {
      ...payload,
      class: { ...payload.class, totalDurationMs: 12 * 60000 },
      tracks,
    } satisfies RunPayload;

    await renderLive(longRun);
    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));

    expect(screen.getByRole('heading', { name: 'Track 1 of 12' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Jump to track/ })).toHaveLength(12);
    expect(screen.getByText('Bloque 12 — transición larga / 長い移行')).toBeTruthy();
  });
});

describe('LiveMode sparse-data fallbacks', () => {
  it('leads with the affirmative ready state (never a bare dash) at rest before playback', async () => {
    // activeTrack has no cues and the clock is frozen at 0:00 (not playing), so Live
    // is at rest → the focal hero leads with "Press play to start", not "No cue set".
    await renderLive();
    expect(screen.getByText('Press play to start')).toBeTruthy();
    // The focal card still names what's playing (also shown in the Track rail → 2+
    // matches), and never a naked "—".
    expect(screen.getAllByText('Active Track').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('—')).toBeNull();
  });

  it('elevates a missing BPM to a readiness state, not quiet metadata', async () => {
    const noBpm = {
      ...payload,
      tracks: [{ ...activeTrack, displayBpm: null }],
    } satisfies RunPayload;
    await renderLive(noBpm);
    expect(screen.getByText('Tempo missing')).toBeTruthy();
    expect(screen.getByText('Pulse off')).toBeTruthy();
    expect(screen.queryByText('No BPM set')).toBeNull();
  });

  it('uses an affirmative teaching state instead of making missing cue data the hero', async () => {
    await renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByText('Lead this track')).toBeTruthy();
    expect(screen.queryByText('No cue set')).toBeNull();
  });
});

describe('eventCount', () => {
  const base: TimelineEvent = {
    atMs: 0,
    kind: 'cue',
    text: 'Push',
    color: null,
    intensity: null,
    beat: null,
    bar: null,
  };

  it('uses existing authored bar and beat truth without inventing missing counts', () => {
    expect(eventCount({ ...base, beat: 4, bar: 12 })).toBe('12.4');
    expect(eventCount({ ...base, beat: 8 })).toBe('8');
    expect(eventCount(base)).toBeNull();
  });
});

describe('LiveMode tempo-forward HUD', () => {
  it('pairs the tempo with the cue as one focal object (no duplicate side-rail vitals)', async () => {
    await renderLive();
    // The tempo is the data-hero screenshot numeral, paired with the cue — and the
    // effort reads alongside it. getByText enforces a single occurrence, so it also
    // locks the old standalone rail "Vitals" card as removed (folded into the focal
    // footer), not rendered twice.
    expect(screen.getByText('124')).toBeTruthy();
    expect(screen.getByText('BPM')).toBeTruthy();
    expect(screen.getByText('Effort')).toBeTruthy();
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

  it('re-announces a verbatim-repeated cue by ping-ponging the assertive regions', async () => {
    // Two cues with identical text at different times. The string never changes, so a
    // single assertive region would never mutate and a screen reader would stay silent
    // on the second "Push". The fix writes the cue to the alternate assertive region on
    // each advance (an '' → text mutation), which is what re-announces it.
    const repeatedCue: RunPayload = {
      ...payload,
      tracks: [
        {
          ...activeTrack,
          cues: [
            {
              id: '00000000-0000-4000-8000-0000000000c1',
              anchorMs: 0,
              beat: null,
              bar: null,
              text: 'Push',
              color: null,
            },
            {
              id: '00000000-0000-4000-8000-0000000000c2',
              anchorMs: 90000,
              beat: null,
              bar: null,
              text: 'Push',
              color: null,
            },
          ],
        },
      ],
    };
    await renderLive(repeatedCue);

    // The <p> currently holding the (identical) cue text. With ping-pong this node
    // changes on each advance; with a single region it would be the same node both times.
    const cueRegion = () =>
      Array.from(document.querySelectorAll('p[aria-live="assertive"]')).find(
        (el) => el.textContent === 'Cue: Push.',
      );

    const first = cueRegion();
    expect(first).toBeTruthy();

    // Seek across the second cue at 90s (PageUp jumps +30s), reaching the identical cue.
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    fireEvent.keyDown(slider, { key: 'PageUp' }); // 30s — still the first "Push"
    fireEvent.keyDown(slider, { key: 'PageUp' }); // 60s — still the first "Push"
    fireEvent.keyDown(slider, { key: 'PageUp' }); // 90s — the second, identical "Push"

    const second = cueRegion();
    expect(second).toBeTruthy();
    // The text moved to the *other* assertive region — the empty → text transition that
    // makes a screen reader re-announce an identical cue. A single region fails here.
    expect(second).not.toBe(first);
  });

  it('announces the current section in a polite region, apart from the assertive cue', async () => {
    const sectioned = {
      ...payload,
      sections: [
        { id: '11111111-1111-4111-8111-111111111111', type: 'warm_up', startOffsetMs: 0 },
        { id: '22222222-2222-4222-8222-222222222222', type: 'sprint', startOffsetMs: 60000 },
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
        { id: '11111111-1111-4111-8111-111111111111', type: 'warm_up', startOffsetMs: 0 },
        { id: '22222222-2222-4222-8222-222222222222', type: 'sprint', startOffsetMs: 60000 },
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
    const transport = screen.getByRole('region', { name: 'Live transport' });
    expect(transport.className).toContain('grid-cols-[auto_auto_minmax(0,1fr)]');
    expect(slider.parentElement?.className).toContain('col-span-full');
    expect(slider.parentElement?.className).toContain('min-w-0');
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
    { id: '11111111-1111-4111-8111-111111111111', type: 'warm_up', startOffsetMs: 0 },
    { id: '22222222-2222-4222-8222-222222222222', type: 'sprint', startOffsetMs: 60000 },
    { id: '33333333-3333-4333-8333-333333333333', type: 'cool_down', startOffsetMs: 150000 },
  ] satisfies RunPayload['sections'];

  it('returns null when the class has no sections', () => {
    expect(liveSectionAt([], 0)).toBeNull();
  });

  it('returns null before the first section starts', () => {
    const delayed = [
      { id: '44444444-4444-4444-8444-444444444444', type: 'sprint', startOffsetMs: 5000 },
    ] satisfies RunPayload['sections'];
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
      { id: '22222222-2222-4222-8222-222222222222', type: 'sprint', startOffsetMs: 60000 },
      { id: '11111111-1111-4111-8111-111111111111', type: 'warm_up', startOffsetMs: 0 },
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
      { id: '11111111-1111-4111-8111-111111111111', type: 'warm_up', startOffsetMs: 0 },
      { id: '22222222-2222-4222-8222-222222222222', type: 'sprint', startOffsetMs: 60000 },
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

describe('LiveMode wake-lock status chip', () => {
  function setWakeLock(value: unknown) {
    Object.defineProperty(navigator, 'wakeLock', { value, configurable: true });
  }
  /** A wake lock whose request resolves a sentinel — enough for the held state. */
  function fakeWakeLock() {
    const sentinel = { release: vi.fn(async () => {}), addEventListener: () => {} };
    return { request: vi.fn(async () => sentinel) };
  }
  afterEach(() => setWakeLock(undefined));

  it('hides the chip at rest — the wake lock is only promised while running', async () => {
    setWakeLock(fakeWakeLock());
    // renderLive enters prompter-only (not yet playing), so nothing is held.
    await renderLive();
    expect(screen.queryByText('Screen awake')).toBeNull();
    expect(screen.queryByText('Screen may dim')).toBeNull();
  });

  it('states the screen is awake while playing when the lock is held', async () => {
    setWakeLock(fakeWakeLock());
    await renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(await screen.findByText('Screen awake')).toBeTruthy();
  });

  it('warns the screen may dim while playing when wake lock is unavailable', async () => {
    // No wake-lock API (older Safari) or a denied request both land here — the
    // instructor-facing consequence is the same, so the chip states it plainly.
    setWakeLock(undefined);
    await renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(await screen.findByText('Screen may dim')).toBeTruthy();
  });
});

describe('lastAtOrBefore', () => {
  const ev = (atMs: number): TimelineEvent => ({
    atMs,
    kind: 'cue',
    text: `@${atMs}`,
    color: null,
    intensity: null,
    beat: null,
    bar: null,
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
