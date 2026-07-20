/** Minimal authenticated builder: create a class, add a tagged track, see the timeline. */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  Suspense,
  type FormEvent,
} from 'react';
import {
  providerCapabilities,
  type Class,
  type ClassWithAccess,
  type ClassListItem,
  type ClassTemplate,
  type ClassTrack,
  type Intensity,
  type MusicConnectionView,
  type Provider,
  type ProviderPlaylistSummary,
  type RunPayload,
  type RunPayloadTrackEntry,
  type TrackSearchResult,
  type User,
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
  listConnections,
  listLikes,
  listPlaylists,
  listPlaylistTracks,
  importTrack,
  getMe,
  updateMe,
} from '../lib/api.js';
import { authClient } from '../lib/auth-client.js';
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
import { classReadiness, type ClassReadiness } from '../lib/readiness.js';
import { summarizeQueue } from '../lib/live-readiness.js';
import { errMessage } from '../lib/errors.js';
import { classDetailReducer, initialClassDetailState } from '../lib/class-detail-state.js';
import {
  libraryView,
  organizeClasses,
  CLASS_SORT_OPTIONS,
  DEFAULT_CLASS_SORT,
  type ClassSortKey,
  type ListStatus,
} from '../lib/library-state.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import {
  PROVIDER_ORDER,
  providerCapabilityTruth,
  providerConnectionState,
  providerLabel,
  type ProviderCapabilityView,
} from '../lib/providers.js';
import { Dialog } from './Dialog.js';
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
import { ClassRunOfShowShelf } from './ClassRunOfShowShelf.js';
import { RecoveryState, StatusLabel } from './SharedState.js';

