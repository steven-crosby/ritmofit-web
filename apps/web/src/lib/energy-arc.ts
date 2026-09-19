/**
 * Shared class-shape derivation for the IntensityRibbon and ClassPulse.
 *
 * Design system `10-rhythm-system.md` §4:
 * - **Alive at rest:** a class with tracks never renders as a flat slab. When
 *   every drawable track shares one stored intensity *and* no placed move carries
 *   intensity, the shape is a derived warm-up → build → peak → release draft,
 *   marked provisional.
 * - **Hybrid blend:** track intensity is the staircase baseline; placed-move
 *   intensity at `anchorMs` refines the curve inside that track. There is no
 *   persisted move duration, so a scored move holds until the next scored move
 *   or the track end (TODO: a real move duration field would let a sprint occupy
 *   a short window and return to baseline — do not invent that width).
 *
 * **Derive, never invent.** Position, length, track intensity, and placed-move
 * intensity only. No new schema, no provider audio, no hidden field.
 */
import type { Intensity } from '@ritmofit/shared';

export type PlacedMoveIntensity = {
  anchorMs: number;
  intensity: Intensity | null;
};

export type IntensitySpan = {
  classTrackId: string;
  /** Track-relative start of this hold, in ms. */
  startMs: number;
  durationMs: number;
  intensity: Intensity;
  /** Baseline = the class-track zone; move = a scored placement from `anchorMs`. */
  source: 'baseline' | 'move';
};

/**
 * An "unshaped" class — every drawable track carries the *same* intensity, so the
 * instructor hasn't differentiated the arc yet (a single distinct zone flips this
 * off). One track can't form an arc, so a lone track is never treated as unshaped.
 */
export function isUnshapedSequence(intensities: readonly Intensity[]): boolean {
  if (intensities.length < 2) return false;
  const first = intensities[0]!;
  return intensities.every((i) => i === first);
}

/**
 * Derive a provisional zone from a track's temporal midpoint (a fraction of the
 * assembled class, in [0, 1)) — a warm-up → build → peak → release arc.
 *
 * **Capped at `hard`**: a derived draft never claims an all-out peak (plasma is
 * reserved for an authored peak, and provisional state never uses plasma —
 * `05-components.md` §Provisional) and never sits at the flat `none` floor.
 * Position only; a documented assumption, not stored data.
 *
 * The return type excludes `none` so callers that draw a shape don't have to
 * defend against a floor value this function cannot produce.
 */
export function deriveProvisionalIntensity(midpoint: number): Exclude<Intensity, 'none'> {
  if (midpoint < 0.22) return 'easy'; // warm-up
  if (midpoint < 0.48) return 'mod'; // build
  if (midpoint < 0.8) return 'hard'; // climb to peak (capped — no all_out)
  return 'mod'; // release
}

/**
 * The one sentence every surface uses to name the assumption behind a derived
 * shape. Kept here so the wording can't drift between the ribbon and the pulse —
 * a provisional shape that explains itself differently in two places reads as two
 * different claims.
 */
export const PROVISIONAL_ARC_CAPTION =
  'Auto-shaped from track order and length. Set a track’s intensity to refine.';

/**
 * True when any placed move carries a stored intensity. That is authored
 * refinement, so the class is no longer an unshaped draft even if every track
 * still shares one baseline zone.
 */
export function hasPlacedMoveIntensity(moves: readonly PlacedMoveIntensity[] | undefined): boolean {
  return (moves ?? []).some((move) => move.intensity != null);
}

/** Track-shaped inputs used to decide provisional vs authored. */
export type UnshapedTrack = {
  intensity: Intensity;
  moves?: readonly PlacedMoveIntensity[];
};

/**
 * A class is unshaped only when drawable tracks share one baseline zone *and*
 * none of them has a placed-move intensity. One distinct track zone or one
 * scored placement flips the class to authored.
 */
export function isUnshapedClass(tracks: readonly UnshapedTrack[]): boolean {
  if (tracks.some((track) => hasPlacedMoveIntensity(track.moves))) return false;
  return isUnshapedSequence(tracks.map((track) => track.intensity));
}

/**
 * Piecewise-constant refinement of one track. Moves without intensity, with a
 * non-finite/`NaN` anchor, or with an anchor outside `[0, durationMs)` are
 * ignored. Same-anchor placements last-write-win so the later edit is the one
 * the ribbon shows.
 */
export function refineTrackSpans(
  classTrackId: string,
  durationMs: number,
  baseline: Intensity,
  moves: readonly PlacedMoveIntensity[] = [],
): IntensitySpan[] {
  if (durationMs <= 0) return [];

  const unique: { anchorMs: number; intensity: Intensity }[] = [];
  const scored = moves
    .filter(
      (move): move is { anchorMs: number; intensity: Intensity } =>
        move.intensity != null &&
        Number.isFinite(move.anchorMs) &&
        move.anchorMs >= 0 &&
        move.anchorMs < durationMs,
    )
    .slice()
    .sort((a, b) => a.anchorMs - b.anchorMs);

  for (const point of scored) {
    const last = unique.at(-1);
    if (last && last.anchorMs === point.anchorMs) unique[unique.length - 1] = point;
    else unique.push(point);
  }

  if (unique.length === 0) {
    return [{ classTrackId, startMs: 0, durationMs, intensity: baseline, source: 'baseline' }];
  }

  const spans: IntensitySpan[] = [];
  const firstAnchor = unique[0]!.anchorMs;
  if (firstAnchor > 0) {
    spans.push({
      classTrackId,
      startMs: 0,
      durationMs: firstAnchor,
      intensity: baseline,
      source: 'baseline',
    });
  }

  for (let i = 0; i < unique.length; i += 1) {
    const startMs = unique[i]!.anchorMs;
    const endMs = i + 1 < unique.length ? unique[i + 1]!.anchorMs : durationMs;
    const holdMs = endMs - startMs;
    if (holdMs <= 0) continue;
    spans.push({
      classTrackId,
      startMs,
      durationMs: holdMs,
      intensity: unique[i]!.intensity,
      source: 'move',
    });
  }

  return spans;
}
