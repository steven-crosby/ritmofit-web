// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App.js';
import { resetSessionGuardForTests, setLiveActive, signOutByUser } from './lib/session-guard.js';

// Signed-out session so the root path resolves to MarketingPage (D15), not Dashboard.
// The components import the client at module load.
const sessionState = vi.hoisted(() => ({
  data: null as null | { user: { id: string; name: string; email: string } },
  isPending: false,
}));

vi.mock('./lib/auth-client.js', () => ({
  authClient: { useSession: () => sessionState, signOut: vi.fn(async () => undefined) },
}));

// The real Dashboard needs the whole API; the gate only cares that it stays mounted.
const dashboardMounts = vi.hoisted(() => ({ count: 0 }));
vi.mock('./components/Dashboard.js', async () => {
  const { useEffect } = await import('react');
  return {
    Dashboard: ({ sessionLost }: { sessionLost?: boolean }) => {
      useEffect(() => {
        dashboardMounts.count += 1;
      }, []);
      return (
        <div data-testid="dashboard">
          Live running{sessionLost ? ' · Signed out. Finish the class, then sign in.' : ''}
        </div>
      );
    },
  };
});

afterEach(() => {
  cleanup();
  sessionState.data = null;
  sessionState.isPending = false;
  dashboardMounts.count = 0;
  resetSessionGuardForTests();
  window.history.pushState({}, '', '/');
});

const signedIn = { user: { id: 'u1', name: 'Steven', email: 's@example.test' } };

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

describe('App session loss', () => {
  it('keeps Live mounted when the session ends mid-class, then opens Sign in after End Class', () => {
    sessionState.data = signedIn;
    const view = render(<App />);
    act(() => setLiveActive(true));

    sessionState.data = null;
    view.rerender(<App />);
    expect(screen.getByTestId('dashboard').textContent).toContain(
      'Signed out. Finish the class, then sign in.',
    );
    expect(dashboardMounts.count).toBe(1);

    act(() => setLiveActive(false));
    expect(screen.queryByTestId('dashboard')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Your session ended. Sign in to continue.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /find the class inside the music/i })).toBeNull();
  });

  it('opens Sign in with the ended message when the session is lost outside Live', () => {
    sessionState.data = signedIn;
    const view = render(<App />);

    sessionState.data = null;
    view.rerender(<App />);
    expect(screen.getByText('Your session ended. Sign in to continue.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { name: /find the class inside the music/i })).toBeTruthy();
  });

  it('lands an explicit Sign out on the marketing page', async () => {
    sessionState.data = signedIn;
    const view = render(<App />);

    await signOutByUser();
    sessionState.data = null;
    view.rerender(<App />);
    expect(screen.getByRole('heading', { name: /find the class inside the music/i })).toBeTruthy();
    expect(screen.queryByText('Your session ended. Sign in to continue.')).toBeNull();
  });

  it('keeps Live mounted while a focus refetch is pending', () => {
    sessionState.data = signedIn;
    const view = render(<App />);
    act(() => setLiveActive(true));

    sessionState.data = null;
    sessionState.isPending = true;
    view.rerender(<App />);
    expect(screen.getByTestId('dashboard')).toBeTruthy();
    expect(dashboardMounts.count).toBe(1);
  });
});
