// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CuesSection } from './ChoreographyEditor.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const cue = (
  id: string,
  text: string,
  extra: Partial<Awaited<ReturnType<typeof api.listCues>>[number]> = {},
) =>
  ({
    id,
    text,
    anchorMs: 0,
    color: null,
    durationMs: null,
    bpm: null,
    intensity: null,
    note: null,
    position: 0,
    ...extra,
  }) as Awaited<ReturnType<typeof api.listCues>>[number];

describe('CuesSection — m:ss anchor entry', () => {
  it('parses the m:ss field to anchorMs when adding a cue', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    vi.mocked(api.createCue).mockResolvedValue({} as never);
    const onChanged = vi.fn();
    render(<CuesSection classTrackId="ct-1" durationMs={240000} onChanged={onChanged} />);

    const time = await screen.findByRole('textbox', { name: 'Cue time (m:ss)' });
    fireEvent.change(time, { target: { value: '2:05' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Move name' }), {
      target: { value: 'Add resistance' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));

    await waitFor(() =>
      expect(vi.mocked(api.createCue)).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({ anchorMs: 125000, text: 'Add resistance' }),
      ),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('accepts 0:00 (a cue at the very start)', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    vi.mocked(api.createCue).mockResolvedValue({} as never);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    // The field seeds to 0:00, so only text is needed for a start-of-track cue.
    const add = await screen.findByRole('button', { name: 'Add cue' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Move name' }), {
      target: { value: 'Go' },
    });
    fireEvent.click(add);

    await waitFor(() =>
      expect(vi.mocked(api.createCue)).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({ anchorMs: 0 }),
      ),
    );
  });

  it('blocks Add cue on a malformed or out-of-range time and focuses the field', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    const time = await screen.findByRole('textbox', { name: 'Cue time (m:ss)' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Move name' }), {
      target: { value: 'Cue' },
    });

    time.focus();
    fireEvent.change(time, { target: { value: '125' } }); // raw seconds — no longer accepted
    const add = screen.getByRole('button', { name: 'Add cue' }) as HTMLButtonElement;
    expect(add.disabled).toBe(false);
    expect(screen.getByText('Use m:ss (e.g. 1:30).')).toBeTruthy();
    const message = screen.getByRole('alert');
    expect(time.getAttribute('aria-describedby')).toBe(message.id);
    add.focus();
    fireEvent.click(add);
    expect(document.activeElement).toBe(time);
    expect(api.createCue).not.toHaveBeenCalled();

    fireEvent.change(time, { target: { value: '5:00' } }); // past the 4:00 track
    expect(add.disabled).toBe(false);
    expect(screen.getByText('Past the end (max 4:00).')).toBeTruthy();

    fireEvent.change(time, { target: { value: '3:00' } }); // in range
    expect(add.disabled).toBe(false);
  });
});

describe('CuesSection — keyboard focus restoration', () => {
  it('returns focus to the invoking Edit control after cancel and save', async () => {
    const first = cue('cue-1', 'Push');
    vi.mocked(api.listCues).mockResolvedValue([first]);
    vi.mocked(api.updateCue).mockResolvedValue(first);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    let edit = await screen.findByRole('button', { name: 'Edit cue Push' });
    edit.focus();
    fireEvent.click(edit);
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();
    fireEvent.click(cancel);
    await waitFor(() => {
      edit = screen.getByRole('button', { name: 'Edit cue Push' });
      expect(document.activeElement).toBe(edit);
    });

    fireEvent.click(edit);
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.click(save);
    await waitFor(() => {
      edit = screen.getByRole('button', { name: 'Edit cue Push' });
      expect(document.activeElement).toBe(edit);
    });
  });

  it('focuses the next row after delete, then the add control when the last row is deleted', async () => {
    const first = cue('cue-1', 'Push');
    const second = cue('cue-2', 'Recover');
    vi.mocked(api.listCues)
      .mockResolvedValueOnce([first, second])
      .mockResolvedValueOnce([second])
      .mockResolvedValueOnce([]);
    vi.mocked(api.deleteCue).mockResolvedValue(undefined);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    const deleteFirst = await screen.findByRole('button', { name: 'Delete cue Push' });
    deleteFirst.focus();
    fireEvent.click(deleteFirst);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit cue Recover' })),
    );

    const deleteLast = screen.getByRole('button', { name: 'Delete cue Recover' });
    deleteLast.focus();
    fireEvent.click(deleteLast);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Cue time (m:ss)' })),
    );
  });

  it('normalizes a non-Error mutation failure with local context', async () => {
    const first = cue('cue-1', 'Push');
    vi.mocked(api.listCues).mockResolvedValue([first]);
    vi.mocked(api.updateCue).mockRejectedValue({ upstream: 'do not render' });
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue Push' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save the cue. Try again.',
    );
  });
});

