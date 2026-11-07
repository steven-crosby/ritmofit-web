// @vitest-environment jsdom
/**
 * RF-197 / RF-199: a ▶ tap on Music › Songs that lands before the row player's chunk has
 * loaded starts the song once. Dashboard renders the lazy player for that preview and keeps
 * it until the preview closes, so its own preload landing later cannot swap in the loaded
 * component: the swap would remount the player, and each mount starts the song again.
 *
 * The real SongRowPreview runs against a fake playback adapter, so each start is one
 * `prepare` call. Each call of the chunk loader (Dashboard's preload first, then the lazy
 * player's) follows a per-test plan: held until the test releases it, failed, or passed
 * through. Every held load is released after each test, so none can hang the file.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard.js';
import * as api from '../lib/api.js';
import { resetAppRouteForTests } from '../lib/app-route.js';

vi.mock('../lib/api.js');
vi.mock('../lib/auth-client.js', () => ({ authClient: { signOut: vi.fn() } }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

const playback = vi.hoisted(() => {
  const adapter = {
    prepare: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };
  return { adapter, factory: vi.fn(() => adapter) };
});
vi.mock('../lib/playback/registry.js', () => ({
  PLAYBACK_ADAPTERS: { spotify: playback.factory },
  PLAYBACK_ADAPTER_PROVIDERS: ['spotify'],
}));

/** How each chunk load goes, in call order; a load past the plan passes through. */
type LoadStep = 'pass' | 'fail' | { held: Promise<void> };
const loads = vi.hoisted(() => ({
  plan: [] as LoadStep[],
  calls: 0,
  releases: [] as (() => void)[],
}));
vi.mock('./song-row-preview-load.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('./song-row-preview-load.js')>();
  return {
    ...real,
    SONG_ROW_PRELOAD_RETRY_MS: 10,
    loadSongRowPreview: async () => {
      const step = loads.plan[loads.calls++] ?? 'pass';
      if (step === 'fail') throw new Error('Failed to fetch dynamically imported module');
      if (step !== 'pass') await step.held;
      return real.loadSongRowPreview();
    },
  };
});

/** A load the test holds until it calls the returned release. */
function held(): [LoadStep, () => void] {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  loads.releases.push(release);
  return [{ held: gate }, release];
}

function installLocalStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => Array.from(values.keys())[index] ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    } satisfies Storage,
  });
}

beforeEach(() => {
  loads.plan = [];
  loads.calls = 0;
});

afterEach(async () => {
  for (const release of loads.releases.splice(0)) release();
  cleanup();
  vi.clearAllMocks();
  resetAppRouteForTests();
  window.history.replaceState(null, '', '/');
});

async function settle() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function stubSpotifySongs() {
  installLocalStorage();
  vi.mocked(api.listClasses).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(api.listPlaylists).mockResolvedValue([]);
  vi.mocked(api.listConnections).mockResolvedValue([
    {
      id: 'conn-spotify',
      userId: 'me',
      provider: 'spotify',
      providerUserId: 'spotify-user',
      scope: 'user-library-read streaming',
      expiresAt: Date.now() + 3_600_000,
      createdAt: 1,
      updatedAt: 1,
    },
  ]);
  vi.mocked(api.listLikesPage).mockResolvedValue({
    nextCursor: null,
    items: [
      {
        provider: 'spotify',
        providerTrackId: 'tr-1',
        providerUri: 'spotify:track:tr-1',
        title: 'Levels',
        artist: 'Avicii',
        albumArtUrl: null,
        durationMs: 200000,
      },
    ],
  });
}

async function openSpotifySongs() {
  render(<Dashboard userId="me" userName="Tester" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Songs' }));
}

it('a ▶ tapped before the player chunk loads starts the song once, even when the preload lands much later (RF-197, RF-199)', async () => {
  stubSpotifySongs();
  const [preload, releasePreload] = held();
  const [lazyLoad, releaseLazy] = held();
  loads.plan = [preload, lazyLoad];
  await openSpotifySongs();

  // Tap while the chunk is still in flight: the lazy player waits for it.
  fireEvent.click(await screen.findByRole('button', { name: 'Preview Levels' }));
  expect(screen.getByText('Starting preview…')).toBeTruthy();
  expect(playback.adapter.prepare).not.toHaveBeenCalled();

  // The lazy player's chunk arrives and it starts the song.
  releaseLazy();
  expect(await screen.findByText(/Playing on Spotify|Starting on Spotify/)).toBeTruthy();
  await settle();
  expect(playback.adapter.prepare).toHaveBeenCalledTimes(1);

  // Dashboard's own preload lands well after the player mounted. The open preview keeps
  // the player it started with, so nothing remounts and the song is not started again.
  releasePreload();
  await settle();
  await settle();
  expect(playback.adapter.prepare).toHaveBeenCalledTimes(1);
  expect(playback.adapter.destroy).not.toHaveBeenCalled();

  // Stop releases the adapter; the next tap uses the loaded player at once, and starts once.
  fireEvent.click(screen.getByRole('button', { name: 'Stop preview of Levels' }));
  expect(playback.adapter.destroy).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Preview Levels' }));
  expect(screen.queryByText('Starting preview…')).toBeNull();
  await settle();
  expect(playback.adapter.prepare).toHaveBeenCalledTimes(2);
});

it('tries a failed preload again, so a later ▶ tap plays without waiting for the chunk (RF-199)', async () => {
  stubSpotifySongs();
  loads.plan = ['fail'];
  await openSpotifySongs();
  const preview = await screen.findByRole('button', { name: 'Preview Levels' });

  // The first preload failed; the retry loads the chunk.
  await waitFor(() => expect(loads.calls).toBe(2));
  await settle();

  fireEvent.click(preview);
  expect(screen.queryByText('Starting preview…')).toBeNull();
  await settle();
  expect(playback.adapter.prepare).toHaveBeenCalledTimes(1);
});
