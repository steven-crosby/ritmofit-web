// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Login } from './Login.js';

// The component imports the Better Auth client at module load; stub it so the
// render is side-effect free (these tests only assert label associations).
vi.mock('../lib/auth-client.js', () => ({ authClient: {} }));

afterEach(cleanup);

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
});