describe('CuesSection — readiness first-cue handoff', () => {
  it('puts the caret in the cue text field when readiness asks to start entry', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    const { rerender } = render(
      <CuesSection classTrackId="ct-1" durationMs={240000} startEntryNonce={0} />,
    );
    const field = await screen.findByRole('textbox', { name: 'Move name' });
    expect(document.activeElement).not.toBe(field);

    rerender(<CuesSection classTrackId="ct-1" durationMs={240000} startEntryNonce={1} />);
    expect(document.activeElement).toBe(field);
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

describe('CuesSection — pending request ownership', () => {
  it.each(['success', 'failure'])(
    'ignores a stale initial read %s after the mutation refresh',
    async (outcome: string) => {
      const initial = deferred<Awaited<ReturnType<typeof api.listCues>>>();
      const saved = cue('saved', 'First');
      vi.mocked(api.listCues).mockReturnValueOnce(initial.promise).mockResolvedValue([saved]);
      vi.mocked(api.createCue).mockResolvedValue(saved);
      render(<CuesSection classTrackId="ct-1" durationMs={240000} />);
      fireEvent.change(screen.getByRole('textbox', { name: 'Move name' }), {
        target: { value: 'First' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));
      await screen.findByRole('button', { name: 'Edit cue First' });
      await act(async () => {
        if (outcome === 'success') initial.resolve([]);
        else initial.reject(new Error('Old read failed'));
      });
      expect(screen.getByRole('button', { name: 'Edit cue First' })).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('preserves a replacement add draft after a pending create succeeds', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    const request = deferred<Awaited<ReturnType<typeof api.createCue>>>();
    vi.mocked(api.createCue).mockReturnValue(request.promise);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);
    const field = screen.getByRole('textbox', { name: 'Move name' }) as HTMLInputElement;
    const time = screen.getByRole('textbox', { name: 'Cue time (m:ss)' }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'First' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));
    fireEvent.change(field, { target: { value: 'Second' } });
    fireEvent.change(time, { target: { value: '0:45' } });
    await act(async () => request.resolve(cue('saved', 'First')));
    expect(field.value).toBe('Second');
    expect(time.value).toBe('0:45');
    expect((screen.getByRole('button', { name: 'Add cue' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('keeps newer inline input editable after an earlier save succeeds', async () => {
    const first = cue('first', 'First');
    vi.mocked(api.listCues).mockResolvedValue([first]);
    const request = deferred<Awaited<ReturnType<typeof api.updateCue>>>();
    vi.mocked(api.updateCue).mockReturnValue(request.promise);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue First' }));
    const field = screen.getAllByRole('textbox', { name: 'Move name' })[0] as HTMLInputElement;
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
      const first = cue('first', 'First');
      vi.mocked(api.listCues).mockResolvedValue([first]);
      const request = deferred<Awaited<ReturnType<typeof api.updateCue>>>();
      const deletion = deferred<void>();
      vi.mocked(api.updateCue).mockReturnValue(request.promise);
      vi.mocked(api.deleteCue).mockReturnValue(deletion.promise);
      render(
        <>
          <CuesSection classTrackId="ct-1" durationMs={240000} />
          <button>Outside</button>
        </>,
      );
      if (operation === 'save') {
        fireEvent.click(await screen.findByRole('button', { name: 'Edit cue First' }));
        const save = screen.getByRole('button', { name: 'Save' });
        save.focus();
        fireEvent.click(save);
      } else {
        const remove = await screen.findByRole('button', { name: 'Delete cue First' });
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
    vi.mocked(api.listCues).mockResolvedValue([]);
    vi.mocked(api.createCue).mockRejectedValue(new Error('Write rejected'));
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);
    const field = screen.getByRole('textbox', { name: 'Move name' }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));
    await screen.findByRole('alert');
    expect(field.value).toBe('Keep me');
  });

  it('reports a post-write refresh failure while notifying the parent of a confirmed write', async () => {
    vi.mocked(api.listCues)
      .mockResolvedValueOnce([])
      .mockRejectedValue(new Error('Refresh unavailable'));
    vi.mocked(api.createCue).mockResolvedValue(cue('saved', 'First'));
    const onChanged = vi.fn();
    render(<CuesSection classTrackId="ct-1" durationMs={240000} onChanged={onChanged} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Move name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Refresh unavailable');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('CuesSection — section lifecycle', () => {
  it.each(['add', 'save', 'delete'])(
    'does not refresh or notify the old parent after a pending %s unmounts',
    async (operation: string) => {
      const first = cue('first', 'First');
      vi.mocked(api.listCues).mockResolvedValue([first]);
      const create = deferred<Awaited<ReturnType<typeof api.createCue>>>();
      const update = deferred<Awaited<ReturnType<typeof api.updateCue>>>();
      const deletion = deferred<void>();
      vi.mocked(api.createCue).mockReturnValue(create.promise);
      vi.mocked(api.updateCue).mockReturnValue(update.promise);
      vi.mocked(api.deleteCue).mockReturnValue(deletion.promise);
      const onChanged = vi.fn();
      const { unmount } = render(
        <CuesSection classTrackId="ct-1" durationMs={240000} onChanged={onChanged} />,
      );
      await screen.findByRole('button', { name: 'Edit cue First' });
      if (operation === 'add') {
        fireEvent.change(screen.getByRole('textbox', { name: 'Move name' }), {
          target: { value: 'New' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));
      } else if (operation === 'save') {
        fireEvent.click(screen.getByRole('button', { name: 'Edit cue First' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Delete cue First' }));
      }
      unmount();
      await act(async () => {
        create.resolve(first);
        update.resolve(first);
        deletion.resolve();
      });
      expect(onChanged).not.toHaveBeenCalled();
      expect(api.listCues).toHaveBeenCalledTimes(1);
    },
  );
});

describe('CuesSection — teaching list', () => {
  it('stays empty until she adds a cue', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} bpm={128} />);
    expect(await screen.findByText('No cues yet.')).toBeTruthy();
    expect(screen.queryByText('Left Leg Lead')).toBeNull();
    expect(screen.queryByText('Press Throw')).toBeNull();
    expect(screen.queryByText('Press Tap')).toBeNull();
    expect((screen.getByRole('textbox', { name: 'Move name' }) as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('textbox', { name: 'Cue BPM' }) as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('combobox', { name: 'Intensity' }) as HTMLSelectElement).value).toBe(
      '',
    );
  });

  it('saves the move, duration, her BPM, Open, and the note without copying the track BPM', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    vi.mocked(api.createCue).mockResolvedValue({} as never);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} bpm={140} />);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Move name' }), {
      target: { value: 'Left Leg Lead' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Duration (seconds)' }), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Cue BPM' }), {
      target: { value: '96' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Intensity' }), {
      target: { value: 'open' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'This is our warm up.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));

    await waitFor(() =>
      expect(vi.mocked(api.createCue)).toHaveBeenCalledWith('ct-1', {
        anchorMs: 0,
        text: 'Left Leg Lead',
        durationMs: 15_000,
        bpm: 96,
        intensity: 'open',
        note: 'This is our warm up.',
        color: null,
      }),
    );
  });

  it('shows the saved row in teaching order, including Open and the note', async () => {
    vi.mocked(api.listCues).mockResolvedValue([
      cue('cue-1', 'Left Leg Lead', {
        position: 0,
        durationMs: 15_000,
        bpm: 96,
        intensity: 'open',
        note: 'This is our warm up.',
      }),
      cue('cue-2', 'Recover', {
        position: 1,
        anchorMs: 1_000,
        durationMs: 48_000,
        bpm: 110,
        intensity: 'easy',
        note: null,
      }),
    ]);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    const rows = await screen.findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('Left Leg Lead');
    expect(rows[1]?.textContent).toContain('Recover');
    expect(rows[0]?.textContent).toContain('15s');
    expect(rows[0]?.textContent).toContain('96 BPM');
    expect(rows[0]?.textContent).toContain('Open');
    expect(rows[0]?.textContent).toContain('This is our warm up.');
    expect(rows[1]?.textContent).toContain('48s');
    expect(rows[1]?.textContent).toContain('Easy');
    expect(screen.getByRole('option', { name: 'Open' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'All Out' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'None' })).toBeTruthy();
  });

  it('edits a row and can clear the note', async () => {
    const first = cue('cue-1', 'Press Tap', {
      durationMs: 3_000,
      bpm: 120,
      intensity: 'mod',
      note: 'Old note',
    });
    vi.mocked(api.listCues).mockResolvedValue([first]);
    vi.mocked(api.updateCue).mockResolvedValue(first);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue Press Tap' }));
    const notes = screen.getAllByRole('textbox', { name: 'Note' });
    fireEvent.change(notes[0]!, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(vi.mocked(api.updateCue)).toHaveBeenCalledWith(
        'cue-1',
        expect.objectContaining({
          text: 'Press Tap',
          durationMs: 3_000,
          bpm: 120,
          intensity: 'mod',
          note: null,
        }),
      ),
    );
  });

  it('does not save a cue when duration or BPM is not a whole number', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Move name' }), {
      target: { value: 'Left Leg Lead' },
    });
    const duration = screen.getByRole('textbox', { name: 'Duration (seconds)' });
    fireEvent.change(duration, { target: { value: '1.5' } });
    const add = screen.getByRole('button', { name: 'Add cue' });
    add.focus();
    fireEvent.click(add);

    expect(api.createCue).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Use whole seconds, such as 15.');
    expect(document.activeElement).toBe(duration);

    fireEvent.change(duration, { target: { value: '15' } });
    const bpm = screen.getByRole('textbox', { name: 'Cue BPM' });
    fireEvent.change(bpm, { target: { value: '128.5' } });
    add.focus();
    fireEvent.click(add);

    expect(api.createCue).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Use a whole BPM, such as 128.');
    expect(document.activeElement).toBe(bpm);
  });

  it('does not save an edit when the duration is no longer a whole number', async () => {
    const first = cue('cue-1', 'Press Tap', { durationMs: 15_000, bpm: 96, intensity: 'open' });
    vi.mocked(api.listCues).mockResolvedValue([first]);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue Press Tap' }));
    const duration = screen.getAllByRole('textbox', { name: 'Duration (seconds)' })[0]!;
    fireEvent.change(duration, { target: { value: '0' } });
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.click(save);

    expect(api.updateCue).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Use whole seconds, such as 15.');
    expect(document.activeElement).toBe(duration);
  });

  it('sends null when she clears duration, BPM, and intensity', async () => {
    const first = cue('cue-1', 'Press Tap', {
      durationMs: 15_000,
      bpm: 96,
      intensity: 'open',
      note: 'Keep',
    });
    vi.mocked(api.listCues).mockResolvedValue([first]);
    vi.mocked(api.updateCue).mockResolvedValue(first);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue Press Tap' }));
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Duration (seconds)' })[0]!, {
      target: { value: '' },
    });
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Cue BPM' })[0]!, {
      target: { value: '' },
    });
    fireEvent.change(screen.getAllByRole('combobox', { name: 'Intensity' })[0]!, {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(vi.mocked(api.updateCue)).toHaveBeenCalledWith(
        'cue-1',
        expect.objectContaining({
          text: 'Press Tap',
          durationMs: null,
          bpm: null,
          intensity: null,
          note: 'Keep',
        }),
      ),
    );
  });
});

describe('CuesSection — color draft ownership', () => {
  it('keeps a replacement color draft after a pending add succeeds', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    const request = deferred<Awaited<ReturnType<typeof api.createCue>>>();
    vi.mocked(api.createCue).mockReturnValue(request.promise);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Move name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add cue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copper' }));
    await act(async () => request.resolve(cue('saved', 'First')));
    expect(screen.getByRole('button', { name: 'Copper' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect((screen.getByRole('textbox', { name: 'Move name' }) as HTMLInputElement).value).toBe(
      'First',
    );
  });
});

// RF-90 / Codex B-3 (audit 4e0b150, repro b-anchor-precision). A save sends the
// anchor only when the instructor edited the time field.
describe('CuesSection — untouched anchors survive an edit', () => {
  function editRow() {
    const li = screen
      .getAllByRole('listitem')
      .find((item) => within(item).queryByRole('button', { name: 'Save' }));
    return within(li!);
  }

  it('keeps a beat-snapped 10313 ms anchor on a text-only edit (128 BPM, snap on)', async () => {
    // Beat 22 at 128 BPM from a 0 downbeat = 22 * 468.75 = 10312.5, stored as 10313.
    vi.mocked(api.listCues).mockResolvedValue([cue('cue-1', 'Climb', { anchorMs: 10313 })]);
    vi.mocked(api.updateCue).mockResolvedValue({} as never);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} bpm={128} beatAnchorMs={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue Climb' }));
    const row = editRow();
    fireEvent.change(row.getByLabelText('Move name'), { target: { value: 'Climb, sit tall' } });
    await act(async () => {
      fireEvent.click(row.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updateCue).toHaveBeenCalledTimes(1));
    const body = vi.mocked(api.updateCue).mock.calls[0]![1];
    expect(body.text).toBe('Climb, sit tall');
    // Omitted, so the server keeps the stored 10313.
    expect(body.anchorMs ?? 10313).toBe(10313);
  });

  it('still snaps a deliberately edited cue time (128 BPM, snap on)', async () => {
    vi.mocked(api.listCues).mockResolvedValue([cue('cue-1', 'Climb', { anchorMs: 10313 })]);
    vi.mocked(api.updateCue).mockResolvedValue({} as never);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} bpm={128} beatAnchorMs={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit cue Climb' }));
    const row = editRow();
    fireEvent.change(row.getByLabelText('Cue time (m:ss)'), { target: { value: '0:11' } });
    await act(async () => {
      fireEvent.click(row.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(api.updateCue).toHaveBeenCalledTimes(1));
    // 11000 ms snaps to beat 23: round(23 * 468.75) = 10781.
    expect(vi.mocked(api.updateCue).mock.calls[0]![1].anchorMs).toBe(10781);
  });
});

describe('CuesSection — reload when the run payload changes (RF-90, B-2)', () => {
  it('reloads its cues when syncKey changes, not on the first key', async () => {
    vi.mocked(api.listCues).mockResolvedValue([cue('cue-1', 'Climb', { anchorMs: 10000 })]);
    const { rerender } = render(<CuesSection classTrackId="ct-1" durationMs={240000} />);
    await screen.findByRole('button', { name: 'Edit cue Climb' });
    rerender(<CuesSection classTrackId="ct-1" durationMs={240000} syncKey="a" />);
    expect(api.listCues).toHaveBeenCalledTimes(1);

    vi.mocked(api.listCues).mockResolvedValue([cue('cue-1', 'Climb', { anchorMs: 11000 })]);
    rerender(<CuesSection classTrackId="ct-1" durationMs={240000} syncKey="b" />);
    await waitFor(() => expect(api.listCues).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('0:11')).toBeTruthy();
  });
});
