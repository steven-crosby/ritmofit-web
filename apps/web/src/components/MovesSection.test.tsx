// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MovesSection } from './ChoreographyEditor.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mockEmptyLibrary() {
  vi.mocked(api.listPlacedMoves).mockResolvedValue([]);
  vi.mocked(api.listMoves).mockResolvedValue([]);
  vi.mocked(api.listUserMoves).mockResolvedValue([]);
}

const placedMove = (id: string, name: string) =>
  ({
    id,
    nameOverride: name,
    moveId: null,
    userMoveId: null,
    anchorMs: 0,
    intensity: null,
  }) as Awaited<ReturnType<typeof api.listPlacedMoves>>[number];

describe('MovesSection — Songs-by-move entry', () => {
  it('shows the in-builder trigger and invokes the callback', async () => {
    mockEmptyLibrary();
    const onOpenSongsByMove = vi.fn();
    render(
      <MovesSection
        classTrackId="ct-1"
        durationMs={180000}
        onOpenSongsByMove={onOpenSongsByMove}
      />,
    );
    const button = await screen.findByRole('button', { name: 'Songs by move…' });
    fireEvent.click(button);
    expect(onOpenSongsByMove).toHaveBeenCalledTimes(1);
  });

  it('omits the trigger when no handler is provided', async () => {
    mockEmptyLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={180000} />);
    // Wait for the section to settle (Manage… always renders).
    await screen.findByRole('button', { name: 'Manage…' });
    expect(screen.queryByRole('button', { name: 'Songs by move…' })).toBeNull();
  });
});

describe('MovesSection — m:ss anchor entry', () => {
  it('parses the m:ss field to anchorMs when placing a move', async () => {
    mockEmptyLibrary();
    vi.mocked(api.placeMove).mockResolvedValue({} as never);
    const onChanged = vi.fn();
    render(<MovesSection classTrackId="ct-1" durationMs={240000} onChanged={onChanged} />);

    const time = await screen.findByRole('textbox', { name: 'Move time (m:ss)' });
    fireEvent.change(time, { target: { value: '1:30' } });
    // A one-off custom move (the default pick) just needs a name.
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom move name' }), {
      target: { value: 'Sprint' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));

    await waitFor(() =>
      expect(vi.mocked(api.placeMove)).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({ anchorMs: 90000 }),
      ),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('blocks Add move on a malformed or out-of-range time and focuses the field', async () => {
    mockEmptyLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

    const time = await screen.findByRole('textbox', { name: 'Move time (m:ss)' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom move name' }), {
      target: { value: 'Sprint' },
    });

    time.focus();
    fireEvent.change(time, { target: { value: '90' } }); // raw seconds — no longer accepted
    const add = screen.getByRole('button', { name: 'Add move' }) as HTMLButtonElement;
    expect(add.disabled).toBe(false);
    expect(screen.getByText('Use m:ss (e.g. 1:30).')).toBeTruthy();
    const message = screen.getByRole('alert');
    expect(time.getAttribute('aria-describedby')).toBe(message.id);
    add.focus();
    fireEvent.click(add);
    expect(document.activeElement).toBe(time);
    expect(api.placeMove).not.toHaveBeenCalled();

    fireEvent.change(time, { target: { value: '9:00' } }); // past the 4:00 track
    expect(add.disabled).toBe(false);
    expect(screen.getByText('Past the end (max 4:00).')).toBeTruthy();

    fireEvent.change(time, { target: { value: '0:00' } }); // the start is valid
    expect(add.disabled).toBe(false);
  });
});

describe('MovesSection — keyboard focus restoration', () => {
  it('returns focus to the invoking Edit control after cancel and save', async () => {
    const first = placedMove('move-1', 'Sprint');
    vi.mocked(api.listPlacedMoves).mockResolvedValue([first]);
    vi.mocked(api.listMoves).mockResolvedValue([]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.updatePlacedMove).mockResolvedValue(first);
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

    let edit = await screen.findByRole('button', { name: 'Edit move Sprint' });
    edit.focus();
    fireEvent.click(edit);
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();
    fireEvent.click(cancel);
    await waitFor(() => expect(document.activeElement).toBe(edit));

    fireEvent.click(edit);
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.click(save);
    await waitFor(() => {
      edit = screen.getByRole('button', { name: 'Edit move Sprint' });
      expect(document.activeElement).toBe(edit);
    });
  });

  it('focuses the next row after delete, then the add control when the last row is deleted', async () => {
    const first = placedMove('move-1', 'Sprint');
    const second = placedMove('move-2', 'Recover');
    vi.mocked(api.listPlacedMoves)
      .mockResolvedValueOnce([first, second])
      .mockResolvedValueOnce([second])
      .mockResolvedValueOnce([]);
    vi.mocked(api.listMoves).mockResolvedValue([]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.deletePlacedMove).mockResolvedValue(undefined);
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

    const deleteFirst = await screen.findByRole('button', { name: 'Delete move Sprint' });
    deleteFirst.focus();
    fireEvent.click(deleteFirst);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Edit move Recover' }),
      ),
    );

    const deleteLast = screen.getByRole('button', { name: 'Delete move Recover' });
    deleteLast.focus();
    fireEvent.click(deleteLast);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Move time (m:ss)' }),
      ),
    );
  });

  it('normalizes a non-Error mutation failure with local context', async () => {
    const first = placedMove('move-1', 'Sprint');
    vi.mocked(api.listPlacedMoves).mockResolvedValue([first]);
    vi.mocked(api.listMoves).mockResolvedValue([]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.updatePlacedMove).mockRejectedValue({ upstream: 'do not render' });
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit move Sprint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save the move. Try again.',
    );
  });
});
