// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { RunPayload } from '@ritmofit/shared';
import { ClassPulse, ClassPulseView } from './ClassPulse.js';
import { classPulseFromPayload } from '../lib/class-pulse.js';

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

/** Every track on one effort and no scored moves — the auto-shaped case. */
function unshapedPayload(): RunPayload {
  return {
    class: { totalDurationMs: 360_000 },
    tracks: Array.from({ length: 6 }, (_, index) => ({
      classTrackId: `t${index}`,
      position: index,
      intensity: 'hard',
      track: { durationMs: 60_000 },
    })),
  } as unknown as RunPayload;
}

describe('ClassPulse', () => {
  it('names its derivation and describes sparse effort without color', () => {
    render(<ClassPulse payload={payload()} />);
    expect(screen.getByText(/from track efforts/i)).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('unscored');
    expect(screen.getByText(/1 unscored effort/i)).toBeTruthy();
  });

  it('explains the picture: axes in words, a time axis, and a colour key', () => {
    render(<ClassPulse payload={payload()} />);
    expect(
      screen.getByText(/each block is a track — wider is longer, taller is harder/i),
    ).toBeTruthy();
    expect(screen.getByText(/0:00 start/i)).toBeTruthy();
    expect(screen.getByText(/3:00 finish/i)).toBeTruthy();
    expect(screen.getByText(/z1 build/i)).toBeTruthy();
    expect(screen.getByText(/hatched = effort not set yet/i)).toBeTruthy();
  });

  it('drops the time axis when the caller cannot supply a runtime', () => {
    // `ClassPulseView` also renders on the marketing page from a bare model, and
    // an axis whose end is the word "finish" labels nothing.
    render(<ClassPulseView model={classPulseFromPayload(payload())} />);
    expect(screen.queryByText(/0:00 start/i)).toBeNull();
    expect(screen.queryByText('finish', { exact: true })).toBeNull();
    expect(screen.getByText(/z1 build/i)).toBeTruthy();
  });

  it('states where the shape came from, and offers no control that does nothing', () => {
    // The old "derived · confirm" pill only relabelled itself for the session —
    // no persistence, no effect. A guessed shape is a state, not a decision.
    const { rerender } = render(<ClassPulse payload={unshapedPayload()} />);
    expect(screen.getByText('◇ auto-shaped')).toBeTruthy();
    expect(screen.getByText(/set a track’s intensity to refine/i)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<ClassPulse payload={payload()} />);
    expect(screen.getByText(/from track efforts/i)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
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
    render(<ClassPulse payload={unshapedPayload()} />);
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
