// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

let needRefresh = true;
let appThrows = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

vi.mock('./App', () => ({
  App: () => {
    if (appThrows) throw new Error('old shell cannot read the new API');
    return <p>app</p>;
  },
}));

import { Root } from './Root.js';

afterEach(() => {
  cleanup();
  needRefresh = true;
  appThrows = false;
  vi.restoreAllMocks();
});

describe('Root', () => {
  it('renders the app and the update toast together', () => {
    render(<Root />);
    expect(screen.getByText('app')).toBeTruthy();
    expect(screen.getByTestId('update-prompt')).toBeTruthy();
  });

  it('keeps the update toast when the app crashes, so a stale shell can reach the new build', () => {
    appThrows = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Root />);
    expect(screen.getByRole('alert').textContent).toContain('This view lost the beat.');
    expect(screen.getByTestId('update-prompt')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload now' })).toBeTruthy();
  });
});
