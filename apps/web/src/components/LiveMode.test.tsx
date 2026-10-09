import { getSpotifyPlayback } from '../lib/spotify-playback.js';
// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MusicConnectionView, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  connectAppleMusic,
  disconnectProvider,
  getAppleMusicConfig,
  listConnections,
} from '../lib/api.js';
import { prepareAppleMusic } from '../lib/musickit.js';
import { soundcloudAdapterFactory } from '../lib/playback/soundcloud-adapter.js';
import type { AdapterEvents, PlaybackAdapter } from '../lib/playback/types.js';
import {
  choreographyQueueAt,
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
  prepareAppleMusic: vi.fn(),
}));
vi.mock('../lib/spotify-playback.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/spotify-playback.js')>()),
  getSpotifyPlayback: vi.fn(),
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
    baseDurationMs: 180000,
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
  let positionMs = 0;
  return {
    provider: 'soundcloud',
    prepare: (entry, window) => {
      positionMs = window.startMs;
      return Promise.resolve({ provider: 'soundcloud' as const, classTrackId: entry.classTrackId });
    },
    getTransport: async () => ({ positionMs: ++positionMs, state: 'playing' }),
    play: () => Promise.resolve(),
    pause: () => Promise.resolve(),
    seek: async (ms) => {
      positionMs = ms;
    },
    stop: () => Promise.resolve(),
    destroy: () => {},
  };
}

