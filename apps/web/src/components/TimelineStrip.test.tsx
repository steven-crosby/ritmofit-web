// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { RunPayload } from '@ritmofit/shared';
import { TimelineStrip } from './TimelineStrip.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Entry = RunPayload['tracks'][number];

/** A minimal run-payload track entry; only the fields the strip reads matter. */
function entry(position: number, displayBpm: number | null): Entry {
  return {
    classTrackId: `00000000-0000-0000-0000-00000000000${position}`,
    position,
    displayBpm,
    displayRpm: null,
    holdCount: null,
    intensity: 'mod',
    startOffsetMs: position * 1000,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: `10000000-0000-0000-0000-00000000000${position}`,
      title: `Track ${position}`,
      artist: 'Tester',
      durationMs: 1000,
      albumArtUrl: null,
    },
    providerRefs: [],
    cues: [],
    moves: [],
  } as Entry;
}

function payload(tracks: Entry[], totalDurationMs = tracks.length * 1000): RunPayload {
  return { class: { totalDurationMs }, tracks } as unknown as RunPayload;
}

const ID0 = '00000000-0000-0000-0000-000000000000';

describe('TimelineStrip — planning tempo pulse', () => {
  it('pulses the selected track block at its BPM (design system 10 §2)', () => {
    render(
      <TimelineStrip
        payload={payload([entry(0, 128), entry(1, 124)])}
        selectedTrackId={ID0}
        onSelectTrack={() => {}}
      />,
    );
    const selected = screen.getByRole('button', { name: 'Select track 1' });
    expect(selected.className).toContain('rf-beat-pulse-subtle');
    // The block carries its own tempo so the keyframe retimes per track.
    expect(selected.style.getPropertyValue('--rf-bpm')).toBe('128');
  });

  it('does not pulse non-selected blocks (exactly one pulse on screen)', () => {
    render(
      <TimelineStrip
        payload={payload([entry(0, 128), entry(1, 124)])}
        selectedTrackId={ID0}
        onSelectTrack={() => {}}
      />,
    );
    const other = screen.getByRole('button', { name: 'Select track 2' });
    expect(other.className).not.toContain('rf-beat-pulse-subtle');
    expect(other.style.getPropertyValue('--rf-bpm')).toBe('');
  });

  it('keeps the selection ring but adds no pulse when the tempo is unknown', () => {
    render(
      <TimelineStrip
        payload={payload([entry(0, null), entry(1, 124)])}
        selectedTrackId={ID0}
        onSelectTrack={() => {}}
      />,
    );
    const selected = screen.getByRole('button', { name: 'Select track 1' });
    expect(selected.className).toContain('ring-interactive'); // still marked active
    expect(selected.className).not.toContain('rf-beat-pulse-subtle'); // no beat to ride
  });

  it('does not pulse when no track is selected', () => {
    render(
      <TimelineStrip payload={payload([entry(0, 128), entry(1, 124)])} onSelectTrack={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Select track 1' }).className).not.toContain(
      'rf-beat-pulse-subtle',
    );
  });
});
