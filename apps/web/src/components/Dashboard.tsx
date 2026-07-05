/** Minimal authenticated builder: create a class, add a tagged track, see the timeline. */
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  Suspense,
  type FormEvent,
} from 'react';
import {
  type Class,
  type ClassWithAccess,
  type ClassListItem,
  type ClassTemplate,
  type ClassTrack,
  type Intensity,
  type RunPayload,
  type RunPayloadTrackEntry,
} from '@ritmofit/shared';
import {
  listClasses,
  createClass,
  copyClass,
  copyClassTrack,
  updateClass,
  deleteClass,
  listClassTracks,
  addTrack,
  updateClassTrack,
  deleteClassTrack,
  reorderTracks,
  updateCue,
  updatePlacedMove,
  getRunPayload,
  lookupBpm,
  addClassTag,
  removeClassTag,
  uploadClassCover,
  getClass,
} from '../lib/api.js';
import { moveItem } from '../lib/reorder.js';
import {
  avgBpm,
  formatDuration,
  cardSummaryFromPayload,
  formatTemplateLabel,
} from '../lib/class-summary.js';
import { formatLastOpened } from '../lib/relative-time.js';
import {
  canRunPayload,
  formatDurationInput,
  parseDurationInput,
  runBlockedMessage,
} from '../lib/duration.js';
import { classReadiness } from '../lib/readiness.js';
import { classDetailReducer, initialClassDetailState } from '../lib/class-detail-state.js';
import { libraryView, type ListStatus } from '../lib/library-state.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { IntensityRibbon } from './IntensityRibbon.js';
import { TimelineStrip } from './TimelineStrip.js';
import { SegmentBand } from './SegmentBand.js';
import { lazyWithReload } from '../lib/lazyWithReload.js';
import { IntensityReadout } from './IntensityReadout.js';
import { IntensitySegmentedControl } from './IntensitySegmentedControl.js';
import { ClassReadinessSummary } from './ClassReadinessSummary.js';
import { TrackSearch } from './TrackSearch.js';
import {
  consumeOnboardingVideoPending,
  markOnboardingVideoDismissed,
} from '../lib/onboarding-video.js';
import { OnboardingVideoDialog } from './OnboardingVideoDialog.js';

// Code-split the heavy, interaction-gated surfaces into their own chunks so the
// initial builder paint doesn't ship Live mode, the choreography editor, or the
// modal dialogs. Each loads on first use behind a <Suspense> boundary below.
const LiveMode = lazyWithReload(() =>
  import('./LiveMode.js').then((m) => ({ default: m.LiveMode })),
);
const ConnectionsDialog = lazyWithReload(() =>
  import('./ConnectionsDialog.js').then((m) => ({ default: m.ConnectionsDialog })),
);
const AccountDialog = lazyWithReload(() =>
  import('./AccountDialog.js').then((m) => ({ default: m.AccountDialog })),
);
const SongsByMoveDialog = lazyWithReload(() =>
  import('./SongsByMoveDialog.js').then((m) => ({ default: m.SongsByMoveDialog })),
);
const ClassSummaryView = lazyWithReload(() =>
  import('./ClassSummaryView.js').then((m) => ({ default: m.ClassSummaryView })),
);
const CuesSection = lazyWithReload(() =>
  import('./ChoreographyEditor.js').then((m) => ({ default: m.CuesSection })),
);
const MovesSection = lazyWithReload(() =>
  import('./ChoreographyEditor.js').then((m) => ({ default: m.MovesSection })),
);
// Manual clip-window preview for the selected track — shares the playback adapter
// stack with Live Mode, so it code-splits alongside those chunks (not the initial
// builder paint) and loads when a track is selected.
const TrackPreview = lazyWithReload(() =>
  import('./TrackPreview.js').then((m) => ({ default: m.TrackPreview })),
);

/** Full-screen Suspense fallback while a lazy chunk (e.g. Live mode) loads. */
function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="font-ui text-text-tertiary">Loading…</p>
    </main>
  );
}

