// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { LiveTimeline, fractionToMs, keyboardSeekMs } from './LiveTimeline.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('fractionToMs', () => {
  it('maps a fraction to a clamped, whole-ms time', () => {
    expect(fractionToMs(0, 240000)).toBe(0);
    expect(fractionToMs(0.5, 240000)).toBe(120000);
    expect(fractionToMs(1, 240000)).toBe(240000);
  });

  it('clamps out-of-range fractions and rounds', () => {
    expect(fractionToMs(-0.2, 240000)).toBe(0);
    expect(fractionToMs(1.5, 240000)).toBe(240000);
    expect(fractionToMs(0.333, 1000)).toBe(333);
  });

  it('returns 0 for a non-positive total', () => {
    expect(fractionToMs(0.5, 0)).toBe(0);
    expect(fractionToMs(0.5, -10)).toBe(0);
  });
});

describe('keyboardSeekMs', () => {
  const TOTAL = 240000;

  it('nudges by 5s on arrows and jumps by 30s on page keys', () => {
    expect(keyboardSeekMs('ArrowRight', 10000, TOTAL)).toBe(15000);
    expect(keyboardSeekMs('ArrowUp', 10000, TOTAL)).toBe(15000);
    expect(keyboardSeekMs('ArrowLeft', 10000, TOTAL)).toBe(5000);
    expect(keyboardSeekMs('ArrowDown', 10000, TOTAL)).toBe(5000);
    expect(keyboardSeekMs('PageUp', 10000, TOTAL)).toBe(40000);
    expect(keyboardSeekMs('PageDown', 40000, TOTAL)).toBe(10000);
  });

  it('jumps to the ends with Home/End', () => {
    expect(keyboardSeekMs('Home', 120000, TOTAL)).toBe(0);
    expect(keyboardSeekMs('End', 120000, TOTAL)).toBe(TOTAL);
  });

  it('clamps at the bounds', () => {
    expect(keyboardSeekMs('ArrowLeft', 2000, TOTAL)).toBe(0);
    expect(keyboardSeekMs('ArrowRight', TOTAL - 2000, TOTAL)).toBe(TOTAL);
  });

  it('returns null for a non-seek key', () => {
    expect(keyboardSeekMs('Enter', 10000, TOTAL)).toBeNull();
    expect(keyboardSeekMs('a', 10000, TOTAL)).toBeNull();
  });
});

type Cue = RunPayloadTrackEntry['cues'][number];
type Move = RunPayloadTrackEntry['moves'][number];

function entry(position: number, durationMs: number | null, cues: Cue[] = [], moves: Move[] = []) {
  return {
    classTrackId: `00000000-0000-4000-8000-00000000000${position}`,
    position,
    displayBpm: null,
    intensity: 'mod',
    startOffsetMs: null,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: `10000000-0000-4000-8000-00000000000${position}`,
      title: `Track ${position}`,
      artist: 'Tester',
      durationMs,
      albumArtUrl: null,
    },
    providerRefs: [],
    cues,
    moves,
  } satisfies RunPayloadTrackEntry;
}

const cue = (anchorMs: number): Cue =>
  ({ id: `cue-${anchorMs}`, anchorMs, beat: null, bar: null, text: 'Cue', color: null }) as Cue;
const move = (anchorMs: number): Move =>
  ({ id: `move-${anchorMs}`, anchorMs, name: 'Move', intensity: 'hard' }) as Move;

// Two 120s tracks → 240s total; a cue on track 0 and a move on track 1.
function makePayload(): RunPayload {
  return {
    schemaVersion: 1,
    class: {
      id: '00000000-0000-4000-8000-0000000000aa',
      title: 'Scrub Ride',
      template: 'cycle',
      targetDurationMs: null,
      timelineMode: 'sequential',
      totalDurationMs: 240000,
    },
    tracks: [entry(0, 120000, [cue(60000)]), entry(1, 120000, [], [move(60000)])],
    sections: [],
  } satisfies RunPayload;
}

/** Force a measurable box so the pointer→time math has a real rect under jsdom. */
function stubRect(width: number, left = 0) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    left,
    right: left + width,
    top: 0,
    bottom: 40,
    height: 40,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('LiveTimeline', () => {
  it('exposes an accessible slider over the whole class', () => {
    render(<LiveTimeline payload={makePayload()} elapsedMs={60000} onSeek={() => {}} />);
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('240000');
    expect(slider.getAttribute('aria-valuenow')).toBe('60000');
    expect(slider.getAttribute('aria-valuetext')).toBe('1:00 of 4:00');
  });

  it('renders a marker per cue and move', () => {
    render(<LiveTimeline payload={makePayload()} elapsedMs={0} onSeek={() => {}} />);
    const slider = screen.getByRole('slider');
    const glyphs = slider.querySelectorAll('span[aria-hidden]');
    const markerText = Array.from(glyphs).map((g) => g.textContent);
    expect(markerText.filter((t) => t === '▲')).toHaveLength(1);
    expect(markerText.filter((t) => t === '◆')).toHaveLength(1);
  });

  it('renders nothing when no track has a usable duration', () => {
    const payload = makePayload();
    payload.tracks = [entry(0, null)];
    payload.class.totalDurationMs = 0;
    const { container } = render(
      <LiveTimeline payload={payload} elapsedMs={0} onSeek={() => {}} />,
    );
    expect(container.querySelector('[role="slider"]')).toBeNull();
  });

  it('seeks to the clicked position', () => {
    const onSeek = vi.fn();
    stubRect(240);
    render(<LiveTimeline payload={makePayload()} elapsedMs={0} onSeek={onSeek} />);
    fireEvent.pointerDown(screen.getByRole('slider'), { clientX: 120, pointerId: 1 });
    expect(onSeek).toHaveBeenCalledWith(120000); // 50% of 240000
  });

  it('drag-seeks only while a pointer button is held', () => {
    const onSeek = vi.fn();
    stubRect(240);
    render(<LiveTimeline payload={makePayload()} elapsedMs={0} onSeek={onSeek} />);
    const slider = screen.getByRole('slider');
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 0 });
    expect(onSeek).not.toHaveBeenCalled();
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 1 });
    expect(onSeek).toHaveBeenCalledWith(60000); // 25% of 240000
  });

  it('seeks with the keyboard', () => {
    const onSeek = vi.fn();
    render(<LiveTimeline payload={makePayload()} elapsedMs={10000} onSeek={onSeek} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenCalledWith(15000);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onSeek).toHaveBeenCalledWith(240000);
  });
});
