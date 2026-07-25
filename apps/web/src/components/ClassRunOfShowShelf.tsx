import { useEffect, useMemo, useState } from 'react';
import type { ClassListItem } from '@ritmofit/shared';
import { getClassShelfPayload } from '../lib/api.js';
import {
  CLASS_ORDERING_OPTIONS,
  classNextStep,
  orderClassesBy,
  orderingSummary,
  readStoredOrdering,
  storeOrdering,
  type ClassDetailState,
  type ClassOrdering,
} from '../lib/class-ordering.js';
import { formatDuration, formatTemplateLabel } from '../lib/class-summary.js';
import { StatusLabel } from './SharedState.js';
import { ClassPulse } from './ClassPulse.js';

/** How many ranked classes the shelf shows. */
const MAX_SHELF_CLASSES = 4;
/**
 * How many classes are read to rank them. Ranking needs each class's run-payload,
 * so the shelf reads a bounded pool of the most recently touched classes rather
 * than the whole library — but the pool is wider than the four cards it shows, or
 * a finished class that has not been opened lately could never reach the top
 * (P0-02: today's shelf picks its four by recency and only then ranks them).
 */
const SHELF_DETAIL_POOL = 12;
const DETAIL_CONCURRENCY = 2;

function poolClasses(classes: readonly ClassListItem[]): ClassListItem[] {
  return [...classes]
    .sort(
      (a, b) =>
        (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt) ||
        b.updatedAt - a.updatedAt ||
        a.title.localeCompare(b.title),
    )
    .slice(0, SHELF_DETAIL_POOL);
}

