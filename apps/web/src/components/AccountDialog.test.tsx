// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@ritmofit/shared';
import { AccountDialog } from './AccountDialog.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');
vi.mock('../lib/auth-client.js', () => ({
  authClient: { signOut: vi.fn() },
}));

const user = {
  id: 'user_1',
  email: 'coach@example.com',
  displayName: 'Coach One',
  imageUrl: null,
  createdAt: 1,
  updatedAt: 1,
} satisfies User;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccountDialog', () => {
  it('loads the caller profile and saves editable fields', async () => {
    vi.mocked(api.getMe).mockResolvedValue(user);
    vi.mocked(api.updateMe).mockResolvedValue({
      ...user,
      displayName: 'Coach Two',
      imageUrl: 'https://example.com/me.jpg',
      updatedAt: 2,
    });
    const onProfileUpdated = vi.fn();

    render(<AccountDialog onClose={() => {}} onProfileUpdated={onProfileUpdated} />);

    const name = await screen.findByLabelText('Display name');
    fireEvent.change(name, { target: { value: 'Coach Two' } });
    fireEvent.change(screen.getByLabelText('Profile image URL'), {
      target: { value: 'https://example.com/me.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(api.updateMe).toHaveBeenCalledWith({
        displayName: 'Coach Two',
        imageUrl: 'https://example.com/me.jpg',
      }),
    );
    expect(await screen.findByText('Profile updated.')).toBeTruthy();
    expect(onProfileUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Coach Two' }),
    );
  });

  it('normalizes blank optional fields to null', async () => {
    vi.mocked(api.getMe).mockResolvedValue(user);
    vi.mocked(api.updateMe).mockResolvedValue({ ...user, displayName: null, imageUrl: null });

    render(<AccountDialog onClose={() => {}} />);

    fireEvent.change(await screen.findByLabelText('Display name'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Profile image URL'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(api.updateMe).toHaveBeenCalledWith({ displayName: null, imageUrl: null }),
    );
  });
});
