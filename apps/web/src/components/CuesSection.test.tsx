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

  it('disables Add cue on a malformed or out-of-range time', async () => {
    vi.mocked(api.listCues).mockResolvedValue([]);
    render(<CuesSection classTrackId="ct-1" durationMs={240000} />);

    const time = await screen.findByRole('textbox', { name: 'Cue time (m:ss)' });
    fireEvent.change(screen.getByPlaceholderText('Cue text'), { target: { value: 'Cue' } });

    fireEvent.change(time, { target: { value: '125' } }); // raw seconds — no longer accepted
    expect((screen.getByRole('button', { name: 'Add cue' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText('Use m:ss (e.g. 1:30).')).toBeTruthy();

    fireEvent.change(time, { target: { value: '5:00' } }); // past the 4:00 track
    expect((screen.getByRole('button', { name: 'Add cue' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText('Past the end (max 4:00).')).toBeTruthy();

    fireEvent.change(time, { target: { value: '3:00' } }); // in range
    expect((screen.getByRole('button', { name: 'Add cue' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});