export function Dashboard({ userId, userName }: { userId: string; userName: string }) {
  const [profileName, setProfileName] = useState(userName);
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [listStatus, setListStatus] = useState<ListStatus>('loading');
  const [nextClassCursor, setNextClassCursor] = useState<string | null>(null);
  const [loadingMoreClasses, setLoadingMoreClasses] = useState(false);
  // Server-side tag (theme) search. `activeTag` drives the UI; the ref lets the
  // memoized loaders read the current filter without re-creating on every change.
  // `knownTags` accumulates every tag seen on an unfiltered page so the quick-fill
  // pills persist even while a filter narrows the list to one tag.
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const activeTagRef = useRef<string | null>(null);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<ClassWithAccess | null>(null);
  const [detail, dispatchDetail] = useReducer(classDetailReducer, initialClassDetailState);
  const detailRequestId = useRef(0);
  const [live, setLive] = useState<RunPayload | null>(null);
  // Read-only preview of one of the caller's own classes from a Library card.
  const [cardPreview, setCardPreview] = useState<ClassListItem | null>(null);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [songsByMoveOpen, setSongsByMoveOpen] = useState(false);
  const [onboardingVideoOpen, setOnboardingVideoOpen] = useState(false);
  const [oauthResult, setOauthResult] = useState<{ connected?: string; error?: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Merge a page's tags into the known-tags set (only an unfiltered page widens
  // it; a filtered page only re-adds the active tag, which is harmless).
  const mergeKnownTags = useCallback((items: ClassListItem[]) => {
    setKnownTags((prev) => {
      const set = new Set(prev);
      for (const cls of items) for (const t of cls.tags) set.add(t);
      return [...set].sort();
    });
  }, []);

  const refreshClasses = useCallback(async () => {
    try {
      const page = await listClasses(undefined, undefined, activeTagRef.current ?? undefined);
      const ownedItems = page.items.filter((cls) => cls.ownerUserId === userId);
      setClasses(ownedItems);
      setNextClassCursor(page.nextCursor);
      mergeKnownTags(ownedItems);
      setListStatus('ready');
      setError(null);
    } catch (e) {
      setListStatus('error');
      setError((e as Error).message);
    }
  }, [mergeKnownTags, userId]);

  // Switch the server-side tag filter (null clears it) and reload from page 1.
  const applyTagFilter = useCallback(
    async (tag: string | null) => {
      activeTagRef.current = tag;
      setActiveTag(tag);
      setListStatus('loading');
      await refreshClasses();
    },
    [refreshClasses],
  );

  const loadMoreClasses = useCallback(async () => {
    if (!nextClassCursor || loadingMoreClasses) return;
    setLoadingMoreClasses(true);
    setError(null);
    try {
      const page = await listClasses(undefined, nextClassCursor, activeTagRef.current ?? undefined);
      const ownedItems = page.items.filter((cls) => cls.ownerUserId === userId);
      setClasses((current) => {
        const seen = new Set(current.map((cls) => cls.id));
        return [...current, ...ownedItems.filter((cls) => !seen.has(cls.id))];
      });
      setNextClassCursor(page.nextCursor);
      mergeKnownTags(ownedItems);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMoreClasses(false);
    }
  }, [loadingMoreClasses, nextClassCursor, mergeKnownTags, userId]);

  useEffect(() => {
    void refreshClasses();
  }, [refreshClasses]);

  useEffect(() => {
    if (consumeOnboardingVideoPending()) setOnboardingVideoOpen(true);
  }, []);

  // A provider OAuth round-trip returns the browser to "/?connected=…" or
  // "/?error=…". Open the connections dialog with that result, then strip the
  // query so a refresh or back-nav doesn't replay it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const errorReason = params.get('error');
    if (!connected && !errorReason) return;
    setOauthResult({ connected: connected ?? undefined, error: errorReason ?? undefined });
    setConnectionsOpen(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (selected) {
      document.title = `${selected.title} - Ritmo Studio`;
    } else {
      document.title = 'Ritmo Studio';
    }
  }, [selected]);

  // Load (or reload) one class detail under a monotonic request generation. The
  // reducer ignores late responses, and begin immediately masks the prior class.
  const loadDetail = useCallback(async (classId: string) => {
    const requestId = ++detailRequestId.current;
    dispatchDetail({ type: 'begin', classId, requestId });
    const [tracksResult, payloadResult] = await Promise.allSettled([
      listClassTracks(classId),
      getRunPayload(classId),
    ]);

    if (tracksResult.status === 'rejected') {
      dispatchDetail({
        type: 'failure',
        classId,
        requestId,
        error:
          tracksResult.reason instanceof Error
            ? tracksResult.reason.message
            : 'Could not load this class.',
      });
      return;
    }

    const payload = payloadResult.status === 'fulfilled' ? payloadResult.value : null;
    dispatchDetail({
      type: 'success',
      classId,
      requestId,
      tracks: tracksResult.value,
      payload,
    });

    // Keep this class's Library card in sync with its freshly loaded detail, so a
    // track add/remove/edit updates the rail's count/runtime/collage immediately
    // instead of waiting for the next full list reload. The run-payload yields the
    // exact aggregates GET /classes computes; without it (a non-runnable class, e.g.
    // a track missing duration) the track count is still authoritative.
    const summary = payload
      ? cardSummaryFromPayload(payload)
      : { trackCount: tracksResult.value.length };
    setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, ...summary } : c)));
  }, []);

  const openClass = useCallback(
    async (cls: ClassWithAccess) => {
      setSelected(cls);
      await loadDetail(cls.id);
    },
    [loadDetail],
  );

  // Start a new class seeded from a previously choreographed song (Songs by Move):
  // create a blank class, then copy that class_track — with its cues and placed
  // moves — into it, and open it in the builder. Reuses the copy-class-track route,
  // so the move/cue work carries over rather than starting from an empty track.
  const startClassFromPlacement = useCallback(
    async (sourceClassTrackId: string, title: string) => {
      const created = await createClass({ title });
      await copyClassTrack(sourceClassTrackId, created.id);
      // Clear any active tag filter so the new (untagged) class is visible, then open it.
      await applyTagFilter(null);
      await openClass({ ...created, accessLevel: 'owner' });
    },
    [applyTagFilter, openClass],
  );

  // Open a class by id when we don't already hold its full record (e.g. from the
  // Songs-by-Move results, where a match may be on a library page we haven't
  // loaded). Prefer the in-memory list; otherwise fetch it.
  const openClassById = useCallback(
    async (classId: string) => {
      const known = classes.find((c) => c.id === classId);
      try {
        await openClass(known ?? (await getClass(classId)));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [classes, openClass],
  );

  const runClass = useCallback(async (classId: string) => {
    try {
      const payload = await getRunPayload(classId);
      const blocked = runBlockedMessage(payload);
      if (blocked) {
        setError(blocked);
        return;
      }
      setLive(payload);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Merge an updated class into the list + the open detail pane (preserving the
  // caller's access level, which PATCH responses don't carry).
  const applyClassUpdate = useCallback((updated: Class) => {
    // A PATCH response carries only class metadata, so overlay it on the existing
    // list item to preserve the caller's access level AND the card aggregates
    // (track count / total runtime / art), which a metadata edit doesn't change.
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    setSelected((prev) =>
      prev && prev.id === updated.id ? { ...updated, accessLevel: prev.accessLevel } : prev,
    );
  }, []);

  // A deleted class closes its workspace (clearing the detail panes) and refreshes
  // the library list.
  const handleClassDeleted = useCallback(
    (classId: string) => {
      setSelected((prev) => (prev && prev.id === classId ? null : prev));
      dispatchDetail({ type: 'reset', requestId: ++detailRequestId.current });
      void refreshClasses();
    },
    [refreshClasses],
  );

  if (live)
    return (
      <ErrorBoundary resetLabel="Exit live mode" onReset={() => setLive(null)}>
        <Suspense fallback={<LoadingScreen />}>
          <LiveMode payload={live} onExit={() => setLive(null)} />
        </Suspense>
      </ErrorBoundary>
    );

  return (
    <main id="main-content" className="flex min-h-screen flex-col">
      {/* Persistent top bar — glass nav surface (design system 04/05): brand
          mark + wordmark, then the cross-cutting destinations. */}
      <header className="rf-topbar flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="rf-brand-mark" aria-hidden="true">
            R
          </span>
          <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-text-primary">
            Ritmo Studio
          </h1>
        </div>
        {/* Destinations cluster — on narrow viewports this becomes a compact
            horizontal command rail, so the first screen stays about the class
            queue/workbench rather than a wall of navigation pills. */}
        <nav className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
          <p className="hidden font-ui text-sm text-text-secondary sm:block">{profileName}</p>
          <button
            aria-label="Songs by move"
            className="min-h-11 shrink-0 rounded-control border border-interactive/40 bg-bg-raised/70 px-3 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 sm:min-h-0 sm:rounded-pill sm:bg-transparent sm:px-4 sm:py-1.5 sm:text-sm"
            onClick={() => setSongsByMoveOpen(true)}
          >
            <span className="sm:hidden">Moves</span>
            <span className="hidden sm:inline">Songs by move</span>
          </button>
          <button
            aria-label="Connections"
            className="min-h-11 shrink-0 rounded-control border border-interactive/40 bg-bg-raised/70 px-3 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 sm:min-h-0 sm:rounded-pill sm:bg-transparent sm:px-4 sm:py-1.5 sm:text-sm"
            onClick={() => setConnectionsOpen(true)}
          >
            <span className="sm:hidden">Music</span>
            <span className="hidden sm:inline">Connections</span>
          </button>
          <button
            aria-label="Account"
            className="min-h-11 shrink-0 rounded-control border border-interactive/40 bg-bg-raised/70 px-3 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 sm:min-h-0 sm:rounded-pill sm:bg-transparent sm:px-4 sm:py-1.5 sm:text-sm"
            onClick={() => setAccountOpen(true)}
          >
            <span className="sm:hidden">Me</span>
            <span className="hidden sm:inline">Account</span>
          </button>
        </nav>
      </header>

      {/* Lazy modal chunks — fallback null so the trigger feels instant; the modal
          paints once its chunk resolves (near-instant on a warm cache). */}
      <Suspense fallback={null}>
        {connectionsOpen && (
          <ConnectionsDialog
            oauthResult={oauthResult}
            onClose={() => {
              setConnectionsOpen(false);
              setOauthResult(null);
            }}
          />
        )}
        {accountOpen && (
          <AccountDialog
            onClose={() => setAccountOpen(false)}
            onProfileUpdated={(user) => setProfileName(user.displayName ?? user.email)}
          />
        )}
        {songsByMoveOpen && (
          <SongsByMoveDialog
            onClose={() => setSongsByMoveOpen(false)}
            onOpenClass={openClassById}
            onStartClass={startClassFromPlacement}
          />
        )}
        {onboardingVideoOpen && (
          <OnboardingVideoDialog
            onClose={() => {
              markOnboardingVideoDismissed();
              setOnboardingVideoOpen(false);
            }}
          />
        )}
        {cardPreview && (
          <ClassSummaryView
            classId={cardPreview.id}
            onClose={() => setCardPreview(null)}
            onOpenInBuilder={() => {
              const cls = cardPreview;
              setCardPreview(null);
              void openClass(cls);
            }}
          />
        )}
      </Suspense>

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        {error && <p className="mb-4 font-ui text-sm text-state-danger">{error}</p>}

        {/* The 3-pane workstation (design system 09): library · class · inspector.
            Collapses to a single stacked column below xl so it stays usable on
            smaller laptops. The class workspace contributes the center + inspector
            columns; the library is the first column. */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[266px_minmax(0,1fr)_340px] xl:items-start">
          <LibraryRail
            classes={classes}
            status={listStatus}
            hasMore={nextClassCursor !== null}
            loadingMore={loadingMoreClasses}
            selectedId={selected?.id ?? null}
            knownTags={knownTags}
            activeTag={activeTag}
            onSelectTag={applyTagFilter}
            onError={setError}
            onCreate={async (cls) => {
              // A new class is untagged — clear any active filter so it's visible.
              await applyTagFilter(null);
              await openClass({ ...cls, accessLevel: 'owner' });
            }}
            onDuplicate={async (cls) => {
              // "Save a copy" of an own/shared class into the caller's library, then
              // refresh so the copy appears and open it for immediate editing.
              const copy = await copyClass(cls.id);
              await applyTagFilter(null);
              await refreshClasses();
              await openClass({ ...copy, accessLevel: 'owner' });
            }}
            onOpen={openClass}
            onPreview={(cls) => setCardPreview(cls)}
            onLoadMore={loadMoreClasses}
            onRetry={() => {
              setListStatus('loading');
              void refreshClasses();
            }}
          />

          {selected && detail.classId === selected.id && detail.status === 'ready' ? (
            <ClassWorkspace
              key={selected.id}
              cls={selected}
              tracks={detail.tracks}
              payload={detail.payload}
              onError={setError}
              onTrackChanged={() => void loadDetail(selected.id)}
              onRun={() => runClass(selected.id)}
              onClassUpdated={applyClassUpdate}
              onClassDeleted={handleClassDeleted}
              onOpenSongsByMove={() => setSongsByMoveOpen(true)}
            />
          ) : selected && detail.classId === selected.id && detail.status === 'error' ? (
            <section className="rounded-card bg-bg-raised p-8 shadow-card">
              <p className="font-ui text-sm text-state-danger" role="alert">
                {detail.error}
              </p>
              <button
                type="button"
                className="mt-4 rounded-pill rf-btn-primary px-4 py-2 font-ui text-sm font-semibold text-text-on-accent"
                onClick={() => void loadDetail(selected.id)}
              >
                Retry class
              </button>
            </section>
          ) : selected ? (
            <section className="rounded-card bg-bg-raised p-8 shadow-card" aria-busy="true">
              <p className="font-ui text-text-tertiary">Loading class…</p>
            </section>
          ) : listStatus === 'ready' && classes.length === 0 && activeTag == null ? (
            // True first run — there are no classes to derive from, so orient the new
            // instructor to the creative loop rather than fabricating a provisional
            // (design principle 8: alive at rest, but "derive, never invent").
            <section className="rounded-card bg-bg-raised p-8 shadow-card">
              <h2 className="font-display text-xl font-semibold text-text-primary">
                Build your first class
              </h2>
              <p className="mt-2 max-w-prose font-ui text-sm text-text-secondary">
                Name a class to begin — then pick the music, shape the intensity, and take it live.
                In Ritmo Studio a class is your playlist and your choreography in one place.
              </p>
            </section>
          ) : (
            <section className="rounded-card bg-bg-raised p-8 shadow-card">
              <p className="font-ui text-text-tertiary">Select a class to keep building.</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * Left rail — the class library (design system 09). Create a class and pick one
 * to open; the active class is marked with a ring (not color alone). On xl it is
 * a sticky column so the list stays in view while the center scrolls.
 */
export function LibraryRail({
  classes,
  status,
  hasMore,
  loadingMore,
  selectedId,
  knownTags,
  activeTag,
  onSelectTag,
  onError,
  onCreate,
  onDuplicate,
  onPreview,
  onOpen,
  onLoadMore,
  onRetry,
}: {
  classes: ClassListItem[];
  status: ListStatus;
  hasMore: boolean;
  loadingMore: boolean;
  selectedId: string | null;
  /** Every tag seen on an unfiltered page — the quick-fill pill set. */
  knownTags: string[];
  /** The active server-side tag filter, or null when unfiltered. */
  activeTag: string | null;
  /** Apply (or clear, with null) the server-side tag filter; reloads from page 1. */
  onSelectTag: (tag: string | null) => void;
  onError: (msg: string | null) => void;
  onCreate: (cls: Awaited<ReturnType<typeof createClass>>) => void;
  /** "Save a copy" of a class into the caller's library (resolves when done). */
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  /** Open a read-only preview of the class (without entering the builder). */
  onPreview: (cls: ClassListItem) => void;
  onOpen: (cls: ClassListItem) => void;
  onLoadMore: () => void;
  /** Reload the class library from page 1 after a failed initial load. */
  onRetry: () => void;
}) {
  // `classes` is already the server-filtered set, so an empty list under an active
  // tag is "no matches", not "no classes at all".
  const view = libraryView(status, classes.length);
  const showTagFilter = knownTags.length > 0 || activeTag != null;
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-6">
      <div className="flex items-center justify-between">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
          Your classes
        </span>
        <span className="font-data text-xs text-text-tertiary">{classes.length} loaded</span>
      </div>
      <CreateClassForm onCreated={onCreate} onError={onError} />
      {showTagFilter && (
        <TagFilter knownTags={knownTags} activeTag={activeTag} onSelectTag={onSelectTag} />
      )}
      {view === 'loading' ? (
        <p className="font-ui text-sm text-text-tertiary">Loading your classes…</p>
      ) : view === 'error' ? (
        <div className="flex flex-col items-start gap-2" role="alert">
          <p className="font-ui text-sm text-state-danger">Couldn’t load your classes.</p>
          <button
            type="button"
            className="rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : view === 'empty' ? (
        activeTag != null ? (
          <p className="font-ui text-sm text-text-tertiary">
            No classes tagged <span className="text-text-secondary">#{activeTag}</span>.
          </p>
        ) : (
          <p className="font-ui text-sm text-text-tertiary">
            No classes yet — create your first above.
          </p>
        )
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              selected={selectedId === cls.id}
              onOpen={onOpen}
              onPreview={onPreview}
              onDuplicate={onDuplicate}
              onError={onError}
            />
          ))}
          {hasMore && (
            <li className="flex justify-center pt-1">
              <button
                type="button"
                className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive disabled:opacity-40"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}

/**
 * A single Library card (design system 11, tightened for music-forward queue):
 * bounded album-art collage, title, shape-first meta (template · track count · runtime),
 * quiet last-opened. Primary action is opening the card (main area). Copy/View are
 * deliberately quieter secondary actions in a compact footer (no dominating vertical
 * divider). The solo-first library is owner-only (D20), so no ownership chip is shown.
 * Independently focusable controls; ring for selection (never color alone).
 */
function ClassCard({
  cls,
  selected,
  onOpen,
  onPreview,
  onDuplicate,
  onError,
}: {
  cls: ClassListItem;
  selected: boolean;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const { busy, run } = useAsyncAction(onError);
  const lastOpened = formatLastOpened(cls.lastOpenedAt, Date.now());
  const trackLabel = `${cls.trackCount} ${cls.trackCount === 1 ? 'track' : 'tracks'}`;
  const templateLabel = formatTemplateLabel(cls.template);
  return (
    <li>
      <div
        className={`relative flex flex-col overflow-hidden rounded-card bg-bg-raised shadow-card ${
          selected ? 'ring-2 ring-interactive' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => onOpen(cls)}
          aria-pressed={selected}
          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left font-ui"
        >
          <ArtCollage urls={cls.albumArtUrls} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-text-primary">{cls.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-data text-xs text-text-tertiary">
              {templateLabel && (
                <>
                  <span className="text-text-secondary">{templateLabel}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span>{trackLabel}</span>
              {cls.totalDurationMs > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{formatDuration(cls.totalDurationMs)}</span>
                </>
              )}
            </span>
            {lastOpened && (
              <span className="mt-0.5 block font-ui text-xs text-text-tertiary">{lastOpened}</span>
            )}
          </span>
        </button>
        {/* Quiet horizontal footer for secondary actions. Each independently focusable
            and labeled (no nested buttons). Much lower visual weight than before. */}
        <div className="flex items-center justify-end gap-x-2 border-t border-interactive/10 px-3 py-0.5 text-[10px] font-ui text-text-tertiary">
          <button
            type="button"
            onClick={() => onPreview(cls)}
            aria-label={`Preview ${cls.title}`}
            title="Read-only preview"
            className="px-1 hover:text-text-primary"
          >
            View
          </button>
          <span aria-hidden className="text-text-tertiary/40">
            ·
          </span>
          <button
            type="button"
            onClick={() => void run(() => onDuplicate(cls))}
            disabled={busy}
            aria-label={`Duplicate ${cls.title}`}
            title="Save a copy"
            className="px-1 hover:text-text-primary disabled:opacity-40"
          >
            {busy ? '…' : 'Copy'}
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * The track-art collage (design system 11: "small bounded artwork"). A bounded 44px
 * tile: one image when there's a single art, a 2×2 mosaic for several, and a neutral
 * note glyph when the class has no track art yet. Purely decorative — the title carries
 * the meaning — so images are empty-alt and the container is aria-hidden.
 */
function ArtCollage({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-base text-text-tertiary"
        aria-hidden
      >
        ♪
      </span>
    );
  }
  if (urls.length === 1) {
    return (
      <img
        src={urls[0]}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-11 w-11 shrink-0 rounded-card object-cover"
      />
    );
  }
  return (
    <span
      className="grid h-11 w-11 shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-card bg-bg-base"
      aria-hidden
    >
      {urls.slice(0, 4).map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ))}
    </span>
  );
}

/**
 * Server-side tag (theme) search. The active filter shows as a removable chip;
 * `knownTags` render as quick-fill pills; the input reaches any tag — including
 * ones not on a loaded page — and is normalized (trim + lowercase) to match how
 * the server stores tags.
 */
function TagFilter({
  knownTags,
  activeTag,
  onSelectTag,
}: {
  knownTags: string[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
}) {
  const [input, setInput] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const tag = input.trim().toLowerCase();
    if (!tag) return;
    setInput('');
    onSelectTag(tag);
  };
  return (
    <div className="flex flex-col gap-1.5 pb-1">
      <form className="flex gap-1.5" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1 font-ui text-xs text-text-primary"
          placeholder="Filter by tag…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Filter classes by tag"
        />
        {input.trim() && (
          <button
            type="submit"
            className="rounded-pill border border-interactive px-3 py-1 font-ui text-xs text-interactive"
          >
            Filter
          </button>
        )}
      </form>
      <div className="flex flex-wrap gap-1.5">
        {activeTag && (
          <button
            type="button"
            onClick={() => onSelectTag(null)}
            className="rounded-pill border border-interactive bg-interactive px-2 py-0.5 font-ui text-xs text-bg-base"
            aria-label={`Clear tag filter ${activeTag}`}
          >
            #{activeTag} ×
          </button>
        )}
        {knownTags
          .filter((t) => t !== activeTag)
          .map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectTag(tag)}
              className="rounded-pill border border-interactive/30 bg-bg-base px-2 py-0.5 font-ui text-xs text-text-secondary hover:text-text-primary"
            >
              #{tag}
            </button>
          ))}
      </div>
    </div>
  );
}

/**
 * The create-class chooser's template options. `null` is the default "Blank" class
 * (no discipline); the rest map to the shared `classTemplate` enum so the picked
 * template is carried into `POST /classes`. Labels are presentation-only.
 */
const CREATE_TEMPLATE_OPTIONS: ReadonlyArray<{ value: ClassTemplate | null; label: string }> = [
  { value: null, label: 'Blank' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'sculpt', label: 'Sculpt' },
  { value: 'tread', label: 'Tread' },
];

function CreateClassForm({
  onCreated,
  onError,
}: {
  onCreated: (cls: Awaited<ReturnType<typeof createClass>>) => void;
  onError: (msg: string | null) => void;
}) {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const { busy, run } = useAsyncAction(onError);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        void run(async () => {
          const cls = await createClass({ title: title.trim(), template });
          setTitle('');
          setTemplate(null);
          onCreated(cls);
        });
      }}
    >
      <div className="flex min-w-0 gap-2">
        <input
          className="min-h-11 min-w-0 flex-1 rounded-control border border-interactive/30 bg-bg-base px-3 font-ui text-sm text-text-primary sm:rounded-pill sm:px-4 sm:text-base"
          placeholder="New class title"
          aria-label="New class title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          disabled={busy}
          className="min-h-11 shrink-0 rounded-control rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:rounded-pill sm:px-4 sm:text-base"
        >
          {busy ? '…' : 'Add'}
        </button>
      </div>
      {/* Template chooser — optional discipline for the new class (default Blank). */}
      <div
        role="group"
        aria-label="Class template"
        className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
      >
        {CREATE_TEMPLATE_OPTIONS.map(({ value, label }) => {
          const selected = template === value;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              onClick={() => setTemplate(value)}
              className={`min-h-8 shrink-0 rounded-pill border px-2.5 font-ui text-xs ${
                selected
                  ? 'border-interactive bg-interactive/15 text-text-primary'
                  : 'border-interactive/30 text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </form>
  );
}

/**
 * The class workspace — the center column (header summary + energy ribbon +
 * track list + add-track) and the sticky right-hand inspector (design system
 * 09). Returns a fragment so both land as siblings of the library rail in the
 * 3-pane grid. Mounted with `key={cls.id}` by the parent, so opening another
 * class remounts it — clearing the track selection without an effect.
 */
function ClassWorkspace({
  cls,
  tracks,
  payload,
  onError,
  onTrackChanged,
  onRun,
  onClassUpdated,
  onClassDeleted,
  onOpenSongsByMove,
}: {
  cls: ClassWithAccess;
  tracks: ClassTrack[];
  payload: RunPayload | null;
  onError: (msg: string | null) => void;
  onTrackChanged: () => void;
  onRun: () => void;
  onClassUpdated: (cls: Class) => void;
  onClassDeleted: (classId: string) => void;
  /** Open the Songs-by-Move dialog (the top-bar dialog, reused in the builder). */
  onOpenSongsByMove: () => void;
}) {
  // The selected track (by class_track id) drives the inspector.
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  // A cue/move marker click also asks the inspector to focus that row. The `nonce`
  // bumps on every marker click so re-clicking the same marker re-flashes.
  const [markerFocus, setMarkerFocus] = useState<{
    classTrackId: string;
    kind: 'cue' | 'move';
    id: string;
    anchorMs: number;
    nonce: number;
  } | null>(null);
  const isOwner = cls.accessLevel === 'owner';
  const canEdit = cls.accessLevel === 'owner' || cls.accessLevel === 'edit';
  const isFree = cls.timelineMode === 'free';

  // Toggle the class between back-to-back (sequential) and free placement. The
  // server seeds/repacks offsets; refresh both the class and the run-payload.
  const toggleTimelineMode = async () => {
    try {
      const updated = await updateClass(cls.id, {
        timelineMode: isFree ? 'sequential' : 'free',
      });
      onClassUpdated(updated);
      onTrackChanged();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null;
  const selectedEntry = payload?.tracks.find((e) => e.classTrackId === selectedTrackId) ?? null;

  // Select a track from the timeline; a marker click also targets a cue/move row.
  const selectFromTimeline = (
    classTrackId: string,
    marker?: { kind: 'cue' | 'move'; id: string; anchorMs: number },
  ) => {
    setSelectedTrackId(classTrackId);
    if (marker) {
      setMarkerFocus((prev) => ({ classTrackId, ...marker, nonce: (prev?.nonce ?? 0) + 1 }));
    }
  };
  const inspectorFocus =
    markerFocus && selectedTrack && markerFocus.classTrackId === selectedTrack.id
      ? markerFocus
      : null;

  return (
    <>
      {/* ── Center column: header summary · energy ribbon · track list ── */}
      <section className="flex min-w-0 flex-col gap-4">
        <ClassHeaderCard
          cls={cls}
          payload={payload}
          trackCount={payload?.tracks.length ?? tracks.length}
          isOwner={isOwner}
          canEdit={canEdit}
          canRun={payload != null && canRunPayload(payload)}
          onError={onError}
          onRun={onRun}
          onSelectTrack={setSelectedTrackId}
          onClassUpdated={onClassUpdated}
          onDeleted={() => onClassDeleted(cls.id)}
        />

        {/* The energy arc + timeline — the class's shape and its cue/move markers,
            sharing one time axis, both derived from the run-payload (no new schema). */}
        {payload && payload.tracks.length > 0 && (
          <div className="flex flex-col gap-4 rounded-card bg-bg-raised p-4 shadow-card sm:p-5">
            {/* Workbench heading — the class shape is the builder's central instrument,
                so it carries a real title (not a peer section label) alongside the
                placement control (design system 09: "shape is the instrument"). */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <h3 className="font-display text-lg font-semibold leading-tight text-text-primary">
                  Class shape
                </h3>
                <p className="font-ui text-xs text-text-tertiary">Intensity across the class</p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <span className="font-ui text-xs text-text-tertiary">
                    {isFree ? 'Free placement (gaps allowed)' : 'Back-to-back'}
                  </span>
                  <button
                    type="button"
                    onClick={toggleTimelineMode}
                    className="rounded-pill border border-interactive/40 px-3 py-1 font-ui text-xs text-text-secondary hover:text-text-primary"
                  >
                    {isFree ? 'Switch to back-to-back' : 'Switch to free placement'}
                  </button>
                </div>
              )}
            </div>
            {/* The shape surface — the energy arc (hero) and the timeline ride one
                shared time axis on a single inset surface, so they read as one object
                (height = intensity above, blocks/markers below) instead of stacked strips. */}
            <div className="flex flex-col gap-2 rounded-card bg-bg-base p-3 sm:p-4">
              <IntensityRibbon payload={payload} selectedClassTrackId={selectedTrackId} />
              <TimelineStrip
                payload={payload}
                selectedTrackId={selectedTrackId}
                onSelectTrack={selectFromTimeline}
                onMoveMarker={
                  canEdit
                    ? async (marker, anchorMs) => {
                        if (marker.kind === 'cue') await updateCue(marker.id, { anchorMs });
                        else await updatePlacedMove(marker.id, { anchorMs });
                        onTrackChanged();
                      }
                    : undefined
                }
                onMoveTrack={
                  canEdit && isFree
                    ? async (classTrackId, startOffsetMs) => {
                        await updateClassTrack(classTrackId, { startOffsetMs });
                        onTrackChanged();
                      }
                    : undefined
                }
              />
            </div>
            <SegmentBand
              classId={cls.id}
              totalDurationMs={payload.class.totalDurationMs}
              canEdit={canEdit}
              trackStartsMs={payload.tracks.map((t) => t.startOffsetMs ?? 0)}
              onChanged={onTrackChanged}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-card bg-bg-raised p-4 shadow-card">
          <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
            Track list
          </span>
          {tracks.length === 0 && (
            <p className="font-ui text-sm text-text-tertiary">
              No tracks yet — add your first below.
            </p>
          )}
          {/* Rich, reorderable song rows from the run-payload (title/artist/BPM/art);
              fall back to the lean, non-reorderable rows only if the payload couldn't
              load but tracks exist. */}
          {tracks.length > 0 &&
            (payload ? (
              <ReorderableTrackList
                classId={cls.id}
                entries={payload.tracks}
                canReorder={canEdit && !isFree}
                selectedTrackId={selectedTrackId}
                onSelect={(id) => setSelectedTrackId((cur) => (cur === id ? null : id))}
                onReordered={onTrackChanged}
              />
            ) : (
              <ol className="flex flex-col gap-2">
                {tracks.map((t) => (
                  <LeanTrackRow key={t.id} track={t} />
                ))}
              </ol>
            ))}
          <TrackSearch classId={cls.id} onAdded={onTrackChanged} />
          {/* Manual entry stays available but de-emphasized (search/import is the
              primary path; 09). For a track a provider can't return, or no creds. */}
          <details className="mt-1">
            <summary className="cursor-pointer font-ui text-xs text-text-tertiary hover:text-text-secondary">
              Add manually
            </summary>
            <AddTrackForm classId={cls.id} onAdded={onTrackChanged} onError={onError} />
          </details>
        </div>
      </section>

      {/* ── Right column: the sticky inspector for the selected track ── */}
      <aside className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
        {selectedTrack ? (
          <div className="flex flex-col gap-3">
            {/* Manual clip-window preview of the selected track (no auto-advance);
                only once the run-payload entry (provider refs + window) resolved. */}
            {selectedEntry && (
              <Suspense fallback={null}>
                <TrackPreview entry={selectedEntry} />
              </Suspense>
            )}
            <TrackInspector
              key={selectedTrack.id}
              track={selectedTrack}
              title={selectedEntry?.track.title ?? 'Track'}
              durationMs={selectedEntry?.track.durationMs ?? null}
              displayBpm={selectedEntry?.displayBpm ?? null}
              canEdit={canEdit}
              canPlaceFreely={isFree}
              focus={inspectorFocus}
              onSaved={onTrackChanged}
              onRemoved={() => {
                setSelectedTrackId(null);
                onTrackChanged();
              }}
              onOpenSongsByMove={onOpenSongsByMove}
            />
          </div>
        ) : (
          <div className="rounded-card border border-interactive/20 bg-bg-base p-5">
            <p className="font-ui text-sm text-text-tertiary">
              Select a track to edit its intensity, BPM, notes, cues, and moves.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

/**
 * The class header card (design system 09): title, the derived
 * summary stats (track count · assembled total · average BPM, all from the
 * run-payload — no new data), and the owner/run actions. Stats use label +
 * number, never color alone.
 */
export function ClassHeaderCard({
  cls,
  payload,
  trackCount,
  isOwner,
  canEdit,
  canRun,
  onError,
  onRun,
  onSelectTrack,
  onClassUpdated,
  onDeleted,
}: {
  cls: ClassWithAccess;
  payload: RunPayload | null;
  trackCount: number;
  isOwner: boolean;
  canEdit: boolean;
  canRun: boolean;
  onError: (msg: string | null) => void;
  onRun: () => void;
  onSelectTrack: (classTrackId: string) => void;
  onClassUpdated: (cls: Class) => void;
  onDeleted: () => void;
}) {
  const { run } = useAsyncAction(onError);
  const { busy: deleting, run: runDelete } = useAsyncAction(onError);
  const { busy: renaming, run: runRename } = useAsyncAction(onError);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(cls.title);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const averageBpm = payload ? avgBpm(payload) : null;
  // Readiness is derived from the run-payload (no new data): duration/tempo/
  // cues-moves/music, surfaced before Live instead of on stage (P0 #2).
  const readiness = payload ? classReadiness(payload) : null;
  // Why Run live is disabled, said at the button itself (not only a hover title)
  // and associated for assistive tech via aria-describedby. Duration is the sole
  // run gate (mirrors canRunPayload), so the reason is either "no tracks yet" or
  // "a track without a length". Especially matters for an empty class, where the
  // readiness panel isn't shown and the greyed button is the only signal.
  const runBlockedId = `run-blocked-${cls.id}`;
  const runBlockedReason = canRun
    ? null
    : trackCount === 0
      ? 'Add a track to run this class.'
      : 'Give every track a length to run.';

  const startRename = () => {
    setTitleDraft(cls.title);
    setEditingTitle(true);
  };

  const saveRename = () => {
    const next = titleDraft.trim();
    if (next === '' || next === cls.title) {
      setEditingTitle(false);
      return;
    }
    void runRename(async () => {
      onClassUpdated(await updateClass(cls.id, { title: next }));
      setEditingTitle(false);
    });
  };

  const confirmDelete = () =>
    void runDelete(async () => {
      await deleteClass(cls.id);
      onDeleted();
    });

  const handleTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Canonicalize to match how the server stores tags (trim + lowercase) so the
    // dup-check and optimistic update agree with the persisted value.
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    if (cls.tags.includes(tag)) {
      setTagInput('');
      return;
    }
    void run(async () => {
      await addClassTag(cls.id, tag);
      onClassUpdated({ ...cls, tags: [...cls.tags, tag] });
      setTagInput('');
    });
  };

  const removeTag = (tag: string) => {
    void run(async () => {
      await removeClassTag(cls.id, tag);
      onClassUpdated({ ...cls, tags: cls.tags.filter((t) => t !== tag) });
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Permit choosing the same file again after a validation/network failure.
    e.target.value = '';
    void run(async () => {
      const updatedClass = await uploadClassCover(cls.id, file);
      onClassUpdated(updatedClass);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-card bg-bg-raised p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
        {/* min-w on sm+ reserves a readable title width so the (non-shrinking) actions
            wrap below instead of squeezing the truncating title to zero width in the
            narrow center column. min-w-0 at base keeps the stacked mobile layout safe. */}
        <div className="flex flex-1 items-start gap-4 min-w-0 sm:min-w-[20rem]">
          {/* Cover image area */}
          <div className="relative shrink-0 flex flex-col items-center">
            {cls.coverImageUrl ? (
              <img
                src={cls.coverImageUrl}
                alt="Class Cover"
                fetchPriority="high"
                className="h-24 w-24 rounded-card object-cover border border-interactive/20"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-card border border-dashed border-interactive/40 bg-bg-base text-text-tertiary">
                <span className="text-2xl" aria-hidden>
                  📷
                </span>
              </div>
            )}
            {isOwner && (
              <label className="mt-2 cursor-pointer text-xs font-ui text-interactive hover:underline">
                {cls.coverImageUrl ? 'Change' : 'Upload Cover'}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRename();
                }}
              >
                <label className="sr-only" htmlFor="class-title-input">
                  Class name
                </label>
                <input
                  id="class-title-input"
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  maxLength={200}
                  className="min-w-0 flex-1 rounded-card border border-interactive/40 bg-bg-base px-2 py-1 font-display text-xl font-semibold text-text-primary"
                />
                <button
                  type="submit"
                  className="rounded-pill rf-btn-primary px-3 py-1 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
                  disabled={renaming}
                >
                  {renaming ? '…' : 'Save'}
                </button>
                <button
                  type="button"
                  className="rounded-pill border border-interactive/40 px-3 py-1 font-ui text-sm text-text-secondary"
                  onClick={() => setEditingTitle(false)}
                  disabled={renaming}
                >
                  Cancel
                </button>
              </form>
            ) : (
              // min-w-0 lets the h2's `truncate` engage so a long title shortens
              // instead of overflowing the title block and colliding with actions.
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="truncate font-display text-xl font-semibold text-text-primary">
                  {cls.title}
                </h2>
                {isOwner && (
                  <button
                    className="shrink-0 rounded-pill border border-interactive/40 px-2 py-0.5 font-ui text-xs text-text-secondary hover:text-text-primary"
                    onClick={startRename}
                    aria-label="Rename class"
                  >
                    Rename
                  </button>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {cls.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-pill bg-interactive/15 px-2.5 py-1 font-ui text-xs text-text-primary border border-interactive/30"
                >
                  #{tag}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 text-text-secondary hover:text-state-danger"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {canEdit && (
                <form onSubmit={handleTagSubmit} className="flex flex-wrap gap-1 items-center">
                  <input
                    type="text"
                    placeholder="Add tag…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="rounded-pill border border-interactive/30 bg-bg-base px-2.5 py-1 font-ui text-xs text-text-primary"
                    maxLength={50}
                  />
                </form>
              )}
            </div>
          </div>
        </div>
        {/* Actions wrap below the title on narrow viewports instead of forcing
            horizontal overflow; single row to the right of the title on sm+. */}
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:w-auto sm:flex sm:flex-wrap sm:shrink-0">
          {/* Owner-only delete with inline confirm (no native confirm() dialog). */}
          {isOwner &&
            (confirmingDelete ? (
              <span className="col-span-2 grid grid-cols-2 gap-1 sm:flex sm:items-center">
                <button
                  className="min-h-11 rounded-control bg-state-danger/15 px-3 font-ui text-sm font-semibold text-state-danger disabled:opacity-40 sm:min-h-0 sm:rounded-pill sm:py-1.5"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? '…' : 'Delete class'}
                </button>
                <button
                  className="min-h-11 rounded-control border border-interactive/40 px-3 font-ui text-sm text-text-secondary sm:min-h-0 sm:rounded-pill sm:py-1.5"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                className="min-h-11 rounded-control border border-state-danger/50 px-3 font-ui text-sm text-state-danger sm:min-h-0 sm:rounded-pill sm:px-4 sm:py-1.5"
                onClick={() => setConfirmingDelete(true)}
                title="Delete this class"
              >
                Delete
              </button>
            ))}
          <button
            className="order-first col-span-2 min-h-11 rounded-control rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 sm:order-none sm:col-span-auto sm:min-h-0 sm:rounded-pill sm:px-4 sm:py-1.5"
            onClick={onRun}
            disabled={!canRun}
            aria-describedby={runBlockedReason ? runBlockedId : undefined}
            title={canRun ? 'Run this class live' : undefined}
          >
            ▶ Run live
          </button>
        </div>
      </div>
      {/* Why Run live is unavailable — the caution channel (glyph + words, never
          color alone), tied to the button via aria-describedby above. */}
      {runBlockedReason && (
        <p
          id={runBlockedId}
          className="flex items-center gap-1.5 font-ui text-xs text-state-caution"
        >
          <span aria-hidden className="font-data leading-none">
            !
          </span>
          {runBlockedReason}
        </p>
      )}
      {/* Summary stats — BPM/time weighted in the Azeret Mono data face. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-text-secondary">
        <span>
          {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
        </span>
        {payload && (
          <>
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
            <span>{formatDuration(payload.class.totalDurationMs)} total</span>
          </>
        )}
        {payload && trackCount > 0 && (
          <>
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
            {averageBpm != null ? (
              <span>
                avg <span className="text-text-primary">{averageBpm}</span> BPM
              </span>
            ) : (
              // No track carries a BPM yet — name the gap instead of silently dropping
              // the stat (design system 10 §1a). Caution channel; BPM never blocks a run.
              <span className="font-semibold text-state-caution">add BPM · pulse off</span>
            )}
          </>
        )}
      </div>
      {/* Readiness — duration/tempo/cues-moves/music, derived from the run-payload
          and surfaced before Live (P0 #2). Shown once the class has tracks; an
          empty class already prompts to add one below the ribbon. */}
      {readiness && trackCount > 0 && (
        <ClassReadinessSummary
          readiness={readiness}
          canEdit={canEdit}
          onSelectTrack={onSelectTrack}
        />
      )}
    </div>
  );
}

/**
 * The ordered, reorderable track list (design system `09-class-builder-guidelines.md`).
 * Reorder is both **drag** (a dedicated grip handle, so the row click still selects)
 * and **keyboard** (↑/↓ on the focused grip — native DnD isn't keyboard-operable).
 *
 * Local `order` mirrors the server's run-payload order and is updated optimistically;
 * the reorder POST (a full permutation, edit access) then drives a detail reload so the
 * ribbon + per-track offsets recompute. A failed POST rolls the order back. Only the
 * owner/editor sees the grip (the route enforces edit access regardless).
 */
function ReorderableTrackList({
  classId,
  entries,
  canReorder,
  selectedTrackId,
  onSelect,
  onReordered,
}: {
  classId: string;
  entries: RunPayloadTrackEntry[];
  canReorder: boolean;
  selectedTrackId: string | null;
  onSelect: (classTrackId: string) => void;
  onReordered: () => void;
}) {
  const [order, setOrder] = useState<RunPayloadTrackEntry[]>(entries);
  // Re-sync whenever a reload delivers a fresh payload (confirms or replaces the
  // optimistic order). Rows keep stable keys, so focus survives the reorder.
  useEffect(() => setOrder(entries), [entries]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commit = async (next: RunPayloadTrackEntry[]) => {
    const prev = order;
    setOrder(next); // optimistic
    setBusy(true);
    setError(null);
    try {
      await reorderTracks(
        classId,
        next.map((e) => e.classTrackId),
      );
      onReordered(); // reload so the ribbon + offsets reflect the new order
    } catch (e) {
      setOrder(prev); // roll back
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const move = (from: number, to: number) => {
    if (busy || to < 0 || to >= order.length || from === to) return;
    void commit(moveItem(order, from, to));
  };

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <ol className="flex flex-col gap-2">
      {order.map((t, i) => (
        <SongRow
          key={t.classTrackId}
          entry={t}
          position={i}
          count={order.length}
          canReorder={canReorder}
          selected={t.classTrackId === selectedTrackId}
          dragging={dragIndex === i}
          dropTarget={overIndex === i && dragIndex !== null && dragIndex !== i}
          onSelect={() => onSelect(t.classTrackId)}
          onDragStart={() => setDragIndex(i)}
          onDragEnter={() => dragIndex !== null && setOverIndex(i)}
          onDragEnd={endDrag}
          onDrop={() => {
            if (dragIndex !== null) move(dragIndex, i);
            endDrag();
          }}
          onKeyMove={(dir) => move(i, i + dir)}
        />
      ))}
      {error && <li className="font-ui text-xs text-state-danger">{error}</li>}
    </ol>
  );
}

/**
 * The low-noise song row (design system `09-class-builder-guidelines.md`): small
 * album art, title + artist, BPM weighted in the Azeret Mono data face, and
 * intensity as bars+label — never color alone. No oversized art, no chrome.
 * The selection button (the bulk of the row) opens the inspector; a separate drag
 * **grip** handles reorder so the two interactions never collide. `position` is the
 * live list index (1-based for display), authoritative over the payload's stale
 * `entry.position` during an optimistic reorder.
 */
function SongRow({
  entry,
  position,
  count,
  selected,
  canReorder,
  dragging,
  dropTarget,
  onSelect,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onKeyMove,
}: {
  entry: RunPayloadTrackEntry;
  position: number;
  count: number;
  selected: boolean;
  canReorder: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onKeyMove: (direction: 1 | -1) => void;
}) {
  return (
    <li
      onDragOver={canReorder ? (e) => e.preventDefault() : undefined}
      onDragEnter={canReorder ? onDragEnter : undefined}
      onDrop={
        canReorder
          ? (e) => {
              e.preventDefault();
              onDrop();
            }
          : undefined
      }
      className={`flex min-w-0 flex-wrap items-stretch gap-1 rounded-card transition-opacity sm:flex-nowrap sm:items-center ${
        dropTarget ? 'ring-2 ring-interactive/60' : ''
      } ${dragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex min-w-0 flex-[1_1_16rem] flex-wrap items-center gap-2 rounded-card bg-bg-base px-3 py-2 text-left sm:flex-nowrap sm:gap-3 ${
          selected ? 'ring-2 ring-interactive' : ''
        }`}
      >
        <span className="w-5 shrink-0 font-data text-xs text-text-tertiary">{position + 1}</span>
        {/* Album art is a small creative trigger (44px), not a focal point. */}
        {entry.track.albumArtUrl ? (
          <img
            src={entry.track.albumArtUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-11 w-11 shrink-0 rounded-card object-cover"
          />
        ) : (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-raised text-text-tertiary"
            aria-hidden
          >
            ♪
          </span>
        )}
        <div className="min-w-0 flex-[1_1_9rem]">
          <p className="truncate font-ui text-sm font-semibold text-text-primary">
            {entry.track.title}
          </p>
          <p className="truncate font-ui text-xs text-text-secondary">{entry.track.artist}</p>
        </div>
        <span className="flex min-w-0 flex-[1_1_100%] flex-wrap items-center gap-x-2 gap-y-1 sm:flex-[0_0_auto] sm:flex-nowrap">
          <IntensityReadout intensity={entry.intensity} />
          {entry.displayBpm != null ? (
            <span className="shrink-0 font-data text-sm text-text-secondary">
              {entry.displayBpm}
              <span className="ml-1 text-xs text-text-tertiary">BPM</span>
            </span>
          ) : (
            // Missing BPM is a next-action, not silent metadata (design system 10 §1a):
            // name it in place, on the caution channel, parallel to "Duration needed".
            // BPM is not a hard gate (only duration blocks Live), so it warns amber
            // rather than intensity-hard, and never claims a fabricated "~auto" value.
            <span className="shrink-0 font-ui text-xs font-semibold text-state-caution">
              BPM needed
            </span>
          )}
          {entry.displayRpm != null && (
            <>
              {entry.displayBpm != null && (
                <span className="shrink-0 text-xs text-text-tertiary" aria-hidden="true">
                  ·
                </span>
              )}
              <span className="shrink-0 font-data text-sm text-text-secondary">
                {entry.displayRpm}
                <span className="ml-1 text-xs text-text-tertiary">RPM</span>
              </span>
            </>
          )}
          {entry.holdCount != null && (
            <>
              {(entry.displayBpm != null || entry.displayRpm != null) && (
                <span className="shrink-0 text-xs text-text-tertiary" aria-hidden="true">
                  ·
                </span>
              )}
              <span className="shrink-0 font-data text-sm text-text-secondary">
                {entry.holdCount}
                <span className="ml-1 text-xs text-text-tertiary">
                  {entry.holdCount === 1 ? 'Hold' : 'Holds'}
                </span>
              </span>
            </>
          )}
          {entry.track.durationMs == null && (
            <span className="shrink-0 font-ui text-xs font-semibold text-intensity-hard">
              Duration needed
            </span>
          )}
        </span>
      </button>
      {/* Drag grip — a dedicated reorder handle (drag) that is also keyboard-operable
          (↑/↓). Kept off the selection button so neither gesture clobbers the other. */}
      {canReorder && (
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onKeyMove(-1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              onKeyMove(1);
            }
          }}
          aria-label={`Reorder ${entry.track.title}, position ${position + 1} of ${count}. Use arrow up and down.`}
          title="Drag, or use ↑/↓, to reorder"
          className="shrink-0 cursor-grab rounded-card px-2 py-3 font-data text-text-tertiary hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-interactive active:cursor-grabbing"
        >
          ⋮⋮
        </button>
      )}
    </li>
  );
}

/** Fallback row when the run-payload is unavailable: just the persisted class-track. */
function LeanTrackRow({ track }: { track: ClassTrack }) {
  return (
    <li className="flex items-center gap-3 rounded-pill bg-bg-base px-3 py-2">
      <span className="font-data text-xs text-text-tertiary">#{track.position + 1}</span>
      <IntensityReadout intensity={track.intensity} />
      <span className="ml-auto font-data text-xs text-text-tertiary">
        +{Math.round((track.startOffsetMs ?? 0) / 1000)}s
      </span>
    </li>
  );
}

/**
 * The detail editor / inspector (design system `09-class-builder-guidelines.md`):
 * edit the selected track's intensity, display-BPM override, and notes — and
 * remove it. Seeds from the persisted ClassTrack (which carries the raw override,
 * unlike the run-payload's resolved `displayBpm`). Saving reloads the class so the
 * ribbon + rows reflect the change immediately. View-only access ⇒ read-only.
 */
function TrackInspector({
  track,
  title,
  durationMs,
  displayBpm,
  canEdit,
  canPlaceFreely,
  focus,
  onSaved,
  onRemoved,
  onOpenSongsByMove,
}: {
  track: ClassTrack;
  title: string;
  durationMs: number | null;
  /** Resolved BPM (override ?? base) — drives beat-snapping in the choreography editor. */
  displayBpm: number | null;
  canEdit: boolean;
  /** Free-placement mode: show the editable "Start at" timeline offset. */
  canPlaceFreely: boolean;
  /** A marker click asking to focus a cue/move row on this track (or null). */
  focus: { kind: 'cue' | 'move'; id: string; anchorMs: number; nonce: number } | null;
  onSaved: () => void;
  onRemoved: () => void;
  /** Open the Songs-by-Move dialog from the Moves section. */
  onOpenSongsByMove: () => void;
}) {
  const [intensity, setIntensity] = useState<Intensity>(track.intensity);
  const [bpm, setBpm] = useState(track.displayBpmOverride?.toString() ?? '');
  const [rpm, setRpm] = useState(track.displayRpm?.toString() ?? '');
  const [holdCountVal, setHoldCountVal] = useState(track.holdCount?.toString() ?? '');
  const [duration, setDuration] = useState(formatDurationInput(durationMs));
  // Trim window (m:ss, track-relative). Empty start = from the beginning (0);
  // empty end = to the track's end (null).
  const [clipStart, setClipStart] = useState(
    track.clipStartMs ? formatDurationInput(track.clipStartMs) : '',
  );
  const [clipEnd, setClipEnd] = useState(
    track.clipEndMs != null ? formatDurationInput(track.clipEndMs) : '',
  );
  // Downbeat offset (m:ss, track-relative) for the beat grid. Blank = 0:00.
  const [downbeat, setDownbeat] = useState(
    track.beatAnchorMs ? formatDurationInput(track.beatAnchorMs) : '',
  );
  // Free-placement start on the class timeline (m:ss). Blank = 0:00.
  const [startAt, setStartAt] = useState(
    track.startOffsetMs ? formatDurationInput(track.startOffsetMs) : '',
  );
  const [notes, setNotes] = useState(track.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // BPM lookup (the third-party tempo provider — never Spotify) fills the track's
  // base display BPM; the resolved row BPM is still override ?? base.
  const [bpmBusy, setBpmBusy] = useState(false);
  const [bpmStatus, setBpmStatus] = useState<string | null>(null);

  const lookupTrackBpm = async () => {
    setBpmBusy(true);
    setBpmStatus(null);
    setError(null);
    try {
      const updated = await lookupBpm(track.trackId);
      setBpmStatus(
        updated.bpmApplied && updated.displayBpm != null
          ? `Found ${updated.displayBpm} BPM`
          : 'No BPM found',
      );
      onSaved(); // reload so the resolved row/ribbon BPM reflects the new base
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBpmBusy(false);
    }
  };

  const save = async () => {
    const parsedDuration = parseDurationInput(duration);
    if (parsedDuration == null) {
      setError('Enter a positive duration as minutes:seconds, for example 3:45.');
      return;
    }
    // Clip start: blank = 0 (from the beginning). Clip end: blank = null (to the end).
    const clipStartMs = clipStart.trim() === '' ? 0 : parseDurationInput(clipStart);
    if (clipStartMs == null) {
      setError('Enter the clip start as minutes:seconds, for example 0:30 (or leave it blank).');
      return;
    }
    const clipEndMs = clipEnd.trim() === '' ? null : parseDurationInput(clipEnd);
    if (clipEnd.trim() !== '' && clipEndMs == null) {
      setError('Enter the clip end as minutes:seconds, for example 2:15 (or leave it blank).');
      return;
    }
    if (clipEndMs != null && clipEndMs <= clipStartMs) {
      setError('Clip end must be after clip start.');
      return;
    }
    // Downbeat: blank = 0 (grid starts at the track start).
    const beatAnchorMs = downbeat.trim() === '' ? 0 : parseDurationInput(downbeat);
    if (beatAnchorMs == null) {
      setError('Enter the downbeat as minutes:seconds, for example 0:02 (or leave it blank).');
      return;
    }
    // Free-placement start (only sent in free mode; the server rejects it otherwise).
    let startOffsetMs: number | undefined;
    if (canPlaceFreely) {
      const parsed = startAt.trim() === '' ? 0 : parseDurationInput(startAt);
      if (parsed == null) {
        setError('Enter the start time as minutes:seconds, for example 3:20 (or leave it blank).');
        return;
      }
      startOffsetMs = parsed;
    }
    setBusy(true);
    setError(null);
    try {
      const trimmedBpm = bpm.trim();
      const trimmedRpm = rpm.trim();
      const trimmedHolds = holdCountVal.trim();
      await updateClassTrack(track.id, {
        intensity,
        displayBpmOverride: trimmedBpm === '' ? null : Number(trimmedBpm),
        displayRpm: trimmedRpm === '' ? null : Number(trimmedRpm),
        holdCount: trimmedHolds === '' ? null : Number(trimmedHolds),
        durationMsOverride: parsedDuration,
        clipStartMs,
        clipEndMs,
        beatAnchorMs,
        ...(startOffsetMs !== undefined ? { startOffsetMs } : {}),
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteClassTrack(track.id);
      onRemoved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-card border border-interactive/20 bg-bg-base p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-display text-sm font-semibold text-text-primary">{title}</h3>
        <span className="shrink-0 font-ui text-xs uppercase tracking-wide text-text-tertiary">
          Track {track.position + 1}
        </span>
      </div>

      {!canEdit ? (
        // Read-only: show the current values without editable controls.
        <div className="flex items-center gap-4">
          <IntensityReadout intensity={track.intensity} />
          {track.displayBpmOverride != null && (
            <span className="font-data text-sm text-text-secondary">
              {track.displayBpmOverride} BPM
            </span>
          )}
          {track.displayRpm != null && (
            <span className="font-data text-sm text-text-secondary">{track.displayRpm} RPM</span>
          )}
          {track.holdCount != null && (
            <span className="font-data text-sm text-text-secondary">
              {track.holdCount} {track.holdCount === 1 ? 'Hold' : 'Holds'}
            </span>
          )}
          {track.notes && <span className="font-ui text-xs text-text-tertiary">{track.notes}</span>}
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
              Intensity
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <IntensitySegmentedControl
                value={intensity}
                onChange={setIntensity}
                ariaLabel="Track intensity"
              />
              <IntensityReadout intensity={intensity} />
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
              Display BPM override
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="—"
                className="w-32 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
              />
              {/* Auto-fill the track's base BPM from the tempo service (never Spotify). */}
              <button
                type="button"
                onClick={lookupTrackBpm}
                disabled={bpmBusy}
                className="rounded-pill border border-interactive/40 px-3 py-1.5 font-ui text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                {bpmBusy ? 'Looking up…' : 'Look up BPM'}
              </button>
              {bpmStatus && (
                <span className="font-data text-xs text-text-tertiary">{bpmStatus}</span>
              )}
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
              Duration
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="m:ss"
              aria-describedby={`duration-help-${track.id}`}
              className="w-32 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <span id={`duration-help-${track.id}`} className="font-ui text-xs text-text-tertiary">
              Minutes:seconds. Used for this class timeline.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
              Notes
            </span>
            <textarea
              rows={2}
              className="resize-none rounded-card border border-interactive/30 bg-bg-raised px-3 py-2 font-ui text-sm text-text-primary"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {/* Advanced — the long tail (cadence, holds, trim, downbeat, placement),
              collapsed by default so the common act reads as scoring the class, not
              filling every field before the shape is visible (design system 09
              §Inspector "score, don't fill"). Native <details>: the inputs stay
              mounted, so the single Save below still commits them while collapsed. */}
          <details>
            <summary className="cursor-pointer font-ui text-xs uppercase tracking-wide text-text-tertiary hover:text-text-secondary">
              Advanced
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                    RPM
                  </span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="—"
                    aria-describedby={`rpm-help-${track.id}`}
                    className="w-32 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
                    value={rpm}
                    onChange={(e) => setRpm(e.target.value)}
                  />
                  <span id={`rpm-help-${track.id}`} className="font-ui text-xs text-text-tertiary">
                    Cadence — not derived from BPM
                  </span>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                    Holds
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="—"
                    aria-describedby={`holds-help-${track.id}`}
                    className="w-32 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
                    value={holdCountVal}
                    onChange={(e) => setHoldCountVal(e.target.value)}
                  />
                  <span
                    id={`holds-help-${track.id}`}
                    className="font-ui text-xs text-text-tertiary"
                  >
                    Hold count for this track
                  </span>
                </label>
              </div>

              <fieldset className="flex flex-col gap-1">
                <legend className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                  Trim
                </legend>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="start"
                    aria-label="Clip start (minutes:seconds)"
                    aria-describedby={`clip-help-${track.id}`}
                    className="w-24 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
                    value={clipStart}
                    onChange={(e) => setClipStart(e.target.value)}
                  />
                  <span aria-hidden className="font-ui text-sm text-text-tertiary">
                    –
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="end"
                    aria-label="Clip end (minutes:seconds)"
                    aria-describedby={`clip-help-${track.id}`}
                    className="w-24 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
                    value={clipEnd}
                    onChange={(e) => setClipEnd(e.target.value)}
                  />
                </div>
                <span id={`clip-help-${track.id}`} className="font-ui text-xs text-text-tertiary">
                  Play only part of the track. Blank start = from the beginning; blank end = to the
                  end.
                </span>
              </fieldset>

              <label className="flex flex-col gap-1">
                <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                  Downbeat
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="m:ss"
                  aria-describedby={`downbeat-help-${track.id}`}
                  className="w-32 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
                  value={downbeat}
                  onChange={(e) => setDownbeat(e.target.value)}
                />
                <span
                  id={`downbeat-help-${track.id}`}
                  className="font-ui text-xs text-text-tertiary"
                >
                  {displayBpm
                    ? `Where beat 1 lands. Sets the ${displayBpm} BPM grid for snapping (4/4).`
                    : 'Set a BPM above to enable beat-snapping.'}
                </span>
              </label>

              {canPlaceFreely && (
                <label className="flex flex-col gap-1">
                  <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                    Start at
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="m:ss"
                    aria-describedby={`startat-help-${track.id}`}
                    className="w-32 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                  <span
                    id={`startat-help-${track.id}`}
                    className="font-ui text-xs text-text-tertiary"
                  >
                    Where this track starts on the class timeline. Gaps are allowed; overlaps are
                    not.
                  </span>
                </label>
              )}
            </div>
          </details>

          {error && <p className="font-ui text-sm text-state-danger">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
              onClick={save}
              disabled={busy}
            >
              Save
            </button>
            <button
              className="ml-auto rounded-pill border border-state-danger/50 px-4 py-1.5 font-ui text-sm text-state-danger disabled:opacity-40"
              onClick={remove}
              disabled={busy}
            >
              Remove track
            </button>
          </div>

          {/* Choreography anchored to this track — cues + placed moves. Lazy-loaded
              (one shared ChoreographyEditor chunk) behind a Suspense fallback. */}
          <hr className="border-interactive/20" />
          <Suspense
            fallback={<p className="font-ui text-xs text-text-tertiary">Loading choreography…</p>}
          >
            <CuesSection
              classTrackId={track.id}
              durationMs={durationMs}
              bpm={displayBpm}
              beatAnchorMs={track.beatAnchorMs}
              focus={
                focus?.kind === 'cue'
                  ? { id: focus.id, anchorMs: focus.anchorMs, nonce: focus.nonce }
                  : null
              }
            />
            <MovesSection
              classTrackId={track.id}
              durationMs={durationMs}
              bpm={displayBpm}
              beatAnchorMs={track.beatAnchorMs}
              focus={
                focus?.kind === 'move'
                  ? { id: focus.id, anchorMs: focus.anchorMs, nonce: focus.nonce }
                  : null
              }
              onChanged={onSaved}
              onOpenSongsByMove={onOpenSongsByMove}
            />
          </Suspense>
        </>
      )}
    </section>
  );
}

function AddTrackForm({
  classId,
  onAdded,
  onError,
}: {
  classId: string;
  onAdded: () => void;
  onError: (msg: string | null) => void;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [duration, setDuration] = useState('3:00');
  const [intensity, setIntensity] = useState<Intensity>('mod');
  const { busy, run } = useAsyncAction(onError);

  return (
    <form
      className="flex flex-col gap-2 border-t border-interactive/20 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !artist.trim()) return;
        const parsedDuration = parseDurationInput(duration);
        if (parsedDuration == null) {
          onError('Enter a positive duration as minutes:seconds, for example 3:45.');
          return;
        }
        onError(null);
        void run(async () => {
          await addTrack(classId, {
            track: {
              title: title.trim(),
              artist: artist.trim(),
              durationMs: parsedDuration,
            },
            intensity,
          });
          setTitle('');
          setArtist('');
          onAdded();
        });
      }}
    >
      <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Add a track</p>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-0 flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
          placeholder="Title"
          aria-label="Track title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="min-w-0 flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
          placeholder="Artist"
          aria-label="Track artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <IntensitySegmentedControl
          value={intensity}
          onChange={setIntensity}
          ariaLabel="Track intensity"
        />
        <input
          className="w-28 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-data text-sm text-text-primary"
          inputMode="numeric"
          placeholder="3:00"
          aria-label="Track duration in minutes and seconds"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <button
          disabled={busy}
          className="ml-auto rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50"
        >
          {busy ? '…' : 'Add track'}
        </button>
      </div>
    </form>
  );
}
