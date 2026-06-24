// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
