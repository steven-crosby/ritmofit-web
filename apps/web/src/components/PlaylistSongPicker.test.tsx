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

  it('badges songs already in class, leaves them unchecked, and skips them in the pre-check', () => {
    const rows = items(20).map((item, index) =>
      index === 0 || index === 1 || index === 5 ? { ...item, alreadyInClass: true } : item,
    );
    const onConfirm = vi.fn();
    render(
      <PlaylistSongPicker mode="import" items={rows} onConfirm={onConfirm} onCancel={() => {}} />,
    );
    expect(screen.getAllByText('Already in class')).toHaveLength(3);
    const boxes = screen.getAllByRole('checkbox');
    expect((boxes[0] as HTMLInputElement).checked).toBe(false);
    expect((boxes[1] as HTMLInputElement).checked).toBe(false);
    expect((boxes[5] as HTMLInputElement).checked).toBe(false);
    const checked = boxes.flatMap((box, index) =>
      (box as HTMLInputElement).checked ? [rows[index]!.id] : [],
    );
    expect(checked).toEqual([
      'song-2',
      'song-3',
      'song-4',
      'song-6',
      'song-7',
      'song-8',
      'song-9',
      'song-10',
      'song-11',
      'song-12',
      'song-13',
      'song-14',
      'song-15',
      'song-16',
      'song-17',
    ]);
    fireEvent.click(boxes[18]!);
    expect(screen.getByRole('alert').textContent).toBe('Choose at most 15 songs.');
    expect((boxes[18] as HTMLInputElement).checked).toBe(false);
    fireEvent.click(boxes[0]!);
    expect((boxes[0] as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Import 15 songs' }));
    expect(onConfirm.mock.calls[0]![0]).toEqual(checked);
  });

  it('lets her check a song already in class while the import is under 15', () => {
    const rows = items(5).map((item, index) =>
      index === 2 ? { ...item, alreadyInClass: true } : item,
    );
    const onConfirm = vi.fn();
    render(
      <PlaylistSongPicker mode="import" items={rows} onConfirm={onConfirm} onCancel={() => {}} />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(screen.getByText('Already in class')).toBeTruthy();
    expect((boxes[2] as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('button', { name: 'Import 4 songs' })).toBeTruthy();
    fireEvent.click(boxes[2]!);
    expect((boxes[2] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Import 5 songs' }));
    expect(onConfirm.mock.calls[0]![0]).toEqual(['song-0', 'song-1', 'song-2', 'song-3', 'song-4']);
  });
});
