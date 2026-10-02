// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useSpotifyActivation } from './use-spotify-activation.js';
import { SpotifyActivationAction } from '../components/SpotifyActivationAction.js';
import {
  getSpotifyPlayback,
  invalidateSpotifyActivation,
  type SpotifyPlayer,
} from './spotify-playback.js';
vi.mock('./spotify-playback.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./spotify-playback.js')>()),
  getSpotifyPlayback: vi.fn(),
}));
const activateElement = vi.fn();
const player = { activateElement } as unknown as SpotifyPlayer;
function Harness() {
  const flow = useSpotifyActivation();
  return (
    <>
      <SpotifyActivationAction flow={flow} />
      <button disabled={!flow.isReady()}>Start</button>
    </>
  );
}
beforeEach(() => {
  activateElement.mockReset().mockResolvedValue(undefined);
  invalidateSpotifyActivation(player);
  vi.mocked(getSpotifyPlayback).mockReset().mockResolvedValue({ player, deviceId: 'qa' });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('prepares without activating, then invokes activation synchronously from a fresh tap', async () => {
  render(<Harness />);
  expect((screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Prepare Spotify playback' }));
  const enable = await screen.findByRole('button', { name: 'Enable Spotify playback' });
  expect(activateElement).not.toHaveBeenCalled();
  fireEvent.click(enable);
  expect(activateElement).toHaveBeenCalledOnce();
  await screen.findByText(
    'Spotify enabled in this browser. Playback availability is still unverified.',
  );
  expect((screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement).disabled).toBe(false);
});
it('holds Start on activation rejection and allows a fresh activation retry', async () => {
  activateElement.mockRejectedValueOnce(new Error('Browser denied playback'));
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Prepare Spotify playback' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Enable Spotify playback' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Browser denied playback');
  expect((screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Enable Spotify playback' }));
  await screen.findByText(
    'Spotify enabled in this browser. Playback availability is still unverified.',
  );
});
it('ignores late preparation after cancellation', async () => {
  let resolve!: (value: { player: SpotifyPlayer; deviceId: string }) => void;
  vi.mocked(getSpotifyPlayback).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Prepare Spotify playback' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel Spotify preparation' }));
  await act(async () => {
    resolve({ player, deviceId: 'qa' });
  });
  expect(activateElement).not.toHaveBeenCalled();
  expect((screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Prepare Spotify playback' })).toBeTruthy();
});
