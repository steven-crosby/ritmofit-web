/**
 * The energy-arc ribbon — Ritmo Studio's signature planning view
 * (design system `10-rhythm-system.md` §4, `09-class-builder-guidelines.md`).
 *
 * Renders a class's intensity over time as a slim staircase area graph: each
 * track's width is its share of the assembled duration, and HEIGHT encodes the
 * zone — so the shape reads in grayscale and color is only reinforcement
 * (accessibility non-negotiable #1). It is deliberately **static**: the on-beat
 * pulse is rationed to Live + the currently-playing row and never appears here,
 * so this is the reduced-motion-safe way to read class shape (§6).
 *
 * Baseline ("staircase") version — one zone per track from `class_track.intensity`,
 * derived entirely from data already in the run-payload (no new schema). Intra-track
 * refinement from placed-move intensity, and segment banding, are deliberately
 * deferred (see the design docs).
 *
 * **Alive at rest** (design system principle 8; `05-components.md` §Provisional):
 * a class with tracks never shows a dead flat slab just because the instructor
 * hasn't authored a zone yet. When every track carries the same stored intensity
 * (an unshaped class), the ribbon draws a *derived provisional* warm-up → build →
 * peak → release arc from track order and length, marked with the provisional-state
 * contract (caution channel + glyph + `auto` label + the shape itself). Editing any
 * one track's intensity differentiates the class and flips the ribbon to the
 * authored shape. Derive, never invent: position/length only, no new schema.
 */
import { type Intensity, type RunPayload } from '@ritmofit/shared';
import { INTENSITY_LABEL } from './IntensityReadout.js';

/** Zone → crest height fraction (0–1). `none` keeps a small floor so it still reads as a block. */
const ZONE_HEIGHT: Record<Intensity, number> = {
  none: 0.12,
  easy: 0.34,
  mod: 0.55,
  hard: 0.78,
  all_out: 1,
};

// Normalized drawing space; the SVG stretches to the container (preserveAspectRatio="none").
const VB_W = 1000;
const VB_H = 100;
const TOP_ACCENT = 3; // viewBox units — the bright "line" riding each block's crest

export type RibbonSegment = {
  /** Left edge, viewBox units. */
  x: number;
  /** Width, viewBox units. */
  width: number;
  /** Y of the block crest, viewBox units (0 = top). */
  top: number;
  intensity: Intensity;
  /** Owning class-track, so the ribbon can share the timeline's selection. */
  classTrackId: string;
};

/** The drawable shape plus whether it was auto-derived (see `computeRibbonShape`). */
export type RibbonShape = {
  segments: RibbonSegment[];
  /** True when the intensities are a derived provisional arc, not authored zones. */
  provisional: boolean;
};

type Entry = RunPayload['tracks'][number];

/** Place + size one track's block for a given (authored or derived) intensity. */
function segmentFor(entry: Entry, intensity: Intensity, totalDurationMs: number): RibbonSegment {
  const dur = entry.track.durationMs ?? 0;
  const x = ((entry.startOffsetMs ?? 0) / totalDurationMs) * VB_W;
  const width = (dur / totalDurationMs) * VB_W;
  const top = VB_H - ZONE_HEIGHT[intensity] * VB_H;
  return { x, width, top, intensity, classTrackId: entry.classTrackId };
}

/**
 * Pure geometry: place each track by its (server-resolved) `startOffsetMs` and size
 * it by its share of the assembled total, mapping intensity → crest height. In free
 * mode a gap shows as uncolored space (no segment drawn there). A null/zero
 * `durationMs` contributes no segment. Returns [] when there's nothing to draw.
 * Exported so the layout can be unit-tested independently of the DOM.
 */
export function computeRibbonSegments(
  tracks: RunPayload['tracks'],
  totalDurationMs: number,
): RibbonSegment[] {
  if (totalDurationMs <= 0) return [];
  const segments: RibbonSegment[] = [];
  for (const t of tracks) {
    if ((t.track.durationMs ?? 0) <= 0) continue;
    segments.push(segmentFor(t, t.intensity, totalDurationMs));
  }
  return segments;
}

/** A track's temporal midpoint as a fraction of the assembled class, in [0, 1). */
function midpointFraction(entry: Entry, totalDurationMs: number): number {
  const dur = entry.track.durationMs ?? 0;
  return ((entry.startOffsetMs ?? 0) + dur / 2) / totalDurationMs;
}

/**
 * An "unshaped" class — every drawable track carries the *same* intensity, so the
 * instructor hasn't differentiated the arc yet (a single distinct zone flips this
 * off). One track can't form an arc, so a lone track is never treated as unshaped.
 */
function isUnshaped(drawable: Entry[]): boolean {
  if (drawable.length < 2) return false;
  const first = drawable[0]!.intensity;
  return drawable.every((t) => t.intensity === first);
}

/**
 * Derive a provisional zone from a track's position in the class — a warm-up →
 * build → peak → release arc. **Capped at `hard`**: a derived draft never claims
 * an all-out peak (plasma is reserved for an authored peak, and provisional state
 * never uses plasma — `05-components.md` §Provisional) and never sits at the flat
 * `none` floor. Position only; a documented assumption, not stored data.
 */
export function deriveProvisionalIntensity(midpoint: number): Intensity {
  if (midpoint < 0.22) return 'easy'; // warm-up
  if (midpoint < 0.48) return 'mod'; // build
  if (midpoint < 0.8) return 'hard'; // climb to peak (capped — no all_out)
  return 'mod'; // release
}

