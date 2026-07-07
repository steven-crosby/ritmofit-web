// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RunPayloadTrackEntry } from '@ritmofit/shared';
import { ReorderableTrackList } from './Dashboard.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeEntry(id: string, title: string): RunPayloadTrackEntry {
  return {
    classTrackId: id,
    position: 0,
    displayBpm: 128,
    displayRpm: null,
    holdCount: null,
    intensity: 'mod',
    startOffsetMs: 0,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: id.replace(/1$/, '9'),
      title,
      artist: 'Artist',
      durationMs: 200_000,
      albumArtUrl: null,
    },
    providerRefs: [],
    cues: [],
    moves: [],
  };
}

const entries: RunPayloadTrackEntry[] = [
  makeEntry('00000000-0000-4000-8000-000000000001', 'Warm Up'),
  makeEntry('00000000-0000-4000-8000-000000000002', 'Climb'),
  makeEntry('00000000-0000-4000-8000-000000000003', 'Cool Down'),
];

function renderList(over: { canReorder?: boolean; entries?: RunPayloadTrackEntry[] } = {}) {
  const onReordered = vi.fn();
  render(
    <ReorderableTrackList
      classId="00000000-0000-4000-8000-0000000000c1"
      entries={over.entries ?? entries}
      canReorder={over.canReorder ?? true}
      selectedTrackId={null}
      onSelect={() => {}}
      onReordered={onReordered}
    />,
  );
  return { onReordered };
}

const gripFor = (title: string, position: number, count: number) =>
  screen.getByRole('button', {
    name: new RegExp(`Reorder ${title}, position ${position} of ${count}`, 'i'),
  });

describe('ReorderableTrackList keyboard reorder', () => {
  it('moves a track down, persists the new permutation, and announces the move', async () => {
    const reorder = vi.mocked(api.reorderTracks).mockResolvedValue([]);
    const { onReordered } = renderList();

    fireEvent.keyDown(gripFor('Warm Up', 1, 3), { key: 'ArrowDown' });

    // Persisted as a full id permutation with Warm Up now second.
    await waitFor(() => expect(reorder).toHaveBeenCalledTimes(1));
    expect(reorder.mock.calls[0]?.[1]).toEqual([
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000003',
    ]);
    expect(onReordered).toHaveBeenCalledTimes(1);
    // Announced politely with the 1-based destination.
    expect(screen.getByText('Moved “Warm Up” to position 2 of 3.')).toBeTruthy();
  });

  it('announces an already-first boundary without persisting', () => {
    const reorder = vi.mocked(api.reorderTracks).mockResolvedValue([]);
    renderList();

    fireEvent.keyDown(gripFor('Warm Up', 1, 3), { key: 'ArrowUp' });

    expect(reorder).not.toHaveBeenCalled();
    expect(screen.getByText('“Warm Up” is already first.')).toBeTruthy();
  });

  it('announces an already-last boundary without persisting', () => {
    const reorder = vi.mocked(api.reorderTracks).mockResolvedValue([]);
    renderList();

    fireEvent.keyDown(gripFor('Cool Down', 3, 3), { key: 'ArrowDown' });

    expect(reorder).not.toHaveBeenCalled();
    expect(screen.getByText('“Cool Down” is already last.')).toBeTruthy();
  });

  it('rolls back and assertively announces a failed persist, keeping the visible error', async () => {
    vi.mocked(api.reorderTracks).mockRejectedValue(new Error('network down'));
    const { onReordered } = renderList();

    fireEvent.keyDown(gripFor('Warm Up', 1, 3), { key: 'ArrowDown' });

    // Assertive announcement names the rollback destination (its original position).
    await waitFor(() =>
      expect(
        screen.getByText('Couldn’t reorder — “Warm Up” moved back to position 1 of 3.'),
      ).toBeTruthy(),
    );
    // Visible error row is kept in addition to the announcement.
    expect(screen.getByText('network down')).toBeTruthy();
    // A failed persist never reports success upstream.
    expect(onReordered).not.toHaveBeenCalled();
    // Order rolled back: Warm Up is first again.
    const grips = screen.getAllByRole('button', { name: /Reorder/ });
    expect(grips[0]?.getAttribute('aria-label')).toContain('Warm Up');
  });

  it('keeps focus on the moved grip across the optimistic reorder', async () => {
    vi.mocked(api.reorderTracks).mockResolvedValue([]);
    renderList();

    const grip = gripFor('Climb', 2, 3);
    grip.focus();
    fireEvent.keyDown(grip, { key: 'ArrowUp' });

    // Same stable-keyed element (Climb's grip) remains focused after it moves to 1.
    await waitFor(() =>
      expect((document.activeElement as HTMLElement)?.getAttribute('aria-label')).toContain(
        'Climb',
      ),
    );
  });

  it('omits the grip (and keyboard reorder) when reordering is disabled', () => {
    renderList({ canReorder: false });
    expect(screen.queryByRole('button', { name: /Reorder/ })).toBeNull();
  });
});
