import type { Intensity, RunPayload } from '@ritmofit/shared';

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
  effort: Exclude<Intensity, 'none'> | null;
};

export type ClassPulseModel = {
  state: 'empty' | 'partial' | 'complete';
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
 * effort decides height. Missing data stays missing; this helper never invents
 * an energy arc from position or provider audio.
 */
export function deriveClassPulse(inputs: readonly ClassPulseInput[]): ClassPulseModel {
  if (inputs.length === 0) {
    return {
      state: 'empty',
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

  const totalDurationMs = drawable.reduce((total, segment) => total + segment.durationMs, 0);
  let elapsedMs = 0;
  const segments = drawable.map<ClassPulseSegment>((segment) => {
    const result = {
      classTrackId: segment.classTrackId,
      startRatio: elapsedMs / totalDurationMs,
      widthRatio: segment.durationMs / totalDurationMs,
      effort: segment.effort,
    };
    elapsedMs += segment.durationMs;
    return result;
  });

  const complete =
    segments.length === inputs.length && scoredCount === inputs.length && invalidCount === 0;

  return {
    state: complete ? 'complete' : 'partial',
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
  return gaps.length === 0 ? 'All track durations and efforts contribute.' : gaps.join(' · ');
}
