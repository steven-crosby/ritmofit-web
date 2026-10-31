// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type {
  ClassPlanBlock,
  ClassTrack,
  ClassWithAccess,
  ClassListItem,
  Provider,
  RunPayload,
} from '@ritmofit/shared';
import { Dashboard } from './Dashboard.js';
import { UpdatePrompt } from './UpdatePrompt.js';
import * as api from '../lib/api.js';
import { rememberConnectionReturn } from '../lib/connection-return.js';
import { isLiveActive } from '../lib/session-guard.js';
import type { ClassListPage } from '../lib/api.js';
import {
  hasDismissedOnboardingVideo,
  markOnboardingVideoPending,
} from '../lib/onboarding-video.js';

vi.mock('../lib/api.js');

// Lets one test crash the builder below Dashboard's destination boundary.
const crash = vi.hoisted(() => ({ planBlocks: false }));
vi.mock('./ClassPlanBlocks.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ClassPlanBlocks.js')>();
  return {
    ...actual,
    ClassPlanBlocks: (props: Parameters<typeof actual.ClassPlanBlocks>[0]) => {
      if (crash.planBlocks) throw new Error('builder render crash');
      return <actual.ClassPlanBlocks {...props} />;
    },
  };
});

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
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
    scaffoldRecipeId: null,
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

/** Leave the full-focus builder when it is open, then open a class from Classes. */
async function openClassFromClasses(title: string) {
  const back = screen.queryByRole('button', { name: 'Back to Classes' });
  if (back) fireEvent.click(back);
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${title}$`) }));
}

/**
 * Build a run-payload for the Live queue's per-class readiness fetch. Override
 * `durationMs` (null = missing → blocks Live) and `providerRefs` per track to drive
 * the four readiness dimensions.
 */
function liveRunPayload(
  tracks: Array<{
    classTrackId: string;
    durationMs: number | null;
    baseDurationMs?: number | null;
    title?: string;
    providerRefs?: unknown[];
    displayBpm?: number | null;
  }>,
): RunPayload {
  return {
    schemaVersion: 1,
    class: {
      id: '00000000-0000-4000-8000-000000000101',
      title: 'Class',
      template: 'cycle',
      targetDurationMs: null,
      totalDurationMs: 1800000,
      timelineMode: 'sequential',
    },
    tracks: tracks.map((t, index) => ({
      classTrackId: t.classTrackId,
      position: index,
      startOffsetMs: 0,
      displayBpm: t.displayBpm ?? 128,
      displayRpm: null,
      holdCount: null,
      intensity: 'mod',
      notes: null,
      clipStartMs: 0,
      beatAnchorMs: 0,
      providerRefs: t.providerRefs ?? [],
      track: {
        id: `track-${index}`,
        title: t.title ?? `Track ${index}`,
        artist: 'Artist',
        durationMs: t.durationMs,
        baseDurationMs: t.baseDurationMs === undefined ? t.durationMs : t.baseDurationMs,
        albumArtUrl: null,
        displayBpm: null,
      },
      cues: [],
      moves: [],
    })),
  } as unknown as RunPayload;
}

/** A persisted class-track whose id matches the run-payload `classTrackId`, so the
 *  inspector's selection/removal resolves against it. Only the fields the inspector
 *  reads need to be real; the rest are cast through `unknown`. */
function makeClassTrack(
  id: string,
  position: number,
  over: Partial<
    Pick<
      ClassTrack,
      'clipStartMs' | 'clipEndMs' | 'durationMsOverride' | 'beatAnchorMs' | 'startOffsetMs'
    >
  > = {},
): ClassTrack {
  return {
    id,
    classId: 'class-1',
    trackId: `track-${position}`,
    position,
    intensity: 'mod',
    displayBpmOverride: null,
    displayRpm: null,
    holdCount: null,
    durationMsOverride: over.durationMsOverride ?? null,
    clipStartMs: over.clipStartMs ?? 0,
    clipEndMs: over.clipEndMs ?? null,
    beatAnchorMs: over.beatAnchorMs ?? null,
    startOffsetMs: over.startOffsetMs ?? null,
    notes: null,
    createdAt: position,
    updatedAt: position,
  } as unknown as ClassTrack;
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

function manageMusicConnections() {
  fireEvent.click(screen.getByRole('button', { name: 'Manage connections' }));
}

async function selectMusicService(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name},`) }));
}

async function openSavedPlaylist(service: string, playlistName: string) {
  await selectMusicService(service);
  fireEvent.click(await screen.findByRole('button', { name: `Open ${playlistName}` }));
}

async function openLikedSongs(service = 'Spotify') {
  await selectMusicService(service);
  fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Create class from liked songs' }));
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
  const committed = new Map<string, ClassTrack[]>();
  vi.mocked(api.importClassTracks).mockImplementation(
    async (classId: string, body: Parameters<typeof api.importClassTracks>[1]) => {
      const rows = committed.get(classId) ?? [];
      for (const placement of body.placements)
        if (!rows.some((r) => r.id === placement.id))
          rows.push({
            ...makeClassTrack(placement.id, rows.length),
            classId,
            trackId: placement.trackId,
          });
      const ordered = body.orderedIds.map((id, position) => ({
        ...rows.find((r) => r.id === id)!,
        position,
      }));
      committed.set(classId, ordered);
      vi.mocked(api.listClassTracks).mockImplementation(
        async (id: string) => committed.get(id) ?? [],
      );
      return ordered;
    },
  );
  vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
  // Liked songs load in pages (RF-132). Tests that stub `listLikes` with one array
  // get it as a single last page; paging tests stub `listLikesPage` directly.
  vi.mocked(api.listLikesPage).mockImplementation(async (provider: Provider) => {
    const rows = await api.listLikes(provider);
    return { items: Array.isArray(rows) ? rows : [], nextCursor: null };
  });
});

afterEach(() => {
  cleanup();
  crash.planBlocks = false;
  vi.clearAllMocks();
  window.localStorage?.clear();
  // The class ordering is session state shared by Classes and Live, so it really
  // does survive a re-render — clear it or one test's switch is the next one's
  // default.
  window.sessionStorage?.clear();
});

