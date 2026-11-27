// @vitest-environment jsdom
/**
 * RF-111: opening, closing and duplicating in Music and Classes never acts on a
 * stale or hidden request. The playlist and Duplicate cases are the lane-B
 * repros from the 2026-10-28 audit (docs/audits/claude-code-audit-2026-10-28-4c344e2/repro/).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ClassListItem, MusicConnectionView, TrackSearchResult } from '@ritmofit/shared';
import { Dashboard } from './Dashboard.js';
import * as api from '../lib/api.js';
import { rememberConnectionReturn } from '../lib/connection-return.js';
import { settleAppRouteForTests } from '../lib/app-route.js';

vi.mock('../lib/api.js');
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
vi.mock('../lib/auth-client.js', () => ({ authClient: { signOut: vi.fn() } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const song = (id: string, title: string): TrackSearchResult => ({
  provider: 'spotify',
  providerTrackId: id,
  providerUri: `spotify:track:${id}`,
  title,
  artist: 'DJ Test',
  durationMs: 180000,
  albumArtUrl: null,
});

const spotify: MusicConnectionView = {
  id: 'conn-spotify',
  userId: 'me',
  provider: 'spotify',
  providerUserId: 'u',
  scope: 'user-library-read streaming',
  expiresAt: null,
  createdAt: 1,
  updatedAt: 1,
};

function listItem(id: string, title: string): ClassListItem {
  return {
    id,
    ownerUserId: 'me',
    title,
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    scaffoldRecipeId: null,
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: null,
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
    accessLevel: 'owner',
    trackCount: 0,
    totalDurationMs: 0,
    albumArtUrls: [],
  };
}

const created = (id: string, title: string) =>
  ({ ...listItem(id, title), accessLevel: undefined }) as unknown as Awaited<
    ReturnType<typeof api.createClass>
  >;

/** Node's process (vitest runs on Node; the web tsconfig does not type it). */
const nodeProcess = (
  globalThis as unknown as {
    process: {
      on(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
      off(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
    };
  }
).process;

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

beforeEach(() => {
  unhandled.length = 0;
  nodeProcess.on('unhandledRejection', onUnhandled);
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (k: string) => values.get(k) ?? null,
      key: (i: number) => Array.from(values.keys())[i] ?? null,
      removeItem: (k: string) => values.delete(k),
      setItem: (k: string, v: string) => values.set(k, String(v)),
    },
  });
  vi.mocked(api.listClasses).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(api.listConnections).mockResolvedValue([spotify]);
  vi.mocked(api.listLikes).mockResolvedValue([]);
  vi.mocked(api.listLikesPage).mockImplementation(async () => ({
    items: await api.listLikes('spotify'),
    nextCursor: null,
  }));
  vi.mocked(api.importTrack).mockImplementation(
    async (_p: string, id: string) => ({ id: `t-${id}`, durationMs: 180000 }) as never,
  );
  vi.mocked(api.importClassTracks).mockResolvedValue([]);
  vi.mocked(api.listClassTracks).mockResolvedValue([]);
  vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
  vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);
  vi.mocked(api.getClassShelfPayload).mockRejectedValue(new Error('n/a'));
  vi.mocked(api.getMe).mockResolvedValue({
    id: 'me',
    email: 't@example.com',
    displayName: 'Tester',
    imageUrl: null,
  } as never);
});

afterEach(async () => {
  nodeProcess.off('unhandledRejection', onUnhandled);
  cleanup();
  await settleAppRouteForTests();
  vi.useRealTimers();
  vi.clearAllMocks();
  window.sessionStorage?.clear();
  window.history.replaceState(null, '', '/');
});

const renderDashboard = () => render(<Dashboard userId="me" userName="Tester" />);
const navButton = (name: string) => screen.getByRole('button', { name });

