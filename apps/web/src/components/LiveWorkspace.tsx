/**
 * The Live destination: the queue of classes to run next, each checked for readiness.
 * Its own chunk (RF-208), loaded the first time Live opens, so the startup bundle
 * stays under budget. Dashboard is its only screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClassListItem, RunPayload } from '@ritmofit/shared';
import { getRunPayload } from '../lib/api.js';
import { formatDuration, formatTemplateLabel } from '../lib/class-summary.js';
import { runBlockedMessage } from '../lib/duration.js';
import { classReadiness, type ClassReadiness } from '../lib/readiness.js';
import {
  CLASS_ORDERING_OPTIONS,
  classNextStep,
  orderClassesBy,
  readStoredOrdering,
  storeOrdering,
  type ClassOrdering,
} from '../lib/class-ordering.js';
import { summarizeQueue } from '../lib/live-readiness.js';
import { errMessage } from '../lib/errors.js';
import type { ListStatus } from '../lib/library-state.js';
import { ClassPulse } from './ClassPulse.js';
import { ClassReadinessSummary } from './ClassReadinessSummary.js';
import { LoadingSkeleton, RecoveryState, RETRY_BUTTON_CLASS } from './SharedState.js';

/**
 * Per-class run-payload fetch state for the Live queue. A class is only ever
 * treated as runnable once its payload has actually loaded and `classReadiness`
 * confirms the duration gate — loading/errored classes stay non-runnable so the
 * queue never shows a false "Run live" that Live Mode would then block.
 */
type LivePayloadState =
  | { status: 'loading' }
  | { status: 'ready'; payload: RunPayload; readiness: ClassReadiness }
  // RF-163, RF-201: `refreshing` is a card's own Retry in flight. The failed result
  // stays, so the queue stays resolved and the card keeps its action as "Checking…".
  | { status: 'error'; error: string; refreshing?: boolean };

/** One class's run-payload read, as the Live queue shows it. */
const readLivePayload = (classId: string): Promise<LivePayloadState> =>
  getRunPayload(classId).then(
    (payload) => ({ status: 'ready', payload, readiness: classReadiness(payload) }),
    (err: unknown) => ({ status: 'error', error: errMessage(err) }),
  );

/** Stable no-op for readiness chips that are disabled in the Live queue. */
const noop = (): void => {};

