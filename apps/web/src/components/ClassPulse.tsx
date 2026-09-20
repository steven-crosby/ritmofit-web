import { useId } from 'react';
import type { RunPayload } from '@ritmofit/shared';
import {
  classPulseCoverageLabel,
  classPulseFromPayload,
  type ClassPulseModel,
} from '../lib/class-pulse.js';
import { formatDuration } from '../lib/class-summary.js';

const HEIGHT: Record<NonNullable<ClassPulseModel['segments'][number]['effort']>, number> = {
  easy: 30,
  mod: 48,
  hard: 70,
  all_out: 88,
};

const EFFORT_LABEL = {
  easy: 'easy',
  mod: 'moderate',
  hard: 'hard',
  all_out: 'all out',
} as const;

/** Zone words, so the legend reads in the same vocabulary as the inspector. */
const EFFORT_ZONE_LABEL = {
  easy: 'Z1 Build',
  mod: 'Z2 Push',
  hard: 'Z3 Attack',
  all_out: 'Z4 All Out',
} as const;

export function ClassPulse({
  payload,
  compact = false,
  variant = 'card',
  className = '',
}: {
  payload: RunPayload;
  compact?: boolean;
  variant?: 'card' | 'sparkline';
  className?: string;
}) {
  return (
    <ClassPulseView
      model={classPulseFromPayload(payload)}
      totalDurationMs={payload.class.totalDurationMs}
      compact={compact}
      variant={variant}
      className={className}
    />
  );
}

