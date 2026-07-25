/**
 * Labeled segmented control for picking a track's intensity — the spin-zone
 * replacement for the raw-enum `<select>` (backlog M1 / decision D17).
 *
 * **Selection treatment (design system `09-class-builder-guidelines.md`).** Neutral
 * fill plus a 3px cyan bottom indicator. Copper is deliberately *not* used here:
 * it is identity and the one primary action per surface, so spending it on a
 * five-way selection makes every zone look like a call to action and leaves the
 * real primary with nothing louder to say.
 *
 * **Redundant encoding.** Zone number, bar count and word all carry the value, so
 * it survives greyscale and colour-blindness (accessibility non-negotiable #1).
 * Below ~320px the word drops out of the segments — canon explicitly allows
 * "number + bars on compact rows" — and the textual summary underneath carries the
 * selected zone in words instead, so nothing is lost, it just moves.
 *
 * **Semantics.** Toggle buttons with `aria-pressed`, per canon, rather than radio
 * inputs. Radios would give arrow-key navigation for free, so that is implemented
 * here as a roving tabindex: the group is one tab stop and arrows move within it.
 */
import { useId, useRef } from 'react';
import { intensityValues, type Intensity } from '@ritmofit/shared';
import { INTENSITY_BARS, INTENSITY_LABEL } from './IntensityReadout.js';

/** The 0–4 bar glyph — the non-colour, non-numeric channel. */
function ZoneBars({ bars }: { bars: number }) {
  return (
    <span className="flex items-end gap-px" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-0.5 rounded-[1px] bg-current"
          style={{ height: `${4 + i * 2}px`, opacity: i < bars ? 1 : 0.3 }}
        />
      ))}
    </span>
  );
}

export function IntensitySegmentedControl({
  value,
  onChange,
  ariaLabel,
}: {
  value: Intensity;
  onChange: (value: Intensity) => void;
  ariaLabel: string;
}) {
  const summaryId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  // Roving tabindex: one tab stop for the whole group, arrows move within it —
  // the keyboard behaviour a radiogroup would have given us, kept while moving to
  // the `aria-pressed` semantics canon asks for.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const index = intensityValues.indexOf(value);
    const next =
      intensityValues[(index + delta + intensityValues.length) % intensityValues.length]!;
    onChange(next);
    // Move focus with selection so the two never diverge.
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('button[data-zone]');
    buttons?.[intensityValues.indexOf(next)]?.focus();
  };

  return (
    // A container, not a viewport breakpoint: what decides whether the words fit
    // is the inspector's width, and the inspector is narrow at 1440px too.
    <div className="rf-zone-control">
      <div
        ref={groupRef}
        role="group"
        aria-label={ariaLabel}
        aria-describedby={summaryId}
        onKeyDown={onKeyDown}
        className="flex items-stretch overflow-hidden rounded-control border border-border-default bg-bg-base"
      >
        {intensityValues.map((v) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              data-zone={v}
              aria-pressed={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(v)}
              className={`rf-focus-ring flex min-h-11 flex-1 items-center justify-center gap-1 border-b-[3px] px-1.5 font-ui text-xs transition-colors ${
                selected
                  ? 'border-b-interactive bg-bg-raised font-semibold text-text-primary'
                  : 'border-b-transparent text-text-secondary hover:bg-bg-raised/50 hover:text-text-primary'
              }`}
            >
              {/* The numeral and the word are separate elements so they never run
                  together as "Z1Build" the way a bare interpolation did. */}
              <span className="font-data" aria-hidden>
                Z{INTENSITY_BARS[v]}
              </span>
              <ZoneBars bars={INTENSITY_BARS[v]} />
              <span className="rf-zone-word truncate" aria-hidden>
                {INTENSITY_LABEL[v]}
              </span>
              {/* The word always reaches assistive tech, even at the width where
                  the visible one is dropped. */}
              <span className="sr-only">{INTENSITY_LABEL[v]}</span>
            </button>
          );
        })}
      </div>
      <p id={summaryId} className="mt-1 font-ui text-xs text-text-tertiary">
        Zone {INTENSITY_BARS[value]} · {INTENSITY_LABEL[value]}
      </p>
    </div>
  );
}