/** The Live queue (RF-201 tests render it directly). */
export function LiveWorkspace({
  classes,
  status,
  onRetry,
  onRunClass,
  onOpenClass,
}: {
  classes: ClassListItem[];
  status: ListStatus;
  onRetry: () => void;
  onRunClass: (classId: string) => void;
  onOpenClass: (cls: ClassListItem) => Promise<void>;
}) {
  // Any class with tracks belongs in the Live queue — even a duration-blocked one,
  // so the instructor sees exactly what's incomplete instead of it vanishing.
  // Empty classes have nothing to preflight and stay in Classes.
  const candidates = useMemo(() => classes.filter((cls) => cls.trackCount > 0), [classes]);
  const [payloads, setPayloads] = useState<Record<string, LivePayloadState>>({});
  const [ordering, setOrdering] = useState<ClassOrdering>(readStoredOrdering);
  // Latest payload map, readable inside the fetch effect without making it a
  // dependency (which would re-run the effect as each card resolves).
  const payloadsRef = useRef(payloads);
  payloadsRef.current = payloads;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // RF-201: each read of a class takes the next token, and only the class's newest read
  // may land, and only while the class is still in the queue. A Retry racing a candidate
  // change, or a class removed and added back, never leaves a stale or orphan result.
  const readTokens = useRef<Record<string, number>>({});
  // The ranking holds until the instructor acts (RF-201, owner default 2026-11-06): a
  // retried card ranks by the result it had before its Retry, so it keeps its place and
  // the copper does not move. A candidate change or a new ordering ranks from the latest.
  const [heldRank, setHeldRank] = useState<Record<string, LivePayloadState>>({});
  const [retryNote, setRetryNote] = useState('');
  const read = useCallback((classId: string, retry?: string) => {
    const token = (readTokens.current[classId] ?? 0) + 1;
    readTokens.current[classId] = token;
    return readLivePayload(classId).then((state) => {
      if (!mountedRef.current || readTokens.current[classId] !== token) return;
      setPayloads((prev) => (classId in prev ? { ...prev, [classId]: state } : prev));
      if (retry !== undefined)
        setRetryNote(
          state.status !== 'ready'
            ? `Still couldn’t check ${retry}.`
            : state.readiness.runnable
              ? `${retry} can run live.`
              : `${retry} checked: not ready to run yet.`,
        );
    });
  }, []);
  const retryOne = (cls: ClassListItem) => {
    const current = payloads[cls.id];
    if (current?.status !== 'error') return;
    setHeldRank((prev) => (cls.id in prev ? prev : { ...prev, [cls.id]: current }));
    setPayloads((prev) => ({ ...prev, [cls.id]: { ...current, refreshing: true } }));
    setRetryNote(`Checking readiness for ${cls.title}…`);
    void read(cls.id, cls.title);
  };

  // Fetch a run-payload per candidate whenever the candidate set changes. Concurrent
  // (N is small for a solo creator); each card resolves independently. Ready results
  // are preserved across re-runs so a list refresh doesn't re-flash loaded cards.
  const candidateKey = candidates.map((cls) => cls.id).join(',');
  useEffect(() => {
    setPayloads((prev) => {
      const next: Record<string, LivePayloadState> = {};
      for (const cls of candidates) {
        const existing = prev[cls.id];
        next[cls.id] = existing?.status === 'ready' ? existing : { status: 'loading' };
      }
      return next;
    });
    setHeldRank({});
    for (const cls of candidates)
      if (payloadsRef.current[cls.id]?.status !== 'ready') void read(cls.id);
    // Keyed on candidateKey — the candidate id set — so the fetch re-runs only when
    // classes are added/removed, not as each in-flight payload resolves.
  }, [candidateKey]);

  const readyReadinesses = candidates
    .map((cls) => payloads[cls.id])
    .filter((s): s is Extract<LivePayloadState, { status: 'ready' }> => s?.status === 'ready')
    .map((s) => s.readiness);
  const allResolved =
    candidates.length > 0 &&
    candidates.every((cls) => {
      const s = payloads[cls.id]?.status;
      return s === 'ready' || s === 'error';
    });
  const summary = summarizeQueue(readyReadinesses);

  // The queue ranks by the same rule Classes does, from the same module: a class
  // that leads the Classes shelf leads here too, and the choice is one session
  // setting shared across both surfaces. Ranking waits for every payload so cards
  // do not reshuffle under the instructor as each fetch lands.
  const ordered = allResolved
    ? orderClassesBy(ordering, candidates, (cls) =>
        classNextStep(heldRank[cls.id] ?? payloads[cls.id]),
      )
    : candidates;

  const liveStatus =
    status !== 'ready'
      ? ''
      : candidates.length === 0
        ? 'No classes with tracks yet.'
        : !allResolved
          ? `Checking readiness for ${candidates.length} ${candidates.length === 1 ? 'class' : 'classes'}…`
          : // Counts what it checked (RF-134): every track has a length, so the class can run.
            `${summary.runnable} of ${candidates.length} ${candidates.length === 1 ? 'class' : 'classes'} can run live: every track has a length.`;

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-text-primary">
            Teach a class
          </h2>
          <p className="mt-1 font-ui text-sm text-text-secondary">
            Press Preflight on the one you want.
          </p>
        </div>
        {/* Same two orderings, same session setting, same words as Classes — the
            queue must not invent a second ranking vocabulary. */}
        <div role="group" aria-label="Order the queue by" className="flex shrink-0 flex-wrap gap-2">
          {CLASS_ORDERING_OPTIONS.map((option) => {
            const active = option.value === ordering;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setOrdering(option.value);
                  storeOrdering(option.value);
                  setHeldRank({});
                }}
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
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveStatus}
      </p>
      {/* A card's Retry: its start and its outcome (RF-201), not only aria-busy. */}
      <p className="sr-only" role="status">
        {retryNote}
      </p>

      {/* Short rows, two columns from lg. The shape is a sparkline on the row,
          so a phone shows several classes instead of one tall card. */}
      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {status === 'loading' ? (
          <LoadingSkeleton label="Loading classes" rows={3} className="lg:col-span-2" />
        ) : status === 'error' ? (
          <RecoveryState
            kind="unavailable"
            compact
            role="alert"
            title="Your classes didn't load."
            event="Ritmo could not read the class list. This is not an empty account."
            safety="No class was removed."
            className="lg:col-span-2"
            primaryAction={
              <button type="button" className={RETRY_BUTTON_CLASS} onClick={onRetry}>
                Retry
              </button>
            }
          />
        ) : candidates.length === 0 ? (
          <p className="font-ui text-sm text-text-tertiary">
            No classes with tracks yet. Add tracks in Classes, then come back here.
          </p>
        ) : (
          ordered.map((cls, index) => (
            <LiveQueueCard
              key={cls.id}
              cls={cls}
              state={payloads[cls.id]}
              primary={allResolved && index === 0}
              onRun={() => onRunClass(cls.id)}
              onEdit={() => void onOpenClass(cls)}
              onRetry={() => retryOne(cls)}
            />
          ))
        )}
      </div>
    </section>
  );
}

const LIVE_QUEUE_PRIMARY_CLASS =
  'min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring';
const LIVE_QUEUE_SECONDARY_CLASS =
  'min-h-11 rounded-control border border-interactive/35 px-4 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 rf-focus-ring';

/**
 * One class in the Live queue. A short row: name, shape, and the next action.
 * Full readiness stays one disclosure away. "Run live" uses the same duration
 * gate as Live Mode — a blocked class names the fix, and `aria-describedby`
 * points at `runBlockedMessage`.
 *
 * Copper marks one primary per surface (design system §9.1, RF-135): only the
 * card that leads the ranked queue, the class she is most likely to teach next,
 * once every card has resolved so the copper never hops. The rest are secondary.
 */
