// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Login } from './Login.js';
import * as api from '../lib/api.js';

const authMocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  signInEmail: vi.fn(),
  signInSocial: vi.fn(),
  signUpEmail: vi.fn(),
}));

// The component imports the Better Auth client at module load; stub it so the
// render is side-effect free (these tests only assert label associations).
vi.mock('../lib/auth-client.js', () => ({
  authClient: {
    requestPasswordReset: authMocks.requestPasswordReset,
    signIn: { email: authMocks.signInEmail, social: authMocks.signInSocial },
    signUp: { email: authMocks.signUpEmail },
  },
}));
vi.mock('../lib/api.js');

beforeEach(() => {
  vi.mocked(api.getAuthCapabilities).mockResolvedValue({
    access: { mode: 'invite_only' },
    socialProviders: { apple: false },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Login accessible labels', () => {
  it('honors an explicit sign-up acquisition intent', () => {
    render(<Login initialMode="signup" />);

    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Use your invited email' })).toBeTruthy();
  });

  it('associates a label with the email and password inputs in sign-in mode', () => {
    render(<Login />);
    expect(screen.getByLabelText('Email')).toHaveProperty('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveProperty('type', 'password');
  });

  it('exposes a labeled name field after switching to sign-up', () => {
    render(<Login />);
    // No name field while signing in.
    expect(screen.queryByLabelText('Name')).toBeNull();
    fireEvent.click(screen.getByText('Need an invited account? Sign up'));
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

  it('states when Apple sign-in is unavailable without implying Apple Music state', async () => {
    render(<Login />);
    expect(
      await screen.findByText(
        'Sign in with Apple is not available here. Email sign-in remains available.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
    expect(screen.queryByText(/Apple Music/)).toBeNull();
  });

  it('shows Apple sign-in when the backend capability is enabled', async () => {
    vi.mocked(api.getAuthCapabilities).mockResolvedValue({
      access: { mode: 'invite_only' },
      socialProviders: { apple: true },
    });

    render(<Login />);

    expect(await screen.findByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
  });

  it('states the private-beta boundary and explains invited signup', async () => {
    render(<Login />);

    expect(
      await screen.findByText('Private beta · New accounts require an invitation.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Need an invited account? Sign up'));
    expect(screen.getByRole('heading', { name: 'Use your invited email' })).toBeTruthy();
  });

  it('notifies the app after a successful sign-up', async () => {
    const onSignedUp = vi.fn();
    authMocks.signUpEmail.mockResolvedValue({ error: null });

    render(<Login onSignedUp={onSignedUp} />);
    fireEvent.click(screen.getByText('Need an invited account? Sign up'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Instructor' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'instructor@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(authMocks.signUpEmail).toHaveBeenCalledWith({
        email: 'instructor@example.com',
        password: 'password123',
        name: 'New Instructor',
      }),
    );
    expect(onSignedUp).toHaveBeenCalledOnce();
  });

  it('does not notify the app when sign-up fails', async () => {
    const onSignedUp = vi.fn();
    authMocks.signUpEmail.mockResolvedValue({ error: { message: 'Email already exists' } });

    render(<Login onSignedUp={onSignedUp} />);
    fireEvent.click(screen.getByText('Need an invited account? Sign up'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Instructor' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'instructor@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Email already exists')).toBeTruthy();
    expect(onSignedUp).not.toHaveBeenCalled();
  });

  it('preserves invited-signup intent and focuses the exact invitation failure', async () => {
    authMocks.signUpEmail.mockResolvedValue({
      error: { message: 'Ritmo Studio is currently available by invitation only.' },
    });

    render(<Login initialMode="signup" />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Instructor' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'instructor@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Ritmo Studio is currently available by invitation only.');
    expect(document.activeElement).toBe(alert);
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'New Instructor');
    expect(screen.getByLabelText('Email')).toHaveProperty('value', 'instructor@example.com');
  });

  it('keeps email recovery calm and non-enumerating', async () => {
    authMocks.requestPasswordReset.mockResolvedValue({ error: null });

    render(<Login />);
    fireEvent.click(screen.getByText('Forgot password?'));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'instructor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(
      await screen.findByText('If that email has an account, a reset link is on its way.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Email')).toHaveProperty('value', 'instructor@example.com');
  });

  it('marks Apple availability unverified when the capability check fails', async () => {
    vi.mocked(api.getAuthCapabilities).mockRejectedValue(new Error('network down'));

    render(<Login />);

    expect(
      await screen.findByText(
        'Couldn’t check Sign in with Apple. Email sign-in remains available.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
  });
});
