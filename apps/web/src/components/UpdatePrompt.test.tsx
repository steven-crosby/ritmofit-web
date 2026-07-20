// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// `useRegisterSW` comes from a Vite virtual module; drive it through a mock so we
// control the needRefresh state and can assert on the two actions.
const updateServiceWorker = vi.fn();
const setNeedRefresh = vi.fn();
let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

import { UpdatePrompt } from './UpdatePrompt.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  needRefresh = false;
});

describe('UpdatePrompt', () => {
  it('renders nothing until a new version is ready', () => {
    needRefresh = false;
    const { container } = render(<UpdatePrompt />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('surfaces a polite status toast when an update is ready', () => {
    needRefresh = true;
    render(<UpdatePrompt />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toMatch(/fresh build/i);
    expect(status.textContent).toMatch(/does not change saved classes/i);
  });

  it('activates the waiting worker only when the instructor chooses Reload now', () => {
    needRefresh = true;
    render(<UpdatePrompt />);
    // Nothing reloads on its own — the update waits for an explicit choice.
    expect(updateServiceWorker).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reload now' }));
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
  });

  it('dismisses without updating when the instructor chooses Later', () => {
    needRefresh = true;
    render(<UpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