export function ClassPulseView({
  model,
  totalDurationMs,
  compact = false,
  variant = 'card',
  className = '',
}: {
  model: ClassPulseModel;
  /** Class runtime, for the time axis under the chart. Omitted = no axis. */
  totalDurationMs?: number;
  compact?: boolean;
  variant?: 'card' | 'sparkline';
  className?: string;
}) {
  const unscoredPatternId = `class-pulse-unscored-${useId().replaceAll(':', '')}`;
  const coverage = classPulseCoverageLabel(model);
  // The arc in words describes what is DRAWN, not the stored zones — on an
  // unshaped class those disagree, and the picture is what the reader is asking
  // about. An unscored track says so, because its height is derived but its
  // effort genuinely is not known.
  const effortArc = model.segments
    .map((segment) =>
      segment.effort
        ? EFFORT_LABEL[segment.shapeEffort ?? segment.effort]
        : segment.shapeEffort
          ? `unscored (drawn ${EFFORT_LABEL[segment.shapeEffort]})`
          : 'unscored',
    )
    .join(', ');
  const accessibleLabel =
    model.state === 'empty'
      ? 'Class Pulse is empty. Add tracks to derive the class shape.'
      : `Class Pulse, ${
          model.provisional
            ? 'auto-shaped from track order and length'
            : 'derived from track order, duration, and effort'
        }: ${effortArc}. ${coverage}`;

  if (variant === 'sparkline') {
    return (
      <PulseChart
        model={model}
        accessibleLabel={accessibleLabel}
        unscoredPatternId={unscoredPatternId}
        className={`block h-8 w-28 ${className}`}
      />
    );
  }

  return (
    <section
      aria-label="Class Pulse"
      className={`rounded-card border border-border-subtle bg-bg-sunken p-3 ${compact ? '' : 'sm:p-4'} ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="font-data text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Class Pulse
        </span>
        {/* Where the shape came from, and nothing else. The old
            "derived · confirm" pill was a control whose entire effect was to
            relabel itself for the rest of the session: it saved nothing, it
            changed nothing, and on a class the instructor had scored it was a
            caution about their own work. Deleted rather than explained.
            A *guessed* shape still has to say so (canon 10 §4) — as a state,
            on the caution channel, with the caption carrying the refine step. */}
        {model.provisional ? (
          <span className="font-data text-[10px] font-semibold uppercase tracking-wide text-state-caution">
            ◇ auto-shaped
          </span>
        ) : (
          <span className="font-data text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            {/* Not "your": this view also renders on the signed-out marketing
                page over a synthetic class nobody reading it authored. */}
            {model.coverage.scoredCount > 0 ? 'from track efforts' : 'no effort scored yet'}
          </span>
        )}
      </div>
      {/* What the picture is, in one line. The chart used to arrive unlabeled
          between a readiness list and a track list, so its axes had to be
          guessed. */}
      {!compact && (
        <p className="mt-1 font-ui text-xs text-text-secondary">
          Effort over time, start to finish. Each bar is a track — wider is longer, taller is
          harder.
        </p>
      )}

      {/* The caption below is the ONE place `coverage` is printed. An empty pulse
          used to render it here as well, so the invitation appeared twice on every
          empty class (CLS-01, CLS-03, CLS-04). The empty state keeps its reserved
          height so the card doesn't collapse — it just no longer speaks twice. */}
      {model.segments.length === 0 ? (
        <div
          aria-hidden
          className={`flex items-center justify-center ${compact ? 'min-h-16' : 'min-h-24'}`}
        />
      ) : (
        <PulseChart
          model={model}
          accessibleLabel={accessibleLabel}
          unscoredPatternId={unscoredPatternId}
          className={`mt-3 block w-full ${compact ? 'h-16' : 'h-24 sm:h-28'}`}
        />
      )}

      {/* The axis needs a real end time to mean anything — a bare "finish"
          labels nothing. Callers that don't know the runtime get no axis. */}
      {!compact && model.segments.length > 0 && totalDurationMs != null && (
        <div
          aria-hidden
          className="mt-1 flex items-center justify-between font-data text-[10px] text-text-tertiary"
        >
          <span>0:00 start</span>
          <span>{formatDuration(totalDurationMs)} finish</span>
        </div>
      )}

      {!compact && model.segments.length > 0 && <PulseLegend model={model} />}

      <p className="mt-2 font-ui text-xs text-text-tertiary">{coverage}</p>
    </section>
  );
}

function PulseChart({
  model,
  accessibleLabel,
  unscoredPatternId,
  className,
}: {
  model: ClassPulseModel;
  accessibleLabel: string;
  unscoredPatternId: string;
  className: string;
}) {
  if (model.segments.length === 0) {
    return <div aria-hidden className={className} />;
  }
  return (
    <svg
      role="img"
      aria-label={accessibleLabel}
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <pattern id={unscoredPatternId} width="12" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M-3 3 L3 -3 M0 12 L12 0 M9 15 L15 9"
            stroke="var(--rf-color-semantic-text-tertiary)"
            strokeWidth="2"
            opacity="0.35"
          />
        </pattern>
      </defs>
      <line
        x1="0"
        x2="1000"
        y1="96"
        y2="96"
        stroke="var(--rf-color-semantic-border-default)"
        strokeWidth="2"
      />
      {model.segments.map((segment) => {
        // Height comes from the shape (derived on an unshaped class), fill from
        // the stored effort. Splitting them is what lets an entirely unscored
        // class show a real arc while every bar stays honestly hatched.
        const height = segment.shapeEffort ? HEIGHT[segment.shapeEffort] : 18;
        const x = segment.startRatio * 1000;
        const width = Math.max(1, segment.widthRatio * 1000);
        const color = segment.effort
          ? `var(--rf-color-intensity-${segment.shapeEffort ?? segment.effort})`
          : `url(#${unscoredPatternId})`;
        return (
          <g key={`${segment.classTrackId}:${segment.startRatio}`}>
            <rect x={x} y={96 - height} width={width} height={height} fill={color} opacity="0.72" />
            <line
              x1={x}
              x2={x + width}
              y1={96 - height}
              y2={96 - height}
              stroke={
                segment.effort
                  ? `var(--rf-color-intensity-${segment.shapeEffort ?? segment.effort})`
                  : 'var(--rf-color-semantic-text-tertiary)'
              }
              strokeWidth="3"
            />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The colour key. Height already carries the zone (canon 10 §4), so this exists
 * to name the colours a reader sees rather than to encode anything: without it,
 * four shades of copper and a hatch pattern are a picture with no caption.
 */
function PulseLegend({ model }: { model: ClassPulseModel }) {
  const drawn = (['easy', 'mod', 'hard', 'all_out'] as const).filter((effort) =>
    model.segments.some((segment) => (segment.shapeEffort ?? segment.effort) === effort),
  );
  const hasUnscored = model.segments.some((segment) => segment.effort == null);
  if (drawn.length === 0 && !hasUnscored) return null;
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-[10px] text-text-tertiary">
      {drawn.map((effort) => (
        <li key={effort} className="flex items-center gap-1">
          <span
            aria-hidden
            className="h-2 w-2.5 rounded-[2px]"
            style={{ backgroundColor: `var(--rf-color-intensity-${effort})`, opacity: 0.72 }}
          />
          {EFFORT_ZONE_LABEL[effort]}
        </li>
      ))}
      {hasUnscored && (
        <li className="flex items-center gap-1">
          <span
            aria-hidden
            className="h-2 w-2.5 rounded-[2px]"
            style={{
              // Same 45° hatch the unscored bars are filled with, at legend scale.
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent 0 2px, var(--rf-color-semantic-text-tertiary) 2px 3px)',
              opacity: 0.6,
            }}
          />
          Hatched = effort not set yet
        </li>
      )}
    </ul>
  );
}