describe('Dashboard class library states', () => {
  it('shows the loading state, then the class list once it resolves', async () => {
    const classes = deferred<ClassListPage>();
    vi.mocked(api.listClasses).mockReturnValue(classes.promise);

    renderDashboard();
    // The resting home is in its loading state until the first request resolves —
    // it must not flash the empty-library start first.
    expect(screen.getByRole('status', { name: 'Loading your classes' })).toBeTruthy();
    expect(screen.queryByText(/Ritmo is checking classes/)).toBeNull();

    await act(async () => {
      classes.resolve(page([makeClass('Morning ride')]));
      await classes.promise;
    });

    expect((await screen.findAllByText('Morning ride')).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('status', { name: 'Loading your classes' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Your Classes' })).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Pick up where the energy left off.' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ready to teach' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Needs work' })).toBeNull();
  });

  it('puts templates before the class list and keeps Create on the first screen', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([makeClass('Morning ride')]));
    renderDashboard();

    const templates = (
      await screen.findByRole('heading', { name: 'Start from a template' })
    ).closest('section');
    const recents = screen.getByRole('heading', { name: 'Recents' }).closest('section');
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create.closest('header')?.className).toContain('order-1');
    expect(templates?.className).toContain('order-2');
    expect(recents?.className).toContain('order-3');
    expect(create.closest('header')?.className).toContain('sticky');
    expect(screen.getByRole('button', { name: 'Morning ride' })).toBeTruthy();
  });

  it('opens the create dialog from the empty Classes home', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
    fireEvent.click(screen.getByRole('button', { name: 'From a template' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Class title')));
    expect(screen.getByRole('dialog', { name: 'Create a class' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '45 min' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('creates a scaffold class from the isolated dialog', async () => {
    const created = makeClass('Saturday ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.createClass).mockResolvedValue(
      created as Awaited<ReturnType<typeof api.createClass>>,
    );
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
    fireEvent.click(screen.getByRole('button', { name: 'From a template' }));
    fireEvent.change(screen.getByLabelText('Class title'), { target: { value: 'Saturday ride' } });
    const dialog = screen.getByRole('dialog', { name: 'Create a class' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cycle' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create class' }));

    await waitFor(() =>
      expect(api.createClass).toHaveBeenCalledWith({
        mode: 'scaffold',
        title: 'Saturday ride',
        recipeId: 'cycle_45_v2',
      }),
    );
  });

  it('focuses Add a playlist after creating an empty class', async () => {
    const created = makeClass('Blank ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.createClass).mockResolvedValue(
      created as Awaited<ReturnType<typeof api.createClass>>,
    );
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
    fireEvent.click(screen.getByRole('button', { name: 'New class' }));
    fireEvent.change(screen.getByLabelText('Class title'), { target: { value: 'Blank ride' } });
    const dialog = screen.getByRole('dialog', { name: 'Create a class' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cycle' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create empty class' }));

    const addPlaylist = await screen.findByRole('button', { name: 'Add a playlist' });
    await waitFor(() => expect(document.activeElement).toBe(addPlaylist));
    expect(addPlaylist.className).toContain('rf-btn-primary');
  });

  it('opens a class in full focus without the class list', async () => {
    const ride = makeClass('Morning ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: /^Morning ride$/ }))[0]!);
    const header = await screen.findByRole('region', { name: 'Class builder' });
    expect(within(header).getByRole('heading', { name: 'Morning ride' })).toBeTruthy();
    expect(within(header).getByText('Cycle')).toBeTruthy();
    expect(within(header).getByRole('button', { name: 'Back to Classes' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
    expect(screen.queryByText('Your classes')).toBeNull();
    expect(screen.queryByText('New class, filters, and search')).toBeNull();
    expect(screen.queryByText('Open')).toBeNull();
  });

  it('shows a distinct error state when the class list fails to load, and retries', async () => {
    vi.mocked(api.listClasses).mockRejectedValueOnce(new Error('network down'));

    renderDashboard();

    expect(await screen.findByText('Class library unavailable')).toBeTruthy();
    // The upstream message never reaches the instructor — a stable reference code
    // does, so the owner can still correlate it with logs (P1-05).
    expect(screen.queryByText(/network down/)).toBeNull();
    expect(screen.getByText(/Reference CLS-[0-9A-Z]+\./)).toBeTruthy();
    expect(screen.getByText(/This is not an empty account/)).toBeTruthy();

    // Retry actually re-fetches and recovers — not just dead-end "try again" copy.
    vi.mocked(api.listClasses).mockResolvedValueOnce(page([makeClass('Recovered ride')]));
    fireEvent.click(screen.getByRole('button', { name: 'Try the library again' }));
    expect((await screen.findAllByText('Recovered ride')).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the empty state when the library is genuinely empty', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));

    renderDashboard();

    expect(await screen.findByText('There are no classes yet.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Start from a template' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Jump back in' })).toBeNull();
  });

  it('guides a brand-new instructor with templates when the library is empty', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));

    renderDashboard();

    expect(await screen.findByText('There are no classes yet.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Start from a template' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start from the Cycle template' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start from the Pilates template' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /HIIT/ })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Jump back in' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Find a track or source/ })).toBeNull();
    expect(screen.queryByText('Select a class to keep building.')).toBeNull();
  });

  it('opens connections from Music', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    manageMusicConnections();

    expect(await screen.findByRole('dialog', { name: 'Music connections' })).toBeTruthy();
  });

  it('retries a Music catalog outage without changing the query', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.searchProvider)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([]);
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    const search = screen.getByRole('searchbox', { name: 'Search SoundCloud catalog' });
    fireEvent.change(search, { target: { value: 'climb' } });

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /Couldn’t search SoundCloud right now/,
    );
    expect(screen.queryByText('Failed to fetch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(api.searchProvider).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No matches yet.')).toBeTruthy();
    expect((search as HTMLInputElement).value).toBe('climb');
  });

  it('searches, selects in instructor order, and starts a class from Music', async () => {
    const results = [
      {
        provider: 'soundcloud' as const,
        providerTrackId: 'tr-1',
        providerUri: 'https://soundcloud.com/ritmo/first',
        title: 'First result',
        artist: 'Artist',
        albumArtUrl: null,
        durationMs: 180000,
      },
      {
        provider: 'soundcloud' as const,
        providerTrackId: 'tr-2',
        providerUri: 'https://soundcloud.com/ritmo/second',
        title: 'Second result',
        artist: 'Artist',
        albumArtUrl: null,
        durationMs: 210000,
      },
    ];
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.searchProvider).mockResolvedValue(results);
    vi.mocked(api.createClass).mockResolvedValue(
      makeClass('New music class') as Awaited<ReturnType<typeof api.createClass>>,
    );
    vi.mocked(api.importTrack).mockImplementation(
      async (_provider: Provider, providerTrackId: string) => {
        return { id: `imported-${providerTrackId}` } as Awaited<ReturnType<typeof api.importTrack>>;
      },
    );
    vi.mocked(api.addTrack).mockResolvedValue({} as ClassTrack);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search SoundCloud catalog' }), {
      target: { value: 'climb' },
    });

    expect(await screen.findByText('First result')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select Second result by Artist' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select First result by Artist' }));
    expect(screen.getByText(/2 selected/).textContent).toContain('2 selected');
    fireEvent.click(screen.getByRole('button', { name: 'Start class' }));

    await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(1));
    expect(api.createClass).toHaveBeenCalledWith({
      title: 'New music class',
      template: 'cycle',
    });
    expect(
      vi.mocked(api.importTrack).mock.calls.map((call: [Provider, string]) => call[1]),
    ).toEqual(['tr-2', 'tr-1']);
    expect(screen.getByRole('button', { name: 'Classes' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('shows connected Spotify saved playlists in Music and opens the browser dialog', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openSavedPlaylist('Spotify', 'Warmup Ride');
    const playlistDialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });
    expect(within(playlistDialog).getByRole('heading', { name: 'Warmup Ride' })).toBeTruthy();
    expect(screen.getByText('Climb Track')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start class from Warmup Ride' })).toBeTruthy();
  });

  // Apple Music's library-playlist attributes carry no count, so trackCount arrives
  // null. Reporting that as "0 tracks" told instructors a populated playlist was
  // empty (F-05). The count is omitted instead — never asserted as zero.
  it('omits the playlist track count when the provider does not report one', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-unknown',
        name: 'Count Unknown',
        ownerName: 'Steven',
        trackCount: null,
        coverImageUrl: null,
      },
      {
        provider: 'spotify',
        playlistId: 'pl-known',
        name: 'Count Known',
        ownerName: 'Steven',
        trackCount: 1,
        coverImageUrl: null,
      },
    ]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');

    // No count claimed for the unknown one, and nothing anywhere reads "0 tracks".
    expect(await screen.findByText('Playlist · Steven')).toBeTruthy();
    expect(screen.queryByText(/0 tracks/)).toBeNull();
    // A known count still renders, and singular stays singular.
    expect(screen.getByText('Playlist · Steven · 1 track')).toBeTruthy();
  });

  it('shows connected Spotify liked tracks in Music and opens the likes browser', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikes).mockResolvedValue([
      {
        provider: 'spotify',
        providerTrackId: 'tr-1',
        providerUri: 'spotify:track:tr-1',
        title: 'Levels',
        artist: 'Avicii',
        albumArtUrl: 'https://i.scdn.co/image/tr-1.jpg',
        durationMs: 200000,
      },
      {
        provider: 'spotify',
        providerTrackId: 'tr-2',
        providerUri: null,
        title: 'Wake Me Up',
        artist: 'Avicii',
        albumArtUrl: null,
        durationMs: 240000,
      },
    ]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    expect(await screen.findByText('Levels')).toBeTruthy();
    expect(screen.getByText('Song · Avicii · 3:20')).toBeTruthy();

    // The existing likes browser still holds class creation. Build a class does not.
    fireEvent.click(screen.getByRole('button', { name: 'Create class from liked songs' }));
    const likesDialog = await screen.findByRole('dialog', { name: 'Browse Spotify likes' });
    expect(within(likesDialog).getByText('Levels')).toBeTruthy();
    const createButton = within(likesDialog).getByRole('button', {
      name: 'Create class from 2 liked tracks',
    });
    expect(createButton.parentElement?.className).toContain('flex-col');
    expect(createButton.parentElement?.className).toContain('sm:flex-row');
    expect(createButton.className).toContain('w-full');
    expect(createButton.className).toContain('sm:w-auto');
  });

  it('does not create a class when the provider collection fetch fails', async () => {
    const playlist = {
      provider: 'spotify' as const,
      playlistId: 'pl-fetch-fail',
      name: 'Fetch First',
      ownerName: 'Steven',
      trackCount: 1,
      coverImageUrl: null,
    };
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([playlist]);
    vi.mocked(api.listPlaylistTracks)
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockResolvedValueOnce([
        {
          provider: 'spotify',
          providerTrackId: 'track-1',
          providerUri: null,
          title: 'Recovered Track',
          artist: 'DJ Test',
          durationMs: 180000,
          albumArtUrl: null,
        },
      ]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openSavedPlaylist('Spotify', 'Fetch First');

    expect(await screen.findByText('provider unavailable')).toBeTruthy();
    const start = screen.getByRole('button', {
      name: 'Start class from Fetch First',
    }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    expect(api.createClass).not.toHaveBeenCalled();
    expect(api.listPlaylistTracks).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No tracks found in this playlist.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Recovered Track')).toBeTruthy();
    expect(api.createClass).not.toHaveBeenCalled();
    expect(api.listPlaylistTracks).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Music' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('region', { name: 'Class builder' })).toBeNull();
  });

  it('disables class creation when a saved playlist contains no tracks', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-empty',
        name: 'Empty Ride',
        ownerName: 'Steven',
        trackCount: 0,
        coverImageUrl: null,
      },
    ]);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openSavedPlaylist('Spotify', 'Empty Ride');

    expect(await screen.findByText('No tracks found in this playlist.')).toBeTruthy();
    const createButton = screen.getByRole('button', {
      name: 'Start class from Empty Ride',
    }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(true);
    expect(api.createClass).not.toHaveBeenCalled();
  });

  it('imports the playlist tracks already on screen without refetching', async () => {
    const playlist = {
      provider: 'spotify' as const,
      playlistId: 'pl-emptied',
      name: 'Emptied Ride',
      ownerName: 'Steven',
      trackCount: 1,
      coverImageUrl: null,
    };
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([playlist]);
    vi.mocked(api.listPlaylistTracks).mockResolvedValueOnce([
      {
        provider: 'spotify',
        providerTrackId: 'track-1',
        providerUri: null,
        title: 'Track One',
        artist: 'Artist',
        durationMs: 180000,
        albumArtUrl: null,
      },
    ]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openSavedPlaylist('Spotify', 'Emptied Ride');
    await screen.findByText('Track One');
    fireEvent.click(screen.getByRole('button', { name: 'Start class from Emptied Ride' }));

    await waitFor(() => expect(api.createClass).toHaveBeenCalledTimes(1));
    expect(api.listPlaylistTracks).toHaveBeenCalledTimes(1);
  });

  it('navigates to the class builder after creating a class from a saved playlist', async () => {
    const playlist = {
      provider: 'spotify' as const,
      playlistId: 'pl-warmup',
      name: 'Warmup Ride',
      ownerName: 'Steven',
      trackCount: 1,
      coverImageUrl: null,
    };
    const created = makeClass('Warmup Ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([playlist]);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([
      {
        provider: 'spotify',
        providerTrackId: 'track-1',
        providerUri: 'spotify:track:track-1',
        title: 'Climb Track',
        artist: 'DJ Test',
        durationMs: 180000,
        albumArtUrl: null,
      },
    ]);
    vi.mocked(api.createClass).mockResolvedValue(
      created as Awaited<ReturnType<typeof api.createClass>>,
    );
    vi.mocked(api.importTrack).mockResolvedValue({ id: 'imported-track' } as Awaited<
      ReturnType<typeof api.importTrack>
    >);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    expect(screen.getByRole('button', { name: 'Music' }).getAttribute('aria-current')).toBe('page');
    await openSavedPlaylist('Spotify', 'Warmup Ride');
    fireEvent.click(await screen.findByRole('button', { name: 'Start class from Warmup Ride' }));

    const header = await screen.findByRole('region', { name: 'Class builder' });
    expect(within(header).getByRole('heading', { name: 'Warmup Ride' })).toBeTruthy();
    expect(within(header).getByRole('button', { name: 'Back to Classes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Classes' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByRole('button', { name: 'Music' }).getAttribute('aria-current')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Browse Spotify playlists' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Your library' })).toBeNull();
    expect(document.title).toBe('Warmup Ride - Ritmo Studio');
    expect(api.createClass).toHaveBeenCalledTimes(1);
    expect(api.createClass).toHaveBeenCalledWith({ title: 'Warmup Ride', template: 'cycle' });
  });

  it('reports partial imports and retries failures against the same class', async () => {
    const tracks = [
      {
        provider: 'spotify' as const,
        providerTrackId: 'tr-1',
        providerUri: null,
        title: 'One',
        artist: 'Artist',
        albumArtUrl: null,
        durationMs: 180000,
      },
      {
        provider: 'spotify' as const,
        providerTrackId: 'tr-2',
        providerUri: null,
        title: 'Two',
        artist: 'Artist',
        albumArtUrl: null,
        durationMs: 180000,
      },
    ];
    const created = makeClass('Spotify likes') as Awaited<ReturnType<typeof api.createClass>>;
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikes).mockResolvedValue(tracks);
    vi.mocked(api.createClass).mockResolvedValue(created);
    vi.mocked(api.importTrack)
      .mockResolvedValueOnce({ id: 'imported-1' } as Awaited<ReturnType<typeof api.importTrack>>)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ id: 'imported-2' } as Awaited<ReturnType<typeof api.importTrack>>);
    vi.mocked(api.addTrack).mockResolvedValue({} as ClassTrack);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openLikedSongs();
    fireEvent.click(screen.getByRole('button', { name: 'Create class from 2 liked tracks' }));

    const retry = await screen.findByRole('button', { name: 'Retry 1 failed' });
    expect(screen.getByText(/1 of 2 tracks imported/)).toBeTruthy();
    expect(api.createClass).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    expect(await screen.findByText(/All 2 tracks imported/)).toBeTruthy();
    expect(api.createClass).toHaveBeenCalledTimes(1);
    expect(api.importClassTracks).toHaveBeenCalledTimes(2);
  });

  it('describes a response-lost Music playlist import as unconfirmed and confirms its exact operation', async () => {
    const tracks = ['One', 'Two'].map((title) => ({
      provider: 'apple_music' as const,
      providerTrackId: title,
      providerUri: null,
      title,
      artist: 'QA',
      albumArtUrl: null,
      durationMs: 180000,
    }));
    const created = makeClass('Unconfirmed draft') as Awaited<ReturnType<typeof api.createClass>>;
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...spotifyConnection(), provider: 'apple_music' },
    ]);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'apple_music',
        playlistId: 'local-retry',
        providerUri: null,
        name: 'Unconfirmed draft',
        ownerName: 'QA',
        trackCount: 2,
        coverImageUrl: null,
      },
    ]);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue(tracks);
    vi.mocked(api.createClass).mockResolvedValue(created);
    vi.mocked(api.importTrack).mockImplementation(
      async (_provider: Provider, id: string) =>
        ({ id: `imported-${id}` }) as Awaited<ReturnType<typeof api.importTrack>>,
    );
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    const server = vi.mocked(api.importClassTracks).getMockImplementation()!;
    let receipt: ClassTrack[] = [];
    vi.mocked(api.importClassTracks)
      .mockImplementationOnce(
        async (classId: string, body: Parameters<typeof api.importClassTracks>[1]) => {
          receipt = await server(classId, body);
          throw new TypeError('response lost');
        },
      )
      .mockImplementationOnce(async () => receipt);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openSavedPlaylist('Apple Music', 'Unconfirmed draft');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start class from Unconfirmed draft' }),
    );
    const confirmation = await screen.findByRole('button', { name: 'Confirm previous import' });
    expect(screen.getByText(/The import into Unconfirmed draft is unconfirmed/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Retry.*failed/ })).toBeNull();
    const original = structuredClone(vi.mocked(api.importClassTracks).mock.calls[0]![1]);
    fireEvent.click(confirmation);
    await screen.findByText('All 2 tracks imported into Unconfirmed draft.');
    expect(vi.mocked(api.importClassTracks).mock.calls[1]![1]).toEqual(original);
    expect(api.importTrack).toHaveBeenCalledTimes(2);
    expect(api.createClass).toHaveBeenCalledTimes(1);
  });

  it('removes stale Music browse controls after a provider disconnects', async () => {
    let connected = true;
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockImplementation(async () =>
      connected ? [spotifyConnection()] : [],
    );
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
    vi.mocked(api.listLikes).mockResolvedValue([
      {
        provider: 'spotify',
        providerTrackId: 'tr-1',
        providerUri: 'spotify:track:tr-1',
        title: 'Levels',
        artist: 'Avicii',
        albumArtUrl: null,
        durationMs: 200000,
      },
    ]);
    vi.mocked(api.disconnectProvider).mockImplementation(async () => {
      connected = false;
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    expect(await screen.findByRole('button', { name: 'Open Warmup Ride' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    expect(await screen.findByText('Levels')).toBeTruthy();
    manageMusicConnections();
    expect(
      within(await screen.findByRole('dialog', { name: 'Music connections' })).getByText(
        'Connected',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect Spotify' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Open Warmup Ride' })).toBeNull();
      expect(screen.queryByText('Levels')).toBeNull();
    });
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Connect Spotify' }),
    ).toBeTruthy();
  });

  it('keeps last-known shelves when a connection refresh fails without authoritative truth', async () => {
    let disconnectStarted = false;
    let callsAfterDisconnect = 0;
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockImplementation(async () => {
      if (!disconnectStarted) return [spotifyConnection()];
      callsAfterDisconnect += 1;
      // The dialog confirms its own disconnect first. The dashboard's separate
      // revision refresh then fails, which is not authoritative shelf truth.
      if (callsAfterDisconnect === 1) return [];
      throw new Error('network down');
    });
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        name: 'Last Known Ride',
        ownerName: 'Steven',
        trackCount: 12,
        coverImageUrl: null,
      },
    ]);
    vi.mocked(api.listLikes).mockResolvedValue([]);
    vi.mocked(api.disconnectProvider).mockImplementation(async () => {
      disconnectStarted = true;
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    expect(await screen.findByRole('button', { name: 'Open Last Known Ride' })).toBeTruthy();
    manageMusicConnections();
    expect(
      within(await screen.findByRole('dialog', { name: 'Music connections' })).getByText(
        'Connected',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect Spotify' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Music connections didn't load.");
    expect(alert.textContent).toContain('Showing your last known sources.');
    expect(screen.getByRole('button', { name: 'Open Last Known Ride' })).toBeTruthy();
  });

  it('ignores late shelf responses after authoritative disconnect truth arrives', async () => {
    let connected = true;
    const playlists = deferred<Awaited<ReturnType<typeof api.listPlaylists>>>();
    const likes = deferred<Awaited<ReturnType<typeof api.listLikes>>>();
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockImplementation(async () =>
      connected ? [spotifyConnection()] : [],
    );
    vi.mocked(api.listPlaylists).mockReturnValue(playlists.promise);
    vi.mocked(api.listLikes).mockReturnValue(likes.promise);
    vi.mocked(api.disconnectProvider).mockImplementation(async () => {
      connected = false;
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await waitFor(() => expect(api.listPlaylists).toHaveBeenCalledWith('spotify'));
    manageMusicConnections();
    expect(
      within(await screen.findByRole('dialog', { name: 'Music connections' })).getByText(
        'Connected',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect Spotify' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Connect Spotify' })).toBeTruthy(),
    );
    await act(async () => {
      playlists.resolve([
        {
          provider: 'spotify',
          playlistId: 'late-playlist',
          name: 'Late Playlist',
          ownerName: 'Steven',
          trackCount: 5,
          coverImageUrl: null,
        },
      ]);
      likes.resolve([
        {
          provider: 'spotify',
          providerTrackId: 'late-track',
          providerUri: null,
          title: 'Late Track',
          artist: 'Artist',
          albumArtUrl: null,
          durationMs: 180000,
        },
      ]);
      await Promise.all([playlists.promise, likes.promise]);
    });

    await selectMusicService('Spotify');
    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }));
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    expect(screen.queryByText(/Late Playlist/)).toBeNull();
    expect(screen.queryByText(/Late Track/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Late Playlist/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Open Late Playlist/ })).toBeNull();
  });

  it('creates a class from liked tracks (imports each, opens the builder)', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikes).mockResolvedValue([
      {
        provider: 'spotify',
        providerTrackId: 'tr-1',
        providerUri: null,
        title: 'Levels',
        artist: 'Avicii',
        albumArtUrl: null,
        durationMs: 200000,
      },
      {
        provider: 'spotify',
        providerTrackId: 'tr-2',
        providerUri: null,
        title: 'Wake Me Up',
        artist: 'Avicii',
        albumArtUrl: null,
        durationMs: 240000,
      },
    ]);
    vi.mocked(api.createClass).mockResolvedValue(
      makeClass('Spotify likes') as Awaited<ReturnType<typeof api.createClass>>,
    );
    vi.mocked(api.importTrack).mockResolvedValue({ id: 'imported' } as Awaited<
      ReturnType<typeof api.importTrack>
    >);
    vi.mocked(api.addTrack).mockResolvedValue({} as ClassTrack);
    vi.mocked(api.listClassTracks).mockResolvedValue([] as ClassTrack[]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openLikedSongs();
    const createBtn = await screen.findByRole('button', {
      name: 'Create class from 2 liked tracks',
    });

    await act(async () => {
      fireEvent.click(createBtn);
    });

    // Creates the class with the dialog title + default template, then imports
    // every liked track before opening the builder.
    await waitFor(() => {
      expect(vi.mocked(api.createClass)).toHaveBeenCalledWith({
        title: 'Spotify likes',
        template: 'cycle',
      });
    });
    expect(vi.mocked(api.importTrack)).toHaveBeenCalledWith('spotify', 'tr-1');
    expect(vi.mocked(api.importTrack)).toHaveBeenCalledWith('spotify', 'tr-2');
    expect(vi.mocked(api.importClassTracks)).toHaveBeenCalledTimes(1);
  });

  it('omits the redundant ownership chip on library cards (solo-first library is owner-only)', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([makeClass('My ride')]));

    renderDashboard();

    expect((await screen.findAllByText('My ride')).length).toBeGreaterThanOrEqual(1);
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

    expect((await screen.findAllByText('My Monday class')).length).toBeGreaterThanOrEqual(1);
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
    expect(await screen.findByRole('heading', { name: 'Your library' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Music' }).getAttribute('aria-current')).toBe('page');
    const soundcloud = screen.getByRole('button', { name: 'SoundCloud, Catalog only' });
    expect(soundcloud.getAttribute('aria-pressed')).toBe('true');
    expect(soundcloud.className).toContain('border-border-strong');
    expect(soundcloud.className).toContain('bg-bg-overlay');
    expect(soundcloud.className).not.toContain('bg-interactive');
    expect(soundcloud.className).not.toContain('border-interactive');

    fireEvent.click(screen.getByRole('button', { name: 'Live' }));
    expect(await screen.findByRole('heading', { name: 'Teach a class' })).toBeTruthy();
    expect(screen.getByText('Press Preflight on the one you want.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(await screen.findByText('Personal workspace')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Provider accounts' })).toBeTruthy();
    expect(screen.queryByText('Workspace defaults')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Preferences' })).toBeNull();
    expect(document.getElementById('account-preferences')).toBeNull();
    expect(document.getElementById('account-music-connections')?.className).toContain(
      'rf-anchor-offset',
    );
    expect(document.getElementById('account-profile')?.className).toContain('rf-anchor-offset');
    expect(document.getElementById('account-security')?.className).toContain('rf-anchor-offset');
  });

  it('returns from a selected class to the run-of-show shelf through Classes', async () => {
    const selectedClass = makeClass('Return path ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([selectedClass]));
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Return path ride/ }));
    expect(await screen.findByRole('heading', { name: 'Return path ride' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
    expect(await screen.findByRole('heading', { name: 'Your Classes' })).toBeTruthy();
  });

  it('puts an opened class ahead of one that was only edited', async () => {
    const edited = { ...makeClass('Edited ride'), updatedAt: 9_000, lastOpenedAt: null };
    const quiet = { ...makeClass('Quiet ride'), updatedAt: 1, lastOpenedAt: null };
    vi.mocked(api.listClasses).mockResolvedValue(page([edited, quiet]));
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.markClassOpened).mockResolvedValue({ ...quiet, lastOpenedAt: 50_000 });
    renderDashboard();

    const recentsTitles = () => {
      const recents = screen.getByRole('region', { name: 'Recents' });
      return within(recents)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'))
        .filter((name) => name === 'Edited ride' || name === 'Quiet ride');
    };

    expect(await screen.findByRole('button', { name: 'Edited ride' })).toBeTruthy();
    expect(recentsTitles()).toEqual(['Edited ride', 'Quiet ride']);
    fireEvent.click(screen.getByRole('button', { name: 'Quiet ride' }));
    expect(await screen.findByRole('heading', { name: 'Quiet ride' })).toBeTruthy();
    expect(api.markClassOpened).toHaveBeenCalledWith(quiet.id);
    fireEvent.click(screen.getByRole('button', { name: 'Back to Classes' }));
    expect(await screen.findByRole('heading', { name: 'Your Classes' })).toBeTruthy();
    expect(recentsTitles()).toEqual(['Quiet ride', 'Edited ride']);
  });

  it('stamps last opened when Live starts, not when the queue is only listed', async () => {
    const alpha = {
      ...makeClass('Alpha ride', 'owner', 'me'),
      trackCount: 1,
      totalDurationMs: 60_000,
      lastOpenedAt: 10,
    };
    const beta = {
      ...makeClass('Beta ride', 'owner', 'me'),
      trackCount: 1,
      totalDurationMs: 60_000,
      lastOpenedAt: 20,
    };
    const payload = liveRunPayload([{ classTrackId: 'ct-1', durationMs: 60_000 }]);
    payload.class.id = alpha.id;
    payload.sections = [];
    vi.mocked(api.listClasses).mockResolvedValue(page([alpha, beta]));
    vi.mocked(api.getRunPayload).mockResolvedValue(payload);
    vi.mocked(api.markClassOpened).mockResolvedValue({ ...alpha, lastOpenedAt: 80_000 });
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    const run = await screen.findByRole('button', { name: 'Preflight Alpha ride' });
    await waitFor(() => expect(run).toHaveProperty('disabled', false));
    expect(api.markClassOpened).not.toHaveBeenCalled();
    fireEvent.click(run);
    await waitFor(() => expect(api.markClassOpened).toHaveBeenCalledWith(alpha.id));
    fireEvent.click(await screen.findByRole('button', { name: 'Exit' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Classes' }));
    const recents = await screen.findByRole('region', { name: 'Recents' });
    const titles = within(recents)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
      .filter((name) => name === 'Alpha ride' || name === 'Beta ride');
    expect(titles).toEqual(['Alpha ride', 'Beta ride']);
  });

  it('surfaces classes with tracks from the Live destination and runs a ready one', async () => {
    const ready = {
      ...makeClass('Ready ride', 'owner', 'me'),
      trackCount: 3,
      totalDurationMs: 1800000,
    };
    vi.mocked(api.listClasses).mockResolvedValue(
      page([
        ready,
        { ...makeClass('Draft shell', 'owner', 'me'), trackCount: 0, totalDurationMs: 0 },
      ]),
    );
    // Every track has a length → the class is genuinely runnable.
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 1800000 }]),
    );

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    expect(await screen.findByText('Ready ride')).toBeTruthy();
    // Empty classes have nothing to preflight and never enter the queue.
    expect(screen.queryByText('Draft shell')).toBeNull();

    const runBtn = (await screen.findByRole('button', {
      name: 'Preflight Ready ride',
    })) as HTMLButtonElement;
    await waitFor(() => expect(runBtn.disabled).toBe(false));
    const card = screen.getByRole('heading', { name: 'Ready ride' }).closest('article')!;
    // The queue keeps the shape as a sparkline. The repeated "Class Pulse" label,
    // derivation sentence, and Runnable badge are not on the row.
    expect(within(card).getByRole('img', { name: /Class Pulse/ })).toBeTruthy();
    expect(within(card).queryByRole('region', { name: 'Class Pulse' })).toBeNull();
    expect(within(card).queryByText('from track efforts')).toBeNull();
    expect(within(card).queryByText('Runnable')).toBeNull();
    expect(screen.queryByText('Queue readiness')).toBeNull();
    // The mount already fetched the payload for readiness; isolate the run request.
    vi.mocked(api.getRunPayload).mockClear();
    fireEvent.click(runBtn);
    await waitFor(() => expect(api.getRunPayload).toHaveBeenCalledWith(ready.id));
  });

  it('removes a deleted class from Recents and the Live list', async () => {
    const morning = {
      ...makeClass('Morning Climb', 'owner', 'me'),
      trackCount: 2,
      totalDurationMs: 120_000,
    };
    const evening = {
      ...makeClass('Evening Ride', 'owner', 'me'),
      trackCount: 1,
      totalDurationMs: 60_000,
    };
    vi.mocked(api.listClasses).mockResolvedValue(page([morning, evening]));
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 60_000 }]),
    );
    vi.mocked(api.deleteClass).mockResolvedValue(undefined);

    renderDashboard();

    const recents = await screen.findByRole('region', { name: 'Recents' });
    expect(within(recents).getByRole('button', { name: 'Morning Climb' })).toBeTruthy();
    expect(within(recents).getByRole('button', { name: 'Evening Ride' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Live' }));
    expect(await screen.findByRole('heading', { name: 'Morning Climb' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Evening Ride' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
    fireEvent.click(await screen.findByRole('button', { name: 'More actions — Morning Climb' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete — Morning Climb' }));
    expect(
      screen.getByRole('dialog', { name: "Delete 'Morning Climb'? This can't be undone." }),
    ).toBeTruthy();
    expect(api.deleteClass).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.deleteClass).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'More actions — Morning Climb' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete — Morning Climb' }));
    vi.mocked(api.listClasses).mockResolvedValue(page([evening]));
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }));
    await waitFor(() => expect(api.deleteClass).toHaveBeenCalledWith(morning.id));

    const recentsAfter = await screen.findByRole('region', { name: 'Recents' });
    await waitFor(() =>
      expect(within(recentsAfter).queryByRole('button', { name: 'Morning Climb' })).toBeNull(),
    );
    expect(within(recentsAfter).getByRole('button', { name: 'Evening Ride' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Morning Climb' })).toBeNull(),
    );
    expect(await screen.findByRole('heading', { name: 'Evening Ride' })).toBeTruthy();
  });

  it('keeps the queue card compact by default and full readiness one disclosure away', async () => {
    const ready = { ...makeClass('Ready ride', 'owner', 'me'), trackCount: 1 };
    vi.mocked(api.listClasses).mockResolvedValue(page([ready]));
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 1800000 }]),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    expect(await screen.findByText('Ready ride')).toBeTruthy();

    // Name, sparkline, and the action are on the row; the four-dimension
    // readiness readout is collapsed until asked for.
    const card = (await screen.findByText('Ready ride')).closest('article') as HTMLElement;
    const disclosure = card.querySelector('details') as HTMLDetailsElement;
    expect(disclosure).toBeTruthy();
    expect(disclosure.open).toBe(false);
    expect(within(card).getByRole('img', { name: /Class Pulse/ })).toBeTruthy();
    expect(within(card).queryByText(/to finish/)).toBeNull();
    expect(within(card).getByText('2 things left')).toBeTruthy();

    fireEvent.click(disclosure.querySelector('summary')!);
    await waitFor(() => expect(disclosure.open).toBe(true));
    expect(within(disclosure).getByText(/Durations set|Duration/)).toBeTruthy();
  });

  it('names a guessed class shape without repeating the auto-shaped sentence', async () => {
    const shaped = {
      ...makeClass('Guessed ride', 'owner', 'me'),
      trackCount: 2,
      totalDurationMs: 120000,
    };
    vi.mocked(api.listClasses).mockResolvedValue(page([shaped]));
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([
        { classTrackId: 'ct-1', durationMs: 60000 },
        { classTrackId: 'ct-2', durationMs: 60000 },
      ]),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    const card = (await screen.findByText('Guessed ride')).closest('article') as HTMLElement;
    expect(await within(card).findByText('◇ auto')).toBeTruthy();
    expect(within(card).queryByText(/Auto-shaped from track order/)).toBeNull();
    expect(within(card).queryByText('Class Pulse')).toBeNull();
    expect(screen.queryByText('Queue readiness')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'What are you teaching next?' })).toBeNull();
  });

  it('ranks the Live queue with the ordering chosen on Classes', async () => {
    const finished = { ...makeClass('Finished ride', 'owner', 'me'), trackCount: 1, updatedAt: 1 };
    const blocked = { ...makeClass('Blocked ride', 'owner', 'me'), trackCount: 1, updatedAt: 9 };
    vi.mocked(api.listClasses).mockResolvedValue(page([finished, blocked]));
    vi.mocked(api.getRunPayload).mockImplementation(async (id: string) =>
      id === finished.id
        ? liveRunPayload([{ classTrackId: 'ct-1', durationMs: 1800000 }])
        : liveRunPayload([{ classTrackId: 'ct-2', durationMs: null, title: 'Untimed' }]),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    await screen.findByText('Finished ride');

    const titles = () =>
      screen
        .getAllByRole('heading', { level: 3 })
        .map((node) => node.textContent)
        .filter((t) => t?.endsWith('ride'));
    // Default is ready-to-teach, so the runnable class leads even though the
    // blocked one was updated more recently.
    await waitFor(() => expect(titles()).toEqual(['Finished ride', 'Blocked ride']));

    fireEvent.click(screen.getByRole('button', { name: 'Needs work' }));
    await waitFor(() => expect(titles()).toEqual(['Blocked ride', 'Finished ride']));
  });

  it('blocks a class that looks runnable by aggregate but has a track missing its duration', async () => {
    // Naive heuristic (trackCount > 0 && totalDurationMs > 0) would call this
    // runnable — one track carries a length. The real run-payload shows a second
    // track with no length, which is exactly what Live Mode blocks on.
    const falseRunnable = {
      ...makeClass('Half-timed ride', 'owner', 'me'),
      trackCount: 2,
      totalDurationMs: 1800000,
    };
    vi.mocked(api.listClasses).mockResolvedValue(page([falseRunnable]));
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([
        { classTrackId: 'ct-1', durationMs: 1800000, title: 'Timed Track' },
        { classTrackId: 'ct-2', durationMs: null, title: 'Untimed Track' },
      ]),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));

    // The card appears with the real block message and no Preflight control at all
    // — a blocked class offers the verb that fixes it, not a button it can never
    // satisfy. No false "runnable" that dies on click.
    expect(await screen.findByText('Half-timed ride')).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByText('Set a duration for Untimed Track before starting Live mode.'),
      ).toBeTruthy(),
    );
    expect(screen.queryByRole('button', { name: /^Preflight/ })).toBeNull();
    const fixBtn = screen.getByRole('button', {
      name: 'Set track durations — Half-timed ride',
    });
    // The primary points assistive tech at the reason it exists.
    expect(fixBtn.getAttribute('aria-describedby')).toBe(`live-blocked-${falseRunnable.id}`);
    // The rollup card is gone. The class itself carries the block, and the
    // page announces the count without a second "Runnable / Needs a duration" panel.
    expect(screen.queryByText('Queue readiness')).toBeNull();
    expect(screen.queryByText('Needs a duration')).toBeNull();
    expect(screen.queryByText('All linked')).toBeNull();
    expect(screen.getByText('0 of 1 class ready for Live.')).toBeTruthy();
  });

  it('surfaces a retry when a class run-payload fails to load, and keeps Run live disabled', async () => {
    const cls = {
      ...makeClass('Flaky ride', 'owner', 'me'),
      trackCount: 2,
      totalDurationMs: 1800000,
    };
    vi.mocked(api.listClasses).mockResolvedValue(page([cls]));
    vi.mocked(api.getRunPayload)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(liveRunPayload([{ classTrackId: 'ct-1', durationMs: 1800000 }]));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));

    // The failed readiness check must never masquerade as runnable: no Preflight
    // control is offered at all until readiness is actually known.
    const retry = await screen.findByRole('button', { name: 'Retry readiness — Flaky ride' });
    expect(retry).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Preflight/ })).toBeNull();

    // Retrying re-fetches just this class; the second attempt succeeds and unblocks it.
    fireEvent.click(retry);
    expect(await screen.findByRole('button', { name: 'Preflight Flaky ride' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(screen.queryByRole('button', { name: /^Retry readiness/ })).toBeNull();
  });

  it('says class details did not load, never blaming track lengths, after a failed payload read', async () => {
    const cls = { ...makeClass('Offline ride', 'owner', 'me'), trackCount: 2 };
    vi.mocked(api.listClasses).mockResolvedValue(page([cls]));
    vi.mocked(api.listClassTracks).mockResolvedValue([
      makeClassTrack('ct-1', 0),
      makeClassTrack('ct-2', 1),
    ]);
    vi.mocked(api.getRunPayload).mockRejectedValue(
      new api.ApiError(
        "Can't reach Ritmo. Check your connection, then try again.",
        'NETWORK_ERROR',
        0,
      ),
    );

    renderDashboard();
    await openClassFromClasses('Offline ride');

    expect(await screen.findByText("Class details didn't load.")).toBeTruthy();
    expect(screen.queryByText('Give every track a length to run.')).toBeNull();
    expect(screen.getByRole('button', { name: /Run live/ })).toHaveProperty('disabled', true);

    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([
        { classTrackId: 'ct-1', durationMs: 180000 },
        { classTrackId: 'ct-2', durationMs: 180000 },
      ]),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Run live/ })).toHaveProperty('disabled', false),
    );
    expect(screen.queryByText("Class details didn't load.")).toBeNull();
  });

  it('says class details did not load when the plan blocks fail', async () => {
    const cls = { ...makeClass('Plan offline', 'owner', 'me'), trackCount: 1 };
    vi.mocked(api.listClasses).mockResolvedValue(page([cls]));
    vi.mocked(api.listClassTracks).mockResolvedValue([makeClassTrack('ct-1', 0)]);
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 180000 }]),
    );
    vi.mocked(api.listClassPlanBlocks).mockRejectedValue(new Error('offline'));

    renderDashboard();
    await openClassFromClasses('Plan offline');

    expect(await screen.findByText("Class details didn't load.")).toBeTruthy();
    expect(screen.queryByText('Give every track a length to run.')).toBeNull();
  });

  it('shows an Offline mark in the app header while the browser is offline', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      renderDashboard();
      const header = (await screen.findByRole('heading', { name: 'Ritmo Studio' })).closest(
        'header',
      )!;
      expect(within(header).getByText('Offline').getAttribute('role')).toBe('status');

      onLine.mockReturnValue(true);
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(within(header).queryByText('Offline')).toBeNull();
    } finally {
      onLine.mockRestore();
    }
  });

  function readyRidePayload(): RunPayload {
    return {
      schemaVersion: 1,
      class: {
        id: '00000000-0000-4000-8000-000000000101',
        title: 'Ready ride',
        template: 'cycle',
        targetDurationMs: null,
        totalDurationMs: 1800000,
        timelineMode: 'sequential',
      },
      tracks: [
        {
          classTrackId: 'ct-1',
          position: 0,
          startOffsetMs: 0,
          displayBpm: 128,
          displayRpm: null,
          holdCount: null,
          intensity: 'mod',
          notes: null,
          clipStartMs: 0,
          beatAnchorMs: 0,
          providerRefs: [],
          track: {
            id: 'track-1',
            title: 'Ready Track',
            artist: 'Artist',
            durationMs: 1800000,
            baseDurationMs: 1800000,
            albumArtUrl: null,
          },
          cues: [],
          moves: [],
        },
      ],
      sections: [],
    };
  }

  function mockReadyRide() {
    vi.mocked(api.listClasses).mockResolvedValue(
      page([
        {
          ...makeClass('Ready ride', 'owner', 'me'),
          trackCount: 3,
          totalDurationMs: 1800000,
        },
      ]),
    );
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockResolvedValue(readyRidePayload());
  }

  it('keeps the nav and the update toast when the builder crashes, and recovers to Classes', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cls = { ...makeClass('Crashing ride', 'owner', 'me'), trackCount: 1 };
    vi.mocked(api.listClasses).mockResolvedValue(page([cls]));
    vi.mocked(api.listClassTracks).mockResolvedValue([makeClassTrack('ct-1', 0)]);
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 180000 }]),
    );
    crash.planBlocks = true;

    render(
      <>
        <Dashboard userId="me" userName="Tester" />
        <UpdatePrompt />
      </>,
    );
    await openClassFromClasses('Crashing ride');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'This page lost the beat.' }),
    ).toBeTruthy();
    const back = screen.getByRole('button', { name: 'Back to Classes' });
    expect(document.activeElement).toBe(back);
    for (const name of ['Classes', 'Music', 'Live', 'Account'])
      expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByTestId('update-prompt')).toBeTruthy();

    crash.planBlocks = false;
    fireEvent.click(back);
    expect(await screen.findByRole('button', { name: 'Crashing ride' })).toBeTruthy();
    expect(screen.queryByText('This page lost the beat.')).toBeNull();
    consoleError.mockRestore();
  });

  it('restores focus to the dashboard heading when Live Mode is exited', async () => {
    mockReadyRide();
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Preflight / }));
    fireEvent.click(await screen.findByRole('button', { name: 'Exit' }));

    const heading = await screen.findByRole('heading', { name: 'Ritmo Studio' });
    expect(document.activeElement).toBe(heading);
  });

  it('flags Live for the session guard and keeps Live mounted when the session is lost', async () => {
    mockReadyRide();
    const view = renderDashboard();
    expect(isLiveActive()).toBe(false);

    fireEvent.click(await screen.findByRole('button', { name: 'Live' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Preflight / }));
    const exit = await screen.findByRole('button', { name: 'Exit' });
    expect(isLiveActive()).toBe(true);
    expect(screen.queryByText('Signed out. Finish the class, then sign in.')).toBeNull();

    view.rerender(<Dashboard userId="me" userName="Tester" sessionLost />);
    expect(
      screen.getByText('Signed out. Finish the class, then sign in.').getAttribute('role'),
    ).toBe('status');
    expect(screen.getByRole('button', { name: 'Exit' })).toBe(exit);

    fireEvent.click(exit);
    await screen.findByRole('heading', { name: 'Ritmo Studio' });
    expect(isLiveActive()).toBe(false);
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
    await openSavedPlaylist('Spotify', 'Warmup Ride');
    expect(await screen.findByRole('dialog', { name: 'Browse Spotify playlists' })).toBeTruthy();
  });

  it('turns stale Music workspace browse paths into connection management after disconnect', async () => {
    let connected = true;
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockImplementation(async () =>
      connected ? [spotifyConnection()] : [],
    );
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        name: 'Recovery Ride',
        ownerName: 'Steven',
        trackCount: 12,
        coverImageUrl: null,
      },
    ]);
    vi.mocked(api.listLikes).mockResolvedValue([
      {
        provider: 'spotify',
        providerTrackId: 'tr-1',
        providerUri: null,
        title: 'Levels',
        artist: 'Avicii',
        albumArtUrl: null,
        durationMs: 200000,
      },
    ]);
    vi.mocked(api.disconnectProvider).mockImplementation(async () => {
      connected = false;
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    expect(await screen.findByRole('button', { name: 'Open Recovery Ride' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    expect(await screen.findByText('Levels')).toBeTruthy();

    manageMusicConnections();
    expect(
      within(await screen.findByRole('dialog', { name: 'Music connections' })).getByText(
        'Connected',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect Spotify' }));

    expect(await screen.findByRole('button', { name: 'Spotify, Catalog only' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Catalog' }));
    expect(screen.getByRole('searchbox', { name: 'Search Spotify catalog' })).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Open Recovery Ride' })).toBeNull(),
    );
    expect(
      screen.queryByRole('button', { name: 'Connect this provider to browse liked tracks.' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Connect this provider to browse saved playlists.' }),
    ).toBeNull();
  });

  it('refreshes Account Music connections after Manage disconnect without leaving Account', async () => {
    let connected = true;
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockImplementation(async () =>
      connected ? [spotifyConnection()] : [],
    );
    vi.mocked(api.getMe).mockResolvedValue({
      id: 'me',
      email: 'tester@example.com',
      displayName: 'Tester',
      imageUrl: null,
      createdAt: 1,
      updatedAt: 1,
    });
    vi.mocked(api.disconnectProvider).mockImplementation(async () => {
      connected = false;
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    expect(await screen.findByRole('heading', { name: 'Provider accounts' })).toBeTruthy();
    const musicSection = document.getElementById('account-music-connections');
    expect(musicSection).toBeTruthy();
    expect(await within(musicSection!).findByText('Connected')).toBeTruthy();
    expect(within(musicSection!).getByText('Authorized')).toBeTruthy();

    // Account stays mounted while Manage dialog runs; connectionRevision must
    // re-fetch listConnections so the Spotify row flips without a nav away/back.
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    const connectionsDialog = await screen.findByRole('dialog', { name: 'Music connections' });
    expect((await within(connectionsDialog).findAllByText('Connected')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Spotify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect Spotify' }));

    await waitFor(() => {
      expect(within(musicSection!).queryByText('Connected')).toBeNull();
    });
    expect(screen.getByRole('heading', { name: 'Provider accounts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Account' }).getAttribute('aria-current')).toBe(
      'page',
    );
    // Account keeps a visible, capability-specific state after the dialog refresh.
    expect(within(musicSection!).queryByText('Checking status')).toBeNull();
    expect(within(musicSection!).getByText('Spotify')).toBeTruthy();
    expect(within(musicSection!).getAllByText('Not connected').length).toBeGreaterThan(0);
  });

  it('shows an honest retryable state when music connections fail to load', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        name: 'Recovery Ride',
        ownerName: 'Steven',
        trackCount: 12,
        coverImageUrl: null,
      },
    ]);
    vi.mocked(api.listLikes).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Music connections didn't load.");
    expect(alert.textContent).toContain('Source status is unavailable');
    expect(screen.queryByText('Connect this provider to browse liked tracks.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Spotify, Unavailable' })).toBeTruthy();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    await selectMusicService('Spotify');
    expect(await screen.findByRole('button', { name: 'Open Recovery Ride' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Music tab library', () => {
  it('puts library tabs under compact service chips with one Manage connections', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await screen.findByRole('button', { name: 'SoundCloud, Catalog only' });

    const layout = document.querySelector('[data-music-layout="stack"]');
    expect(layout?.className).toContain('flex-col');
    expect(layout?.className).not.toContain('grid-cols');
    const services = screen.getByRole('group', { name: 'Music services' });
    expect(services.className).toContain('flex-col');
    expect(services.className).toContain('sm:flex-row');
    expect(services.className).not.toContain('grid-cols');
    const chips = within(services).getAllByRole('button');
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'SoundCloud, Catalog only',
      'Spotify, Catalog only',
      'Apple Music, Catalog only',
    ]);
    for (const chip of chips) {
      expect(chip.className).toContain('min-h-11');
      expect(chip.className).toContain('w-full');
      expect(chip.className).toContain('sm:flex-1');
    }
    expect(screen.queryByText('Browse catalog')).toBeNull();
    expect(document.querySelector('[aria-label="SoundCloud capabilities"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /connection$/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Manage .*connection/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Connect SoundCloud' })).toBeNull();
    expect(services.nextElementSibling).toBe(screen.getByRole('group', { name: 'Library' }));
    expect(screen.getByRole('group', { name: 'Library' }).nextElementSibling).toBe(
      screen.getByRole('searchbox', { name: 'Search SoundCloud catalog' }).closest('section'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }));
    expect(screen.getByText(/Connect SoundCloud to see your playlists/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect SoundCloud' })).toBeTruthy();
  });

  it('shows no connection panel or duplicate Connected for a healthy service', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      spotifyConnection('user-library-read playlist-read-private streaming'),
    ]);
    vi.mocked(api.listPlaylists).mockResolvedValue([]);
    vi.mocked(api.listLikes).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    expect(await screen.findByRole('button', { name: 'Spotify, Connected' })).toBeTruthy();
    expect(await screen.findByText('No saved playlists')).toBeTruthy();
    expect(screen.getAllByText('Connected')).toHaveLength(1);
    expect(document.querySelector('[data-music-connection-notice]')).toBeNull();
    expect(screen.queryByText('Authorized')).toBeNull();
  });

  it('names a missing playlist scope on a linked Spotify account', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([]);
    vi.mocked(api.listLikes).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    expect(await screen.findByText('Reconnect Spotify to load your playlists.')).toBeTruthy();
    expect(screen.getByText('Reconnect needed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reconnect Spotify' })).toBeTruthy();
  });

  it('shows library rows and opens playlist tracks without Build a class', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-1',
        name: 'Warmup Ride',
        ownerName: 'Steven',
        trackCount: 24,
        coverImageUrl: 'https://i.scdn.co/image/pl-1.jpg',
      },
    ]);
    vi.mocked(api.listLikes).mockResolvedValue([
      {
        provider: 'spotify',
        providerTrackId: 'tr-1',
        providerUri: 'spotify:track:tr-1',
        title: 'Levels',
        artist: 'Avicii',
        albumArtUrl: 'https://i.scdn.co/image/tr-1.jpg',
        durationMs: 200000,
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
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');

    const row = await screen.findByRole('button', { name: 'Open Warmup Ride' });
    expect(screen.getByText('Playlist · Steven · 24 tracks')).toBeTruthy();
    const cover = row.querySelector('img');
    expect(cover?.getAttribute('src')).toBe('https://i.scdn.co/image/pl-1.jpg');
    expect(cover?.className).toContain('max-h-11');
    expect(cover?.className).toContain('max-w-11');
    expect(row.closest('[data-build-class-slot="playlist"]')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Build a class/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    expect(await screen.findByText('Song · Avicii · 3:20')).toBeTruthy();
    const songArt = document.querySelector('[data-build-class-slot="song"] img');
    expect(songArt?.className).toContain('max-h-11');
    expect(songArt?.className).toContain('max-w-11');
    expect(screen.queryByRole('button', { name: /Build a class/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Warmup Ride' }));
    expect(await screen.findByRole('heading', { name: 'Warmup Ride' })).toBeTruthy();
    expect(screen.getByText('Climb Track')).toBeTruthy();
  });

  it('searches a catalog when no account is connected', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.searchProvider).mockResolvedValue([
      {
        provider: 'soundcloud',
        providerTrackId: 'tr-1',
        providerUri: 'https://soundcloud.com/ritmo/climb',
        title: 'Climb',
        artist: 'Artist',
        albumArtUrl: null,
        durationMs: 180000,
      },
    ]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    const search = screen.getByRole('searchbox', { name: 'Search SoundCloud catalog' });
    fireEvent.change(search, { target: { value: 'climb' } });

    expect(await screen.findByText('Climb')).toBeTruthy();
    expect(api.searchProvider).toHaveBeenCalledWith('soundcloud', 'climb');
    expect(api.listLikes).not.toHaveBeenCalled();
    expect(api.listPlaylists).not.toHaveBeenCalled();
  });

  it('keeps a failed Spotify library unavailable instead of showing rows', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockRejectedValue(new Error('Library unavailable'));
    vi.mocked(api.listLikes).mockRejectedValue(new Error('Library unavailable'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    const spotify = await screen.findByRole('button', { name: 'Spotify, Unavailable' });
    // The chip never offers Reconnect for a library failure (the open Spotify panel may,
    // for its missing playlist scope).
    expect(
      within(screen.getByRole('group', { name: 'Music services' })).queryByRole('button', {
        name: 'Reconnect Spotify',
      }),
    ).toBeNull();
    fireEvent.click(spotify);
    expect(api.connectProvider).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Open / })).toBeNull();
    expect(await screen.findByText('Playlists unavailable')).toBeTruthy();
    expect(screen.queryByText('Likes & playlists ready')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Spotify library' }));
    await waitFor(() => expect(api.listConnections).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'Catalog' }));
    expect(screen.getByRole('searchbox', { name: 'Search Spotify catalog' })).toBeTruthy();
  });

  it('says the Spotify account is not allowlisted instead of Unavailable', async () => {
    const allowlist = Object.assign(
      new Error(
        'Spotify has not allowlisted this account. Add it under User Management in the Spotify developer dashboard, then retry.',
      ),
      { code: 'SPOTIFY_DEVELOPMENT_MODE' },
    );
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockRejectedValue(allowlist);
    vi.mocked(api.listLikes).mockRejectedValue(allowlist);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    const spotify = await screen.findByRole('button', { name: 'Spotify, Not allowlisted' });
    expect(screen.queryByRole('button', { name: 'Spotify, Unavailable' })).toBeNull();
    // The chip never offers Reconnect for a library failure (the open Spotify panel may,
    // for its missing playlist scope).
    expect(
      within(screen.getByRole('group', { name: 'Music services' })).queryByRole('button', {
        name: 'Reconnect Spotify',
      }),
    ).toBeNull();
    fireEvent.click(spotify);
    expect(api.connectProvider).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/User Management in the Spotify developer dashboard/),
    ).toBeTruthy();
    expect(screen.queryByText('Playlists unavailable')).toBeNull();
    expect(screen.queryByText('Connected')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry Spotify library' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage connections' })).toBeTruthy();
  });

  it('says the Spotify limit is used up instead of Unavailable', async () => {
    const quota = Object.assign(
      new Error("Spotify's usage limit for Ritmo is used up. Try again later."),
      { code: 'PROVIDER_QUOTA_EXCEEDED' },
    );
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockRejectedValue(quota);
    vi.mocked(api.listLikes).mockRejectedValue(quota);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Spotify, Limit reached' }));
    expect(api.connectProvider).not.toHaveBeenCalled();
    expect(await screen.findByText(/usage limit for Ritmo is used up/)).toBeTruthy();
    expect(screen.queryByText('Playlists unavailable')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Spotify, Unavailable' })).toBeNull();
  });

  it('starts SoundCloud OAuth from the Reconnect control', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      {
        id: 'conn-sc',
        userId: 'me',
        provider: 'soundcloud',
        providerUserId: 'sc-user',
        scope: null,
        expiresAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    vi.mocked(api.connectProvider).mockImplementationOnce(() => new Promise(() => {}));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^SoundCloud$/ }));
    expect(api.connectProvider).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect SoundCloud' }));
    await waitFor(() =>
      expect(api.connectProvider).toHaveBeenCalledWith('soundcloud', expect.any(AbortSignal)),
    );
  });

  it('shows a SoundCloud reconnect failure next to the button', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      {
        id: 'conn-sc',
        userId: 'me',
        provider: 'soundcloud',
        providerUserId: 'sc-user',
        scope: null,
        expiresAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    vi.mocked(api.connectProvider).mockRejectedValue(new Error('SoundCloud sign-in did not open.'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reconnect SoundCloud' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('SoundCloud sign-in did not open.');
    expect(screen.getAllByText('SoundCloud sign-in did not open.')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Reconnect SoundCloud' })).toHaveLength(1);
  });

  it('shows a SoundCloud reconnect timeout next to the button', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      {
        id: 'conn-sc',
        userId: 'me',
        provider: 'soundcloud',
        providerUserId: 'sc-user',
        scope: null,
        expiresAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    vi.mocked(api.connectProvider).mockImplementation(() => new Promise(() => {}));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    const reconnect = await screen.findByRole('button', { name: 'Reconnect SoundCloud' });
    vi.useFakeTimers();
    try {
      fireEvent.click(reconnect);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      expect(screen.getByRole('alert').textContent).toContain(
        'SoundCloud did not finish connecting.',
      );
      expect(screen.getAllByRole('button', { name: 'Reconnect SoundCloud' })).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Music remembers the last service and view (RF-137)', () => {
  const apple = () => ({ ...spotifyConnection(), id: 'conn-apple', provider: 'apple_music' });
  const pressed = (name: string | RegExp) =>
    screen.getByRole('button', { name }).getAttribute('aria-pressed');

  beforeEach(() => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listPlaylists).mockResolvedValue([]);
    vi.mocked(api.listLikes).mockResolvedValue([]);
  });

  it('reopens on Apple Music Songs after leaving Music', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection(), apple()]);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Apple Music');
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));

    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Music' }));
    await waitFor(() => expect(pressed(/^Apple Music,/)).toBe('true'));
    expect(pressed('Songs')).toBe('true');
  });

  it('opens a first visit on a connected service, not the first in order', async () => {
    vi.mocked(api.listConnections).mockResolvedValue([apple()]);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await waitFor(() => expect(pressed(/^Apple Music,/)).toBe('true'));
    expect(pressed(/^SoundCloud,/)).toBe('false');
    expect(pressed('Playlists')).toBe('true');
  });

  it('falls back to a connected service when the remembered one is disconnected', async () => {
    window.localStorage.setItem(
      'ritmofit:music-view:v1',
      JSON.stringify({ userId: 'me', provider: 'apple_music', kind: 'songs' }),
    );
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await waitFor(() => expect(pressed(/^Spotify,/)).toBe('true'));
    expect(pressed(/^Apple Music,/)).toBe('false');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('still remembers within the session when storage throws', async () => {
    const throwing = () => {
      throw new Error('blocked');
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem: throwing, setItem: throwing, removeItem: throwing, clear: () => {} },
    });
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection(), apple()]);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Apple Music');

    fireEvent.click(screen.getByRole('button', { name: 'Classes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Music' }));
    await waitFor(() => expect(pressed(/^Apple Music,/)).toBe('true'));
  });
});

