// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { applyServiceWorkerUpdate, SW_UPDATE_RELOAD_KEY } from '../lib/applyServiceWorkerUpdate.js';

vi.mock('../lib/applyServiceWorkerUpdate.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/applyServiceWorkerUpdate.js')>(
    '../lib/applyServiceWorkerUpdate.js',
  );
  return { ...actual, applyServiceWorkerUpdate: vi.fn() };
});

// `useRegisterSW` comes from a Vite virtual module; drive it through a mock so we
// control the needRefresh state and can assert on the two actions.
const updateServiceWorker = vi.fn();
const setNeedRefresh = vi.fn();
let needRefresh = false;
let registerOptions: {
  onNeedRefresh?: () => void;
  onRegisteredSW?: (
    swUrl: string,
    registration: { waiting: unknown; update?: () => Promise<void> } | undefined,
  ) => void;
} = {};

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: typeof registerOptions = {}) => {
    registerOptions = options;
    return {
      needRefresh: [needRefresh, setNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    };
  },
}));

import { UpdatePrompt } from './UpdatePrompt.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  needRefresh = false;
  registerOptions = {};
  sessionStorage.clear();
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

  it('pins the toast to the top, under dialogs, so it cannot cover Import', () => {
    needRefresh = true;
    render(<UpdatePrompt />);
    const prompt = screen.getByTestId('update-prompt');
    expect(prompt.className).toContain('top-0');
    expect(prompt.className).toContain('z-40');
    expect(prompt.className).not.toContain('bottom-0');
    expect(prompt.className).not.toContain('z-[110]');
  });

  it('clears the toast and activates the waiting worker only on Reload now', () => {
    needRefresh = true;
    render(<UpdatePrompt />);
    // Nothing reloads on its own — the update waits for an explicit choice.
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(applyServiceWorkerUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reload now' }));

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(applyServiceWorkerUpdate).toHaveBeenCalledTimes(1);
    const deps = vi.mocked(applyServiceWorkerUpdate).mock.calls[0]?.[0];
    deps?.skipWaiting();
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
  });

  it('drops a prompt that comes back immediately after Reload now', () => {
    sessionStorage.setItem(SW_UPDATE_RELOAD_KEY, String(Date.now()));
    needRefresh = true;
    render(<UpdatePrompt />);
    registerOptions.onNeedRefresh?.();
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(sessionStorage.getItem(SW_UPDATE_RELOAD_KEY)).toBeNull();
  });

  it('clears the handoff flag once the new worker is active', () => {
    vi.useFakeTimers();
    sessionStorage.setItem(SW_UPDATE_RELOAD_KEY, '1');
    needRefresh = true;
    render(<UpdatePrompt />);
    registerOptions.onRegisteredSW?.('/sw.js', { waiting: null, update: vi.fn() });
    expect(sessionStorage.getItem(SW_UPDATE_RELOAD_KEY)).toBeNull();
    vi.clearAllTimers();
  });

  it('dismisses without updating when the instructor chooses Later', () => {
    needRefresh = true;
    render(<UpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(applyServiceWorkerUpdate).not.toHaveBeenCalled();
  });
});
