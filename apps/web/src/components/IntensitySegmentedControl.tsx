/**
 * Labeled segmented control for picking a track's intensity — the spin-zone
 * replacement for the raw-enum `<select>` (backlog M1 / decision D17). Each
 * segment shows the **zone number + word** ("Z2 · Push"), never color alone, per
 * the design-system intensity rule (`02-color-system.md`). Built on native radio
 * inputs (visually hidden) so it gets keyboard arrow-key navigation and
 * screen-reader semantics for free; the visible chrome is the styled label.
 */
import { useId } from 'react';
import { intensityValues, type Intensity } from '@ritmofit/shared';
import { INTENSITY_BARS, INTENSITY_LABEL } from './IntensityReadout.js';

export function IntensitySegmentedControl({
  value,
  onChange,
  ariaLabel,
}: {
  value: Intensity;
  onChange: (value: Intensity) => void;
  ariaLabel: string;
}) {
  // A unique radio-group name per instance so multiple controls on one screen
  // (e.g. the inspector + the add-track form) don't share selection.
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap items-stretch gap-0.5 rounded-pill border border-interactive/30 bg-bg-base p-0.5"
    >
      {intensityValues.map((v) => {
        const selected = value === v;
        return (
          <label
            key={v}
            // The radio is sr-only, so the label is the only visible chrome — it
            // must carry the keyboard focus ring itself, or focus is invisible
            // (design system: "visible cyan focus ring at all times"). `has-[:focus-visible]`
            // lifts the contained radio's focus onto the label.
            className={`cursor-pointer rounded-pill px-2.5 py-1 font-ui text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-interactive ${
              selected
                ? 'rf-btn-primary font-semibold text-text-on-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={selected}
              onChange={() => onChange(v)}
              className="sr-only"
            />
            <span className="font-data" aria-hidden>
              Z{INTENSITY_BARS[v]}
            </span>{' '}
            {INTENSITY_LABEL[v]}
          </label>
        );
      })}
    </div>
  );
}