describe('Dashboard connection-state headers', () => {
  const profile = {
    id: 'me',
    email: 'tester@example.com',
    displayName: 'Tester',
    imageUrl: null,
    createdAt: 1,
    updatedAt: 1,
  } as const;

  it('uses the caution tone for Session expired on Music and Account headers', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([{ ...spotifyConnection(), expiresAt: 1 }]);
    vi.mocked(api.getMe).mockResolvedValue(profile);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));

    const spotify = await screen.findByRole('button', { name: 'Reconnect Spotify' });
    const chipMark = spotify.querySelector('[data-connection-state="expired"]');
    expect(chipMark?.className).toContain('text-state-caution');
    expect(chipMark?.className).not.toContain('text-text-tertiary');
    expect(chipMark?.querySelector('svg[aria-hidden]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Spotify$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }));
    expect(screen.getByText(/Reconnect Spotify to see your library/)).toBeTruthy();
    const musicExpired = await screen.findAllByText('Session expired');
    expect(musicExpired.length).toBeGreaterThan(0);
    expect(musicExpired.some((node) => node.closest('[data-connection-state="expired"]'))).toBe(
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    const accountSection = document.getElementById('account-music-connections');
    expect(accountSection).toBeTruthy();
    const accountExpired = await within(accountSection!).findByText('Session expired');
    const accountMark = accountExpired.closest('[data-connection-state="expired"]');
    expect(accountMark?.className).toContain('text-state-caution');
    expect(accountMark?.className).not.toContain('text-text-tertiary');
    expect(accountMark?.querySelector('svg[aria-hidden]')).toBeTruthy();
  });
});

