// @vitest-environment jsdom
/**
 * RF-197: a ▶ tap on Music › Songs that lands before the row player's chunk has loaded
 * starts the song once. Dashboard renders the lazy player for that preview; when its own
 * preload of the chunk finishes, it must not swap to the loaded component, because the
 * swap remounts the player and each mount starts the song from the beginning.
 *
 * The real SongRowPreview runs against a fake playback adapter, so each start is one
 * `prepare` call. The chunk is held back by gating one of the player's own imports, in
 * its own file so that module loads exactly when this test lets it.
 */
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  let release!: () => void;
  const loaded = new Promise<void>((resolve) => {
    release = resolve;
  });
  const adapter = {
    prepare: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };
  return { release, loaded, adapter, factory: vi.fn(() => adapter) };
});
vi.mock('../lib/playback/registry.js', () => ({
  PLAYBACK_ADAPTERS: { spotify: playback.factory },
  PLAYBACK_ADAPTER_PROVIDERS: ['spotify'],
}));
// Only the row player imports this, so the player chunk waits for the test.
vi.mock('../lib/song-preview.js', async (importOriginal) => {
  await playback.loaded;
  return importOriginal();
});

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

afterEach(() => {
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

it('a ▶ tapped before the player chunk loads starts the song once (RF-197)', async () => {
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

  render(<Dashboard userId="me" userName="Tester" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Music' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Spotify,/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Songs' }));

  // Tap while the chunk is still in flight: the lazy player waits for it.
  fireEvent.click(await screen.findByRole('button', { name: 'Preview Levels' }));
  expect(screen.getByText('Starting preview…')).toBeTruthy();
  expect(playback.adapter.prepare).not.toHaveBeenCalled();

  // The chunk arrives. The lazy player starts the song, and Dashboard's own preload
  // finishing as well must not remount the player and start it again.
  playback.release();
  await settle();
  expect(await screen.findByText(/Playing on Spotify|Starting on Spotify/)).toBeTruthy();
  await settle();
  expect(playback.adapter.prepare).toHaveBeenCalledTimes(1);
  expect(playback.adapter.destroy).not.toHaveBeenCalled();

  // Stop releases the adapter; the next tap starts the song again, once.
  fireEvent.click(screen.getByRole('button', { name: 'Stop preview of Levels' }));
  expect(playback.adapter.destroy).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Preview Levels' }));
  await settle();
  expect(playback.adapter.prepare).toHaveBeenCalledTimes(2);
});