/**
 * The ribbon's drawable shape. Authored intensities win; but when the class is
 * unshaped (see `isUnshaped`) the shape is a derived provisional arc so a class
 * with tracks is never a flat slab (alive-at-rest, design system principle 8).
 */
export function computeRibbonShape(
  tracks: RunPayload['tracks'],
  totalDurationMs: number,
): RibbonShape {
  if (totalDurationMs <= 0) return { segments: [], provisional: false };
  const drawable = tracks.filter((t) => (t.track.durationMs ?? 0) > 0);
  if (!isUnshaped(drawable)) {
    return { segments: computeRibbonSegments(tracks, totalDurationMs), provisional: false };
  }
  const segments = drawable.map((t) =>
    segmentFor(
      t,
      deriveProvisionalIntensity(midpointFraction(t, totalDurationMs)),
      totalDurationMs,
    ),
  );
  return { segments, provisional: true };
}

/**
 * Provisional marker — the design system's provisional-state contract made visible:
 * caution channel + glyph + the `auto` label, riding the ribbon's low warm-up corner
 * so it never covers the peak. The shape itself is the underlying value; the ribbon's
 * aria-label announces "auto-shaped" for non-visual readers.
 */
function AutoShapeBadge() {
  return (
    <div
      className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-pill bg-state-caution/15 px-2 py-0.5"
      title="Auto-shaped from track order and length. Set a track's intensity to refine."
    >
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="h-3 w-3"
        style={{ fill: 'var(--rf-color-semantic-state-caution)' }}
      >
        {/* four-point sparkle — "derived/auto", distinct from the readiness ! glyph */}
        <path d="M6 0 L7.1 4.9 L12 6 L7.1 7.1 L6 12 L4.9 7.1 L0 6 L4.9 4.9 Z" />
      </svg>
      <span className="font-data text-[10px] uppercase tracking-wide text-state-caution">
        auto shape
      </span>
    </div>
  );
}

export function IntensityRibbon({
  payload,
  selectedClassTrackId = null,
}: {
  payload: RunPayload;
  /** The selected track — its ribbon segment shares the timeline's cyan selection,
   *  so the arc and the time axis read as one workbench (design system 09). */
  selectedClassTrackId?: string | null;
}) {
  const { segments, provisional } = computeRibbonShape(
    payload.tracks,
    payload.class.totalDurationMs,
  );

  // The arc as words, so it reads with no color and no pixels (screen readers /
  // grayscale). Derived from the drawn segments, so it stays honest when the shape
  // is provisional (it describes what's on screen, not the flat stored zones).
  const arc = segments.map((s) => INTENSITY_LABEL[s.intensity]).join(', ');
  const summary = `${segments.length} track${segments.length === 1 ? '' : 's'}, ${
    provisional ? 'auto-shaped ' : ''
  }intensity over time: ${arc}`;

  // The hero of the workbench: a tall, frameless area graph that sits as the top
  // layer of the shared "class shape" surface (the timeline rides directly below it
  // on the same time axis). No own caption/box — the workbench labels it once.
  if (segments.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center sm:h-44 lg:h-52">
        <span className="font-ui text-xs text-text-tertiary">
          Set track durations to see the shape of the class
        </span>
      </div>
    );
  }
  return (
    <div className="relative">
      {provisional && <AutoShapeBadge />}
      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="block h-36 w-full sm:h-44 lg:h-52"
      >
        {/* baseline rule */}
        <rect
          x={0}
          y={VB_H - 1}
          width={VB_W}
          height={1}
          style={{ fill: 'var(--rf-color-ribbon-baseline)' }}
        />
        {segments.map((s, i) => {
          // Plasma is spent only on a real, authored all-out peak — never on a
          // derived draft (a provisional arc is capped below all_out anyway).
          const peak = !provisional && s.intensity === 'all_out';
          const selected = selectedClassTrackId != null && s.classTrackId === selectedClassTrackId;
          const zoneColor = `var(--rf-color-intensity-${s.intensity})`;
          const cyan = 'var(--rf-color-semantic-interactive-default)';
          return (
            <g key={i}>
              {/* Selected track — a faint cyan column + base bar tie the arc to the
                  timeline's cyan selection, so the two read as one workbench. Cyan is
                  the interaction channel, never intensity, so it can't be misread. */}
              {selected && (
                <rect
                  x={s.x}
                  y={0}
                  width={s.width}
                  height={VB_H}
                  style={{ fill: cyan, fillOpacity: 0.08 }}
                />
              )}
              {/* area fill — faint; the height carries the meaning */}
              <rect
                x={s.x}
                y={s.top}
                width={s.width}
                height={VB_H - s.top}
                style={{ fill: zoneColor, fillOpacity: 'var(--rf-color-ribbon-fill-opacity)' }}
              />
              {/* crest line — a rationed plasma kiss at all-out peaks, else the zone color */}
              <rect
                x={s.x}
                y={s.top}
                width={s.width}
                height={TOP_ACCENT}
                style={{
                  fill: peak ? 'var(--rf-color-semantic-peak-glow)' : zoneColor,
                  fillOpacity: 'var(--rf-color-ribbon-line-opacity)',
                }}
              />
              {selected && (
                <rect x={s.x} y={VB_H - 2.5} width={s.width} height={2.5} style={{ fill: cyan }} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