beforeEach(() => {
  vi.mocked(listConnections).mockReset().mockResolvedValue([]);
  vi.mocked(getAppleMusicConfig)
    .mockReset()
    .mockResolvedValue({ developerToken: 'developer-token', storefront: null });
  vi.mocked(prepareAppleMusic)
    .mockReset()
    .mockResolvedValue({
      isAuthorized: true,
      authorize: vi.fn().mockResolvedValue('music-user-token'),
    } as unknown as Awaited<ReturnType<typeof prepareAppleMusic>>);
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
  it('shows a returned connection failure at preflight without starting playback', async () => {
    const dismissed = vi.fn();
    render(
      <LiveMode
        payload={payload}
        onExit={() => {}}
        connectionResult={{ error: 'access_denied' }}
        onConnectionResultDismissed={dismissed}
      />,
    );
    const dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    expect(await within(dialog).findByText('Connection failed: access denied.')).toBeTruthy();
    expect(soundcloudAdapterFactory).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Run without music' })).toBeTruthy();
  });
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
      screen.getByRole('heading', { name: '0 tracks checked · 1 needs a decision' }),
    ).toBeTruthy();
    expect(screen.getByText('1 track needs a fix before starting with music.')).toBeTruthy();
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
    expect(start.className).toContain('disabled:opacity-40');
    expect(start.className).toContain('disabled:pointer-events-none');
    expect(start.className).not.toContain('text-text-tertiary');
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
    expect(within(list).getByText('Selected: SoundCloud')).toBeTruthy();
    expect(screen.getByText('Track checks passed')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: '1 track checked · 0 need a decision' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Provider links and durations checked for 1 track. Playback availability and audible output are unverified.',
      ),
    ).toBeTruthy();
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
    expect(within(list).getByText('Selected: SoundCloud')).toBeTruthy();

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
    expect(within(list).getByText('Selected: SoundCloud')).toBeTruthy();
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
    fireEvent.click(within(appleRow!).getByRole('button', { name: 'Connect Apple Music' }));
    fireEvent.click(
      await within(appleRow!).findByRole('button', { name: 'Authorize Apple Music' }),
    );

    expect(await screen.findByText('Selected: Apple Music')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Check Apple Music authorization' }));
    await screen.findByText(
      'Apple Music authorized in this browser. Playback availability is still unverified.',
    );
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
    fireEvent.click(within(appleRow!).getByRole('button', { name: 'Connect Apple Music' }));
    fireEvent.click(
      await within(appleRow!).findByRole('button', { name: 'Authorize Apple Music' }),
    );
    expect(await screen.findByText('Selected: Apple Music')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));

    manage.focus();
    fireEvent.click(manage);
    dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    appleRow = within(dialog).getByText('Apple Music').closest('li');
    fireEvent.click(within(appleRow!).getByRole('button', { name: 'Disconnect Apple Music' }));
    fireEvent.click(
      within(appleRow!).getByRole('button', { name: 'Confirm disconnect Apple Music' }),
    );
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
    await waitFor(() => expect(screen.queryByText('Selected: Apple Music')).toBeNull());
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

  it('retains music management alongside builder-only preflight failures', async () => {
    const noProvider = { ...activeTrack, providerRefs: [] } satisfies RunPayloadTrackEntry;
    render(<LiveMode payload={{ ...payload, tracks: [noProvider] }} onExit={() => {}} />);

    expect(await screen.findByText('No provider link')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage connections' })).toBeTruthy();
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

  it('reveals teaching on entry and recovery on a new failure without stealing focus on updates', async () => {
    const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    const revealed: HTMLElement[] = [];
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: function (this: HTMLElement) {
        revealed.push(this);
      },
    });
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    let fail: NonNullable<AdapterEvents['onError']> = () => {};
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    vi.mocked(soundcloudAdapterFactory).mockImplementation((events: AdapterEvents) => {
      fail = (error) => events.onError?.(error);
      return workingAdapter();
    });
    try {
      render(<LiveMode payload={payload} onExit={() => {}} />);
      await screen.findByRole('list', { name: 'Track playback check' });
      fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
      await screen.findByRole('button', { name: 'Pause' });
      const teaching = document.querySelector('[data-live-region="teaching"]');
      expect(revealed.at(-1)).toBe(teaching);
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause' }));

      const fullList = screen.getByRole('tab', { name: 'Full List' });
      fullList.focus();
      fireEvent.click(fullList);
      expect(revealed.at(-1)).toBe(teaching);
      expect(document.activeElement).toBe(fullList);
      const cueView = screen.getByRole('tab', { name: 'Cue-by-Cue' });
      cueView.focus();
      fireEvent.click(cueView);
      expect(revealed.at(-1)).toBe(teaching);
      expect(document.activeElement).toBe(cueView);
      fullList.focus();
      fireEvent.click(fullList);
      fireEvent.click(screen.getByRole('button', { name: 'More controls' }));
      act(() => fail({ message: 'Lost playback during teaching' }));
      const recovery = await screen.findByRole('alert', { name: 'Playback recovery' });
      expect(revealed.at(-1)).toBe(recovery);
      expect(document.activeElement).toBe(recovery);
      expect(
        screen.getByRole('button', { name: 'More controls' }).getAttribute('aria-expanded'),
      ).toBe('false');
      const manage = within(recovery).getByRole('button', { name: 'Manage music connection' });
      manage.focus();
      const revealCount = revealed.length;
      act(() => fail({ message: 'A second provider status update' }));
      expect(document.activeElement).toBe(manage);
      expect(revealed).toHaveLength(revealCount);

      fireEvent.click(within(recovery).getByRole('button', { name: 'Continue without music' }));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(revealed.at(-1)).toBe(teaching);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause' }));
    } finally {
      focus.mockRestore();
      if (originalScroll) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
      }
    }
  });

  it('keeps secondary transport controls operable after switching to Full List', async () => {
    await renderLive();
    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));
    const more = screen.getByRole('button', { name: 'More controls' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    const less = screen.getByRole('button', { name: 'Less controls' });
    expect(less.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
    fireEvent.click(less);
    expect(
      screen.getByRole('button', { name: 'More controls' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('focuses waiting recovery and restores the music-dialog trigger while preparation is pending', async () => {
    const pending = deferred<{ provider: 'soundcloud'; classTrackId: string }>();
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    vi.mocked(soundcloudAdapterFactory).mockImplementation(() => ({
      ...workingAdapter(),
      prepare: () => pending.promise,
    }));
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    const recovery = screen.getByRole('status', { name: 'Playback recovery' });
    expect(document.activeElement).toBe(recovery);
    expect(within(recovery).getByRole('button', { name: 'Continue without music' })).toBeTruthy();
    const manage = within(recovery).getByRole('button', { name: 'Manage music connection' });
    manage.focus();
    fireEvent.click(manage);
    const dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));
    expect(document.activeElement).toBe(manage);
    expect(screen.getByRole('status', { name: 'Playback recovery' })).toBe(recovery);
  });

  it.each(['Full List', 'Pause preparation'])(
    'retains focus on %s when asynchronous preparation becomes ready',
    async (controlName: string) => {
      const pending = deferred<{ provider: 'soundcloud'; classTrackId: string }>();
      vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
      vi.mocked(soundcloudAdapterFactory).mockImplementation(() => ({
        ...workingAdapter(),
        prepare: () => pending.promise,
      }));
      render(<LiveMode payload={payload} onExit={() => {}} />);
      await screen.findByRole('list', { name: 'Track playback check' });
      fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
      const control = screen.getByRole(controlName === 'Full List' ? 'tab' : 'button', {
        name: controlName,
      });
      control.focus();
      if (controlName === 'Full List') fireEvent.click(control);
      await act(async () => {
        pending.resolve({ provider: 'soundcloud', classTrackId: activeTrack.classTrackId });
      });
      await screen.findByRole('button', { name: /^Pause$/ });
      expect(document.activeElement).toBe(control);
      if (controlName === 'Full List') expect(control.getAttribute('aria-selected')).toBe('true');
    },
  );

  it('keeps focus in the music dialog when playback confirms and falls back if its trigger disappears', async () => {
    const pending = deferred<{ provider: 'soundcloud'; classTrackId: string }>();
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    vi.mocked(soundcloudAdapterFactory).mockImplementation(() => ({
      ...workingAdapter(),
      prepare: () => pending.promise,
    }));
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    const manage = screen.getByRole('button', { name: 'Manage music connection' });
    manage.focus();
    fireEvent.click(manage);
    const dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    await act(async () => {
      pending.resolve({ provider: 'soundcloud', classTrackId: activeTrack.classTrackId });
    });
    await screen.findByRole('button', { name: /^Pause$/ });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(manage.isConnected).toBe(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Pause$/ }));
  });

  it('retains the music-dialog trigger after closing failure recovery from Full List', async () => {
    vi.mocked(soundcloudAdapterFactory).mockImplementation(() => ({
      ...workingAdapter(),
      prepare: () => Promise.reject(new Error('widget failed')),
    }));
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));
    const manage = screen.getByRole('button', { name: 'Manage music connection' });
    manage.focus();
    fireEvent.click(manage);
    const dialog = await screen.findByRole('dialog', { name: 'Music connections' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close connections dialog' }));
    expect(document.activeElement).toBe(manage);
  });
});

