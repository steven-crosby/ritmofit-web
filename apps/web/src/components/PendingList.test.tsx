// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PendingList } from './PendingList.js';

afterEach(() => {
  cleanup();
});

describe('PendingList', () => {
  it('shows "Loading…" while the fetch is genuinely pending (no error yet)', () => {
    render(<PendingList error={null} onRetry={() => {}} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('offers a retry instead of perpetual loading once the load has failed', () => {
    const onRetry = vi.fn();
    render(<PendingList error="Network error" onRetry={onRetry} />);
    // The misleading "Loading…" must be gone — the error no longer masquerades as pending.
    expect(screen.queryByText('Loading…')).toBeNull();
    const retry = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
