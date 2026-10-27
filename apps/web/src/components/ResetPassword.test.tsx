// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResetPassword } from './ResetPassword.js';

const resetPassword = vi.hoisted(() => vi.fn());

vi.mock('../lib/auth-client.js', () => ({
  authClient: { resetPassword },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.pushState({}, '', '/');
});

describe('ResetPassword', () => {
  it('explains an expired link and returns directly to sign in', () => {
    window.history.pushState({}, '', '/reset-password?error=INVALID_TOKEN');
    render(<ResetPassword />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'This reset link has expired' }),
    ).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('No password or saved work changed');
    expect(document.activeElement).toBe(alert);
    expect(screen.getByRole('link', { name: 'Back to sign in' }).getAttribute('href')).toBe(
      '/?auth=signin',
    );
  });

  it('drops the new-password heading and guidance when the link has no token', () => {
    window.history.pushState({}, '', '/reset-password');
    render(<ResetPassword />);

    expect(screen.queryByText('Choose a new password')).toBeNull();
    expect(screen.queryByText(/Use at least eight characters/)).toBeNull();
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(
      screen.getByRole('heading', { level: 1, name: 'This reset link has expired' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Back to sign in' })).toHaveLength(1);
  });

  it('keeps the new-password heading and guidance for a valid link', () => {
    window.history.pushState({}, '', '/reset-password?token=test-token');
    render(<ResetPassword />);

    expect(screen.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeTruthy();
    expect(screen.getByText(/Use at least eight characters/)).toBeTruthy();
    expect(screen.queryByText('This reset link has expired')).toBeNull();
    expect(screen.getByLabelText('New password')).toBeTruthy();
  });

  it('blocks mismatched confirmation without calling the auth client', async () => {
    window.history.pushState({}, '', '/reset-password?token=test-token');
    render(<ResetPassword />);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('passwords do not match');
    expect(document.activeElement).toBe(alert);
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('completes reset and states what remained unchanged', async () => {
    window.history.pushState({}, '', '/reset-password?token=test-token');
    resetPassword.mockResolvedValue({ error: null });
    render(<ResetPassword />);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        newPassword: 'password123',
        token: 'test-token',
      }),
    );
    expect(await screen.findByText('Password reset complete')).toBeTruthy();
    expect(screen.getByText(/classes and music connections did not change/i)).toBeTruthy();
  });

  it('preserves both password entries after an API failure', async () => {
    window.history.pushState({}, '', '/reset-password?token=test-token');
    resetPassword.mockResolvedValue({ error: { message: 'Link expired during reset' } });
    render(<ResetPassword />);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    expect(await screen.findByText('Link expired during reset')).toBeTruthy();
    expect(screen.getByLabelText('New password')).toHaveProperty('value', 'password123');
    expect(screen.getByLabelText('Confirm password')).toHaveProperty('value', 'password123');
  });
});
