// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

describe('TimelineStrip — track-start beat snapping (free mode)', () => {
  // Track 1: 120 bpm from 0 (500 ms beats, the reference grid). Track 2: no tempo
  // of its own, dragged from its authored start at 1000.
  const freePayload = () => payload([entry(0, 120), entry(1, null)]);
  const track2 = () => screen.getByRole('slider', { name: /Track 2 start/ });

  it('shows the Snap toggle for track dragging even without marker editing', () => {
    render(<TimelineStrip payload={freePayload()} onMoveTrack={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Snap to beat' })).toBeTruthy();
  });

  it('steps a dragged start by one beat of the preceding grid (arrow keys)', () => {
    render(<TimelineStrip payload={freePayload()} onMoveTrack={vi.fn()} />);
    fireEvent.keyDown(track2(), { key: 'ArrowRight' });
    expect(track2().getAttribute('aria-valuenow')).toBe('1500'); // 1000 → beat 3 of 500 ms
    fireEvent.keyDown(track2(), { key: 'ArrowLeft' });
    expect(track2().getAttribute('aria-valuenow')).toBe('1000');
  });

  it('steps by a whole bar with Shift', () => {
    render(<TimelineStrip payload={freePayload()} onMoveTrack={vi.fn()} />);
    fireEvent.keyDown(track2(), { key: 'ArrowRight', shiftKey: true });
    expect(track2().getAttribute('aria-valuenow')).toBe('3000'); // +4 beats × 500 ms
  });

  it('falls back to 1s nudges when Snap to beat is off', () => {
    render(<TimelineStrip payload={freePayload()} onMoveTrack={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Snap to beat' }));
    fireEvent.keyDown(track2(), { key: 'ArrowRight' });
    expect(track2().getAttribute('aria-valuenow')).toBe('2000');
  });
});
