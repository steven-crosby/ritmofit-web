// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CuesSection } from './ChoreographyEditor.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const cue = (id: string, text: string) =>
  ({ id, text, anchorMs: 0, color: null }) as Awaited<ReturnType<typeof api.listCues>>[number];

describe('CuesSection — m:ss anchor entry', () => {
  it('parses the m:ss field to anchorMs when adding a cue', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    vi.mocked(api.createCue).mockResolvedValue({} as never);
    const onChanged = vi.fn();
    render(<CuesSection classTrackId="ct-1" durationMs={240000} onChanged={onChanged} />);

    const time = await screen.findByRole('textbox', { name: 'Cue time (m:ss)' });
    fireEvent.change(time, { target: { value: '2:05' } });
    fireEvent.change(screen.getByPlaceholderText('Cue text'), {
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
    fireEvent.change(screen.getByPlaceholderText('Cue text'), { target: { value: 'Go' } });
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
    fireEvent.change(screen.getByPlaceholderText('Cue text'), { target: { value: 'Cue' } });

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
    await waitFor(() => expect(document.activeElement).toBe(edit));

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
    const field = await screen.findByRole('textbox', { name: 'Cue text' });
    expect(document.activeElement).not.toBe(field);

    rerender(<CuesSection classTrackId="ct-1" durationMs={240000} startEntryNonce={1} />);
    expect(document.activeElement).toBe(field);
  });
});
