// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RunPayload } from '@ritmofit/shared';
import { ClassPulse } from './ClassPulse.js';

afterEach(cleanup);

function payload(): RunPayload {
  return {
    class: { totalDurationMs: 180_000 },
    tracks: [
      {
        classTrackId: 'one',
        position: 0,
        intensity: 'easy',
        track: { durationMs: 60_000 },
      },
      {
        classTrackId: 'two',
        position: 1,
        intensity: 'none',
        track: { durationMs: 120_000 },
      },
    ],
  } as unknown as RunPayload;
}

describe('ClassPulse', () => {
  it('names its derivation and describes sparse effort without color', () => {
    render(<ClassPulse payload={payload()} />);
    expect(screen.getByText(/derived · confirm/i)).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('unscored');
    expect(screen.getByText(/1 unscored effort/i)).toBeTruthy();
  });

  it('offers explicit, controlled, presentational confirmation', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ClassPulse payload={payload()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /derived · confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(<ClassPulse payload={payload()} confirmed onConfirm={onConfirm} />);
    expect(
      screen.getByRole('button', { name: /confirmed for this view/i }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('renders a truthful empty state without an image-shaped fake', () => {
    const empty = { ...payload(), tracks: [] } as RunPayload;
    render(<ClassPulse payload={empty} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getAllByText(/Add tracks to derive/i).length).toBeGreaterThan(0);
  });
});
