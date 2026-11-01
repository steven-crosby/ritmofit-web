// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { TrackSearchResult } from '@ritmofit/shared';
import { SongPickBar, SongPickCreateDialog, SongPickList } from './SongPicks.js';
import { songPickKey, useSongPicks } from '../lib/song-picks.js';

afterEach(cleanup);

const song = (id: string): TrackSearchResult => ({
  provider: 'soundcloud',
  providerTrackId: id,
  providerUri: `https://soundcloud.com/x/${id}`,
  title: `Song ${id}`,
  artist: 'Artist',
  albumArtUrl: null,
  durationMs: 180_000,
});

/** The list and bar wired to the real selection hook, as Music › Songs uses them. */
function Picker({ rows, cap = 15 }: { rows: TrackSearchResult[]; cap?: number }) {
  const picks = useSongPicks('soundcloud:me', cap);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <SongPickList
        rows={rows}
        selectedKeys={picks.keys}
        full={picks.full}
        onToggle={picks.toggle}
      />
      <SongPickBar
        count={picks.tracks.length}
        cap={picks.cap}
        onClear={picks.clear}
        onCreate={() => setCreating(true)}
      />
      {creating && <p>sheet open</p>}
    </>
  );
}

const box = (title: string) => screen.getByRole('checkbox', { name: new RegExp(title) });

describe('SongPickList', () => {
  it('toggles exactly once per click on the row text or the artwork', () => {
    const onToggle = vi.fn();
    const rows = [song('1')];
    render(<SongPickList rows={rows} selectedKeys={new Set()} full={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Song 1'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    const item = screen.getByRole('listitem');
    fireEvent.click(item.querySelector('label')!.children[1]!);
    expect(onToggle).toHaveBeenCalledTimes(2);
    fireEvent.click(box('Song 1'));
    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('holds one control per row, inside the build slot, and nothing that plays', () => {
    render(
      <SongPickList rows={[song('1')]} selectedKeys={new Set()} full={false} onToggle={() => {}} />,
    );
    const item = screen.getByRole('listitem');
    expect(item.getAttribute('data-build-class-slot')).toBe('song');
    expect(within(item).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(item).queryByRole('button')).toBeNull();
    expect(within(item).queryByRole('link')).toBeNull();
    expect(item.querySelector('audio, video, iframe')).toBeNull();
  });

  it('marks a ticked song as checked', () => {
    const rows = [song('1'), song('2')];
    render(
      <SongPickList
        rows={rows}
        selectedKeys={new Set([songPickKey(rows[1]!)])}
        full={false}
        onToggle={() => {}}
      />,
    );
    expect((box('Song 1') as HTMLInputElement).checked).toBe(false);
    expect((box('Song 2') as HTMLInputElement).checked).toBe(true);
  });
});

describe('Songs pick mode', () => {
  it('counts the selection and clears it', () => {
    render(<Picker rows={[song('1'), song('2')]} />);
    expect(screen.getByText('Tick up to 15 songs to create a class.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create a class' })).toBeNull();
    fireEvent.click(screen.getByText('Song 1'));
    fireEvent.click(screen.getByText('Song 2'));
    expect(screen.getByText('2 of 15 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create a class' }));
    expect(screen.getByText('sheet open')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect((box('Song 1') as HTMLInputElement).checked).toBe(false);
  });

  it('disables unticked rows at the cap with a note, for the checkbox and the row tap alike', () => {
    const rows = [song('1'), song('2'), song('3')];
    render(<Picker rows={rows} cap={2} />);
    fireEvent.click(screen.getByText('Song 1'));
    fireEvent.click(box('Song 2'));
    expect(screen.getByText('2 of 2 selected')).toBeTruthy();

    const third = box('Song 3') as HTMLInputElement;
    expect(third.disabled).toBe(true);
    const note = document.getElementById(third.getAttribute('aria-describedby')!);
    expect(note?.textContent).toContain('Untick a song to choose another.');
    fireEvent.click(screen.getByText('Song 3'));
    fireEvent.click(third);
    expect(third.checked).toBe(false);

    // A ticked row can still be unticked, which frees a slot.
    fireEvent.click(screen.getByText('Song 1'));
    expect(screen.getByText('1 of 2 selected')).toBeTruthy();
    expect(third.disabled).toBe(false);
  });

  it('keeps picks when the visible rows change, as search and Load more do', () => {
    const { rerender } = render(<Picker rows={[song('1'), song('2')]} />);
    fireEvent.click(screen.getByText('Song 2'));
    rerender(<Picker rows={[song('1')]} />);
    expect(screen.getByText('1 of 15 selected')).toBeTruthy();
    rerender(<Picker rows={[song('1'), song('2'), song('3')]} />);
    expect((box('Song 2') as HTMLInputElement).checked).toBe(true);
  });
});

describe('SongPickCreateDialog', () => {
  it('asks only for a name and a template, then creates', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <SongPickCreateDialog
        count={3}
        defaultTitle="SoundCloud likes"
        onClose={() => {}}
        onCreate={onCreate}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Create a class' });
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(1);
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    expect(
      within(dialog).getByText('3 songs become the class blocks, in list order.'),
    ).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('Class name'), {
      target: { value: '  Sunday ride  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'HIIT' }));
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create class' }));
    });
    expect(onCreate).toHaveBeenCalledWith('Sunday ride', 'hiit');
  });

  it('shows a failure and lets the instructor try again', async () => {
    const onCreate = vi.fn().mockRejectedValueOnce(new Error('Server busy'));
    render(
      <SongPickCreateDialog
        count={1}
        defaultTitle="Likes"
        onClose={() => {}}
        onCreate={onCreate}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create class' }));
    });
    expect(screen.getByRole('alert').textContent).toBe('Server busy');
    expect(
      (screen.getByRole('button', { name: 'Create class' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('will not create without a name', () => {
    const onCreate = vi.fn();
    render(
      <SongPickCreateDialog count={1} defaultTitle="" onClose={() => {}} onCreate={onCreate} />,
    );
    const create = screen.getByRole('button', { name: 'Create class' }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
  });
});
