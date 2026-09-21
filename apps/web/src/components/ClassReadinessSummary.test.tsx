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
    expect(screen.getByText(/class shape ready · take it live/i)).toBeTruthy();
    expect(screen.getByText(/durations set/i)).toBeTruthy();
    // No fix chips when nothing needs attention.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('leads with the planning next step instead of Can run live', () => {
    const readiness = classReadiness(
      payload(entry({ classTrackId: 'ct-9', track: { title: 'Solo', durationMs: 200000 } })),
    );
    render(
      <ClassReadinessSummary
        readiness={readiness}
        canEdit
        planLead="4 blocks still need music"
        onSelectTrack={() => {}}
      />,
    );
    expect(screen.getByText('4 blocks still need music')).toBeTruthy();
    expect(screen.queryByText(/can run live/i)).toBeNull();
    expect(screen.getByText(/no bpm set/i)).toBeTruthy();
  });

  it('surfaces soft gaps without blocking, and jumps to a flagged track', () => {
    const onSelectTrack = vi.fn();
    // Duration set (runnable) but no BPM / cues / provider link.
    const readiness = classReadiness(
      payload(entry({ classTrackId: 'ct-9', track: { title: 'Solo', durationMs: 200000 } })),
    );
    render(<ClassReadinessSummary readiness={readiness} canEdit onSelectTrack={onSelectTrack} />);

    expect(screen.getByText(/can run live · 3 things left/i)).toBeTruthy();
    expect(screen.getByText(/no bpm set/i)).toBeTruthy();
    expect(screen.getByText(/no music linked/i)).toBeTruthy();
    expect(screen.queryByText(/blocks live/i)).toBeNull();
    // The panel names what it is checking before it lists states.
    expect(screen.getByText(/what live needs from this class/i)).toBeTruthy();

    // Chips carry an action-bearing accessible name (distinct from the track row,
    // and telling a screen-reader user what the chip does). Tempo and music both
    // flag this track — the lead-in names the job so the same title is two acts.
    expect(screen.getByText(/open to add bpm:/i)).toBeTruthy();
    expect(screen.getByText(/open to link music:/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fix BPM on Solo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fix music on Solo' })).toBeTruthy();

    // The tempo + music dimensions both flag this track — clicking a chip selects it.
    fireEvent.click(screen.getAllByRole('button', { name: /Solo/ })[0]!);
    expect(onSelectTrack).toHaveBeenCalledWith('ct-9');
  });

  it('expands the compact chip overflow instead of printing a dead count', () => {
    const readiness = classReadiness(
      payload(
        entry({ classTrackId: 'ct-1', track: { title: 'One', durationMs: 200000 } }),
        entry({ classTrackId: 'ct-2', track: { title: 'Two', durationMs: 200000 } }),
        entry({ classTrackId: 'ct-3', track: { title: 'Three', durationMs: 200000 } }),
      ),
    );
    render(
      <ClassReadinessSummary readiness={readiness} canEdit compact onSelectTrack={() => {}} />,
    );

    // Compact shows two chips per dimension; the rest sit behind a real control.
    expect(screen.queryByRole('button', { name: 'Fix BPM on Three' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /show 1 more track to fix bpm/i })[0]!);
    expect(screen.getByRole('button', { name: 'Fix BPM on Three' })).toBeTruthy();
  });

  it('offers a first-cue action when choreography is the gap', () => {
    const onStartChoreography = vi.fn();
    const readiness = classReadiness(
      payload(entry({ track: { title: 'Opener', durationMs: 200000 } })),
    );
    render(
      <ClassReadinessSummary
        readiness={readiness}
        canEdit
        onSelectTrack={() => {}}
        onStartChoreography={onStartChoreography}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Write the first cue' }));
    expect(onStartChoreography).toHaveBeenCalledTimes(1);
  });

  it('hides the first-cue action from viewers who cannot edit', () => {
    const readiness = classReadiness(
      payload(entry({ track: { title: 'Opener', durationMs: 200000 } })),
    );
    render(
      <ClassReadinessSummary
        readiness={readiness}
        canEdit={false}
        onSelectTrack={() => {}}
        onStartChoreography={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Write the first cue' })).toBeNull();
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
