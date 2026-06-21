// IntensityRibbon — RitmoFit's signature energy-arc view: a staircase area
// graph where HEIGHT encodes intensity (so the class shape reads in grayscale)
// and width is each track's share of the total. Driven entirely by the
// run-payload.
import { IntensityRibbon } from '@ritmofit/web';
import { Surface } from './_ui.js';
import { demoClass } from './_fixtures.js';

export function FullClass() {
  return (
    <Surface>
      <span className="font-display text-display-lg">Sunset Climb</span>
      <IntensityRibbon payload={demoClass} />
    </Surface>
  );
}

export function EmptyState() {
  const noDurations = {
    ...demoClass,
    class: { ...demoClass.class, totalDurationMs: 0 },
  };
  return (
    <Surface>
      <IntensityRibbon payload={noDurations} />
    </Surface>
  );
}