describe('RF-111 saved-playlist dialog ignores a stale playlist reply', () => {
  function twoPlaylists() {
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-a',
        name: 'Warmup Ride',
        ownerName: 'S',
        trackCount: 1,
        coverImageUrl: null,
      },
      {
        provider: 'spotify',
        playlistId: 'pl-b',
        name: 'Cooldown Flow',
        ownerName: 'S',
        trackCount: 1,
        coverImageUrl: null,
      },
    ] as never);
    const a = deferred<TrackSearchResult[]>();
    const b = deferred<TrackSearchResult[]>();
    vi.mocked(api.listPlaylistTracks).mockImplementation((_p: string, id: string) =>
      id === 'pl-a' ? a.promise : b.promise,
    );
    vi.mocked(api.createClass).mockImplementation(async (body: { title: string }) =>
      created('00000000-0000-4000-8000-0000000000c1', body.title),
    );
    return { a, b };
  }

  /** Open A, change your mind while it loads, open B. */
  async function openAThenB() {
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Warmup Ride' }));
    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to playlists' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open Cooldown Flow' }));
    return dialog;
  }

  it('keeps B’s songs when A answers after B, so Start class imports B (lane-B repro)', async () => {
    const { a, b } = twoPlaylists();
    const dialog = await openAThenB();

    await act(async () => b.resolve([song('cool-1', 'Cool Song')]));
    await act(async () => a.resolve([song('warm-1', 'Warm Song')]));

    expect(within(dialog).getByRole('heading', { name: 'Cooldown Flow' })).toBeTruthy();
    expect(within(dialog).queryByText('Warm Song')).toBeNull();
    expect(within(dialog).getByText('Cool Song')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start class from Cooldown Flow' }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    expect(vi.mocked(api.createClass).mock.calls[0]![0].title).toBe('Cooldown Flow');
    expect(vi.mocked(api.importTrack).mock.calls.map((c: unknown[]) => c[1])).toEqual(['cool-1']);
  });

  it('never enables Start on A’s songs under B’s heading when A answers first', async () => {
    const { a, b } = twoPlaylists();
    const dialog = await openAThenB();

    await act(async () => a.resolve([song('warm-1', 'Warm Song')]));

    expect(within(dialog).queryByText('Warm Song')).toBeNull();
    expect(within(dialog).getByText('Loading playlist tracks...')).toBeTruthy();
    const start = within(dialog).getByRole('button', { name: 'Start class from Cooldown Flow' });
    expect((start as HTMLButtonElement).disabled).toBe(true);

    await act(async () => b.resolve([song('cool-1', 'Cool Song')]));
    expect(within(dialog).getByText('Cool Song')).toBeTruthy();
  });

  it('clears the songs on Back, and a late reply does not bring them back', async () => {
    const { a } = twoPlaylists();
    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Warmup Ride' }));
    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to playlists' }));

    await act(async () => a.resolve([song('warm-1', 'Warm Song')]));

    expect(within(dialog).getByRole('heading', { name: 'Spotify playlists' })).toBeTruthy();
    expect(within(dialog).queryByText('Warm Song')).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Open Warmup Ride' })).toBeTruthy();
  });
});

