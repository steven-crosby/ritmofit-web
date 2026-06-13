/**
 * The energy-arc ribbon — RitmoFit's signature planning view
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
 */
import { type Intensity, type RunPayload } from '@ritmofit/shared';

/** Zone → crest height fraction (0–1). `none` keeps a small floor so it still reads as a block. */
const ZONE_HEIGHT: Record<Intensity, number> = {
  none: 0.12,
  easy: 0.34,
  mod: 0.55,
  hard: 0.78,
  all_out: 1,
};

/** Spoken zone labels for the accessible text summary. */
const ZONE_LABEL: Record<Intensity, string> = {
  none: 'none',
  easy: 'easy',
  mod: 'moderate',
  hard: 'hard',
  all_out: 'all-out',
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
};

/**
 * Pure geometry: lay each track out by its share of the assembled total, mapping
 * intensity → crest height. A null/zero `durationMs` contributes 0 width (matches
 * the run-payload's `totalDurationMs` rule). Returns [] when there's nothing to draw.
 * Exported so the layout can be unit-tested independently of the DOM.
 */
export function computeRibbonSegments(
  tracks: RunPayload['tracks'],
  totalDurationMs: number,
): RibbonSegment[] {
  if (totalDurationMs <= 0) return [];
  const segments: RibbonSegment[] = [];
  let x = 0;
  for (const t of tracks) {
    const dur = t.track.durationMs ?? 0;
    if (dur <= 0) continue;
    const width = (dur / totalDurationMs) * VB_W;
    const top = VB_H - ZONE_HEIGHT[t.intensity] * VB_H;
    segments.push({ x, width, top, intensity: t.intensity });
    x += width;
  }
  return segments;
}

export function IntensityRibbon({ payload }: { payload: RunPayload }) {
  const segments = computeRibbonSegments(payload.tracks, payload.class.totalDurationMs);

  // The arc as words, so it reads with no color and no pixels (screen readers / grayscale).
  const arc = payload.tracks
    .filter((t) => (t.track.durationMs ?? 0) > 0)
    .map((t) => ZONE_LABEL[t.intensity])
    .join(', ');
  const summary = `${segments.length} track${segments.length === 1 ? '' : 's'}, intensity over time: ${arc}`;

  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
        Energy arc
      </figcaption>
      {segments.length === 0 ? (
        <div className="flex h-16 items-center justify-center rounded-card bg-bg-base">
          <span className="font-ui text-xs text-text-tertiary">
            Set track durations to see the shape of the class
          </span>
        </div>
      ) : (
        <svg
          role="img"
          aria-label={summary}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="h-16 w-full rounded-card bg-bg-base"
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
            const peak = s.intensity === 'all_out';
            const zoneColor = `var(--rf-color-intensity-${s.intensity})`;
            return (
              <g key={i}>
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
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}
