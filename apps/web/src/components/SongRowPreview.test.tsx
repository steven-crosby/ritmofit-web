// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MusicConnectionView, TrackSearchResult } from '@ritmofit/shared';
import { SongRowPreview } from './SongRowPreview.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');
const playback = vi.hoisted(() => {
  const adapter = {
    prepare: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  };
  const state = {
    adapter,
    callbacks: null as null | { onError: (e: { message: string }) => void },
    factory: vi.fn(),
  };
  state.factory.mockImplementation((callbacks: NonNullable<typeof state.callbacks>) => {
    state.callbacks = callbacks;
    return adapter;
  });
  return state;
});
vi.mock('../lib/playback/registry.js', () => ({
  PLAYBACK_ADAPTERS: { spotify: playback.factory },
  PLAYBACK_ADAPTER_PROVIDERS: ['spotify'],
}));

const spotify = (scope = 'user-library-read streaming'): MusicConnectionView => ({
  id: '00000000-0000-4000-8000-000000000001',
  userId: 'user-1',
  provider: 'spotify',
  providerUserId: 'spotify-user',
  scope,
  expiresAt: Date.now() + 3_600_000,
  createdAt: 1,
  updatedAt: 1,
});

const song: TrackSearchResult = {
  provider: 'spotify',
  providerTrackId: 'sp-1',
  providerUri: 'spotify:track:sp-1',
  title: 'Instinct',
  artist: 'Lane 8',
  albumArtUrl: null,
  durationMs: 215_000,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  playback.callbacks = null;
  playback.adapter.prepare.mockResolvedValue(undefined);
  playback.adapter.play.mockResolvedValue(undefined);
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SongRowPreview (RF-172)', () => {
  it('starts the whole song on mount through the provider adapter, with no API call', async () => {
    render(<SongRowPreview track={song} connections={[spotify()]} onStop={() => {}} />);
    await flush();
    expect(playback.adapter.prepare).toHaveBeenCalledTimes(1);
    const [entry, window] = playback.adapter.prepare.mock.calls[0]!;
    expect(entry.providerRefs[0]).toMatchObject({ provider: 'spotify', providerTrackId: 'sp-1' });
    expect(window).toMatchObject({ startMs: 0, endMs: 215_000 });
    expect(playback.adapter.play).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Playing on Spotify · 0:00 \/ 3:35/)).toBeTruthy();
    // No import, provider-id attach, resolve or connection fetch.
    for (const fn of Object.values(vi.mocked(api))) {
      if (typeof fn === 'function' && 'mock' in fn) expect(fn).not.toHaveBeenCalled();
    }
  });

  it('Stop hands back to the list, and unmounting releases the adapter', async () => {
    const onStop = vi.fn();
    const view = render(<SongRowPreview track={song} connections={[spotify()]} onStop={onStop} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(playback.adapter.destroy).toHaveBeenCalled();
  });

  it('names the fix and plays nothing when the provider is not ready for playback', async () => {
    render(
      <SongRowPreview
        track={song}
        connections={[spotify('user-library-read')]}
        onStop={() => {}}
      />,
    );
    await flush();
    expect(screen.getByText('Reconnect Spotify for playback to preview this song.')).toBeTruthy();
    expect(playback.factory).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('shows a provider failure as an alert and offers Play again', async () => {
    render(<SongRowPreview track={song} connections={[spotify()]} onStop={() => {}} />);
    await flush();
    act(() => playback.callbacks!.onError({ message: 'Spotify stopped responding.' }));
    expect(screen.getByRole('alert').textContent).toBe('Spotify stopped responding.');
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    await flush();
    expect(playback.adapter.prepare).toHaveBeenCalledTimes(2);
  });
});