describe('RF-111 closing a create dialog during Creating', () => {
  it('playlist: does not navigate into the new class later, and says the class was created', async () => {
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-a',
        name: 'Warmup Ride',
        ownerName: 'S',
        trackCount: 1,
        coverImageUrl: null,
      },
    ] as never);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([song('warm-1', 'Warm Song')]);
    vi.mocked(api.createClass).mockImplementation(async (body: { title: string }) =>
      created('00000000-0000-4000-8000-0000000000c2', body.title),
    );
    const imported = deferred<unknown>();
    vi.mocked(api.importTrack).mockReturnValue(imported.promise as never);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Warmup Ride' }));
    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });
    await within(dialog).findByText('Warm Song');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start class from Warmup Ride' }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    expect(within(dialog).getByText('Creating...')).toBeTruthy();

    // The instructor closes the dialog while it creates, then moves on to Account.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close playlist browser' }));
    fireEvent.click(navButton('Account'));
    expect(navButton('Account').getAttribute('aria-current')).toBe('page');

    await act(async () => imported.resolve({ id: 't-warm-1', durationMs: 180000 }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(navButton('Account').getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('region', { name: 'Class builder' })).toBeNull();
    expect(screen.getByText('Class created: Warmup Ride').closest('[role="status"]')).toBeTruthy();
  });

  it('likes: Cancel during Creating keeps the instructor on Music, and the toast leaves on its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.listLikes).mockResolvedValue([song('like-1', 'Liked One')]);
    vi.mocked(api.createClass).mockImplementation(async (body: { title: string }) =>
      created('00000000-0000-4000-8000-0000000000c3', body.title),
    );
    const imported = deferred<unknown>();
    vi.mocked(api.importTrack).mockReturnValue(imported.promise as never);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    const list = await screen.findByRole('list', { name: 'Liked songs' });
    for (const box of within(list).getAllByRole('checkbox')) fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Create a class' }));
    const sheet = await screen.findByRole('dialog', { name: 'Create a class' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Create class' }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    expect(within(sheet).getByText('Creating…')).toBeTruthy();

    fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Create a class' })).toBeNull();

    await act(async () => imported.resolve({ id: 't-like-1', durationMs: 180000 }));
    const toast = await screen.findByText('Class created: Spotify likes');
    expect(navButton('Music').getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('region', { name: 'Class builder' })).toBeNull();
    expect(toast.closest('[role="status"]')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.queryByText('Class created: Spotify likes')).toBeNull();
  });

  /**
   * The list holds the new class from its creation, with the 0 tracks and 0:00 the
   * server reports before the import; its run payload reports one 3:00 song after.
   */
  function libraryLearnsOfCreatedClass(id: string) {
    const items: ClassListItem[] = [];
    vi.mocked(api.listClasses).mockImplementation(async () => ({
      items: [...items],
      nextCursor: null,
    }));
    vi.mocked(api.createClass).mockImplementation(async (body: { title: string }) => {
      items.push(listItem(id, body.title));
      return created(id, body.title);
    });
    vi.mocked(api.getRunPayload).mockImplementation(async (classId: string) => {
      if (classId !== id) throw new Error('no payload');
      return {
        class: { ...listItem(id, 'n/a'), totalDurationMs: 180000 },
        tracks: [{ track: { albumArtUrl: null } }],
      } as never;
    });
  }

  it('playlist: after a walk-away, the new class card shows its songs and length', async () => {
    libraryLearnsOfCreatedClass('00000000-0000-4000-8000-0000000000c5');
    vi.mocked(api.listPlaylists).mockResolvedValue([
      {
        provider: 'spotify',
        playlistId: 'pl-a',
        name: 'Warmup Ride',
        ownerName: 'S',
        trackCount: 1,
        coverImageUrl: null,
      },
    ] as never);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([song('warm-1', 'Warm Song')]);
    const imported = deferred<unknown>();
    vi.mocked(api.importTrack).mockReturnValue(imported.promise as never);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Warmup Ride' }));
    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });
    await within(dialog).findByText('Warm Song');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start class from Warmup Ride' }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close playlist browser' }));

    await act(async () => imported.resolve({ id: 't-warm-1', durationMs: 180000 }));
    await screen.findByText('Class created: Warmup Ride');
    fireEvent.click(navButton('Classes'));

    expect((await screen.findAllByText('Cycle · 1 track · 3:00')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Cycle · 0 tracks · 0:00')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Class builder' })).toBeNull();
  });

  it('likes: after a walk-away, the new class card shows its songs and length', async () => {
    libraryLearnsOfCreatedClass('00000000-0000-4000-8000-0000000000c6');
    vi.mocked(api.listLikes).mockResolvedValue([song('like-1', 'Liked One')]);
    const imported = deferred<unknown>();
    vi.mocked(api.importTrack).mockReturnValue(imported.promise as never);

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    const list = await screen.findByRole('list', { name: 'Liked songs' });
    for (const box of within(list).getAllByRole('checkbox')) fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Create a class' }));
    const sheet = await screen.findByRole('dialog', { name: 'Create a class' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Create class' }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }));

    await act(async () => imported.resolve({ id: 't-like-1', durationMs: 180000 }));
    await screen.findByText('Class created: Spotify likes');
    fireEvent.click(navButton('Classes'));

    expect((await screen.findAllByText('Cycle · 1 track · 3:00')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Cycle · 0 tracks · 0:00')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Class builder' })).toBeNull();
  });

  it('likes: with the dialog left open, Create class still opens the new class and shows no toast', async () => {
    vi.mocked(api.listLikes).mockResolvedValue([song('like-1', 'Liked One')]);
    vi.mocked(api.createClass).mockImplementation(async (body: { title: string }) =>
      created('00000000-0000-4000-8000-0000000000c4', body.title),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
    const list = await screen.findByRole('list', { name: 'Liked songs' });
    for (const box of within(list).getAllByRole('checkbox')) fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Create a class' }));
    const sheet = await screen.findByRole('dialog', { name: 'Create a class' });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Create class' }));

    expect(await screen.findByRole('region', { name: 'Class builder' })).toBeTruthy();
    expect(navButton('Classes').getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText(/^Class created:/)).toBeNull();
  });
});

