import { useEffect, useMemo, useState } from 'react';
import type { ClassListItem, RunPayload } from '@ritmofit/shared';
import { getClassShelfPayload } from '../lib/api.js';
import { classPulseFromPayload } from '../lib/class-pulse.js';
import { classReadiness } from '../lib/readiness.js';
import { formatDuration, formatTemplateLabel } from '../lib/class-summary.js';
import { StatusLabel } from './SharedState.js';
import { ClassPulse } from './ClassPulse.js';

type ShelfDetail =
  | { status: 'loading' }
  | { status: 'ready'; payload: RunPayload }
  | { status: 'error' };

const MAX_SHELF_CLASSES = 4;
const DETAIL_CONCURRENCY = 2;

function candidateClasses(classes: readonly ClassListItem[]): ClassListItem[] {
  return [...classes]
    .sort(
      (a, b) =>
        (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt) ||
        b.updatedAt - a.updatedAt ||
        a.title.localeCompare(b.title),
    )
    .slice(0, MAX_SHELF_CLASSES);
}

function nextStep(detail: ShelfDetail | undefined): {
  rank: number;
  eyebrow: string;
  action: string;
  detail: string;
} {
  if (!detail || detail.status === 'loading') {
    return { rank: 6, eyebrow: 'Reading class', action: 'Open class', detail: 'Checking shape…' };
  }
  if (detail.status === 'error') {
    return {
      rank: 5,
      eyebrow: 'Details unavailable',
      action: 'Open class',
      detail: 'The class remains in your library.',
    };
  }

  const payload = detail.payload;
  if (payload.tracks.length === 0) {
    return {
      rank: 0,
      eyebrow: 'Start shaping',
      action: 'Add the first track',
      detail: 'Empty draft',
    };
  }
  const readiness = classReadiness(payload);
  if (!readiness.runnable) {
    return {
      rank: 1,
      eyebrow: 'Complete the clock',
      action: 'Finish durations',
      detail: readiness.dimensions.find((dimension) => dimension.key === 'duration')?.detail ?? '',
    };
  }
  const pulse = classPulseFromPayload(payload);
  if (pulse.state === 'partial') {
    return {
      rank: 2,
      eyebrow: 'Continue shaping',
      action: 'Score the class',
      detail: `${pulse.coverage.scoredCount} of ${pulse.coverage.trackCount} efforts scored`,
    };
  }
  if (!readiness.fullyReady) {
    return {
      rank: 3,
      eyebrow: 'Refine before teaching',
      action: 'Finish refinements',
      detail: `Runnable · ${readiness.attentionCount} to finish`,
    };
  }
  return { rank: 4, eyebrow: 'Ready to rehearse', action: 'Rehearse class', detail: 'Runnable' };
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
  const candidates = useMemo(() => candidateClasses(classes), [classes]);
  const candidateKey = candidates.map((cls) => cls.id).join('|');
  const [details, setDetails] = useState<Record<string, ShelfDetail>>({});
  const [retryRevision, setRetryRevision] = useState(0);

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
  const ordered = allSettled
    ? [...candidates].sort((a, b) => {
        const rank = nextStep(details[a.id]).rank - nextStep(details[b.id]).rank;
        return rank || b.updatedAt - a.updatedAt || a.title.localeCompare(b.title);
      })
    : candidates;

  return (
    <section aria-labelledby="run-of-show-heading" className="min-w-0 xl:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="rf-eyebrow">Classes</p>
          <h2
            id="run-of-show-heading"
            className="mt-2 text-balance font-display text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl"
          >
            Pick up where the energy left off.
          </h2>
          <p className="mt-2 max-w-prose font-ui text-sm leading-6 text-text-secondary">
            Ordered by the next creative step, then readiness and recency.
          </p>
        </div>
        <span className="font-data text-xs text-text-tertiary">
          {ordered.length} priority {ordered.length === 1 ? 'class' : 'classes'}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {ordered.map((cls) => {
          const detail = details[cls.id];
          const step = nextStep(detail);
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
                      ? step.rank === 4
                        ? 'recovered'
                        : 'empty'
                      : detail?.status === 'error'
                        ? 'unavailable'
                        : 'loading'
                  }
                  label={step.detail}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(cls)}
                  className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
                >
                  {step.action}
                </button>
                {payload && (
                  <button
                    type="button"
                    onClick={() => onPreview(cls)}
                    className="min-h-11 rounded-control border border-interactive/50 px-4 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 sm:rounded-pill"
                  >
                    Rehearsal view
                  </button>
                )}
                {detail?.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => setRetryRevision((revision) => revision + 1)}
                    className="min-h-11 rounded-control px-3 font-ui text-sm text-text-secondary hover:text-text-primary sm:rounded-pill"
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
