// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import type { ClockStore } from '../lib/use-virtual-clock.js';
import {
  LiveTimeline,
  SCRUB_WATCHDOG_MS,
  TAP_SLOP_PX,
  blockAt,
  fractionToMs,
  keyboardSeekMs,
  tapTargetMs,
} from './LiveTimeline.js';
import { computeTimeline } from './TimelineStrip.js';
import { PLAYBACK_TIMING_KEY, resetPlaybackTimingForTests } from '../lib/playback/start-timing.js';

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
    // Sequential: each 120 s track starts where the previous one ends.
    startOffsetMs: position * 120000,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: `10000000-0000-4000-8000-00000000000${position}`,
      title: `Track ${position}`,
      artist: 'Tester',
      durationMs,
      baseDurationMs: durationMs,
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
    expect(slider.getAttribute('aria-valuetext')).toBe('1:00 of 4:00, Track 1');
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
    // Pointerdown previews the tap target: the start of track 1 (RF-188).
    expect(onSeekPreview).toHaveBeenCalledWith(0);
    fireEvent.pointerMove(slider, { clientX: 120, buttons: 1, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 180, buttons: 1, pointerId: 1 });
    expect(onSeekPreview).toHaveBeenCalledTimes(3);
    expect(onSeekPreview).toHaveBeenLastCalledWith(180000); // 75%
    // Nothing is committed while the finger moves: the host seeks the
    // provider once, on release (RF-188).
    expect(onSeekCommit).not.toHaveBeenCalled();
  });

  it('drag-previews only while a pointer button is held, and never without a pointerdown', () => {
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
    // A held pointer that never went down here does not start a gesture (RF-185).
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 1, pointerId: 1 });
    expect(onSeekPreview).not.toHaveBeenCalled();
    fireEvent.pointerDown(slider, { clientX: 30, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 0, pointerId: 1 });
    expect(onSeekPreview.mock.calls).toEqual([[0]]);
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 1, pointerId: 1 });
    expect(onSeekPreview).toHaveBeenLastCalledWith(60000); // 25% of 240000
  });

  it('a pointermove alone never creates a gesture, so the next pointer is not locked out', () => {
    const clock = makeTestClock(0);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    const onSeekRelease = vi.fn();
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={() => {}}
        onSeekRelease={onSeekRelease}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.pointerMove(slider, { clientX: 100, buttons: 1, pointerId: 7 }); // no pointerdown
    fireEvent.pointerDown(slider, { clientX: 120, pointerId: 8 });
    fireEvent.pointerUp(slider, { clientX: 120, pointerId: 8 });
    expect(onSeekPreview.mock.calls).toEqual([[120000]]);
    expect(onSeekRelease.mock.calls).toEqual([[120000]]);
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
    fireEvent.pointerMove(slider, { clientX: 180, buttons: 1, pointerId: 1 });
    expect(onSeekCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider, { clientX: 180, pointerId: 1 });
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
    fireEvent.pointerMove(slider, { clientX: 96, buttons: 1, pointerId: 1 }); // 40% -> 96000
    fireEvent.pointerCancel(slider, { pointerId: 1 });
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

describe('LiveTimeline taps (RF-185)', () => {
  function renderTimeline() {
    const clock = makeTestClock(0);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    const onSeekRelease = vi.fn();
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={() => {}}
        onSeekRelease={onSeekRelease}
      />,
    );
    return { slider: screen.getByRole('slider'), onSeekPreview, onSeekRelease };
  }

  it('a still-finger move at the same position is part of the tap: one preview, release at the down position', () => {
    const { slider, onSeekPreview, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 60, buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 60, pointerId: 1 });
    expect(onSeekPreview).toHaveBeenCalledTimes(1);
    expect(onSeekRelease.mock.calls).toEqual([[0]]);
  });

  it('sub-pixel and small jitter inside the tap slop does not move the tap', () => {
    const { slider, onSeekPreview, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 60.4, buttons: 1, pointerId: 1 }); // a different ms
    fireEvent.pointerMove(slider, { clientX: 60 + TAP_SLOP_PX - 1, buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 60 + TAP_SLOP_PX - 1, pointerId: 1 });
    expect(onSeekPreview.mock.calls).toEqual([[0]]);
    expect(onSeekRelease.mock.calls).toEqual([[0]]);
  });

  it('a move past the slop is a drag from then on, even back inside it', () => {
    const { slider, onSeekPreview, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 60 + TAP_SLOP_PX, buttons: 1, pointerId: 1 }); // just past the slop
    fireEvent.pointerMove(slider, { clientX: 61, buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 61, pointerId: 1 });
    expect(onSeekPreview.mock.calls).toEqual([[0], [(60 + TAP_SLOP_PX) * 1000], [61000]]);
    expect(onSeekRelease.mock.calls).toEqual([[61000]]);
  });

  it('a pointercancel or second pointerup after the release sends nothing', () => {
    const { slider, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerCancel(slider, { pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 60, pointerId: 1 });
    expect(onSeekRelease).toHaveBeenCalledTimes(1);
  });

  it('a deliberate 4 px nudge commits where it was released (round 2 item 6)', () => {
    const { slider, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 64, buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 64, pointerId: 1 });
    expect(onSeekRelease.mock.calls).toEqual([[64000]]);
  });

  it('a drag that rests commits its last previewed value despite sub-pixel lift jitter', () => {
    const { slider, onSeekPreview, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 120, buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 120.6, pointerId: 1 }); // maps to 120600
    expect(onSeekPreview.mock.calls).toEqual([[0], [120000]]);
    expect(onSeekRelease.mock.calls).toEqual([[120000]]);
  });

  it('a nudge released outside the slop commits the release position, even with no move event', () => {
    const { slider, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 75, pointerId: 1 }); // iOS coalesced the move
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 64, buttons: 1, pointerId: 1 }); // inside the slop
    fireEvent.pointerUp(slider, { clientX: 70, pointerId: 1 });
    expect(onSeekRelease.mock.calls).toEqual([[75000], [70000]]);
  });

  it('follows one pointer: a second finger cannot move or end the gesture', () => {
    const { slider, onSeekPreview, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 2 });
    fireEvent.pointerMove(slider, { clientX: 210, buttons: 1, pointerId: 2 });
    fireEvent.pointerUp(slider, { clientX: 210, pointerId: 2 });
    fireEvent.pointerCancel(slider, { pointerId: 2 });
    expect(onSeekPreview.mock.calls).toEqual([[0]]);
    expect(onSeekRelease).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider, { clientX: 60, pointerId: 1 });
    expect(onSeekRelease.mock.calls).toEqual([[0]]);
  });

  it('a lost pointer capture ends the gesture, so the next pointer is not ignored', () => {
    const { slider, onSeekRelease } = renderTimeline();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.lostPointerCapture(slider, { pointerId: 1 });
    fireEvent.lostPointerCapture(slider, { pointerId: 1 }); // the tail of that end: nothing
    fireEvent.pointerDown(slider, { clientX: 120, pointerId: 2 });
    fireEvent.pointerUp(slider, { clientX: 120, pointerId: 2 });
    // The unmoved press commits nothing (RF-188 round 3); the next pointer works.
    expect(onSeekRelease.mock.calls).toEqual([[120000]]);
  });

  describe('debug timing', () => {
    let info: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      sessionStorage.setItem(PLAYBACK_TIMING_KEY, '1');
      resetPlaybackTimingForTests();
      info = vi.spyOn(console, 'info').mockImplementation(() => {});
    });
    afterEach(() => {
      sessionStorage.removeItem(PLAYBACK_TIMING_KEY);
      resetPlaybackTimingForTests();
    });

    it('logs down, move, up and a stray cancel with clientX and the mapped ms', () => {
      const { slider } = renderTimeline();
      fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerMove(slider, {
        clientX: 60.4,
        buttons: 1,
        pointerType: 'touch',
        pointerId: 1,
      });
      fireEvent.pointerUp(slider, { clientX: 60.4, pointerType: 'touch', pointerId: 1 });
      fireEvent.pointerCancel(slider, { clientX: 60.4, pointerType: 'touch', pointerId: 1 });
      const lines = info.mock.calls.map((call: unknown[]) => String(call[0]));
      expect(lines).toHaveLength(4);
      expect(lines[0]).toMatch(
        /^\[ritmo live-timeline\] timing pointer-down @\d+ms x=60\.0 ms=0 id=1 type=touch$/,
      );
      expect(lines[1]).toMatch(
        /pointer-move @\d+ms x=60\.4 ms=60400 id=1 type=touch \(tap slop\)$/,
      );
      expect(lines[2]).toMatch(/pointer-up @\d+ms x=60\.4 ms=0 id=1 type=touch tap$/);
      expect(lines[3]).toMatch(/pointer-cancel @\d+ms x=60\.4 ms=n\/a .*\(no gesture, ignored\)$/);
    });
  });
});

