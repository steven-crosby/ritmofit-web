// @vitest-environment jsdom
/**
 * B-01 repro (lane b-web, audit 4c344e2). Copy to apps/web/src/components/ and run:
 *   pnpm --filter @ritmofit/web exec vitest run src/components/b-web-playlist-stale-tracks.repro.test.tsx
 *
 * PlaylistBrowserDialog.openPlaylist (Dashboard.tsx) awaits listPlaylistTracks with no
 * request guard. Open playlist A (slow), go Back, open playlist B (fast). A's late
 * reply overwrites B's tracks under B's heading, and "Start class from B" imports A's songs.
 * The assertions describe the CORRECT behaviour, so this test FAILS on 4c344e2.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { TrackSearchResult } from '@ritmofit/shared';
import { Dashboard } from './Dashboard.js';
import * as api from '../lib/api.js';

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

beforeEach(() => {
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
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage?.clear();
});

describe('B-01 saved-playlist browser stale track reply', () => {
  it('keeps the open playlist’s own tracks when an earlier playlist answers late', async () => {
    vi.mocked(api.listClasses).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(api.listConnections).mockResolvedValue([
      {
        id: 'conn-spotify',
        userId: 'me',
        provider: 'spotify',
        providerUserId: 'u',
        scope: 'user-library-read streaming',
        expiresAt: null,
        createdAt: 1,
        updatedAt: 1,
      } as never,
    ]);
    vi.mocked(api.listLikes).mockResolvedValue([]);
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
    ]);
    const a = deferred<TrackSearchResult[]>();
    const b = deferred<TrackSearchResult[]>();
    vi.mocked(api.listPlaylistTracks).mockImplementation((_p, id) =>
      id === 'pl-a' ? a.promise : b.promise,
    );
    vi.mocked(api.createClass).mockImplementation(
      async (body) =>
        ({
          id: '00000000-0000-4000-8000-0000000000c1',
          ownerUserId: 'me',
          title: body.title,
          template: body.template ?? 'cycle',
          description: null,
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
        }) as never,
    );
    vi.mocked(api.importTrack).mockImplementation(
      async (_p, id) => ({ id: `t-${id}`, durationMs: 180000 }) as never,
    );
    vi.mocked(api.importClassTracks).mockResolvedValue([]);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);

    render(<Dashboard userId="me" userName="Tester" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Warmup Ride' }));
    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });

    // Instructor changes their mind while Warmup Ride is still loading.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to playlists' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open Cooldown Flow' }));

    await act(async () => b.resolve([song('cool-1', 'Cool Song')]));
    await act(async () => a.resolve([song('warm-1', 'Warm Song')]));

    expect(within(dialog).getByRole('heading', { name: 'Cooldown Flow' })).toBeTruthy();
    // Correct: Cooldown Flow shows its own song, never Warmup Ride's.
    expect(within(dialog).queryByText('Warm Song')).toBeNull();
    expect(within(dialog).getByText('Cool Song')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start class from Cooldown Flow' }));
    await waitFor(() => expect(api.createClass).toHaveBeenCalled());
    expect(vi.mocked(api.createClass).mock.calls[0]![0].title).toBe('Cooldown Flow');
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    // Correct: the class titled "Cooldown Flow" imports Cooldown Flow's song.
    expect(vi.mocked(api.importTrack).mock.calls.map((c) => c[1])).toEqual(['cool-1']);
  });
  it('OBSERVED (passes on 4c344e2): the class titled B imports playlist A’s song', async () => {
    vi.mocked(api.listClasses).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(api.listConnections).mockResolvedValue([
      {
        id: 'conn-spotify',
        userId: 'me',
        provider: 'spotify',
        providerUserId: 'u',
        scope: 'user-library-read streaming',
        expiresAt: null,
        createdAt: 1,
        updatedAt: 1,
      } as never,
    ]);
    vi.mocked(api.listLikes).mockResolvedValue([]);
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
    ]);
    const a = deferred<TrackSearchResult[]>();
    const b = deferred<TrackSearchResult[]>();
    vi.mocked(api.listPlaylistTracks).mockImplementation((_p, id) =>
      id === 'pl-a' ? a.promise : b.promise,
    );
    vi.mocked(api.createClass).mockImplementation(
      async (body) =>
        ({
          id: '00000000-0000-4000-8000-0000000000c1',
          ownerUserId: 'me',
          title: body.title,
          template: body.template ?? 'cycle',
          description: null,
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
        }) as never,
    );
    vi.mocked(api.importTrack).mockImplementation(
      async (_p, id) => ({ id: `t-${id}`, durationMs: 180000 }) as never,
    );
    vi.mocked(api.importClassTracks).mockResolvedValue([]);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);

    render(<Dashboard userId="me" userName="Tester" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Warmup Ride' }));
    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });

    // Instructor changes their mind while Warmup Ride is still loading.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to playlists' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open Cooldown Flow' }));

    await act(async () => b.resolve([song('cool-1', 'Cool Song')]));
    await act(async () => a.resolve([song('warm-1', 'Warm Song')]));

    expect(within(dialog).getByRole('heading', { name: 'Cooldown Flow' })).toBeTruthy();
    // Observed: Warmup Ride's song is listed under the Cooldown Flow heading.
    expect(within(dialog).getByText('Warm Song')).toBeTruthy();
    expect(within(dialog).queryByText('Cool Song')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start class from Cooldown Flow' }));
    await waitFor(() => expect(api.createClass).toHaveBeenCalled());
    expect(vi.mocked(api.createClass).mock.calls[0]![0].title).toBe('Cooldown Flow');
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    // Observed: the class titled "Cooldown Flow" imports Warmup Ride's song.
    expect(vi.mocked(api.importTrack).mock.calls.map((c) => c[1])).toEqual(['warm-1']);
  });

  it('B-01b: closing the dialog mid-create and moving on does not yank the instructor into the new class later', async () => {
    vi.mocked(api.listClasses).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(api.listConnections).mockResolvedValue([
      {
        id: 'conn-spotify',
        userId: 'me',
        provider: 'spotify',
        providerUserId: 'u',
        scope: 'user-library-read streaming',
        expiresAt: null,
        createdAt: 1,
        updatedAt: 1,
      } as never,
    ]);
    vi.mocked(api.listLikes).mockResolvedValue([]);
    vi.mocked(api.getMe).mockResolvedValue({ id: 'me', name: 'Tester', email: 't@x', image: null } as never);
    vi.mocked(api.listPlaylists).mockResolvedValue([
      { provider: 'spotify', playlistId: 'pl-a', name: 'Warmup Ride', ownerName: 'S', trackCount: 1, coverImageUrl: null },
    ]);
    vi.mocked(api.listPlaylistTracks).mockResolvedValue([song('warm-1', 'Warm Song')]);
    vi.mocked(api.createClass).mockImplementation(
      async (body) =>
        ({ id: '00000000-0000-4000-8000-0000000000c2', ownerUserId: 'me', title: body.title, template: 'cycle', description: null, status: 'draft', visibility: 'private', timelineMode: 'sequential', targetDurationMs: null, scaffoldRecipeId: null, createdAt: 1, updatedAt: 1, lastOpenedAt: null, featuredCategory: null, coverImageUrl: null, tags: [] }) as never,
    );
    const imported = deferred<unknown>();
    vi.mocked(api.importTrack).mockReturnValue(imported.promise as never);
    vi.mocked(api.importClassTracks).mockResolvedValue([]);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    vi.mocked(api.getRunPayload).mockRejectedValue(new Error('no payload'));
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([]);

    render(<Dashboard userId="me" userName="Tester" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open Warmup Ride' }));
    const dialog = await screen.findByRole('dialog', { name: 'Browse Spotify playlists' });
    await within(dialog).findByText('Warm Song');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start class from Warmup Ride' }));
    await waitFor(() => expect(api.importTrack).toHaveBeenCalled());
    // Close is enabled while "Creating..." runs; the instructor closes it and goes to Account.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close playlist browser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(screen.getByRole('button', { name: 'Account' }).getAttribute('aria-current')).toBe('page');

    await act(async () => imported.resolve({ id: 't-warm-1', durationMs: 180000 }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    // Correct: the background import does not navigate. Observed on 4c344e2: Classes + builder open.
    expect(screen.getByRole('button', { name: 'Account' }).getAttribute('aria-current')).toBe('page');
  });
});
