/**
 * Redundant intensity encoding — color swatch + 0–4 filled bars + text label,
 * never color alone (design system accessibility non-negotiable #1). Shared by
 * the Live HUD and the planning builder so the encoding has one definition.
 */
import type { Intensity } from '@ritmofit/shared';

/** Bars filled per intensity — the redundant (non-color) encoding. 0..4. */
export const INTENSITY_BARS: Record<Intensity, number> = {
  none: 0,
  easy: 1,
  mod: 2,
  hard: 3,
  all_out: 4,
};

export function IntensityReadout({ intensity }: { intensity: Intensity }) {
  const bars = INTENSITY_BARS[intensity];
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Intensity ${intensity}`}>
      <span className="flex items-end gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-1.5 rounded-sm"
            style={{
              height: `${6 + i * 4}px`,
              backgroundColor:
                i < bars ? `var(--rf-color-intensity-${intensity})` : 'var(--rf-color-interactive)',
              opacity: i < bars ? 1 : 0.25,
            }}
          />
        ))}
      </span>
      <span className="font-data text-xs uppercase tracking-wide text-text-secondary">
        {intensity}
      </span>
    </span>
  );
}