describe('Dashboard Account status ledger', () => {
  const profile = {
    id: 'me',
    email: 'tester@example.com',
    displayName: 'Tester',
    imageUrl: null,
    createdAt: 1,
    updatedAt: 1,
  } as const;

  it('keeps verified profile editing available when provider status fails', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockRejectedValue(new Error('provider status offline'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    expect(await screen.findByText('Some account status is unavailable')).toBeTruthy();
    expect(screen.getByText(/No profile or provider setting changed/)).toBeTruthy();
    expect(screen.getByLabelText('Display name')).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Save profile' })).toHaveProperty('disabled', false);
    const musicSection = document.getElementById('account-music-connections');
    expect(musicSection).toBeTruthy();
    expect(within(musicSection!).queryByText('Not connected')).toBeNull();
    expect(within(musicSection!).getAllByText('Status unavailable').length).toBeGreaterThan(0);
  });

  it('shows no status mark for a loaded profile and never claims it was verified', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    // Nothing here checks an email or an identity, so nothing may say "verified"
    // (P1-05). A loaded profile is the normal state and needs no chip.
    expect((await screen.findAllByText('tester@example.com')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Profile loaded')).toBeNull();
    expect(screen.queryByText('Profile verified')).toBeNull();
  });

  it('says only "Loading profile…" while the profile loads', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    const panel = (await screen.findByRole('status', { name: 'Loading profile' })).closest(
      'section',
    )!;
    expect(within(panel).queryByText(/unavailable/i)).toBeNull();
    expect(within(panel).queryByText(/Edits paused/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save profile' })).toHaveProperty('disabled', true);
  });

  it('says the provider sentence once and keeps the Account sub-nav on one scrolling row', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    const musicSection = await waitFor(() => document.getElementById('account-music-connections')!);
    expect(
      within(musicSection).getAllByText(/Provider audio and authorization remain with the music/),
    ).toHaveLength(1);
    const subNav = screen.getByRole('link', { name: 'Profile' }).closest('nav')!;
    // jsdom cannot measure layout: assert one flex row that scrolls, not a wrapping grid.
    expect(subNav.className).toContain('flex');
    expect(subNav.className).toContain('overflow-x-auto');
    expect(subNav.className).not.toContain('grid-cols-2');
  });

  it('reports a failed profile read without leaking the upstream message', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockRejectedValue(new Error('ECONNREFUSED 10.0.0.4'));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    expect(await screen.findByText('Profile unavailable')).toBeTruthy();
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
    expect(screen.getByText(/Reference ACC-[0-9A-Z]+\./)).toBeTruthy();
    // The RecoveryState grammar is unchanged — only the interpolated value moved.
    expect(screen.getByText(/No profile or provider setting changed/)).toBeTruthy();
  });

  it('preserves session identity and disables only profile edits when the profile fails', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockRejectedValue(new Error('profile offline'));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    expect(await screen.findByText('Some account status is unavailable')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tester' })).toBeTruthy();
    expect(screen.getAllByText('Profile details unavailable').length).toBeGreaterThan(0);
    expect(screen.getByText('Edits paused until the profile loads')).toBeTruthy();
    expect(screen.getByLabelText('Display name')).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Save profile' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Sign out' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Manage' })).toHaveProperty('disabled', false);
    const musicSection = document.getElementById('account-music-connections');
    expect(musicSection).toBeTruthy();
    expect(within(musicSection!).getByText('Connected')).toBeTruthy();
    expect(within(musicSection!).getByText('Authorized')).toBeTruthy();
  });

  it('preserves typed profile values and focuses a failed mutation', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateMe).mockRejectedValue(new Error('save offline'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));
    const name = await screen.findByLabelText('Display name');
    fireEvent.change(name, { target: { value: 'A very long instructor display name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Profile was not changed');
    expect(alert.textContent).toContain('save offline');
    expect(document.activeElement).toBe(alert);
    expect(name).toHaveProperty('value', 'A very long instructor display name');
  });

  // Ported from the deleted AccountDialog suite: AccountWorkspace superseded that
  // component, but its save success path and blank-field normalization were only
  // covered there.
  it('saves edited profile fields and propagates the new name to the shell', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateMe).mockResolvedValue({
      ...profile,
      displayName: 'Coach Two',
      imageUrl: 'https://example.com/me.jpg',
      updatedAt: 2,
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    const name = await screen.findByLabelText('Display name');
    fireEvent.change(name, { target: { value: 'Coach Two' } });
    fireEvent.change(screen.getByLabelText('Profile image URL'), {
      target: { value: 'https://example.com/me.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(api.updateMe).toHaveBeenCalledWith({
        displayName: 'Coach Two',
        imageUrl: 'https://example.com/me.jpg',
      }),
    );
    expect(await screen.findByText('Profile updated.')).toBeTruthy();
    // The shell header reads `profileName`, which only the save callback updates.
    expect(screen.getAllByText('Coach Two').length).toBeGreaterThan(1);
    expect(screen.queryByText('Tester')).toBeNull();
  });

  it('normalizes blank optional profile fields to null', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateMe).mockResolvedValue({ ...profile, displayName: null, imageUrl: null });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    fireEvent.change(await screen.findByLabelText('Display name'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Profile image URL'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(api.updateMe).toHaveBeenCalledWith({ displayName: null, imageUrl: null }),
    );
  });

  it('recovers provider status without reloading or changing the profile', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections)
      .mockRejectedValueOnce(new Error('provider status offline'))
      .mockResolvedValueOnce([spotifyConnection()]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Check status again' }));

    const musicSection = document.getElementById('account-music-connections');
    expect(musicSection).toBeTruthy();
    expect(await within(musicSection!).findByText('Connected')).toBeTruthy();
    expect(screen.getByLabelText('Display name')).toHaveProperty('value', 'Tester');
    expect(screen.queryByText('Some account status is unavailable')).toBeNull();
  });
});