export function ClassRunOfShowShelf({
  classes,
  confirmedPulseIds,
  onTogglePulseConfirmation,
  onOpen,
  onPreview,
}: {
  classes: ClassListItem[];
  confirmedPulseIds: ReadonlySet<string>;
  onTogglePulseConfirmation: (classId: string) => void;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
}) {
  const candidates = useMemo(() => poolClasses(classes), [classes]);
  const candidateKey = candidates.map((cls) => cls.id).join('|');
  const [details, setDetails] = useState<Record<string, ClassDetailState>>({});
  const [retryRevision, setRetryRevision] = useState(0);
  const [ordering, setOrdering] = useState<ClassOrdering>(readStoredOrdering);

  useEffect(() => {
    let active = true;
    setDetails(Object.fromEntries(candidates.map((cls) => [cls.id, { status: 'loading' }])));
    const queue = [...candidates];

    const worker = async () => {
      while (queue.length > 0) {
        const cls = queue.shift();
        if (!cls) return;
        try {
          const payload = await getClassShelfPayload(cls.id);
          if (!payload || !Array.isArray(payload.tracks)) {
            throw new Error('Class details unavailable');
          }
          if (!active) return;
          setDetails((current) => ({ ...current, [cls.id]: { status: 'ready', payload } }));
        } catch {
          if (!active) return;
          setDetails((current) => ({ ...current, [cls.id]: { status: 'error' } }));
        }
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(DETAIL_CONCURRENCY, queue.length) }, () => worker()),
    );
    return () => {
      active = false;
    };
  }, [candidateKey, retryRevision]);

  const allSettled = candidates.every((cls) => {
    const detail = details[cls.id];
    return detail && detail.status !== 'loading';
  });
  // Rank only once every payload in the pool has resolved: a partial ranking would
  // reshuffle the cards under the instructor's cursor as each fetch lands.
  const ranked = allSettled
    ? orderClassesBy(ordering, candidates, (cls) => classNextStep(details[cls.id]))
    : candidates;
  const ordered = ranked.slice(0, MAX_SHELF_CLASSES);
  const poolLabel =
    classes.length > candidates.length
      ? `${ordered.length} of your ${candidates.length} most recent`
      : `${ordered.length} priority ${ordered.length === 1 ? 'class' : 'classes'}`;

  const chooseOrdering = (next: ClassOrdering) => {
    setOrdering(next);
    storeOrdering(next);
  };

  return (
    <section aria-labelledby="run-of-show-heading" className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="rf-eyebrow">Classes</p>
          <h2
            id="run-of-show-heading"
            className="mt-2 text-balance font-display text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl"
          >
            Pick up where the energy left off.
          </h2>
          <p className="mt-2 max-w-prose font-ui text-sm leading-6 text-text-secondary">
            {orderingSummary(ordering)}
          </p>
        </div>
        <span className="shrink-0 font-data text-xs text-text-tertiary">{poolLabel}</span>
      </div>

      {/* The ordering is a choice, not a hidden rule: both options are named, the
          active one carries `aria-pressed`, and the sentence above states it in
          words so it is never conveyed by selection styling alone. */}
      <div role="group" aria-label="Order classes by" className="mt-4 flex flex-wrap gap-2">
        {CLASS_ORDERING_OPTIONS.map((option) => {
          const active = option.value === ordering;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => chooseOrdering(option.value)}
              className={`min-h-11 rounded-control border px-4 font-ui text-sm font-semibold rf-focus-ring sm:rounded-pill ${
                active
                  ? 'border-interactive bg-interactive/15 text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:border-interactive/45 hover:text-text-primary'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {ordered.map((cls) => {
          const detail = details[cls.id];
          const step = classNextStep(detail);
          const payload = detail?.status === 'ready' ? detail.payload : null;
          const template = formatTemplateLabel(cls.template);
          return (
            <article
              key={cls.id}
              className="flex min-w-0 flex-col rounded-card border border-border-subtle bg-bg-raised p-4 sm:p-5"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-data text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                    {step.eyebrow}
                  </p>
                  <h3 className="mt-1 truncate font-display text-xl font-semibold text-text-primary">
                    {cls.title}
                  </h3>
                </div>
                {cls.totalDurationMs > 0 && (
                  <span className="shrink-0 font-data text-lg text-text-primary">
                    {formatDuration(cls.totalDurationMs)}
                  </span>
                )}
              </div>
              <p className="mt-1 font-data text-xs text-text-tertiary">
                {[template, `${cls.trackCount} ${cls.trackCount === 1 ? 'track' : 'tracks'}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <div className="mt-4 flex-1">
                {!detail || detail.status === 'loading' ? (
                  <div
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                    className="rounded-card bg-bg-sunken p-4"
                  >
                    <StatusLabel kind="loading" label={`Deriving ${cls.title} shape`} />
                    <div
                      aria-hidden="true"
                      className="mt-4 h-16 rounded-card bg-border-subtle/50"
                    />
                  </div>
                ) : detail.status === 'error' ? (
                  <div className="rounded-card bg-bg-sunken p-4" role="status">
                    <StatusLabel kind="unavailable" label="Class details unavailable" />
                    <p className="mt-2 font-ui text-xs leading-5 text-text-secondary">
                      The class remains safe in your library. Shape and readiness could not be
                      checked.
                    </p>
                  </div>
                ) : (
                  <ClassPulse
                    payload={payload!}
                    compact
                    confirmed={confirmedPulseIds.has(cls.id)}
                    onConfirm={() => onTogglePulseConfirmation(cls.id)}
                  />
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusLabel
                  kind={
                    detail?.status === 'ready'
                      ? step.teachable
                        ? 'recovered'
                        : 'empty'
                      : detail?.status === 'error'
                        ? 'unavailable'
                        : 'loading'
                  }
                  label={step.detail}
                />
              </div>
              {/* Each control names the class it acts on, so two cards never share an
                  accessible name even when their next step is genuinely the same. The
                  visible text leads the accessible name (WCAG 2.5.3). */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(cls)}
                  aria-label={`${step.action} — ${cls.title}`}
                  className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring sm:rounded-pill"
                >
                  {step.action}
                </button>
                {payload && (
                  <button
                    type="button"
                    onClick={() => onPreview(cls)}
                    aria-label={`Rehearsal view — ${cls.title}`}
                    className="min-h-11 rounded-control border border-interactive/50 px-4 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 rf-focus-ring sm:rounded-pill"
                  >
                    Rehearsal view
                  </button>
                )}
                {detail?.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => setRetryRevision((revision) => revision + 1)}
                    aria-label={`Retry details — ${cls.title}`}
                    className="min-h-11 rounded-control px-3 font-ui text-sm text-text-secondary hover:text-text-primary rf-focus-ring sm:rounded-pill"
                  >
                    Retry details
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