describe('RF-111 Duplicate from the Recents row menu', () => {
  const ride = listItem('00000000-0000-4000-8000-0000000000a1', 'Morning ride');

  async function duplicateFromMenu() {
    fireEvent.click(await screen.findByRole('button', { name: 'More actions — Morning ride' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate — Morning ride' }));
  }

  it('shows the error when the copy fails, with no unhandled rejection (lane-B repro)', async () => {
    vi.mocked(api.listClasses).mockResolvedValue({ items: [ride], nextCursor: null });
    vi.mocked(api.copyClass).mockRejectedValue(new Error('Ritmo could not copy this class.'));
    renderDashboard();

    await duplicateFromMenu();
    expect(await screen.findByText('Ritmo could not copy this class.')).toBeTruthy();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(api.copyClass).toHaveBeenCalledTimes(1);
    expect(unhandled).toHaveLength(0);
  });

  it('shows Duplicating… and makes one copy when Duplicate is chosen again in flight (lane-B repro)', async () => {
    vi.mocked(api.listClasses).mockResolvedValue({ items: [ride], nextCursor: null });
    const copy = deferred<Awaited<ReturnType<typeof api.copyClass>>>();
    vi.mocked(api.copyClass).mockReturnValue(copy.promise);
    renderDashboard();

    await duplicateFromMenu();
    fireEvent.click(await screen.findByRole('button', { name: 'More actions — Morning ride' }));
    const again = screen.getByRole('button', { name: 'Duplicating… — Morning ride' });
    expect(again.textContent).toBe('Duplicating…');
    expect((again as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(again);
    expect(api.copyClass).toHaveBeenCalledTimes(1);

    await act(async () =>
      copy.resolve(created('00000000-0000-4000-8000-0000000000a2', 'Morning ride (copy)')),
    );
    expect(await screen.findByRole('region', { name: 'Class builder' })).toBeTruthy();
    expect(api.copyClass).toHaveBeenCalledTimes(1);
  });
});

describe('RF-111 provider return to the builder', () => {
  it('reopens the class a destination:builder record names', async () => {
    const ride = listItem('00000000-0000-4000-8000-0000000000b1', 'Preview ride');
    vi.mocked(api.listClasses).mockResolvedValue({ items: [ride], nextCursor: null });
    vi.mocked(api.getClass).mockResolvedValue(ride);
    vi.mocked(api.listConnections).mockResolvedValue([]);
    rememberConnectionReturn({
      userId: 'me',
      destination: 'builder',
      classId: ride.id,
      provider: 'spotify',
    });
    window.history.replaceState(null, '', '/?connected=spotify');
    renderDashboard();

    const builder = await screen.findByRole('region', { name: 'Class builder' });
    expect(within(builder).getByRole('heading', { name: 'Preview ride' })).toBeTruthy();
    expect(api.getClass).toHaveBeenCalledWith(ride.id);
    expect(navButton('Classes').getAttribute('aria-current')).toBe('page');
  });
});
