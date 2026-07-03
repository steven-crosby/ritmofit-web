// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TeamMemberView, TeamWithRole } from '@ritmofit/shared';
import { TeamsDialog } from './TeamsDialog.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

const teamId = '00000000-0000-4000-8000-000000000030';

const ownedTeam: TeamWithRole = {
  id: teamId,
  name: 'Studio A',
  ownerUserId: 'me',
  role: 'owner',
  createdAt: 1,
  updatedAt: 1,
};

function member(userId: string, email: string, role: TeamMemberView['role']): TeamMemberView {
  return { userId, email, role, joinedAt: 1, displayName: null };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeamsDialog', () => {
  it('shows a clean empty state (no scaffold rows) when the caller has no teams', async () => {
    vi.mocked(api.listTeams).mockResolvedValue([]);

    render(<TeamsDialog userId="me" onClose={() => {}} />);

    expect(await screen.findByText(/No studio crews yet/)).toBeTruthy();
    // The empty state must not leak fake member scaffolding (audit: no "O/M/M" rows).
    expect(screen.queryByText('O')).toBeNull();
    expect(screen.queryByText('M')).toBeNull();
  });

  it('loads a team’s members on selection and adds a member by email', async () => {
    vi.mocked(api.listTeams).mockResolvedValue([ownedTeam]);
    vi.mocked(api.listMembers)
      .mockResolvedValueOnce([member('me', 'me@example.com', 'owner')])
      .mockResolvedValue([
        member('me', 'me@example.com', 'owner'),
        member('them', 'rider@example.com', 'member'),
      ]);
    vi.mocked(api.addMember).mockResolvedValue({} as never);

    render(<TeamsDialog userId="me" onClose={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /Studio A/ }));
    // The owner sees the member-management form once the team is selected.
    const emailInput = await screen.findByPlaceholderText('Add member by email');

    fireEvent.change(emailInput, { target: { value: 'rider@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(api.addMember).toHaveBeenCalledWith(teamId, 'rider@example.com'));
    expect(await screen.findByText('rider@example.com')).toBeTruthy();
  });
});
