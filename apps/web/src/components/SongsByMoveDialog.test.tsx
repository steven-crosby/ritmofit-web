// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Move, UserMove, SongByMove } from '@ritmofit/shared';
import { SongsByMoveDialog } from './SongsByMoveDialog.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

const move: Move = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Climb',
  description: null,
  template: null,
  createdAt: 1,
  updatedAt: 1,
};
const userMove: UserMove = {
  id: '00000000-0000-4000-8000-0000000000a1',
  userId: 'me',
  name: 'Signature Tap',
  description: null,
  baseMoveId: null,
  template: null,
  createdAt: 1,
  updatedAt: 1,
};

function song(): SongByMove {
  return {
    track: {
      id: '00000000-0000-4000-8000-0000000000f1',
      ownerUserId: 'me',
      title: 'Shared Anthem',
      artist: 'DJ Test',
      albumArtUrl: null,
      durationMs: 180000,
      displayBpm: 128,
      isrc: null,
      createdAt: 1,
      updatedAt: 1,
    },
    placements: [
      {
        classId: '00000000-0000-4000-8000-0000000000c1',
        classTitle: 'Monday Power',
        classTrackId: '00000000-0000-4000-8000-0000000000d1',
        anchorMs: 60000,
        intensity: 'hard',
      },
    ],
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SongsByMoveDialog', () => {
  it('searches on move pick and lists songs grouped with placements', async () => {
    vi.mocked(api.listMoves).mockResolvedValue([move]);
    vi.mocked(api.listUserMoves).mockResolvedValue([userMove]);
    vi.mocked(api.songsByMove).mockResolvedValue([song()]);

    render(
      <SongsByMoveDialog
        onClose={() => {}}
        onOpenClass={() => {}}
        onStartClass={() => Promise.resolve()}
      />,
    );

    // Until a move is picked, an instructional prompt shows (no fetch yet).
    expect(await screen.findByText('Pick a move')).toBeTruthy();
    expect(api.songsByMove).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: `m:${move.id}` } });

    await waitFor(() =>
      expect(api.songsByMove).toHaveBeenCalledWith({ kind: 'library', id: move.id }),
    );
    expect(await screen.findByText('Shared Anthem')).toBeTruthy();
    expect(screen.getByText('128 BPM')).toBeTruthy();
    expect(screen.getByText('at 1:00')).toBeTruthy();
    // Intensity renders as its spin-zone word (D17), not the raw enum.
    expect(screen.getByText('Attack')).toBeTruthy();
  });

  it('routes a custom-move pick to the user-move namespace', async () => {
    vi.mocked(api.listMoves).mockResolvedValue([move]);
    vi.mocked(api.listUserMoves).mockResolvedValue([userMove]);
    vi.mocked(api.songsByMove).mockResolvedValue([]);

    render(
      <SongsByMoveDialog
        onClose={() => {}}
        onOpenClass={() => {}}
        onStartClass={() => Promise.resolve()}
      />,
    );
    await screen.findByText('Pick a move');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: `u:${userMove.id}` } });

    await waitFor(() =>
      expect(api.songsByMove).toHaveBeenCalledWith({ kind: 'user', id: userMove.id }),
    );
    // Empty result names the picked move so the instructor knows the search ran.
    expect(await screen.findByText(/No songs for this move yet/i)).toBeTruthy();
    expect(screen.getByText(/songs with Signature Tap yet/i)).toBeTruthy();
  });

  it('opens a class and closes when a placement is clicked', async () => {
    vi.mocked(api.listMoves).mockResolvedValue([move]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.songsByMove).mockResolvedValue([song()]);
    const onOpenClass = vi.fn();
    const onClose = vi.fn();

    render(
      <SongsByMoveDialog
        onClose={onClose}
        onOpenClass={onOpenClass}
        onStartClass={() => Promise.resolve()}
      />,
    );
    await screen.findByText('Pick a move');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: `m:${move.id}` } });

    const openButton = await screen.findByRole('button', { name: 'Monday Power' });
    fireEvent.click(openButton);

    await waitFor(() =>
      expect(onOpenClass).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000c1'),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('starts a new class from a placement (carrying its choreography) and closes', async () => {
    vi.mocked(api.listMoves).mockResolvedValue([move]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.songsByMove).mockResolvedValue([song()]);
    const onStartClass = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    const onOpenClass = vi.fn();

    render(
      <SongsByMoveDialog onClose={onClose} onOpenClass={onOpenClass} onStartClass={onStartClass} />,
    );
    await screen.findByText('Pick a move');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: `m:${move.id}` } });

    const startButton = await screen.findByRole('button', {
      name: /Start a new class from Shared Anthem in Monday Power/i,
    });
    fireEvent.click(startButton);

    // Seeds from the placement's class_track + the song title, then closes.
    await waitFor(() =>
      expect(onStartClass).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-0000000000d1',
        'Shared Anthem',
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // Starting a class does not also trigger the "open existing class" path.
    expect(onOpenClass).not.toHaveBeenCalled();
  });
});
