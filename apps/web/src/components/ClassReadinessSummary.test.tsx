// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { ClassReadinessSummary } from './ClassReadinessSummary.js';
import { classReadiness } from '../lib/readiness.js';

afterEach(cleanup);

type EntryOverride = Partial<Omit<RunPayloadTrackEntry, 'track'>> & {
  track?: { title?: string; durationMs?: number | null };
};

function entry(over: EntryOverride = {}): RunPayloadTrackEntry {
  return {
    classTrackId: over.classTrackId ?? 'ct-1',
    displayBpm: over.displayBpm ?? null,
    cues: over.cues ?? [],
    moves: over.moves ?? [],
    providerRefs: over.providerRefs ?? [],
    track: {
      title: over.track?.title ?? 'Track',
      durationMs: over.track && 'durationMs' in over.track ? over.track.durationMs : 180000,
    },
  } as unknown as RunPayloadTrackEntry;
}
const payload = (...tracks: RunPayloadTrackEntry[]): RunPayload => ({ tracks }) as RunPayload;

describe('ClassReadinessSummary', () => {
  it('reads as ready to run when every dimension is set', () => {
    const readiness = classReadiness(
      payload(
        entry({
          displayBpm: 128,
          cues: [{ id: 'c' }] as RunPayloadTrackEntry['cues'],
          providerRefs: [{ provider: 'soundcloud' }] as RunPayloadTrackEntry['providerRefs'],
        }),
      ),
    );
    render(<ClassReadinessSummary readiness={readiness} canEdit onSelectTrack={() => {}} />);
    expect(screen.getByText(/ready to run live/i)).toBeTruthy();
    expect(screen.getByText(/durations set/i)).toBeTruthy();
    // No fix chips when nothing needs attention.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('surfaces soft gaps without blocking, and jumps to a flagged track', () => {
    const onSelectTrack = vi.fn();
    // Duration set (runnable) but no BPM / cues / provider link.
    const readiness = classReadiness(
      payload(entry({ classTrackId: 'ct-9', track: { title: 'Solo', durationMs: 200000 } })),
    );
    render(<ClassReadinessSummary readiness={readiness} canEdit onSelectTrack={onSelectTrack} />);

    expect(screen.getByText(/runnable · 3 to finish/i)).toBeTruthy();
    expect(screen.getByText(/tempo missing — pulse off/i)).toBeTruthy();
    expect(screen.getByText(/no music linked — prompter only/i)).toBeTruthy();
    expect(screen.queryByText(/blocks live/i)).toBeNull();

    // The tempo + music dimensions both flag this track — clicking a chip selects it.
    fireEvent.click(screen.getAllByRole('button', { name: 'Solo' })[0]!);
    expect(onSelectTrack).toHaveBeenCalledWith('ct-9');
  });

  it('hides fix chips from viewers who cannot edit', () => {
    const readiness = classReadiness(
      payload(entry({ track: { title: 'Solo', durationMs: null } })),
    );
    render(
      <ClassReadinessSummary readiness={readiness} canEdit={false} onSelectTrack={() => {}} />,
    );
    expect(screen.getByText(/duration needed/i)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
