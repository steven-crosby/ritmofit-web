import type { Intensity, RunPayload } from '@ritmofit/shared';
import {
  deriveProvisionalIntensity,
  isUnshapedSequence,
  PROVISIONAL_ARC_CAPTION,
} from './energy-arc.js';

export type ClassPulseInput = {
  classTrackId: string;
  order: number;
  durationMs: number | null;
  effort: Intensity | null;
};

export type ClassPulseSegment = {
  classTrackId: string;
  startRatio: number;
  widthRatio: number;
  /** The **stored** effort. Null = unscored, and stays visually hatched. */
  effort: Exclude<Intensity, 'none'> | null;
  /**
   * The effort that drives this segment's HEIGHT. Equal to `effort` for an
   * authored class; on an unshaped class it is the derived provisional zone, which
   * is what stops the pulse drawing a flat slab. Null only when there is no shape
   * to draw for this segment (unscored on an authored class).
   */
  shapeEffort: Exclude<Intensity, 'none'> | null;
};

export type ClassPulseModel = {
  state: 'empty' | 'partial' | 'complete';
  /**
   * True when every drawable track shares one stored effort, so the drawn shape is
   * a derived warm-up → build → peak → release draft rather than authored zones
   * (`10-rhythm-system.md` §4). Surfaces must caption this, never present it as
   * stored data.
   */
  provisional: boolean;
  segments: ClassPulseSegment[];
  coverage: {
    trackCount: number;
    drawableCount: number;
    scoredCount: number;
    missingDurationCount: number;
    unscoredCount: number;
    invalidCount: number;
  };
};

const SCORED_EFFORTS = new Set<Intensity>(['easy', 'mod', 'hard', 'all_out']);

/**
 * Derive a Class Pulse from authored class structure only. Track order decides
 * sequence, valid positive durations decide width, and the stored class-track
 * effort decides height.
 *
 * One documented exception, and it is required rather than optional: when every
 * drawable track shares a single stored effort, the class is *unshaped* and the
 * height falls back to a derived warm-up → build → peak → release arc, flagged
 * `provisional` so the caller captions the assumption (`10-rhythm-system.md` §4 —
 * "alive at rest": a class with tracks never renders as a flat slab). The
 * derivation is shared with the `IntensityRibbon` via `lib/energy-arc.ts`, so both
 * views of a class agree on its shape.
 *
 * Everything else stays missing. Position and duration are the only inputs to the
 * derivation — never provider audio, and never a field that isn't already in the
 * run-payload.
 */
export function deriveClassPulse(inputs: readonly ClassPulseInput[]): ClassPulseModel {
  if (inputs.length === 0) {
    return {
      state: 'empty',
      provisional: false,
      segments: [],
      coverage: {
        trackCount: 0,
        drawableCount: 0,
        scoredCount: 0,
        missingDurationCount: 0,
        unscoredCount: 0,
        invalidCount: 0,
      },
    };
  }

  const ordered = inputs
    .map((input, inputIndex) => ({ input, inputIndex }))
    .sort((a, b) => {
      const aOrder = Number.isFinite(a.input.order) ? a.input.order : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(b.input.order) ? b.input.order : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.inputIndex - b.inputIndex;
    });

  let missingDurationCount = 0;
  let unscoredCount = 0;
  let invalidCount = 0;
  let scoredCount = 0;

  const drawable = ordered.flatMap(({ input }) => {
    const durationValid =
      typeof input.durationMs === 'number' &&
      Number.isFinite(input.durationMs) &&
      input.durationMs > 0;
    if (!durationValid) missingDurationCount += 1;

    const effort = input.effort;
    const effortValid = effort == null || effort === 'none' || SCORED_EFFORTS.has(effort);
    if (!effortValid) invalidCount += 1;
    else if (effort === 'none' || effort == null) unscoredCount += 1;
    else scoredCount += 1;

    if (!durationValid) return [];
    return [
      {
        classTrackId: input.classTrackId,
        durationMs: input.durationMs as number,
        effort:
          effortValid && effort != null && effort !== 'none'
            ? (effort as Exclude<Intensity, 'none'>)
            : null,
      },
    ];
  });

  // An unshaped class carries one effort across every drawable track (unscored
  // counts as its own uniform value, so an entirely unscored class is unshaped
  // too). A single differing zone means the instructor has authored a shape and
  // the stored values win.
  const provisional = isUnshapedSequence(drawable.map((segment) => segment.effort ?? 'none'));

  const totalDurationMs = drawable.reduce((total, segment) => total + segment.durationMs, 0);
  let elapsedMs = 0;
  const segments = drawable.map<ClassPulseSegment>((segment) => {
    const startRatio = elapsedMs / totalDurationMs;
    const widthRatio = segment.durationMs / totalDurationMs;
    // The derived zone is keyed to the track's temporal midpoint, so a long track
    // is placed on the arc by where it actually sits in the class rather than by
    // its index — two classes with the same running order but different track
    // lengths genuinely have different shapes.
    const derived = deriveProvisionalIntensity(startRatio + widthRatio / 2);
    const result = {
      classTrackId: segment.classTrackId,
      startRatio,
      widthRatio,
      effort: segment.effort,
      shapeEffort: provisional ? derived : segment.effort,
    };
    elapsedMs += segment.durationMs;
    return result;
  });

  const complete =
    segments.length === inputs.length && scoredCount === inputs.length && invalidCount === 0;

  return {
    state: complete ? 'complete' : 'partial',
    provisional,
    segments,
    coverage: {
      trackCount: inputs.length,
      drawableCount: segments.length,
      scoredCount,
      missingDurationCount,
      unscoredCount,
      invalidCount,
    },
  };
}

export function classPulseFromPayload(payload: RunPayload): ClassPulseModel {
  return deriveClassPulse(
    payload.tracks.map((entry, index) => ({
      classTrackId: entry.classTrackId,
      order: Number.isFinite(entry.position) ? entry.position : index,
      durationMs: entry.track.durationMs,
      effort: entry.intensity,
    })),
  );
}

export function classPulseCoverageLabel(model: ClassPulseModel): string {
  if (model.state === 'empty') return 'Add tracks to derive the class shape.';
  const gaps: string[] = [];
  if (model.coverage.missingDurationCount > 0) {
    gaps.push(
      `${model.coverage.missingDurationCount} missing ${
        model.coverage.missingDurationCount === 1 ? 'duration' : 'durations'
      }`,
    );
  }
  if (model.coverage.unscoredCount > 0) {
    gaps.push(
      `${model.coverage.unscoredCount} unscored ${
        model.coverage.unscoredCount === 1 ? 'effort' : 'efforts'
      }`,
    );
  }
  if (model.coverage.invalidCount > 0) gaps.push(`${model.coverage.invalidCount} invalid values`);
  // A provisional shape must say so wherever it is drawn. The assumption leads,
  // because it qualifies everything the reader is looking at; coverage gaps follow.
  if (model.provisional) {
    return gaps.length === 0
      ? PROVISIONAL_ARC_CAPTION
      : `${PROVISIONAL_ARC_CAPTION} ${gaps.join(' · ')}`;
  }
  return gaps.length === 0 ? 'All track durations and efforts contribute.' : gaps.join(' · ');
}
