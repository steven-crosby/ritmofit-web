// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlaylistSongPicker, type PlaylistSongPickerItem } from './PlaylistSongPicker.js';

afterEach(cleanup);

function items(count: number): PlaylistSongPickerItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `song-${index}`,
    position: index + 1,
    title: index === 3 || index === 7 ? 'Repeat' : `Song ${index + 1}`,
    artist: 'QA',
    durationMs: 180_000,
  }));
}

describe('PlaylistSongPicker', () => {
  it('disables confirm at zero, refuses the 16th check, and confirms source order', () => {
    const onConfirm = vi.fn();
    render(
      <PlaylistSongPicker
        mode="import"
        items={items(20)}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByRole('button', { name: 'Import 0 songs' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(20);
    expect(screen.getAllByRole('checkbox', { name: /Repeat/ })).toHaveLength(2);
    fireEvent.click(boxes[7]!);
    fireEvent.click(boxes[1]!);
    for (let index = 0; index < 15; index += 1) {
      if (index === 1 || index === 7) continue;
      fireEvent.click(boxes[index]!);
    }
    expect(
      screen.getAllByRole('checkbox').filter((box) => (box as HTMLInputElement).checked),
    ).toHaveLength(15);
    fireEvent.click(boxes[19]!);
    expect(screen.getByRole('alert').textContent).toBe('Choose at most 15 songs.');
    expect((boxes[19] as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Import 15 songs' }));
    const ids = onConfirm.mock.calls[0]![0] as string[];
    expect(ids.indexOf('song-1')).toBeLessThan(ids.indexOf('song-7'));
    expect(ids).toEqual(
      items(20)
        .map((item) => item.id)
        .filter((id) => ids.includes(id)),
    );
  });

  it('mounts 100 plain rows without windowing in under 2 seconds', () => {
    const started = performance.now();
    render(
      <PlaylistSongPicker
        mode="create"
        items={items(100)}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(100);
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(document.querySelector('[data-virtuoso-scroller]')).toBeNull();
  });
});