// Code-split the heavy, interaction-gated surfaces into their own chunks so the
// initial builder paint doesn't ship Live mode, the choreography editor, or the
// modal dialogs. Each loads on first use behind a <Suspense> boundary below.
const LiveMode = lazyWithReload(() =>
  import('./LiveMode.js').then((m) => ({ default: m.LiveMode })),
);
const ConnectionsDialog = lazyWithReload(() =>
  import('./ConnectionsDialog.js').then((m) => ({ default: m.ConnectionsDialog })),
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

type DashboardDestination = 'classes' | 'music' | 'live' | 'account';

interface CollectionImportResult {
  classId: string;
  classTitle: string;
  imported: number;
  total: number;
  failed: TrackSearchResult[];
}

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
  const [destination, setDestination] = useState<DashboardDestination>('classes');
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
  // Live Mode is a full-tree swap (see the `if (live)` early return below), so the
  // control that opened it never survives to be refocused on exit — the dashboard
  // remounts fresh. Restore focus to the primary heading instead, the same
  // deterministic-landmark discipline as #250's preflight entry-focus fix.
  const dashboardHeadingRef = useRef<HTMLHeadingElement>(null);
  const restoreFocusOnExitRef = useRef(false);
  const exitLive = useCallback(() => {
    restoreFocusOnExitRef.current = true;
    setLive(null);
  }, []);
  useEffect(() => {
    if (live || !restoreFocusOnExitRef.current) return;
    restoreFocusOnExitRef.current = false;
    dashboardHeadingRef.current?.focus();
  }, [live]);
  // Read-only preview of one of the caller's own classes from a Library card.
  const [cardPreview, setCardPreview] = useState<ClassListItem | null>(null);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionRevision, setConnectionRevision] = useState(0);
  const [songsByMoveOpen, setSongsByMoveOpen] = useState(false);
  const [playlistBrowse, setPlaylistBrowse] = useState<{
    provider: Provider;
    playlists: ProviderPlaylistSummary[];
  } | null>(null);
  const [likesBrowse, setLikesBrowse] = useState<{
    provider: Provider;
    tracks: TrackSearchResult[];
  } | null>(null);
  const [onboardingVideoOpen, setOnboardingVideoOpen] = useState(false);
  // Presentational confirmation only. This set resets with the authenticated
  // dashboard and is never written to storage or sent to the API.
  const [confirmedPulseIds, setConfirmedPulseIds] = useState<Set<string>>(new Set());
  const [oauthResult, setOauthResult] = useState<{ connected?: string; error?: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CollectionImportResult | null>(null);
  const [retryingImport, setRetryingImport] = useState(false);

  const togglePulseConfirmation = useCallback((classId: string) => {
    setConfirmedPulseIds((current) => {
      const next = new Set(current);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }, []);

  const focusClassCreator = useCallback(() => {
    document.getElementById('new-class-title')?.focus();
  }, []);

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
    if (destination === 'classes' && selected) {
      document.title = `${selected.title} - Ritmo Studio`;
    } else if (destination === 'music') {
      document.title = 'Music - Ritmo Studio';
    } else if (destination === 'live') {
      document.title = 'Live - Ritmo Studio';
    } else if (destination === 'account') {
      document.title = 'Account - Ritmo Studio';
    } else {
      document.title = 'Ritmo Studio';
    }
  }, [destination, selected]);

  // Load (or reload) one class detail under a monotonic request generation. The
  // reducer ignores late responses, and begin immediately masks the prior class.
  //
  // `silent` skips the loading mask: the current 'ready' detail stays on screen
  // until 'success' replaces it, so an in-place refresh (e.g. after a keyboard
  // reorder) never unmounts the workspace — preserving grip focus and the reorder
  // announcement. Only use it to refresh the class already open, never to switch.
  const loadDetail = useCallback(async (classId: string, opts?: { silent?: boolean }) => {
    const requestId = ++detailRequestId.current;
    if (!opts?.silent) dispatchDetail({ type: 'begin', classId, requestId });
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

  const importCollectionTracks = useCallback(
    async (classId: string, candidates: TrackSearchResult[]) => {
      const failed: TrackSearchResult[] = [];
      const CONCURRENCY = 4;
      const pending = [...candidates];
      while (pending.length > 0) {
        const batch = pending.splice(0, CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (candidate) => {
            const track = await importTrack(candidate.provider, candidate.providerTrackId);
            await addTrack(classId, { trackId: track.id, intensity: 'mod' });
          }),
        );
        results.forEach((result, index) => {
          if (result.status === 'rejected' && batch[index]) failed.push(batch[index]);
        });
      }
      return failed;
    },
    [],
  );

  /** Fetch source material before creating the destination class. A partial import
   * remains recoverable against the same class id, so retry can never duplicate it. */
  const handleCreateClassFromPlaylist = useCallback(
    async (
      provider: Provider,
      playlistId: string,
      playlistName: string,
      template: ClassTemplate,
    ) => {
      const tracks = await listPlaylistTracks(provider, playlistId);
      if (tracks.length === 0) {
        throw new Error(
          'No tracks found in this playlist. Choose another playlist to start a class.',
        );
      }
      const cls = await createClass({ title: playlistName, template });
      await applyTagFilter(null);
      const failed = await importCollectionTracks(cls.id, tracks);
      setImportResult({
        classId: cls.id,
        classTitle: cls.title,
        imported: tracks.length - failed.length,
        total: tracks.length,
        failed,
      });
      setPlaylistBrowse(null);
      await openClass({ ...cls, accessLevel: 'owner' });
    },
    [applyTagFilter, importCollectionTracks, openClass],
  );

  /**
   * Create a new class from a provider's liked tracks. Likes are one collection
   * (not many named playlists), so the caller supplies the class title; the
   * tracks were already loaded for the resting shelf, so import them directly.
   * Best-effort per track so a single failing song doesn't abort the import.
   */
  const handleCreateClassFromLikes = useCallback(
    async (tracks: TrackSearchResult[], title: string, template: ClassTemplate) => {
      const cls = await createClass({ title, template });
      await applyTagFilter(null);
      const failed = await importCollectionTracks(cls.id, tracks);
      setImportResult({
        classId: cls.id,
        classTitle: cls.title,
        imported: tracks.length - failed.length,
        total: tracks.length,
        failed,
      });
      setLikesBrowse(null);
      await openClass({ ...cls, accessLevel: 'owner' });
    },
    [applyTagFilter, importCollectionTracks, openClass],
  );

  const retryFailedImport = useCallback(async () => {
    if (!importResult || importResult.failed.length === 0 || retryingImport) return;
    setRetryingImport(true);
    try {
      const attempted = importResult.failed.length;
      const failed = await importCollectionTracks(importResult.classId, importResult.failed);
      setImportResult((current) =>
        current
          ? {
              ...current,
              imported: current.imported + attempted - failed.length,
              failed,
            }
          : null,
      );
      if (selected?.id === importResult.classId) {
        await loadDetail(importResult.classId, { silent: true });
      }
    } finally {
      setRetryingImport(false);
    }
  }, [importCollectionTracks, importResult, loadDetail, retryingImport, selected?.id]);

  if (live)
    return (
      <ErrorBoundary resetLabel="Exit live mode" onReset={exitLive}>
        <Suspense fallback={<LoadingScreen />}>
          <LiveMode payload={live} onExit={exitLive} />
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
          <h1
            ref={dashboardHeadingRef}
            tabIndex={-1}
            className="font-display text-xl font-bold tracking-[-0.01em] text-text-primary focus:outline-none"
          >
            Ritmo Studio
          </h1>
        </div>
        {/* Primary destinations — the same map on every viewport. Mobile compresses
            the rail horizontally; desktop breathes it into the top shell. */}
        <nav className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
          <p className="hidden font-ui text-sm text-text-secondary sm:block">{profileName}</p>
          {(
            [
              ['classes', 'Classes'],
              ['music', 'Music'],
              ['live', 'Live'],
              ['account', 'Account'],
            ] as const
          ).map(([value, label]) => {
            const active = destination === value;
            return (
              <button
                key={value}
                type="button"
                aria-current={active ? 'page' : undefined}
                className={`min-h-11 shrink-0 rounded-control border px-3 font-ui text-xs font-semibold transition-colors sm:min-h-0 sm:rounded-pill sm:px-4 sm:py-1.5 sm:text-sm ${
                  active
                    ? 'border-transparent bg-transparent text-text-primary underline decoration-interactive decoration-2 underline-offset-8'
                    : 'border-transparent bg-transparent text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => {
                  setDestination(value);
                  if (value === 'classes') {
                    setSelected(null);
                    dispatchDetail({ type: 'reset', requestId: ++detailRequestId.current });
                  }
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Lazy modal chunks — fallback null so the trigger feels instant; the modal
          paints once its chunk resolves (near-instant on a warm cache). */}
      <Suspense fallback={null}>
        {connectionsOpen && (
          <ConnectionsDialog
            oauthResult={oauthResult}
            onConnectionsChanged={() => setConnectionRevision((revision) => revision + 1)}
            onClose={() => {
              setConnectionsOpen(false);
              setOauthResult(null);
            }}
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
        {playlistBrowse && (
          <PlaylistBrowserDialog
            provider={playlistBrowse.provider}
            playlists={playlistBrowse.playlists}
            onClose={() => setPlaylistBrowse(null)}
            onCreateClass={handleCreateClassFromPlaylist}
          />
        )}
        {likesBrowse && (
          <LikesBrowserDialog
            provider={likesBrowse.provider}
            tracks={likesBrowse.tracks}
            onClose={() => setLikesBrowse(null)}
            onCreateClass={handleCreateClassFromLikes}
          />
        )}
        {cardPreview && (
          <ClassSummaryView
            classId={cardPreview.id}
            pulseConfirmed={confirmedPulseIds.has(cardPreview.id)}
            onTogglePulseConfirmation={() => togglePulseConfirmation(cardPreview.id)}
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
        {error &&
          !(destination === 'classes' && listStatus === 'error' && classes.length === 0) && (
            <p className="mb-4 font-ui text-sm text-state-danger">{error}</p>
          )}
        {importResult && (
          <div
            role={importResult.failed.length > 0 ? 'alert' : 'status'}
            className={`mb-4 flex min-w-0 flex-wrap items-center gap-3 rounded-card border p-3 font-ui text-sm ${
              importResult.failed.length > 0
                ? 'border-state-caution/30 bg-state-caution/5 text-text-primary'
                : 'border-state-positive/25 bg-state-positive/5 text-text-secondary'
            }`}
          >
            <p className="min-w-0 flex-1">
              {importResult.failed.length > 0
                ? `${importResult.imported} of ${importResult.total} tracks imported into ${importResult.classTitle}. ${importResult.failed.length} still need attention.`
                : `All ${importResult.total} tracks imported into ${importResult.classTitle}.`}
            </p>
            {importResult.failed.length > 0 && (
              <button
                type="button"
                disabled={retryingImport}
                onClick={() => void retryFailedImport()}
                className="min-h-11 rounded-control bg-interactive px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:min-h-9 sm:rounded-pill"
              >
                {retryingImport ? 'Retrying…' : `Retry ${importResult.failed.length} failed`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setImportResult(null)}
              className="min-h-11 rounded-control px-3 font-ui text-sm text-text-secondary hover:text-text-primary sm:min-h-9 sm:rounded-pill"
            >
              Dismiss
            </button>
          </div>
        )}

        {destination === 'classes' ? (
          /* The 3-pane workstation (design system 09): library · class · inspector.
              Collapses to a single stacked column below xl so it stays usable on
              smaller laptops. The class workspace contributes the center + inspector
              columns; the library is the first column. */
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[266px_minmax(0,1fr)_340px] xl:items-start">
            <LibraryRail
              className={selected ? 'order-3 xl:order-none' : undefined}
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
                onTrackAdded={() => void loadDetail(selected.id, { silent: true })}
                onChoreographyChanged={() => void loadDetail(selected.id, { silent: true })}
                onReordered={() => void loadDetail(selected.id, { silent: true })}
                onTrackRemoved={() => void loadDetail(selected.id, { silent: true })}
                onRun={() => runClass(selected.id)}
                onClassUpdated={applyClassUpdate}
                onClassDeleted={handleClassDeleted}
                onOpenSongsByMove={() => setSongsByMoveOpen(true)}
                onBackToClasses={() => {
                  setSelected(null);
                  dispatchDetail({ type: 'reset', requestId: ++detailRequestId.current });
                }}
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
            ) : (
              <WorkstationRestingState
                classes={classes}
                activeTag={activeTag}
                status={listStatus}
                libraryError={error}
                confirmedPulseIds={confirmedPulseIds}
                onTogglePulseConfirmation={togglePulseConfirmation}
                onOpen={openClass}
                onPreview={(cls) => setCardPreview(cls)}
                onClearTag={() => void applyTagFilter(null)}
                onRetry={() => {
                  setListStatus('loading');
                  void refreshClasses();
                }}
                onStartMusic={() => setDestination('music')}
                onStartMovement={() => setSongsByMoveOpen(true)}
                onStartTemplate={focusClassCreator}
                onStartManual={focusClassCreator}
              />
            )}
          </div>
        ) : destination === 'music' ? (
          <MusicWorkspace
            connectionRevision={connectionRevision}
            onOpenConnections={() => setConnectionsOpen(true)}
            onBrowsePlaylists={(provider, playlists) => setPlaylistBrowse({ provider, playlists })}
            onBrowseLikes={(provider, tracks) => setLikesBrowse({ provider, tracks })}
          />
        ) : destination === 'live' ? (
          <LiveWorkspace
            classes={classes}
            status={listStatus}
            onRunClass={runClass}
            onOpenClass={async (cls) => {
              setDestination('classes');
              await openClass(cls);
            }}
          />
        ) : (
          <AccountWorkspace
            profileName={profileName}
            connectionRevision={connectionRevision}
            onProfileUpdated={(user) => setProfileName(user.displayName ?? user.email)}
            onOpenConnections={() => setConnectionsOpen(true)}
          />
        )}
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
  className,
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
  className?: string;
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

  // Client-side organize over the *loaded* page set (search + sort). Server tag
  // filtering still happens upstream via `onSelectTag`; this narrows and re-orders
  // what's already in hand without another request.
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ClassSortKey>(DEFAULT_CLASS_SORT);
  const organized = useMemo(
    () => organizeClasses(classes, { query, sort }),
    [classes, query, sort],
  );
  const trimmedQuery = query.trim();
  // Only meaningful once there's a loaded list to organize.
  const showOrganize = view === 'list';
  // Narrowed by a client search: honest "X of N loaded" framing.
  const narrowed = trimmedQuery.length > 0 && organized.length !== classes.length;

  return (
    <aside className={`flex min-w-0 flex-col gap-3 xl:sticky xl:top-6 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
          Your classes
        </span>
        <span className="font-data text-xs text-text-tertiary">
          {narrowed
            ? `${organized.length} of ${classes.length} loaded`
            : `${classes.length} loaded`}
        </span>
      </div>
      <CreateClassForm onCreated={onCreate} onError={onError} />
      {showTagFilter && (
        <TagFilter knownTags={knownTags} activeTag={activeTag} onSelectTag={onSelectTag} />
      )}
      {showOrganize && (
        <LibraryOrganizeControls
          query={query}
          sort={sort}
          onQueryChange={setQuery}
          onSortChange={setSort}
        />
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
      ) : organized.length === 0 ? (
        // Loaded classes exist, but the client search matched none of them. Distinct
        // from a genuinely empty library, and recoverable without a reload.
        <div className="flex flex-col items-start gap-2">
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
        <ul className="flex flex-col gap-2">
          {organized.map((cls) => (
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
                className="min-h-11 rounded-control border border-interactive px-4 font-ui text-sm text-interactive disabled:opacity-40 sm:min-h-8 sm:rounded-pill"
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
 * Search + sort controls for the loaded class library. Both are labeled and
 * keyboard-reachable; the search clears with an inline button (shown only when
 * there's text) and the sort is a native `<select>` so it stays fully accessible.
 * These organize the already-loaded page set only — they don't refetch.
 */
function LibraryOrganizeControls({
  query,
  sort,
  onQueryChange,
  onSortChange,
}: {
  query: string;
  sort: ClassSortKey;
  onQueryChange: (value: string) => void;
  onSortChange: (value: ClassSortKey) => void;
}) {
  const sortId = 'library-sort';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {/* type="text" (not "search") so we own the single clear affordance below
            rather than doubling it with WebKit's native search-field clear button. */}
        <input
          type="text"
          role="searchbox"
          className="min-h-11 w-full rounded-control border border-interactive/30 bg-bg-base pl-3 pr-12 font-ui text-xs text-text-primary sm:min-h-8 sm:rounded-pill sm:pr-9"
          placeholder="Search loaded classes…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search loaded classes by title or type"
        />
        {query.trim() && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-control font-ui text-xs text-text-tertiary hover:text-text-primary sm:right-1 sm:min-h-8 sm:min-w-8 sm:rounded-full"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={sortId}
          className="font-ui text-[10px] uppercase tracking-wide text-text-tertiary"
        >
          Sort
        </label>
        <select
          id={sortId}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-interactive/30 bg-bg-base px-3 font-ui text-xs text-text-primary sm:min-h-8 sm:rounded-pill"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ClassSortKey)}
        >
          {CLASS_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
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
        <div className="flex items-center justify-end gap-x-1 border-t border-border-subtle px-2 font-ui text-xs text-text-tertiary">
          <button
            type="button"
            onClick={() => onPreview(cls)}
            aria-label={`Preview ${cls.title}`}
            title="Read-only preview"
            className="min-h-11 rounded-control px-3 hover:bg-bg-base hover:text-text-primary sm:min-h-8"
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
            className="min-h-11 rounded-control px-3 hover:bg-bg-base hover:text-text-primary disabled:opacity-40 sm:min-h-8"
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
            className="min-h-11 rounded-control border border-interactive bg-interactive px-2 font-ui text-xs text-bg-base sm:min-h-8 sm:rounded-pill"
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
              className="min-h-11 rounded-control border border-interactive/30 bg-bg-base px-2 font-ui text-xs text-text-secondary hover:text-text-primary sm:min-h-8 sm:rounded-pill"
            >
              #{tag}
            </button>
          ))}
      </div>
    </div>
  );
}

/**
 * The create-class chooser's D21 templates. Pilates maps to the shared `sculpt`
 * enum until the contract earns a rename; labels are presentation-only.
 */
const CREATE_TEMPLATE_OPTIONS: ReadonlyArray<{ value: ClassTemplate | null; label: string }> = [
  { value: 'cycle', label: 'Cycle' },
  { value: 'sculpt', label: 'Pilates' },
  { value: 'hiit', label: 'HIIT' },
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
  const canCreate = title.trim().length > 0 && template != null && !busy;
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || template == null) return;
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
          id="new-class-title"
          className="min-h-11 min-w-0 flex-1 rounded-control border border-interactive/30 bg-bg-base px-3 font-ui text-sm text-text-primary sm:rounded-pill sm:px-4 sm:text-base"
          placeholder="New class title"
          aria-label="New class title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          disabled={!canCreate}
          className="min-h-11 shrink-0 rounded-control rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:rounded-pill sm:px-4 sm:text-base"
        >
          {busy ? '…' : 'Add'}
        </button>
      </div>
      {/* D21 create path: a new blank class must pick Cycle, Pilates, or HIIT. */}
      <div
        role="group"
        aria-label="Class template required"
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
              className={`min-h-11 shrink-0 rounded-control border px-2.5 font-ui text-xs sm:min-h-8 sm:rounded-pill ${
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
      <p className="font-ui text-[11px] leading-4 text-text-tertiary">
        Choose a template to start; Pilates stores as the current Sculpt contract.
      </p>
    </form>
  );
}

function retainConnectedProviderState<T>(
  state: Partial<Record<Provider, T>>,
  connectedProviders: ReadonlySet<Provider>,
): Partial<Record<Provider, T>> {
  const next: Partial<Record<Provider, T>> = {};
  for (const provider of PROVIDER_ORDER) {
    if (connectedProviders.has(provider) && state[provider] !== undefined) {
      next[provider] = state[provider];
    }
  }
  return next;
}

function useProviderBrowseState(connectionRevision = 0) {
  const [connections, setConnections] = useState<MusicConnectionView[]>([]);
  const [connectionsStatus, setConnectionsStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [playlists, setPlaylists] = useState<Partial<Record<Provider, ProviderPlaylistSummary[]>>>(
    {},
  );
  const [playlistsLoading, setPlaylistsLoading] = useState<Partial<Record<Provider, boolean>>>({});
  const [playlistsError, setPlaylistsError] = useState<Partial<Record<Provider, string>>>({});
  const [likes, setLikes] = useState<Partial<Record<Provider, TrackSearchResult[]>>>({});
  const [likesLoading, setLikesLoading] = useState<Partial<Record<Provider, boolean>>>({});
  const [likesError, setLikesError] = useState<Partial<Record<Provider, string>>>({});
  const connectedProvidersRef = useRef<ReadonlySet<Provider>>(new Set());

  useEffect(() => {
    let alive = true;
    setConnectionsStatus('loading');
    void (async () => {
      try {
        const rows = await listConnections();
        if (!alive || !Array.isArray(rows)) return;
        const now = Date.now();
        const connectedProviders = new Set(
          PROVIDER_ORDER.filter(
            (provider) =>
              providerConnectionState(
                provider,
                rows.find((row) => row.provider === provider),
                now,
              ) === 'connected',
          ),
        );
        // Publish authoritative connection truth before React runs the browse-effect
        // cleanups so a racing shelf request cannot repopulate a disconnected source.
        connectedProvidersRef.current = connectedProviders;
        setPlaylists((prev) => retainConnectedProviderState(prev, connectedProviders));
        setPlaylistsLoading((prev) => retainConnectedProviderState(prev, connectedProviders));
        setPlaylistsError((prev) => retainConnectedProviderState(prev, connectedProviders));
        setLikes((prev) => retainConnectedProviderState(prev, connectedProviders));
        setLikesLoading((prev) => retainConnectedProviderState(prev, connectedProviders));
        setLikesError((prev) => retainConnectedProviderState(prev, connectedProviders));
        setConnections(rows);
        setConnectionsStatus('ready');
      } catch {
        // A failed status check is not evidence that the instructor disconnected.
        // Keep any last-known connections/shelves visible and offer an explicit retry.
        if (alive) setConnectionsStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [connectionAttempt, connectionRevision]);

  useEffect(() => {
    let alive = true;
    for (const provider of PROVIDER_ORDER) {
      if (!providerCapabilities[provider].savedPlaylists) continue;
      const state = providerConnectionState(
        provider,
        connections.find((row) => row.provider === provider),
        Date.now(),
      );
      if (state !== 'connected') continue;
      setPlaylistsLoading((prev) => ({ ...prev, [provider]: true }));
      void (async () => {
        try {
          const rows = await listPlaylists(provider);
          if (!alive || !connectedProvidersRef.current.has(provider)) return;
          setPlaylists((prev) => ({ ...prev, [provider]: Array.isArray(rows) ? rows : [] }));
          setPlaylistsError((prev) => ({ ...prev, [provider]: undefined }));
        } catch (e) {
          if (!alive || !connectedProvidersRef.current.has(provider)) return;
          setPlaylistsError((prev) => ({ ...prev, [provider]: (e as Error).message }));
        } finally {
          if (alive && connectedProvidersRef.current.has(provider)) {
            setPlaylistsLoading((prev) => ({ ...prev, [provider]: false }));
          }
        }
      })();
    }
    return () => {
      alive = false;
    };
  }, [connections]);

  // Liked tracks per connected provider — mirrors the playlist load above so the
  // shelf can show a live count and open the likes browser from the resting state.
  useEffect(() => {
    let alive = true;
    for (const provider of PROVIDER_ORDER) {
      if (!providerCapabilities[provider].userLikes) continue;
      const state = providerConnectionState(
        provider,
        connections.find((row) => row.provider === provider),
        Date.now(),
      );
      if (state !== 'connected') continue;
      setLikesLoading((prev) => ({ ...prev, [provider]: true }));
      void (async () => {
        try {
          const rows = await listLikes(provider);
          if (!alive || !connectedProvidersRef.current.has(provider)) return;
          setLikes((prev) => ({ ...prev, [provider]: Array.isArray(rows) ? rows : [] }));
          setLikesError((prev) => ({ ...prev, [provider]: undefined }));
        } catch (e) {
          if (!alive || !connectedProvidersRef.current.has(provider)) return;
          setLikesError((prev) => ({ ...prev, [provider]: (e as Error).message }));
        } finally {
          if (alive && connectedProvidersRef.current.has(provider)) {
            setLikesLoading((prev) => ({ ...prev, [provider]: false }));
          }
        }
      })();
    }
    return () => {
      alive = false;
    };
  }, [connections]);

  return {
    connections,
    connectionsStatus,
    isProviderConnected: (provider: Provider) =>
      providerConnectionState(
        provider,
        connections.find((row) => row.provider === provider),
        Date.now(),
      ) === 'connected',
    retryConnections: () => setConnectionAttempt((attempt) => attempt + 1),
    playlists,
    playlistsLoading,
    playlistsError,
    likes,
    likesLoading,
    likesError,
  };
}

function ProviderConnectionsLoadState({
  status,
  hasKnownConnections,
  onRetry,
}: {
  status: 'loading' | 'ready' | 'error';
  hasKnownConnections: boolean;
  onRetry: () => void;
}) {
  if (status === 'ready') return null;

  if (status === 'loading') {
    return (
      <p role="status" className="font-ui text-xs text-text-tertiary">
        Checking music connections…
      </p>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-control border border-state-danger/30 bg-state-danger/5 p-3 font-ui text-xs text-state-danger"
    >
      <p>
        Couldn’t load music connections.
        {hasKnownConnections
          ? ' Showing your last known sources.'
          : ' Source status is unavailable.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-control border border-interactive/50 px-3 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
      >
        Try again
      </button>
    </div>
  );
}

/** Classes landing state: the loaded library becomes a bounded run-of-show shelf;
 * fresh, filtered-empty, loading, and unavailable remain distinct. */
function WorkstationRestingState({
  classes,
  activeTag,
  status,
  libraryError,
  confirmedPulseIds,
  onTogglePulseConfirmation,
  onOpen,
  onPreview,
  onClearTag,
  onRetry,
  onStartMusic,
  onStartMovement,
  onStartTemplate,
  onStartManual,
}: {
  classes: ClassListItem[];
  activeTag: string | null;
  status: ListStatus;
  libraryError: string | null;
  confirmedPulseIds: ReadonlySet<string>;
  onTogglePulseConfirmation: (classId: string) => void;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onClearTag: () => void;
  onRetry: () => void;
  onStartMusic: () => void;
  onStartMovement: () => void;
  onStartTemplate: () => void;
  onStartManual: () => void;
}) {
  const hasClasses = classes.length > 0;

  if (hasClasses) {
    return (
      <ClassRunOfShowShelf
        classes={classes}
        confirmedPulseIds={confirmedPulseIds}
        onTogglePulseConfirmation={onTogglePulseConfirmation}
        onOpen={onOpen}
        onPreview={onPreview}
      />
    );
  }

  if (status === 'loading') {
    return (
      <section
        className="min-w-0 rounded-card border border-border-subtle bg-bg-raised p-5 sm:p-6 xl:col-span-2"
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
        <div aria-hidden="true" className="mt-5 grid gap-3 sm:grid-cols-2">
          <span className="h-32 rounded-card bg-bg-sunken" />
          <span className="h-32 rounded-card bg-bg-sunken" />
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-w-0 xl:col-span-2">
        <RecoveryState
          kind="unavailable"
          role="alert"
          statusLabel="Class library unavailable"
          title="Your library is temporarily unavailable."
          event={
            libraryError
              ? `Ritmo could not read the class list: ${libraryError}`
              : 'Ritmo could not read the class list. This is not an empty account.'
          }
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
              onClick={onStartTemplate}
              className="min-h-11 rounded-control border border-interactive/50 px-4 font-ui text-sm font-semibold text-interactive sm:rounded-pill"
            >
              Start a new draft
            </button>
          }
        />
      </div>
    );
  }

  if (activeTag) {
    return (
      <section className="min-w-0 rounded-card border border-border-subtle bg-bg-raised p-5 sm:p-6 xl:col-span-2">
        <StatusLabel kind="empty" label={`No classes tagged #${activeTag}`} />
        <h2 className="mt-3 font-display text-2xl font-semibold text-text-primary">
          This filter has no run of show yet.
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

  const starts = [
    {
      eyebrow: 'Music first',
      title: 'Find a track or source',
      detail: 'Browse provider catalogs and carry the choice into a class.',
      action: onStartMusic,
    },
    {
      eyebrow: 'Template first',
      title: 'Start Cycle, Pilates, or HIIT',
      detail: 'Name the class and choose its discipline before filling it in.',
      action: onStartTemplate,
    },
    {
      eyebrow: 'Movement first',
      title: 'Start with a move',
      detail: 'Reuse a song–movement pairing you already teach.',
      action: onStartMovement,
    },
    {
      eyebrow: 'Manual first',
      title: 'Start from memory',
      detail: 'Create the class, then enter title, artist, duration, and effort yourself.',
      action: onStartManual,
    },
  ];

  return (
    <section className="min-w-0 xl:col-span-2">
      <div className="rounded-card border border-border-subtle bg-bg-raised p-5 sm:p-6">
        <p className="rf-eyebrow">First workspace</p>
        <h2 className="mt-2 text-balance font-display text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-5xl">
          Your first class can start anywhere.
        </h2>
        <p className="mt-3 max-w-prose font-ui text-sm leading-6 text-text-secondary sm:text-base">
          Bring music, a template, a movement idea, or a manual track. Ritmo will help shape the run
          of show.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {starts.map((start) => (
            <button
              key={start.eyebrow}
              type="button"
              onClick={start.action}
              className="min-h-32 rounded-card border border-border-subtle bg-bg-sunken p-4 text-left hover:border-interactive/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
            >
              <span className="font-data text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {start.eyebrow}
              </span>
              <span className="mt-2 block font-display text-lg font-semibold text-text-primary">
                {start.title}
              </span>
              <span className="mt-2 block font-ui text-sm leading-5 text-text-secondary">
                {start.detail}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MusicWorkspace({
  connectionRevision,
  onOpenConnections,
  onBrowsePlaylists,
  onBrowseLikes,
}: {
  connectionRevision: number;
  onOpenConnections: () => void;
  onBrowsePlaylists: (provider: Provider, playlists: ProviderPlaylistSummary[]) => void;
  onBrowseLikes: (provider: Provider, tracks: TrackSearchResult[]) => void;
}) {
  const {
    connections,
    connectionsStatus,
    isProviderConnected,
    retryConnections,
    playlists,
    playlistsLoading,
    playlistsError,
    likes,
    likesLoading,
    likesError,
  } = useProviderBrowseState(connectionRevision);
  const connectedCount = PROVIDER_ORDER.filter((provider) => isProviderConnected(provider)).length;
  return (
    <section className="grid w-full min-w-0 gap-5 overflow-hidden xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start">
      <aside className="min-w-0 rounded-card bg-bg-raised p-4 xl:sticky xl:top-6">
        <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Sources</p>
        <nav className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
          {PROVIDER_ORDER.map((provider) => {
            const connectionState = providerConnectionState(
              provider,
              connections.find((row) => row.provider === provider),
              Date.now(),
            );
            const rows = playlists[provider];
            const canBrowse = connectionState === 'connected' && !!rows?.length;
            return (
              <button
                key={provider}
                type="button"
                aria-label={
                  canBrowse
                    ? `Browse ${providerLabel(provider)} playlists`
                    : `Manage ${providerLabel(provider)} connection`
                }
                onClick={() =>
                  canBrowse ? onBrowsePlaylists(provider, rows!) : onOpenConnections()
                }
                className="flex min-h-11 min-w-0 shrink-0 items-center justify-between gap-3 rounded-control bg-bg-base px-3 py-2 text-left font-ui text-sm text-text-primary transition-colors hover:bg-interactive/5 xl:w-full"
              >
                <span>{providerLabel(provider)}</span>
                <span className="font-data text-[10px] uppercase text-text-tertiary">
                  {connectionsStatus === 'loading'
                    ? 'Checking'
                    : connectionsStatus === 'error'
                      ? 'Unverified'
                      : connectionState === 'connected'
                        ? 'Linked'
                        : 'Catalog'}
                </span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onOpenConnections}
          className="mt-4 min-h-11 w-full rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10"
        >
          Manage connections
        </button>
      </aside>

      <div className="flex w-full min-w-0 flex-col gap-5 overflow-hidden">
        <section className="min-w-0 rounded-card bg-bg-raised p-5 sm:p-6">
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Music home</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold leading-tight text-text-primary">
                Browse music, then shape it into class.
              </h2>
              <p className="mt-2 max-w-2xl font-ui text-sm leading-6 text-text-secondary">
                Saved playlists, liked tracks, and provider libraries are the raw material for
                building.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenConnections}
              className={`min-h-11 shrink-0 rounded-control px-4 font-ui text-sm font-semibold sm:rounded-pill ${
                connectedCount > 0
                  ? 'bg-bg-base text-interactive hover:bg-interactive/10'
                  : 'rf-btn-primary text-text-on-accent'
              }`}
            >
              {connectedCount > 0 ? 'Manage connections' : 'Connect music'}
            </button>
          </div>
        </section>

        <ProviderConnectionsLoadState
          status={connectionsStatus}
          hasKnownConnections={connections.length > 0}
          onRetry={retryConnections}
        />

        {(connectionsStatus !== 'loading' || connections.length > 0) && (
          <section className="grid min-w-0 gap-3 lg:grid-cols-3">
            {PROVIDER_ORDER.map((provider) => {
              const connected = isProviderConnected(provider);
              return (
                <ProviderShelfCard
                  key={provider}
                  provider={provider}
                  connection={connections.find((row) => row.provider === provider)}
                  connectionStatus={connectionsStatus}
                  playlists={playlists[provider] ?? null}
                  loadingPlaylists={playlistsLoading[provider] ?? false}
                  playlistError={playlistsError[provider] ?? null}
                  onBrowse={
                    connected && playlists[provider]?.length
                      ? () => onBrowsePlaylists(provider, playlists[provider]!)
                      : undefined
                  }
                  likes={likes[provider] ?? null}
                  loadingLikes={likesLoading[provider] ?? false}
                  likesError={likesError[provider] ?? null}
                  onManageConnections={onOpenConnections}
                  onBrowseLikes={
                    connected && likes[provider]?.length
                      ? () => onBrowseLikes(provider, likes[provider]!)
                      : undefined
                  }
                />
              );
            })}
          </section>
        )}
      </div>
    </section>
  );
}

/**
 * Per-class run-payload fetch state for the Live queue. A class is only ever
 * treated as runnable once its payload has actually loaded and `classReadiness`
 * confirms the duration gate — loading/errored classes stay non-runnable so the
 * queue never shows a false "Run live" that Live Mode would then block.
 */
type LivePayloadState =
  | { status: 'loading' }
  | { status: 'ready'; payload: RunPayload; readiness: ClassReadiness }
  | { status: 'error'; error: string };

/** Stable no-op for readiness chips that are disabled in the Live queue. */
const noop = (): void => {};

function LiveWorkspace({
  classes,
  status,
  onRunClass,
  onOpenClass,
}: {
  classes: ClassListItem[];
  status: ListStatus;
  onRunClass: (classId: string) => void;
  onOpenClass: (cls: ClassListItem) => Promise<void>;
}) {
  // Any class with tracks belongs in the Live queue — even a duration-blocked one,
  // so the instructor sees exactly what's incomplete instead of it vanishing.
  // Empty classes have nothing to preflight and stay in Classes.
  const candidates = useMemo(() => classes.filter((cls) => cls.trackCount > 0), [classes]);
  const [payloads, setPayloads] = useState<Record<string, LivePayloadState>>({});
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

  const fetchOne = useCallback((classId: string) => {
    setPayloads((prev) => ({ ...prev, [classId]: { status: 'loading' } }));
    void getRunPayload(classId)
      .then((payload) => {
        if (!mountedRef.current) return;
        setPayloads((prev) => ({
          ...prev,
          [classId]: { status: 'ready', payload, readiness: classReadiness(payload) },
        }));
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setPayloads((prev) => ({
          ...prev,
          [classId]: { status: 'error', error: errMessage(err) },
        }));
      });
  }, []);

  // Fetch a run-payload per candidate whenever the candidate set changes. Concurrent
  // (N is small for a solo creator); each card resolves independently. Ready results
  // are preserved across re-runs so a list refresh doesn't re-flash loaded cards.
  const candidateKey = candidates.map((cls) => cls.id).join(',');
  useEffect(() => {
    let alive = true;
    setPayloads((prev) => {
      const next: Record<string, LivePayloadState> = {};
      for (const cls of candidates) {
        const existing = prev[cls.id];
        next[cls.id] = existing?.status === 'ready' ? existing : { status: 'loading' };
      }
      return next;
    });
    void Promise.allSettled(
      candidates
        .filter((cls) => payloadsRef.current[cls.id]?.status !== 'ready')
        .map(async (cls) => {
          try {
            const payload = await getRunPayload(cls.id);
            if (!alive || !mountedRef.current) return;
            setPayloads((prev) => ({
              ...prev,
              [cls.id]: { status: 'ready', payload, readiness: classReadiness(payload) },
            }));
          } catch (err) {
            if (!alive || !mountedRef.current) return;
            setPayloads((prev) => ({
              ...prev,
              [cls.id]: { status: 'error', error: errMessage(err) },
            }));
          }
        }),
    );
    return () => {
      alive = false;
    };
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
  const tilesReady = status === 'ready' && allResolved;

  // Runnable-first, stable within rank so cards settle calmly once payloads land.
  const rank = (cls: ClassListItem): number => {
    const s = payloads[cls.id];
    if (s?.status === 'ready') return s.readiness.runnable ? 0 : 1;
    return 2; // loading / errored / unknown — keep below decided cards
  };
  const ordered = candidates
    .map((cls, index) => ({ cls, index }))
    .sort((a, b) => rank(a.cls) - rank(b.cls) || a.index - b.index)
    .map((entry) => entry.cls);

  const liveStatus =
    status !== 'ready'
      ? ''
      : candidates.length === 0
        ? 'No classes with tracks yet.'
        : !allResolved
          ? `Checking readiness for ${candidates.length} ${candidates.length === 1 ? 'class' : 'classes'}…`
          : `${summary.runnable} of ${candidates.length} ${candidates.length === 1 ? 'class' : 'classes'} ready for Live.`;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div className="rounded-card bg-bg-raised p-5 shadow-card sm:p-6">
        <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Live</p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-text-primary">
          Pick a class to run.
        </h2>
        <p className="mt-2 max-w-2xl font-ui text-sm leading-6 text-text-secondary">
          Live stays in the same workspace map: choose the class, preflight music, then run the
          room.
        </p>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {liveStatus}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {status === 'loading' ? (
            <p className="font-ui text-sm text-text-tertiary">Loading classes…</p>
          ) : candidates.length === 0 ? (
            <p className="font-ui text-sm text-text-tertiary">
              No classes with tracks yet. Add tracks in Classes, then come back here.
            </p>
          ) : (
            ordered.map((cls) => (
              <LiveQueueCard
                key={cls.id}
                cls={cls}
                state={payloads[cls.id]}
                onRun={() => onRunClass(cls.id)}
                onEdit={() => void onOpenClass(cls)}
                onRetry={() => fetchOne(cls.id)}
              />
            ))
          )}
        </div>
      </div>

      <aside className="rounded-card border border-interactive/15 bg-bg-base p-5 xl:sticky xl:top-6">
        <p className="font-ui text-sm font-semibold text-text-primary">Preflight checks</p>
        <div className="mt-3 grid gap-2">
          <ReadinessTile
            label="Runnable"
            value={tilesReady ? `${summary.runnable} of ${candidates.length}` : '...'}
          />
          <ReadinessTile
            label="Needs a duration"
            value={tilesReady ? String(summary.blocked) : '...'}
          />
          <ReadinessTile
            label="Music"
            value={
              tilesReady
                ? summary.musicIncomplete === 0
                  ? 'All linked'
                  : `${summary.musicIncomplete} need a link`
                : '...'
            }
          />
        </div>
      </aside>
    </section>
  );
}

/**
 * One class in the Live queue. Shows the real four-dimension readiness once the
 * run-payload loads (reusing `ClassReadinessSummary`), and gates "Run live" on the
 * same duration check Live Mode enforces — a blocked class shows the exact
 * `runBlockedMessage` the instructor would hit on click, tied to the disabled
 * button via `aria-describedby`.
 */
function LiveQueueCard({
  cls,
  state,
  onRun,
  onEdit,
  onRetry,
}: {
  cls: ClassListItem;
  state: LivePayloadState | undefined;
  onRun: () => void;
  onEdit: () => void;
  onRetry: () => void;
}) {
  const canRun = state?.status === 'ready' && state.readiness.runnable;
  const reasonId = `live-blocked-${cls.id}`;
  const blockReason =
    state?.status === 'error'
      ? 'Couldn’t check readiness — retry before running this class.'
      : state?.status === 'ready' && !state.readiness.runnable
        ? (runBlockedMessage(state.payload) ?? undefined)
        : undefined;

  return (
    <article
      className="flex flex-col gap-3 rounded-card border border-interactive/10 bg-bg-base p-3"
      aria-busy={state === undefined || state.status === 'loading'}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ArtCollage urls={cls.albumArtUrls} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-ui text-sm font-semibold text-text-primary">{cls.title}</h3>
          <p className="font-data text-xs text-text-tertiary">
            {formatTemplateLabel(cls.template) ?? 'Class'} · {cls.trackCount} tracks ·{' '}
            {formatDuration(cls.totalDurationMs)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-10 rounded-control border border-interactive/35 px-3 font-ui text-sm text-text-secondary hover:text-text-primary sm:rounded-pill"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={!canRun}
            aria-describedby={blockReason ? reasonId : undefined}
            title={canRun ? 'Run this class live' : undefined}
            className="min-h-10 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:rounded-pill"
          >
            Run live
          </button>
        </div>
      </div>

      {state === undefined || state.status === 'loading' ? (
        <p className="font-ui text-xs text-text-tertiary">Checking readiness…</p>
      ) : state.status === 'error' ? (
        <p
          id={reasonId}
          role="alert"
          className="flex items-center gap-2 font-ui text-xs text-state-caution"
        >
          <span aria-hidden className="font-data leading-none">
            !
          </span>
          <span className="min-w-0">{blockReason}</span>
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto shrink-0 rounded-pill border border-interactive/50 px-2.5 py-0.5 font-ui text-interactive hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
          >
            Retry
          </button>
        </p>
      ) : (
        <>
          {/* Reuse the builder's readiness readout; the queue can't jump the inspector,
              so fix-chips stay off (canEdit=false) — fixing happens via Edit. */}
          <ClassReadinessSummary readiness={state.readiness} canEdit={false} onSelectTrack={noop} />
          {blockReason && (
            <p
              id={reasonId}
              className="flex items-center gap-1.5 font-ui text-xs text-state-caution"
            >
              <span aria-hidden className="font-data leading-none">
                !
              </span>
              {blockReason}
            </p>
          )}
        </>
      )}
    </article>
  );
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function AccountWorkspace({
  profileName,
  connectionRevision,
  onProfileUpdated,
  onOpenConnections,
}: {
  profileName: string;
  connectionRevision: number;
  onProfileUpdated: (user: User) => void;
  onOpenConnections: () => void;
}) {
  const [profile, setProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState(profileName);
  const [imageUrl, setImageUrl] = useState('');
  // null only before the first successful connections load — refresh keeps last-known
  // rows so Manage → Disconnect/Connect does not flash empty / "..." badges.
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [user, rows] = await Promise.all([getMe(), listConnections()]);
        if (!alive) return;
        setProfile(user);
        setDisplayName(user.displayName ?? '');
        setImageUrl(user.imageUrl ?? '');
        setConnections(rows);
        setLoadingError(null);
      } catch (e) {
        if (alive) setLoadingError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [connectionRevision]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const updated = await updateMe({
        displayName: normalizeOptional(displayName),
        imageUrl: normalizeOptional(imageUrl),
      });
      setProfile(updated);
      setDisplayName(updated.displayName ?? '');
      setImageUrl(updated.imageUrl ?? '');
      setNotice('Profile updated.');
      onProfileUpdated(updated);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid w-full min-w-0 gap-5 overflow-hidden xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
      <aside className="min-w-0 rounded-card bg-bg-raised p-4 xl:sticky xl:top-6">
        <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Account</p>
        <nav className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
          {['Profile', 'Preferences', 'Music connections', 'Security'].map((item) => (
            <a
              key={item}
              href={`#account-${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="min-h-11 min-w-0 shrink-0 rounded-control bg-bg-base px-3 py-2 font-ui text-sm text-text-primary xl:w-full"
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex w-full min-w-0 flex-col gap-5 overflow-hidden">
        <section id="account-profile" className="min-w-0 rounded-card bg-bg-raised p-5 sm:p-6">
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Profile</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-text-primary">
            Personal workspace
          </h2>
          {loadingError && (
            <p className="mt-3 font-ui text-sm text-state-danger" role="alert">
              {loadingError}
            </p>
          )}
          {notice && (
            <p className="mt-3 font-ui text-sm text-state-positive" role="status">
              {notice}
            </p>
          )}
          {saveError && (
            <p className="mt-3 font-ui text-sm text-state-danger" role="alert">
              {saveError}
            </p>
          )}

          {!profile ? (
            <p className="mt-4 font-ui text-sm text-text-tertiary">Loading account…</p>
          ) : (
            <form
              className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"
              onSubmit={submit}
            >
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
                  Display name
                  <input
                    className="min-h-11 w-full min-w-0 rounded-control border border-border-subtle bg-bg-base px-3 text-text-primary outline-none focus:border-interactive"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Instructor name"
                    maxLength={200}
                  />
                </label>
                <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
                  Profile image URL
                  <input
                    className="min-h-11 w-full min-w-0 rounded-control border border-border-subtle bg-bg-base px-3 text-text-primary outline-none focus:border-interactive"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    inputMode="url"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
                  <button
                    type="button"
                    className="min-h-10 rounded-control border border-border-subtle px-4 font-ui text-sm text-text-secondary transition-colors hover:text-text-primary sm:rounded-pill"
                    onClick={() => authClient.signOut()}
                  >
                    Sign out
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-10 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:rounded-pill"
                  >
                    {saving ? 'Saving...' : 'Save profile'}
                  </button>
                </div>
              </div>
              <div className="rounded-card border border-border-subtle bg-bg-base p-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-bg-raised font-display text-xl font-semibold text-text-primary">
                  {profile.imageUrl ? (
                    <img
                      src={profile.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (profile.displayName ?? profile.email).slice(0, 1).toUpperCase()
                  )}
                </div>
                <p className="mt-3 truncate font-ui text-sm font-semibold text-text-primary">
                  {profile.displayName ?? 'Unnamed instructor'}
                </p>
                <p className="break-all font-ui text-xs text-text-tertiary">{profile.email}</p>
              </div>
            </form>
          )}
        </section>

        <section
          id="account-preferences"
          className="rounded-card border border-interactive/10 bg-bg-base p-5"
        >
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Preferences</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ReadinessTile label="Default templates" value="Cycle / Pilates / HIIT" />
            <ReadinessTile label="Playback" value="Manual preview" />
            <ReadinessTile label="Workspace" value="Solo-first" />
          </div>
        </section>

        <section
          id="account-music-connections"
          className="min-w-0 rounded-card bg-bg-raised p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                Music connections
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold text-text-primary">
                Provider accounts
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenConnections}
              className="min-h-10 rounded-control border border-interactive/35 px-4 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 sm:rounded-pill"
            >
              Manage
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {PROVIDER_ORDER.map((provider) => {
              const state = providerConnectionState(
                provider,
                connections?.find((row) => row.provider === provider),
                Date.now(),
              );
              return (
                <div
                  key={provider}
                  className="flex items-center justify-between gap-3 rounded-card bg-bg-base px-3 py-2.5"
                >
                  <div>
                    <p className="font-ui text-sm font-semibold text-text-primary">
                      {providerLabel(provider)}
                    </p>
                    <p className="font-ui text-xs text-text-tertiary">
                      {state === 'connected'
                        ? 'Connected for library browsing and playback where available.'
                        : state === 'expired'
                          ? 'Session expired.'
                          : 'Not connected.'}
                    </p>
                  </div>
                  <span className="rounded-pill border border-interactive/20 px-2 py-0.5 font-data text-[10px] uppercase text-text-secondary">
                    {connections === null ? '...' : state}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section
          id="account-security"
          className="rounded-card border border-interactive/10 bg-bg-base p-5"
        >
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Security</p>
          <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
            Email, password, and social sign-in settings remain with the active sign-in provider.
          </p>
          <a
            href="/privacy"
            className="mt-3 inline-flex min-h-10 items-center rounded-control border border-interactive/35 px-4 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
          >
            Privacy and data notice
          </a>
        </section>
      </div>
    </section>
  );
}

function ReadinessTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-interactive/10 bg-bg-base p-3">
      <p className="font-ui text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="mt-1 font-data text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function ProviderShelfCard({
  provider,
  connection,
  connectionStatus,
  playlists,
  loadingPlaylists,
  playlistError,
  onBrowse,
  likes,
  loadingLikes,
  likesError,
  onBrowseLikes,
  onManageConnections,
}: {
  provider: (typeof PROVIDER_ORDER)[number];
  connection: MusicConnectionView | undefined;
  connectionStatus: 'loading' | 'ready' | 'error';
  playlists: ProviderPlaylistSummary[] | null;
  loadingPlaylists: boolean;
  playlistError: string | null;
  onBrowse?: () => void;
  likes: TrackSearchResult[] | null;
  loadingLikes: boolean;
  likesError: string | null;
  onBrowseLikes?: () => void;
  onManageConnections: () => void;
}) {
  const label = providerLabel(provider);
  const canBrowseSavedPlaylists = providerCapabilities[provider].savedPlaylists;
  const canUseLikes = providerCapabilities[provider].userLikes;
  const truth = providerCapabilityTruth(
    provider,
    connection,
    Date.now(),
    connectionStatus === 'ready' ? 'verified' : 'unverified',
  );
  const connectionState = truth.connectionState;

  let likesSummary = 'Liked-track browsing is coming soon for this provider.';
  if (canUseLikes && truth.library.state === 'unverified') {
    likesSummary = connection
      ? 'Showing last-known liked-track access; connection is unverified.'
      : 'Liked-track access is unavailable until connection status returns.';
  } else if (canUseLikes && connectionState === 'connected') {
    if (loadingLikes) {
      likesSummary = 'Loading your liked tracks…';
    } else if (likesError) {
      likesSummary = `Couldn’t load likes right now: ${likesError}`;
    } else if (likes && likes.length > 0) {
      const names = likes
        .slice(0, 2)
        .map((row) => row.title)
        .join(' • ');
      const extra = likes.length > 2 ? ` (+${likes.length - 2} more)` : '';
      likesSummary = `${likes.length} liked tracks: ${names}${extra}`;
    } else {
      likesSummary = 'No liked tracks yet on this account.';
    }
  } else if (canUseLikes && connectionState !== 'connected') {
    likesSummary = 'Connect this provider to browse liked tracks.';
  }

  let playlistSummary = 'Saved-playlist browsing is coming soon for this provider.';
  if (canBrowseSavedPlaylists && truth.library.state === 'unverified') {
    playlistSummary = connection
      ? 'Showing last-known playlist access; connection is unverified.'
      : 'Playlist access is unavailable until connection status returns.';
  } else if (canBrowseSavedPlaylists && connectionState === 'connected') {
    if (loadingPlaylists) {
      playlistSummary = 'Loading your saved playlists…';
    } else if (playlistError) {
      playlistSummary = `Couldn’t load playlists right now: ${playlistError}`;
    } else if (playlists && playlists.length > 0) {
      const names = playlists
        .slice(0, 2)
        .map((row) => row.name)
        .join(' • ');
      const extra = playlists.length > 2 ? ` (+${playlists.length - 2} more)` : '';
      playlistSummary = `${playlists.length} saved playlists: ${names}${extra}`;
    } else {
      playlistSummary = 'No saved playlists yet on this account.';
    }
  } else if (canBrowseSavedPlaylists && connectionState !== 'connected') {
    playlistSummary = 'Connect this provider to browse saved playlists.';
  }

  const connected = connectionState === 'connected';
  const statusLabel =
    connectionStatus === 'error'
      ? 'Last known'
      : connected
        ? 'Connected'
        : connectionState === 'expired'
          ? 'Expired'
          : connectionStatus === 'loading'
            ? 'Checking'
            : 'Catalog only';
  return (
    <article className="min-w-0 rounded-card border border-interactive/10 bg-bg-base p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-ui text-sm font-semibold text-text-primary">{label}</h4>
          <p className="mt-1 font-ui text-xs leading-5 text-text-tertiary">
            {connectionStatus === 'error'
              ? 'Connection status could not be refreshed.'
              : connectionStatus === 'loading'
                ? 'Checking library and playback authorization.'
                : connected
                  ? 'Your provider library is in reach.'
                  : 'Catalog browsing stays available without a linked account.'}
          </p>
        </div>
        <span className="shrink-0 rounded-pill bg-bg-raised px-2 py-1 font-data text-[10px] uppercase tracking-wide text-text-secondary">
          {statusLabel}
        </span>
      </div>
      <div
        className="mt-4 grid gap-1.5 border-y border-interactive/10 py-3"
        aria-label={`${label} capabilities`}
      >
        <ProviderCapabilityRow label="Catalog" capability={truth.catalog} />
        <ProviderCapabilityRow label="Library" capability={truth.library} />
        <ProviderCapabilityRow label="Playback" capability={truth.playback} />
      </div>
      <div className="mt-4 grid min-w-0 gap-2">
        {onBrowseLikes ? (
          <button
            type="button"
            onClick={onBrowseLikes}
            className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-control bg-bg-raised px-3 py-2 text-left font-ui text-sm font-semibold text-interactive hover:bg-interactive/10"
          >
            <span>Browse liked tracks</span>
            <span className="shrink-0 font-data text-xs text-text-tertiary">
              {likes?.length ?? 0}
            </span>
          </button>
        ) : (
          <span className="min-w-0 rounded-control bg-bg-raised px-3 py-2 font-ui text-xs text-text-tertiary">
            {likesSummary}
          </span>
        )}
        {onBrowse ? (
          <button
            type="button"
            onClick={onBrowse}
            className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-control bg-bg-raised px-3 py-2 text-left font-ui text-sm font-semibold text-interactive hover:bg-interactive/10"
          >
            <span>Browse saved playlists</span>
            <span className="shrink-0 font-data text-xs text-text-tertiary">
              {playlists?.length ?? 0}
            </span>
          </button>
        ) : (
          <span className="min-w-0 rounded-control bg-bg-raised px-3 py-2 font-ui text-xs text-text-tertiary">
            {playlistSummary}
          </span>
        )}
        {!connected && connectionStatus !== 'error' && (
          <button
            type="button"
            onClick={onManageConnections}
            className="min-h-11 rounded-control bg-interactive px-3 font-ui text-sm font-semibold text-text-on-accent"
          >
            Connect {label}
          </button>
        )}
      </div>
    </article>
  );
}

function ProviderCapabilityRow({
  label,
  capability,
}: {
  label: string;
  capability: ProviderCapabilityView;
}) {
  const glyph =
    capability.state === 'ready'
      ? '✓'
      : capability.state === 'partial'
        ? '◐'
        : capability.state === 'checking'
          ? '◌'
          : capability.state === 'unverified'
            ? '?'
            : '→';
  const tone =
    capability.state === 'ready'
      ? 'text-state-positive'
      : capability.state === 'unverified' || capability.state === 'checking'
        ? 'text-text-tertiary'
        : 'text-state-caution';
  return (
    <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-baseline gap-2 font-ui text-xs">
      <span className="text-text-tertiary">{label}</span>
      <span className={`min-w-0 text-right ${tone}`}>
        <span aria-hidden>{glyph} </span>
        {capability.label}
      </span>
    </div>
  );
}

function MusicCarryPath({ source, destination }: { source: string; destination: string }) {
  return (
    <div
      className="mb-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-control border border-interactive/20 bg-interactive/5 px-3 py-2 font-ui text-xs"
      aria-label={`Source ${source}; destination ${destination}`}
    >
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-text-tertiary">Source</span>
        <strong className="block truncate font-semibold text-text-primary">{source}</strong>
      </span>
      <span aria-hidden className="text-interactive">
        →
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-[10px] uppercase tracking-wide text-text-tertiary">
          Destination
        </span>
        <strong className="block truncate font-semibold text-text-primary">{destination}</strong>
      </span>
    </div>
  );
}

/**
 * Browse a provider's saved playlists and create a new class from one. Browse-first:
 * open a playlist to inspect its tracks, then "Start class" imports the whole
 * playlist and opens it in the builder. The discipline template picker is shared
 * across the dialog so the choice carries into whichever playlist is started.
 */
function PlaylistBrowserDialog({
  provider,
  playlists,
  onClose,
  onCreateClass,
}: {
  provider: Provider;
  playlists: ProviderPlaylistSummary[];
  onClose: () => void;
  onCreateClass: (
    provider: Provider,
    playlistId: string,
    playlistName: string,
    template: ClassTemplate,
  ) => Promise<void>;
}) {
  const [template, setTemplate] = useState<ClassTemplate>('cycle');
  const [selectedPlaylist, setSelectedPlaylist] = useState<ProviderPlaylistSummary | null>(null);
  const [tracks, setTracks] = useState<TrackSearchResult[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const label = providerLabel(provider);

  const openPlaylist = async (playlist: ProviderPlaylistSummary) => {
    setSelectedPlaylist(playlist);
    setTracks(null);
    setLoadingTracks(true);
    setRowError(null);
    try {
      setTracks(await listPlaylistTracks(provider, playlist.playlistId));
    } catch (e) {
      setRowError((e as Error).message);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleCreate = async (playlist: ProviderPlaylistSummary) => {
    setCreatingId(playlist.playlistId);
    setRowError(null);
    try {
      await onCreateClass(provider, playlist.playlistId, playlist.name, template);
    } catch (e) {
      setRowError((e as Error).message);
      setCreatingId(null);
    }
  };

  return (
    <Dialog
      label={`Browse ${label} playlists`}
      onClose={onClose}
      panelClassName="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-card bg-bg-raised p-6 shadow-overlay"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
            Music sources
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
            {selectedPlaylist ? selectedPlaylist.name : `${label} playlists`}
          </h2>
          {selectedPlaylist && (
            <p className="mt-1 font-ui text-xs text-text-tertiary">
              {selectedPlaylist.ownerName ?? label} · {selectedPlaylist.trackCount} tracks
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close playlist browser"
          className="min-h-11 shrink-0 rounded-pill border border-interactive/30 px-3 font-ui text-xs text-text-secondary hover:text-text-primary"
        >
          Close
        </button>
      </div>

      <MusicCarryPath
        source={selectedPlaylist ? `${label} · ${selectedPlaylist.name}` : `${label} playlists`}
        destination={`New ${formatTemplateLabel(template)} class`}
      />

      {/* Template picker — applies to every "Create class" action in this dialog. */}
      <div className="mb-4">
        <p className="mb-2 font-ui text-xs font-semibold text-text-secondary">New class template</p>
        <div role="group" aria-label="Class template" className="flex gap-1.5">
          {CREATE_TEMPLATE_OPTIONS.map(({ value, label: tLabel }) => {
            if (!value) return null;
            const selected = template === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTemplate(value)}
                className={`min-h-11 rounded-pill border px-3 font-ui text-xs ${
                  selected
                    ? 'border-interactive bg-interactive/15 text-text-primary'
                    : 'border-interactive/30 text-text-secondary hover:text-text-primary'
                }`}
              >
                {tLabel}
              </button>
            );
          })}
        </div>
      </div>

      {rowError && (
        <p role="alert" className="mb-3 font-ui text-sm text-state-danger">
          {rowError}
        </p>
      )}

      {selectedPlaylist ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPlaylist(null);
                setTracks(null);
                setRowError(null);
              }}
              className="min-h-11 rounded-pill border border-interactive/30 px-3 font-ui text-xs text-text-secondary hover:text-text-primary"
            >
              Back to playlists
            </button>
            <button
              type="button"
              onClick={() => void handleCreate(selectedPlaylist)}
              disabled={!!creatingId || loadingTracks || !tracks?.length}
              aria-label={`Start class from ${selectedPlaylist.name}`}
              className="min-h-11 rounded-pill rf-btn-primary px-3 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50"
            >
              {creatingId === selectedPlaylist.playlistId ? 'Creating...' : 'Start class'}
            </button>
          </div>
          <div className="max-h-[58vh] overflow-y-auto rounded-card border border-interactive/10 bg-bg-base p-2">
            {loadingTracks ? (
              <p className="p-3 font-ui text-sm text-text-tertiary">Loading playlist tracks...</p>
            ) : tracks && tracks.length > 0 ? (
              <ol className="flex flex-col gap-1.5">
                {tracks.map((track, index) => (
                  <li
                    key={`${track.provider}:${track.providerTrackId}`}
                    className="flex items-center gap-3 rounded-card bg-bg-raised px-2 py-1.5"
                  >
                    <span className="w-5 shrink-0 text-right font-data text-xs text-text-tertiary">
                      {index + 1}
                    </span>
                    {track.albumArtUrl ? (
                      <img
                        src={track.albumArtUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-10 shrink-0 rounded-card object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-bg-base text-text-tertiary"
                        aria-hidden
                      >
                        ♪
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-ui text-sm font-semibold text-text-primary">
                        {track.title}
                      </p>
                      <p className="truncate font-ui text-xs text-text-secondary">{track.artist}</p>
                    </div>
                    {track.durationMs != null && (
                      <span className="shrink-0 font-data text-xs text-text-tertiary">
                        {formatDuration(track.durationMs)}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-3 font-ui text-sm text-text-tertiary">
                No tracks found in this playlist.
              </p>
            )}
          </div>
        </div>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {playlists.map((playlist) => (
            <li
              key={playlist.playlistId}
              className="flex items-center gap-3 rounded-card border border-interactive/10 bg-bg-base p-3"
            >
              {playlist.coverImageUrl ? (
                <img
                  src={playlist.coverImageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-11 shrink-0 rounded-card object-cover"
                />
              ) : (
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-raised font-ui text-lg text-text-tertiary"
                  aria-hidden
                >
                  ▤
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-ui text-sm font-semibold text-text-primary">
                  {playlist.name}
                </p>
                <p className="truncate font-ui text-xs text-text-secondary">
                  {playlist.ownerName ?? label} · {playlist.trackCount} tracks
                </p>
              </div>
              <button
                type="button"
                onClick={() => void openPlaylist(playlist)}
                aria-label={`Open ${playlist.name}`}
                className="min-h-11 shrink-0 rounded-pill border border-interactive/35 px-3 font-ui text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/**
 * Browse a provider's liked tracks and spin up a class from them. Unlike saved
 * playlists (many named lists), likes are one collection — so this dialog previews
 * the tracks, takes an editable class name + discipline template, and creates a
 * single class that imports all of them (best-effort, concurrency-bounded).
 */
function LikesBrowserDialog({
  provider,
  tracks,
  onClose,
  onCreateClass,
}: {
  provider: Provider;
  tracks: TrackSearchResult[];
  onClose: () => void;
  onCreateClass: (
    tracks: TrackSearchResult[],
    title: string,
    template: ClassTemplate,
  ) => Promise<void>;
}) {
  const label = providerLabel(provider);
  const [template, setTemplate] = useState<ClassTemplate>('cycle');
  const [title, setTitle] = useState(`${label} likes`);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      await onCreateClass(tracks, title.trim(), template);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  };

  return (
    <Dialog
      label={`Browse ${label} likes`}
      onClose={onClose}
      panelClassName="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-card bg-bg-raised p-6 shadow-overlay"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
            Music sources
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
            {label} likes
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close likes browser"
          className="min-h-11 shrink-0 rounded-pill border border-interactive/30 px-3 font-ui text-xs text-text-secondary hover:text-text-primary"
        >
          Close
        </button>
      </div>

      <MusicCarryPath
        source={`${label} likes`}
        destination={`New ${formatTemplateLabel(template)} class`}
      />

      {/* Likes have no source title to borrow, so the instructor names the class. */}
      <div className="mb-4">
        <label
          htmlFor="likes-class-title"
          className="mb-2 block font-ui text-xs font-semibold text-text-secondary"
        >
          New class name
        </label>
        <input
          id="likes-class-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-11 w-full rounded-control border border-interactive/20 bg-bg-base px-3 font-ui text-sm text-text-primary"
        />
      </div>

      {/* Template picker — applies to the created class. */}
      <div className="mb-4">
        <p className="mb-2 font-ui text-xs font-semibold text-text-secondary">New class template</p>
        <div role="group" aria-label="Class template" className="flex gap-1.5">
          {CREATE_TEMPLATE_OPTIONS.map(({ value, label: tLabel }) => {
            if (!value) return null;
            const selected = template === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTemplate(value)}
                className={`min-h-11 rounded-pill border px-3 font-ui text-xs ${
                  selected
                    ? 'border-interactive bg-interactive/15 text-text-primary'
                    : 'border-interactive/30 text-text-secondary hover:text-text-primary'
                }`}
              >
                {tLabel}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 font-ui text-sm text-state-danger">
          {error}
        </p>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-ui text-xs text-text-secondary">
          {tracks.length} liked {tracks.length === 1 ? 'track' : 'tracks'} will be imported
        </p>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || !title.trim() || tracks.length === 0}
          aria-label={`Create class from ${tracks.length} liked tracks`}
          className="min-h-11 shrink-0 rounded-pill rf-btn-primary px-3 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50"
        >
          {creating ? 'Creating…' : `Create class from ${tracks.length} liked tracks`}
        </button>
      </div>

      <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {tracks.map((track) => (
          <li
            key={`${track.provider}:${track.providerTrackId}`}
            className="flex items-center gap-3 rounded-card border border-interactive/10 bg-bg-base p-3"
          >
            {track.albumArtUrl ? (
              <img
                src={track.albumArtUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-11 w-11 shrink-0 rounded-card object-cover"
              />
            ) : (
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-raised font-ui text-lg text-text-tertiary"
                aria-hidden
              >
                ♪
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-ui text-sm font-semibold text-text-primary">
                {track.title}
              </p>
              <p className="truncate font-ui text-xs text-text-secondary">{track.artist}</p>
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
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
  onTrackAdded,
  onChoreographyChanged,
  onReordered,
  onTrackRemoved,
  onRun,
  onClassUpdated,
  onClassDeleted,
  onOpenSongsByMove,
  onBackToClasses,
}: {
  cls: ClassWithAccess;
  tracks: ClassTrack[];
  payload: RunPayload | null;
  onError: (msg: string | null) => void;
  onTrackChanged: () => void;
  onTrackAdded: (classTrackId: string) => void;
  /** Silent refresh after cue/move mutations so inspector focus stays in place. */
  onChoreographyChanged: () => void;
  /** Refresh after a reorder without the loading mask, so the track list stays
   *  mounted (grip focus + the reorder announcement survive). */
  onReordered: () => void;
  /** Refresh after a track removal without the loading mask — same reason as
   *  `onReordered`: the workspace must stay mounted so focus can return to the
   *  nearest remaining track's row instead of falling to <body>. */
  onTrackRemoved: () => void;
  onRun: () => void;
  onClassUpdated: (cls: Class) => void;
  onClassDeleted: (classId: string) => void;
  /** Open the Songs-by-Move dialog (the top-bar dialog, reused in the builder). */
  onOpenSongsByMove: () => void;
  /** Narrow-layout return path when the selected class is shown before the library. */
  onBackToClasses: () => void;
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

  // Focus return after removing a track: the inspector (holding the focused "Remove
  // track" button) unmounts on removal, so focus would fall to <body> and a keyboard
  // user would lose their place. We move it to the nearest remaining track's row
  // control, or the inspector placeholder when the class is now empty. A layout
  // effect applies it before paint (no flash of lost focus); the removed row is still
  // in the DOM at that point (the reload hasn't landed), so the anchor query resolves.
  const trackListRef = useRef<HTMLDivElement | null>(null);
  const trackSourceRef = useRef<HTMLDivElement | null>(null);
  const manualEntryRef = useRef<HTMLDetailsElement | null>(null);
  const inspectorPlaceholderRef = useRef<HTMLDivElement | null>(null);
  const [pendingRowFocus, setPendingRowFocus] = useState<string | 'placeholder' | null>(null);
  useLayoutEffect(() => {
    if (pendingRowFocus === null) return;
    if (pendingRowFocus !== 'placeholder') {
      // Match on dataset rather than a dynamic attribute selector — avoids CSS.escape
      // (absent in jsdom) and any need to escape the id.
      const rows = trackListRef.current?.querySelectorAll<HTMLElement>('[data-track-select-id]');
      const anchor = rows
        ? Array.from(rows).find((el) => el.dataset.trackSelectId === pendingRowFocus)
        : undefined;
      if (anchor) {
        anchor.focus();
        setPendingRowFocus(null);
        return;
      }
      // If we are focusing a specific row and it isn't in the DOM yet, we wait.
      // (e.g., adding a track that hasn't loaded in the payload yet).
      return;
    }
    // No anchor (class now empty, or the degraded lean list has no row control):
    // fall back to the placeholder so focus never lands on <body>.
    inspectorPlaceholderRef.current?.focus();
    setPendingRowFocus(null);
  }, [pendingRowFocus, tracks, payload]);

  /** Compute the focus anchor for a removal, in the order the user sees the list. */
  const focusAnchorAfterRemoving = (classTrackId: string): string | 'placeholder' => {
    const order = payload?.tracks ?? [];
    const removedIndex = order.findIndex((e) => e.classTrackId === classTrackId);
    const remaining = order.filter((e) => e.classTrackId !== classTrackId);
    if (remaining.length === 0) return 'placeholder';
    // Nearest convention: the track that slides into the removed slot, else the new
    // last (the previous track) when the last row was removed.
    const nearest = remaining[removedIndex] ?? remaining[remaining.length - 1];
    return nearest ? nearest.classTrackId : 'placeholder';
  };

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

  const focusTrackSources = () => {
    trackSourceRef.current?.focus();
  };

  const openManualEntry = () => {
    if (!manualEntryRef.current) return;
    manualEntryRef.current.open = true;
    manualEntryRef.current.querySelector<HTMLElement>('input')?.focus();
  };

  return (
    <>
      {/* ── Center column: header summary · energy ribbon · track list ── */}
      <section className="order-1 flex min-w-0 flex-col gap-4 xl:order-none">
        <button
          type="button"
          onClick={onBackToClasses}
          className="min-h-11 self-start rounded-control px-1 font-ui text-sm font-semibold text-interactive hover:text-interactive-hover xl:hidden"
        >
          ← Back to classes
        </button>
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

        <div
          ref={trackListRef}
          className="flex flex-col gap-2 rounded-card bg-bg-raised p-4 shadow-card"
        >
          <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
            Track list
          </span>
          {tracks.length === 0 && (
            <div className="rounded-card border border-border-subtle bg-bg-sunken p-4">
              <StatusLabel kind="empty" label="Empty run of show" />
              <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">
                Choose the strongest starting point.
              </h3>
              <p className="mt-1 font-ui text-sm leading-5 text-text-secondary">
                All four routes add to this class. Pulse stays empty until real duration and effort
                data exists.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={focusTrackSources}
                  className="min-h-11 rounded-control border border-interactive/40 px-3 text-left font-ui text-sm font-semibold text-interactive sm:rounded-pill"
                >
                  Music search
                </button>
                <button
                  type="button"
                  onClick={focusTrackSources}
                  className="min-h-11 rounded-control border border-interactive/40 px-3 text-left font-ui text-sm font-semibold text-interactive sm:rounded-pill"
                >
                  Playlist or source
                </button>
                <button
                  type="button"
                  onClick={onOpenSongsByMove}
                  className="min-h-11 rounded-control border border-interactive/40 px-3 text-left font-ui text-sm font-semibold text-interactive sm:rounded-pill"
                >
                  Movement pairing
                </button>
                <button
                  type="button"
                  onClick={openManualEntry}
                  className="min-h-11 rounded-control border border-interactive/40 px-3 text-left font-ui text-sm font-semibold text-interactive sm:rounded-pill"
                >
                  Manual track
                </button>
              </div>
            </div>
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
                onReordered={onReordered}
              />
            ) : (
              <ol className="flex flex-col gap-2">
                {tracks.map((t) => (
                  <LeanTrackRow key={t.id} track={t} />
                ))}
              </ol>
            ))}
          <div
            ref={trackSourceRef}
            tabIndex={-1}
            className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-interactive"
          >
            <TrackSearch
              classId={cls.id}
              onAdded={(id) => {
                if (id) {
                  setSelectedTrackId(id);
                  setPendingRowFocus(id);
                  onTrackAdded(id);
                } else {
                  onTrackChanged();
                }
              }}
            />
          </div>
          {/* Manual entry stays available but de-emphasized (search/import is the
              primary path; 09). For a track a provider can't return, or no creds. */}
          <details ref={manualEntryRef} className="mt-1">
            <summary className="cursor-pointer font-ui text-xs text-text-tertiary hover:text-text-secondary">
              Add manually
            </summary>
            <AddTrackForm
              classId={cls.id}
              onAdded={(id) => {
                if (id) {
                  setSelectedTrackId(id);
                  setPendingRowFocus(id);
                  onTrackAdded(id);
                } else {
                  onTrackChanged();
                }
              }}
              onError={onError}
            />
          </details>
        </div>
      </section>

      {/* ── Right column: the sticky inspector for the selected track ── */}
      <aside className="order-2 min-w-0 xl:order-none xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
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
              onChoreographyChanged={onChoreographyChanged}
              onRemoved={() => {
                if (selectedTrackId) {
                  setPendingRowFocus(focusAnchorAfterRemoving(selectedTrackId));
                }
                setSelectedTrackId(null);
                // Silent refresh (not onTrackChanged) so the workspace stays mounted
                // and the focus-restoration effect above can run — a non-silent reload
                // would swap in the "Loading class…" mask and drop focus to <body>.
                onTrackRemoved();
              }}
              onOpenSongsByMove={onOpenSongsByMove}
            />
          </div>
        ) : (
          <div
            ref={inspectorPlaceholderRef}
            tabIndex={-1}
            className="rounded-card border border-interactive/20 bg-bg-base p-5 outline-none focus-visible:ring-2 focus-visible:ring-interactive"
          >
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
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 min-h-11 rounded-control px-2 font-ui text-xs font-semibold text-interactive hover:bg-interactive/10 sm:min-h-8"
                >
                  {cls.coverImageUrl ? 'Change cover' : 'Upload cover'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={handleFileChange}
                />
              </>
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
export function ReorderableTrackList({
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
  // Assistive-tech narration for KEYBOARD reorder only — a sighted drag user already
  // sees the result, so drag stays silent to avoid chatty announcements. `polite`
  // carries successful moves and already-first/last boundaries; `assertive` carries a
  // failed persist so it interrupts (the visible red row below stays too).
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const commit = async (
    next: RunPayloadTrackEntry[],
    announce?: { title: string; fromPosition: number },
  ) => {
    const prev = order;
    setOrder(next); // optimistic
    setBusy(true);
    setError(null);
    setAssertiveMessage('');
    try {
      await reorderTracks(
        classId,
        next.map((e) => e.classTrackId),
      );
      onReordered(); // reload so the ribbon + offsets reflect the new order
    } catch (e) {
      setOrder(prev); // roll back
      const message = (e as Error).message;
      setError(message);
      if (announce) {
        setAssertiveMessage(
          `Couldn’t reorder — “${announce.title}” moved back to position ${announce.fromPosition} of ${prev.length}.`,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  // Drag path: silent for assistive tech (no announce argument).
  const move = (from: number, to: number) => {
    if (busy || to < 0 || to >= order.length || from === to) return;
    void commit(moveItem(order, from, to));
  };

  // Keyboard path: announce the move, the boundary no-op, and any failed persist.
  const keyboardMove = (from: number, direction: 1 | -1) => {
    if (busy) return;
    const title = order[from]?.track.title ?? 'Track';
    const to = from + direction;
    if (to < 0 || to >= order.length) {
      setPoliteMessage(`“${title}” is already ${direction < 0 ? 'first' : 'last'}.`);
      return;
    }
    setPoliteMessage(`Moved “${title}” to position ${to + 1} of ${order.length}.`);
    void commit(moveItem(order, from, to), { title, fromPosition: from + 1 });
  };

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <>
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
            onKeyMove={(dir) => keyboardMove(i, dir)}
          />
        ))}
        {error && <li className="font-ui text-xs text-state-danger">{error}</li>}
      </ol>
      {/* Keyboard-reorder narration. Separate polite/assertive regions because a node
          can't reliably switch politeness after mount. Always present so a text change
          is announced as a mutation. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </p>
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </p>
    </>
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
        data-track-select-id={entry.classTrackId}
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
  onChoreographyChanged,
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
  onChoreographyChanged: () => void;
  onRemoved: () => void;
  /** Open the Songs-by-Move dialog from the Moves section. */
  onOpenSongsByMove: () => void;
}) {
  const containerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    containerRef.current?.focus();
  }, []);
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
    <section
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col gap-3 rounded-card border border-interactive/20 bg-bg-base p-4 outline-none focus-visible:ring-2 focus-visible:ring-interactive"
    >
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
              onChanged={onChoreographyChanged}
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
              onChanged={onChoreographyChanged}
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
  onAdded: (classTrackId?: string) => void;
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
          const classTrack = await addTrack(classId, {
            track: {
              title: title.trim(),
              artist: artist.trim(),
              durationMs: parsedDuration,
            },
            intensity,
          });
          setTitle('');
          setArtist('');
          onAdded(classTrack.id);
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
