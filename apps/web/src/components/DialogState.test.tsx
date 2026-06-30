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
});
