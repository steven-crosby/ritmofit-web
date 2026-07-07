// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ClassTrack, ClassWithAccess, ClassListItem, RunPayload } from '@ritmofit/shared';
import { Dashboard } from './Dashboard.js';
import * as api from '../lib/api.js';
import type { ClassListPage } from '../lib/api.js';
import {
  hasDismissedOnboardingVideo,
  markOnboardingVideoPending,
} from '../lib/onboarding-video.js';

vi.mock('../lib/api.js');
// Dashboard imports the auth client for "Sign out"; stub it so the module's
// real network/session setup never runs under the test.
vi.mock('../lib/auth-client.js', () => ({
  authClient: { signOut: vi.fn() },
}));

/** A promise whose resolution we control, to model a slow in-flight request. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let classSeq = 0;
function makeClass(
  title: string,
  accessLevel: ClassWithAccess['accessLevel'] = 'owner',
  ownerUserId = 'me',
) {
  classSeq += 1;
  const id = `00000000-0000-4000-8000-${String(classSeq).padStart(12, '0')}`;
  return {
    id,
    ownerUserId,
    title,
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    createdAt: classSeq,
    updatedAt: classSeq,
    lastOpenedAt: null,
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
    accessLevel,
    trackCount: 0,
    totalDurationMs: 0,
    albumArtUrls: [],
  } satisfies ClassListItem;
}

function page(items: ClassListItem[]): ClassListPage {
  return { items, nextCursor: null };
}

function spotifyConnection(scope = 'user-library-read streaming') {
  return {
    id: 'conn-spotify',
    userId: 'me',
    provider: 'spotify',
    providerUserId: 'spotify-user',
    scope,
    expiresAt: null,
    createdAt: 1,
    updatedAt: 1,
  } as const;
}

function renderDashboard() {
  return render(<Dashboard userId="me" userName="Tester" />);
}

function installLocalStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, String(value)),
  } satisfies Storage;

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorage,
  });
}

beforeEach(() => {
  installLocalStorage();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage?.clear();
});

describe('Dashboard class library states', () => {
  it('shows the loading state, then the class list once it resolves', async () => {
    const classes = deferred<ClassListPage>();
    vi.mocked(api.listClasses).mockReturnValue(classes.promise);

    renderDashboard();
    // The rail is in its loading state until the first request resolves — it must
    // not flash the "no classes yet" empty state first.
    expect(screen.getByText('Loading your classes…')).toBeTruthy();

    await act(async () => {
      classes.resolve(page([makeClass('Morning ride')]));
      await classes.promise;
    });

    expect(await screen.findByText('Morning ride')).toBeTruthy();
    expect(screen.queryByText('Loading your classes…')).toBeNull();
    // With classes present but none selected, the workspace stays alive with readiness/source shelves.
    expect(screen.getByRole('heading', { name: 'Choose what to shape next' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Provider shelves' })).toBeTruthy();
  });

  it('shows a distinct error state when the class list fails to load, and retries', async () => {
    vi.mocked(api.listClasses).mockRejectedValueOnce(new Error('network down'));

    renderDashboard();

    expect(await screen.findByText('Couldn’t load your classes.')).toBeTruthy();
    // The top-level banner surfaces the underlying message too.
    expect(screen.getByText('network down')).toBeTruthy();

    // Retry actually re-fetches and recovers — not just dead-end "try again" copy.
    vi.mocked(api.listClasses).mockResolvedValueOnce(page([makeClass('Recovered ride')]));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Recovered ride')).toBeTruthy();
  });

  it('shows the empty state when the library is genuinely empty', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));

    renderDashboard();

    expect(await screen.findByText(/No classes yet/)).toBeTruthy();
  });

  it('guides a brand-new instructor with a first-run workspace when the library is empty', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));

    renderDashboard();

    // A true first run has no class to derive from, so it orients to templates
    // and music sources rather than the old blank/select prompt.
    expect(
      await screen.findByRole('heading', { name: 'Start with a class template' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Provider shelves' })).toBeTruthy();
    expect(screen.queryByText('Select a class to keep building.')).toBeNull();
  });

  it('opens connections from the resting provider shelves', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Provider shelves' })).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open music connections from provider shelves' }),
    );

    expect(await screen.findByRole('dialog', { name: 'Music connections' })).toBeTruthy();
  });

  it('shows connected Spotify saved playlists in the resting shelf and opens the browser dialog', async () => {
    const playlist = {
      provider: 'spotify' as const,
      playlistId: 'pl-1',
      name: 'Warmup Ride',
      ownerName: 'Steven',
      trackCount: 24,
      coverImageUrl: 'https://i.scdn.co/image/pl-1.jpg',
    };
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      playlist,
      {
        provider: 'spotify',
        playlistId: 'pl-2',
        name: 'Cooldown Flow',
        ownerName: 'Steven',
        trackCount: 18,
        coverImageUrl: null,
      },
    ]);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([
      {
        provider: 'spotify',
        providerTrackId: 'track-1',
        title: 'Climb Track',
        artist: 'DJ Test',
        durationMs: 180000,
        albumArtUrl: null,
        providerUri: 'spotify:track:track-1',
      },
    ]);

    renderDashboard();

    // Shelf summary text appears once playlists load.
    const browseBtn = await screen.findByRole('button', {
      name: /2 saved playlists: Warmup Ride/i,
    });
    expect(browseBtn).toBeTruthy();

    // Clicking opens the browse dialog, then a playlist detail before class creation.
    fireEvent.click(browseBtn);
    expect(await screen.findByRole('dialog', { name: 'Browse Spotify playlists' })).toBeTruthy();
    expect(screen.getByText('Warmup Ride')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Warmup Ride' }));
    expect(await screen.findByRole('heading', { name: 'Warmup Ride' })).toBeTruthy();
    expect(screen.getByText('Climb Track')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start class from Warmup Ride' })).toBeTruthy();
  });

  it('omits the redundant ownership chip on library cards (solo-first library is owner-only)', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([makeClass('My ride')]));

    renderDashboard();

    expect(await screen.findByText('My ride')).toBeTruthy();
    expect(screen.queryByText('owner')).toBeNull();
  });

  it('keeps the top bar solo-first and hides classes owned by other users', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(
      page([
        makeClass('My Monday class'),
        makeClass('Shared studio class', 'view', 'someone-else'),
      ]),
    );

    renderDashboard();

    expect(await screen.findByText('My Monday class')).toBeTruthy();
    expect(screen.queryByText('Shared studio class')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Explore' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Teams' })).toBeNull();
  });

  it('uses Classes, Music, Live, and Account as the primary destinations', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.getMe).mockResolvedValue({
      id: 'me',
      email: 'tester@example.com',
      displayName: 'Tester',
      imageUrl: null,
      createdAt: 1,
      updatedAt: 1,
    });

    renderDashboard();

    expect(
      (await screen.findByRole('button', { name: 'Classes' })).getAttribute('aria-current'),
    ).toBe('page');
    expect(screen.getByRole('button', { name: 'Music' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Live' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Account' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Songs by move' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Connections' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Music' }));
    expect(
      await screen.findByRole('heading', { name: 'Browse music, then shape it into class.' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Music' }).getAttribute('aria-current')).toBe('page');

    fireEvent.click(screen.getByRole('button', { name: 'Live' }));
    expect(await screen.findByRole('heading', { name: 'Pick a class to run.' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(await screen.findByRole('heading', { name: 'Personal workspace' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Provider accounts' })).toBeTruthy();
  });

  it('surfaces runnable classes from the Live destination', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(
      page([
        {
          ...makeClass('Ready ride', 'owner', 'me'),
          trackCount: 3,
          totalDurationMs: 1800000,
        },
        { ...makeClass('Draft shell', 'owner', 'me'), trackCount: 0, totalDurationMs: 0 },
      ]),
    );
    vi.mocked(api.getRunPayload).mockResolvedValue({
      version: 1,
      class: {
        id: '00000000-0000-4000-8000-000000000101',
        title: 'Ready ride',
        template: 'cycle',
        totalDurationMs: 1800000,
        timelineMode: 'sequential',
        sections: [],
      },
      tracks: [
        {
          classTrackId: 'ct-1',
          startOffsetMs: 0,
          displayBpm: 128,
          intensity: 'mod',
          notes: null,
          clipStartMs: 0,
          providerRefs: [],
          track: {
            id: 'track-1',
            title: 'Ready Track',
            artist: 'Artist',
            durationMs: 1800000,
            albumArtUrl: null,
            displayBpm: null,
          },
          cues: [],
          moves: [],
        },
      ],
    });

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    expect(await screen.findByText('Ready ride')).toBeTruthy();
    expect(screen.queryByText('Draft shell')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Run live' }));
    await waitFor(() => expect(api.getRunPayload).toHaveBeenCalledTimes(1));
  });

  it('browses a connected source from the Music workspace sidebar', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        name: 'Warmup Ride',
        ownerName: 'Steven',
        trackCount: 24,
        coverImageUrl: null,
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    // The Sources sidebar entry browses the provider once its playlists load.
    const sourceBtn = await screen.findByRole('button', { name: 'Browse Spotify playlists' });
    fireEvent.click(sourceBtn);
    expect(await screen.findByRole('dialog', { name: 'Browse Spotify playlists' })).toBeTruthy();
  });
});

describe('Dashboard onboarding video', () => {
  it('opens the guided tutorial after first signup and dismisses it once', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    markOnboardingVideoPending();

    renderDashboard();

    const dialog = await screen.findByRole('dialog', { name: 'New instructor tutorial video' });
    expect(within(dialog).getByText('Build your first class in one loop')).toBeTruthy();
    expect(within(dialog).queryByText(/Teams/i)).toBeNull();
    expect(within(dialog).queryByText(/Explore/i)).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start building' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'New instructor tutorial video' })).toBeNull(),
    );
    expect(hasDismissedOnboardingVideo()).toBe(true);
  });

  it('does not show the tutorial without a pending signup marker', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));

    renderDashboard();

    await screen.findByText(/No classes yet/);
    expect(screen.queryByRole('dialog', { name: 'New instructor tutorial video' })).toBeNull();
  });
});

describe('Dashboard class detail', () => {
  it('opens a selected class into its workspace', async () => {
    const ride = makeClass('Sunset climb');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([] as ClassTrack[]);
    // No run payload is fine — the workspace renders from the persisted tracks.
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Sunset climb/ }));

    expect(await screen.findByRole('heading', { name: 'Sunset climb' })).toBeTruthy();
    expect(screen.getByText(/No tracks yet/)).toBeTruthy();
  });

  it('keeps the newly selected class when a slower prior load resolves late', async () => {
    const first = makeClass('First ride');
    const second = makeClass('Second ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([first, second]));
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));

    const firstTracks = deferred<ClassTrack[]>();
    vi.mocked(api.listClassTracks).mockImplementation((classId: string) =>
      classId === first.id ? firstTracks.promise : Promise.resolve([] as ClassTrack[]),
    );

    renderDashboard();
    // Select the slow class, then immediately switch to the fast one.
    fireEvent.click(await screen.findByRole('button', { name: /^First ride/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Second ride/ }));

    expect(await screen.findByRole('heading', { name: 'Second ride' })).toBeTruthy();

    // The earlier request now resolves out of order; its stale response must not
    // overwrite the detail under the currently selected class header.
    await act(async () => {
      firstTracks.resolve([]);
      await firstTracks.promise;
    });

    expect(screen.getByRole('heading', { name: 'Second ride' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'First ride' })).toBeNull();
  });

  it('renders a retry affordance when a class detail fails, and reloads on retry', async () => {
    const ride = makeClass('Broken ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.listClassTracks)
      .mockRejectedValueOnce(new Error('detail boom'))
      .mockResolvedValue([] as ClassTrack[]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Broken ride/ }));

    expect(await screen.findByText('detail boom')).toBeTruthy();
    const retry = screen.getByRole('button', { name: 'Retry class' });

    fireEvent.click(retry);

    // The second load succeeds, so the workspace replaces the error panel.
    expect(await screen.findByRole('heading', { name: 'Broken ride' })).toBeTruthy();
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
  });

  it('updates the Library card aggregates in place once a class detail loads', async () => {
    // The list returns the class with stale (zero) aggregates; opening it loads a
    // run-payload with two tracks, and the rail card must reflect that immediately.
    const ride = makeClass('Stale card');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([{}, {}] as ClassTrack[]);
    vi.mocked(api.getRunPayload).mockResolvedValue({
      class: { totalDurationMs: 420_000 },
      tracks: [{ track: { albumArtUrl: 'https://art/x.jpg' } }, { track: { albumArtUrl: null } }],
    } as unknown as RunPayload);

    renderDashboard();
    // Initially the card shows 0 tracks (the list response's aggregate).
    expect(await screen.findByRole('button', { name: /^Stale card.*0 tracks/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Stale card/i }));

    // After the detail (run-payload) loads, the rail card reflects 2 tracks · 7:00.
    expect(
      await screen.findByRole('button', { name: /^Stale card.*2 tracks.*7:00/i }),
    ).toBeTruthy();
  });

  it('submits manually added track durations as parsed minutes and seconds', async () => {
    const ride = makeClass('Manual ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([] as ClassTrack[]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.addTrack).mockResolvedValue({} as ClassTrack);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Manual ride/ }));
    const durationInputs = await screen.findAllByLabelText('Track duration in minutes and seconds');
    const durationInput = durationInputs[0];
    if (!durationInput) throw new Error('Expected a manual track duration input.');
    const form = durationInput.closest('form');
    if (!form) throw new Error('Expected the duration input to live inside a form.');
    const addTrackForm = within(form as HTMLFormElement);

    fireEvent.change(addTrackForm.getByLabelText('Track title'), { target: { value: 'Ride On' } });
    fireEvent.change(addTrackForm.getByLabelText('Track artist'), {
      target: { value: 'The Tempo' },
    });
    fireEvent.change(durationInput, { target: { value: '4:05' } });
    fireEvent.click(addTrackForm.getByRole('button', { name: 'Add track' }));

    await waitFor(() =>
      expect(api.addTrack).toHaveBeenCalledWith(ride.id, {
        track: {
          title: 'Ride On',
          artist: 'The Tempo',
          durationMs: 245000,
        },
        intensity: 'mod',
      }),
    );
  });
});
