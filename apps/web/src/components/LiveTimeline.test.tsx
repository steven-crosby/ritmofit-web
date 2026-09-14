// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import type { ClockStore } from '../lib/use-virtual-clock.js';
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
    displayRpm: null,
    holdCount: null,
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

/**
 * A stateful `ClockStore` a test can drive directly, wired the same way
 * `LiveMode` wires the real one: `onSeekPreview` pushes into the store so
 * `LiveTimeline`'s own read of the current position (via `useSyncExternalStore`)
 * — used for the pointer-up/cancel commit — reflects the last previewed spot,
 * without needing to render all of `LiveMode` around it.
 */
function makeTestClock(initial: number) {
  let value = initial;
  const listeners = new Set<() => void>();
  const store: ClockStore = {
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    getSnapshot: () => value,
  };
  const setValue = (ms: number) => {
    value = ms;
    listeners.forEach((listener) => listener());
  };
  return { store, setValue };
}

describe('LiveTimeline', () => {
  it('exposes an accessible slider over the whole class', () => {
    const clock = makeTestClock(60000);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={() => {}}
        onSeekCommit={() => {}}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Seek class timeline' });
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('240000');
    expect(slider.getAttribute('aria-valuenow')).toBe('60000');
    expect(slider.getAttribute('aria-valuetext')).toBe('1:00 of 4:00');
    expect(slider.className).toContain('h-11');
    expect(slider.className).toContain('w-full');
    expect(slider.className).toContain('min-w-0');
  });

  it('renders a marker per cue and move', () => {
    const clock = makeTestClock(0);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={() => {}}
        onSeekCommit={() => {}}
      />,
    );
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
    const clock = makeTestClock(0);
    const { container } = render(
      <LiveTimeline
        payload={payload}
        clock={clock.store}
        onSeekPreview={() => {}}
        onSeekCommit={() => {}}
      />,
    );
    expect(container.querySelector('[role="slider"]')).toBeNull();
  });

  it('previews on every pointer move without committing', () => {
    const clock = makeTestClock(0);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    const onSeekCommit = vi.fn();
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={onSeekCommit}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    expect(onSeekPreview).toHaveBeenCalledWith(60000); // 25% of 240000
    fireEvent.pointerMove(slider, { clientX: 120, buttons: 1 });
    fireEvent.pointerMove(slider, { clientX: 180, buttons: 1 });
    expect(onSeekPreview).toHaveBeenCalledTimes(3);
    expect(onSeekPreview).toHaveBeenLastCalledWith(180000); // 75%
    // The provider seek path is never called by the timeline itself during a
    // drag — coalescing/throttling that call is the host's job (SPC-16).
    expect(onSeekCommit).not.toHaveBeenCalled();
  });

  it('drag-previews only while a pointer button is held', () => {
    const clock = makeTestClock(0);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={() => {}}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 0 });
    expect(onSeekPreview).not.toHaveBeenCalled();
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 1 });
    expect(onSeekPreview).toHaveBeenCalledWith(60000); // 25% of 240000
  });

  it('commits the final previewed position on pointer up', () => {
    const clock = makeTestClock(0);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    const onSeekCommit = vi.fn();
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={onSeekCommit}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 180, buttons: 1 });
    expect(onSeekCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(onSeekCommit).toHaveBeenCalledTimes(1);
    expect(onSeekCommit).toHaveBeenCalledWith(180000); // 75% of 240000, the released position
  });

  it('a cancelled drag still commits a coherent position rather than reverting silently', () => {
    const clock = makeTestClock(0);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    const onSeekCommit = vi.fn();
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={onSeekCommit}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 96, buttons: 1 }); // 40% -> 96000
    fireEvent.pointerCancel(slider);
    expect(onSeekCommit).toHaveBeenCalledWith(96000);
  });

  it('seeks with the keyboard immediately, via commit', () => {
    const clock = makeTestClock(10000);
    const onSeekCommit = vi.fn();
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={() => {}}
        onSeekCommit={onSeekCommit}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeekCommit).toHaveBeenCalledWith(15000);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onSeekCommit).toHaveBeenCalledWith(240000);
  });
});