describe('Dashboard onboarding video', () => {
  it('opens the guided tutorial after first signup and dismisses it once', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    markOnboardingVideoPending();

    renderDashboard();

    const dialog = await screen.findByRole('dialog', {
      name: 'New instructor four-count tutorial',
    });
    expect(within(dialog).getByText('Build your first class in four counts')).toBeTruthy();
    expect(within(dialog).getByText('3 · Score')).toBeTruthy();
    expect(within(dialog).queryByText(/Teams/i)).toBeNull();
    expect(within(dialog).queryByText(/Explore/i)).toBeNull();
    expect(
      within(dialog).getByRole('button', { name: 'Pause tutorial video' }).className,
    ).toContain('min-h-11');
    expect(
      within(dialog).getByRole('button', { name: 'Replay tutorial video' }).className,
    ).toContain('min-h-11');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start building' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'New instructor tutorial video' })).toBeNull(),
    );
    expect(hasDismissedOnboardingVideo()).toBe(true);
  });

  it('does not show the tutorial without a pending signup marker', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));

    renderDashboard();

    await screen.findByRole('heading', { name: 'Start from a template' });
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
    expect(screen.getByText('Empty run of show')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Music search' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Playlist or source' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Movement pairing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manual track' })).toBeTruthy();
  });

  it('uses Add a playlist as the empty-music call to action', async () => {
    const ride = makeClass('Sunset climb');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([] as ClassTrack[]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Sunset climb$/ }));

    const header = await screen.findByRole('region', { name: 'Class builder' });
    expect(within(header).getByRole('heading', { name: 'Sunset climb' })).toBeTruthy();
    expect(within(header).getByText('Cycle')).toBeTruthy();
    expect(within(header).getByRole('button', { name: 'Back to Classes' })).toBeTruthy();
    expect(within(header).queryByRole('button', { name: 'Add a playlist' })).toBeNull();
    expect(screen.queryByText(/Adds after your current/)).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Build a class' })).toBeNull();

    const empty = screen.getByText('Empty run of show').closest('div');
    if (!empty) throw new Error('Expected the empty run of show.');
    const [callToAction] = within(empty).getAllByRole('button');
    expect(callToAction?.textContent).toBe('Add a playlist');
    expect(callToAction?.className).toContain('rf-btn-primary');
    fireEvent.click(callToAction!);

    const region = await screen.findByRole('region', { name: /Add music to Sunset climb/ });
    expect(
      within(region).getByRole('button', { name: 'Import Playlist URL', pressed: true }),
    ).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Add a playlist' })).toHaveLength(1);
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
    fireEvent.click(await screen.findByRole('button', { name: /^First ride$/ }));
    await openClassFromClasses('Second ride');

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
    expect(screen.getByRole('heading', { name: "This class didn't load." })).toBeTruthy();
    const retry = screen.getByRole('button', { name: 'Retry' });

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
    vi.mocked(api.listClassTracks).mockResolvedValue([
      makeClassTrack('ct-1', 0),
      makeClassTrack('ct-2', 1),
    ]);
    const payload = liveRunPayload([
      { classTrackId: 'ct-1', durationMs: 210_000 },
      { classTrackId: 'ct-2', durationMs: 210_000 },
    ]);
    payload.class.totalDurationMs = 420_000;
    payload.tracks[0]!.track.albumArtUrl = 'https://art/x.jpg';
    vi.mocked(api.getRunPayload).mockResolvedValue(payload);

    renderDashboard();
    // Initially the home row shows 0 tracks (the list response's aggregate).
    // Jump back in repeats the same row, so the meta is on both surfaces.
    expect(await screen.findByRole('button', { name: 'Stale card' })).toBeTruthy();
    expect(screen.getAllByText(/0 tracks/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Stale card' }));

    // The builder header shows the loaded shape. Back on Classes, the row keeps
    // those aggregates without a builder class list.
    await screen.findByRole('heading', { name: 'Stale card' });
    expect(screen.getByText('2 tracks')).toBeTruthy();
    expect(screen.getByText('7:00 total')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Classes' }));
    expect((await screen.findAllByText('Cycle · 2 tracks · 7:00')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
  });

  it('submits manually added track durations as parsed minutes and seconds', async () => {
    const ride = makeClass('Manual ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([] as ClassTrack[]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.addTrack).mockResolvedValue({} as ClassTrack);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Manual ride/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Manual track' }));
    const durationInput = await screen.findByLabelText('Track duration in minutes and seconds');
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

describe('Dashboard track focus management', () => {
  type TrackSpec = {
    classTrackId: string;
    durationMs: number;
    title: string;
    baseDurationMs?: number;
    clipStartMs?: number;
    clipEndMs?: number | null;
    durationMsOverride?: number | null;
    beatAnchorMs?: number;
    startOffsetMs?: number;
  };

  /** Wire the class-list + detail mocks around a mutable spec so a removal (which
   *  triggers a silent detail reload) resolves against the reduced track set. */
  function installClassWithTracks(
    title: string,
    initial: TrackSpec[],
    timelineMode: ClassWithAccess['timelineMode'] = 'sequential',
  ) {
    const ride: ClassListItem = makeClass(title);
    ride.timelineMode = timelineMode;
    let spec = [...initial];
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockImplementation(async () =>
      spec.map((s, i) =>
        makeClassTrack(s.classTrackId, i, {
          clipStartMs: s.clipStartMs,
          clipEndMs: s.clipEndMs,
          durationMsOverride: s.durationMsOverride,
          beatAnchorMs: s.beatAnchorMs,
          startOffsetMs: s.startOffsetMs,
        }),
      ),
    );
    vi.mocked(api.getRunPayload).mockImplementation(async () => {
      const payload = liveRunPayload(spec.map((s) => ({ ...s, displayBpm: 120 })));
      payload.class.timelineMode = timelineMode;
      return payload;
    });
    vi.mocked(api.deleteClassTrack).mockImplementation(async (trackId: string) => {
      spec = spec.filter((s) => s.classTrackId !== trackId);
    });
    vi.mocked(api.addTrack).mockImplementation(
      async (_classId: string, args: Parameters<typeof api.addTrack>[1]) => {
        const newId = 'ct-added';
        const title = 'track' in args && args.track ? args.track.title : 'Added Track';
        spec.push({ classTrackId: newId, durationMs: 180000, title });
        return makeClassTrack(newId, spec.length - 1);
      },
    );
    // The inspector lazily mounts the choreography editor, which loads cues/moves for
    // the selected track; keep those empty so the panel renders without noise.
    vi.mocked(api.listCues).mockResolvedValue([] as never);
    vi.mocked(api.listPlacedMoves).mockResolvedValue([] as never);
    vi.mocked(api.listMoves).mockResolvedValue([] as never);
    vi.mocked(api.listUserMoves).mockResolvedValue([] as never);
    return ride;
  }

  const rowSelectButton = (classTrackId: string) =>
    document.querySelector<HTMLElement>(`[data-track-select-id="${classTrackId}"]`);

  async function openAnchorInspector(
    timing: Partial<TrackSpec> = {},
    timelineMode: ClassWithAccess['timelineMode'] = 'free',
  ) {
    installClassWithTracks(
      'Anchor ride',
      [{ classTrackId: 'ct-1', durationMs: 240000, title: 'Anchor Song', ...timing }],
      timelineMode,
    );
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockResolvedValue(makeClassTrack('ct-1', 0));
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Anchor ride/ }));
    await screen.findByRole('heading', { name: 'Anchor ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);
    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for Anchor Song',
    });
    fireEvent.click(within(inspector).getByText('Advanced timing and placement'));
    return within(inspector);
  }

  const anchorFields = [
    { label: /^Clip start/, key: 'clipStartMs' },
    { label: /^Downbeat/, key: 'beatAnchorMs' },
    { label: /^Start at/, key: 'startOffsetMs' },
  ] as const;

  it.each(anchorFields)(
    'accepts explicit 0:00 for $key in the inspector',
    async ({ label, key }: (typeof anchorFields)[number]) => {
      const inspector = await openAnchorInspector();
      fireEvent.change(inspector.getByLabelText(label), {
        target: { value: '0:00' },
      });
      fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
      await inspector.findByText('Saved.');
      if (key === 'startOffsetMs') {
        // RF-90: Start at is sent only when its value differs from the stored
        // start, and 0:00 over a stored 0 does not. A 0:00 that differs is
        // covered by "resets edited inspector anchors".
        expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).not.toHaveProperty(key);
        return;
      }
      expect(api.updateClassTrack).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({ [key]: 0 }),
      );
    },
  );

  it.each([499, 1250])(
    'preserves untouched %i ms inspector anchors when creator notes change',
    async (ms: number) => {
      const inspector = await openAnchorInspector({
        clipStartMs: ms,
        beatAnchorMs: ms,
        startOffsetMs: ms,
      });
      fireEvent.change(inspector.getByLabelText('Creator notes'), {
        target: { value: 'Only the notes changed.' },
      });
      fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
      await inspector.findByText('Saved.');
      expect(api.updateClassTrack).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          clipStartMs: ms,
          beatAnchorMs: ms,
          notes: 'Only the notes changed.',
        }),
      );
      // RF-90 / B-1: an untouched free-placement start is not re-sent, so a
      // concurrent timeline drag cannot be reverted by a notes save.
      expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).not.toHaveProperty(
        'startOffsetMs',
      );
    },
  );

  it.each([
    { clipEndMs: 499, field: 'notes' },
    { clipEndMs: 1250, field: 'notes' },
    { clipEndMs: 499, field: 'BPM' },
    { clipEndMs: 1250, field: 'BPM' },
  ])(
    'preserves untouched $clipEndMs ms clip end when $field changes',
    async ({ clipEndMs, field }: { clipEndMs: number; field: string }) => {
      const inspector = await openAnchorInspector({ clipEndMs });
      if (field === 'notes') {
        fireEvent.change(inspector.getByLabelText('Creator notes'), {
          target: { value: 'Keep the authored trim.' },
        });
      } else {
        fireEvent.change(inspector.getAllByRole('spinbutton')[0] as HTMLElement, {
          target: { value: '128' },
        });
      }
      fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(api.updateClassTrack).toHaveBeenCalledTimes(1));
      expect(api.updateClassTrack).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          clipEndMs,
          ...(field === 'notes'
            ? { notes: 'Keep the authored trim.' }
            : { displayBpmOverride: 128 }),
        }),
      );
      await inspector.findByText('Saved.');
    },
  );

  it('preserves an untouched sub-second clip window when notes change', async () => {
    const inspector = await openAnchorInspector({ clipStartMs: 1250, clipEndMs: 1500 });
    fireEvent.change(inspector.getByLabelText('Creator notes'), {
      target: { value: 'A short authored window.' },
    });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.updateClassTrack).toHaveBeenCalledTimes(1));
    expect(api.updateClassTrack).toHaveBeenCalledWith(
      'ct-1',
      expect.objectContaining({ clipStartMs: 1250, clipEndMs: 1500 }),
    );
    await inspector.findByText('Saved.');
  });

  it.each([
    { value: '0:02', expected: 2000 },
    { value: '', expected: null },
    { value: '5:00', expected: 300000 },
  ])(
    'saves an intentional clip end edit of $value',
    async ({ value, expected }: { value: string; expected: number | null }) => {
      const inspector = await openAnchorInspector({ clipEndMs: 1250 });
      fireEvent.change(inspector.getByLabelText(/^Clip end/), { target: { value } });
      fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
      await inspector.findByText('Saved.');
      expect(api.updateClassTrack).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({ clipEndMs: expected }),
      );
    },
  );

  it.each(['0:00', '0', '0:60'])(
    'rejects and focuses an invalid clip end edit of %j',
    async (value: string) => {
      const inspector = await openAnchorInspector({ clipEndMs: 1250 });
      const clipEnd = inspector.getByLabelText(/^Clip end/);
      fireEvent.change(clipEnd, { target: { value } });
      fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
      expect(api.updateClassTrack).not.toHaveBeenCalled();
      expect(clipEnd.getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(clipEnd);
      expect(inspector.getByRole('alert').textContent).toMatch(/Enter the clip end/);
    },
  );

  it.each(['0:00', ''])('resets edited inspector anchors with %j', async (value: string) => {
    const inspector = await openAnchorInspector({
      clipStartMs: 1250,
      beatAnchorMs: 1250,
      startOffsetMs: 1250,
    });
    for (const { label } of anchorFields) {
      fireEvent.change(inspector.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await inspector.findByText('Saved.');
    expect(api.updateClassTrack).toHaveBeenCalledWith(
      'ct-1',
      expect.objectContaining({ clipStartMs: 0, beatAnchorMs: 0, startOffsetMs: 0 }),
    );
  });

  it('keeps blank inspector anchors at zero and a blank clip end at null', async () => {
    const inspector = await openAnchorInspector();
    fireEvent.change(inspector.getByLabelText('Creator notes'), {
      target: { value: 'Blank defaults.' },
    });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await inspector.findByText('Saved.');
    expect(api.updateClassTrack).toHaveBeenCalledWith(
      'ct-1',
      expect.objectContaining({
        clipStartMs: 0,
        clipEndMs: null,
        beatAnchorMs: 0,
      }),
    );
    // RF-90 / B-1: a blank, untouched Start at is not re-sent on a notes save.
    expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).not.toHaveProperty('startOffsetMs');
  });

  it.each(['Track length', 'Clip end (minutes:seconds)'])(
    'keeps %s positive-only in the inspector',
    async (label: string) => {
      const inspector = await openAnchorInspector();
      fireEvent.change(
        inspector.getByLabelText(label === 'Track length' ? /^Track length/ : label),
        {
          target: { value: '0:00' },
        },
      );
      fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
      expect(api.updateClassTrack).not.toHaveBeenCalled();
      expect(inspector.getByText(/Enter (a positive duration|the clip end)/)).toBeTruthy();
    },
  );

  it.each(anchorFields)(
    'rejects malformed inspector timecodes for $key, including bare 0',
    async ({ label }: (typeof anchorFields)[number]) => {
      const inspector = await openAnchorInspector();
      for (const value of ['0', '-0:01', '0:60']) {
        fireEvent.change(inspector.getByLabelText(label), { target: { value } });
        fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
        expect(api.updateClassTrack).not.toHaveBeenCalled();
        expect(inspector.getByText(/Enter the (clip start|downbeat|start time)/)).toBeTruthy();
      }
    },
  );

  it('keeps clip end after clip start in the inspector', async () => {
    const inspector = await openAnchorInspector();
    fireEvent.change(inspector.getByLabelText(/^Clip start/), { target: { value: '0:30' } });
    fireEvent.change(inspector.getByLabelText(/^Clip end/), { target: { value: '0:30' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    expect(api.updateClassTrack).not.toHaveBeenCalled();
    expect(inspector.getByText('Clip end must be after clip start.')).toBeTruthy();
  });

  it('omits inspector startOffsetMs in sequential mode', async () => {
    const inspector = await openAnchorInspector({ startOffsetMs: 1250 }, 'sequential');
    expect(inspector.queryByLabelText(/^Start at/)).toBeNull();
    fireEvent.change(inspector.getByLabelText(/^Clip start/), { target: { value: '0:00' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await inspector.findByText('Saved.');
    expect(api.updateClassTrack).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).not.toHaveProperty('startOffsetMs');
  });

  it('keeps an inspector draft unsaved when the server rejects its clip window', async () => {
    const inspector = await openAnchorInspector();
    vi.mocked(api.updateClassTrack).mockRejectedValue(
      new Error('Clip end must be after the latest cue or move at 90000ms.'),
    );
    fireEvent.change(inspector.getByLabelText(/^Clip start/), { target: { value: '0:00' } });
    fireEvent.change(inspector.getByLabelText(/^Clip end/), { target: { value: '0:30' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await inspector.findByText('Clip end must be after the latest cue or move at 90000ms.');
    expect(inspector.queryByText('Saved.')).toBeNull();
    expect(inspector.getByText(/Unsaved typing/)).toBeTruthy();
    expect(inspector.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false);
    expect(inspector.getByLabelText(/^Clip end/)).toHaveProperty('value', '0:30');
  });

  const invalidFields = [
    { label: /^Track length/, value: '0:00', message: /Enter a positive duration/ },
    { label: /^Clip start/, value: '0', message: /Enter the clip start/ },
    { label: /^Clip end/, value: '0:00', message: /Enter the clip end/ },
    { label: /^Downbeat/, value: '0', message: /Enter the downbeat/ },
    { label: /^Start at/, value: '0', message: /Enter the start time/ },
  ] as const;

  it.each(invalidFields)(
    'announces an invalid inspector $label on the field itself',
    async ({ label, value, message }: (typeof invalidFields)[number]) => {
      const inspector = await openAnchorInspector();
      const advanced = inspector
        .getByText('Advanced timing and placement')
        .closest('details') as HTMLDetailsElement;
      advanced.open = false;
      const field = inspector.getByLabelText(label);
      fireEvent.change(field, { target: { value } });
      fireEvent.click(inspector.getByRole('button', { name: 'Save' }));

      const alert = inspector.getByRole('alert');
      expect(alert.textContent).toMatch(message);
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')?.split(' ')).toContain(alert.id);
      expect(document.activeElement).toBe(field);
      // Downbeat and Start at are inside the collapsed group; it opens for them only.
      expect(advanced.open).toBe(advanced.contains(field));
      expect(alert.closest('section')?.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1);
      expect(api.updateClassTrack).not.toHaveBeenCalled();
    },
  );

  it('marks clip end when it does not follow clip start, then clears it on a good save', async () => {
    const inspector = await openAnchorInspector();
    const clipEnd = inspector.getByLabelText(/^Clip end/);
    fireEvent.change(inspector.getByLabelText(/^Clip start/), { target: { value: '0:30' } });
    fireEvent.change(clipEnd, { target: { value: '0:30' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    expect(clipEnd.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(clipEnd);

    fireEvent.change(clipEnd, { target: { value: '0:45' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    await inspector.findByText('Saved.');
    expect(inspector.queryByRole('alert')).toBeNull();
    expect(clipEnd.getAttribute('aria-invalid')).toBeNull();
    expect(clipEnd.getAttribute('aria-describedby')).toBe('clip-help-ct-1');
  });

  it('announces a server rejection without blaming an inspector field', async () => {
    const inspector = await openAnchorInspector();
    vi.mocked(api.updateClassTrack).mockRejectedValue(
      new Error('Clip end must be after the latest cue or move at 90000ms.'),
    );
    fireEvent.change(inspector.getByLabelText(/^Clip end/), { target: { value: '0:30' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    const alert = await inspector.findByRole('alert');
    expect(alert.textContent).toBe('Clip end must be after the latest cue or move at 90000ms.');
    expect(alert.closest('section')?.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it('falls back to a readable message when an inspector save throws a non-Error', async () => {
    const inspector = await openAnchorInspector();
    vi.mocked(api.updateClassTrack).mockRejectedValue(undefined);
    fireEvent.change(inspector.getByLabelText('Creator notes'), { target: { value: 'Push' } });
    fireEvent.click(inspector.getByRole('button', { name: 'Save' }));
    const alert = await inspector.findByRole('alert');
    expect(alert.textContent).toBe('Could not save the track. Try again.');
  });

  it('preserves the selected track and unsaved scoring while workbench tasks change', async () => {
    installClassWithTracks('Context ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
      { classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Context ride/ }));
    await screen.findByRole('heading', { name: 'Context ride' });

    const firstRow = rowSelectButton('ct-1');
    expect(firstRow).not.toBeNull();
    fireEvent.click(firstRow as HTMLElement);

    const notes = await screen.findByRole('textbox', { name: 'Creator notes' });
    fireEvent.change(notes, { target: { value: 'Hold this thought through every task.' } });

    const details = screen.getByText('Class details').closest('details')!;
    const firstRowBefore = rowSelectButton('ct-1');
    details.open = true;
    fireEvent(details, new Event('toggle'));
    details.open = false;
    fireEvent(details, new Event('toggle'));
    expect(rowSelectButton('ct-1')).toBe(firstRowBefore);
    expect(screen.getByRole('heading', { name: 'Playback order' })).toBeTruthy();
    expect(screen.getByText(/Drag a grip or use its arrow keys/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));
    expect(screen.getByRole('region', { name: 'Timeline precision' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add music' }));
    expect(screen.getByRole('region', { name: 'Add music to Context ride' })).toBeTruthy();

    const closeMusic = screen.getByRole('button', { name: 'Close music' });
    fireEvent.click(closeMusic);
    await waitFor(() => expect(document.activeElement).toBe(closeMusic));

    expect(
      (screen.getByRole('textbox', { name: 'Creator notes' }) as HTMLTextAreaElement).value,
    ).toBe('Hold this thought through every task.');
    expect(rowSelectButton('ct-1')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows authored sections under Class Pulse while the timeline stays closed', async () => {
    installClassWithTracks('Section ride', [
      { classTrackId: 'ct-1', durationMs: 120000, title: 'First Light' },
      { classTrackId: 'ct-2', durationMs: 120000, title: 'Second Song' },
    ]);
    vi.mocked(api.getRunPayload).mockImplementation(async () => {
      const payload = liveRunPayload([
        { classTrackId: 'ct-1', durationMs: 120000, title: 'First Light' },
        { classTrackId: 'ct-2', durationMs: 120000, title: 'Second Song' },
      ]);
      payload.sections = [
        { id: '00000000-0000-4000-8000-0000000000a1', type: 'warm_up', startOffsetMs: 0 },
        { id: '00000000-0000-4000-8000-0000000000a2', type: 'sprint', startOffsetMs: 120000 },
      ];
      return payload;
    });
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Section ride/ }));

    const pulse = await screen.findByRole('region', { name: 'Class Pulse' });
    const chart = within(pulse).getByRole('img', { name: /class pulse/i });
    const track = within(pulse).getByRole('img', { name: 'Sections: Warm-up → Sprint' });
    expect(chart.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(chart.contains(track)).toBe(false);
    expect(chart.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(track.textContent).toContain('Warm-up');
    expect(track.textContent).toContain('Sprint');
    expect(
      screen.getByRole('button', { name: 'Show timeline' }).getAttribute('aria-expanded'),
    ).toBe('false');
    expect(screen.queryByRole('region', { name: 'Timeline precision' })).toBeNull();
    expect(api.listSections).not.toHaveBeenCalled();
  });

  it('explains free timeline timing without exposing sequential reorder controls', async () => {
    const ride = installClassWithTracks('Free timeline ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    vi.mocked(api.listClasses).mockResolvedValue(page([{ ...ride, timelineMode: 'free' }]));
    vi.mocked(api.listConnections).mockResolvedValue([]);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Free timeline ride/ }));
    await screen.findByRole('heading', { name: 'Playback order' });
    expect(
      screen.getByText('Song timing is set in the timeline. Select a song to inspect it.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Reorder First Light/ })).toBeNull();
    expect(rowSelectButton('ct-1')).toBeTruthy();
  });

  it('does not advertise reorder while playback details are unavailable', async () => {
    installClassWithTracks('Unavailable details ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('Payload unavailable'));
    vi.mocked(api.listConnections).mockResolvedValue([]);
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Unavailable details ride/ }));
    await screen.findByRole('heading', { name: 'Playback order' });
    expect(screen.getByText(/Playback details are unavailable/)).toBeTruthy();
    expect(screen.queryByText(/Drag a grip or use its arrow keys/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Reorder First Light/ })).toBeNull();
    expect(screen.getByRole('button', { name: /run live/i })).toHaveProperty('disabled', true);
  });

  it('returns to the Classes library from the builder back link', async () => {
    const first = installClassWithTracks('Saturday Heat', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    first.template = 'sculpt';
    const second = makeClass('Sunrise Source');
    vi.mocked(api.listClasses).mockResolvedValue(page([first, second]));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Saturday Heat$/ }));

    const header = await screen.findByRole('region', { name: 'Class builder' });
    expect(within(header).getByRole('heading', { name: 'Saturday Heat' })).toBeTruthy();
    expect(within(header).getByText('Pilates')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Build a class' })).toBeNull();

    fireEvent.click(within(header).getByRole('button', { name: 'Back to Classes' }));
    expect(await screen.findByRole('heading', { name: 'Your Classes' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Class builder' })).toBeNull();
    expect(screen.getByRole('button', { name: /^Saturday Heat$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Sunrise Source$/ })).toBeTruthy();
  });

  it('keeps the selected track and draft stable through an optimistic reorder refresh', async () => {
    installClassWithTracks('Reorder ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
      { classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.reorderTracks).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Reorder ride/ }));
    await screen.findByRole('heading', { name: 'Reorder ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    fireEvent.change(within(inspector).getByRole('textbox', { name: 'Creator notes' }), {
      target: { value: 'Draft survives reorder.' },
    });
    fireEvent.keyDown(
      screen.getByRole('button', { name: /Reorder First Light, position 1 of 2/i }),
      { key: 'ArrowDown' },
    );

    await waitFor(() => expect(api.reorderTracks).toHaveBeenCalledTimes(1));
    expect(
      (within(inspector).getByRole('textbox', { name: 'Creator notes' }) as HTMLTextAreaElement)
        .value,
    ).toBe('Draft survives reorder.');
    expect(rowSelectButton('ct-1')?.getAttribute('aria-pressed')).toBe('true');
  });

  async function openRefreshRide(strict = false, firstPageOnly = false) {
    vi.mocked(api.listClassTracks).mockReset();
    vi.mocked(api.getRunPayload).mockReset();
    vi.mocked(api.reorderTracks).mockReset();
    const ride = installClassWithTracks('Refresh ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
      { classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' },
    ]);
    const other = makeClass('Other ride');
    vi.mocked(api.listClasses).mockResolvedValue(
      firstPageOnly ? { items: [ride], nextCursor: 'older-classes' } : page([ride, other]),
    );
    const loadTracks = vi.mocked(api.listClassTracks).getMockImplementation()!;
    const loadPayload = vi.mocked(api.getRunPayload).getMockImplementation()!;
    vi.mocked(api.listClassTracks).mockImplementation((id: string) =>
      id === other.id ? Promise.resolve([makeClassTrack('ct-other', 0)]) : loadTracks(id),
    );
    vi.mocked(api.getRunPayload).mockImplementation((id: string) =>
      id === other.id
        ? Promise.resolve(
            liveRunPayload([{ classTrackId: 'ct-other', durationMs: 60000, title: 'Other song' }]),
          )
        : loadPayload(id),
    );
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.reorderTracks).mockResolvedValue([]);
    if (strict)
      render(
        <StrictMode>
          <Dashboard userId="me" userName="Tester" />
        </StrictMode>,
      );
    else renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Refresh ride/ }));
    await screen.findByRole('heading', { name: 'Refresh ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);
    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    const notes = within(inspector).getByRole('textbox', { name: 'Creator notes' });
    fireEvent.change(notes, { target: { value: 'Keep this unsaved draft.' } });
    const grip = screen.getByRole('button', { name: /Reorder First Light, position 1 of 2/i });
    grip.focus();
    return { ride, other, inspector, notes, grip };
  }

  function liveReturnPayload(
    ride: ClassWithAccess,
    reverse = false,
    intensity: 'mod' | 'hard' = 'mod',
  ) {
    const payload = liveRunPayload([
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
      { classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' },
    ]);
    payload.class = { ...payload.class, id: ride.id, title: ride.title, totalDurationMs: 420000 };
    payload.sections = [];
    if (reverse) payload.tracks.reverse();
    let offset = 0;
    payload.tracks.forEach((entry, position) => {
      entry.position = position;
      entry.startOffsetMs = offset;
      if (entry.classTrackId === 'ct-1') entry.intensity = intensity;
      offset += entry.track.durationMs ?? 0;
    });
    return payload;
  }

  async function enterLivePreflight() {
    fireEvent.click(screen.getByRole('button', { name: /Run live/ }));
    await screen.findByRole('button', { name: 'Exit' });
  }

  it('reconciles a saved reorder on Exit after its earlier read completes during Live', async () => {
    const { ride, grip } = await openRefreshRide();
    const freshTracks = [makeClassTrack('ct-2', 0), makeClassTrack('ct-1', 1)];
    const heldRead = deferred<ClassTrack[]>();
    vi.mocked(api.listClassTracks)
      .mockReturnValueOnce(heldRead.promise)
      .mockResolvedValue(freshTracks);
    vi.mocked(api.getRunPayload).mockResolvedValue(liveReturnPayload(ride, true));
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
    await enterLivePreflight();
    await act(async () => heldRead.resolve(freshTracks));
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    await screen.findByRole('button', { name: /Reorder First Light, position 2 of 2/ });
    expect(api.listClassTracks).toHaveBeenCalledTimes(3);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Ritmo Studio' }));
  });

  it.each(['during Live', 'after Exit'])(
    'reconciles a legitimate intensity write finishing %s',
    async (completion: string) => {
      const { ride, inspector } = await openRefreshRide();
      let stored: 'mod' | 'hard' = 'mod';
      const mutation = deferred<Awaited<ReturnType<typeof api.updateClassTrack>>>();
      vi.mocked(api.updateClassTrack).mockReturnValueOnce(mutation.promise);
      vi.mocked(api.listClassTracks).mockImplementation(async () => [
        { ...makeClassTrack('ct-1', 0), intensity: stored },
        makeClassTrack('ct-2', 1),
      ]);
      vi.mocked(api.getRunPayload).mockImplementation(async () =>
        liveReturnPayload(ride, false, stored),
      );
      fireEvent.click(within(inspector).getByRole('button', { name: 'Attack' }));
      await enterLivePreflight();
      expect(api.updateClassTrack).toHaveBeenCalledWith('ct-1', { intensity: 'hard' });
      if (completion === 'after Exit') {
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
        await screen.findByRole('heading', { name: 'Refresh ride' });
        // Allow the automatic return read to complete before the write, if one exists.
        await act(async () => {});
      }
      stored = 'hard';
      await act(async () => mutation.resolve({ ...makeClassTrack('ct-1', 0), intensity: stored }));
      if (completion === 'during Live')
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
      await waitFor(() =>
        expect(within(rowSelectButton('ct-1')!).getByLabelText('Intensity Attack')).toBeTruthy(),
      );
      expect(api.updateClassTrack).toHaveBeenCalledTimes(1);
      expect(api.listClassTracks).toHaveBeenCalledTimes(completion === 'after Exit' ? 3 : 2);
    },
  );

  it.each(['success', 'failure'])(
    'ignores delayed Live-return %s after switching classes',
    async (outcome: string) => {
      const { ride } = await openRefreshRide();
      const loadPayload = vi.mocked(api.getRunPayload).getMockImplementation()!;
      vi.mocked(api.getRunPayload).mockImplementation((id: string) =>
        id === ride.id ? Promise.resolve(liveReturnPayload(ride)) : loadPayload(id),
      );
      await enterLivePreflight();
      const returning = deferred<ClassTrack[]>();
      vi.mocked(api.listClassTracks).mockReturnValueOnce(returning.promise);
      fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
      await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
      await openClassFromClasses('Other ride');
      await screen.findByRole('heading', { name: 'Other ride' });
      await act(async () => {
        if (outcome === 'success') returning.resolve([makeClassTrack('ct-1', 0)]);
        else returning.reject(new Error('Obsolete Live return'));
      });
      expect(screen.queryByText(/Obsolete Live return/)).toBeNull();
      expect(screen.getByRole('button', { name: /Other song.*Artist/ })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Other ride' })).toBeTruthy();
    },
  );

  it('keeps a late write authoritative when its old Live-return read resolves afterward', async () => {
    const { ride, inspector } = await openRefreshRide();
    let stored: 'mod' | 'hard' = 'mod';
    const mutation = deferred<Awaited<ReturnType<typeof api.updateClassTrack>>>();
    vi.mocked(api.updateClassTrack).mockReturnValueOnce(mutation.promise);
    vi.mocked(api.getRunPayload).mockImplementation(async () =>
      liveReturnPayload(ride, false, stored),
    );
    fireEvent.click(within(inspector).getByRole('button', { name: 'Attack' }));
    await enterLivePreflight();
    const oldReturn = deferred<ClassTrack[]>();
    vi.mocked(api.listClassTracks)
      .mockReturnValueOnce(oldReturn.promise)
      .mockImplementation(async () => [
        { ...makeClassTrack('ct-1', 0), intensity: stored },
        makeClassTrack('ct-2', 1),
      ]);
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
    stored = 'hard';
    await act(async () => mutation.resolve({ ...makeClassTrack('ct-1', 0), intensity: stored }));
    await waitFor(() =>
      expect(within(rowSelectButton('ct-1')!).getByLabelText('Intensity Attack')).toBeTruthy(),
    );
    await act(async () =>
      oldReturn.resolve([makeClassTrack('ct-1', 0), makeClassTrack('ct-2', 1)]),
    );
    expect(within(rowSelectButton('ct-1')!).getByLabelText('Intensity Attack')).toBeTruthy();
    expect(api.listClassTracks).toHaveBeenCalledTimes(3);
  });

  it('does not reconcile a retained selection when Live started from its overview', async () => {
    const { ride } = await openRefreshRide();
    vi.mocked(api.getRunPayload).mockResolvedValue(liveReturnPayload(ride));
    fireEvent.click(screen.getByRole('button', { name: 'Live' }));
    const preflight = await screen.findByRole('button', { name: 'Preflight Refresh ride' });
    await waitFor(() => expect((preflight as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(preflight);
    await screen.findByRole('button', { name: 'Exit' });
    const reads = vi.mocked(api.listClassTracks).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    await screen.findByRole('heading', { name: 'Teach a class' });
    expect(api.listClassTracks).toHaveBeenCalledTimes(reads);
    expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
  });

  it('returns OAuth Live entry to its overview without treating hydrated class data as suspended Builder', async () => {
    const ride = { ...makeClass('OAuth ride'), trackCount: 2, totalDurationMs: 420000 };
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.getClass).mockResolvedValue(ride);
    vi.mocked(api.listClassTracks).mockResolvedValue([
      makeClassTrack('ct-1', 0),
      makeClassTrack('ct-2', 1),
    ]);
    vi.mocked(api.getRunPayload).mockResolvedValue(liveReturnPayload(ride));
    vi.mocked(api.listConnections).mockResolvedValue([]);
    rememberConnectionReturn({
      userId: 'me',
      destination: 'live',
      classId: ride.id,
      provider: 'soundcloud',
    });
    window.history.replaceState(null, '', '/?connected=soundcloud');
    renderDashboard();
    await screen.findByRole('button', { name: 'Exit' });
    const reads = vi.mocked(api.listClassTracks).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    await screen.findByRole('heading', { name: 'Teach a class' });
    expect(api.listClassTracks).toHaveBeenCalledTimes(reads);
    expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
  });

  it('reconciles the suspended Builder after two pending Run live requests complete', async () => {
    const { ride } = await openRefreshRide();
    const first = deferred<RunPayload>();
    const second = deferred<RunPayload>();
    vi.mocked(api.getRunPayload)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const run = screen.getByRole('button', { name: /Run live/ });
    fireEvent.click(run);
    fireEvent.click(run);
    await act(async () => first.resolve(liveReturnPayload(ride)));
    await act(async () => second.resolve(liveReturnPayload(ride)));
    await screen.findByRole('button', { name: 'Exit' });
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: 'Refresh ride' })).toBeTruthy();
  });

  it('does not let an obsolete Run live response replace a newly selected class', async () => {
    const { ride } = await openRefreshRide();
    const pending = deferred<RunPayload>();
    vi.mocked(api.getRunPayload).mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole('button', { name: /Run live/ }));
    await openClassFromClasses('Other ride');
    await screen.findByRole('heading', { name: 'Other ride' });
    await act(async () => pending.resolve(liveReturnPayload(ride)));
    expect(screen.queryByRole('button', { name: 'Exit' })).toBeNull();
    expect(screen.getByRole('button', { name: /Other song.*Artist/ })).toBeTruthy();
  });

  it('does not enter Live from a pending overview request after navigating to Music', async () => {
    const { ride } = await openRefreshRide();
    vi.mocked(api.getRunPayload).mockResolvedValue(liveReturnPayload(ride));
    fireEvent.click(screen.getByRole('button', { name: 'Live' }));
    const run = await screen.findByRole('button', { name: 'Preflight Refresh ride' });
    await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));
    const pending = deferred<RunPayload>();
    vi.mocked(api.getRunPayload).mockReturnValueOnce(pending.promise);
    fireEvent.click(run);
    fireEvent.click(screen.getByRole('button', { name: 'Music' }));
    await act(async () => pending.resolve(liveReturnPayload(ride)));
    expect(screen.queryByRole('button', { name: 'Exit' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Music' }).getAttribute('aria-current')).toBe('page');
  });

  it.each(['Live return', 'A-to-B-to-A'])(
    'owns a pending collection import retry across %s',
    async (transition: string) => {
      const candidates = ['One', 'Two'].map((title, index) => ({
        provider: 'spotify' as const,
        providerTrackId: `p2-import-${index}`,
        providerUri: null,
        title,
        artist: 'Artist',
        albumArtUrl: null,
        durationMs: 180000,
      }));
      const created = makeClass('Spotify likes');
      const other = makeClass('Import other ride');
      let stored: ClassTrack[] = [];
      const commit = deferred<Awaited<ReturnType<typeof api.importClassTracks>>>();
      let nextRows: ClassTrack[] = [];
      vi.mocked(api.listClasses).mockResolvedValue(page([created, other]));
      vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
      vi.mocked(api.listLikes).mockResolvedValue(candidates);
      vi.mocked(api.createClass).mockResolvedValue(created);
      vi.mocked(api.importTrack)
        .mockReset()
        .mockResolvedValueOnce({ id: 'imported-1' } as Awaited<ReturnType<typeof api.importTrack>>)
        .mockRejectedValueOnce(new Error('Resolve one track failed'))
        .mockResolvedValueOnce({ id: 'imported-2' } as Awaited<ReturnType<typeof api.importTrack>>);
      vi.mocked(api.importClassTracks).mockImplementation(
        async (_id: string, body: Parameters<typeof api.importClassTracks>[1]) => {
          const rows = body.orderedIds.map((id, position) => makeClassTrack(id, position));
          if (stored.length) {
            nextRows = rows;
            return commit.promise;
          }
          stored = rows;
          return rows;
        },
      );
      vi.mocked(api.listClassTracks)
        .mockReset()
        .mockImplementation(async (id: string) =>
          id === other.id ? [makeClassTrack('ct-import-other', 0)] : stored,
        );
      vi.mocked(api.getRunPayload)
        .mockReset()
        .mockImplementation(async (id: string) => {
          const payload = liveRunPayload(
            id === other.id
              ? [{ classTrackId: 'ct-import-other', durationMs: 60000, title: 'Import other song' }]
              : stored.map((row, index) => ({
                  classTrackId: row.id,
                  durationMs: 180000,
                  title: candidates[index]!.title,
                })),
          );
          payload.class = {
            ...payload.class,
            id,
            title: id === other.id ? other.title : created.title,
            totalDurationMs: payload.tracks.length * 180000,
          };
          payload.sections = [];
          payload.tracks.forEach((entry, index) => {
            entry.startOffsetMs = index * 180000;
          });
          return payload;
        });
      renderDashboard();
      fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
      await openLikedSongs();
      fireEvent.click(screen.getByRole('button', { name: 'Create class from 2 liked tracks' }));
      const retry = await screen.findByRole('button', { name: 'Retry 1 failed' });
      await screen.findByRole('heading', { name: 'Spotify likes' });
      fireEvent.click(retry);
      await waitFor(() => expect(api.importClassTracks).toHaveBeenCalledTimes(2));
      if (transition === 'Live return') {
        await enterLivePreflight();
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
        await screen.findByRole('heading', { name: 'Spotify likes' });
        await act(async () => {});
      } else {
        await openClassFromClasses('Import other ride');
        await screen.findByRole('heading', { name: 'Import other ride' });
        await openClassFromClasses('Spotify likes');
        await screen.findByRole('heading', { name: 'Spotify likes' });
      }
      const readsBeforeCommit = vi.mocked(api.listClassTracks).mock.calls.length;
      stored = nextRows;
      await act(async () => commit.resolve(stored));
      await screen.findByText(/All 2 tracks imported/);
      if (transition === 'Live return') {
        await screen.findByRole('button', { name: /Reorder Two, position 2 of 2/ });
        expect(api.listClassTracks).toHaveBeenCalledTimes(readsBeforeCommit + 1);
      } else {
        expect(api.listClassTracks).toHaveBeenCalledTimes(readsBeforeCommit);
        expect(screen.queryByRole('button', { name: /Reorder Two/ })).toBeNull();
      }
    },
  );

  it('retains truthful Live-return warning through failed read retry, then recovers focus', async () => {
    const { ride } = await openRefreshRide();
    vi.mocked(api.getRunPayload).mockResolvedValue(liveReturnPayload(ride));
    await enterLivePreflight();
    vi.mocked(api.listClassTracks).mockRejectedValueOnce(new Error('Return read unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    await screen.findByText(/Back in Builder, but.*Return read unavailable/);
    fireEvent.click(rowSelectButton('ct-1')!);
    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    const notes = within(inspector).getByRole('textbox', { name: 'Creator notes' });
    fireEvent.change(notes, { target: { value: 'Draft typed after returning.' } });
    vi.mocked(api.listClassTracks).mockRejectedValueOnce(new Error('Retry read unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh class details' }));
    await screen.findByText(/Back in Builder, but.*Retry read unavailable/);
    expect(screen.queryByText(/Saved, but/)).toBeNull();
    const retry = screen.getByRole('button', { name: 'Refresh class details' });
    retry.focus();
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByText(/Back in Builder, but/)).toBeNull());
    expect((notes as HTMLTextAreaElement).value).toBe('Draft typed after returning.');
    expect(document.activeElement).toBe(rowSelectButton('ct-1'));
  });

  async function startDeferredClassDelete() {
    const deletion = deferred<void>();
    vi.mocked(api.deleteClass).mockReset().mockReturnValueOnce(deletion.promise);
    fireEvent.click(screen.getByText('Class details'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete this class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete class' }));
    await waitFor(() => expect(api.deleteClass).toHaveBeenCalledTimes(1));
    return deletion;
  }

  function otherLivePayload(other: ClassWithAccess) {
    const payload = liveRunPayload([
      { classTrackId: 'ct-other', durationMs: 60000, title: 'Other song' },
    ]);
    payload.class = { ...payload.class, id: other.id, title: other.title, totalDurationMs: 60000 };
    payload.sections = [];
    return payload;
  }

  it.each(['Builder', 'overview'])(
    'preserves B’s pending %s Live request when an old A delete completes',
    async (origin: string) => {
      const { other } = await openRefreshRide();
      const deletion = await startDeferredClassDelete();
      await openClassFromClasses('Other ride');
      await screen.findByRole('heading', { name: 'Other ride' });
      let run: HTMLElement;
      if (origin === 'overview') {
        fireEvent.click(screen.getByRole('button', { name: 'Live' }));
        run = await screen.findByRole('button', { name: 'Preflight Other ride' });
        await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));
      } else run = screen.getByRole('button', { name: /Run live/ });
      const pending = deferred<RunPayload>();
      vi.mocked(api.getRunPayload).mockReturnValueOnce(pending.promise);
      fireEvent.click(run);
      vi.mocked(api.listClasses).mockResolvedValue(page([other]));
      await act(async () => deletion.resolve());
      await act(async () => pending.resolve(otherLivePayload(other)));
      await screen.findByRole('button', { name: 'Exit' });
      expect(screen.getByRole('heading', { name: 'Other ride' })).toBeTruthy();
    },
  );

  it.each(['current Builder', 'reopened Builder', 'overview'])(
    'rejects a deleted A’s pending Live request from %s',
    async (origin: string) => {
      const { ride, other } = await openRefreshRide();
      const deletion = await startDeferredClassDelete();
      if (origin === 'reopened Builder') {
        await openClassFromClasses('Other ride');
        await screen.findByRole('heading', { name: 'Other ride' });
        await openClassFromClasses('Refresh ride');
        await screen.findByRole('heading', { name: 'Refresh ride' });
      }
      let run: HTMLElement;
      if (origin === 'overview') {
        fireEvent.click(screen.getByRole('button', { name: 'Live' }));
        run = await screen.findByRole('button', { name: 'Preflight Refresh ride' });
        await waitFor(() => expect((run as HTMLButtonElement).disabled).toBe(false));
      } else run = screen.getByRole('button', { name: /Run live/ });
      const pending = deferred<RunPayload>();
      vi.mocked(api.getRunPayload).mockReturnValueOnce(pending.promise);
      fireEvent.click(run);
      vi.mocked(api.listClasses).mockResolvedValue(page([other]));
      await act(async () => deletion.resolve());
      await act(async () => pending.resolve(liveReturnPayload(ride)));
      expect(screen.queryByRole('button', { name: 'Exit' })).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Refresh ride/ })).toBeNull();
    },
  );

  it('refills the library after deleting its last loaded class when older classes remain', async () => {
    const { other } = await openRefreshRide(false, true);
    const deletion = await startDeferredClassDelete();
    vi.mocked(api.listClasses).mockResolvedValue(page([other]));
    await act(async () => deletion.resolve());
    await screen.findByRole('button', { name: /^Other ride/ });
    expect(api.listClasses).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: /^Refresh ride/ })).toBeNull();
    expect(screen.queryByText('Your first class starts here')).toBeNull();
  });

  it('preserves B’s inspector draft, focus and scoped read warning when A deletion completes', async () => {
    const { other } = await openRefreshRide();
    const deletion = await startDeferredClassDelete();
    await openClassFromClasses('Other ride');
    await screen.findByRole('heading', { name: 'Other ride' });
    fireEvent.click(rowSelectButton('ct-other')!);
    const inspector = await screen.findByRole('region', { name: 'Track inspector for Other song' });
    const notes = within(inspector).getByRole('textbox', { name: 'Creator notes' });
    fireEvent.change(notes, { target: { value: 'Keep unrelated B draft.' } });
    vi.mocked(api.updateClassTrack).mockResolvedValue({
      ...makeClassTrack('ct-other', 0),
      intensity: 'hard',
    });
    vi.mocked(api.listClassTracks).mockRejectedValueOnce(new Error('B latest read unavailable'));
    fireEvent.click(within(inspector).getByRole('button', { name: 'Attack' }));
    await screen.findByText(/Saved, but.*B latest read unavailable/);
    notes.focus();
    vi.mocked(api.listClasses).mockResolvedValue(page([other]));
    await act(async () => deletion.resolve());
    expect(screen.getByRole('region', { name: 'Track inspector for Other song' })).toBe(inspector);
    expect((notes as HTMLTextAreaElement).value).toBe('Keep unrelated B draft.');
    expect(document.activeElement).toBe(notes);
    expect(screen.getByText(/Saved, but.*B latest read unavailable/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh class details' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Refresh ride/ })).toBeNull();
  });

  it('keeps the inspector and grip through rejected reorder, then retries one mutation', async () => {
    const { inspector, notes, grip } = await openRefreshRide();
    const mutation = deferred<Awaited<ReturnType<typeof api.reorderTracks>>>();
    vi.mocked(api.reorderTracks).mockReturnValueOnce(mutation.promise);
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    expect(grip.getAttribute('aria-label')).toContain('position 2 of 2');
    await act(async () => mutation.reject(new Error('Reorder denied')));
    expect(await screen.findByText('Reorder denied')).toBeTruthy();
    expect(grip.getAttribute('aria-label')).toContain('position 1 of 2');
    expect(document.activeElement).toBe(grip);
    expect((notes as HTMLTextAreaElement).value).toBe('Keep this unsaved draft.');
    expect(rowSelectButton('ct-1')?.getAttribute('aria-pressed')).toBe('true');
    expect(api.listClassTracks).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
    expect(api.reorderTracks).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Reorder denied')).toBeNull();
    expect(screen.getByRole('region', { name: 'Track inspector for First Light' })).toBe(inspector);
    expect(document.activeElement).toBe(grip);
  });

  it('shows a reorder fallback without changing the assertive sentence', async () => {
    const { grip } = await openRefreshRide();
    vi.mocked(api.reorderTracks).mockRejectedValueOnce(new Error(''));
    fireEvent.keyDown(grip, { key: 'ArrowDown' });

    expect(await screen.findByText('Something went wrong.')).toBeTruthy();
    const announcement = screen.getByText(
      'Couldn’t reorder — “First Light” moved back to position 1 of 2.',
    );
    expect(announcement.textContent).toBe(
      'Couldn’t reorder — “First Light” moved back to position 1 of 2.',
    );
    expect(announcement.textContent).not.toContain('Something went wrong.');
  });

  it('announces saved-but-refresh-failed and retries reads without losing the draft', async () => {
    const { inspector, notes, grip } = await openRefreshRide();
    vi.mocked(api.listClassTracks).mockRejectedValueOnce(new Error('Latest read unavailable'));
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    const warning = await screen.findByText(/Saved, but.*Latest read unavailable/);
    expect(warning.closest('[role="status"]')).toBeTruthy();
    expect(document.activeElement).toBe(grip);
    expect((notes as HTMLTextAreaElement).value).toBe('Keep this unsaved draft.');
    expect(screen.getByRole('region', { name: 'Track inspector for First Light' })).toBe(inspector);
    const retry = screen.getByRole('button', { name: 'Refresh class details' });
    retry.focus();
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByText(/Saved, but/)).toBeNull());
    expect(api.listClassTracks).toHaveBeenCalledTimes(3);
    expect(api.reorderTracks).toHaveBeenCalledTimes(1);
    expect((notes as HTMLTextAreaElement).value).toBe('Keep this unsaved draft.');
    expect(document.activeElement).not.toBe(document.body);
  });

  it('restores retry focus to a surviving row after fresh detail removes the selected track', async () => {
    await openRefreshRide();
    vi.mocked(api.listClassTracks).mockRejectedValueOnce(new Error('Read unavailable'));
    fireEvent.keyDown(
      screen.getByRole('button', { name: /Reorder First Light, position 1 of 2/i }),
      { key: 'ArrowDown' },
    );
    await screen.findByText(/Saved, but/);
    vi.mocked(api.listClassTracks).mockResolvedValueOnce([makeClassTrack('ct-2', 0)]);
    vi.mocked(api.getRunPayload).mockResolvedValueOnce(
      liveRunPayload([{ classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' }]),
    );
    const retry = screen.getByRole('button', { name: 'Refresh class details' });
    retry.focus();
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByText(/Saved, but/)).toBeNull());
    expect(rowSelectButton('ct-1')).toBeNull();
    expect(document.activeElement).toBe(rowSelectButton('ct-2'));
  });

  it.each(['switch', 'all classes', 'music'])(
    'does not publish a late refresh rejection after %s',
    async (leave: string) => {
      const { grip } = await openRefreshRide();
      const refresh = deferred<ClassTrack[]>();
      vi.mocked(api.listClassTracks).mockReturnValueOnce(refresh.promise);
      fireEvent.keyDown(grip, { key: 'ArrowDown' });
      await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
      if (leave === 'switch') {
        await openClassFromClasses('Other ride');
        await screen.findByRole('heading', { name: 'Other ride' });
      } else if (leave === 'music') {
        fireEvent.click(screen.getByRole('button', { name: 'Music' }));
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Back to Classes' }));
      }
      await act(async () => refresh.reject(new Error('Obsolete read')));
      expect(screen.queryByText(/Obsolete read/)).toBeNull();
      if (leave === 'switch')
        expect(screen.getByRole('button', { name: /Other song.*Artist/ })).toBeTruthy();
      // The first workspace's controls have actually been unmounted.
      expect(grip.isConnected).toBe(false);
    },
  );

  it('ignores a prior workspace mutation completing after A-to-B-to-A', async () => {
    const { ride, grip } = await openRefreshRide();
    const mutation = deferred<Awaited<ReturnType<typeof api.reorderTracks>>>();
    vi.mocked(api.reorderTracks).mockReturnValueOnce(mutation.promise);
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    await openClassFromClasses('Other ride');
    await screen.findByRole('heading', { name: 'Other ride' });
    await openClassFromClasses('Refresh ride');
    await screen.findByRole('heading', { name: 'Refresh ride' });
    const readsBeforeCompletion = vi.mocked(api.listClassTracks).mock.calls.length;
    await act(async () => mutation.resolve([]));
    expect(api.listClassTracks).toHaveBeenCalledTimes(readsBeforeCompletion);
    expect(screen.getByRole('heading', { name: ride.title })).toBeTruthy();
    expect(screen.queryByText('Loading class…')).toBeNull();
  });

  it('keeps newer failed refresh ownership when an older silent success arrives', async () => {
    const { grip } = await openRefreshRide();
    const older = deferred<ClassTrack[]>();
    const newer = deferred<ClassTrack[]>();
    vi.mocked(api.listClassTracks)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const stalePayload = liveRunPayload([
      { classTrackId: 'ct-1', durationMs: 60000, title: 'Obsolete song title' },
    ]);
    vi.mocked(api.getRunPayload).mockResolvedValueOnce(stalePayload);
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
    fireEvent.keyDown(grip, { key: 'ArrowUp' });
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(3));
    await act(async () => newer.reject(new Error('Newest read unavailable')));
    await screen.findByText(/Newest read unavailable/);
    await act(async () => older.resolve([makeClassTrack('ct-1', 0)]));
    expect(screen.queryAllByText('Obsolete song title')).toHaveLength(0);
    expect(screen.getByText('2 tracks')).toBeTruthy();
    expect(screen.getByText('30:00 total')).toBeTruthy();
    expect(screen.getByText(/Newest read unavailable/)).toBeTruthy();
  });

  it('ignores an older rejection after the newest silent read succeeds', async () => {
    const { grip } = await openRefreshRide();
    const older = deferred<ClassTrack[]>();
    const newer = deferred<ClassTrack[]>();
    vi.mocked(api.listClassTracks)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const latest = liveRunPayload([
      { classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' },
      { classTrackId: 'ct-1', durationMs: 240000, title: 'Latest First Light' },
    ]);
    latest.class.totalDurationMs = 420000;
    vi.mocked(api.getRunPayload).mockResolvedValueOnce(latest).mockResolvedValueOnce(latest);
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
    fireEvent.keyDown(grip, { key: 'ArrowUp' });
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(3));
    await act(async () => newer.resolve([makeClassTrack('ct-2', 0), makeClassTrack('ct-1', 1)]));
    await screen.findByRole('region', { name: 'Track inspector for Latest First Light' });
    await act(async () => older.reject(new Error('Older failure')));
    expect(screen.queryByText(/Older failure/)).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Track inspector for Latest First Light' }),
    ).toBeTruthy();
    expect(screen.getByText('2 tracks')).toBeTruthy();
    expect(screen.getByText('7:00 total')).toBeTruthy();
  });

  it('does not change Library aggregates from a silent response after switching away', async () => {
    const { grip } = await openRefreshRide();
    const older = deferred<ClassTrack[]>();
    const stalePayload = liveRunPayload([
      { classTrackId: 'ct-1', durationMs: 60000, title: 'Obsolete song' },
    ]);
    stalePayload.class.totalDurationMs = 60000;
    vi.mocked(api.listClassTracks).mockReturnValueOnce(older.promise);
    vi.mocked(api.getRunPayload).mockResolvedValueOnce(stalePayload);
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
    await openClassFromClasses('Other ride');
    await screen.findByRole('heading', { name: 'Other ride' });
    await act(async () => older.resolve([makeClassTrack('ct-1', 0)]));
    expect(screen.getByRole('button', { name: /Other song.*Artist/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Classes' }));
    expect((await screen.findAllByText('Cycle · 2 tracks · 30:00')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Cycle · 1 track · 1:00')).toBeNull();
  });

  it('clears only the read warning when refresh recovers after an unrelated mutation error', async () => {
    const { grip } = await openRefreshRide();
    vi.mocked(api.listClassTracks).mockRejectedValueOnce(new Error('Read unavailable'));
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    await screen.findByText(/Saved, but/);
    fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));
    vi.mocked(api.updateClass).mockRejectedValueOnce(new Error('Timeline mutation denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to free placement' }));
    await screen.findByText('Timeline mutation denied');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh class details' }));
    await waitFor(() => expect(screen.queryByText(/Saved, but/)).toBeNull());
    expect(screen.getByText('Timeline mutation denied')).toBeTruthy();
    expect(api.reorderTracks).toHaveBeenCalledTimes(1);
    expect(api.updateClass).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'refreshes pending intensity after track switching (StrictMode %s)',
    async (strict: boolean) => {
      const { inspector } = await openRefreshRide(strict);
      const mutation = deferred<Awaited<ReturnType<typeof api.updateClassTrack>>>();
      vi.mocked(api.updateClassTrack).mockReturnValueOnce(mutation.promise);
      fireEvent.click(within(inspector).getByRole('button', { name: 'Attack' }));
      fireEvent.click(rowSelectButton('ct-2') as HTMLElement);
      await screen.findByRole('region', { name: 'Track inspector for Second Song' });
      expect(api.updateClassTrack).toHaveBeenCalledWith('ct-1', { intensity: 'hard' });
      await act(async () => mutation.resolve(makeClassTrack('ct-1', 0)));
      await waitFor(() => expect(api.listClassTracks).toHaveBeenCalledTimes(2));
      expect(screen.getByRole('region', { name: 'Track inspector for Second Song' })).toBeTruthy();
    },
  );

  it('says whether the inspector matches what is stored, and gates Save on a change', async () => {
    installClassWithTracks('Draft state ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockResolvedValue(makeClassTrack('ct-1', 0));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Draft state ride/ }));
    await screen.findByRole('heading', { name: 'Draft state ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    const saveButton = within(inspector).getByRole('button', {
      name: 'Save',
    }) as HTMLButtonElement;
    // Nothing typed yet: the panel says so, and Save has nothing to commit.
    expect(within(inspector).getByText(/nothing typed to save/i)).toBeTruthy();
    expect(saveButton.disabled).toBe(true);

    fireEvent.change(within(inspector).getByRole('textbox', { name: 'Creator notes' }), {
      target: { value: 'Hold the climb.' },
    });
    expect(within(inspector).getByText(/unsaved typing/i)).toBeTruthy();
    expect(saveButton.disabled).toBe(false);

    saveButton.focus();
    fireEvent.click(saveButton);
    const savedStatus = await within(inspector).findByText('Saved.');
    expect(document.activeElement).toBe(savedStatus);
    expect(saveButton.disabled).toBe(true);
  });

  it('seeds Track length from baseDurationMs and omits durationMsOverride when untouched', async () => {
    installClassWithTracks('Clip window ride', [
      {
        classTrackId: 'ct-1',
        durationMs: 365000,
        baseDurationMs: 420000,
        title: 'Seven Minute Song',
        clipStartMs: 25000,
        clipEndMs: 390000,
      },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockResolvedValue(
      makeClassTrack('ct-1', 0, { clipStartMs: 25000, clipEndMs: 390000 }),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Clip window ride/ }));
    await screen.findByRole('heading', { name: 'Clip window ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for Seven Minute Song',
    });
    const lengthField = within(inspector).getByRole('textbox', { name: /Track length/ });
    expect((lengthField as HTMLInputElement).value).toBe('7:00');
    expect(
      (within(inspector).getByLabelText('Clip start (minutes:seconds)') as HTMLInputElement).value,
    ).toBe('0:25');
    expect(
      (within(inspector).getByLabelText('Clip end (minutes:seconds)') as HTMLInputElement).value,
    ).toBe('6:30');

    fireEvent.change(within(inspector).getByRole('textbox', { name: 'Creator notes' }), {
      target: { value: 'Check the climb cue.' },
    });
    fireEvent.click(within(inspector).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.updateClassTrack).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).toEqual({
      intensity: 'mod',
      displayBpmOverride: null,
      displayRpm: null,
      holdCount: null,
      clipStartMs: 25000,
      clipEndMs: 390000,
      beatAnchorMs: 0,
      notes: 'Check the climb cue.',
    });
    expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).not.toHaveProperty(
      'durationMsOverride',
    );
  });

  it('omits durationMsOverride on an untouched save even when the source duration is not a round second', async () => {
    // Real provider durations (Spotify/Apple Music/SoundCloud) are rarely exact
    // seconds. The "Track length" field only expresses m:ss, so an untouched save
    // must compare at the same rounded granularity or it manufactures an override.
    installClassWithTracks('Odd duration ride', [
      {
        classTrackId: 'ct-1',
        durationMs: 419980,
        baseDurationMs: 419980,
        title: 'Odd Duration Song',
      },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockResolvedValue(makeClassTrack('ct-1', 0));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Odd duration ride/ }));
    await screen.findByRole('heading', { name: 'Odd duration ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for Odd Duration Song',
    });
    const lengthField = within(inspector).getByRole('textbox', { name: /Track length/ });
    expect((lengthField as HTMLInputElement).value).toBe('6:59');

    fireEvent.change(within(inspector).getByRole('textbox', { name: 'Creator notes' }), {
      target: { value: 'Check the climb cue.' },
    });
    fireEvent.click(within(inspector).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.updateClassTrack).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).not.toHaveProperty(
      'durationMsOverride',
    );
  });

  it('sends durationMsOverride only when Track length is intentionally changed', async () => {
    installClassWithTracks('Length edit ride', [
      {
        classTrackId: 'ct-1',
        durationMs: 365000,
        baseDurationMs: 420000,
        title: 'Seven Minute Song',
        clipStartMs: 25000,
        clipEndMs: 390000,
      },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockResolvedValue(
      makeClassTrack('ct-1', 0, {
        clipStartMs: 25000,
        clipEndMs: 390000,
        durationMsOverride: 360000,
      }),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Length edit ride/ }));
    await screen.findByRole('heading', { name: 'Length edit ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for Seven Minute Song',
    });
    fireEvent.change(within(inspector).getByRole('textbox', { name: /Track length/ }), {
      target: { value: '6:00' },
    });
    fireEvent.click(within(inspector).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.updateClassTrack).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({ durationMsOverride: 360000 }),
      ),
    );
  });

  it('commits a zone on the click, and typed fields on Enter', async () => {
    installClassWithTracks('Scoring pass ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockResolvedValue(makeClassTrack('ct-1', 0));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Scoring pass ride/ }));
    await screen.findByRole('heading', { name: 'Scoring pass ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });

    // Scoring is the act this panel exists for: one click, no trip to Save.
    fireEvent.click(within(inspector).getByRole('button', { name: 'Attack' }));
    await waitFor(() =>
      expect(api.updateClassTrack).toHaveBeenCalledWith('ct-1', { intensity: 'hard' }),
    );
    expect(await within(inspector).findByText('✓ Saved')).toBeTruthy();
    // ...and it only sent the zone, so it can't commit half-typed text with it.
    expect(vi.mocked(api.updateClassTrack).mock.calls[0]?.[1]).toEqual({ intensity: 'hard' });

    // Typed fields still commit deliberately — from the keyboard, not only the button.
    vi.mocked(api.updateClassTrack).mockClear();
    // BPM is the first number field; RPM and holds live under Advanced.
    const bpm = within(inspector).getAllByRole('spinbutton')[0]!;
    fireEvent.change(bpm, { target: { value: '128' } });
    fireEvent.keyDown(bpm, { key: 'Enter' });
    await waitFor(() =>
      expect(api.updateClassTrack).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({ displayBpmOverride: 128 }),
      ),
    );
    expect(await within(inspector).findByText('Saved.')).toBeTruthy();
  });

  it('puts a zone back when its write fails, instead of showing a value that did not land', async () => {
    installClassWithTracks('Zone failure ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockRejectedValue(new Error('zone save failed'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Zone failure ride/ }));
    await screen.findByRole('heading', { name: 'Zone failure ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    fireEvent.click(within(inspector).getByRole('button', { name: 'Attack' }));

    expect(await within(inspector).findByText('zone save failed')).toBeTruthy();
    // Back to the stored zone (the fixture's 'mod' → Z2 Push), not the one that failed.
    await waitFor(() =>
      expect(
        within(inspector).getByRole('button', { name: 'Push' }).getAttribute('aria-pressed'),
      ).toBe('true'),
    );
    expect(
      within(inspector).getByRole('button', { name: 'Attack' }).getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('explains the zone words and what an empty BPM box falls back to', async () => {
    installClassWithTracks('Vocabulary ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Vocabulary ride/ }));
    await screen.findByRole('heading', { name: 'Vocabulary ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    // Z0–Z4 are codes until the panel says what the selected one means.
    expect(within(inspector).getByText(/Selected: Z2 Push — steady working effort/)).toBeTruthy();
    // "Display BPM override" named a column; the help names the consequence of
    // leaving the box empty (the fixture track resolves to 120 BPM).
    expect(within(inspector).getByText(/Blank uses the track’s own 120 BPM/)).toBeTruthy();
  });

  it('keeps a failed scoring save local, visible, and editable', async () => {
    installClassWithTracks('Save failure ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassTrack).mockRejectedValue(new Error('save timed out'));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Save failure ride/ }));
    await screen.findByRole('heading', { name: 'Save failure ride' });
    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    const notes = within(inspector).getByRole('textbox', { name: 'Creator notes' });
    fireEvent.change(notes, { target: { value: 'Do not lose this draft.' } });
    fireEvent.click(within(inspector).getByRole('button', { name: 'Save' }));

    expect(await within(inspector).findByText('save timed out')).toBeTruthy();
    expect((notes as HTMLTextAreaElement).value).toBe('Do not lose this draft.');
    expect(rowSelectButton('ct-1')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('returns focus to the nearest remaining track after removing one', async () => {
    installClassWithTracks('Focus ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
      { classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' },
    ]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Focus ride/ }));
    await screen.findByRole('heading', { name: 'Focus ride' });

    // Open the inspector for the first track via its row control (the same button
    // that carries the data-track-select-id focus anchor).
    const firstRow = rowSelectButton('ct-1');
    expect(firstRow).not.toBeNull();
    fireEvent.click(firstRow as HTMLElement);

    const removeTrack = await screen.findByRole('button', { name: 'Remove track' });
    expect(removeTrack.querySelector('svg')).toBeTruthy();
    expect(removeTrack.textContent).toContain('Remove track');
    fireEvent.click(removeTrack);

    // Removing the first track lands focus on the track that slides into its slot
    // (the second), not on <body>.
    await waitFor(() => {
      expect(document.activeElement).toBe(rowSelectButton('ct-2'));
    });
    expect(document.activeElement).not.toBe(document.body);
  });

  it('returns focus to the inspector placeholder after removing the last track', async () => {
    installClassWithTracks('Solo ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'Only Song' },
    ]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Solo ride/ }));
    await screen.findByRole('heading', { name: 'Solo ride' });

    fireEvent.click(rowSelectButton('ct-1') as HTMLElement);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove track' }));

    // With no tracks left, focus moves to the (now focusable) inspector placeholder
    // rather than falling to <body>.
    const placeholderText = await screen.findByText(/Select a song in Playback order/);
    const placeholder = placeholderText.parentElement as HTMLElement;
    await waitFor(() => {
      expect(document.activeElement).toBe(placeholder);
    });
    expect(document.activeElement).not.toBe(document.body);
  });

  it('focuses the newly added track row after adding a track manually', async () => {
    installClassWithTracks('Addition ride', []);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Addition ride/ }));
    await screen.findByRole('heading', { name: 'Addition ride' });

    // Open the sourcing task and its manual-entry disclosure.
    fireEvent.click(screen.getByRole('button', { name: 'Manual track' }));

    // Fill the manual track form
    fireEvent.change(screen.getByRole('textbox', { name: 'Track title' }), {
      target: { value: 'New Banger' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Track artist' }), {
      target: { value: 'The Artist' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add track' }));

    // Wait for the new row to appear and take focus
    await waitFor(() => {
      expect(document.activeElement).toBe(rowSelectButton('ct-added'));
    });
    expect(document.activeElement).not.toBe(document.body);
  });

  it('opens the first track’s cue box from readiness Write the first cue', async () => {
    installClassWithTracks('Cue handoff ride', [
      { classTrackId: 'ct-1', durationMs: 240000, title: 'First Light' },
      { classTrackId: 'ct-2', durationMs: 180000, title: 'Second Song' },
    ]);
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Cue handoff ride/ }));
    await screen.findByRole('heading', { name: 'Cue handoff ride' });

    fireEvent.click(screen.getByRole('button', { name: 'Write the first cue' }));

    const inspector = await screen.findByRole('region', {
      name: 'Track inspector for First Light',
    });
    const cueField = await within(inspector).findByRole('textbox', { name: 'Move name' });
    await waitFor(() => expect(document.activeElement).toBe(cueField));
  });
});

const planBlock = (id: string, position: number, label: string): ClassPlanBlock => ({
  id,
  classId: 'class-1',
  recipeBlockKey: `cycle_${position}`,
  position,
  segmentType: 'climb',
  label,
  targetDurationMs: 360_000,
  intensity: 'mod',
  teachingGoal: 'Goal',
  movementFocus: 'Focus',
  guidance: {
    kind: 'cycle',
    posture: 'seated',
    cadenceMinRpm: 80,
    cadenceMaxRpm: 95,
    rpeMin: 4,
    rpeMax: 6,
  },
  createdAt: 1,
  updatedAt: 1,
});

describe('Dashboard plan-first next step', () => {
  const firstBlock = planBlock('00000000-0000-4000-8000-0000000000b1', 0, 'Arrive');
  const secondBlock = planBlock('00000000-0000-4000-8000-0000000000b2', 1, 'Climb');
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  afterEach(() => {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('leads a 0-track scaffold with the plan, not Live chrome or stack Add music', async () => {
    const ride = { ...makeClass('Plan ride'), scaffoldRecipeId: 'cycle_45_v1' as const };
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockResolvedValue(liveRunPayload([]));
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([firstBlock, secondBlock]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(liveRunPayload([]));
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Plan ride$/ }));
    await screen.findByRole('heading', { name: 'Plan ride' });

    const choose = await screen.findByRole('button', {
      name: 'Choose music for Block 1 · Arrive',
    });
    await waitFor(() => expect(document.activeElement).toBe(choose));
    expect(screen.getAllByText('2 blocks still need music').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Add music' })).toBeNull();
    expect(screen.queryByText(/Start this class any way you like/)).toBeNull();
    expect(screen.queryByText(/What Live needs from this class/)).toBeNull();
    expect(screen.queryByLabelText('Class Pulse')).toBeNull();
    expect(screen.getByRole('button', { name: /run live/i }).className).not.toMatch(
      /rf-btn-primary/,
    );

    fireEvent.click(choose);
    const destCard = document.getElementById(`plan-block-card-${firstBlock.id}`);
    expect(destCard).not.toBeNull();
    const picker = await within(destCard as HTMLElement).findByRole('region', {
      name: /Choose music for Block 1 · Arrive/,
    });
    expect(within(picker).getByLabelText('Track destination').textContent).toMatch(
      /Block 1 · Arrive/,
    );
    expect(scrollIntoView).toHaveBeenCalled();
    expect(
      within(destCard as HTMLElement).getByRole('button', { name: 'Close music' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add music' })).toBeNull();
    expect(destCard?.contains(picker)).toBe(true);
  });

  it('opens class-level playlist import from a scaffold without assigning a block', async () => {
    const ride = { ...makeClass('Plan ride'), scaffoldRecipeId: 'cycle_45_v1' as const };
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockResolvedValue(liveRunPayload([]));
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([firstBlock, secondBlock]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    HTMLElement.prototype.scrollIntoView = vi.fn();

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Plan ride$/ }));
    const header = await screen.findByRole('region', { name: 'Class builder' });
    const open = within(header).getByRole('button', { name: 'Add a playlist' });
    expect(screen.getAllByRole('button', { name: 'Add a playlist' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Import a playlist as song blocks' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add music' })).toBeNull();
    expect(screen.queryByText(/Adds after your current/)).toBeNull();
    fireEvent.click(open);
    const region = await screen.findByRole('region', { name: /Add music to Plan ride/ });
    expect(
      within(region).getByRole('button', { name: 'Import Playlist URL', pressed: true }),
    ).toBeTruthy();
    expect(within(region).getByLabelText('Playlist URL')).toBeTruthy();
    expect(within(region).getByRole('button', { name: 'Search' })).toBeTruthy();
    expect(region.closest('[id^="plan-block-card-"]')).toBeNull();
  });

  it('shows Add a playlist on a non-recipe class after the first import', async () => {
    const ride = makeClass('Imported ride');
    const song = planBlock('00000000-0000-4000-8000-0000000000c1', 0, 'Baianá');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([makeClassTrack('ct-1', 0)]);
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 180_000, title: 'Baianá' }]),
    );
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([song]);
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Imported ride$/ }));
    await screen.findByRole('heading', { name: 'Imported ride' });
    const header = await screen.findByRole('region', { name: 'Class builder' });
    const playlist = await within(header).findByRole('button', { name: 'Add a playlist' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Add music' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Import a playlist as song blocks' })).toBeNull();
    const note = within(header).getByText('Adds after your current 1 song');
    expect(playlist.parentElement).toBe(note.parentElement);
    expect(within(header).getByRole('heading', { name: 'Imported ride' })).toBeTruthy();
    expect(within(header).getByText('Cycle')).toBeTruthy();
    const playback = screen.getByRole('heading', { name: 'Playback order' });
    expect(playback.parentElement?.parentElement?.contains(playlist)).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));
    const region = await screen.findByRole('region', { name: /Add music to Imported ride/ });
    expect(within(region).getByLabelText('Playlist URL')).toBeTruthy();
    expect(within(region).getByRole('button', { name: 'Search' })).toBeTruthy();
    expect(region.closest('[id^="plan-block-card-"]')).toBeNull();
  });

  it('shows one Add a playlist button on a recipe class that already has tracks', async () => {
    const ride = { ...makeClass('Recipe ride'), scaffoldRecipeId: 'cycle_45_v1' as const };
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([
      makeClassTrack('ct-1', 0),
      makeClassTrack('ct-2', 1),
    ]);
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([
        { classTrackId: 'ct-1', durationMs: 180_000, title: 'Baianá' },
        { classTrackId: 'ct-2', durationMs: 180_000, title: 'Night Drive' },
      ]),
    );
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([firstBlock, secondBlock]);
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Recipe ride$/ }));
    await screen.findByRole('heading', { name: 'Recipe ride' });
    const header = await screen.findByRole('region', { name: 'Class builder' });
    const playlist = within(header).getByRole('button', { name: 'Add a playlist' });
    expect(screen.getAllByRole('button', { name: 'Add a playlist' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Import a playlist as song blocks' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add music' })).toBeNull();
    const note = within(header).getByText('Adds after your current 2 songs');
    expect(playlist.parentElement).toBe(note.parentElement);
    expect(screen.queryByRole('navigation', { name: 'Class chooser' })).toBeNull();
  });

  it('hides Add a playlist without edit access', async () => {
    const ride = makeClass('View ride', 'view', 'me');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([makeClassTrack('ct-1', 0)]);
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 180_000, title: 'Baianá' }]),
    );
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([firstBlock]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^View ride$/ }));
    await screen.findByRole('heading', { name: 'View ride' });
    expect(screen.queryByRole('button', { name: 'Add a playlist' })).toBeNull();
    expect(screen.queryByText(/Adds after your current/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Import a playlist as song blocks' })).toBeNull();
  });

  it('updates an open music picker destination when its block is renamed', async () => {
    const ride = { ...makeClass('Plan ride'), scaffoldRecipeId: 'cycle_45_v1' as const };
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockResolvedValue(liveRunPayload([]));
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([firstBlock, secondBlock]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateClassPlanBlock).mockResolvedValue({
      ...firstBlock,
      label: 'Cadence climb',
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Plan ride$/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Choose music for Block 1 · Arrive' }),
    );
    expect(
      await screen.findByRole('region', { name: /Choose music for Block 1 · Arrive/ }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Block 1 · Arrive' }));
    fireEvent.change(screen.getByLabelText('Block name'), {
      target: { value: 'Cadence climb' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.updateClassPlanBlock).toHaveBeenCalledWith(firstBlock.id, {
      label: 'Cadence climb',
    });
    const picker = await screen.findByRole('region', {
      name: /Choose music for Block 1 · Cadence climb/,
    });
    expect(within(picker).getByLabelText('Track destination').textContent).toMatch(
      /Block 1 · Cadence climb/,
    );
  });

  it('stays on the next empty block after the first assign and keeps Pulse off', async () => {
    const ride = { ...makeClass('Mid-build ride'), scaffoldRecipeId: 'cycle_45_v1' as const };
    const assigned = { ...makeClassTrack('ct-1', 0), planBlockId: firstBlock.id };
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockResolvedValue([assigned]);
    vi.mocked(api.getRunPayload).mockResolvedValue(
      liveRunPayload([{ classTrackId: 'ct-1', durationMs: 180_000, title: 'Baianá' }]),
    );
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([firstBlock, secondBlock]);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.searchProvider).mockResolvedValue([
      {
        provider: 'soundcloud',
        providerTrackId: 'tr-1',
        providerUri: null,
        title: 'Instinct',
        artist: 'Artist',
        albumArtUrl: null,
        durationMs: 240_000,
      },
    ]);
    vi.mocked(api.importTrack).mockResolvedValue({ id: 'track-added' } as Awaited<
      ReturnType<typeof api.importTrack>
    >);
    vi.mocked(api.addTrack).mockResolvedValue({
      ...makeClassTrack('ct-added', 1),
      planBlockId: secondBlock.id,
    });
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Mid-build ride$/ }));
    await screen.findByRole('heading', { name: 'Mid-build ride' });
    expect((await screen.findAllByText('Block 2 still needs music')).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.queryByLabelText('Class Pulse')).toBeNull();
    expect(screen.getByRole('button', { name: /run live/i })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('button', { name: 'Add music' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Choose music for Block 2 · Climb' }));
    const destCard = document.getElementById(`plan-block-card-${secondBlock.id}`);
    expect(destCard).not.toBeNull();
    const picker = await within(destCard as HTMLElement).findByRole('region', {
      name: /Choose music for Block 2 · Climb/,
    });
    fireEvent.change(within(picker).getByRole('searchbox'), { target: { value: 'instinct' } });
    fireEvent.click(await within(picker).findByRole('button', { name: 'Add Instinct by Artist' }));

    await waitFor(() => expect(api.addTrack).toHaveBeenCalled());
    expect(within(destCard as HTMLElement).getByLabelText('Track destination').textContent).toMatch(
      /Block 2 · Climb/,
    );
    expect(within(picker).getByRole('button', { name: 'Instinct — Added' })).toBeTruthy();
    expect(screen.queryByLabelText('Class Pulse')).toBeNull();
    expect(screen.getByText('Track inspector')).toBeTruthy();
    expect(document.getElementById(`plan-block-card-${secondBlock.id}`)?.contains(picker)).toBe(
      true,
    );
    expect(scrollIntoView).toHaveBeenCalled();
  });
});

describe('Dashboard failure copy', () => {
  const profile = {
    id: 'me',
    email: 'tester@example.com',
    displayName: 'Tester',
    imageUrl: null,
    createdAt: 1,
    updatedAt: 1,
  } as const;

  async function showLoadMoreFailure(reason: unknown, expected: string) {
    vi.mocked(api.listClasses)
      .mockResolvedValueOnce({ items: [makeClass('Morning ride')], nextCursor: 'page-2' })
      .mockRejectedValueOnce(reason);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Load more classes' }));

    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.queryByText('Class library unavailable')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Morning ride/ }).length).toBeGreaterThan(0);
  }

  it('shows the load-more fallback for a non-Error on a populated list', async () => {
    // A thrown string is kept by errMessage. A non-Error object is the blank case.
    await showLoadMoreFailure({ code: 'down' }, 'Something went wrong.');
  });

  it('shows the load-more fallback for an empty Error on a populated list', async () => {
    await showLoadMoreFailure(new Error(''), 'Something went wrong.');
  });

  it('keeps a load-more Error message on a populated list', async () => {
    await showLoadMoreFailure(new Error('page two failed'), 'page two failed');
  });

  async function failProfileSave(reason: unknown) {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    vi.mocked(api.updateMe).mockRejectedValueOnce(reason);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save profile' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    return screen.findByRole('alert');
  }

  it('shows the profile-save fallback for a non-Error', async () => {
    const alert = await failProfileSave({ code: 'down' });
    expect(alert.textContent).toContain('Profile was not changed');
    expect(alert.textContent).toContain('Something went wrong.');
    expect(alert.textContent).not.toContain('undefined');
  });

  it('shows the profile-save fallback for an empty Error', async () => {
    const alert = await failProfileSave(new Error(''));
    expect(alert.textContent).toContain('Profile was not changed');
    expect(alert.textContent).toContain('Something went wrong.');
  });

  it('keeps a profile-save Error message', async () => {
    const alert = await failProfileSave(new Error('save offline'));
    expect(alert.textContent).toContain('Profile was not changed');
    expect(alert.textContent).toContain('save offline');
    expect(alert.textContent).not.toContain('Something went wrong.');
  });

  async function openFailedDetail(reason: unknown) {
    const ride = makeClass('Broken ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.listClassTracks).mockRejectedValueOnce(reason);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Broken ride/ }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    return alert;
  }

  it('shows the class-detail fallback for a non-Error', async () => {
    const alert = await openFailedDetail({ code: 'down' });
    expect(within(alert).getByText('Could not load this class.')).toBeTruthy();
  });

  it('shows the class-detail fallback for an empty Error and not a blank alert', async () => {
    const alert = await openFailedDetail(new Error(''));
    expect(within(alert).getByText('Could not load this class.')).toBeTruthy();
  });

  it('keeps a class-detail Error message', async () => {
    const alert = await openFailedDetail(new Error('detail boom'));
    expect(within(alert).getByText('detail boom')).toBeTruthy();
  });

  it('shows playlist and likes shelf labels when those loads throw a non-Error', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listPlaylists).mockRejectedValue('playlist-down');
    vi.mocked(api.listLikes).mockRejectedValue('likes-down');

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');

    expect(await screen.findByText('Playlists unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    expect(await screen.findByText('Likes unavailable')).toBeTruthy();
    expect(screen.queryByText('playlist-down')).toBeNull();
    expect(screen.queryByText('likes-down')).toBeNull();
    expect(screen.queryByText('undefined')).toBeNull();
  });

  it('keeps the canned profile sentence and an ACC code for a non-Error', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockRejectedValue('profile-down');
    vi.mocked(api.listConnections).mockResolvedValue([]);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    expect(
      await screen.findByText(/Ritmo could not read the profile\. Reference ACC-[0-9A-Z]+\./),
    ).toBeTruthy();
    expect(screen.queryByText('undefined')).toBeNull();
    expect(screen.queryByText('profile-down')).toBeNull();
  });

  it('keeps the canned connections sentence and a CONN code for a non-Error', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.getMe).mockResolvedValue(profile);
    vi.mocked(api.listConnections).mockRejectedValue('conn-down');

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

    expect(
      await screen.findByText(
        /Ritmo could not read music connections\. Reference CONN-[0-9A-Z]+\./,
      ),
    ).toBeTruthy();
    expect(screen.queryByText('undefined')).toBeNull();
    expect(screen.queryByText('conn-down')).toBeNull();
  });
});

