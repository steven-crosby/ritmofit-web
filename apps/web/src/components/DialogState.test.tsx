// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DialogState } from './DialogState.js';

afterEach(cleanup);

describe('DialogState', () => {
  it('renders state-specific copy with a structured placeholder', () => {
    render(
      <DialogState
        title="Checking provider links"
        description="Reading your Spotify, Apple Music, and SoundCloud connection states."
        placeholder="provider-rows"
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('Checking provider links');
    expect(screen.getByText(/Spotify, Apple Music, and SoundCloud/)).toBeTruthy();
  });

  it('keeps retry as an explicit action', () => {
    const onRetry = vi.fn();
    render(
      <DialogState
        title="Connections did not load"
        description="Provider rows are waiting for a clean refresh."
        placeholder="provider-rows"
        action={
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the skeleton entirely when no placeholder is given (clean empty state)', () => {
    const { container } = render(
      <DialogState
        title="No studio crews yet"
        description="Build a studio crew when classes need shared access."
      />,
    );
    // A genuinely empty state is a clean panel, not fake scaffold rows.
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('never renders literal initials in the team-rows skeleton', () => {
    render(
      <DialogState
        title="Loading team spaces"
        description="Checking crews."
        placeholder="team-rows"
      />,
    );
    expect(screen.queryByText('O')).toBeNull();
    expect(screen.queryByText('M')).toBeNull();
  });
});
