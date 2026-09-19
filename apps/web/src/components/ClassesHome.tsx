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
import { errorReference } from '../lib/error-reference.js';
import {
  CLASS_SORT_OPTIONS,
  DEFAULT_CLASS_SORT,
  libraryView,
  organizeClasses,
  type ClassSortKey,
  type ListStatus,
} from '../lib/library-state.js';
import { ClassPulse } from './ClassPulse.js';
import { LibraryOrganizeControls, TagFilter } from './LibraryOrganize.js';
import { RecoveryState, StatusLabel } from './SharedState.js';

/** Search, sort, and tags stay off until the loaded library needs them. */
export const ORGANIZE_THRESHOLD = 8;
const DETAIL_CONCURRENCY = 2;

export function ClassesHome({
  classes,
  status,
  libraryError,
  activeTag,
  knownTags,
  hasMore,
  loadingMore,
  onOpen,
  onPreview,
  onDuplicate,
  onSelectTag,
  onClearTag,
  onRetry,
  onLoadMore,
  onStartClass,
}: {
  classes: ClassListItem[];
  status: ListStatus;
  libraryError: string | null;
  activeTag: string | null;
  knownTags: string[];
  hasMore: boolean;
  loadingMore: boolean;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onSelectTag: (tag: string | null) => void;
  onClearTag: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onStartClass: () => void;
}) {
  const view = libraryView(status, classes.length);

  if (view === 'loading') {
    return (
      <section
        className="mx-auto min-w-0 w-full max-w-3xl rounded-card border border-border-subtle bg-bg-raised p-5 sm:p-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <StatusLabel kind="loading" label="Loading your class library" />
        <h2 className="mt-3 font-display text-2xl font-semibold text-text-primary">
          Reading your next run of show…
        </h2>
        <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
          Ritmo is checking classes before it suggests a next step.
        </p>
        <div aria-hidden="true" className="mt-5 flex flex-col gap-3">
          <span className="h-16 rounded-card bg-bg-sunken" />
          <span className="h-16 rounded-card bg-bg-sunken" />
        </div>
      </section>
    );
  }

  if (view === 'error') {
    return (
      <div className="mx-auto min-w-0 w-full max-w-3xl">
        <RecoveryState
          kind="unavailable"
          role="alert"
          statusLabel="Class library unavailable"
          title="Your library is temporarily unavailable."
          event={`Ritmo could not read the class list. This is not an empty account. Reference ${errorReference(
            'CLS',
            libraryError,
          )}.`}
          safety="No class was removed. A new draft remains a separate, safe starting point."
          primaryAction={
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
            >
              Try the library again
            </button>
          }
          secondaryAction={
            <button
              type="button"
              onClick={onStartClass}
              className="min-h-11 rounded-control border border-interactive/50 px-4 font-ui text-sm font-semibold text-interactive sm:rounded-pill"
            >
              Start a new draft
            </button>
          }
        />
      </div>
    );
  }

  if (view === 'empty' && activeTag) {
    return (
      <section className="mx-auto min-w-0 w-full max-w-3xl rounded-card border border-border-subtle bg-bg-raised p-5 sm:p-6">
        <StatusLabel kind="empty" label={`No classes tagged #${activeTag}`} />
        <h2 className="mt-3 font-display text-2xl font-semibold text-text-primary">
          This filter has no classes yet.
        </h2>
        <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
          Clear the filter to return to your loaded classes. Nothing was removed.
        </p>
        <button
          type="button"
          onClick={onClearTag}
          className="mt-4 min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
        >
          Clear #{activeTag} filter
        </button>
      </section>
    );
  }

  if (view === 'empty') {
    return (
      <section className="mx-auto min-w-0 w-full max-w-3xl">
        <p className="rf-eyebrow">Classes</p>
        <h2 className="mt-2 text-balance font-display text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl">
          Pick a discipline. Ritmo lays out the class. You bring the music.
        </h2>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStartClass}
            className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring sm:rounded-pill"
          >
            Start a class
          </button>
          <button
            type="button"
            onClick={onStartClass}
            className="min-h-11 rounded-control px-3 font-ui text-sm text-text-tertiary hover:text-text-secondary rf-focus-ring"
          >
            Start empty
          </button>
        </div>
      </section>
    );
  }

  return (
    <ClassesHomeList
      classes={classes}
      knownTags={knownTags}
      activeTag={activeTag}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onOpen={onOpen}
      onPreview={onPreview}
      onDuplicate={onDuplicate}
      onSelectTag={onSelectTag}
      onLoadMore={onLoadMore}
      onStartClass={onStartClass}
    />
  );
}