describe('LiveMode playback failure', () => {
  it('holds silent music in both views and advances only after explicitly continuing without music', async () => {
    vi.mocked(soundcloudAdapterFactory).mockImplementation(() => ({
      ...workingAdapter(),
      getTransport: async () => ({ positionMs: null, state: 'unknown' }),
    }));
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Pause preparation' })).toBeTruthy();
      fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));
      expect(screen.getByRole('heading', { name: 'Waiting for music' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Continue without music' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });
      expect(screen.getByText('0:01 / 3:00')).toBeTruthy();
      expect(screen.getByText('Music off')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
  it('manual Pause during preparation prevents late playback from restarting the run', async () => {
    const pending = deferred<{ provider: 'soundcloud'; classTrackId: string }>();
    const play = vi.fn().mockResolvedValue(undefined);
    vi.mocked(soundcloudAdapterFactory).mockImplementation(() => ({
      ...workingAdapter(),
      prepare: () => pending.promise,
      play,
    }));
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause preparation' }));
    await act(async () => {
      pending.resolve({ provider: 'soundcloud', classTrackId: activeTrack.classTrackId });
    });
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
    expect(screen.getByText(/Paused · Track 1 of 1/)).toBeTruthy();
  });
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
    expect(within(alert).getByText('Teaching position is held.')).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Retry playback' })).toBeTruthy();

    // Handoff links live ONLY here (recovery surface), and only trusted URIs:
    // the track's soundcloud ref is a javascript: URI and must not render.
    fireEvent.click(within(alert).getByText('Open in music app'));
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

  it('retries with a fresh adapter and holds teaching until fresh provider progress', async () => {
    const failedDestroy = vi.fn();
    const recovered = workingAdapter();
    const prepare = vi.fn(recovered.prepare);
    let positionMs = 0;
    const getTransport = vi.fn(async () => ({ positionMs, state: 'playing' as const }));
    vi.mocked(soundcloudAdapterFactory)
      .mockImplementationOnce(() => ({
        ...workingAdapter(),
        prepare: async () => {
          throw new Error('first preparation failed');
        },
        destroy: failedDestroy,
      }))
      .mockImplementationOnce(() => ({ ...recovered, prepare, getTransport }));
    render(<LiveMode payload={payload} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByRole('alert').textContent).toContain('first preparation failed');
      expect(failedDestroy).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole('button', { name: 'Retry playback' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(soundcloudAdapterFactory).toHaveBeenCalledTimes(2);
      expect(prepare).toHaveBeenCalledExactlyOnceWith(activeTrack, {
        startMs: 0,
        endMs: 180000,
      });
      expect(getTransport.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Waiting for music' })).toBeTruthy();

      positionMs = 2000;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      expect(screen.getByText('0:02 / 3:00')).toBeTruthy();
      expect(screen.getByText(/Now teaching · Track/)).toBeTruthy();
      expect(screen.queryByLabelText('Playback recovery')).toBeNull();
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });

  it('skips a failed track and holds at the next boundary until fresh provider progress', async () => {
    const nextTrack = {
      ...activeTrack,
      classTrackId: '00000000-0000-4000-8000-0000000000b2',
      position: 1,
      startOffsetMs: 180000,
      clipStartMs: 30000,
      track: { ...activeTrack.track, id: 'tr-skip', title: 'Second Track', durationMs: 120000 },
    } satisfies RunPayloadTrackEntry;
    const twoTracks = {
      ...payload,
      class: { ...payload.class, totalDurationMs: 300000 },
      tracks: [activeTrack, nextTrack],
    } satisfies RunPayload;
    const failedDestroy = vi.fn();
    const recovered = workingAdapter();
    const prepare = vi.fn(recovered.prepare);
    let positionMs = 30000;
    const getTransport = vi.fn(async () => ({ positionMs, state: 'playing' as const }));
    vi.mocked(soundcloudAdapterFactory)
      .mockImplementationOnce(() => ({
        ...workingAdapter(),
        prepare: async () => {
          throw new Error('first preparation failed');
        },
        destroy: failedDestroy,
      }))
      .mockImplementationOnce(() => ({ ...recovered, prepare, getTransport }));
    render(<LiveMode payload={twoTracks} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByRole('alert').textContent).toContain('first preparation failed');
      expect(failedDestroy).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole('button', { name: 'Skip track' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(soundcloudAdapterFactory).toHaveBeenCalledTimes(2);
      expect(prepare).toHaveBeenCalledExactlyOnceWith(nextTrack, {
        startMs: 30000,
        endMs: 150000,
      });
      expect(getTransport.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(screen.getByText('3:00 / 5:00')).toBeTruthy();
      expect(screen.getByText(/Teaching paused · waiting for music/)).toBeTruthy();

      positionMs = 32000;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      expect(screen.getByText('3:02 / 5:00')).toBeTruthy();
      expect(screen.getByText(/Now teaching · Track/)).toBeTruthy();
      expect(screen.queryByLabelText('Playback recovery')).toBeNull();
    } finally {
      cleanup();
      vi.useRealTimers();
    }
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
    const focal = screen
      .getByLabelText('Bar and count 12.4')
      .closest('[data-live-region="focal"]') as HTMLElement;
    expect(within(focal).getByText('Hands light. Hips lead.')).toBeTruthy();
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();

    expect(screen.getByRole('button', { name: 'Retry music' })).toBeTruthy();
    expect(screen.getByText(/Teaching paused · waiting for music/)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(within(focal).getByText('Hands light. Hips lead.')).toBeTruthy();
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
  });

  it('keeps recovery actions in the scrolling shell when another track can be skipped', async () => {
    const twoTracks = {
      ...payload,
      class: { ...payload.class, totalDurationMs: 300000 },
      tracks: [
        activeTrack,
        {
          ...activeTrack,
          classTrackId: '00000000-0000-4000-8000-0000000000b2',
          position: 1,
          startOffsetMs: 180000,
          track: { ...activeTrack.track, id: 'tr-skip', title: 'Second Track', durationMs: 120000 },
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
    render(<LiveMode payload={twoTracks} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));

    const alert = await screen.findByRole('alert');
    const shell = document.querySelector('div.fixed.inset-0') as HTMLElement;
    expect(shell.className).toContain('overflow-y-auto');
    expect(shell.contains(alert)).toBe(true);
    expect(within(alert).getByRole('button', { name: 'Retry playback' })).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Continue without music' })).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Skip track' })).toBeTruthy();
    expect(shell.contains(screen.getByRole('region', { name: 'Live transport' }))).toBe(true);
  });
});

describe('LiveMode runtime composition', () => {
  const threeTrack = {
    ...payload,
    class: { ...payload.class, totalDurationMs: 390000 },
    tracks: [
      {
        ...activeTrack,
        cues: [
          { id: 'c1', anchorMs: 0, beat: 1, bar: 1, text: 'Settle in', color: null },
          { id: 'c2', anchorMs: 60000, beat: 1, bar: 1, text: 'Climb now', color: null },
        ],
      },
      {
        ...activeTrack,
        classTrackId: '00000000-0000-4000-8000-0000000000a2',
        position: 1,
        startOffsetMs: 180000,
        track: { ...activeTrack.track, id: 'tr-2', title: 'Second Track', durationMs: 120000 },
      },
      {
        ...activeTrack,
        classTrackId: '00000000-0000-4000-8000-0000000000a3',
        position: 2,
        startOffsetMs: 300000,
        track: { ...activeTrack.track, id: 'tr-3', title: 'Third Track', durationMs: 90000 },
      },
    ],
  } as unknown as RunPayload;

  it('puts the next cue in the focal card with the current cue, not across the room', async () => {
    await renderLive(threeTrack);
    // The focal card carries the current cue AND what is coming, so the two are
    // read in one glance. The current cue keeps its own type scale.
    const focal = screen
      .getByLabelText('Bar and count 1.1')
      .closest('[data-live-region="focal"]') as HTMLElement;
    expect(within(focal).getByText('Settle in')).toBeTruthy();
    expect(within(focal).getByText('Next')).toBeTruthy();
    expect(within(focal).getByText('Climb now')).toBeTruthy();
    expect(within(focal).getByLabelText('Time to next cue')).toBeTruthy();
  });

  it('leads the rail with timers and keeps notes ahead of the supporting class shape', async () => {
    await renderLive({
      ...threeTrack,
      tracks: [
        { ...threeTrack.tracks[0]!, notes: 'Watch the new rider\nOffer a seated option' },
        ...threeTrack.tracks.slice(1),
      ],
    });
    const trackTimer = screen.getByText('Track left').closest('div')!;
    const classTimer = screen.getByText('Class left').closest('div')!;
    const guidance = screen.getByText('Full guidance').closest('details')!;
    const notes = screen.getByText(/Watch the new rider/);
    const pulse = screen.getByRole('region', { name: 'Class Pulse' });
    const queue = screen.getByRole('list', { name: 'Choreography queue' });
    const upcoming = screen.getByText('Up next');
    const precedes = (a: Element, b: Element) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(trackTimer).getByText('3:00')).toBeTruthy();
    expect(within(classTimer).getByText('6:30')).toBeTruthy();
    expect(precedes(trackTimer, guidance)).toBe(true);
    expect(precedes(classTimer, guidance)).toBe(true);
    expect(precedes(guidance, notes)).toBe(true);
    expect(precedes(notes, pulse)).toBe(true);
    expect(precedes(pulse, queue)).toBe(true);
    expect(precedes(queue, upcoming)).toBe(true);
    expect(notes.closest('details')).toBeNull();
  });

  it('reveals full current and next guidance without changing music transport or position', async () => {
    const current = 'Hold the climb\nBreathe through the resistance.'.repeat(8);
    const next = 'Stand and reach\nKeep the shoulders relaxed.'.repeat(8);
    const adapter = workingAdapter();
    const play = vi.spyOn(adapter, 'play');
    const pause = vi.spyOn(adapter, 'pause');
    const seek = vi.spyOn(adapter, 'seek');
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    vi.mocked(soundcloudAdapterFactory).mockReturnValue(adapter);
    render(
      <LiveMode
        payload={{
          ...payload,
          tracks: [
            {
              ...activeTrack,
              cues: [{ id: 'long', anchorMs: 0, beat: 1, bar: 1, text: current, color: null }],
              moves: [
                { id: 'next', anchorMs: 60000, beat: 1, bar: 2, name: next, intensity: 'hard' },
              ],
            },
          ],
        }}
        onExit={() => {}}
      />,
    );
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    await screen.findByRole('button', { name: 'Pause' });
    const summary = screen.getByText('Full guidance');
    const details = summary.closest('details')!;
    expect(details.open).toBe(false);
    const before = [play.mock.calls.length, pause.mock.calls.length, seek.mock.calls.length];
    const position = screen.getByRole('slider', { name: 'Seek class timeline' });
    const beforePosition = position.getAttribute('aria-valuenow');
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    expect(within(details).getByText('Current cue')).toBeTruthy();
    expect(within(details).getByText('Next move')).toBeTruthy();
    for (const text of [current, next]) {
      const full = within(details).getByText(
        (_, node) => node?.tagName === 'P' && node.textContent === text,
      );
      expect(full.textContent).toBe(text);
      expect(full.className).toContain('whitespace-pre-wrap');
      expect(full.className).not.toMatch(/truncate|line-clamp/);
    }
    fireEvent.click(summary);
    expect(details.open).toBe(false);
    expect([play.mock.calls.length, pause.mock.calls.length, seek.mock.calls.length]).toEqual(
      before,
    );
    expect(position.getAttribute('aria-valuenow')).toBe(beforePosition);
    expect(within(details).queryByRole('button')).toBeNull();
  });

  it('updates open guidance across cue and track progression and resets on view switching', async () => {
    await renderLive({
      ...threeTrack,
      tracks: [
        threeTrack.tracks[0]!,
        {
          ...threeTrack.tracks[1]!,
          moves: [
            { id: 'm2', anchorMs: 0, beat: null, bar: null, name: 'Reach long', intensity: 'easy' },
          ],
        },
        threeTrack.tracks[2]!,
      ],
    });
    const summary = screen.getByText('Full guidance');
    const details = summary.closest('details')!;
    fireEvent.click(summary);
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    fireEvent.keyDown(slider, { key: 'PageUp' });
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(details.open).toBe(true);
    expect(within(details).getByText('Climb now')).toBeTruthy();
    expect(within(details).queryByText('Settle in')).toBeNull();
    expect(within(details).getByText('End of track')).toBeTruthy();
    for (let i = 0; i < 4; i++) fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(screen.getByText('Full guidance').closest('details')).toBe(details);
    expect(details.open).toBe(true);
    expect(within(details).getByText('Current move')).toBeTruthy();
    expect(within(details).getByText('Reach long')).toBeTruthy();
    const fullList = screen.getByRole('tab', { name: 'Full List' });
    fullList.focus();
    fireEvent.click(fullList);
    expect(document.activeElement).toBe(fullList);
    expect(screen.queryByText('Full guidance')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Cue-by-Cue' }));
    expect(screen.getByText('Full guidance').closest('details')!.open).toBe(false);
  });

  it('keeps the unknown-duration fallback and omits guidance for a sparse track', async () => {
    await renderLive({
      ...payload,
      tracks: [{ ...activeTrack, track: { ...activeTrack.track, durationMs: null } }],
    });
    const timer = screen.getByText('Track left').closest('div')!;
    expect(within(timer).getByText('—')).toBeTruthy();
    expect(within(timer).getByText('No duration set')).toBeTruthy();
    expect(screen.queryByText('Full guidance')).toBeNull();
  });

  it.each(['sparse track', 'intentional gap'] as const)(
    'restores transport focus only when focused guidance disappears into a %s',
    async (destination: 'sparse track' | 'intentional gap') => {
      const shortRun: RunPayload = {
        ...threeTrack,
        class: { ...threeTrack.class, timelineMode: 'free', totalDurationMs: 4000 },
        tracks: [
          {
            ...threeTrack.tracks[0]!,
            track: { ...activeTrack.track, durationMs: 1000 },
            cues: [
              { id: 'short', anchorMs: 0, beat: null, bar: null, text: 'Stay tall', color: null },
            ],
          },
          {
            ...threeTrack.tracks[1]!,
            startOffsetMs: destination === 'intentional gap' ? 3000 : 1000,
            track: { ...threeTrack.tracks[1]!.track, durationMs: 1000 },
          },
        ],
      };
      await renderLive(shortRun);
      vi.useFakeTimers();
      try {
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        const summary = screen.getByText('Full guidance');
        fireEvent.click(summary);
        summary.focus();
        expect(document.activeElement).toBe(summary);
        act(() => vi.advanceTimersByTime(1200));
        expect(screen.queryByText('Full guidance')).toBeNull();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause' }));
      } finally {
        cleanup();
        vi.useRealTimers();
      }
    },
  );

  it('does not steal unrelated focus when sparse-track progression removes guidance', async () => {
    await renderLive(threeTrack);
    const exit = screen.getByRole('button', { name: 'Exit' });
    exit.focus();
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    for (let i = 0; i < 6; i++) fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(screen.queryByText('Full guidance')).toBeNull();
    expect(document.activeElement).toBe(exit);
  });

  it('keeps urgent playback recovery focus ahead of a focused guidance disclosure', async () => {
    let fail: NonNullable<AdapterEvents['onError']> = () => {};
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    vi.mocked(soundcloudAdapterFactory).mockImplementation((events: AdapterEvents) => {
      fail = (error) => events.onError?.(error);
      return workingAdapter();
    });
    render(<LiveMode payload={threeTrack} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    await screen.findByRole('button', { name: 'Pause' });
    const summary = screen.getByText('Full guidance');
    summary.focus();
    act(() => fail({ message: 'Playback stopped during guidance' }));
    expect(document.activeElement).toBe(
      await screen.findByRole('alert', { name: 'Playback recovery' }),
    );
  });

  it('clamps a long cue inside the focal card and scrolls the live shell', async () => {
    const long = 'Hold the climb and breathe through the resistance.'.repeat(8);
    const scripted = {
      ...threeTrack,
      tracks: [
        {
          ...threeTrack.tracks[0],
          cues: [
            { id: 'c-long', anchorMs: 0, beat: 1, bar: 1, text: long, color: null },
            { id: 'c-next', anchorMs: 60000, beat: 1, bar: 2, text: 'Recover now', color: null },
          ],
        },
        ...threeTrack.tracks.slice(1),
      ],
    } as unknown as RunPayload;
    await renderLive(scripted);

    const cue = screen.getAllByText(long).find((node) => node.classList.contains('line-clamp-2'));
    if (!(cue instanceof HTMLElement)) throw new Error('clamped cue missing');
    const focal = cue.closest('[data-live-region="focal"]') as HTMLElement;
    expect(focal.contains(cue)).toBe(true);
    expect(within(focal).getByText('Next')).toBeTruthy();
    expect(within(focal).getByText('Recover now')).toBeTruthy();
    expect(within(focal).getByLabelText('Time to next cue')).toBeTruthy();
    // Next sits outside the clamped paragraph, so the full cue cannot push it
    // out of the card by growing that paragraph.
    expect(cue.contains(within(focal).getByText('Next'))).toBe(false);
    expect(cue.classList.contains('shrink-0')).toBe(true);
    expect(cue.parentElement?.contains(within(focal).getByText('Next'))).toBe(false);

    const shell = document.querySelector('div.fixed.inset-0') as HTMLElement;
    expect(shell.className).toContain('overflow-y-auto');
    expect(shell.className).not.toContain('flex-col');
    const teaching = shell.querySelector('[data-live-region="teaching"]') as HTMLElement;
    expect(teaching.className).toContain('flex-1');
    expect(teaching.className).not.toContain('min-h-0');
    expect(teaching.className).not.toContain('overflow-auto');
    expect(shell.contains(screen.getByRole('region', { name: 'Live transport' }))).toBe(true);
    expect(shell.contains(screen.getByRole('button', { name: 'Previous track' }))).toBe(true);
    expect(shell.contains(screen.getByRole('button', { name: 'Play' }))).toBe(true);
    expect(shell.contains(screen.getByRole('button', { name: /Next track/ }))).toBe(true);

    await waitFor(() => {
      expect(
        Array.from(document.querySelectorAll('[aria-live="assertive"]')).some((node) =>
          node.textContent?.includes(long),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Full List' }));
    const listed = screen.getByText(long);
    expect(listed.className).not.toContain('line-clamp');
    expect(listed.textContent).toBe(long);
  });

  it('spends the rail tail on the rest of the run of show, read-only', async () => {
    await renderLive(threeTrack);
    const upNext = screen.getByText('Up next').closest('div[class*="rounded-card"]') as HTMLElement;
    expect(within(upNext).getByText('Second Track')).toBeTruthy();
    expect(within(upNext).getByText('Third Track')).toBeTruthy();
    // Orientation only — nothing here can change the class mid-run.
    expect(within(upNext).queryByRole('button')).toBeNull();
  });

  it('shows a rolling current-and-upcoming choreography queue with derived intervals', async () => {
    const choreographed = {
      ...threeTrack,
      tracks: [
        {
          ...threeTrack.tracks[0],
          moves: [
            {
              id: 'm1',
              anchorMs: 30000,
              beat: 1,
              bar: 9,
              name: 'Stand and climb',
              intensity: 'hard',
            },
          ],
        },
        ...threeTrack.tracks.slice(1),
      ],
    } as unknown as RunPayload;

    await renderLive(choreographed);
    const queue = screen.getByRole('list', { name: 'Choreography queue' });
    const current = within(queue).getByText('Settle in').closest('li');
    expect(current?.getAttribute('aria-current')).toBe('step');
    expect(within(current as HTMLElement).getByText('0:30 left')).toBeTruthy();
    expect(within(queue).getByText('Stand and climb')).toBeTruthy();
    expect(within(queue).getByText('Climb now')).toBeTruthy();
    expect(
      within(queue)
        .getAllByLabelText('Duration')
        .map((node) => node.textContent),
    ).toEqual(['0:30', '2:00']);
  });

  it('moves to the previous and next track from the primary transport', async () => {
    await renderLive(threeTrack);
    const previous = screen.getByRole('button', { name: 'Previous track' });
    const next = screen.getByRole('button', { name: 'Next track, Second Track' });
    expect((previous as HTMLButtonElement).disabled).toBe(true);
    expect((next as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(next);
    expect(screen.getByText(/Ready · Track 2 of 3/)).toBeTruthy();
    expect((previous as HTMLButtonElement).disabled).toBe(false);
    expect(previous.getAttribute('aria-label')).toBe('Previous track, Active Track');
    expect(next.getAttribute('aria-label')).toBe('Next track, Third Track');

    fireEvent.click(next);
    expect(screen.getByText(/Ready · Track 3 of 3/)).toBeTruthy();
    expect((next as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(previous);
    expect(screen.getByText(/Ready · Track 2 of 3/)).toBeTruthy();
  });

  it('moves to the next track while provider playback is running', async () => {
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection]);
    render(<LiveMode payload={threeTrack} onExit={() => {}} />);
    await screen.findByRole('list', { name: 'Track playback check' });
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next track, Second Track' }));
    expect(screen.getByText(/Teaching paused · waiting for music · Track 2 of 3/)).toBeTruthy();
    expect(await screen.findByText(/Now teaching · Track 2 of 3/)).toBeTruthy();
  });

  it('prints no up-next shelf on the last track rather than an empty one', async () => {
    await renderLive();
    expect(screen.queryByText('Up next')).toBeNull();
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

  it('does not invent a countdown for final choreography without a track duration', async () => {
    const durationless = {
      ...payload,
      tracks: [
        {
          ...activeTrack,
          track: { ...activeTrack.track, durationMs: null },
          cues: [
            {
              id: 'c-durationless',
              anchorMs: 0,
              beat: 1,
              bar: 1,
              text: 'Hold steady',
              color: null,
            },
          ],
        },
      ],
    } satisfies RunPayload;
    await renderLive(durationless);

    const remaining = screen.getByLabelText('Time remaining in current choreography');
    expect(remaining.textContent).toBe('—');
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

describe('choreographyQueueAt', () => {
  const events: TimelineEvent[] = [
    {
      atMs: 10000,
      kind: 'cue',
      text: 'Prepare',
      color: null,
      intensity: null,
      beat: 1,
      bar: 1,
    },
    {
      atMs: 30000,
      kind: 'move',
      text: 'Climb',
      color: null,
      intensity: 'hard',
      beat: 1,
      bar: 9,
    },
    {
      atMs: 60000,
      kind: 'cue',
      text: 'Recover',
      color: null,
      intensity: null,
      beat: 1,
      bar: 17,
    },
  ];

  it('shows upcoming choreography before the first anchor', () => {
    expect(choreographyQueueAt(events, 0, 90000, 2)).toEqual([
      { event: events[0], state: 'upcoming', durationMs: 20000, remainingMs: null },
      { event: events[1], state: 'upcoming', durationMs: 30000, remainingMs: null },
    ]);
  });

  it('counts down the current interval and limits the forward window', () => {
    expect(choreographyQueueAt(events, 45000, 90000, 2)).toEqual([
      { event: events[1], state: 'current', durationMs: 30000, remainingMs: 15000 },
      { event: events[2], state: 'upcoming', durationMs: 30000, remainingMs: null },
    ]);
  });

  it('does not invent a final interval when the track duration is unset', () => {
    expect(choreographyQueueAt(events, 70000, null)).toEqual([
      { event: events[2], state: 'current', durationMs: null, remainingMs: null },
    ]);
  });
});

describe('LiveMode tempo-forward HUD', () => {
  it('pairs the tempo with the cue as one focal object (no duplicate side-rail vitals)', async () => {
    await renderLive();
    // Tempo is prominent but subordinate to the cue (OD-02 / SPC-17), paired in
    // the focal footer with effort. getByText enforces a single occurrence, so it
    // also locks the old standalone rail "Vitals" card as removed (folded into
    // the focal footer), not rendered twice.
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
    expect(transport.contains(slider)).toBe(true);
    expect(slider.parentElement?.className).toContain('col-span-full');
    expect(slider.parentElement?.className).toContain('min-w-0');
    // Clock starts at 0:00 / 3:00; a right-arrow nudges +5s.
    expect(screen.getByText('0:00 / 3:00')).toBeTruthy();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('0:05 / 3:00')).toBeTruthy();
    expect(slider.getAttribute('aria-valuenow')).toBe('5000');
  });

  it('drags the playhead through every move and only settles on release (SPC-16)', async () => {
    await renderLive();
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      width: 180000,
      left: 0,
      right: 180000,
      top: 0,
      bottom: 40,
      height: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerDown(slider, { clientX: 30000, pointerId: 1 });
    expect(slider.getAttribute('aria-valuenow')).toBe('30000');
    fireEvent.pointerMove(slider, { clientX: 60000, buttons: 1 });
    expect(slider.getAttribute('aria-valuenow')).toBe('60000');
    fireEvent.pointerMove(slider, { clientX: 90000, buttons: 1 });
    expect(slider.getAttribute('aria-valuenow')).toBe('90000');
    // The header readout mirrors the same position once released.
    fireEvent.pointerUp(slider);
    expect(screen.getByText('1:30 / 3:00')).toBeTruthy();
  });

  it('keeps the timeline ticking every frame during playback (SPC-18)', async () => {
    await renderLive();
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
      act(() => {
        vi.advanceTimersByTime(16);
      });
      const afterOneFrame = Number(slider.getAttribute('aria-valuenow'));
      expect(afterOneFrame).toBeGreaterThan(0);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      const afterMoreFrames = Number(slider.getAttribute('aria-valuenow'));
      expect(afterMoreFrames).toBeGreaterThan(afterOneFrame);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resumes from the exact pause position, not a stale throttled one (SPC-18 endSegment flush)', async () => {
    await renderLive();
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      // Advance well under the ~200ms display-throttle window, then pause —
      // without the endSegment flush, the throttled readout (and a resume)
      // would be stuck at the last flush instead of this exact position.
      act(() => {
        vi.advanceTimersByTime(80);
      });
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(screen.getByText('0:00 / 3:00')).toBeTruthy(); // fmt() rounds to whole seconds
      const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
      const pausedAt = Number(slider.getAttribute('aria-valuenow'));
      expect(pausedAt).toBeGreaterThanOrEqual(79);
      expect(pausedAt).toBeLessThanOrEqual(81);
    } finally {
      vi.useRealTimers();
    }
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

describe('Live browser authorization gate', () => {
  it('checks Apple consent before even a later mixed-provider track, and rejects expiry on Start', async () => {
    const apple = {
      ...activeTrack,
      classTrackId: 'later-apple',
      position: 1,
      startOffsetMs: 180000,
      providerRefs: [
        { provider: 'apple_music' as const, providerTrackId: 'apple-id', providerUri: null },
      ],
    };
    vi.mocked(listConnections).mockResolvedValue([soundcloudConnection, appleMusicConnection]);
    const instance = {
      isAuthorized: false,
      authorize: vi.fn(async () => {
        instance.isAuthorized = true;
        return 'music-user-token';
      }),
    };
    vi.mocked(prepareAppleMusic).mockResolvedValue(
      instance as unknown as Awaited<ReturnType<typeof prepareAppleMusic>>,
    );
    render(
      <LiveMode
        payload={{
          ...payload,
          tracks: [activeTrack, apple],
          class: { ...payload.class, totalDurationMs: 360000 },
        }}
        onExit={() => {}}
      />,
    );
    await screen.findByText('Selected: Apple Music');
    const start = screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Check Apple Music authorization' }));
    const consent = await screen.findByRole('button', { name: 'Authorize Apple Music' });
    expect(instance.authorize).not.toHaveBeenCalled();
    expect(soundcloudAdapterFactory).not.toHaveBeenCalled();
    fireEvent.click(consent);
    expect(instance.authorize).toHaveBeenCalledOnce();
    await waitFor(() => expect(start.disabled).toBe(false));
    instance.isAuthorized = false;
    fireEvent.click(start);
    expect(soundcloudAdapterFactory).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Run without music' }));
    expect(await screen.findByRole('button', { name: 'Play' })).toBeTruthy();
  });
});

it('requires an explicit Spotify activation tap before starting a mixed-provider class', async () => {
  const spotify = {
    ...activeTrack,
    classTrackId: 'later-spotify',
    position: 1,
    startOffsetMs: 180000,
    providerRefs: [
      { provider: 'spotify' as const, providerTrackId: 'spotify-id', providerUri: null },
    ],
  };
  vi.mocked(listConnections).mockResolvedValue([
    { ...soundcloudConnection, provider: 'spotify', scope: 'streaming' },
  ]);
  const activateElement = vi.fn().mockResolvedValue(undefined);
  const player = {
    activateElement,
  } as unknown as import('../lib/spotify-playback.js').SpotifyPlayer;
  vi.mocked(getSpotifyPlayback).mockResolvedValue({ player, deviceId: 'qa' });
  render(
    <LiveMode
      payload={{
        ...payload,
        tracks: [activeTrack, spotify],
        class: { ...payload.class, totalDurationMs: 360000 },
      }}
      onExit={() => {}}
    />,
  );
  await screen.findByText('Selected: Spotify');
  const start = screen.getByRole('button', { name: 'Start class' }) as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Prepare Spotify playback' }));
  const enable = await screen.findByRole('button', { name: 'Enable Spotify playback' });
  expect(activateElement).not.toHaveBeenCalled();
  expect(soundcloudAdapterFactory).not.toHaveBeenCalled();
  fireEvent.click(enable);
  expect(activateElement).toHaveBeenCalledOnce();
  await waitFor(() => expect(start.disabled).toBe(false));
  fireEvent.click(start);
  await waitFor(() => expect(soundcloudAdapterFactory).toHaveBeenCalledOnce());
});
