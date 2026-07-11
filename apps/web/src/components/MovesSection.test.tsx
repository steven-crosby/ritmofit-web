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
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

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
  });

  it('disables Add move on a malformed or out-of-range time', async () => {
    mockEmptyLibrary();
    render(<MovesSection classTrackId="ct-1" durationMs={240000} />);

    const time = await screen.findByRole('textbox', { name: 'Move time (m:ss)' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom move name' }), {
      target: { value: 'Sprint' },
    });

    fireEvent.change(time, { target: { value: '90' } }); // raw seconds — no longer accepted
    expect((screen.getByRole('button', { name: 'Add move' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText('Use m:ss (e.g. 1:30).')).toBeTruthy();

    fireEvent.change(time, { target: { value: '9:00' } }); // past the 4:00 track
    expect((screen.getByRole('button', { name: 'Add move' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText('Past the end (max 4:00).')).toBeTruthy();

    fireEvent.change(time, { target: { value: '0:00' } }); // the start is valid
    expect((screen.getByRole('button', { name: 'Add move' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});
