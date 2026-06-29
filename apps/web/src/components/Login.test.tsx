// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Login } from './Login.js';
import * as api from '../lib/api.js';

// The component imports the Better Auth client at module load; stub it so the
// render is side-effect free (these tests only assert label associations).
vi.mock('../lib/auth-client.js', () => ({
  authClient: {
    signIn: { social: vi.fn() },
  },
}));
vi.mock('../lib/api.js');

beforeEach(() => {
  vi.mocked(api.getAuthCapabilities).mockResolvedValue({
    socialProviders: { apple: false },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Login accessible labels', () => {
  it('associates a label with the email and password inputs in sign-in mode', () => {
    render(<Login />);
    expect(screen.getByLabelText('Email')).toHaveProperty('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveProperty('type', 'password');
  });

  it('exposes a labeled name field after switching to sign-up', () => {
    render(<Login />);
    // No name field while signing in.
    expect(screen.queryByLabelText('Name')).toBeNull();
    fireEvent.click(screen.getByText('Need an account? Sign up'));
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('drops the password field in forgot-password mode but keeps a labeled email', () => {
    render(<Login />);
    fireEvent.click(screen.getByText('Forgot password?'));
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });

  it('hides Apple sign-in when the backend capability is disabled', async () => {
    render(<Login />);
    await waitFor(() => expect(api.getAuthCapabilities).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
  });

  it('shows Apple sign-in when the backend capability is enabled', async () => {
    vi.mocked(api.getAuthCapabilities).mockResolvedValue({
      socialProviders: { apple: true },
    });

    render(<Login />);

    expect(await screen.findByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
  });
});