describe('LiveTimeline tap to jump (RF-188)', () => {
  function renderStrip(extra: { onShowAllTracks?: () => void } = {}) {
    const clock = makeTestClock(0);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    const onSeekRelease = vi.fn();
    const onScrubChange = vi.fn();
    stubRect(240);
    const view = render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={() => {}}
        onSeekRelease={onSeekRelease}
        onScrubChange={onScrubChange}
        {...extra}
      />,
    );
    return {
      slider: screen.getByRole('slider'),
      onSeekPreview,
      onSeekRelease,
      onScrubChange,
      unmount: view.unmount,
    };
  }

  it('finds the track under a time, and keeps a gap or the final instant sensible', () => {
    const payload = makePayload();
    const { blocks } = computeTimeline(payload.tracks, payload.class.totalDurationMs);
    expect(blockAt(blocks, 0)?.position).toBe(0);
    expect(blockAt(blocks, 119_999)?.position).toBe(0);
    expect(blockAt(blocks, 120_000)?.position).toBe(1);
    expect(blockAt(blocks, 240_000)?.position).toBe(1); // the class end is still track 2
    expect(tapTargetMs(blocks, 180_000)).toBe(120_000);
    // Free mode: a gap between tracks keeps the exact time.
    const gapped = computeTimeline(
      [entry(0, 60_000), { ...entry(1, 60_000), startOffsetMs: 120_000 }],
      180_000,
    ).blocks;
    expect(blockAt(gapped, 90_000)).toBeNull();
    expect(tapTargetMs(gapped, 90_000)).toBe(90_000);
  });

  it("a tap in the middle of a track jumps to that track's start, once", () => {
    const { slider, onSeekPreview, onSeekRelease } = renderStrip();
    fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1 }); // 3:00, inside track 2
    fireEvent.pointerUp(slider, { clientX: 180, pointerId: 1 });
    expect(onSeekPreview.mock.calls).toEqual([[120000]]);
    expect(onSeekRelease.mock.calls).toEqual([[120000]]);
  });

  it('a drag still lands on the exact released time, not a track start', () => {
    const { slider, onSeekRelease } = renderStrip();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 150, buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 150, pointerId: 1 });
    expect(onSeekRelease.mock.calls).toEqual([[150000]]);
  });

  it('shows "Track N · time" while pressed, and only then', () => {
    const { slider } = renderStrip();
    expect(screen.queryByTestId('live-timeline-callout')).toBeNull();
    fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1 });
    expect(screen.getByTestId('live-timeline-callout').textContent).toBe('Track 2 · 2:00');
    fireEvent.pointerMove(slider, { clientX: 200, buttons: 1, pointerId: 1 });
    expect(screen.getByTestId('live-timeline-callout').textContent).toBe('Track 2 · 3:20');
    fireEvent.pointerUp(slider, { clientX: 200, pointerId: 1 });
    expect(screen.queryByTestId('live-timeline-callout')).toBeNull();
  });

  it('tells the host when a finger is on the strip, for every way a gesture ends', () => {
    const { slider, onScrubChange } = renderStrip();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 2 }); // a second finger
    expect(onScrubChange.mock.calls).toEqual([[true]]);
    fireEvent.pointerUp(slider, { clientX: 60, pointerId: 1 });
    fireEvent.lostPointerCapture(slider, { pointerId: 1 }); // the tail of that release
    expect(onScrubChange.mock.calls).toEqual([[true], [false]]);
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 3 });
    fireEvent.pointerCancel(slider, { pointerId: 3 });
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 4 });
    fireEvent.lostPointerCapture(slider, { pointerId: 4 });
    expect(onScrubChange.mock.calls).toEqual([[true], [false], [true], [false], [true], [false]]);
  });

  it('releases the host if the strip unmounts mid-gesture', () => {
    const { slider, onScrubChange, unmount } = renderStrip();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    unmount();
    expect(onScrubChange.mock.calls).toEqual([[true], [false]]);
  });

  it('ignores a right- or middle-click (RF-204 item 6)', () => {
    const { slider, onSeekPreview, onSeekRelease, onScrubChange } = renderStrip();
    for (const button of [1, 2]) {
      fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1, pointerType: 'mouse', button });
      fireEvent.pointerUp(slider, { clientX: 180, pointerId: 1, pointerType: 'mouse', button });
    }
    expect(onSeekPreview).not.toHaveBeenCalled();
    expect(onSeekRelease).not.toHaveBeenCalled();
    expect(onScrubChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1, pointerType: 'mouse', button: 0 });
    fireEvent.pointerUp(slider, { clientX: 180, pointerId: 1, pointerType: 'mouse', button: 0 });
    expect(onSeekRelease.mock.calls).toEqual([[120000]]);
  });

  it('ignores seek keys while a finger is on the strip, so the release is the one seek', () => {
    const clock = makeTestClock(0);
    const onSeekCommit = vi.fn();
    const onSeekRelease = vi.fn();
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={(ms) => clock.setValue(ms)}
        onSeekCommit={onSeekCommit}
        onSeekRelease={onSeekRelease}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeekCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider, { clientX: 60, pointerId: 1 });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeekRelease.mock.calls).toEqual([[0]]);
    expect(onSeekCommit.mock.calls).toEqual([[5000]]);
  });

  it('says what a tap does, and offers All tracks when the host has a list', () => {
    const onShowAllTracks = vi.fn();
    const { slider } = renderStrip({ onShowAllTracks });
    const hint = screen.getByText('Drag to move · tap to jump');
    expect(slider.getAttribute('aria-describedby')).toBe(hint.id);
    fireEvent.click(screen.getByRole('button', { name: 'All tracks' }));
    expect(onShowAllTracks).toHaveBeenCalledTimes(1);
  });

  it('has no All tracks button without a list to open', () => {
    renderStrip();
    expect(screen.queryByRole('button', { name: 'All tracks' })).toBeNull();
  });
});

