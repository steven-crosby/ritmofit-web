// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from './App.js';

// Signed-out session so the root path resolves to MarketingPage (D15), not Dashboard.
// The components import the client at module load.
vi.mock('./lib/auth-client.js', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}));

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('App path routing', () => {
  it('renders a 404 view for an unknown path', () => {
    window.history.pushState({}, '', '/totally-unknown');
    render(<App />);
    expect(screen.getByText('404')).toBeTruthy();
    expect(screen.getByText(/doesn’t exist/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to ritmo studio/i }).getAttribute('href')).toBe(
      '/',
    );
  });

  it('renders the app (MarketingPage when signed out) at the root path', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.queryByText('404')).toBeNull();
  });

  it('renders the private-beta privacy notice without a session', () => {
    window.history.pushState({}, '', '/privacy');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Privacy and data notice' })).toBeTruthy();
    expect(screen.getByText(/invite-only, non-commercial beta/i)).toBeTruthy();
  });
});
