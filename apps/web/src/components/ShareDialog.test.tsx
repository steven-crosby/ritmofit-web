// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ShareView } from '@ritmofit/shared';
import { ShareDialog } from './ShareDialog.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

const classId = '00000000-0000-4000-8000-000000000010';

function emailShare(email: string): ShareView {
  return {
    id: '00000000-0000-4000-8000-000000000020',
    resourceType: 'class',
    resourceId: classId,
    sharedByUserId: 'me',
    targetUserId: 'them',
    targetTeamId: null,
    permission: 'view',
    targetEmail: email,
    targetDisplayName: null,
    targetTeamName: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ShareDialog', () => {
  it('shows the empty state when a class is not shared with anyone', async () => {
    vi.mocked(api.listShares).mockResolvedValue([]);
    vi.mocked(api.listTeams).mockResolvedValue([]);

    render(<ShareDialog classId={classId} classTitle="Sunset climb" onClose={() => {}} />);

    expect(await screen.findByText('Not shared with anyone yet.')).toBeTruthy();
  });

  it('shares by email and lists the new grant after refresh', async () => {
    vi.mocked(api.listTeams).mockResolvedValue([]);
    vi.mocked(api.listShares)
      .mockResolvedValueOnce([])
      .mockResolvedValue([emailShare('rider@example.com')]);
    vi.mocked(api.createShare).mockResolvedValue({} as never);

    render(<ShareDialog classId={classId} classTitle="Sunset climb" onClose={() => {}} />);
    await screen.findByText('Not shared with anyone yet.');

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'rider@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() =>
      expect(api.createShare).toHaveBeenCalledWith({
        resourceType: 'class',
        resourceId: classId,
        targetEmail: 'rider@example.com',
        permission: 'view',
      }),
    );
    expect(await screen.findByText('rider@example.com')).toBeTruthy();
  });
});
