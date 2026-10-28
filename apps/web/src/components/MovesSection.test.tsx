// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('MovesSection — pending request ownership', () => {
  it.each(['success', 'failure'])(
    'ignores a stale initial read %s after the mutation refresh',
    async (outcome: string) => {
      mockEmptyLibrary();
      const initial = deferred<Awaited<ReturnType<typeof api.listPlacedMoves>>>();
      const saved = placedMove('saved', 'First');
      vi.mocked(api.listPlacedMoves)
        .mockReturnValueOnce(initial.promise)
        .mockResolvedValue([saved]);
      vi.mocked(api.placeMove).mockResolvedValue(saved);
      render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
      fireEvent.change(screen.getByRole('textbox', { name: 'Custom move name' }), {
        target: { value: 'First' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
      await screen.findByRole('button', { name: 'Edit move First' });
      await act(async () => {
        if (outcome === 'success') initial.resolve([]);
        else initial.reject(new Error('Old read failed'));
      });
      expect(screen.getByRole('button', { name: 'Edit move First' })).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('preserves a replacement add draft after a pending create succeeds', async () => {
    mockEmptyLibrary();
    vi.mocked(api.listPlacedMoves).mockResolvedValue([]);
    const request = deferred<Awaited<ReturnType<typeof api.placeMove>>>();
    vi.mocked(api.placeMove).mockReturnValue(request.promise);
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
    const field = screen.getByRole('textbox', { name: 'Custom move name' }) as HTMLInputElement;
    const time = screen.getByRole('textbox', { name: 'Move time (m:ss)' }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'First' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
    fireEvent.change(field, { target: { value: 'Second' } });
    fireEvent.change(time, { target: { value: '0:45' } });
    await act(async () => request.resolve(placedMove('saved', 'First')));
    expect(field.value).toBe('Second');
    expect(time.value).toBe('0:45');
    expect((screen.getByRole('button', { name: 'Add move' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('keeps newer inline input editable after an earlier save succeeds', async () => {
    mockEmptyLibrary();
    const first = placedMove('first', 'First');
    vi.mocked(api.listPlacedMoves).mockResolvedValue([first]);
    const request = deferred<Awaited<ReturnType<typeof api.updatePlacedMove>>>();
    vi.mocked(api.updatePlacedMove).mockReturnValue(request.promise);
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit move First' }));
    const field = screen.getAllByRole('textbox', {
      name: 'Custom move name',
    })[0] as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Submitted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.change(field, { target: { value: 'Newer' } });
    await act(async () => request.resolve(first));
    expect(field.isConnected).toBe(true);
    expect(field.value).toBe('Newer');
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it.each(['save', 'delete'])(
    'preserves deliberately moved focus after pending %s',
    async (operation: string) => {
      mockEmptyLibrary();
      const first = placedMove('first', 'First');
      vi.mocked(api.listPlacedMoves).mockResolvedValue([first]);
      const request = deferred<Awaited<ReturnType<typeof api.updatePlacedMove>>>();
      const deletion = deferred<void>();
      vi.mocked(api.updatePlacedMove).mockReturnValue(request.promise);
      vi.mocked(api.deletePlacedMove).mockReturnValue(deletion.promise);
      render(
        <>
          <MovesSection classTrackId="ct-1" durationMs={240000} />
          <button>Outside</button>
        </>,
      );
      if (operation === 'save') {
        fireEvent.click(await screen.findByRole('button', { name: 'Edit move First' }));
        const save = screen.getByRole('button', { name: 'Save' });
        save.focus();
        fireEvent.click(save);
      } else {
        const remove = await screen.findByRole('button', { name: 'Delete move First' });
        remove.focus();
        fireEvent.click(remove);
      }
      const outside = screen.getByRole('button', { name: 'Outside' });
      outside.focus();
      await act(async () => {
        request.resolve(first);
        deletion.resolve();
      });
      expect(document.activeElement).toBe(outside);
    },
  );

  it('retains a rejected add draft', async () => {
    mockEmptyLibrary();
    vi.mocked(api.listPlacedMoves).mockResolvedValue([]);
    vi.mocked(api.placeMove).mockRejectedValue(new Error('Write rejected'));
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
    const field = screen.getByRole('textbox', { name: 'Custom move name' }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
    await screen.findByRole('alert');
    expect(field.value).toBe('Keep me');
  });

  it('reports a post-write refresh failure while notifying the parent of a confirmed write', async () => {
    mockEmptyLibrary();
    vi.mocked(api.listPlacedMoves)
      .mockResolvedValueOnce([])
      .mockRejectedValue(new Error('Refresh unavailable'));
    vi.mocked(api.placeMove).mockResolvedValue(placedMove('saved', 'First'));
    const onChanged = vi.fn();
    render(<MovesSection classTrackId="ct-1" durationMs={240000} onChanged={onChanged} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom move name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Refresh unavailable');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('MovesSection — reusable move creation ownership', () => {
  it('places the submitted reusable move without replacing a newer picker draft', async () => {
    mockEmptyLibrary();
    const creation = deferred<Awaited<ReturnType<typeof api.createUserMove>>>();
    vi.mocked(api.createUserMove).mockReturnValue(creation.promise);
    vi.mocked(api.placeMove).mockResolvedValue(placedMove('saved', 'First'));
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
    const picker = screen.getByRole('combobox', { name: 'Move' }) as HTMLSelectElement;
    fireEvent.change(picker, { target: { value: '__new__' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'New custom move name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
    fireEvent.change(picker, { target: { value: '__custom__' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom move name' }), {
      target: { value: 'Second' },
    });
    await act(async () => creation.resolve({ id: 'reusable', name: 'First' } as never));
    expect(api.placeMove).toHaveBeenCalledWith(
      'ct-1',
      expect.objectContaining({ userMoveId: 'reusable' }),
    );
    expect(picker.value).toBe('__custom__');
    expect(
      (screen.getByRole('textbox', { name: 'Custom move name' }) as HTMLInputElement).value,
    ).toBe('Second');
  });
});

describe('MovesSection — section lifecycle', () => {
  it.each(['add', 'save', 'delete'])(
    'does not refresh or notify the old parent after a pending %s unmounts',
    async (operation: string) => {
      mockEmptyLibrary();
      const first = placedMove('first', 'First');
      vi.mocked(api.listPlacedMoves).mockResolvedValue([first]);
      const create = deferred<Awaited<ReturnType<typeof api.placeMove>>>();
      const update = deferred<Awaited<ReturnType<typeof api.updatePlacedMove>>>();
      const deletion = deferred<void>();
      vi.mocked(api.placeMove).mockReturnValue(create.promise);
      vi.mocked(api.updatePlacedMove).mockReturnValue(update.promise);
      vi.mocked(api.deletePlacedMove).mockReturnValue(deletion.promise);
      const onChanged = vi.fn();
      const { unmount } = render(
        <MovesSection classTrackId="ct-1" durationMs={240000} onChanged={onChanged} />,
      );
      await screen.findByRole('button', { name: 'Edit move First' });
      if (operation === 'add') {
        fireEvent.change(screen.getByRole('textbox', { name: 'Custom move name' }), {
          target: { value: 'New' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
      } else if (operation === 'save') {
        fireEvent.click(screen.getByRole('button', { name: 'Edit move First' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Delete move First' }));
      }
      unmount();
      await act(async () => {
        create.resolve(first);
        update.resolve(first);
        deletion.resolve();
      });
      expect(onChanged).not.toHaveBeenCalled();
      expect(api.listPlacedMoves).toHaveBeenCalledTimes(1);
    },
  );
});

describe('MovesSection — reusable move refresh and retry', () => {
  it('ignores the older user-move library read after creating a reusable move', async () => {
    mockEmptyLibrary();
    const initial = deferred<Awaited<ReturnType<typeof api.listUserMoves>>>();
    const created = { id: 'reusable', name: 'First' } as Awaited<
      ReturnType<typeof api.createUserMove>
    >;
    vi.mocked(api.listUserMoves).mockReturnValueOnce(initial.promise).mockResolvedValue([created]);
    vi.mocked(api.createUserMove).mockResolvedValue(created);
    vi.mocked(api.placeMove).mockResolvedValue(placedMove('saved', 'First'));
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
    const picker = screen.getByRole('combobox', { name: 'Move' }) as HTMLSelectElement;
    fireEvent.change(picker, { target: { value: '__new__' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'New custom move name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
    await waitFor(() => expect(picker.value).toBe('u:reusable'));
    await act(async () => initial.resolve([]));
    expect(picker.value).toBe('u:reusable');
    expect(screen.getByRole('option', { name: 'First' })).toBeTruthy();
  });

  it('reuses the created ID after placement fails instead of creating the reusable move twice', async () => {
    mockEmptyLibrary();
    const created = { id: 'reusable', name: 'First' } as Awaited<
      ReturnType<typeof api.createUserMove>
    >;
    vi.mocked(api.listUserMoves).mockResolvedValue([created]);
    vi.mocked(api.createUserMove).mockResolvedValue(created);
    vi.mocked(api.placeMove)
      .mockRejectedValueOnce(new Error('Placement failed'))
      .mockResolvedValue(placedMove('saved', 'First'));
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Move' }), {
      target: { value: '__new__' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'New custom move name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Add move' }));
    await waitFor(() => expect(api.placeMove).toHaveBeenCalledTimes(2));
    expect(api.createUserMove).toHaveBeenCalledTimes(1);
    expect(api.placeMove).toHaveBeenLastCalledWith(
      'ct-1',
      expect.objectContaining({ userMoveId: 'reusable' }),
    );
  });
});

// RF-90 / Codex B-3 (audit 4e0b150, repro b-anchor-precision).
describe('MovesSection — untouched anchors survive an edit', () => {
  function editRow() {
    const li = screen
      .getAllByRole('listitem')
      .find((item) => within(item).queryByRole('button', { name: 'Save' }));
    return within(li!);
  }

  it('keeps a sub-second 12750 ms anchor on an unchanged save (no tempo)', async () => {
    vi.mocked(api.listPlacedMoves).mockResolvedValue([
      { ...placedMove('pm-1', 'Sprint'), anchorMs: 12750 },
    ]);
    vi.mocked(api.listMoves).mockResolvedValue([]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.updatePlacedMove).mockResolvedValue({} as never);
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit move Sprint' }));
    await act(async () => {
      fireEvent.click(editRow().getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updatePlacedMove).toHaveBeenCalledTimes(1));
    const body = vi.mocked(api.updatePlacedMove).mock.calls[0]![1];
    expect(body.anchorMs ?? 12750).toBe(12750);
  });

  it('still snaps a deliberately edited move time (128 BPM, snap on)', async () => {
    vi.mocked(api.listPlacedMoves).mockResolvedValue([
      { ...placedMove('pm-1', 'Sprint'), anchorMs: 12750 },
    ]);
    vi.mocked(api.listMoves).mockResolvedValue([]);
    vi.mocked(api.listUserMoves).mockResolvedValue([]);
    vi.mocked(api.updatePlacedMove).mockResolvedValue({} as never);
    render(<MovesSection classTrackId="ct-1" durationMs={240000} bpm={128} beatAnchorMs={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit move Sprint' }));
    const row = editRow();
    fireEvent.change(row.getByLabelText(/time \(m:ss\)/i), { target: { value: '0:11' } });
    await act(async () => {
      fireEvent.click(row.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updatePlacedMove).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.updatePlacedMove).mock.calls[0]![1].anchorMs).toBe(10781);
  });
});

describe('MovesSection — reload when the run payload changes (RF-90, B-2)', () => {
  it('reloads its placements when syncKey changes, not on the first key', async () => {
    mockEmptyLibrary();
    vi.mocked(api.listPlacedMoves).mockResolvedValue([
      { ...placedMove('pm-1', 'Sprint'), anchorMs: 10000 },
    ]);
    const { rerender } = render(<MovesSection classTrackId="ct-1" durationMs={240000} />);
    await screen.findByRole('button', { name: 'Edit move Sprint' });
    rerender(<MovesSection classTrackId="ct-1" durationMs={240000} syncKey="a" />);
    expect(api.listPlacedMoves).toHaveBeenCalledTimes(1);

    vi.mocked(api.listPlacedMoves).mockResolvedValue([
      { ...placedMove('pm-1', 'Sprint'), anchorMs: 11000 },
    ]);
    rerender(<MovesSection classTrackId="ct-1" durationMs={240000} syncKey="b" />);
    await waitFor(() => expect(api.listPlacedMoves).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('0:11')).toBeTruthy();
  });
});
