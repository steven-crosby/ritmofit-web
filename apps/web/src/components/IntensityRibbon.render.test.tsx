// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Intensity, RunPayload } from '@ritmofit/shared';
import { IntensityRibbon } from './IntensityRibbon.js';

afterEach(cleanup);

type T = { intensity: Intensity; durationMs: number | null; startOffsetMs: number };

/** Minimal payload — only the fields the ribbon reads (class total + per-track geometry). */
function payload(totalDurationMs: number, ...tracks: T[]): RunPayload {
  return {
    class: { totalDurationMs },
    tracks: tracks.map((t, i) => ({
      classTrackId: `ct-${i}`,
      intensity: t.intensity,
      startOffsetMs: t.startOffsetMs,
      track: { title: `Track ${i}`, durationMs: t.durationMs },
    })),
  } as unknown as RunPayload;
}

describe('IntensityRibbon — alive-at-rest provisional marking', () => {
  it('marks an unshaped class (every track one zone) with the auto-shape badge', () => {
    render(
      <IntensityRibbon
        payload={payload(
          360000,
          { intensity: 'mod', durationMs: 180000, startOffsetMs: 0 },
          { intensity: 'mod', durationMs: 180000, startOffsetMs: 180000 },
        )}
      />,
    );
    expect(screen.getByText('auto shape')).toBeTruthy();
    // The provisional state is also announced for non-visual readers.
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('auto-shaped');
  });

  it('drops the badge once intensity is differentiated (authored shape wins)', () => {
    render(
      <IntensityRibbon
        payload={payload(
          360000,
          { intensity: 'easy', durationMs: 180000, startOffsetMs: 0 },
          { intensity: 'hard', durationMs: 180000, startOffsetMs: 180000 },
        )}
      />,
    );
    expect(screen.queryByText('auto shape')).toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).not.toContain('auto-shaped');
  });

  it('shows no badge for a single track (one track cannot form a derived arc)', () => {
    render(
      <IntensityRibbon
        payload={payload(180000, { intensity: 'mod', durationMs: 180000, startOffsetMs: 0 })}
      />,
    );
    expect(screen.queryByText('auto shape')).toBeNull();
  });
});
