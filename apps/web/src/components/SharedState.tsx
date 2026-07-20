import type { ReactNode } from 'react';

export type SharedStateKind =
  | 'loading'
  | 'empty'
  | 'unavailable'
  | 'error'
  | 'update'
  | 'disabled'
  | 'retrying'
  | 'recovered';

const STATE_META: Record<SharedStateKind, { glyph: string; tone: string; defaultLabel: string }> = {
  loading: { glyph: '◌', tone: 'text-state-info', defaultLabel: 'Loading' },
  empty: { glyph: '−', tone: 'text-text-tertiary', defaultLabel: 'Empty' },
  unavailable: { glyph: '!', tone: 'text-state-caution', defaultLabel: 'Unavailable' },
  error: { glyph: '!', tone: 'text-state-danger', defaultLabel: 'Interrupted' },
  update: { glyph: '↻', tone: 'text-state-caution', defaultLabel: 'Update ready' },
  disabled: { glyph: '⊘', tone: 'text-text-tertiary', defaultLabel: 'Unavailable' },
  retrying: { glyph: '↻', tone: 'text-state-info', defaultLabel: 'Retrying' },
  recovered: { glyph: '✓', tone: 'text-state-positive', defaultLabel: 'Recovered' },
};

/**
 * Color-independent state identity. The glyph and visible label carry meaning;
 * the semantic color only reinforces it. The caller owns announcement timing so
 * shared status rows do not accidentally create nested or noisy live regions.
 */
export function StatusLabel({
  kind,
  label,
  className = '',
}: {
  kind: SharedStateKind;
  label?: string;
  className?: string;
}) {
  const meta = STATE_META[kind];

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2 font-ui text-xs font-semibold ${meta.tone} ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-control border border-current/35 font-data text-[11px] leading-none"
      >
        {meta.glyph}
      </span>
      <span>{label ?? meta.defaultLabel}</span>
    </span>
  );
}

/**
 * The shared recovery grammar, in a fixed reading order:
 * what happened -> what remains safe -> best next action -> secondary escape.
 */
export function RecoveryState({
  kind,
  title,
  event,
  safety,
  primaryAction,
  secondaryAction,
  statusLabel,
  role,
  headingLevel = 'h2',
  compact = false,
  className = '',
}: {
  kind: Extract<SharedStateKind, 'error' | 'unavailable' | 'update'>;
  title: string;
  event: string;
  safety: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  statusLabel?: string;
  role?: 'alert' | 'status';
  headingLevel?: 'h1' | 'h2';
  compact?: boolean;
  className?: string;
}) {
  const Heading = headingLevel;
  const safetyTone = kind === 'error' ? 'text-state-danger' : 'text-state-caution';

  return (
    <section
      role={role}
      aria-live={role === 'status' ? 'polite' : undefined}
      className={`rounded-card border border-border-subtle bg-bg-raised ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      } ${className}`}
    >
      <StatusLabel kind={kind} label={statusLabel} />
      <Heading
        className={`mt-3 text-balance font-display font-bold tracking-[-0.03em] text-text-primary ${
          compact ? 'text-lg leading-6' : 'text-3xl leading-9 sm:text-4xl sm:leading-[2.75rem]'
        }`}
      >
        {title}
      </Heading>
      <p className="mt-3 font-ui text-sm leading-6 text-text-secondary">{event}</p>
      <div className={`mt-4 border-l-2 border-current pl-3 ${safetyTone}`}>
        <p className="font-ui text-sm leading-5 text-text-secondary">{safety}</p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {primaryAction}
        {secondaryAction}
      </div>
    </section>
  );
}

/**
 * Session loading retains the silhouette of the creator workstation without
 * inventing classes, provider state, or account data before authentication is
 * known.
 */
export function WorkspaceLoadingState() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col bg-bg-base"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <header className="flex min-h-16 items-center border-b border-border-subtle px-4 sm:px-8">
        <span className="rf-brand-mark" aria-hidden="true">
          R
        </span>
        <span className="ml-2 font-display text-sm font-bold text-text-primary">Ritmo Studio</span>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-8">
        <div className="max-w-2xl">
          <p className="rf-eyebrow">Recovery</p>
          <h1 className="mt-2 text-balance font-display text-4xl font-bold leading-[1.05] tracking-[-0.04em] text-text-primary sm:text-6xl">
            Restoring your workspace…
          </h1>
          <p className="mt-4 font-ui text-sm leading-6 text-text-secondary sm:text-base">
            Classes, music connections, and your last open workbench are loading.
          </p>
        </div>
        <section className="rounded-card border border-border-subtle bg-bg-sunken p-4 sm:p-5">
          <StatusLabel kind="loading" label="Loading workspace" />
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.45fr)]">
            <div className="rounded-card bg-bg-raised p-4" aria-hidden="true">
              <span className="block h-3 w-2/3 rounded-pill bg-border-strong" />
              <span className="mt-3 block h-3 w-1/2 rounded-pill bg-border-subtle" />
              <div className="mt-6 flex h-20 items-end gap-2">
                {['h-8', 'h-12', 'h-9', 'h-16', 'h-10'].map((height, index) => (
                  <span
                    key={index}
                    className={`flex-1 rounded-control bg-border-strong ${height}`}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-card bg-bg-raised p-4" aria-hidden="true">
              <span className="block h-3 w-1/2 rounded-pill bg-border-strong" />
              <span className="mt-3 block h-3 w-full rounded-pill bg-border-subtle" />
              <span className="mt-2 block h-3 w-4/5 rounded-pill bg-border-subtle" />
              <span className="mt-6 block h-11 w-28 rounded-input bg-border-strong" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