function ClassesHomeList({
  classes,
  knownTags,
  activeTag,
  hasMore,
  loadingMore,
  onOpen,
  onPreview,
  onDuplicate,
  onSelectTag,
  onLoadMore,
  onStartClass,
}: {
  classes: ClassListItem[];
  knownTags: string[];
  activeTag: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onSelectTag: (tag: string | null) => void;
  onLoadMore: () => void;
  onStartClass: () => void;
}) {
  const showOrganize = classes.length > ORGANIZE_THRESHOLD;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ClassSortKey>(DEFAULT_CLASS_SORT);
  const [details, setDetails] = useState<Record<string, ClassDetailState>>({});
  const [retryRevision, setRetryRevision] = useState(0);
  const [ordering, setOrdering] = useState<ClassOrdering>(readStoredOrdering);

  const candidateKey = classes.map((cls) => cls.id).join('|');

  useEffect(() => {
    let active = true;
    setDetails(Object.fromEntries(classes.map((cls) => [cls.id, { status: 'loading' }])));
    const queue = [...classes];

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

  const searched = useMemo(
    () => organizeClasses(classes, { query, sort: 'recently_updated' }),
    [classes, query],
  );
  const usingManualSort = showOrganize && sort !== 'recently_updated';
  const visible = useMemo(() => {
    const stepFor = (cls: ClassListItem) => classNextStep(details[cls.id]);
    if (usingManualSort) {
      return organizeClasses(searched, { query: '', sort });
    }
    return orderClassesBy(ordering, searched, stepFor);
  }, [details, ordering, searched, sort, usingManualSort]);

  const trimmedQuery = query.trim();
  const narrowed = trimmedQuery.length > 0 && visible.length !== classes.length;

  const chooseOrdering = (next: ClassOrdering) => {
    setOrdering(next);
    storeOrdering(next);
  };

  return (
    <section aria-labelledby="classes-home-heading" className="mx-auto min-w-0 w-full max-w-3xl">
      <p className="rf-eyebrow">Classes</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2
            id="classes-home-heading"
            className="text-balance font-display text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl"
          >
            Pick up where the energy left off.
          </h2>
          <p className="mt-2 max-w-prose font-ui text-sm leading-6 text-text-secondary">
            {usingManualSort
              ? `Sorted by ${
                  CLASS_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort
                }.`
              : orderingSummary(ordering)}
          </p>
        </div>
        <button
          type="button"
          onClick={onStartClass}
          className="min-h-11 shrink-0 rounded-control px-4 font-ui text-sm font-semibold text-text-secondary hover:text-text-primary rf-focus-ring sm:rounded-pill"
        >
          Start a class
        </button>
      </div>

      {!usingManualSort && (
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
      )}

      {showOrganize && (
        <div className="mt-4 flex flex-col gap-3">
          <TagFilter knownTags={knownTags} activeTag={activeTag} onSelectTag={onSelectTag} />
          <LibraryOrganizeControls
            query={query}
            sort={sort}
            onQueryChange={setQuery}
            onSortChange={setSort}
          />
          {narrowed && (
            <p className="font-data text-xs text-text-tertiary">
              {visible.length} of {classes.length} loaded
            </p>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-2">
          <p className="font-ui text-sm text-text-tertiary">
            No loaded classes match “<span className="text-text-secondary">{trimmedQuery}</span>”.
          </p>
          <button
            type="button"
            className="min-h-11 rounded-control border border-interactive px-3 font-ui text-sm text-interactive sm:min-h-8 sm:rounded-pill"
            onClick={() => setQuery('')}
          >
            Show all classes
          </button>
        </div>
      ) : (
        <ol className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
          {visible.map((cls, index) => (
            <ClassHomeRow
              key={cls.id}
              cls={cls}
              detail={details[cls.id]}
              isTop={index === 0}
              onOpen={onOpen}
              onPreview={onPreview}
              onDuplicate={onDuplicate}
              onRetryDetails={() => setRetryRevision((revision) => revision + 1)}
            />
          ))}
        </ol>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-start">
          <button
            type="button"
            className="min-h-11 rounded-control border border-interactive px-4 font-ui text-sm text-interactive disabled:opacity-40 sm:rounded-pill"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more classes'}
          </button>
        </div>
      )}
    </section>
  );
}

function ClassHomeRow({
  cls,
  detail,
  isTop,
  onOpen,
  onPreview,
  onDuplicate,
  onRetryDetails,
}: {
  cls: ClassListItem;
  detail: ClassDetailState | undefined;
  isTop: boolean;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onRetryDetails: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const step = classNextStep(detail);
  const payload = detail?.status === 'ready' ? detail.payload : null;
  const template = formatTemplateLabel(cls.template);
  const tracksLabel = `${cls.trackCount} ${cls.trackCount === 1 ? 'track' : 'tracks'}`;
  const meta = [
    template,
    tracksLabel,
    cls.totalDurationMs > 0 ? formatDuration(cls.totalDurationMs) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const statusKind =
    detail?.status === 'ready'
      ? step.teachable
        ? 'recovered'
        : 'empty'
      : detail?.status === 'error'
        ? 'unavailable'
        : 'loading';

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-4 ${
        isTop
          ? 'md:grid-cols-[minmax(0,1fr)_7.5rem_auto_auto_auto]'
          : 'md:grid-cols-[minmax(0,1fr)_7.5rem_auto_auto]'
      }`}
    >
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(cls)}
          className="block max-w-full truncate text-left font-display text-lg font-semibold text-text-primary rf-focus-ring"
        >
          {cls.title}
        </button>
        <p className="mt-0.5 font-data text-xs text-text-tertiary">{meta}</p>
      </div>

      <span className="hidden justify-self-end md:block">
        {payload ? (
          <ClassPulse payload={payload} variant="sparkline" />
        ) : (
          <span aria-hidden className="block h-8 w-28 rounded-control bg-bg-sunken" />
        )}
      </span>

      <StatusLabel kind={statusKind} label={step.detail} />

      {isTop && (
        <button
          type="button"
          onClick={() => onOpen(cls)}
          aria-label={`${step.action} — ${cls.title}`}
          className="col-span-2 min-h-11 justify-self-start rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring sm:rounded-pill md:col-span-1"
        >
          {step.action}
        </button>
      )}

      <div className="relative justify-self-start md:justify-self-end">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={`More actions — ${cls.title}`}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-control font-ui text-lg text-text-tertiary hover:text-text-primary rf-focus-ring"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 min-w-44 rounded-control border border-border-subtle bg-bg-raised p-1 shadow-lifted">
            {payload && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onPreview(cls);
                }}
                aria-label={`Rehearsal view — ${cls.title}`}
                className="flex min-h-11 w-full items-center rounded-control px-3 text-left font-ui text-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
              >
                Rehearsal view
              </button>
            )}
            {cls.accessLevel === 'owner' && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void onDuplicate(cls);
                }}
                aria-label={`Duplicate — ${cls.title}`}
                className="flex min-h-11 w-full items-center rounded-control px-3 text-left font-ui text-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
              >
                Duplicate
              </button>
            )}
            {detail?.status === 'error' && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onRetryDetails();
                }}
                aria-label={`Retry details — ${cls.title}`}
                className="flex min-h-11 w-full items-center rounded-control px-3 text-left font-ui text-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
              >
                Retry details
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
