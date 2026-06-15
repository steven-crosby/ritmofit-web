// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from './App.js';

// Signed-out session so the root path resolves to Login (not Dashboard, which
// pulls in the whole builder). The components import the client at module load.
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
    expect(screen.getByRole('link', { name: /back to ritmofit/i }).getAttribute('href')).toBe('/');
  });

  it('renders the app (Login when signed out) at the root path', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.queryByText('404')).toBeNull();
  });
});
