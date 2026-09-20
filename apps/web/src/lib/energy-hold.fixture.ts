import type { Intensity } from '@ritmofit/shared';

export const HOLD_UNTIL_NEXT_FIXTURE = {
  durationMs: 80_000,
  baseline: 'easy' as Intensity,
  moves: [
    { anchorMs: 20_000, intensity: 'all_out' as Intensity },
    { anchorMs: 50_000, intensity: 'mod' as Intensity },
  ],
  expectedIntensities: ['easy', 'all_out', 'mod'] as Intensity[],
  expectedStartRatios: [0, 0.25, 0.625],
  expectedWidthRatios: [0.25, 0.375, 0.375],
} as const;
