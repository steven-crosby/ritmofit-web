// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App.js';

// Signed-out session so the root path resolves to MarketingPage (D15), not Dashboard.
// The components import the client at module load.
const sessionState = vi.hoisted(() => ({ data: null, isPending: false }));

vi.mock('./lib/auth-client.js', () => ({
  authClient: { useSession: () => sessionState },
}));

afterEach(() => {
  cleanup();
  sessionState.isPending = false;
  window.history.pushState({}, '', '/');
});

describe('App path routing', () => {
  it('renders a 404 view for an unknown path', () => {
    window.history.pushState({}, '', '/totally-unknown');
    render(<App />);
    expect(screen.getByText(/404 · safe return/i)).toBeTruthy();
    expect(screen.getByText(/does not exist/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to ritmo studio/i }).getAttribute('href')).toBe(
      '/',
    );
  });

  it('renders the app (MarketingPage when signed out) at the root path', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.queryByText(/404 · safe return/i)).toBeNull();
  });

  it('preserves workspace shape while the session is loading', () => {
    sessionState.isPending = true;
    render(<App />);

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Restoring your workspace…' })).toBeTruthy();
    expect(screen.getByText(/Classes, music connections/)).toBeTruthy();
  });

  it('renders the private-beta privacy notice without a session', () => {
    window.history.pushState({}, '', '/privacy');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Privacy without mystery.' })).toBeTruthy();
    expect(screen.getByText(/invite-only, non-commercial beta/i)).toBeTruthy();
  });
});

describe('App acquisition intent', () => {
  it('opens returning instructors in sign-in mode and returns to marketing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.queryByLabelText('Name')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { name: /find the class inside the music/i })).toBeTruthy();
  });

  it('opens prospective instructors in sign-up mode from Start building', () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Start building' })[0]!);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
    expect(screen.getByLabelText('Name')).toBeTruthy();
  });

  it('opens prospective instructors in sign-up mode from Enter private beta', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Enter the private beta' }));
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('uses the reset safe-return query to open sign-in directly', () => {
    window.history.pushState({}, '', '/?auth=signin');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Welcome back, instructor.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
