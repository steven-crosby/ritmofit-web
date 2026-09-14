// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Move, UserMove } from '@ritmofit/shared';
import { CustomMovesDialog } from './CustomMovesDialog.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const GLOBAL_CLIMB = '00000000-0000-4000-8000-000000000001';

const globalMove = (id: string, name: string): Move => ({
  id,
  name,
  description: null,
  template: 'cycle',
  createdAt: 1,
  updatedAt: 1,
});

function userMove(over: Partial<UserMove> = {}): UserMove {
  return {
    id: '00000000-0000-4000-8000-0000000000a1',
    userId: 'u1',
    name: 'My Climb',
    description: null,
    baseMoveId: null,
    template: null,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(api.listMoves).mockResolvedValue([globalMove(GLOBAL_CLIMB, 'Climb')]);
  vi.mocked(api.updateUserMove).mockResolvedValue(userMove());
});

describe('CustomMovesDialog — template + base-move editing', () => {
  it('persists the chosen discipline and base move on save', async () => {
    vi.mocked(api.listUserMoves).mockResolvedValue([userMove()]);
    render(<CustomMovesDialog onClose={() => {}} onChanged={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit My Climb' }));
    fireEvent.change(await screen.findByLabelText('Move discipline'), {
      target: { value: 'cycle' },
    });
    fireEvent.change(screen.getByLabelText('Based on library move'), {
      target: { value: GLOBAL_CLIMB },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.updateUserMove).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000a1', {
        name: 'My Climb',
        description: null,
        template: 'cycle',
        baseMoveId: GLOBAL_CLIMB,
      }),
    );
  });

  it('maps the unset choices back to null', async () => {
    vi.mocked(api.listUserMoves).mockResolvedValue([
      userMove({ template: 'cycle', baseMoveId: GLOBAL_CLIMB }),
    ]);
    render(<CustomMovesDialog onClose={() => {}} onChanged={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit My Climb' }));
    // Prefilled from the move, then cleared.
    fireEvent.change(await screen.findByLabelText('Move discipline'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Based on library move'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.updateUserMove).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000a1', {
        name: 'My Climb',
        description: null,
        template: null,
        baseMoveId: null,
      }),
    );
  });

  it('shows the discipline and base-move name on the read row', async () => {
    vi.mocked(api.listUserMoves).mockResolvedValue([
      userMove({ template: 'sculpt', baseMoveId: GLOBAL_CLIMB }),
    ]);
    render(<CustomMovesDialog onClose={() => {}} onChanged={() => {}} />);

    expect(await screen.findByText('Sculpt · based on Climb')).toBeTruthy();
  });
});

describe('CustomMovesDialog — delete focus', () => {
  it('focuses Yes, returns to Delete on No, and advances after deletion', async () => {
    const first = userMove();
    const second = userMove({ id: '00000000-0000-4000-8000-0000000000a2', name: 'My Sprint' });
    vi.mocked(api.listUserMoves)
      .mockResolvedValueOnce([first, second])
      .mockResolvedValueOnce([second]);
    vi.mocked(api.deleteUserMove).mockResolvedValue(undefined);
    render(<CustomMovesDialog onClose={() => {}} onChanged={() => {}} />);

    let remove = await screen.findByRole('button', { name: 'Delete My Climb' });
    remove.focus();
    fireEvent.click(remove);
    const yes = screen.getByRole('button', { name: 'Confirm delete My Climb' });
    await waitFor(() => expect(document.activeElement).toBe(yes));

    const no = screen.getByRole('button', { name: 'No' });
    no.focus();
    fireEvent.click(no);
    await waitFor(() => {
      remove = screen.getByRole('button', { name: 'Delete My Climb' });
      expect(document.activeElement).toBe(remove);
    });

    fireEvent.click(remove);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Confirm delete My Climb' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete My Climb' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete My Sprint' })),
    );
  });

  it('focuses the dialog close control after deleting its last move', async () => {
    vi.mocked(api.listUserMoves).mockResolvedValueOnce([userMove()]).mockResolvedValueOnce([]);
    vi.mocked(api.deleteUserMove).mockResolvedValue(undefined);
    render(<CustomMovesDialog onClose={() => {}} onChanged={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete My Climb' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete My Climb' }));

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Close custom moves dialog' }),
      ),
    );
  });
});
