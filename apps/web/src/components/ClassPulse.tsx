import { useId } from 'react';
import type { RunPayload } from '@ritmofit/shared';
import {
  classPulseCoverageLabel,
  classPulseFromPayload,
  type ClassPulseModel,
} from '../lib/class-pulse.js';

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

export function ClassPulse({
  payload,
  confirmed = false,
  onConfirm,
  compact = false,
  className = '',
}: {
  payload: RunPayload;
  confirmed?: boolean;
  onConfirm?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <ClassPulseView
      model={classPulseFromPayload(payload)}
      confirmed={confirmed}
      onConfirm={onConfirm}
      compact={compact}
      className={className}
    />
  );
}

export function ClassPulseView({
  model,
  confirmed = false,
  onConfirm,
  compact = false,
  className = '',
}: {
  model: ClassPulseModel;
  confirmed?: boolean;
  onConfirm?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const unscoredPatternId = `class-pulse-unscored-${useId().replaceAll(':', '')}`;
  const coverage = classPulseCoverageLabel(model);
  const effortArc = model.segments
    .map((segment) => (segment.effort ? EFFORT_LABEL[segment.effort] : 'unscored'))
    .join(', ');
  const accessibleLabel =
    model.state === 'empty'
      ? 'Class Pulse is empty. Add tracks to derive the class shape.'
      : `Class Pulse, derived from track order, duration, and effort: ${effortArc}. ${coverage}`;

  return (
    <section
      aria-label="Class Pulse"
      className={`rounded-card border border-border-subtle bg-bg-sunken p-3 ${compact ? '' : 'sm:p-4'} ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="font-data text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Class Pulse
        </span>
        {onConfirm ? (
          <button
            type="button"
            onClick={onConfirm}
            aria-pressed={confirmed}
            className="min-h-11 rounded-control border border-state-caution/45 px-3 font-data text-[10px] font-semibold uppercase tracking-wide text-state-caution hover:bg-state-caution/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive sm:min-h-8 sm:rounded-pill"
          >
            ◇ {confirmed ? 'derived · confirmed for this view' : 'derived · confirm'}
          </button>
        ) : (
          <span className="font-data text-[10px] font-semibold uppercase tracking-wide text-state-caution">
            ◇ derived · confirm
          </span>
        )}
      </div>

      {model.segments.length === 0 ? (
        <div className={`flex items-center justify-center ${compact ? 'min-h-16' : 'min-h-24'}`}>
          <p className="font-ui text-xs text-text-tertiary">{coverage}</p>
        </div>
      ) : (
        <svg
          role="img"
          aria-label={accessibleLabel}
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          className={`mt-3 block w-full ${compact ? 'h-16' : 'h-24 sm:h-28'}`}
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
            const height = segment.effort ? HEIGHT[segment.effort] : 18;
            const x = segment.startRatio * 1000;
            const width = Math.max(1, segment.widthRatio * 1000);
            const color = segment.effort
              ? `var(--rf-color-intensity-${segment.effort})`
              : `url(#${unscoredPatternId})`;
            return (
              <g key={segment.classTrackId}>
                <rect
                  x={x}
                  y={96 - height}
                  width={width}
                  height={height}
                  fill={color}
                  opacity="0.72"
                />
                <line
                  x1={x}
                  x2={x + width}
                  y1={96 - height}
                  y2={96 - height}
                  stroke={
                    segment.effort
                      ? `var(--rf-color-intensity-${segment.effort})`
                      : 'var(--rf-color-semantic-text-tertiary)'
                  }
                  strokeWidth="3"
                />
              </g>
            );
          })}
        </svg>
      )}

      <p className="mt-2 font-ui text-xs text-text-tertiary">{coverage}</p>
    </section>
  );
}