describe('Dashboard loading and load-error states', () => {
  it('shows a labelled skeleton, not a sentence, while the builder loads', async () => {
    const ride = makeClass('Slow ride');
    vi.mocked(api.listClasses).mockResolvedValue(page([ride]));
    vi.mocked(api.listClassTracks).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.getRunPayload).mockReturnValue(new Promise(() => {}));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /^Slow ride/ }));

    expect(await screen.findByRole('status', { name: 'Loading class' })).toBeTruthy();
    expect(screen.queryByText('Loading class…')).toBeNull();
  });

  it('shows a labelled skeleton while music connections load', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockReturnValue(new Promise(() => {}));

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));

    expect(await screen.findByRole('status', { name: 'Checking music connections' })).toBeTruthy();
    expect(screen.queryByText('Checking music connections…')).toBeNull();
  });

  it('shows a labelled skeleton on the Live tab while classes load', async () => {
    vi.mocked(api.listClasses).mockReturnValue(new Promise(() => {}));

    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Live' }));

    expect(await screen.findByRole('status', { name: 'Loading classes' })).toBeTruthy();
    expect(screen.queryByText('Loading classes…')).toBeNull();
  });

  it('shows the recovery card with Retry when the Live tab cannot read classes', async () => {
    vi.mocked(api.listClasses)
      .mockRejectedValueOnce(new Error('list offline'))
      .mockResolvedValue(page([]));

    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Live' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: "Your classes didn't load." })).toBeTruthy();
    expect(screen.queryByText(/No classes with tracks yet/)).toBeNull();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect((await screen.findAllByText(/No classes with tracks yet/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.listClasses).toHaveBeenCalledTimes(2);
  });
});