function LiveQueueCard({
  cls,
  state,
  primary,
  onRun,
  onEdit,
  onRetry,
}: {
  cls: ClassListItem;
  state: LivePayloadState | undefined;
  primary: boolean;
  onRun: () => void;
  onEdit: () => void;
  onRetry: () => void;
}) {
  const canRun = state?.status === 'ready' && state.readiness.runnable;
  const retrying = state?.status === 'error' && !!state.refreshing;
  const checking = state === undefined || state.status === 'loading' || retrying;
  const reasonId = `live-blocked-${cls.id}`;
  const blockReason =
    state?.status === 'error'
      ? 'Couldn’t check readiness — retry before running this class.'
      : state?.status === 'ready' && !state.readiness.runnable
        ? (runBlockedMessage(state.payload) ?? undefined)
        : undefined;
  // The same next-step derivation Classes uses. A duration-blocked class gets the
  // verb that fixes it rather than a disabled "Preflight" it can never satisfy —
  // the gate is unchanged, the dead-end control is what goes.
  const step = classNextStep(state);
  const gapCount = state?.status === 'ready' ? state.readiness.attentionCount : 0;

  const actionClass = primary ? LIVE_QUEUE_PRIMARY_CLASS : LIVE_QUEUE_SECONDARY_CLASS;
  const gapsLabel =
    gapCount === 0 ? 'Details' : `${gapCount} ${gapCount === 1 ? 'thing' : 'things'} left`;

  return (
    <article
      className="min-w-0 rounded-card border border-border-subtle bg-bg-raised p-3"
      aria-busy={checking}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-text-primary">
            {cls.title}
          </h3>
          <p className="truncate font-data text-xs text-text-tertiary">
            {formatTemplateLabel(cls.template) ?? 'Class'} · {cls.trackCount}{' '}
            {cls.trackCount === 1 ? 'track' : 'tracks'} · {formatDuration(cls.totalDurationMs)}
          </p>
          {checking && (
            <span
              aria-hidden="true"
              className="mt-1.5 block h-2 w-24 rounded-pill bg-bg-sunken motion-safe:animate-pulse"
            />
          )}
        </div>
        {state?.status === 'ready' && (
          <ClassPulse payload={state.payload} variant="sparkline" className="shrink-0" />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${cls.title}`}
          className="min-h-11 rounded-control border border-interactive/35 px-3 font-ui text-sm text-text-secondary hover:text-text-primary rf-focus-ring"
        >
          Edit
        </button>
        {canRun ? (
          <button
            type="button"
            onClick={onRun}
            aria-label={`Preflight ${cls.title}`}
            title="Run this class live"
            className={actionClass}
          >
            Preflight
          </button>
        ) : state?.status === 'ready' ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${step.action} — ${cls.title}`}
            aria-describedby={blockReason ? reasonId : undefined}
            className={actionClass}
          >
            {step.action}
          </button>
        ) : state?.status === 'error' ? (
          // RF-163: during a retry the same button stays (with its copper and keyboard
          // focus) as a busy "Checking…", instead of leaving the queue without its action.
          <button
            type="button"
            aria-disabled={retrying ? 'true' : undefined}
            onClick={retrying ? noop : onRetry}
            aria-label={
              retrying ? `Checking readiness — ${cls.title}` : `Retry readiness — ${cls.title}`
            }
            // RF-201: busy reads busy (dimmed, with a spinning mark), not as an enabled
            // action that does nothing.
            className={retrying ? `${actionClass} cursor-progress opacity-60` : actionClass}
          >
            {retrying && (
              <span
                aria-hidden
                className="mr-1.5 inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent align-[-1px] motion-safe:animate-spin"
              />
            )}
            {retrying ? 'Checking…' : 'Retry'}
          </button>
        ) : null}
        {state?.status === 'ready' && (
          <details className="ml-auto open:basis-full">
            <summary
              className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center px-2 font-ui text-sm font-semibold text-interactive rf-focus-ring"
              aria-label={
                gapCount === 0 ? `Readiness details, ${cls.title}` : `${gapsLabel}, ${cls.title}`
              }
            >
              {gapsLabel}
            </summary>
            <div className="mt-2">
              {/* The queue cannot jump the inspector, so fix-chips stay off. */}
              <ClassReadinessSummary
                readiness={state.readiness}
                canEdit={false}
                compact
                onSelectTrack={noop}
              />
            </div>
          </details>
        )}
      </div>

      {state?.status === 'error' && !retrying && (
        <p id={reasonId} role="alert" className="mt-1 font-ui text-xs text-state-caution">
          <span aria-hidden className="font-data">
            !{' '}
          </span>
          {blockReason}
        </p>
      )}
      {state?.status === 'ready' && blockReason && (
        <p id={reasonId} className="mt-1 font-ui text-xs text-state-caution">
          <span aria-hidden className="font-data">
            !{' '}
          </span>
          {blockReason}
        </p>
      )}
    </article>
  );
}
