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
    // Regression (P0-08): the invitation was rendered from two call sites, so an
    // empty pulse said the same sentence twice on CLS-01, CLS-03 and CLS-04.
    // "At least one" is what let that ship — assert the exact count.
    expect(screen.getAllByText(/Add tracks to derive/i)).toHaveLength(1);
  });

  it('does not draw uniform bars when every track shares one effort (P0-07)', () => {
    // Six equal-length tracks, all "hard" — the Tuesday 6AM case. Canon
    // (10-rhythm-system §4) forbids the flat slab this used to draw.
    const flat = {
      ...payload(),
      tracks: Array.from({ length: 6 }, (_, index) => ({
        classTrackId: `t${index}`,
        position: index,
        intensity: 'hard',
        track: { durationMs: 60_000 },
      })),
    } as unknown as RunPayload;

    render(<ClassPulse payload={flat} />);
    const heights = Array.from(document.querySelectorAll('rect')).map((r) =>
      Number(r.getAttribute('height')),
    );
    expect(heights.length).toBe(6);
    expect(new Set(heights).size).toBeGreaterThan(1);
    // ...and the shape says it is an assumption, not stored data.
    expect(screen.getByText(/auto-shaped from track order and length/i)).toBeTruthy();
  });

  it('keeps unscored tracks hatched even while deriving their height', () => {
    // An entirely unscored class still gets a shape, but nothing may imply the
    // instructor scored it: fill stays the hatch pattern, height comes from order.
    const unscored = {
      ...payload(),
      tracks: Array.from({ length: 5 }, (_, index) => ({
        classTrackId: `u${index}`,
        position: index,
        intensity: 'none',
        track: { durationMs: 60_000 },
      })),
    } as unknown as RunPayload;

    render(<ClassPulse payload={unscored} />);
    const rects = Array.from(document.querySelectorAll('rect'));
    expect(rects.every((r) => r.getAttribute('fill')?.startsWith('url(#'))).toBe(true);
    expect(new Set(rects.map((r) => r.getAttribute('height'))).size).toBeGreaterThan(1);
  });
});