describe('LiveTimeline lost releases (RF-188 round 3)', () => {
  function renderStrip(initialMs = 30_000) {
    const clock = makeTestClock(initialMs);
    const onSeekPreview = vi.fn((ms: number) => clock.setValue(ms));
    const onSeekRelease = vi.fn();
    const onScrubChange = vi.fn();
    const onClockHoldChange = vi.fn();
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={onSeekPreview}
        onSeekCommit={() => {}}
        onSeekRelease={onSeekRelease}
        onScrubChange={onScrubChange}
        onClockHoldChange={onClockHoldChange}
      />,
    );
    return {
      slider: screen.getByRole('slider'),
      clock,
      onSeekPreview,
      onSeekRelease,
      onScrubChange,
      onClockHoldChange,
    };
  }

  it('a cancelled press that never moved commits nothing and puts the clock back', () => {
    const { slider, clock, onSeekRelease } = renderStrip(30_000);
    fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1 }); // previews track 2's start
    expect(clock.store.getSnapshot()).toBe(120_000);
    fireEvent.pointerCancel(slider, { pointerId: 1 });
    expect(onSeekRelease).not.toHaveBeenCalled();
    expect(clock.store.getSnapshot()).toBe(30_000);
  });

  it('a window pointerup the strip missed ends the gesture; a drag commits its last position', () => {
    const { slider, onSeekRelease, onScrubChange } = renderStrip();
    fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 150, buttons: 1, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 2 }); // another pointer: ignored
    expect(onScrubChange.mock.calls).toEqual([[true]]);
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect(onScrubChange.mock.calls).toEqual([[true], [false]]);
    expect(onSeekRelease.mock.calls).toEqual([[150000]]);
    fireEvent.pointerUp(slider, { clientX: 150, pointerId: 1 }); // late: nothing more
    expect(onSeekRelease).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the window loses focus', () => fireEvent.blur(window)],
    [
      'the page is hidden',
      () => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        fireEvent(document, new Event('visibilitychange'));
        delete (document as { visibilityState?: unknown }).visibilityState;
      },
    ],
    ['the window sees a pointercancel', () => fireEvent.pointerCancel(window, { pointerId: 1 })],
  ])(
    'ends the scrub when %s, without a seek for an unmoved press',
    (_label: string, end: () => unknown) => {
      const { slider, onSeekRelease, onScrubChange } = renderStrip();
      fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
      end();
      expect(onScrubChange.mock.calls).toEqual([[true], [false]]);
      expect(onSeekRelease).not.toHaveBeenCalled();
    },
  );

  it('the watchdog releases only the clock hold: the finger stays down, and a still lift seeks once', () => {
    vi.useFakeTimers();
    try {
      const { slider, onSeekRelease, onScrubChange, onClockHoldChange } = renderStrip();
      fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1 });
      vi.advanceTimersByTime(SCRUB_WATCHDOG_MS - 1);
      expect(onClockHoldChange.mock.calls).toEqual([[true]]);
      vi.advanceTimersByTime(1);
      expect(onClockHoldChange.mock.calls).toEqual([[true], [false]]);
      // Finger down (panel quiet, reveal deferred) lasts until the real end (round 4).
      expect(onScrubChange.mock.calls).toEqual([[true]]);
      expect(screen.getByTestId('live-timeline-callout')).toBeTruthy(); // the gesture is kept
      fireEvent.pointerUp(slider, { clientX: 180, pointerId: 1 });
      expect(onSeekRelease.mock.calls).toEqual([[120000]]);
      expect(onClockHoldChange.mock.calls).toEqual([[true], [false]]); // no second false
      expect(onScrubChange.mock.calls).toEqual([[true], [false]]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a move after the watchdog holds the clock again and restarts the timer', () => {
    vi.useFakeTimers();
    try {
      const { slider, onScrubChange, onClockHoldChange } = renderStrip();
      fireEvent.pointerDown(slider, { clientX: 60, pointerId: 1 });
      vi.advanceTimersByTime(SCRUB_WATCHDOG_MS);
      fireEvent.pointerMove(slider, { clientX: 100, buttons: 1, pointerId: 1 });
      expect(onClockHoldChange.mock.calls).toEqual([[true], [false], [true]]);
      vi.advanceTimersByTime(SCRUB_WATCHDOG_MS - 1);
      fireEvent.pointerMove(slider, { clientX: 110, buttons: 1, pointerId: 1 });
      vi.advanceTimersByTime(SCRUB_WATCHDOG_MS - 1);
      expect(onClockHoldChange.mock.calls).toEqual([[true], [false], [true]]);
      fireEvent.pointerUp(slider, { clientX: 110, pointerId: 1 });
      expect(onClockHoldChange.mock.calls).toEqual([[true], [false], [true], [false]]);
      expect(onScrubChange.mock.calls).toEqual([[true], [false]]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a cancelled unmoved press restores the clock before it lets the host go (round 4)', () => {
    const order: string[] = [];
    const clock = makeTestClock(30_000);
    stubRect(240);
    render(
      <LiveTimeline
        payload={makePayload()}
        clock={clock.store}
        onSeekPreview={(ms) => {
          order.push(`preview ${ms}`);
          clock.setValue(ms);
        }}
        onSeekCommit={() => {}}
        onScrubChange={(active) => order.push(`finger ${active}`)}
        onClockHoldChange={(held) => order.push(`hold ${held}`)}
      />,
    );
    const slider = screen.getByRole('slider');
    fireEvent.pointerDown(slider, { clientX: 180, pointerId: 1 });
    fireEvent.pointerCancel(slider, { pointerId: 1 });
    expect(order).toEqual([
      'finger true',
      'hold true',
      'preview 120000',
      'preview 30000',
      'hold false',
      'finger false',
    ]);
  });
});
