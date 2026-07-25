/**
 * The shared "alive at rest" derivation — one definition of what a class's shape
 * is when the instructor hasn't authored one yet.
 *
 * Design system `10-rhythm-system.md` §4 is explicit: a class with tracks never
 * renders as a flat slab. When every track carries the same stored intensity, the
 * shape is derived from documented position/duration assumptions into a warm-up →
 * build → peak → release draft, and marked provisional so nobody mistakes the
 * assumption for authored data.
 *
 * This lives in `lib/` rather than in either component because two surfaces render
 * class shape — the `IntensityRibbon` (the workbench hero) and the `ClassPulse`
 * (the compact signature on eight surfaces). Two copies of this rule would drift,
 * and a class would then have two different shapes depending on where you looked.
 *
 * **Derive, never invent.** Position and length only. No new schema, no provider
 * audio, no hidden field.
 */
import type { Intensity } from '@ritmofit/shared';

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
