/**
 * Beat-grid math — the single source of truth for beat-snapping (shared so the web
 * editor, the timeline overlay, and the API run-payload all agree).
 *
 * A track's grid is defined by its tempo (`bpm`) and a **downbeat offset**
 * (`beatAnchorMs`, track-relative ms where beat 1 of bar 1 lands). Beat index 0 is
 * the downbeat; index `n` is `beatAnchorMs + n × msPerBeat`. Time signature is fixed
 * at 4/4 for now (`DEFAULT_BEATS_PER_BAR`). All functions are pure.
 */

/** Beats per bar (4/4 assumed until a per-track time signature lands). */
export const DEFAULT_BEATS_PER_BAR = 4;

/** Milliseconds per beat for a tempo, or null when `bpm` is missing/unusable. */
export function msPerBeat(bpm: number | null | undefined): number | null {
  return bpm != null && bpm > 0 ? 60000 / bpm : null;
}

export interface BeatPosition {
  /** 1-based beat within the bar (1..beatsPerBar). */
  beat: number;
  /** 1-based bar number (can be ≤ 0 for an anchor before the downbeat). */
  bar: number;
}

/** Absolute beat index (0 = the downbeat) nearest a track-relative anchor. */
function beatIndex(anchorMs: number, beatLenMs: number, beatAnchorMs: number): number {
  return Math.round((anchorMs - beatAnchorMs) / beatLenMs);
}

/** Map an absolute beat index to its 1-based beat-in-bar / bar. */
function positionFromIndex(n: number, beatsPerBar: number): BeatPosition {
  const inBar = ((n % beatsPerBar) + beatsPerBar) % beatsPerBar; // 0..beatsPerBar-1
  return { beat: inBar + 1, bar: Math.floor(n / beatsPerBar) + 1 };
}

/** The beat/bar label at a track-relative anchor (no snapping). Null without a tempo. */
export function beatPositionAt(
  anchorMs: number,
  bpm: number | null | undefined,
  beatAnchorMs = 0,
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
): BeatPosition | null {
  const beatLenMs = msPerBeat(bpm);
  if (beatLenMs == null) return null;
  return positionFromIndex(beatIndex(anchorMs, beatLenMs, beatAnchorMs), beatsPerBar);
}

/** A track-relative anchor snapped to the nearest beat, with its beat/bar. When the
 *  tempo is unknown the anchor is returned unchanged with null beat/bar. */
export interface SnappedAnchor {
  anchorMs: number;
  beat: number | null;
  bar: number | null;
}

export function snapToBeat(
  anchorMs: number,
  bpm: number | null | undefined,
  beatAnchorMs = 0,
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
): SnappedAnchor {
  const beatLenMs = msPerBeat(bpm);
  if (beatLenMs == null) return { anchorMs, beat: null, bar: null };
  const n = beatIndex(anchorMs, beatLenMs, beatAnchorMs);
  const snapped = Math.max(0, Math.round(beatAnchorMs + n * beatLenMs));
  return { anchorMs: snapped, ...positionFromIndex(n, beatsPerBar) };
}

export interface BeatTick {
  /** Tick position, in the same coordinate space as `originMs` / `lengthMs`. */
  ms: number;
  /** A bar boundary (downbeat) vs. an interior beat. */
  isDownbeat: boolean;
}

/**
 * Beat ticks across `[0, lengthMs]` for a grid whose downbeat (beat index 0) sits at
 * `originMs` (may be negative — e.g. a clip that starts after the downbeat). Empty
 * when the tempo is unknown or the span is non-positive. `maxTicks` bounds the output
 * so a pathological bpm/length can't produce an unbounded array.
 */
export function beatGridTicks(
  originMs: number,
  bpm: number | null | undefined,
  lengthMs: number,
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
  maxTicks = 4096,
): BeatTick[] {
  const beatLenMs = msPerBeat(bpm);
  if (beatLenMs == null || lengthMs <= 0) return [];
  const firstN = Math.ceil((0 - originMs) / beatLenMs); // first index whose tick is ≥ 0
  const ticks: BeatTick[] = [];
  for (let n = firstN; ticks.length < maxTicks; n++) {
    const ms = originMs + n * beatLenMs;
    if (ms > lengthMs) break;
    const inBar = ((n % beatsPerBar) + beatsPerBar) % beatsPerBar;
    ticks.push({ ms, isDownbeat: inBar === 0 });
  }
  return ticks;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export interface BeatGridLayout {
  /** Beat spacing as a percentage of the span. */
  beatPct: number;
  /** Bar spacing as a percentage of the span. */
  barPct: number;
  /** Phase of the first beat line, percentage of the span. */
  beatPhasePct: number;
  /** Phase of the first bar (downbeat) line, percentage of the span. */
  barPhasePct: number;
}

/**
 * Percentages for rendering a repeating beat/bar grid across a span of `lengthMs`,
 * whose downbeat (beat index 0) sits at `originMs` (block-relative, may be negative).
 * Null without a tempo or for an empty span. Spacing + phase let a caller draw the
 * grid with repeating CSS gradients (cheap; no per-beat DOM).
 */
export function beatGridLayout(
  originMs: number,
  bpm: number | null | undefined,
  lengthMs: number,
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
): BeatGridLayout | null {
  const beatLenMs = msPerBeat(bpm);
  if (beatLenMs == null || lengthMs <= 0) return null;
  const barLenMs = beatLenMs * beatsPerBar;
  return {
    beatPct: (beatLenMs / lengthMs) * 100,
    barPct: (barLenMs / lengthMs) * 100,
    beatPhasePct: (mod(originMs, beatLenMs) / lengthMs) * 100,
    barPhasePct: (mod(originMs, barLenMs) / lengthMs) * 100,
  };
}
