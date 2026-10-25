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
  it('pre-checks the first 15 songs, refuses a 16th check, and confirms source order', () => {
    const onConfirm = vi.fn();
    render(
      <PlaylistSongPicker
        mode="import"
        items={items(20)}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(20);
    expect(screen.getAllByRole('checkbox', { name: /Repeat/ })).toHaveLength(2);
    expect(boxes.slice(0, 15).every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(boxes.slice(15).every((box) => (box as HTMLInputElement).checked)).toBe(false);
    const confirm = screen.getByRole('button', { name: 'Import 15 songs' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    fireEvent.click(boxes[0]!);
    expect((boxes[0] as HTMLInputElement).checked).toBe(false);
    fireEvent.click(boxes[0]!);
    expect((boxes[0] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[19]!);
    expect((boxes[19] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(boxes[18]!);
    expect(screen.getByRole('alert').textContent).toBe('Choose at most 15 songs.');
    expect((boxes[18] as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Import 15 songs' }));
    const ids = onConfirm.mock.calls[0]![0] as string[];
    expect(ids).toEqual([
      ...items(20)
        .slice(1, 15)
        .map((item) => item.id),
      'song-19',
    ]);
    expect(ids.indexOf('song-1')).toBeLessThan(ids.indexOf('song-19'));
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
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(100);
    expect(boxes.slice(0, 15).every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Create class from 15 songs' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(document.querySelector('[data-virtuoso-scroller]')).toBeNull();
  });
});
