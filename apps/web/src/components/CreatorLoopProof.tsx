import { ClassPulseView } from './ClassPulse.js';
import { deriveClassPulse } from '../lib/class-pulse.js';

const DEMO_PULSE = deriveClassPulse([
  { classTrackId: 'demo-warmup', order: 0, durationMs: 240_000, effort: 'easy' },
  { classTrackId: 'demo-build', order: 1, durationMs: 300_000, effort: 'mod' },
  { classTrackId: 'demo-climb', order: 2, durationMs: 360_000, effort: 'hard' },
  { classTrackId: 'demo-recovery', order: 3, durationMs: 210_000, effort: 'easy' },
  { classTrackId: 'demo-peak', order: 4, durationMs: 270_000, effort: 'all_out' },
  { classTrackId: 'demo-finish', order: 5, durationMs: 240_000, effort: 'mod' },
]);

const LOOP_STEPS = [
  ['Find', 'Source music'],
  ['Shape', 'Order the arc'],
  ['Score', 'Add cues'],
  ['Lead', 'Run Live'],
] as const;

/**
 * Synthetic, authored product proof for public and authentication surfaces.
 * The pulse uses the same order/duration/effort derivation as the signed-in app;
 * no provider audio, account data, or inferred analysis enters this example.
 */
export function CreatorLoopProof({ compact = false, id }: { compact?: boolean; id?: string }) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className="min-w-0 rounded-panel border border-border-subtle bg-bg-raised p-4 shadow-card sm:p-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="rf-eyebrow">A class taking shape</p>
          <h2
            id={id ? `${id}-heading` : undefined}
            className="mt-2 font-display text-xl font-semibold text-text-primary"
          >
            Saturday Heat — 45
          </h2>
          <p className="mt-1 font-ui text-xs text-text-tertiary">
            Synthetic class · authored order, duration, and effort
          </p>
        </div>
        <span className="shrink-0 font-data text-lg font-semibold text-text-primary">40:50</span>
      </div>

      <ClassPulseView model={DEMO_PULSE} compact={compact} className="mt-4" />

      <ol className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4">
        {LOOP_STEPS.map(([verb, detail], index) => (
          <li key={verb} className="min-w-0 bg-bg-base p-3">
            <span className="font-data text-[10px] text-text-tertiary">0{index + 1}</span>
            <strong className="mt-1 block font-ui text-sm text-text-primary">{verb}</strong>
            <span className="mt-0.5 block font-ui text-[11px] leading-4 text-text-tertiary">
              {detail}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