type LikesQuery = { cursor?: string; q?: string };

describe('Music Songs paging and search (RF-132)', () => {
  const song = (id: string, title = `Song ${id}`, provider: Provider = 'spotify') => ({
    provider,
    providerTrackId: id,
    providerUri: null,
    title,
    artist: 'Artist',
    albumArtUrl: null,
    durationMs: 180000,
  });

  async function openSongs(service: string) {
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService(service);
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
  }

  it('labels the provider-order sort "Library order", not Recents', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikes).mockResolvedValue([song('1', 'Levels')]);

    await openSongs('Spotify');
    const sort = await screen.findByRole('group', { name: 'Sort' });
    expect(within(sort).getByRole('button', { name: 'Library order' })).toBeTruthy();
    expect(within(sort).queryByRole('button', { name: 'Recents' })).toBeNull();
    expect(
      within(sort).getByRole('button', { name: 'Library order' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('loads the next page with the provider cursor and appends it', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) =>
        options.cursor === 'cursor-1'
          ? { items: [song('2', 'Second Page Song')], nextCursor: null }
          : { items: [song('1', 'First Page Song')], nextCursor: 'cursor-1' },
    );

    await openSongs('Spotify');
    expect(await screen.findByText('First Page Song')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Load more songs' }));

    expect(await screen.findByText('Second Page Song')).toBeTruthy();
    expect(screen.getByText('First Page Song')).toBeTruthy();
    expect(api.listLikesPage).toHaveBeenCalledWith('spotify', { cursor: 'cursor-1' });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Load more songs' })).toBeNull(),
    );
  });

  it('keeps loaded songs and offers a retry when loading more fails', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) => {
        if (options.cursor) throw new Error('Spotify is busy');
        return { items: [song('1', 'First Page Song')], nextCursor: 'cursor-1' };
      },
    );

    await openSongs('Spotify');
    fireEvent.click(await screen.findByRole('button', { name: 'Load more songs' }));

    expect(await screen.findByText('Couldn’t load more songs: Spotify is busy')).toBeTruthy();
    expect(screen.getByText('First Page Song')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Load more songs' })).toBeTruthy();
  });

  it('searches the whole Apple Music library on the server', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...spotifyConnection(), provider: 'apple_music' },
    ]);
    vi.mocked(api.listPlaylists).mockResolvedValue([]);
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) =>
        options.q
          ? { items: [song('deep', 'Deep Cut Past Page One', 'apple_music')], nextCursor: null }
          : { items: [song('a', 'A.F.U.', 'apple_music')], nextCursor: 'apple-cursor' },
    );

    await openSongs('Apple Music');
    expect(await screen.findByText('A.F.U.')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), {
      target: { value: 'deep cut' },
    });

    expect(await screen.findByText('Deep Cut Past Page One')).toBeTruthy();
    expect(api.listLikesPage).toHaveBeenCalledWith('apple_music', { q: 'deep cut' });
    expect(screen.queryByText('A.F.U.')).toBeNull();
    // Results include loaded matches too, so Load more can still add some.
    expect(screen.getByRole('button', { name: 'Load more songs' })).toBeTruthy();
  });

  it('falls back to loaded songs with a note when the Apple library search fails', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...spotifyConnection(), provider: 'apple_music' },
    ]);
    vi.mocked(api.listPlaylists).mockResolvedValue([]);
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) => {
        if (options.q) throw new Error('Too many requests');
        return { items: [song('a', 'Angel', 'apple_music')], nextCursor: null };
      },
    );

    await openSongs('Apple Music');
    expect(await screen.findByText('Angel')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), {
      target: { value: 'angel' },
    });

    expect(
      await screen.findByText(
        'Couldn’t search your whole Apple Music library. Showing matches in loaded songs.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Angel')).toBeTruthy();
  });

  it('keeps loading pages while searching, stops at 1,000 songs, then offers Keep loading', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    let calls = 0;
    vi.mocked(api.listLikesPage).mockImplementation(async () => {
      const from = calls * 200;
      calls += 1;
      return {
        items: Array.from({ length: 200 }, (_, i) => song(`s${from + i}`)),
        nextCursor: `cursor-${calls}`,
      };
    });

    await openSongs('Spotify');
    expect(await screen.findByText('Song s0')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), {
      target: { value: 'not in the first thousand' },
    });

    expect(
      await screen.findByText('Searched your first 1,000 liked songs.', {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(calls).toBe(5);
    expect(screen.getByText('No matches.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Keep loading' }));
    await waitFor(() => expect(calls).toBeGreaterThan(5));
  });

  // Regression (#665 review item 1): a connections refresh re-ran the first-page
  // load and replaced the provider's likes with page 1, dropping Load more pages.
  it('keeps loaded pages when the connection list refreshes and the provider is unchanged', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    // A fresh array per read, as from the network, so the refresh re-renders.
    vi.mocked(api.listConnections).mockImplementation(async () => [spotifyConnection()]);
    vi.mocked(api.listPlaylists)
      .mockRejectedValueOnce(new Error('Playlists down'))
      .mockResolvedValue([]);
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) =>
        options.cursor === 'cursor-1'
          ? { items: [song('2', 'Second Page Song')], nextCursor: null }
          : { items: [song('1', 'First Page Song')], nextCursor: 'cursor-1' },
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    // The playlists shelf failed; its Retry re-fetches the connection list.
    expect(await screen.findByRole('button', { name: 'Retry Spotify library' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load more songs' }));
    expect(await screen.findByText('Second Page Song')).toBeTruthy();

    const connectionReads = vi.mocked(api.listConnections).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Playlists' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry Spotify library' }));
    await waitFor(() =>
      expect(vi.mocked(api.listConnections).mock.calls.length).toBeGreaterThan(connectionReads),
    );
    // The refreshed list reached the shelves: the playlists shelf re-read.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Retry Spotify library' })).toBeNull(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    expect(await screen.findByText('Second Page Song')).toBeTruthy();
    expect(screen.getByText('First Page Song')).toBeTruthy();
    // Page 1 was read once; the refresh did not reload it.
    expect(
      vi
        .mocked(api.listLikesPage)
        .mock.calls.filter((call: unknown[]) => !(call[1] as LikesQuery | undefined)?.cursor),
    ).toHaveLength(1);
  });

  // Regression (#665 review item 3): Load more was hidden whenever a server search
  // result existed, even a failed one, stranding the user on loaded songs.
  it('offers Load more when the Apple library search failed', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...spotifyConnection(), provider: 'apple_music' },
    ]);
    vi.mocked(api.listPlaylists).mockResolvedValue([]);
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) => {
        if (options.q) throw new Error('Too many requests');
        if (options.cursor === 'apple-cursor') {
          return { items: [song('b', 'Angel Two', 'apple_music')], nextCursor: null };
        }
        return { items: [song('a', 'Angel One', 'apple_music')], nextCursor: 'apple-cursor' };
      },
    );

    await openSongs('Apple Music');
    expect(await screen.findByText('Angel One')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), {
      target: { value: 'angel' },
    });
    expect(
      await screen.findByText(
        'Couldn’t search your whole Apple Music library. Showing matches in loaded songs.',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Load more songs' }));
    expect(await screen.findByText('Angel Two')).toBeTruthy();
    expect(api.listLikesPage).toHaveBeenCalledWith('apple_music', { cursor: 'apple-cursor' });
  });

  // Regression (#665 review item 5): pages that add no new songs never reached the
  // 1,000-song bound, so one query kept requesting pages.
  it('stops a search autoload after 5 requests when pages add no new songs', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    let calls = 0;
    vi.mocked(api.listLikesPage).mockImplementation(async () => {
      calls += 1;
      // Fail loudly instead of hanging if the bound regresses.
      if (calls > 20) throw new Error('Runaway autoload');
      // Every page repeats the same song and still says more remain.
      return { items: [song('same', 'Same Song')], nextCursor: `cursor-${calls}` };
    });

    await openSongs('Spotify');
    expect(await screen.findByText('Same Song')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), {
      target: { value: 'nothing matches' },
    });

    expect(
      await screen.findByText('Searched your first 1 liked songs.', {}, { timeout: 5000 }),
    ).toBeTruthy();
    // First page plus 5 autoload requests for this query, then it stops.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(calls).toBe(6);
    expect(screen.getByRole('button', { name: 'Keep loading' })).toBeTruthy();
  });

  // Regression (#665 second review item 2): the autoload budget was keyed on the
  // exact query and not debounced, so every keystroke got 5 fresh requests.
  it('keeps one autoload budget across keystrokes in a search', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    let calls = 0;
    vi.mocked(api.listLikesPage).mockImplementation(async () => {
      calls += 1;
      if (calls > 40) throw new Error('Runaway autoload');
      // Pages that add no new songs never move the song bound.
      return { items: [song('same', 'Same Song')], nextCursor: `cursor-${calls}` };
    });

    await openSongs('Spotify');
    expect(await screen.findByText('Same Song')).toBeTruthy();
    const search = screen.getByRole('searchbox', { name: 'Search songs' });
    const query = 'nothing matches';
    for (let i = 1; i <= query.length; i += 1) {
      fireEvent.change(search, { target: { value: query.slice(0, i) } });
      await new Promise((resolve) => setTimeout(resolve, 40));
    }

    expect(
      await screen.findByText('Searched your first 1 liked songs.', {}, { timeout: 5000 }),
    ).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const pageRequests = vi
      .mocked(api.listLikesPage)
      .mock.calls.filter((call: unknown[]) => (call[1] as LikesQuery | undefined)?.cursor);
    expect(pageRequests.length).toBeLessThanOrEqual(5);
  });

  // Regression (#665 second review item 1): during a first-page reload for a new
  // account, Load more still used the old account's cursor and appended its songs.
  it('does not load more from the previous account while a new account reloads', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    let connectionReads = 0;
    vi.mocked(api.listConnections).mockImplementation(async () => {
      connectionReads += 1;
      return [
        { ...spotifyConnection(), providerUserId: connectionReads === 1 ? 'acct-a' : 'acct-b' },
      ];
    });
    vi.mocked(api.listPlaylists)
      .mockRejectedValueOnce(new Error('Playlists down'))
      .mockResolvedValue([]);
    const reload = deferred<{ items: ReturnType<typeof song>[]; nextCursor: string | null }>();
    let firstPages = 0;
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) => {
        if (options.cursor === 'a-cursor') {
          return { items: [song('a2', 'Old Account Page Two')], nextCursor: null };
        }
        firstPages += 1;
        if (firstPages === 1) {
          return { items: [song('a1', 'Old Account Song')], nextCursor: 'a-cursor' };
        }
        return reload.promise;
      },
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await selectMusicService('Spotify');
    fireEvent.click(await screen.findByRole('button', { name: 'Retry Spotify library' }));
    await waitFor(() => expect(firstPages).toBe(2));

    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    const loadMore = screen.queryByRole('button', { name: 'Load more songs' });
    if (loadMore) fireEvent.click(loadMore);
    expect(api.listLikesPage).not.toHaveBeenCalledWith('spotify', { cursor: 'a-cursor' });

    reload.resolve({ items: [song('b1', 'New Account Song')], nextCursor: null });
    expect(await screen.findByText('New Account Song')).toBeTruthy();
    expect(screen.queryByText('Old Account Page Two')).toBeNull();
  });

  // Regression (#665 third review item 3): Apple's search (at most 100 matches)
  // replaced the local filter, hiding loaded matches beyond those 100.
  it('merges Apple library search matches with loaded matches, without duplicates', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([
      { ...spotifyConnection(), provider: 'apple_music' },
    ]);
    vi.mocked(api.listPlaylists).mockResolvedValue([]);
    // 600 loaded songs; 300 of them match "love".
    const loaded = Array.from({ length: 600 }, (_, i) =>
      song(`l${i}`, i < 300 ? `Love ${i}` : `Other ${i}`, 'apple_music'),
    );
    // 100 server matches: 50 already loaded, 50 not loaded yet.
    const server = [
      ...loaded.slice(0, 50),
      ...Array.from({ length: 50 }, (_, i) => song(`s${i}`, `Love deep ${i}`, 'apple_music')),
    ];
    vi.mocked(api.listLikesPage).mockImplementation(
      async (_provider: Provider, options: LikesQuery = {}) =>
        options.q
          ? { items: server, nextCursor: null }
          : { items: loaded, nextCursor: 'apple-cursor' },
    );

    await openSongs('Apple Music');
    expect(await screen.findByText('Other 599')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), {
      target: { value: 'love' },
    });

    expect(await screen.findByText('Love deep 0')).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Liked songs' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(350);
    expect(within(list).getByText('Love 299')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Load more songs' })).toBeTruthy();
  });

  it('says when "Create class from liked songs" used a subset of the library', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikesPage).mockResolvedValue({
      items: [song('1', 'Levels'), song('2', 'Wake Me Up')],
      nextCursor: 'cursor-1',
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openLikedSongs('Spotify');

    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify likes' });
    expect(
      within(dialog).getByText(
        'Using your first 2 liked songs. Load more on Music › Songs to choose from more.',
      ),
    ).toBeTruthy();
  });

  it('does not claim a subset when every liked song is loaded', async () => {
    vi.mocked(api.listClasses).mockResolvedValue(page([]));
    vi.mocked(api.listConnections).mockResolvedValue([spotifyConnection()]);
    vi.mocked(api.listLikesPage).mockResolvedValue({
      items: [song('1', 'Levels')],
      nextCursor: null,
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    await openLikedSongs('Spotify');

    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify likes' });
    expect(within(dialog).queryByText(/Using your first/)).toBeNull();
  });
});
