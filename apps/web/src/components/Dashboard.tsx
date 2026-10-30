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
  type ButtonHTMLAttributes,
  type FormEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  PLAYLIST_SONG_BLOCK_CAP,
  providerCapabilities,
  type Class,
  type ClassPlanBlock,
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
  markClassOpened,
  listConnections,
  listLikesPage,
  listPlaylists,
  listPlaylistTracks,
  searchProvider,
  getMe,
  updateMe,
} from '../lib/api.js';
import {
  createOrderedImport,
  preserveImportArrangement,
  runOrderedImport,
  type OrderedImportSession,
} from '../lib/ordered-import.js';
import { useProviderConnect } from '../lib/use-provider-connect.js';
import { ProviderConnectAction } from './ProviderConnectAction.js';
import { PlaylistSongPicker } from './PlaylistSongPicker.js';
import { consumeConnectionReturn, rememberConnectionReturn } from '../lib/connection-return.js';
import { setLiveActive, signOutByUser } from '../lib/session-guard.js';
import {
  ConnectionStateMark,
  accountConnectionMark,
  musicConnectionMark,
  type ConnectionMarkKind,
} from './ConnectionStateMark.js';
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
  parseClockToMs,
  parseDurationInput,
  runBlockedMessage,
} from '../lib/duration.js';
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
import { nextEmptyPlanBlock, type ScaffoldDiscipline } from '../lib/class-scaffold.js';
import { deleteClassConfirmMessage } from '../lib/class-delete.js';
import { errMessage } from '../lib/errors.js';
import { errorReference } from '../lib/error-reference.js';
import { classDetailReducer, initialClassDetailState } from '../lib/class-detail-state.js';
import {
  libraryView,
  organizeClasses,
  DEFAULT_CLASS_SORT,
  type ClassSortKey,
  type ListStatus,
} from '../lib/library-state.js';
import { useOnline } from '../lib/use-online.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import {
  PROVIDER_ORDER,
  providerCapabilityTruth,
  providerConnectionState,
  providerLabel,
} from '../lib/providers.js';
import {
  appendSongPage,
  defaultLibraryKind,
  filterLibrary,
  LIBRARY_SORT_OPTIONS,
  likesSubsetNote,
  serverSongSearchState,
  shouldAutoLoadForSearch,
  SONG_SEARCH_AUTOLOAD_BOUND,
  songSearchAutoLoadSpent,
  songSearchMode,
  songSearchScopeNote,
  musicChipBadge,
  musicChipOffersReconnect,
  musicConnectionNotice,
  musicLibraryFailure,
  musicLibraryKinds,
  orderLibrary,
  playlistMetaLine,
  songMetaLine,
  SPOTIFY_ALLOWLIST_CODE,
  PROVIDER_QUOTA_CODE,
  libraryFailureExplainsItself,
  type LibrarySort,
  type MusicLibraryKind,
} from '../lib/music-library.js';
import { Dialog } from './Dialog.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { ClassPulse } from './ClassPulse.js';
import { TimelineStrip } from './TimelineStrip.js';
import { SegmentBand } from './SegmentBand.js';
import { lazyWithReload } from '../lib/lazyWithReload.js';
import { IntensityReadout } from './IntensityReadout.js';
import { IntensitySegmentedControl } from './IntensitySegmentedControl.js';
import { ClassReadinessSummary } from './ClassReadinessSummary.js';
import { TrackSearch, providerTrackKeysFromRun } from './TrackSearch.js';
import { CreateClassDialog, type CreateClassMode } from './CreateClassDialog.js';
import { ClassPlanBlocks, planBlockOptionLabel, type PlanBlockTarget } from './ClassPlanBlocks.js';
import { SourceList, sourceCandidateKey } from './SourceList.js';
import {
  consumeOnboardingVideoPending,
  markOnboardingVideoDismissed,
} from '../lib/onboarding-video.js';
import { OnboardingVideoDialog } from './OnboardingVideoDialog.js';
import { ClassesHome } from './ClassesHome.js';
import { LibraryOrganizeControls, TagFilter } from './LibraryOrganize.js';
import { LoadingSkeleton, RecoveryState, StatusLabel } from './SharedState.js';
import { ProviderCapabilityLedger } from './ProviderCapabilityLedger.js';
import { ClassCoverArt, TrackArt } from './TrackArt.js';

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
  session: OrderedImportSession;
  /** Replay song blocks on retry. Search and manual adds leave this unset. */
  songBlocks?: boolean;
}

/** Full-screen Suspense fallback while a lazy chunk (e.g. Live mode) loads. */
function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="font-ui text-text-tertiary">Loading…</p>
    </main>
  );
}

type DetailWorkspaceOwner = { classId: string; session: object };
type DetailRefreshOrigin = 'mutation' | 'live-return';

export function Dashboard({
  userId,
  userName,
  sessionLost = false,
}: {
  userId: string;
  userName: string;
  /** The session ended while Live was running; Live stays up with a quiet line. */
  sessionLost?: boolean;
}) {
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
  const [newEmptyClassId, setNewEmptyClassId] = useState<string | null>(null);
  const [detail, dispatchDetail] = useReducer(classDetailReducer, initialClassDetailState);
  const detailRequestId = useRef(0);
  const liveRequestId = useRef(0);
  const pendingLiveRequest = useRef<{ classId: string; requestId: number } | null>(null);
  // Each class opening has a logical session; Live suspends its presentation.
  // Reopening A after visiting B creates another session, while returning from
  // Live must still reconcile legitimate writes from the suspended session.
  const detailWorkspace = useRef<DetailWorkspaceOwner | null>(null);
  const suspendedWorkspace = useRef<DetailWorkspaceOwner | null>(null);
  const workspaceOwner = detailWorkspace.current;
  const [refreshWarning, setRefreshWarning] = useState<{
    owner: DetailWorkspaceOwner;
    origin: DetailRefreshOrigin;
    message: string;
    retrying: boolean;
  } | null>(null);
  const refreshRetryRef = useRef<HTMLButtonElement>(null);
  const restoreRefreshFocus = useRef(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<RunPayload | null>(null);
  useEffect(() => setLiveActive(live != null), [live]);
  useEffect(() => () => setLiveActive(false), []);
  const online = useOnline();
  // Live Mode is a full-tree swap (see the `if (live)` early return below), so the
  // control that opened it never survives to be refocused on exit — the dashboard
  // remounts fresh. Restore focus to the primary heading instead, the same
  // deterministic-landmark discipline as #250's preflight entry-focus fix.
  const dashboardHeadingRef = useRef<HTMLHeadingElement>(null);
  const restoreFocusOnExitRef = useRef(false);
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
    playlistId: string;
  } | null>(null);
  const [likesBrowse, setLikesBrowse] = useState<{
    provider: Provider;
    tracks: TrackSearchResult[];
    /** More liked songs exist than were loaded: the dialog says it used a subset. */
    hasMore: boolean;
  } | null>(null);
  const [onboardingVideoOpen, setOnboardingVideoOpen] = useState(false);
  const [oauthResult, setOauthResult] = useState<{ connected?: string; error?: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CollectionImportResult | null>(null);
  const [retryingImport, setRetryingImport] = useState(false);

  const [createDialogMode, setCreateDialogMode] = useState<CreateClassMode | null>(null);
  const [createDiscipline, setCreateDiscipline] = useState<ScaffoldDiscipline | null>(null);
  const createDialogOpen = createDialogMode != null;
  const focusClassCreator = useCallback(
    (mode: CreateClassMode = 'scaffold', discipline: ScaffoldDiscipline | null = null) => {
      setCreateDiscipline(discipline);
      setCreateDialogMode(mode);
    },
    [],
  );

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
      setError(errMessage(e));
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
      setError(errMessage(e));
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
  const loadDetail = useCallback(
    async (
      classId: string,
      opts?: {
        silent?: boolean;
        owner?: DetailWorkspaceOwner | null;
        origin?: DetailRefreshOrigin;
      },
    ) => {
      const requestedOwner = opts?.silent ? opts.owner : detailWorkspace.current;
      const owner = detailWorkspace.current;
      // A successful mutation from the session suspended by Live may complete
      // after Exit. Reconcile through its current presentation, never revive an
      // old class-opening session or publish a response from an old presentation.
      if (
        !requestedOwner ||
        !owner ||
        requestedOwner.session !== owner.session ||
        owner.classId !== classId
      )
        return;
      const requestId = ++detailRequestId.current;
      if (!opts?.silent) dispatchDetail({ type: 'begin', classId, requestId });
      setRefreshWarning((current) =>
        current?.owner === owner ? { ...current, retrying: true } : current,
      );
      const [tracksResult, payloadResult] = await Promise.allSettled([
        listClassTracks(classId),
        getRunPayload(classId),
      ]);

      // Silent reads do not dispatch begin, so the reducer alone cannot know that
      // a newer read is pending. Guard every presentation effect, including cards.
      if (owner !== detailWorkspace.current || requestId !== detailRequestId.current) return;

      if (tracksResult.status === 'rejected') {
        const message = errMessage(tracksResult.reason, 'Could not load this class.');
        // An in-place refresh follows a mutation that already succeeded. Keep the
        // current workbench and any local inspector draft mounted if that refresh
        // fails; a scoped status reports the stale read without pretending the
        // class disappeared or clearing the selected track.
        if (opts?.silent) {
          setRefreshWarning({
            owner,
            origin: opts.origin ?? 'mutation',
            message: `${opts.origin === 'live-return' ? 'Back in Builder' : 'Saved'}, but the latest class details could not be refreshed: ${message}`,
            retrying: false,
          });
          return;
        }
        dispatchDetail({
          type: 'failure',
          classId,
          requestId,
          error: message,
        });
        return;
      }

      // Restore retry focus after the fresh detail commits: its selected song
      // may disappear from the authoritative response, so the old DOM is unsafe.
      if (document.activeElement === refreshRetryRef.current) restoreRefreshFocus.current = true;
      setRefreshWarning((current) => (current?.owner === owner ? null : current));
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
    },
    [],
  );

  const exitLive = useCallback(() => {
    liveRequestId.current += 1;
    restoreFocusOnExitRef.current = true;
    const suspended = suspendedWorkspace.current;
    suspendedWorkspace.current = null;
    const owner =
      suspended?.classId === selected?.id && suspended
        ? { classId: suspended.classId, session: suspended.session }
        : null;
    detailWorkspace.current = owner;
    setLive(null);
    if (owner) void loadDetail(owner.classId, { silent: true, owner, origin: 'live-return' });
  }, [selected, loadDetail]);

  // Open and Live start share one clock. The write does not bump updatedAt.
  const noteClassOpened = useCallback((classId: string) => {
    const at = Date.now();
    setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, lastOpenedAt: at } : c)));
    void Promise.resolve()
      .then(() => markClassOpened(classId))
      .then((updated) => {
        if (updated?.lastOpenedAt == null) return;
        setClasses((prev) =>
          prev.map((c) => (c.id === classId ? { ...c, lastOpenedAt: updated.lastOpenedAt } : c)),
        );
      })
      .catch(() => {
        /* The optimistic stamp stands until the next list load. */
      });
  }, []);

  const enterLive = useCallback(
    (payload: RunPayload, resumeBuilder = true) => {
      noteClassOpened(payload.class.id);
      suspendedWorkspace.current = resumeBuilder ? detailWorkspace.current : null;
      detailWorkspace.current = null;
      setRefreshWarning(null);
      pendingLiveRequest.current = null;
      setLive(payload);
    },
    [noteClassOpened],
  );

  useLayoutEffect(() => {
    if (!restoreRefreshFocus.current) return;
    restoreRefreshFocus.current = false;
    // The reorder list mirrors payload in an effect, so its first committed DOM
    // can still contain old rows. Focus only a row present in the fresh payload.
    const currentIds = new Set(detail.payload?.tracks.map((entry) => entry.classTrackId));
    const rows = workspaceRef.current?.querySelectorAll<HTMLElement>('[data-track-select-id]');
    const survivingRows = Array.from(rows ?? []).filter((row) =>
      currentIds.has(row.dataset.trackSelectId!),
    );
    const selectedRow = survivingRows.find((row) => row.getAttribute('aria-pressed') === 'true');
    (selectedRow ?? survivingRows[0] ?? dashboardHeadingRef.current)?.focus();
  }, [detail]);

  const openClass = useCallback(
    async (cls: ClassWithAccess) => {
      noteClassOpened(cls.id);
      liveRequestId.current += 1;
      detailWorkspace.current = { classId: cls.id, session: {} };
      setRefreshWarning(null);
      setSelected(cls);
      await loadDetail(cls.id);
    },
    [loadDetail, noteClassOpened],
  );

  // Leave the full-focus builder for the Classes library. Bump the live and
  // detail generations so a response still in flight cannot reopen this class.
  const closeBuilder = useCallback(() => {
    liveRequestId.current += 1;
    detailWorkspace.current = null;
    setRefreshWarning(null);
    setSelected(null);
    dispatchDetail({ type: 'reset', requestId: ++detailRequestId.current });
  }, []);

  // A provider OAuth round-trip returns the browser to "/?connected=…" or
  // "/?error=…". Open the connections dialog with that result, then strip the
  // query so a refresh or back-nav doesn't replay it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const errorReason = params.get('error');
    if (!connected && !errorReason) return;
    const validProvider = PROVIDER_ORDER.find((provider) => provider === connected);
    const origin = consumeConnectionReturn(userId, validProvider);
    if (origin) {
      setDestination(origin.destination);
      if (origin.classId) {
        void getClass(origin.classId)
          .then((cls) => {
            void openClass(cls);
            if (origin.destination === 'live') {
              const requestId = ++liveRequestId.current;
              pendingLiveRequest.current = { classId: cls.id, requestId };
              const owner = detailWorkspace.current;
              void getRunPayload(cls.id)
                .then((payload) => {
                  if (requestId === liveRequestId.current && owner === detailWorkspace.current)
                    enterLive(payload, false);
                })
                .catch(() => {
                  if (requestId === liveRequestId.current) setDestination('classes');
                })
                .finally(() => {
                  if (pendingLiveRequest.current?.requestId === requestId)
                    pendingLiveRequest.current = null;
                });
            }
          })
          .catch(() => setDestination('classes'));
      }
    }
    setOauthResult({ connected: validProvider, error: errorReason ?? undefined });
    setConnectionsOpen(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, [userId, openClass, enterLive]);

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
        setError(errMessage(e));
      }
    },
    [classes, openClass],
  );

  const runClass = useCallback(
    async (classId: string) => {
      const requestId = ++liveRequestId.current;
      pendingLiveRequest.current = { classId, requestId };
      const owner = detailWorkspace.current;
      const current = () =>
        requestId === liveRequestId.current && owner === detailWorkspace.current;
      try {
        const payload = await getRunPayload(classId);
        if (!current()) return;
        const blocked = runBlockedMessage(payload);
        if (blocked) {
          setError(blocked);
          return;
        }
        enterLive(payload);
        setError(null);
      } catch (e) {
        if (current()) setError(errMessage(e));
      } finally {
        if (pendingLiveRequest.current?.requestId === requestId) pendingLiveRequest.current = null;
      }
    },
    [enterLive],
  );

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
      const ownsPresentation = detailWorkspace.current?.classId === classId;
      const ownsSuspension = suspendedWorkspace.current?.classId === classId;
      const ownsLiveRequest =
        pendingLiveRequest.current?.classId === classId &&
        pendingLiveRequest.current.requestId === liveRequestId.current;
      // An authoritative deletion closes that class, including a reopened A.
      // Its old callback must not invalidate B's detail, notice or pending Run.
      if (ownsPresentation || ownsSuspension || ownsLiveRequest) liveRequestId.current += 1;
      if (ownsLiveRequest) pendingLiveRequest.current = null;
      if (ownsPresentation) detailWorkspace.current = null;
      if (ownsSuspension) suspendedWorkspace.current = null;
      setSelected((prev) => (prev && prev.id === classId ? null : prev));
      setRefreshWarning((current) => (current?.owner.classId === classId ? null : current));
      if (ownsPresentation || ownsSuspension)
        dispatchDetail({ type: 'reset', requestId: ++detailRequestId.current });
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      void refreshClasses();
    },
    [refreshClasses],
  );

  const importCollectionTracks = useCallback(
    async (
      classId: string,
      session: OrderedImportSession,
      confirmOnly = false,
      songBlocks = false,
    ) => {
      const result = await runOrderedImport(classId, session, undefined, undefined, {
        confirmOnly,
        songBlocks,
      });
      setError(result.error);
      return session.entries.filter((e) => !e.added).map((e) => e.candidate);
    },
    [],
  );

  /** Keep source occurrences through partial resolution and ambiguous commits. */
  const handleCreateClassFromPlaylist = useCallback(
    async (
      provider: Provider,
      playlistId: string,
      playlistName: string,
      template: ClassTemplate,
      tracks: TrackSearchResult[],
    ) => {
      if (tracks.length === 0) {
        throw new Error(
          'No tracks found in this playlist. Choose another playlist to start a class.',
        );
      }
      const cls = await createClass({ title: playlistName, template });
      await applyTagFilter(null);
      const session = createOrderedImport(
        tracks,
        `ritmo-import:${cls.id}:class:${provider}:${playlistId}`,
      );
      session.sourcePlaylist = {
        provider,
        playlistId,
        name: playlistName,
        providerUri: null,
        ownerName: null,
        trackCount: tracks.length,
        coverImageUrl: null,
      };
      const failed = await importCollectionTracks(cls.id, session, false, true);
      setImportResult({
        classId: cls.id,
        classTitle: cls.title,
        imported: tracks.length - failed.length,
        total: tracks.length,
        failed,
        session,
        songBlocks: true,
      });
      setPlaylistBrowse(null);
      // The builder only mounts on Classes. Closing the dialog is not navigation.
      setDestination('classes');
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
    async (
      tracks: TrackSearchResult[],
      title: string,
      template: ClassTemplate,
      songBlocks = false,
    ) => {
      const cls = await createClass({ title, template });
      await applyTagFilter(null);
      const session = createOrderedImport(tracks);
      const failed = await importCollectionTracks(cls.id, session, false, songBlocks);
      setImportResult({
        classId: cls.id,
        classTitle: cls.title,
        imported: tracks.length - failed.length,
        total: tracks.length,
        failed,
        session,
        songBlocks,
      });
      setLikesBrowse(null);
      setDestination('classes');
      await openClass({ ...cls, accessLevel: 'owner' });
    },
    [applyTagFilter, importCollectionTracks, openClass],
  );

  const retryFailedImport = useCallback(async () => {
    if (!importResult || importResult.failed.length === 0 || retryingImport) return;
    setRetryingImport(true);
    const owner = detailWorkspace.current;
    try {
      const failed = await importCollectionTracks(
        importResult.classId,
        importResult.session,
        !!importResult.session.pending,
        importResult.songBlocks === true,
      );
      setImportResult((current) =>
        current?.session === importResult.session
          ? {
              ...current,
              imported: current.total - failed.length,
              failed,
            }
          : current,
      );
      // A successful retry can settle after Live return advanced the read generation.
      // Shared loadDetail validates its logical session before requesting fresh detail.
      if (owner?.classId === importResult.classId) {
        await loadDetail(importResult.classId, { silent: true, owner });
      }
    } finally {
      setRetryingImport(false);
    }
  }, [importCollectionTracks, importResult, loadDetail, retryingImport]);

  // The signed-out line pushes Live down by one row. Only then does the wrapper
  // become a containing block for Live's fixed shell; otherwise it is `contents`.
  if (live)
    return (
      <div className={sessionLost ? 'flex h-dvh flex-col' : 'contents'}>
        {sessionLost && (
          <p
            role="status"
            className="shrink-0 border-b border-border-subtle bg-bg-raised px-4 py-2 text-center font-ui text-sm text-text-secondary"
          >
            Signed out. Finish the class, then sign in.
          </p>
        )}
        <div
          className={sessionLost ? 'relative min-h-0 flex-1 [transform:translateZ(0)]' : 'contents'}
        >
          <ErrorBoundary resetLabel="Exit live mode" onReset={exitLive}>
            <Suspense fallback={<LoadingScreen />}>
              <LiveMode
                payload={live}
                onExit={exitLive}
                connectionResult={oauthResult}
                onConnectionResultDismissed={() => {
                  setOauthResult(null);
                  setConnectionsOpen(false);
                }}
                beforeConnectionRedirect={(provider) =>
                  rememberConnectionReturn({
                    userId,
                    destination: 'live',
                    classId: live.class.id,
                    provider,
                  })
                }
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
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
          {!online && (
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-pill border border-state-caution/40 px-2 py-0.5 font-ui text-xs font-semibold text-state-caution"
            >
              <span aria-hidden className="font-data leading-none">
                !
              </span>
              Offline
            </span>
          )}
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
                className={`min-h-11 shrink-0 rounded-control border px-3 font-ui text-xs font-semibold transition-colors sm:rounded-pill sm:px-4 sm:text-sm ${
                  active
                    ? 'border-transparent bg-transparent text-text-primary underline decoration-interactive decoration-2 underline-offset-8'
                    : 'border-transparent bg-transparent text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => {
                  liveRequestId.current += 1;
                  detailWorkspace.current = null;
                  setRefreshWarning(null);
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
            beforeRedirect={(provider) =>
              rememberConnectionReturn({
                userId,
                destination,
                classId: selected?.id,
                provider,
              })
            }
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
        {createDialogOpen && (
          <CreateClassDialog
            mode={createDialogMode ?? 'scaffold'}
            discipline={createDiscipline}
            onClose={() => {
              setCreateDialogMode(null);
              setCreateDiscipline(null);
            }}
            onError={setError}
            onCreated={async (cls) => {
              if (cls.scaffoldRecipeId == null) setNewEmptyClassId(cls.id);
              await applyTagFilter(null);
              await openClass({ ...cls, accessLevel: 'owner' });
            }}
          />
        )}
        {playlistBrowse && (
          <PlaylistBrowserDialog
            provider={playlistBrowse.provider}
            playlists={playlistBrowse.playlists}
            initialPlaylistId={playlistBrowse.playlistId}
            onClose={() => setPlaylistBrowse(null)}
            onCreateClass={handleCreateClassFromPlaylist}
          />
        )}
        {likesBrowse && (
          <LikesBrowserDialog
            provider={likesBrowse.provider}
            tracks={likesBrowse.tracks}
            hasMore={likesBrowse.hasMore}
            onClose={() => setLikesBrowse(null)}
            onCreateClass={handleCreateClassFromLikes}
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
        {error &&
          !(destination === 'classes' && listStatus === 'error' && classes.length === 0) && (
            <p className="mb-4 font-ui text-sm text-state-danger">{error}</p>
          )}
        {refreshWarning && refreshWarning.owner === workspaceOwner && destination === 'classes' && (
          <section
            role="status"
            aria-label="Class detail refresh"
            className="mb-4 flex min-w-0 flex-wrap items-center gap-3 rounded-card border border-state-caution/30 bg-state-caution/5 p-3 font-ui text-sm text-text-primary"
          >
            <p className="min-w-0 flex-[1_1_100%] sm:flex-1">
              <span aria-hidden="true">! </span>
              {refreshWarning.message} Your current workbench remains open.
            </p>
            <button
              ref={refreshRetryRef}
              type="button"
              aria-disabled={refreshWarning.retrying}
              onClick={() => {
                if (!refreshWarning.retrying && selected) {
                  void loadDetail(selected.id, {
                    silent: true,
                    owner: refreshWarning.owner,
                    origin: refreshWarning.origin,
                  });
                }
              }}
              className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring"
            >
              {refreshWarning.retrying ? 'Refreshing class details…' : 'Refresh class details'}
            </button>
          </section>
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
              {importResult.session.pending
                ? `The import into ${importResult.classTitle} is unconfirmed. Confirm the previous import before adding more songs.`
                : importResult.session.needsRecovery
                  ? 'Your class order changed. Keep your arrangement and add the remaining songs at the end.'
                  : importResult.failed.length > 0
                    ? `${importResult.imported} of ${importResult.total} tracks imported into ${importResult.classTitle}. ${importResult.failed.length} still need attention.`
                    : `All ${importResult.total} tracks imported into ${importResult.classTitle}.`}
            </p>
            {importResult.failed.length > 0 && (
              <button
                type="button"
                disabled={retryingImport}
                onClick={() => {
                  if (importResult.session.needsRecovery && !importResult.session.pending)
                    preserveImportArrangement(importResult.session);
                  void retryFailedImport();
                }}
                className="min-h-11 rounded-control bg-interactive px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:min-h-9 sm:rounded-pill"
              >
                {retryingImport
                  ? 'Retrying…'
                  : importResult.session.pending
                    ? 'Confirm previous import'
                    : importResult.session.needsRecovery
                      ? 'Add remaining songs at end'
                      : `Retry ${importResult.failed.length} failed`}
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

        {/* A crash in one destination keeps the nav. Keyed so switching page or
            class always starts with a fresh boundary. */}
        <ErrorBoundary
          key={`${destination}:${selected?.id ?? ''}`}
          variant="section"
          resetLabel="Back to Classes"
          onReset={() => {
            setDestination('classes');
            closeBuilder();
          }}
        >
          {destination === 'classes' ? (
            selected ? (
              /* Full-focus builder: the class and its inspector. The Classes library
              stays on its own page, reached by the back link. */
              <div
                ref={workspaceRef}
                className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start"
              >
                {detail.classId === selected.id && detail.status === 'ready' ? (
                  <ClassWorkspace
                    key={selected.id}
                    cls={selected}
                    tracks={detail.tracks}
                    payload={detail.payload}
                    onError={setError}
                    onTrackChanged={() =>
                      void loadDetail(selected.id, { silent: true, owner: workspaceOwner })
                    }
                    onTrackAdded={() =>
                      void loadDetail(selected.id, { silent: true, owner: workspaceOwner })
                    }
                    onChoreographyChanged={() =>
                      void loadDetail(selected.id, { silent: true, owner: workspaceOwner })
                    }
                    onReordered={() =>
                      void loadDetail(selected.id, { silent: true, owner: workspaceOwner })
                    }
                    onTrackRemoved={() =>
                      void loadDetail(selected.id, { silent: true, owner: workspaceOwner })
                    }
                    onRun={() => runClass(selected.id)}
                    onClassUpdated={applyClassUpdate}
                    onClassDeleted={handleClassDeleted}
                    onOpenSongsByMove={() => setSongsByMoveOpen(true)}
                    onOpenConnections={() => setConnectionsOpen(true)}
                    connectionRevision={connectionRevision}
                    focusAddMusic={newEmptyClassId === selected.id}
                    onFocusedAddMusic={() => setNewEmptyClassId(null)}
                    onBackToClasses={closeBuilder}
                    onRetryDetails={() => void loadDetail(selected.id)}
                  />
                ) : detail.classId === selected.id && detail.status === 'error' ? (
                  <section className="flex min-w-0 flex-col gap-4">
                    <BackToClassesButton onClick={closeBuilder} />
                    <RecoveryState
                      kind="error"
                      compact
                      role="alert"
                      title="This class didn't load."
                      event={detail.error}
                      safety="Your class is saved. Nothing changed."
                      primaryAction={
                        <button
                          type="button"
                          className={RETRY_BUTTON_CLASS}
                          onClick={() => void loadDetail(selected.id)}
                        >
                          Retry
                        </button>
                      }
                    />
                  </section>
                ) : (
                  <section className="flex min-w-0 flex-col gap-4">
                    <BackToClassesButton onClick={closeBuilder} />
                    <LoadingSkeleton label="Loading class" shape="card" />
                  </section>
                )}
              </div>
            ) : (
              <ClassesHome
                classes={classes}
                status={listStatus}
                libraryError={error}
                activeTag={activeTag}
                knownTags={knownTags}
                hasMore={nextClassCursor !== null}
                loadingMore={loadingMoreClasses}
                onOpen={openClass}
                onPreview={(cls) => setCardPreview(cls)}
                onDuplicate={async (cls) => {
                  const copy = await copyClass(cls.id);
                  await applyTagFilter(null);
                  await refreshClasses();
                  await openClass({ ...copy, accessLevel: 'owner' });
                }}
                onDelete={async (cls) => {
                  await deleteClass(cls.id);
                  handleClassDeleted(cls.id);
                }}
                onSelectTag={applyTagFilter}
                onClearTag={() => void applyTagFilter(null)}
                onRetry={() => {
                  setListStatus('loading');
                  void refreshClasses();
                }}
                onLoadMore={loadMoreClasses}
                onStartClass={focusClassCreator}
                onStartTemplate={(template) => focusClassCreator('scaffold', template)}
                onImportPlaylist={() => setDestination('music')}
              />
            )
          ) : destination === 'music' ? (
            <MusicWorkspace
              userId={userId}
              connectionRevision={connectionRevision}
              onOpenConnections={() => setConnectionsOpen(true)}
              onOpenPlaylist={(provider, playlists, playlistId) =>
                setPlaylistBrowse({ provider, playlists, playlistId })
              }
              onBrowseLikes={(provider, tracks, hasMore) =>
                setLikesBrowse({ provider, tracks, hasMore })
              }
              onCreateClass={handleCreateClassFromLikes}
            />
          ) : destination === 'live' ? (
            <LiveWorkspace
              classes={classes}
              status={listStatus}
              onRetry={() => {
                setListStatus('loading');
                void refreshClasses();
              }}
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
        </ErrorBoundary>
      </div>
    </main>
  );
}

/** Leaves the full-focus builder for the Classes library. */
function BackToClassesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 self-start rounded-control px-1 font-ui text-sm font-semibold text-interactive hover:text-interactive-hover rf-focus-ring"
    >
      <span aria-hidden="true">← </span>
      Back to Classes
    </button>
  );
}

/**
 * Add a playlist, with the append note beside the button when the class already
 * has songs. New songs append; this control does not stretch blocks.
 */
function AddPlaylistControl({
  buttonRef,
  expanded,
  note,
  noteId,
  onClick,
  prominent = false,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  expanded: boolean;
  note: string | null;
  noteId: string;
  onClick: () => void;
  prominent?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        aria-describedby={note ? noteId : undefined}
        className={
          prominent
            ? 'min-h-11 rounded-control rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring'
            : 'min-h-11 rounded-control border border-interactive/50 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring'
        }
      >
        Add a playlist
      </button>
      {note ? (
        <p id={noteId} className="font-ui text-xs leading-5 text-text-tertiary">
          {note}
        </p>
      ) : null}
    </div>
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
  creatorOpen,
  onCreatorOpenChange,
  onSelectTag,
  onError,
  onStartClass,
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
  /** Whether the creation/filter disclosure is expanded (lifted so "Start a
   *  template" from the resting state can open it before focusing the title). */
  creatorOpen: boolean;
  onCreatorOpenChange: (open: boolean) => void;
  /** Apply (or clear, with null) the server-side tag filter; reloads from page 1. */
  onSelectTag: (tag: string | null) => void;
  onError: (msg: string | null) => void;
  onStartClass: () => void;
  /** Duplicate an owned class into the library (resolves when done). */
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
    <aside
      className={`flex min-w-0 flex-col gap-3 xl:sticky xl:top-6 xl:col-start-1 xl:row-start-1 ${className ?? ''}`}
    >
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
      {/* One affordance for everything that is *about* the library rather than in
          it — creating, tag-filtering, searching, sorting. Expanded on the wide
          workstation; collapsed on a phone, where these four stacked controls are
          the preamble that pushes the class list off the first screen. */}
      <details
        open={creatorOpen}
        onToggle={(e) => onCreatorOpenChange((e.currentTarget as HTMLDetailsElement).open)}
        className="rounded-control border border-border-subtle bg-bg-raised/40"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 font-ui text-xs font-semibold text-text-secondary rf-focus-ring">
          <span>New class, filters, and search</span>
          <span aria-hidden className="font-data text-[10px] text-text-tertiary">
            {creatorOpen ? '▾' : '▸'}
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-border-subtle p-3">
          <button
            type="button"
            onClick={onStartClass}
            className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring"
          >
            New class
          </button>
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
        </div>
      </details>
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
 * A single Library card (design system 11, tightened for music-forward queue):
 * bounded album-art collage, title, shape-first meta (template · track count · runtime),
 * quiet last-opened. Primary action is opening the card (main area). Duplicate and
 * Rehearsal view are deliberately quieter secondary actions in a compact footer (no
 * dominating vertical divider). The solo-first library is owner-only (D20), so no
 * ownership chip is shown.
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
          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left font-ui rf-focus-ring"
        >
          <ArtCollage urls={cls.albumArtUrls} classId={cls.id} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-text-primary">{cls.title}</span>
            {/* Which card is open, in a word. "Editing now" overstated — selected
                is not the same as a dirty inspector. The ring plus this name the
                click; the workspace heading names the class. */}
            {selected && (
              <span className="mt-0.5 inline-flex rounded-pill bg-interactive/15 px-1.5 font-data text-[10px] uppercase tracking-wide text-interactive">
                Open
              </span>
            )}
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
          {/* Same action, same name as the shelf's secondary — "View" and
              "Rehearsal view" used to be two words for opening `ClassSummaryView`
              (P1-07). The surface calls itself the read-only rehearsal view, so
              that is the name everywhere. */}
          <button
            type="button"
            onClick={() => onPreview(cls)}
            aria-label={`Rehearsal view — ${cls.title}`}
            title="Read-only rehearsal view"
            className="min-h-11 rounded-control px-3 hover:bg-bg-base hover:text-text-primary rf-focus-ring sm:min-h-8"
          >
            Rehearsal view
          </button>
          <span aria-hidden className="text-text-tertiary/40">
            ·
          </span>
          <button
            type="button"
            onClick={() => void run(() => onDuplicate(cls))}
            disabled={busy}
            // "Copy" read as copy-to-clipboard or copy-a-link. The action makes a
            // second editable class, so the verb says that.
            aria-label={`Duplicate ${cls.title}`}
            title="Save an editable copy of this class"
            className="min-h-11 rounded-control px-3 hover:bg-bg-base hover:text-text-primary rf-focus-ring disabled:opacity-40 sm:min-h-8"
          >
            {busy ? '…' : 'Duplicate'}
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * The track-art collage (design system 11: "small bounded artwork"). A bounded 44px
 * tile: one image when there's a single art, a 2×2 mosaic for several, and a derived
 * tile keyed to the class's id when it has no track art yet — the same tile the builder
 * cover uses (05-components.md — never a bare note glyph). Purely decorative — the title
 * carries the meaning — so images are empty-alt and the container is aria-hidden.
 */
function ArtCollage({ urls, classId }: { urls: string[]; classId: string }) {
  if (urls.length === 0) {
    return <TrackArt url={null} identity={classId} size={44} />;
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
 * The create-class chooser's D21 templates. Pilates maps to the shared `sculpt`
 * enum until the contract earns a rename; labels are presentation-only.
 */
const CREATE_TEMPLATE_OPTIONS: ReadonlyArray<{ value: ClassTemplate | null; label: string }> = [
  { value: 'cycle', label: 'Cycle' },
  { value: 'sculpt', label: 'Pilates' },
  { value: 'hiit', label: 'HIIT' },
];

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

type ShelfFailure = { message: string; code?: string };

/**
 * Which library a provider's loaded likes belong to: the connection row and the
 * provider account. A re-fetched connection list, or a server-side token refresh
 * (which bumps `updatedAt`), keeps it; a new connection or another account changes it.
 */
function likesConnectionKey(connection: MusicConnectionView): string {
  return `${connection.id}:${connection.providerUserId ?? ''}`;
}

function shelfFailure(error: unknown): ShelfFailure {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : undefined;
  return { message: errMessage(error), ...(code ? { code } : {}) };
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
  const [playlistsError, setPlaylistsError] = useState<Partial<Record<Provider, ShelfFailure>>>({});
  const [likes, setLikes] = useState<Partial<Record<Provider, TrackSearchResult[]>>>({});
  const [likesLoading, setLikesLoading] = useState<Partial<Record<Provider, boolean>>>({});
  const [likesError, setLikesError] = useState<Partial<Record<Provider, ShelfFailure>>>({});
  // Paging (RF-132): the provider's next-page cursor (null on the last page), a
  // "Load more" in flight, and a "Load more" failure that keeps the loaded rows.
  const [likesNext, setLikesNext] = useState<Partial<Record<Provider, string | null>>>({});
  const [likesLoadingMore, setLikesLoadingMore] = useState<Partial<Record<Provider, boolean>>>({});
  const [likesMoreError, setLikesMoreError] = useState<Partial<Record<Provider, string>>>({});
  const likesNextRef = useRef<Partial<Record<Provider, string | null>>>({});
  const likesMoreInFlight = useRef<Set<Provider>>(new Set());
  // Per provider: a token bumped by every first-page read (an older read or a
  // "Load more" started before it no longer applies), and the connection key the
  // loaded pages belong to (or that a first-page read is fetching), so a
  // `connections` refresh only reloads a provider whose connection changed.
  const likesToken = useRef<Partial<Record<Provider, number>>>({});
  const likesLoadedKey = useRef<Partial<Record<Provider, string>>>({});
  const likesRequestKey = useRef<Partial<Record<Provider, string>>>({});
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
        setLikesNext((prev) => retainConnectedProviderState(prev, connectedProviders));
        likesNextRef.current = retainConnectedProviderState(
          likesNextRef.current,
          connectedProviders,
        );
        setLikesLoadingMore((prev) => retainConnectedProviderState(prev, connectedProviders));
        setLikesMoreError((prev) => retainConnectedProviderState(prev, connectedProviders));
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
          setPlaylistsError((prev) => ({ ...prev, [provider]: shelfFailure(e) }));
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
    for (const provider of PROVIDER_ORDER) {
      if (!providerCapabilities[provider].userLikes) continue;
      const connection = connections.find((row) => row.provider === provider);
      const state = providerConnectionState(provider, connection, Date.now());
      if (state !== 'connected' || !connection) {
        // Disconnected: forget its pages so a reconnect starts from page 1.
        delete likesLoadedKey.current[provider];
        delete likesRequestKey.current[provider];
        likesToken.current[provider] = (likesToken.current[provider] ?? 0) + 1;
        continue;
      }
      // Keep pages already loaded (Load more, search autoload) while this
      // provider's connection is unchanged; a refresh of another provider or a
      // re-fetched connection list must not reset it to page 1.
      const key = likesConnectionKey(connection);
      if (likesLoadedKey.current[provider] === key || likesRequestKey.current[provider] === key) {
        continue;
      }
      const token = (likesToken.current[provider] ?? 0) + 1;
      likesToken.current[provider] = token;
      likesRequestKey.current[provider] = key;
      const current = () =>
        likesToken.current[provider] === token && connectedProvidersRef.current.has(provider);
      setLikesLoading((prev) => ({ ...prev, [provider]: true }));
      void (async () => {
        try {
          const page = await listLikesPage(provider);
          if (!current()) return;
          const rows = Array.isArray(page?.items) ? page.items : [];
          const next = page?.nextCursor ?? null;
          likesNextRef.current = { ...likesNextRef.current, [provider]: next };
          likesLoadedKey.current[provider] = key;
          setLikes((prev) => ({ ...prev, [provider]: rows }));
          setLikesNext((prev) => ({ ...prev, [provider]: next }));
          setLikesMoreError((prev) => ({ ...prev, [provider]: undefined }));
          setLikesError((prev) => ({ ...prev, [provider]: undefined }));
        } catch (e) {
          if (!current()) return;
          // A failed first page is retried by the next connections refresh.
          delete likesLoadedKey.current[provider];
          setLikesError((prev) => ({ ...prev, [provider]: shelfFailure(e) }));
        } finally {
          if (likesToken.current[provider] === token) {
            delete likesRequestKey.current[provider];
            if (connectedProvidersRef.current.has(provider)) {
              setLikesLoading((prev) => ({ ...prev, [provider]: false }));
            }
          }
        }
      })();
    }
  }, [connections]);

  /** Load the next page of `provider`'s liked songs with its own cursor (RF-132). */
  const loadMoreLikes = useCallback(async (provider: Provider) => {
    const cursor = likesNextRef.current[provider];
    if (!cursor || likesMoreInFlight.current.has(provider)) return;
    const token = likesToken.current[provider];
    likesMoreInFlight.current.add(provider);
    setLikesLoadingMore((prev) => ({ ...prev, [provider]: true }));
    setLikesMoreError((prev) => ({ ...prev, [provider]: undefined }));
    const current = () =>
      likesToken.current[provider] === token && connectedProvidersRef.current.has(provider);
    try {
      const page = await listLikesPage(provider, { cursor });
      if (!current()) return;
      const next = page.nextCursor ?? null;
      likesNextRef.current = { ...likesNextRef.current, [provider]: next };
      setLikes((prev) => ({
        ...prev,
        [provider]: appendSongPage(prev[provider] ?? [], page.items),
      }));
      setLikesNext((prev) => ({ ...prev, [provider]: next }));
    } catch (e) {
      if (!current()) return;
      setLikesMoreError((prev) => ({ ...prev, [provider]: shelfFailure(e).message }));
    } finally {
      likesMoreInFlight.current.delete(provider);
      setLikesLoadingMore((prev) => ({ ...prev, [provider]: false }));
    }
  }, []);

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
    likesNext,
    likesLoadingMore,
    likesMoreError,
    loadMoreLikes,
  };
}

const RETRY_BUTTON_CLASS =
  'min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill';

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
    return <LoadingSkeleton label="Checking music connections" shape="line" />;
  }

  return (
    <RecoveryState
      kind="unavailable"
      compact
      role="alert"
      title="Music connections didn't load."
      event={
        hasKnownConnections
          ? 'Showing your last known sources.'
          : 'Source status is unavailable until Ritmo can check again.'
      }
      safety="No connection changed. Catalog search still works."
      primaryAction={
        <button type="button" onClick={onRetry} className={RETRY_BUTTON_CLASS}>
          Retry
        </button>
      }
    />
  );
}

function MusicWorkspace({
  userId,
  connectionRevision,
  onOpenConnections,
  onOpenPlaylist,
  onBrowseLikes,
  onCreateClass,
}: {
  userId: string;
  connectionRevision: number;
  onOpenConnections: () => void;
  onOpenPlaylist: (
    provider: Provider,
    playlists: ProviderPlaylistSummary[],
    playlistId: string,
  ) => void;
  onBrowseLikes: (provider: Provider, tracks: TrackSearchResult[], hasMore: boolean) => void;
  onCreateClass: (
    tracks: TrackSearchResult[],
    title: string,
    template: ClassTemplate,
  ) => Promise<void>;
}) {
  const {
    connections,
    connectionsStatus,
    retryConnections,
    playlists,
    playlistsLoading,
    playlistsError,
    likes,
    likesLoading,
    likesError,
    likesNext,
    likesLoadingMore,
    likesMoreError,
    loadMoreLikes,
  } = useProviderBrowseState(connectionRevision);
  const flow = useProviderConnect({
    onConnected: retryConnections,
    beforeRedirect: (provider) =>
      rememberConnectionReturn({ userId, destination: 'music', provider }),
  });
  const [selectedProvider, setSelectedProvider] = useState<Provider>(PROVIDER_ORDER[0]!);
  const [libraryKind, setLibraryKind] = useState<MusicLibraryKind>('catalog');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [sort, setSort] = useState<LibrarySort>('library');
  // Songs search past the loaded pages (RF-132). Apple Music: a debounced library
  // search on the server. Others: keep loading pages while a query is typed, up to
  // 1,000 songs or 5 requests for that query; "Keep loading" grants another round.
  // The budget lives in a ref so the effect counts every request synchronously;
  // the state copy only re-renders the note.
  const songAutoLoadRef = useRef({ key: '', bound: SONG_SEARCH_AUTOLOAD_BOUND, requests: 0 });
  const [songAutoLoad, setSongAutoLoad] = useState(songAutoLoadRef.current);
  const [librarySearch, setLibrarySearch] = useState<{
    provider: Provider;
    query: string;
    results: TrackSearchResult[] | null;
    failed: boolean;
  } | null>(null);
  const librarySearchId = useRef(0);
  const typeTouched = useRef(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchRetryKey, setSearchRetryKey] = useState(0);
  const [selectedTracks, setSelectedTracks] = useState<TrackSearchResult[]>([]);
  const [classTitle, setClassTitle] = useState('New music class');
  const [template, setTemplate] = useState<ClassTemplate>('cycle');
  const [creating, setCreating] = useState(false);
  const requestId = useRef(0);

  const libraryKindFor = (provider: Provider): MusicLibraryKind => {
    const connection = connections.find((row) => row.provider === provider);
    const connected = providerConnectionState(provider, connection, Date.now()) === 'connected';
    return defaultLibraryKind(connected, musicLibraryKinds(provider));
  };

  useEffect(() => {
    if (typeTouched.current || connectionsStatus === 'loading') return;
    setLibraryKind(libraryKindFor(selectedProvider));
  }, [connections, connectionsStatus, selectedProvider]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      requestId.current += 1;
      setResults(null);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const id = ++requestId.current;
    setResults(null);
    setSearching(true);
    setSearchError(null);
    const timeout = window.setTimeout(() => {
      void searchProvider(selectedProvider, trimmed)
        .then((tracks) => {
          if (id === requestId.current) setResults(tracks);
        })
        .catch(() => {
          if (id === requestId.current) {
            setSearchError(
              `Couldn’t search ${providerLabel(selectedProvider)} right now. Try again.`,
            );
          }
        })
        .finally(() => {
          if (id === requestId.current) setSearching(false);
        });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [selectedProvider, query, searchRetryKey]);

  // Apple Music: search the whole library on the server as the instructor types.
  useEffect(() => {
    const trimmed = libraryQuery.trim();
    if (libraryKind !== 'songs' || songSearchMode(selectedProvider) !== 'server' || !trimmed) {
      librarySearchId.current += 1;
      return;
    }
    const connection = connections.find((row) => row.provider === selectedProvider);
    if (providerConnectionState(selectedProvider, connection, Date.now()) !== 'connected') return;
    const id = ++librarySearchId.current;
    const provider = selectedProvider;
    const timeout = window.setTimeout(() => {
      void listLikesPage(provider, { q: trimmed })
        .then((page) => {
          if (id !== librarySearchId.current) return;
          setLibrarySearch({ provider, query: trimmed, results: page.items, failed: false });
        })
        .catch(() => {
          if (id !== librarySearchId.current) return;
          setLibrarySearch({ provider, query: trimmed, results: null, failed: true });
        });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [selectedProvider, libraryKind, libraryQuery, connections]);

  // Other services: keep loading pages while a query is typed, within the
  // per-query budget (songs and requests), so it can't spend the likes limit.
  const autoLoadLikedTracks = likes[selectedProvider];
  const songAutoLoadKey = `${selectedProvider}\u0000${libraryQuery.trim()}`;
  const songAutoLoadNow =
    songAutoLoad.key === songAutoLoadKey
      ? songAutoLoad
      : { key: songAutoLoadKey, bound: SONG_SEARCH_AUTOLOAD_BOUND, requests: 0 };
  useEffect(() => {
    if (libraryKind !== 'songs' || songSearchMode(selectedProvider) !== 'loaded') return;
    const budget =
      songAutoLoadRef.current.key === songAutoLoadKey
        ? songAutoLoadRef.current
        : { key: songAutoLoadKey, bound: SONG_SEARCH_AUTOLOAD_BOUND, requests: 0 };
    if (
      shouldAutoLoadForSearch({
        query: libraryQuery,
        hasMore: Boolean(likesNext[selectedProvider]),
        loading:
          Boolean(likesLoadingMore[selectedProvider]) || Boolean(likesLoading[selectedProvider]),
        failed: Boolean(likesMoreError[selectedProvider]),
        loadedCount: autoLoadLikedTracks?.length ?? 0,
        bound: budget.bound,
        requests: budget.requests,
      })
    ) {
      const next = { ...budget, requests: budget.requests + 1 };
      songAutoLoadRef.current = next;
      setSongAutoLoad(next);
      void loadMoreLikes(selectedProvider);
    }
  }, [
    libraryKind,
    selectedProvider,
    libraryQuery,
    likesNext,
    likesLoadingMore,
    likesLoading,
    likesMoreError,
    autoLoadLikedTracks,
    songAutoLoadKey,
    songAutoLoad,
    loadMoreLikes,
  ]);

  const selectedKeys = useMemo(
    () => new Set(selectedTracks.map(sourceCandidateKey)),
    [selectedTracks],
  );
  const toggleTrack = (track: TrackSearchResult) => {
    const key = sourceCandidateKey(track);
    setSelectedTracks((current) =>
      current.some((candidate) => sourceCandidateKey(candidate) === key)
        ? current.filter((candidate) => sourceCandidateKey(candidate) !== key)
        : [...current, track],
    );
  };
  const startClass = async () => {
    if (selectedTracks.length === 0 || creating) return;
    setCreating(true);
    setSearchError(null);
    try {
      await onCreateClass(
        selectedTracks,
        classTitle.trim() || `New ${formatTemplateLabel(template)} class`,
        template,
      );
    } catch (error) {
      setSearchError(errMessage(error));
      setCreating(false);
    }
  };

  const label = providerLabel(selectedProvider);
  const connection = connections.find((row) => row.provider === selectedProvider);
  const connectionState = providerConnectionState(selectedProvider, connection, Date.now());
  const statusMark = musicConnectionMark(connectionsStatus, connectionState);
  const truth = providerCapabilityTruth(selectedProvider, connection, Date.now());
  const connectBusy = !!flow.operation && !flow.operation.error && flow.operation.stage !== 'ready';
  const ownOperation = flow.operation?.provider === selectedProvider ? flow.operation : null;
  const notice = musicConnectionNotice({
    label: providerLabel(selectedProvider),
    fetchStatus: connectionsStatus,
    connectionState,
    libraryKind,
    scopeGap:
      connectionState !== 'connected'
        ? null
        : truth.library.state === 'partial'
          ? 'playlists'
          : truth.playback.state === 'action-required'
            ? 'playback'
            : null,
    connectInFlight: !!ownOperation,
  });
  // The expired chip already carries Reconnect and its error; the notice only
  // adds the in-flight steps (progress, Cancel, Authorize Apple Music).
  const chipOwnsReconnect =
    connectionState === 'expired' && (!ownOperation || !!ownOperation.error);
  const noticeBlock = notice && (
    <div
      data-music-connection-notice=""
      className={`flex flex-col items-start gap-2 font-ui text-sm sm:flex-row sm:items-center sm:justify-between ${
        notice.tone === 'caution'
          ? 'rounded-control border border-state-caution/35 bg-state-caution/10 p-3'
          : ''
      }`}
    >
      <p className="flex min-w-0 flex-col gap-1">
        {notice.tone === 'caution' && (
          <ConnectionStateMark
            kind="expired"
            label={connectionState === 'expired' ? 'Session expired' : 'Reconnect needed'}
            className="text-xs"
          />
        )}
        <span className="text-text-secondary">{notice.message}</span>
      </p>
      {!chipOwnsReconnect && (
        <ProviderConnectAction
          provider={selectedProvider}
          label={`${notice.action === 'reconnect' ? 'Reconnect' : 'Connect'} ${providerLabel(selectedProvider)}`}
          flow={flow}
        />
      )}
    </div>
  );
  const savedPlaylists = playlists[selectedProvider] ?? null;
  const likedTracks = likes[selectedProvider] ?? null;
  const likesHasMore = Boolean(likesNext[selectedProvider]);
  const loadingMoreLikes = Boolean(likesLoadingMore[selectedProvider]);
  const loadMoreLikesError = likesMoreError[selectedProvider] ?? null;
  const songQuery = libraryQuery.trim();
  const songSearch = songSearchMode(selectedProvider);
  const serverSearchState = serverSongSearchState({
    onSongs: libraryKind === 'songs',
    mode: songSearch,
    query: songQuery,
    connected: connectionState === 'connected',
    result:
      librarySearch?.provider === selectedProvider
        ? { query: librarySearch.query, failed: librarySearch.failed }
        : null,
  });
  const serverSearchResults =
    serverSearchState === 'done' ? (librarySearch?.results ?? null) : null;
  const playlistRows = orderLibrary(
    filterLibrary(
      savedPlaylists ?? [],
      libraryQuery,
      (row) => `${row.name} ${row.ownerName ?? ''}`,
    ),
    sort,
    (row) => row.name,
  );
  const songRows = orderLibrary(
    serverSearchResults
      ? serverSearchResults
      : filterLibrary(likedTracks ?? [], libraryQuery, (row) => `${row.title} ${row.artist}`),
    sort,
    (row) => row.title,
  );
  const songAutoLoadBudget = {
    loadedCount: likedTracks?.length ?? 0,
    bound: songAutoLoadNow.bound,
    requests: songAutoLoadNow.requests,
  };
  // A search is still reaching songs, so "No matches." would be premature.
  const songSearchInFlight =
    serverSearchState === 'pending' ||
    (songSearch === 'loaded' &&
      libraryKind === 'songs' &&
      songQuery !== '' &&
      likesHasMore &&
      !loadMoreLikesError &&
      (loadingMoreLikes || !songSearchAutoLoadSpent(songAutoLoadBudget)));
  const songNote =
    songSearch === 'server'
      ? serverSearchState === 'pending'
        ? `Searching your ${label} library…`
        : serverSearchState === 'failed'
          ? `Couldn’t search your whole ${label} library. Showing matches in loaded songs.`
          : null
      : songSearchScopeNote({
          ...songAutoLoadBudget,
          query: songQuery,
          hasMore: likesHasMore,
          loading: loadingMoreLikes,
          failed: Boolean(loadMoreLikesError),
        });
  const chooseProvider = (provider: Provider) => {
    if (flow.operation && flow.operation.provider !== provider) flow.cancel();
    if (provider !== selectedProvider) {
      typeTouched.current = false;
      setLibraryQuery('');
      setLibraryKind(libraryKindFor(provider));
    }
    setSelectedProvider(provider);
  };
  const chooseKind = (kind: MusicLibraryKind) => {
    typeTouched.current = true;
    setLibraryKind(kind);
    setLibraryQuery('');
  };

  return (
    <section data-music-layout="stack" className="flex w-full min-w-0 flex-col gap-4 lg:gap-5">
      <header className="flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="rf-eyebrow">Music</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl">
            Your library
          </h2>
        </div>
        <button
          type="button"
          onClick={onOpenConnections}
          disabled={connectBusy}
          className="min-h-11 shrink-0 rounded-control px-2 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 rf-focus-ring disabled:opacity-50"
        >
          Manage connections
        </button>
      </header>

      <ProviderConnectionsLoadState
        status={connectionsStatus}
        hasKnownConnections={connections.length > 0}
        onRetry={retryConnections}
      />

      <div
        data-music-switcher=""
        role="group"
        aria-label="Music services"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        {PROVIDER_ORDER.map((provider) => {
          const row = connections.find((item) => item.provider === provider);
          const state = providerConnectionState(provider, row, Date.now());
          const chip = musicChipBadge({
            fetchStatus: connectionsStatus,
            connectionState: state,
            libraryFailure: musicLibraryFailure([playlistsError[provider], likesError[provider]]),
          });
          const selected = selectedProvider === provider;
          const name = providerLabel(provider);
          const shell = `flex min-h-11 w-full items-center gap-2 rounded-pill border sm:w-auto sm:min-w-[9.5rem] sm:flex-1 ${
            selected
              ? 'border-border-strong bg-bg-overlay font-semibold'
              : 'border-border-subtle bg-bg-base font-medium'
          }`;
          if (musicChipOffersReconnect(chip.kind)) {
            const own = flow.operation?.provider === provider ? flow.operation : null;
            const busy = !!own && !own.error && own.stage !== 'ready';
            return (
              <div
                key={provider}
                className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:min-w-[9.5rem] sm:flex-1"
              >
                <div
                  className={`flex min-h-11 w-full items-center gap-2 rounded-pill border ${
                    selected
                      ? 'border-border-strong bg-bg-overlay font-semibold'
                      : 'border-border-subtle bg-bg-base font-medium'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={name}
                    onClick={() => chooseProvider(provider)}
                    className="flex min-h-11 min-w-0 flex-1 items-center px-3 text-left font-ui text-sm text-text-primary rf-focus-ring"
                  >
                    <span className="truncate">{name}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Reconnect ${name}`}
                    disabled={busy}
                    onClick={() => {
                      chooseProvider(provider);
                      void flow.start(provider);
                    }}
                    className="inline-flex min-h-11 shrink-0 items-center px-3 rf-focus-ring disabled:opacity-50"
                  >
                    <ConnectionStateMark
                      kind="expired"
                      label={busy ? 'Reconnecting…' : 'Reconnect'}
                      className="shrink-0 font-data text-[10px]"
                    />
                  </button>
                </div>
                {own?.error && (
                  <p role="alert" className="px-1 font-ui text-xs text-state-danger">
                    {own.error}
                  </p>
                )}
              </div>
            );
          }
          return (
            <button
              key={provider}
              type="button"
              aria-pressed={selected}
              aria-label={`${name}, ${chip.label}`}
              onClick={() => chooseProvider(provider)}
              className={`${shell} justify-between px-3 rf-focus-ring`}
            >
              <span className="truncate font-ui text-sm text-text-primary">{name}</span>
              <ConnectionStateMark
                kind={chip.kind}
                label={chip.label}
                className="shrink-0 font-data text-[10px]"
              />
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Library" className="flex flex-wrap gap-2">
        {musicLibraryKinds(selectedProvider).map((kind) => {
          const kindLabel =
            kind === 'playlists' ? 'Playlists' : kind === 'songs' ? 'Songs' : 'Catalog';
          const selected = libraryKind === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={selected}
              onClick={() => chooseKind(kind)}
              className={`min-h-11 rounded-pill border px-3 font-ui text-sm rf-focus-ring ${
                selected
                  ? 'border-border-strong bg-bg-overlay font-semibold text-text-primary'
                  : 'border-border-subtle font-medium text-text-secondary'
              }`}
            >
              {kindLabel}
            </button>
          );
        })}
      </div>

      {libraryKind !== 'catalog' &&
        connectionState === 'connected' &&
        !(libraryKind === 'playlists'
          ? playlistsError[selectedProvider]
          : likesError[selectedProvider]) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label
              htmlFor="music-library-search"
              className="block min-w-0 flex-1 font-ui text-xs font-semibold text-text-secondary"
            >
              {libraryKind === 'playlists' ? 'Search playlists' : 'Search songs'}
              <input
                id="music-library-search"
                type="search"
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-control border border-interactive/30 bg-bg-base px-3 font-ui text-sm text-text-primary rf-focus-ring sm:rounded-pill"
              />
            </label>
            <div role="group" aria-label="Sort" className="flex gap-2">
              {LIBRARY_SORT_OPTIONS.map(([value, sortLabel]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={sort === value}
                  onClick={() => setSort(value)}
                  className={`min-h-11 rounded-pill border px-3 font-ui text-sm rf-focus-ring ${
                    sort === value
                      ? 'border-border-strong bg-bg-overlay font-semibold text-text-primary'
                      : 'border-border-subtle font-medium text-text-secondary'
                  }`}
                >
                  {sortLabel}
                </button>
              ))}
            </div>
          </div>
        )}

      {libraryKind !== 'catalog' && noticeBlock}

      {libraryKind === 'playlists' ? (
        <PlaylistShelf
          label={label}
          loading={Boolean(playlistsLoading[selectedProvider])}
          error={playlistsError[selectedProvider] ?? null}
          connected={connectionState === 'connected'}
          statusMark={noticeBlock ? null : statusMark}
          onRetry={retryConnections}
          rows={playlistRows}
          filtered={libraryQuery.trim() !== ''}
          onOpen={(playlistId) => {
            if (!savedPlaylists?.length) return;
            onOpenPlaylist(selectedProvider, savedPlaylists, playlistId);
          }}
        />
      ) : libraryKind === 'songs' ? (
        <SongShelf
          label={label}
          loading={Boolean(likesLoading[selectedProvider])}
          error={likesError[selectedProvider] ?? null}
          connected={connectionState === 'connected'}
          statusMark={noticeBlock ? null : statusMark}
          onRetry={retryConnections}
          rows={songRows}
          filtered={libraryQuery.trim() !== ''}
          searching={songSearchInFlight}
          note={songNote}
          loadMore={
            // A failed Apple search falls back to loaded songs, so Load more stays.
            likesHasMore && serverSearchState !== 'pending' && serverSearchState !== 'done'
              ? {
                  label: songQuery && songSearch === 'loaded' ? 'Keep loading' : 'Load more songs',
                  loading: loadingMoreLikes,
                  error: loadMoreLikesError,
                  onLoadMore: () => {
                    if (songQuery && songSearch === 'loaded') {
                      // Another round: 1,000 more songs or 5 more requests (this one counts).
                      const next = {
                        key: songAutoLoadKey,
                        bound: (likedTracks?.length ?? 0) + SONG_SEARCH_AUTOLOAD_BOUND,
                        requests: 1,
                      };
                      songAutoLoadRef.current = next;
                      setSongAutoLoad(next);
                    }
                    void loadMoreLikes(selectedProvider);
                  },
                }
              : null
          }
          onCreateClass={
            likedTracks && likedTracks.length > 0
              ? () => onBrowseLikes(selectedProvider, likedTracks, likesHasMore)
              : null
          }
        />
      ) : (
        <section className="min-w-0">
          <label
            htmlFor="music-catalog-search"
            className="font-ui text-xs font-semibold text-text-secondary"
          >
            Search {label} catalog
          </label>
          <input
            id="music-catalog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Track, artist, or remix on ${label}…`}
            className="mt-2 min-h-11 w-full rounded-control border border-interactive/30 bg-bg-base px-3 font-ui text-sm text-text-primary rf-focus-ring sm:rounded-pill"
          />

          {noticeBlock && <div className="mt-3">{noticeBlock}</div>}

          <p role="status" className="sr-only">
            {searching
              ? `Searching ${label}…`
              : results
                ? `${results.length} ${results.length === 1 ? 'result' : 'results'} on ${label}.`
                : ''}
          </p>

          {searchError && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p role="alert" className="font-ui text-sm text-state-danger">
                {searchError}
              </p>
              {results === null && query.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => setSearchRetryKey((key) => key + 1)}
                  className="min-h-11 rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {searching && results === null && query.trim() !== '' ? (
            <p className="mt-3 font-ui text-sm text-text-tertiary">Searching {label}…</p>
          ) : results && results.length === 0 ? (
            <p className="mt-3 font-ui text-sm font-semibold text-text-primary">No matches yet.</p>
          ) : results && results.length > 0 ? (
            <div className="mt-3">
              {selectedTracks.length > 0 && (
                <label className="mb-3 block font-ui text-xs font-semibold text-text-secondary">
                  Class name
                  <input
                    type="text"
                    value={classTitle}
                    onChange={(event) => setClassTitle(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-control border border-interactive/30 bg-bg-base px-3 font-ui text-sm text-text-primary rf-focus-ring sm:max-w-sm sm:rounded-pill"
                  />
                </label>
              )}
              <SourceList
                tracks={results}
                ariaLabel={`${label} catalog results`}
                action={{
                  kind: 'selection',
                  selectedKeys,
                  selectedTracks,
                  onToggle: toggleTrack,
                  tray: {
                    title: classTitle,
                    template,
                    templateControl: (
                      <div
                        role="group"
                        aria-label="New class template"
                        className="flex min-w-0 gap-1"
                      >
                        {CREATE_TEMPLATE_OPTIONS.map(({ value, label: optionLabel }) =>
                          value ? (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={template === value}
                              onClick={() => setTemplate(value)}
                              className={`min-h-11 rounded-control border px-2 font-ui text-xs rf-focus-ring ${
                                template === value
                                  ? 'border-interactive bg-interactive/15 text-text-primary'
                                  : 'border-border-subtle text-text-secondary'
                              }`}
                            >
                              {optionLabel}
                            </button>
                          ) : null,
                        )}
                      </div>
                    ),
                    primaryLabel: 'Start class',
                    primaryBusyLabel: 'Starting…',
                    primaryBusy: creating,
                    onPrimary: () => void startClass(),
                  },
                }}
              />
            </div>
          ) : null}
        </section>
      )}
    </section>
  );
}

function ShelfFailureNotice({
  label,
  error,
  fallback,
  onRetry,
}: {
  label: string;
  error: ShelfFailure;
  fallback: string;
  onRetry: () => void;
}) {
  const allowlist = error.code === SPOTIFY_ALLOWLIST_CODE;
  const quota = error.code === PROVIDER_QUOTA_CODE;
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-control border border-state-caution/35 bg-state-caution/10 p-3 font-ui text-sm"
    >
      <ConnectionStateMark
        kind="expired"
        label={allowlist ? 'Not allowlisted' : quota ? 'Limit reached' : fallback}
        className="text-xs"
      />
      {libraryFailureExplainsItself(error.code) && (
        <p className="text-text-secondary">{error.message}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 rf-focus-ring"
      >
        Retry {label} library
      </button>
    </div>
  );
}

function PlaylistShelf({
  label,
  loading,
  error,
  connected,
  statusMark,
  onRetry,
  rows,
  filtered,
  onOpen,
}: {
  label: string;
  loading: boolean;
  error: ShelfFailure | null;
  connected: boolean;
  statusMark: { kind: ConnectionMarkKind; label: string } | null;
  onRetry: () => void;
  rows: ProviderPlaylistSummary[];
  filtered: boolean;
  onOpen: (playlistId: string) => void;
}) {
  if (!connected) {
    if (!statusMark) return null;
    return (
      <ConnectionStateMark
        kind={statusMark.kind}
        label={statusMark.label}
        className="font-ui text-sm"
      />
    );
  }
  if (loading && rows.length === 0) {
    return (
      <p role="status" className="font-ui text-sm text-text-tertiary">
        Loading playlists…
      </p>
    );
  }
  if (error) {
    return (
      <ShelfFailureNotice
        label={label}
        error={error}
        fallback="Playlists unavailable"
        onRetry={onRetry}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <p role="status" className="font-ui text-sm text-text-secondary">
        {filtered ? 'No matches.' : 'No saved playlists'}
      </p>
    );
  }
  return (
    <ul aria-label={`${label} playlists`} className="flex flex-col gap-1">
      {rows.map((playlist, index) => {
        const meta = playlistMetaLine(playlist.ownerName, playlist.trackCount, label);
        const metaId = `playlist-meta-${index}`;
        return (
          <li
            key={playlist.playlistId}
            data-build-class-slot="playlist"
            className="flex items-center"
          >
            {/* Build a class (pull request C) mounts as the next sibling of this row. */}
            <button
              type="button"
              aria-label={`Open ${playlist.name}`}
              aria-describedby={metaId}
              onClick={() => onOpen(playlist.playlistId)}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-control px-1 text-left rf-focus-ring"
            >
              {playlist.coverImageUrl ? (
                <img
                  src={playlist.coverImageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-11 max-h-11 max-w-11 shrink-0 rounded-card object-cover"
                />
              ) : (
                <TrackArt
                  url={null}
                  identity={playlist.name}
                  size={44}
                  className="max-h-11 max-w-11"
                />
              )}
              <span className="min-w-0">
                <span className="block truncate font-ui text-sm font-semibold text-text-primary">
                  {playlist.name}
                </span>
                <span id={metaId} className="block truncate font-ui text-xs text-text-secondary">
                  {meta}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SongShelf({
  label,
  loading,
  error,
  connected,
  statusMark,
  onRetry,
  rows,
  filtered,
  searching = false,
  note = null,
  loadMore = null,
  onCreateClass,
}: {
  label: string;
  loading: boolean;
  error: ShelfFailure | null;
  connected: boolean;
  statusMark: { kind: ConnectionMarkKind; label: string } | null;
  onRetry: () => void;
  rows: TrackSearchResult[];
  filtered: boolean;
  /** A library search is in flight, so "No matches." would be premature. */
  searching?: boolean;
  /** What a search covered, or that it is still loading (RF-132). */
  note?: string | null;
  /** The next page of liked songs, when the provider has more (RF-132). */
  loadMore?: {
    label: string;
    loading: boolean;
    error: string | null;
    onLoadMore: () => void;
  } | null;
  onCreateClass: (() => void) | null;
}) {
  const footer =
    note || loadMore ? (
      <div className="flex flex-col items-start gap-2">
        {note && (
          <p role="status" className="font-ui text-xs text-text-secondary">
            {note}
          </p>
        )}
        {loadMore?.error && (
          <p role="alert" className="font-ui text-xs text-state-danger">
            Couldn’t load more songs: {loadMore.error}
          </p>
        )}
        {loadMore && (
          <button
            type="button"
            onClick={loadMore.onLoadMore}
            disabled={loadMore.loading}
            aria-busy={loadMore.loading}
            className="min-h-11 rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring disabled:opacity-50"
          >
            {loadMore.loading ? 'Loading more songs…' : loadMore.label}
          </button>
        )}
      </div>
    ) : null;
  if (!connected) {
    if (!statusMark) return null;
    return (
      <ConnectionStateMark
        kind={statusMark.kind}
        label={statusMark.label}
        className="font-ui text-sm"
      />
    );
  }
  if (loading && rows.length === 0) {
    return (
      <p role="status" className="font-ui text-sm text-text-tertiary">
        Loading songs…
      </p>
    );
  }
  if (error) {
    return (
      <ShelfFailureNotice
        label={label}
        error={error}
        fallback="Likes unavailable"
        onRetry={onRetry}
      />
    );
  }
  if (rows.length === 0) {
    if (searching) return footer;
    return (
      <div className="flex flex-col gap-2">
        <p role="status" className="font-ui text-sm text-text-secondary">
          {filtered ? 'No matches.' : 'No liked songs'}
        </p>
        {footer}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {onCreateClass && (
        <button
          type="button"
          onClick={onCreateClass}
          className="min-h-11 self-start rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
        >
          Create class from liked songs
        </button>
      )}
      <ul aria-label="Liked songs" className="flex flex-col gap-1">
        {rows.map((track) => (
          <li
            key={`${track.provider}:${track.providerTrackId}`}
            data-build-class-slot="song"
            className="flex min-h-11 items-center gap-3 px-1"
          >
            {/* Build a class (pull request C) mounts at the end of this row. */}
            <TrackArt
              url={track.albumArtUrl}
              identity={`${track.title}:${track.artist}`}
              size={44}
              className="max-h-11 max-w-11"
            />
            <span className="min-w-0">
              <span className="block truncate font-ui text-sm font-semibold text-text-primary">
                {track.title}
              </span>
              <span className="block truncate font-ui text-xs text-text-secondary">
                {songMetaLine(track.artist, track.durationMs)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {footer}
    </div>
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

  // The queue ranks by the same rule Classes does, from the same module: a class
  // that leads the Classes shelf leads here too, and the choice is one session
  // setting shared across both surfaces. Ranking waits for every payload so cards
  // do not reshuffle under the instructor as each fetch lands.
  const ordered = allResolved
    ? orderClassesBy(ordering, candidates, (cls) => classNextStep(payloads[cls.id]))
    : candidates;

  const liveStatus =
    status !== 'ready'
      ? ''
      : candidates.length === 0
        ? 'No classes with tracks yet.'
        : !allResolved
          ? `Checking readiness for ${candidates.length} ${candidates.length === 1 ? 'class' : 'classes'}…`
          : `${summary.runnable} of ${candidates.length} ${candidates.length === 1 ? 'class' : 'classes'} ready for Live.`;

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
    </section>
  );
}

/**
 * One class in the Live queue. A short row: name, shape, and the next action.
 * Full readiness stays one disclosure away. "Run live" uses the same duration
 * gate as Live Mode — a blocked class names the fix, and `aria-describedby`
 * points at `runBlockedMessage`.
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
  // The same next-step derivation Classes uses. A duration-blocked class gets the
  // verb that fixes it rather than a disabled "Preflight" it can never satisfy —
  // the gate is unchanged, the dead-end control is what goes.
  const step = classNextStep(state);
  const gapCount = state?.status === 'ready' ? state.readiness.attentionCount : 0;

  const gapsLabel =
    gapCount === 0 ? 'Details' : `${gapCount} ${gapCount === 1 ? 'thing' : 'things'} left`;

  return (
    <article
      className="min-w-0 rounded-card border border-border-subtle bg-bg-raised p-3"
      aria-busy={state === undefined || state.status === 'loading'}
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
          {(state === undefined || state.status === 'loading') && (
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
            className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring"
          >
            Preflight
          </button>
        ) : state?.status === 'ready' ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${step.action} — ${cls.title}`}
            aria-describedby={blockReason ? reasonId : undefined}
            className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring"
          >
            {step.action}
          </button>
        ) : state?.status === 'error' ? (
          <button
            type="button"
            onClick={onRetry}
            aria-label={`Retry readiness — ${cls.title}`}
            className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring"
          >
            Retry
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

      {state?.status === 'error' && (
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
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [connectionsStatus, setConnectionsStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [connectionsLoadError, setConnectionsLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setProfileStatus('loading');
    setProfileLoadError(null);
    void getMe()
      .then((user) => {
        if (!alive) return;
        setProfile(user);
        setDisplayName(user.displayName ?? '');
        setImageUrl(user.imageUrl ?? '');
        setProfileStatus('ready');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setProfileLoadError(errMessage(e));
        setProfileStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [profileAttempt]);

  useEffect(() => {
    let alive = true;
    setConnectionsStatus('loading');
    setConnectionsLoadError(null);
    void listConnections()
      .then((rows) => {
        if (!alive) return;
        setConnections(rows);
        setConnectionsStatus('ready');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setConnectionsLoadError(errMessage(e));
        setConnectionsStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [connectionAttempt, connectionRevision]);

  useEffect(() => {
    if (saveError) saveErrorRef.current?.focus();
  }, [saveError]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
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
      setSaveError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const profileTrusted = profile !== null;
  const connectionFreshness =
    connectionsStatus === 'ready'
      ? 'verified'
      : connectionsStatus === 'loading'
        ? 'checking'
        : 'unverified';

  return (
    <section className="grid w-full min-w-0 gap-5 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start">
      <aside className="min-w-0 border-b border-border-subtle pb-4 xl:sticky xl:top-6 xl:border-r xl:border-b-0 xl:pr-4 xl:pb-0">
        <p className="rf-eyebrow">Account</p>
        <nav className="mt-3 flex max-w-full gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
          {['Profile', 'Music connections', 'Security'].map((item) => (
            <a
              key={item}
              href={`#account-${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex min-h-11 min-w-0 shrink-0 items-center rounded-control px-3 font-ui text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary xl:w-full"
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <div className="w-full min-w-0 overflow-hidden rounded-panel border border-border-subtle bg-bg-raised">
        <header className="border-b border-border-subtle p-5 sm:p-6">
          <p className="rf-eyebrow">Personal workspace</p>
          <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words font-display text-3xl font-semibold text-text-primary">
                {profile?.displayName ?? profileName}
              </h2>
              {profileStatus === 'loading' ? (
                <LoadingSkeleton label="Loading profile" shape="line" className="mt-2" />
              ) : (
                <p className="mt-1 break-all font-ui text-xs text-text-tertiary">
                  {profile?.email ?? 'Profile details unavailable'}
                </p>
              )}
            </div>
            {/* This measures whether the profile payload loaded — nothing here
                verifies an identity or an email address (P1-05). A loaded profile
                needs no mark; only a failed read does. */}
            {profileStatus === 'error' && (
              <StatusLabel kind="unavailable" label="Profile unavailable" />
            )}
          </div>
        </header>

        {(profileStatus === 'error' || connectionsStatus === 'error') && (
          <div className="border-b border-border-subtle p-4 sm:p-5">
            <RecoveryState
              kind="unavailable"
              compact
              role="alert"
              title="Some account status is unavailable"
              event={
                profileStatus === 'error' && connectionsStatus === 'error'
                  ? `Ritmo could not read profile or music-connection status. Reference ${errorReference('ACC', profileLoadError ?? connectionsLoadError)}.`
                  : profileStatus === 'error'
                    ? `Ritmo could not read the profile. Reference ${errorReference('ACC', profileLoadError)}.`
                    : `Ritmo could not read music connections. Reference ${errorReference('CONN', connectionsLoadError)}.`
              }
              safety="No profile or provider setting changed. Loaded sections remain usable; edits are paused and provider capabilities are marked unverified."
              primaryAction={
                <button
                  type="button"
                  onClick={() => {
                    if (profileStatus === 'error') setProfileAttempt((attempt) => attempt + 1);
                    if (connectionsStatus === 'error')
                      setConnectionAttempt((attempt) => attempt + 1);
                  }}
                  className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
                >
                  Check status again
                </button>
              }
              secondaryAction={
                <button
                  type="button"
                  onClick={onOpenConnections}
                  className="min-h-11 rounded-control border border-interactive/35 px-4 font-ui text-sm font-semibold text-interactive sm:rounded-pill"
                >
                  Review music connections
                </button>
              }
            />
          </div>
        )}

        <section
          id="account-profile"
          className="rf-anchor-offset min-w-0 border-b border-border-subtle p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Profile</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-text-primary">
                Identity
              </h3>
            </div>
            {profileStatus === 'error' && (
              <StatusLabel kind="disabled" label="Edits paused until the profile loads" />
            )}
          </div>
          {notice && (
            <p className="mt-3 font-ui text-sm text-state-positive" role="status">
              {notice}
            </p>
          )}
          {saveError && (
            <div
              ref={saveErrorRef}
              tabIndex={-1}
              className="mt-3 rounded-control border border-state-danger/30 bg-state-danger/5 p-3 font-ui text-sm text-state-danger outline-none"
              role="alert"
            >
              <strong className="block text-text-primary">Profile was not changed</strong>
              <span>{saveError}</span>
              <span className="mt-1 block text-xs text-text-secondary">
                Your entered values are still in the form.
              </span>
            </div>
          )}

          <form
            className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"
            onSubmit={submit}
            aria-busy={saving}
          >
            <div className="flex min-w-0 flex-col gap-4">
              <label className="flex min-w-0 flex-col gap-1.5 font-ui text-sm text-text-secondary">
                Display name
                <input
                  className="min-h-11 w-full min-w-0 rounded-control border border-border-subtle bg-bg-base px-3 text-text-primary outline-none focus:border-interactive"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Instructor name"
                  maxLength={200}
                  autoComplete="name"
                  disabled={!profileTrusted}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 font-ui text-sm text-text-secondary">
                Profile image URL
                <input
                  className="min-h-11 w-full min-w-0 rounded-control border border-border-subtle bg-bg-base px-3 text-text-primary outline-none focus:border-interactive"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  inputMode="url"
                  disabled={!profileTrusted}
                />
              </label>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  className="min-h-11 rounded-control border border-border-subtle px-4 font-ui text-sm text-text-secondary transition-colors hover:text-text-primary sm:rounded-pill"
                  onClick={() => void signOutByUser()}
                >
                  Sign out
                </button>
                <button
                  type="submit"
                  disabled={saving || !profileTrusted}
                  className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:rounded-pill"
                >
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>
            <div className="min-w-0 rounded-card border border-border-subtle bg-bg-base p-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-bg-raised font-display text-xl font-semibold text-text-primary">
                {profile?.imageUrl ? (
                  <img
                    src={profile.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (profile?.displayName ?? profile?.email ?? profileName).slice(0, 1).toUpperCase()
                )}
              </div>
              <p className="mt-3 truncate font-ui text-sm font-semibold text-text-primary">
                {profile?.displayName ?? profileName ?? 'Unnamed instructor'}
              </p>
              {profileStatus !== 'loading' && (
                <p className="break-all font-ui text-xs text-text-tertiary">
                  {profile?.email ?? 'Profile details unavailable'}
                </p>
              )}
            </div>
          </form>
        </section>

        <section
          id="account-music-connections"
          className="rf-anchor-offset min-w-0 border-b border-border-subtle p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                Music connections
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-text-primary">
                Provider accounts
              </h3>
              <p className="mt-1 font-ui text-xs leading-5 text-text-tertiary">
                Provider audio and authorization remain with the music service. Catalog, library,
                and playback are separate capabilities.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenConnections}
              className="min-h-11 rounded-control border border-interactive/35 px-4 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 sm:rounded-pill"
            >
              Manage
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            {PROVIDER_ORDER.map((provider) => {
              const connection = connections?.find((row) => row.provider === provider);
              const truth = providerCapabilityTruth(
                provider,
                connection,
                Date.now(),
                connectionFreshness,
              );
              const statusMark = accountConnectionMark(
                connectionsStatus,
                truth.connectionState,
                Boolean(connection),
              );
              return (
                <article
                  key={provider}
                  className="rounded-card border border-border-subtle bg-bg-base p-4"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-ui text-sm font-semibold text-text-primary">
                        {providerLabel(provider)}
                      </p>
                      {connectionsStatus === 'error' && (
                        <p className="mt-1 font-ui text-xs text-text-tertiary">
                          Current account authorization could not be verified.
                        </p>
                      )}
                    </div>
                    <ConnectionStateMark
                      kind={statusMark.kind}
                      label={statusMark.label}
                      className="shrink-0 font-ui text-xs"
                    />
                  </div>
                  <ProviderCapabilityLedger provider={provider} truth={truth} className="mt-3" />
                </article>
              );
            })}
          </div>
        </section>

        <section id="account-security" className="rf-anchor-offset p-5 sm:p-6">
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Security</p>
          <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
            Email, password, and social sign-in remain with the active sign-in provider. Sign in
            with Apple is separate from an Apple Music connection.
          </p>
          <a
            href="/privacy"
            className="mt-3 inline-flex min-h-11 items-center rounded-control border border-interactive/35 px-4 font-ui text-sm font-semibold text-interactive hover:bg-interactive/10 rf-focus-ring sm:rounded-pill"
          >
            Privacy and data notice
          </a>
        </section>
      </div>
    </section>
  );
}

export function ProviderShelfCard({
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
      <ProviderCapabilityLedger provider={provider} truth={truth} className="mt-4 border-y py-3" />
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
 * " · N tracks", or nothing at all when the provider never told us. Apple Music's
 * library-playlist attributes carry no count, so a `0` fallback made all 70 saved
 * playlists claim "0 tracks" directly above their real tracks (P1-05: never assert
 * what the system has not verified).
 */
function playlistCountLabel(trackCount: number | null): string {
  if (trackCount == null) return '';
  return ` · ${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`;
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
  initialPlaylistId = null,
  onClose,
  onCreateClass,
}: {
  provider: Provider;
  playlists: ProviderPlaylistSummary[];
  /** Open this playlist's tracks immediately. The library row already listed it. */
  initialPlaylistId?: string | null;
  onClose: () => void;
  onCreateClass: (
    provider: Provider,
    playlistId: string,
    playlistName: string,
    template: ClassTemplate,
    tracks: TrackSearchResult[],
  ) => Promise<void>;
}) {
  const [template, setTemplate] = useState<ClassTemplate>('cycle');
  const [selectedPlaylist, setSelectedPlaylist] = useState<ProviderPlaylistSummary | null>(null);
  const [tracks, setTracks] = useState<TrackSearchResult[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const label = providerLabel(provider);

  const openPlaylist = useCallback(
    async (playlist: ProviderPlaylistSummary) => {
      setSelectedPlaylist(playlist);
      setTracks(null);
      setLoadingTracks(true);
      setRowError(null);
      try {
        setTracks(await listPlaylistTracks(provider, playlist.playlistId));
      } catch (e) {
        setRowError(errMessage(e));
      } finally {
        setLoadingTracks(false);
      }
    },
    [provider],
  );

  const openedInitial = useRef(false);
  useEffect(() => {
    if (openedInitial.current || !initialPlaylistId) return;
    const playlist = playlists.find((row) => row.playlistId === initialPlaylistId);
    if (!playlist) return;
    openedInitial.current = true;
    void openPlaylist(playlist);
  }, [initialPlaylistId, openPlaylist, playlists]);

  const submitTracks = async (playlist: ProviderPlaylistSummary, chosen: TrackSearchResult[]) => {
    setCreatingId(playlist.playlistId);
    setPicking(false);
    setRowError(null);
    try {
      await onCreateClass(provider, playlist.playlistId, playlist.name, template, chosen);
    } catch (e) {
      setRowError(errMessage(e));
      setCreatingId(null);
    }
  };

  const handleCreate = async (playlist: ProviderPlaylistSummary) => {
    if (!tracks?.length) {
      setRowError('No tracks found in this playlist. Choose another playlist to start a class.');
      return;
    }
    if (tracks.length > PLAYLIST_SONG_BLOCK_CAP) {
      setPicking(true);
      return;
    }
    await submitTracks(playlist, tracks);
  };

  if (picking && selectedPlaylist && tracks && tracks.length > PLAYLIST_SONG_BLOCK_CAP) {
    return (
      <PlaylistSongPicker
        mode="create"
        items={tracks.map((track, index) => ({
          id: String(index),
          position: index + 1,
          title: track.title,
          artist: track.artist,
          durationMs: track.durationMs,
        }))}
        onCancel={() => setPicking(false)}
        onConfirm={(ids) => {
          const chosen = ids
            .map((id) => tracks[Number(id)])
            .filter((track): track is TrackSearchResult => track != null);
          void submitTracks(selectedPlaylist, chosen);
        }}
      />
    );
  }

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
              {selectedPlaylist.ownerName ?? label}
              {playlistCountLabel(selectedPlaylist.trackCount)}
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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p role="alert" className="font-ui text-sm text-state-danger">
            {rowError}
          </p>
          {selectedPlaylist && tracks == null && !loadingTracks && (
            <button
              type="button"
              onClick={() => void openPlaylist(selectedPlaylist)}
              className="min-h-11 rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {selectedPlaylist ? (
        <div className="flex flex-col gap-3">
          <p className="font-ui text-xs text-text-secondary">
            The playlist becomes the class blocks. The discipline sets the movement language.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPlaylist(null);
                setTracks(null);
                setRowError(null);
                setPicking(false);
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
                    <TrackArt
                      url={track.albumArtUrl}
                      identity={`${track.title}:${track.artist}`}
                      size={40}
                    />
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
            ) : tracks && tracks.length === 0 ? (
              <p className="p-3 font-ui text-sm text-text-tertiary">
                No tracks found in this playlist.
              </p>
            ) : null}
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
                  {playlist.ownerName ?? label}
                  {playlistCountLabel(playlist.trackCount)}
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
  hasMore = false,
  onClose,
  onCreateClass,
}: {
  provider: Provider;
  tracks: TrackSearchResult[];
  /** More liked songs exist than were loaded: say the class draws from a subset. */
  hasMore?: boolean;
  onClose: () => void;
  onCreateClass: (
    tracks: TrackSearchResult[],
    title: string,
    template: ClassTemplate,
    songBlocks?: boolean,
  ) => Promise<void>;
}) {
  const label = providerLabel(provider);
  const subsetNote = likesSubsetNote(tracks.length, hasMore);
  const [template, setTemplate] = useState<ClassTemplate>('cycle');
  const [title, setTitle] = useState(`${label} likes`);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const submit = async (chosen: TrackSearchResult[]) => {
    if (!title.trim() || creating) return;
    setPicking(false);
    setCreating(true);
    setError(null);
    try {
      await onCreateClass(chosen, title.trim(), template, true);
    } catch (e) {
      setError(errMessage(e));
      setCreating(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || creating || tracks.length === 0) return;
    if (tracks.length > PLAYLIST_SONG_BLOCK_CAP) {
      setPicking(true);
      return;
    }
    await submit(tracks);
  };

  if (picking) {
    return (
      <PlaylistSongPicker
        mode="create"
        items={tracks.map((track, index) => ({
          id: String(index),
          position: index + 1,
          title: track.title,
          artist: track.artist,
          durationMs: track.durationMs,
        }))}
        onCancel={() => setPicking(false)}
        onConfirm={(ids) => {
          const chosen = ids
            .map((id) => tracks[Number(id)])
            .filter((track): track is TrackSearchResult => track != null);
          void submit(chosen);
        }}
      />
    );
  }

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

      {subsetNote && (
        <p role="note" className="mb-3 font-ui text-xs text-text-secondary">
          {subsetNote}
        </p>
      )}

      <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-ui text-xs text-text-secondary">
          {tracks.length > PLAYLIST_SONG_BLOCK_CAP
            ? 'Choose up to 15 songs. Liked songs become the class blocks.'
            : `${tracks.length} liked ${tracks.length === 1 ? 'track' : 'tracks'} will become the class blocks.`}
        </p>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || !title.trim() || tracks.length === 0}
          aria-label={`Create class from ${tracks.length} liked tracks`}
          className="min-h-11 w-full rounded-pill rf-btn-primary px-3 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50 sm:w-auto sm:shrink-0"
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
            <TrackArt
              url={track.albumArtUrl}
              identity={`${track.title}:${track.artist}`}
              size={44}
            />
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
 * 09). Returns a fragment so both land as the two columns of the full-focus
 * builder. Mounted with `key={cls.id}` by the parent, so opening another
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
  onOpenConnections,
  connectionRevision,
  focusAddMusic,
  onFocusedAddMusic,
  onBackToClasses,
  onRetryDetails,
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
  /** Open centralized provider recovery without leaving the class builder. */
  onOpenConnections: () => void;
  /** Refresh picker connection truth after the recovery dialog changes it. */
  connectionRevision: number;
  /** A newly created empty class should land on its first useful action. */
  focusAddMusic: boolean;
  onFocusedAddMusic: () => void;
  /** Return from the full-focus builder to the Classes library. */
  onBackToClasses: () => void;
  /** Reload the whole class after its details failed to load. */
  onRetryDetails: () => void;
}) {
  // The selected track (by class_track id) drives the inspector.
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [classMusicMode, setClassMusicMode] = useState<'search' | 'playlist'>('search');
  const [classMusicModeKey, setClassMusicModeKey] = useState(0);
  const [assigningPlanBlock, setAssigningPlanBlock] = useState<PlanBlockTarget | null>(null);
  const assigningPlanBlockId = assigningPlanBlock?.id ?? null;
  const [assignStay, setAssignStay] = useState(false);
  const [planLead, setPlanLead] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const [planFailed, setPlanFailed] = useState(false);
  const [planBlocks, setPlanBlocks] = useState<ClassPlanBlock[]>([]);
  const currentAssigningPlanBlock = assigningPlanBlock
    ? (planBlocks.find((block) => block.id === assigningPlanBlock.id) ?? assigningPlanBlock)
    : null;
  const [hasPlanBlocks, setHasPlanBlocks] = useState(cls.scaffoldRecipeId != null);
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
  const showStackAddMusic = canEdit && cls.scaffoldRecipeId == null && !hasPlanBlocks;
  const playlistAppendNote =
    tracks.length > 0
      ? `Adds after your current ${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}`
      : null;
  const playlistAppendNoteId = `playlist-append-note-${cls.id}`;
  // No music and no teaching plan: Add a playlist is the empty-state call to
  // action. Otherwise it lives in the header, beside the append note.
  const playlistInEmptyState =
    canEdit && tracks.length === 0 && cls.scaffoldRecipeId == null && !hasPlanBlocks;
  const playlistInHeader = canEdit && !playlistInEmptyState;
  const playlistExpanded = sourceOpen && !assigningPlanBlock;
  const existingProviderTrackKeys = providerTrackKeysFromRun(payload?.tracks);

  useEffect(() => {
    setHasPlanBlocks(cls.scaffoldRecipeId != null);
  }, [cls.id, cls.scaffoldRecipeId]);

  // Focus return after removing a track: the inspector (holding the focused "Remove
  // track" button) unmounts on removal, so focus would fall to <body> and a keyboard
  // user would lose their place. We move it to the nearest remaining track's row
  // control, or the inspector placeholder when the class is now empty. A layout
  // effect applies it before paint (no flash of lost focus); the removed row is still
  // in the DOM at that point (the reload hasn't landed), so the anchor query resolves.
  const trackListRef = useRef<HTMLDivElement | null>(null);
  const trackSourceRef = useRef<HTMLElement | null>(null);
  const trackSourceToggleRef = useRef<HTMLButtonElement | null>(null);
  const addPlaylistRef = useRef<HTMLButtonElement>(null);
  const manualEntryRef = useRef<HTMLDetailsElement | null>(null);
  const inspectorPlaceholderRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!focusAddMusic || tracks.length !== 0) return;
    const addPlaylist = addPlaylistRef.current;
    if (!addPlaylist) return;
    addPlaylist.focus();
    onFocusedAddMusic();
  }, [focusAddMusic, tracks.length, onFocusedAddMusic, playlistInEmptyState, playlistInHeader]);
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
      onError(errMessage(e));
    }
  };

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null;
  const selectedEntry = payload?.tracks.find((e) => e.classTrackId === selectedTrackId) ?? null;

  /**
   * Readiness' choreography row is the one gap with no flagged track to jump
   * to, so it hands the instructor the act instead: open the first track and
   * put the caret in its cue box. The nonce re-arms the request when the track
   * is already selected.
   */
  const [cueEntryRequest, setCueEntryRequest] = useState(0);
  const startChoreography = () => {
    const first = payload?.tracks[0]?.classTrackId ?? tracks[0]?.id ?? null;
    if (!first) return;
    setSelectedTrackId(first);
    setCueEntryRequest((request) => request + 1);
  };

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

  const revealPlanDest = (blockId: string) => {
    document.getElementById(`plan-block-card-${blockId}`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'auto',
    });
  };

  useLayoutEffect(() => {
    if (!sourceOpen) return;
    const target = trackSourceRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), button, summary',
    );
    if (assigningPlanBlock) {
      // The job is adding a song. Search is the work; dest is already named.
      const search =
        trackSourceRef.current?.querySelector<HTMLInputElement>('input[type="search"]');
      (search ?? target)?.focus({ preventScroll: true });
      revealPlanDest(assigningPlanBlock.id);
      return;
    }
    target?.focus();
  }, [sourceOpen, assigningPlanBlock]);

  const focusPickerSearch = (blockId?: string) => {
    requestAnimationFrame(() => {
      const search =
        trackSourceRef.current?.querySelector<HTMLInputElement>('input[type="search"]');
      search?.focus({ preventScroll: true });
      const destId = blockId ?? assigningPlanBlock?.id;
      if (destId) {
        revealPlanDest(destId);
        return;
      }
      trackSourceRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
  };
  const openClassMusic = (mode: 'search' | 'playlist') => {
    setAssigningPlanBlock(null);
    setClassMusicMode(mode);
    setClassMusicModeKey((key) => key + 1);
    setSourceOpen(true);
  };
  const focusTrackSources = () => {
    if (sourceOpen && !assigningPlanBlock) return;
    openClassMusic('search');
  };
  const chooseMusicForBlock = (block: PlanBlockTarget, options?: { stay?: boolean }) => {
    setAssigningPlanBlock(block);
    setAssignStay(Boolean(options?.stay));
    setSourceOpen(true);
  };
  const closeMusicSources = () => {
    const closingPlanDest = assigningPlanBlock != null;
    setSourceOpen(false);
    setAssigningPlanBlock(null);
    if (closingPlanDest) return;
    requestAnimationFrame(() => trackSourceToggleRef.current?.focus());
  };
  const continuePlanAfterAdd = () => {
    let destId = assigningPlanBlock?.id;
    if (!assignStay && assigningPlanBlock) {
      const next = nextEmptyPlanBlock(planBlocks, tracks, payload, assigningPlanBlock.id);
      if (next) {
        setAssigningPlanBlock({
          id: next.id,
          label: next.label,
          position: next.position,
        });
        destId = next.id;
      }
    }
    focusPickerSearch(destId);
  };
  const handleMusicAdded = (id?: string) => {
    if (assigningPlanBlock) {
      if (id) onTrackAdded(id);
      else onTrackChanged();
      continuePlanAfterAdd();
      return;
    }
    if (id) {
      setSelectedTrackId(id);
      setPendingRowFocus(id);
      onTrackAdded(id);
    } else {
      onTrackChanged();
    }
    revealAssignedBlock(assigningPlanBlockId);
  };
  const revealAssignedBlock = (blockId: string | null) => {
    if (!blockId) return;
    requestAnimationFrame(() => {
      document.getElementById(`plan-block-card-${blockId}`)?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
    });
  };

  const toggleTrackSources = () => {
    if (sourceOpen && !assigningPlanBlock) {
      closeMusicSources();
      return;
    }
    openClassMusic('search');
  };

  const openManualEntry = () => {
    if (!sourceOpen || assigningPlanBlock) openClassMusic('search');
    requestAnimationFrame(() => {
      if (!manualEntryRef.current) return;
      manualEntryRef.current.open = true;
      manualEntryRef.current.querySelector<HTMLElement>('input')?.focus();
    });
  };

  const timelinePanelId = `builder-timeline-${cls.id}`;
  const sourcePanelId = `builder-source-${cls.id}`;

  const addPlaylistAction = canEdit
    ? {
        expanded: playlistExpanded,
        note: playlistAppendNote,
        noteId: playlistAppendNoteId,
        onClick: () => openClassMusic('playlist'),
        buttonRef: addPlaylistRef,
      }
    : null;

  return (
    <>
      {/* ── Center column: header summary · energy ribbon · track list ── */}
      <section className="order-1 flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-1">
        <div role="region" aria-label="Class builder" className="flex flex-col gap-3">
          <BackToClassesButton onClick={onBackToClasses} />
          <ClassHeaderCard
            cls={cls}
            payload={payload}
            trackCount={payload?.tracks.length ?? tracks.length}
            isOwner={isOwner}
            canEdit={canEdit}
            canRun={payload != null && canRunPayload(payload) && !planLead && planReady}
            onError={onError}
            onRun={onRun}
            onSelectTrack={setSelectedTrackId}
            onStartChoreography={startChoreography}
            onClassUpdated={onClassUpdated}
            onDeleted={() => onClassDeleted(cls.id)}
            planLead={planLead}
            addPlaylist={playlistInHeader ? addPlaylistAction : null}
            detailsFailed={payload == null || planFailed}
            onRetryDetails={onRetryDetails}
          />
        </div>

        {/* Slice 2 owns this derived presentation. Builder consumes it unchanged as
            the persistent class-shape instrument above the editable track score.
            While the plan is unfinished, keep Pulse/Preview off the first rest. */}
        {payload && payload.tracks.length > 0 && !planLead && (
          <ClassPulse payload={payload} sectionTrack />
        )}

        {selectedEntry && !planLead && (
          <Suspense fallback={null}>
            <TrackPreview entry={selectedEntry} />
          </Suspense>
        )}

        <ClassPlanBlocks
          classId={cls.id}
          scaffoldRecipeId={cls.scaffoldRecipeId}
          targetDurationMs={cls.targetDurationMs}
          tracks={tracks}
          payload={payload}
          canEdit={canEdit}
          assigningPlanBlockId={assigningPlanBlockId}
          focusFirstChoose={tracks.length === 0}
          onChooseMusic={chooseMusicForBlock}
          onCloseMusic={closeMusicSources}
          musicPicker={
            sourceOpen && assigningPlanBlock ? (
              <BuilderMusicPicker
                classId={cls.id}
                classTitle={cls.title}
                assigningPlanBlock={currentAssigningPlanBlock}
                sourcePanelId={sourcePanelId}
                trackSourceRef={trackSourceRef}
                manualEntryRef={manualEntryRef}
                connectionRevision={connectionRevision}
                onOpenConnections={onOpenConnections}
                onAdded={handleMusicAdded}
                onError={onError}
                existingProviderTrackKeys={existingProviderTrackKeys}
              />
            ) : null
          }
          onSelectTrack={(id) => setSelectedTrackId((cur) => (cur === id ? null : id))}
          onTracksChanged={onTrackChanged}
          onPlanNextStep={setPlanLead}
          onPlanReady={setPlanReady}
          onPlanFailed={setPlanFailed}
          onHasPlanBlocks={setHasPlanBlocks}
          onPlanBlocks={setPlanBlocks}
        />
        {payload && payload.tracks.length > 0 && timelineOpen && (
          <section
            id={timelinePanelId}
            role="region"
            aria-label="Timeline precision"
            className="flex flex-col gap-3 rounded-card border border-border-subtle bg-bg-raised p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="rf-eyebrow">Placement focus</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-text-primary">
                  {isFree ? 'Free placement · gaps allowed' : 'Back-to-back timeline'}
                </h3>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={toggleTimelineMode}
                  className="min-h-11 rounded-control border border-interactive/40 px-3 font-ui text-xs font-semibold text-interactive rf-focus-ring"
                >
                  {isFree ? 'Switch to back-to-back' : 'Switch to free placement'}
                </button>
              )}
            </div>
            <div className="min-w-0 overflow-x-auto rounded-card bg-bg-sunken p-3">
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
          </section>
        )}

        <div
          ref={trackListRef}
          className="flex flex-col gap-2 rounded-card bg-bg-raised p-4 shadow-card"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="rf-eyebrow">Run of show</span>
              <h3 className="mt-1 font-display text-lg font-semibold text-text-primary">
                Playback order
              </h3>
              <p className="mt-1 font-ui text-sm leading-5 text-text-secondary">
                {!payload && tracks.length > 0
                  ? 'Playback details are unavailable. Reload the class to restore song timing and ordering.'
                  : isFree
                    ? 'Song timing is set in the timeline. Select a song to inspect it.'
                    : canEdit
                      ? 'Songs play in this order. Drag a grip or use its arrow keys to reorder.'
                      : 'Songs play in this order. Select a song to inspect it.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(showStackAddMusic || (sourceOpen && !assigningPlanBlock)) && (
                <button
                  ref={trackSourceToggleRef}
                  type="button"
                  onClick={toggleTrackSources}
                  aria-expanded={sourceOpen}
                  aria-controls={sourcePanelId}
                  className="min-h-11 rounded-control border border-interactive/50 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
                >
                  {sourceOpen ? 'Close music' : 'Add music'}
                </button>
              )}
              {payload && payload.tracks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTimelineOpen((open) => !open)}
                  aria-expanded={timelineOpen}
                  aria-controls={timelinePanelId}
                  className="min-h-11 rounded-control px-3 font-ui text-sm font-semibold text-text-secondary hover:text-text-primary rf-focus-ring"
                >
                  {timelineOpen ? 'Hide timeline' : 'Show timeline'}
                </button>
              )}
            </div>
          </div>
          {tracks.length === 0 && cls.scaffoldRecipeId == null && (
            <div className="rounded-card border border-border-subtle bg-bg-sunken p-4">
              <StatusLabel kind="empty" label="Empty run of show" />
              <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">
                This class has no music yet.
              </h3>
              <p className="mt-1 font-ui text-sm leading-5 text-text-secondary">
                Add a playlist to start the run of show. New songs append after the songs already
                here. Search, a move, or a manual track still add to this class.
              </p>
              {playlistInEmptyState && addPlaylistAction && (
                <div className="mt-3">
                  <AddPlaylistControl {...addPlaylistAction} prominent />
                </div>
              )}
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
          {sourceOpen && !assigningPlanBlock ? (
            <BuilderMusicPicker
              classId={cls.id}
              classTitle={cls.title}
              assigningPlanBlock={null}
              sourcePanelId={sourcePanelId}
              trackSourceRef={trackSourceRef}
              manualEntryRef={manualEntryRef}
              connectionRevision={connectionRevision}
              onOpenConnections={onOpenConnections}
              onAdded={handleMusicAdded}
              onError={onError}
              requestedMode={classMusicMode}
              requestedModeKey={classMusicModeKey}
              existingProviderTrackKeys={existingProviderTrackKeys}
            />
          ) : null}
        </div>
      </section>

      {/* ── Right column: the sticky inspector for the selected track ── */}
      <aside className="order-2 min-w-0 xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
        {selectedTrack ? (
          <div className="flex flex-col gap-3">
            <TrackInspector
              key={selectedTrack.id}
              track={selectedTrack}
              title={selectedEntry?.track.title ?? 'Track'}
              durationMs={selectedEntry?.track.durationMs ?? null}
              baseDurationMs={selectedEntry?.track.baseDurationMs ?? null}
              cueSyncKey={selectedEntry ? JSON.stringify(selectedEntry.cues) : undefined}
              moveSyncKey={selectedEntry ? JSON.stringify(selectedEntry.moves) : undefined}
              displayBpm={selectedEntry?.displayBpm ?? null}
              template={cls.template}
              canEdit={canEdit}
              canPlaceFreely={isFree}
              focus={inspectorFocus}
              startCueEntry={cueEntryRequest}
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
            className="flex flex-col gap-1 rounded-card border border-interactive/20 bg-bg-base p-5 outline-none rf-focus-ring"
          >
            {/* An unnamed empty box asked the reader to work out both what the
                panel is and where the tracks are. */}
            <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
              Track inspector
            </p>
            <p className="font-ui text-sm text-text-tertiary">
              Select a song in Playback order to inspect its intensity, BPM, notes, cues, and moves.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

/**
 * Canonical destructive control (05-components): transparent fill, no border,
 * ember text, mandatory `error` icon. Hover tints ember; press depresses;
 * disabled drops opacity and removes pointer. Color never carries meaning alone.
 */
function DestructiveErrorIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

const destructiveControlClass =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-transparent px-3 font-ui text-sm text-state-danger hover:bg-state-danger/10 active:translate-y-px rf-focus-ring disabled:pointer-events-none disabled:opacity-40 sm:px-4';

function DestructiveControl({
  children,
  busy = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={`${destructiveControlClass} ${className}`.trim()}
    >
      <DestructiveErrorIcon />
      {busy ? '…' : children}
    </button>
  );
}

/**
 * The class header card (design system 09): title, the derived
 * summary stats (track count · assembled total · average BPM, all from the
 * run-payload — no new data), and the owner/run actions. Stats use label +
 * number, never color alone.
 */
const CLASS_DETAILS_NOT_LOADED = "Class details didn't load.";

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
  onStartChoreography,
  onClassUpdated,
  onDeleted,
  planLead = null,
  addPlaylist = null,
  detailsFailed = false,
  onRetryDetails,
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
  /** Send the instructor to the first track's cue entry (readiness action). */
  onStartChoreography: () => void;
  onClassUpdated: (cls: Class) => void;
  onDeleted: () => void;
  /** Plan-block next step, shown ahead of Live-readiness when the class can already run. */
  planLead?: string | null;
  /** Header Add a playlist. Absent when the empty run of show owns that action. */
  addPlaylist?: {
    expanded: boolean;
    note: string | null;
    noteId: string;
    onClick: () => void;
    buttonRef: Ref<HTMLButtonElement>;
  } | null;
  /** The run payload or the plan blocks failed to load, so readiness is unknown. */
  detailsFailed?: boolean;
  onRetryDetails?: () => void;
}) {
  const { run } = useAsyncAction(onError);
  const { busy: deleting, run: runDelete } = useAsyncAction(onError);
  const { busy: renaming, run: runRename } = useAsyncAction(onError);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(cls.title);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const detailsSummaryRef = useRef<HTMLElement>(null);
  const renameButtonRef = useRef<HTMLButtonElement>(null);
  const renameFormRef = useRef<HTMLFormElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameReturnFocusRef = useRef(false);
  const renameSubmissionOwnsFocusRef = useRef(false);
  const renameFailureReturnFocusRef = useRef(false);
  useEffect(() => {
    if (!renaming) return;
    const relinquishFocus = (event: FocusEvent) => {
      // Disabling the submitted input/button can blur Chrome to body. A later
      // deliberate focus move ends ownership, even if that control also blurs.
      if (
        event.target !== document.body &&
        !renameFormRef.current?.contains(event.target as Node)
      ) {
        renameSubmissionOwnsFocusRef.current = false;
        renameFailureReturnFocusRef.current = false;
      }
    };
    document.addEventListener('focusin', relinquishFocus);
    return () => document.removeEventListener('focusin', relinquishFocus);
  }, [renaming]);
  useLayoutEffect(() => {
    if (editingTitle || !renameReturnFocusRef.current) return;
    renameReturnFocusRef.current = false;
    if (detailsRef.current?.open) renameButtonRef.current?.focus();
    else detailsSummaryRef.current?.focus();
  }, [editingTitle]);
  useLayoutEffect(() => {
    // A failed request keeps the form mounted. Wait until busy controls are
    // enabled again before restoring a keyboard origin that blurred to body.
    if (renaming || !renameFailureReturnFocusRef.current) return;
    renameFailureReturnFocusRef.current = false;
    if (document.activeElement !== document.body) return;
    if (detailsRef.current?.open) renameInputRef.current?.focus();
    else detailsSummaryRef.current?.focus();
  }, [renaming]);
  const finishRename = () => {
    // An async save can finish after the instructor has moved elsewhere. Restore
    // only the focus owned by the form that is about to disappear.
    renameReturnFocusRef.current =
      !!renameFormRef.current?.contains(document.activeElement) ||
      (document.activeElement === document.body && renameSubmissionOwnsFocusRef.current);
    setEditingTitle(false);
  };
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
  // A failed load says so; it never blames track lengths it could not read.
  // While only the plan is still loading, the button stays quiet.
  const runEnabled = canRun && !planLead;
  const runBlockedReason = runEnabled
    ? null
    : planLead
      ? planLead
      : trackCount === 0
        ? 'Add a track to run this class.'
        : detailsFailed
          ? CLASS_DETAILS_NOT_LOADED
          : payload && canRunPayload(payload)
            ? null
            : 'Give every track a length to run.';
  const templateLabel = formatTemplateLabel(cls.template);

  const startRename = () => {
    setTitleDraft(cls.title);
    setEditingTitle(true);
  };

  const saveRename = () => {
    if (renaming) return;
    const next = titleDraft.trim();
    if (next === '' || next === cls.title) {
      finishRename();
      return;
    }
    // Capture the submission origin before busy controls disable and blur.
    renameSubmissionOwnsFocusRef.current = !!renameFormRef.current?.contains(
      document.activeElement,
    );
    renameFailureReturnFocusRef.current = false;
    void runRename(async () => {
      try {
        onClassUpdated(await updateClass(cls.id, { title: next }));
        finishRename();
      } catch (error) {
        renameFailureReturnFocusRef.current =
          document.activeElement === document.body && renameSubmissionOwnsFocusRef.current;
        throw error;
      }
    }).finally(() => {
      renameSubmissionOwnsFocusRef.current = false;
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

  // The instructor keeps class identity and readiness in view; occasional
  // management lives in a native disclosure without unmounting its drafts.
  return (
    <div className="flex flex-col gap-3 rounded-card bg-bg-raised p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:min-w-[20rem] sm:flex-row">
          <div className="relative shrink-0 flex flex-col items-center">
            {cls.coverImageUrl ? (
              <img
                src={cls.coverImageUrl}
                alt="Class Cover"
                fetchPriority="high"
                className="h-[120px] w-[120px] rounded-card object-cover border border-interactive/20"
              />
            ) : (
              // Derived cover: the class's gradient with its title on the art — same
              // identity key as the list card's ArtCollage, so a class keeps one cover
              // across surfaces and renames. Never a bare placeholder glyph.
              <ClassCoverArt classId={cls.id} title={cls.title} />
            )}
          </div>
          <div className="min-w-0 max-w-full">
            <h2 className="truncate font-display text-xl font-semibold text-text-primary">
              {cls.title}
            </h2>
            {templateLabel && (
              <p className="mt-1 font-ui text-sm text-text-secondary">{templateLabel}</p>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:shrink-0 sm:items-end">
          {addPlaylist && (
            <AddPlaylistControl
              buttonRef={addPlaylist.buttonRef}
              expanded={addPlaylist.expanded}
              note={addPlaylist.note}
              noteId={addPlaylist.noteId}
              onClick={addPlaylist.onClick}
            />
          )}
          <button
            className={
              planLead
                ? 'order-first col-span-2 min-h-11 rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-text-secondary disabled:opacity-40 sm:order-none sm:col-span-auto sm:rounded-pill sm:px-4'
                : 'order-first col-span-2 min-h-11 rounded-control rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 sm:order-none sm:col-span-auto sm:rounded-pill sm:px-4'
            }
            onClick={onRun}
            disabled={!runEnabled}
            aria-describedby={runBlockedReason ? runBlockedId : undefined}
            title={runEnabled ? 'Run this class live' : undefined}
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
          {runBlockedReason === CLASS_DETAILS_NOT_LOADED && onRetryDetails && (
            <button
              type="button"
              onClick={onRetryDetails}
              className="ml-1 min-h-11 rounded-control px-2 font-ui text-xs font-semibold text-interactive hover:text-interactive-hover rf-focus-ring"
            >
              Retry
            </button>
          )}
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
              // This line is stats, so it states the gap; the readiness row directly
              // below owns the action and the consequence.
              <span className="font-semibold text-state-caution">no BPM set</span>
            )}
          </>
        )}
      </div>
      {/* Plan next step can speak at 0 tracks. Live readiness waits until there
          are tracks — and collapses again while the plan is still unfinished. */}
      {(planLead || (readiness && trackCount > 0)) && (
        <ClassReadinessSummary
          readiness={readiness && trackCount > 0 ? readiness : null}
          canEdit={canEdit}
          onSelectTrack={onSelectTrack}
          onStartChoreography={onStartChoreography}
          planLead={planLead}
          compact
        />
      )}
      {(isOwner || canEdit || cls.tags.length > 0) && (
        <details
          ref={detailsRef}
          onToggle={(event) => {
            if (event.currentTarget.open) return;
            if (!deleting) setConfirmingDelete(false);
            if (event.currentTarget.contains(document.activeElement)) {
              detailsSummaryRef.current?.focus();
            }
          }}
          className="border-t border-border-subtle pt-2"
        >
          <summary
            ref={detailsSummaryRef}
            className="min-h-11 cursor-pointer rounded-control px-2 py-3 font-ui text-sm font-semibold text-text-secondary rf-focus-ring"
          >
            Class details
          </summary>
          <div className="flex min-w-0 flex-col gap-3 pt-2">
            {isOwner &&
              (editingTitle ? (
                <form
                  ref={renameFormRef}
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
                    ref={renameInputRef}
                    autoFocus
                    disabled={renaming}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && !renaming) finishRename();
                    }}
                    maxLength={200}
                    className="min-h-11 min-w-0 flex-1 rounded-card border border-interactive/40 bg-bg-sunken px-2 font-display text-xl font-semibold text-text-primary"
                  />
                  <button
                    type="submit"
                    className="min-h-11 rounded-control rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 sm:rounded-pill"
                    disabled={renaming}
                  >
                    {renaming ? '…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-control border border-interactive/40 px-3 font-ui text-sm text-text-secondary sm:rounded-pill"
                    onClick={finishRename}
                    disabled={renaming}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="min-h-11 self-start rounded-control border border-interactive/40 px-2 font-ui text-xs text-text-secondary hover:text-text-primary rf-focus-ring sm:rounded-pill"
                  ref={renameButtonRef}
                  onClick={startRename}
                  aria-label="Rename class"
                >
                  Rename
                </button>
              ))}
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-11 self-start rounded-control px-2 font-ui text-xs font-semibold text-interactive hover:bg-interactive/10 rf-focus-ring"
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
                      className="ml-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-text-secondary hover:text-state-danger"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {canEdit && (
                <form
                  onSubmit={handleTagSubmit}
                  className="flex min-w-0 max-w-full flex-wrap items-center gap-1"
                >
                  <input
                    type="text"
                    placeholder="Add tag…"
                    aria-label="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    // min-w-0 + max-w-full: the default input min-width overflowed
                    // the class header by 7px at a 320px viewport.
                    className="min-h-11 min-w-0 max-w-full rounded-control border border-interactive/30 bg-bg-sunken px-2.5 font-ui text-xs text-text-primary sm:rounded-pill"
                    maxLength={50}
                  />
                </form>
              )}
            </div>
            {/* Owner-only delete with inline confirm (no native confirm() dialog). */}
            {isOwner &&
              (confirmingDelete ? (
                <span className="col-span-2 flex flex-col items-start gap-2">
                  <p className="font-ui text-sm text-text-primary">
                    {deleteClassConfirmMessage(cls.title)}
                  </p>
                  <span className="grid grid-cols-2 gap-1 sm:flex sm:items-center">
                    <DestructiveControl
                      onClick={confirmDelete}
                      busy={deleting}
                      aria-label="Delete class"
                    >
                      Delete class
                    </DestructiveControl>
                    <button
                      type="button"
                      className="min-h-11 rounded-control border border-interactive/40 px-3 font-ui text-sm text-text-secondary disabled:opacity-40 sm:rounded-pill"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                  </span>
                </span>
              ) : (
                <DestructiveControl
                  onClick={() => setConfirmingDelete(true)}
                  busy={deleting}
                  title="Delete this class"
                  aria-label="Delete this class"
                >
                  Delete
                </DestructiveControl>
              ))}
          </div>
        </details>
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
      const message = errMessage(e);
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
        <TrackArt
          url={entry.track.albumArtUrl}
          identity={`${entry.track.title}:${entry.track.artist}`}
          size={44}
        />
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
              No BPM set
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
          className="min-h-11 min-w-11 shrink-0 cursor-grab rounded-card px-2 font-data text-text-tertiary hover:text-text-secondary rf-focus-ring active:cursor-grabbing"
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

/** The inspector's "Start at" text for a stored start: blank means 0:00. */
function startAtFieldValue(startOffsetMs: number | null): string {
  return startOffsetMs ? formatDurationInput(startOffsetMs) : '';
}

/** Preserve stored precision on unrelated saves; typed anchors use the m:ss contract. */
function parseInspectorAnchor(value: string, storedMs: number | null): number | null {
  const displayed = storedMs ? formatDurationInput(storedMs) : '';
  if (value === displayed) return storedMs ?? 0;
  return value.trim() === '' ? 0 : parseClockToMs(value);
}

/** The inspector's typed timing fields that Save validates before writing. */
type InspectorField = 'duration' | 'clipStart' | 'clipEnd' | 'downbeat' | 'startAt';

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
  baseDurationMs,
  displayBpm,
  template,
  canEdit,
  canPlaceFreely,
  focus,
  startCueEntry,
  onSaved,
  onChoreographyChanged,
  onRemoved,
  onOpenSongsByMove,
  cueSyncKey,
  moveSyncKey,
}: {
  track: ClassTrack;
  title: string;
  durationMs: number | null;
  /** Resolved track length before clipping — the editable Track length field. */
  baseDurationMs: number | null;
  /** Resolved BPM (override ?? base) — drives beat-snapping in the choreography editor. */
  displayBpm: number | null;
  /** The class's discipline, so the move picker leads with its own moves (P1-04). */
  template: ClassTemplate | null;
  canEdit: boolean;
  /** Free-placement mode: show the editable "Start at" timeline offset. */
  canPlaceFreely: boolean;
  /** A marker click asking to focus a cue/move row on this track (or null). */
  focus: { kind: 'cue' | 'move'; id: string; anchorMs: number; nonce: number } | null;
  /** Bumped when readiness sends the instructor here to write the first cue. */
  startCueEntry: number;
  onSaved: () => void;
  onChoreographyChanged: () => void;
  onRemoved: () => void;
  /** Open the Songs-by-Move dialog from the Moves section. */
  onOpenSongsByMove: () => void;
  /**
   * This track's cues / moves as the run payload last saw them. A change (a
   * timeline marker drag) reloads the inspector's lists (RF-90, Codex B-2).
   */
  cueSyncKey?: string;
  moveSyncKey?: string;
}) {
  const containerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    containerRef.current?.focus();
  }, []);
  const [intensity, setIntensity] = useState<Intensity>(track.intensity);
  const [bpm, setBpm] = useState(track.displayBpmOverride?.toString() ?? '');
  const [rpm, setRpm] = useState(track.displayRpm?.toString() ?? '');
  const [holdCountVal, setHoldCountVal] = useState(track.holdCount?.toString() ?? '');
  const [duration, setDuration] = useState(formatDurationInput(baseDurationMs));
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
  const [startAt, setStartAt] = useState(() => startAtFieldValue(track.startOffsetMs));
  // The stored start (ms) the inspector last saw. A timeline drag changes
  // `track.startOffsetMs` underneath this keyed-by-id inspector (RF-90, Codex B-1).
  // Start at follows one value rule, not keystrokes: the field is untouched while
  // it parses to the stored start (`01:05` equals `1:05`; typing a value away and
  // back counts as untouched), and only a different value is sent.
  const [startAtStoredMs, setStartAtStoredMs] = useState(track.startOffsetMs ?? 0);
  const startAtRef = useRef(startAt);
  startAtRef.current = startAt;
  const [notes, setNotes] = useState(track.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The field a validation message is about: marked invalid, described by the
  // message, and focused. Server and action failures leave it null.
  const [errorField, setErrorField] = useState<InspectorField | null>(null);
  const fieldRefs = useRef<Partial<Record<InspectorField, HTMLInputElement | null>>>({});
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const errorId = `inspector-error-${track.id}`;
  const clearError = () => {
    setError(null);
    setErrorField(null);
  };
  const rejectField = (field: InspectorField, message: string) => {
    setError(message);
    setErrorField(field);
    // Downbeat and Start at sit in the collapsed Advanced group; open it so the
    // field can take focus.
    if ((field === 'downbeat' || field === 'startAt') && advancedRef.current) {
      advancedRef.current.open = true;
    }
    fieldRefs.current[field]?.focus();
  };
  const fieldProps = (field: InspectorField, helpId: string) => ({
    ref: (el: HTMLInputElement | null) => {
      fieldRefs.current[field] = el;
    },
    'aria-invalid': errorField === field || undefined,
    'aria-describedby': errorField === field ? `${helpId} ${errorId}` : helpId,
  });
  const timeFieldClass = (field: InspectorField, width: string) =>
    `min-h-11 ${width} rounded-control border ${
      errorField === field ? 'border-state-danger' : 'border-interactive/30'
    } bg-bg-sunken px-3 font-data text-sm text-text-primary sm:rounded-pill`;
  // Typed fields only. Scoring a zone is a discrete, always-valid choice, so it
  // commits on click (see `chooseIntensity`) and reports next to its own
  // control; this draft is the text the instructor has entered and not yet
  // committed, which is what the Save line speaks about (canon 09
  // "Unsaved/unsynced").
  const draft = JSON.stringify({
    bpm,
    rpm,
    holdCountVal,
    duration,
    clipStart,
    clipEnd,
    downbeat,
    startAt,
    notes,
  });
  const [savedDraft, setSavedDraft] = useState(draft);
  // When the stored start moves, re-seed Start at with its canonical text if the
  // field still held the previous stored value (adjusting state during render,
  // so the field never shows the stale value). Text that parses to anything else
  // is the instructor's edit and is kept. The saved snapshot moves with the
  // field, so the re-seed does not read as unsaved.
  const storedStartMs = track.startOffsetMs ?? 0;
  if (storedStartMs !== startAtStoredMs) {
    setStartAtStoredMs(storedStartMs);
    if (parseInspectorAnchor(startAt, startAtStoredMs) === startAtStoredMs) {
      const reseeded = startAtFieldValue(track.startOffsetMs);
      setStartAt(reseeded);
      const saved = JSON.parse(savedDraft) as { startAt?: string };
      if (saved.startAt === startAt) {
        setSavedDraft(JSON.stringify({ ...saved, startAt: reseeded }));
      }
    }
  }
  const [justSaved, setJustSaved] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const saveStatusRef = useRef<HTMLParagraphElement>(null);
  const dirty = draft !== savedDraft;
  // BPM lookup (the third-party tempo provider — never Spotify) fills the track's
  // base display BPM; the resolved row BPM is still override ?? base.
  const [bpmBusy, setBpmBusy] = useState(false);
  const [bpmStatus, setBpmStatus] = useState<string | null>(null);

  /**
   * Scoring a class is the act this panel exists for, and it used to cost three
   * clicks a track: pick the zone, find Save, press it. A zone is a discrete
   * choice that cannot be half-entered, so it commits itself.
   *
   * Debounced, because the segmented control's arrow keys move the selection as
   * they travel — without this, walking Z0→Z4 would fire five writes. The
   * pending write is flushed on unmount so selecting the next track never
   * silently drops the zone just clicked.
   */
  const [zoneState, setZoneState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedIntensity = useRef<Intensity>(track.intensity);
  const pendingIntensity = useRef<Intensity | null>(null);
  const zoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const commitIntensity = async () => {
    const next = pendingIntensity.current;
    pendingIntensity.current = null;
    if (next == null || next === savedIntensity.current) return;
    if (mounted.current) {
      setZoneState('saving');
      clearError();
    }
    try {
      await updateClassTrack(track.id, { intensity: next });
      savedIntensity.current = next;
      if (mounted.current) setZoneState('saved');
      onSaved();
    } catch (e) {
      // The write did not land, so the control must not keep claiming it did.
      if (mounted.current) {
        setIntensity(savedIntensity.current);
        setZoneState('idle');
        setError(errMessage(e, 'Could not save the intensity. Try again.'));
      }
    }
  };
  // Held in a ref so the unmount flush and the timer both reach the current
  // closure without the parent's inline callbacks re-arming the effect.
  const commitIntensityRef = useRef(commitIntensity);
  useEffect(() => {
    commitIntensityRef.current = commitIntensity;
  });
  useEffect(() => {
    // Re-armed on mount, not just cleared on unmount: StrictMode mounts, tears
    // down, and remounts in development, and a flag that only ever goes false
    // leaves every later write unable to report itself.
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (zoneTimer.current) clearTimeout(zoneTimer.current);
      void commitIntensityRef.current();
    };
  }, []);

  const chooseIntensity = (next: Intensity) => {
    setIntensity(next);
    pendingIntensity.current = next;
    if (zoneTimer.current) clearTimeout(zoneTimer.current);
    zoneTimer.current = setTimeout(() => void commitIntensityRef.current(), 400);
  };

  const lookupTrackBpm = async () => {
    setBpmBusy(true);
    setBpmStatus(null);
    clearError();
    try {
      const updated = await lookupBpm(track.trackId);
      setBpmStatus(
        updated.bpmApplied && updated.displayBpm != null
          ? `Found ${updated.displayBpm} BPM`
          : 'No BPM found',
      );
      onSaved(); // reload so the resolved row/ribbon BPM reflects the new base
    } catch (e) {
      setError(errMessage(e, 'Could not look up the BPM. Try again.'));
    } finally {
      setBpmBusy(false);
    }
  };

  const save = async () => {
    const parsedDuration = parseDurationInput(duration);
    if (parsedDuration == null) {
      rejectField('duration', 'Enter a positive duration as minutes:seconds, for example 3:45.');
      return;
    }
    // The field only expresses whole seconds, so compare against baseDurationMs
    // rounded the same way — otherwise a real (sub-second) source duration never
    // round-trips equal and every "untouched" save manufactures an override.
    const roundedBaseDurationMs =
      baseDurationMs == null ? null : parseDurationInput(formatDurationInput(baseDurationMs));
    // Clip start: blank = 0 (from the beginning). Clip end: blank = null (to the end).
    const clipStartMs = parseInspectorAnchor(clipStart, track.clipStartMs);
    if (clipStartMs == null) {
      rejectField(
        'clipStart',
        'Enter the clip start as minutes:seconds, for example 0:30 (or leave it blank).',
      );
      return;
    }
    // Preserve a stored sub-second end when only another field changed, just as
    // the other anchors do. Blank still resets to null; newly typed ends stay positive.
    const clipEndMs =
      clipEnd === (track.clipEndMs != null ? formatDurationInput(track.clipEndMs) : '')
        ? track.clipEndMs
        : clipEnd.trim() === ''
          ? null
          : parseDurationInput(clipEnd);
    if (clipEnd.trim() !== '' && clipEndMs == null) {
      rejectField(
        'clipEnd',
        'Enter the clip end as minutes:seconds, for example 2:15 (or leave it blank).',
      );
      return;
    }
    if (clipEndMs != null && clipEndMs <= clipStartMs) {
      rejectField('clipEnd', 'Clip end must be after clip start.');
      return;
    }
    // Downbeat: blank = 0 (grid starts at the track start).
    const beatAnchorMs = parseInspectorAnchor(downbeat, track.beatAnchorMs);
    if (beatAnchorMs == null) {
      rejectField(
        'downbeat',
        'Enter the downbeat as minutes:seconds, for example 0:02 (or leave it blank).',
      );
      return;
    }
    // Free-placement start: sent only in free mode (the server rejects it
    // otherwise) and only when the field's value differs from the stored start,
    // so a notes save cannot revert a timeline drag (RF-90, Codex B-1).
    let startOffsetMs: number | undefined;
    if (canPlaceFreely) {
      const parsed = parseInspectorAnchor(startAt, track.startOffsetMs);
      if (parsed == null) {
        rejectField(
          'startAt',
          'Enter the start time as minutes:seconds, for example 3:20 (or leave it blank).',
        );
        return;
      }
      if (parsed !== (track.startOffsetMs ?? 0)) startOffsetMs = parsed;
    }
    // Save disables as soon as the request starts. Move focus to its nearby
    // status first, so a button-initiated save does not strand focus on <body>.
    if (document.activeElement === saveButtonRef.current) saveStatusRef.current?.focus();
    const submittedStartAt = startAt;
    setBusy(true);
    clearError();
    try {
      const trimmedBpm = bpm.trim();
      const trimmedRpm = rpm.trim();
      const trimmedHolds = holdCountVal.trim();
      const updated = await updateClassTrack(track.id, {
        intensity,
        displayBpmOverride: trimmedBpm === '' ? null : Number(trimmedBpm),
        displayRpm: trimmedRpm === '' ? null : Number(trimmedRpm),
        holdCount: trimmedHolds === '' ? null : Number(trimmedHolds),
        ...(parsedDuration !== roundedBaseDurationMs ? { durationMsOverride: parsedDuration } : {}),
        clipStartMs,
        clipEndMs,
        beatAnchorMs,
        ...(startOffsetMs !== undefined ? { startOffsetMs } : {}),
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      // A sent start now shows what the server stored, which may be clamped
      // (even back to the unchanged value). Text typed while the save was in
      // flight is a newer edit and is kept.
      if (startOffsetMs !== undefined && startAtRef.current === submittedStartAt) {
        const storedText = startAtFieldValue(updated?.startOffsetMs ?? startOffsetMs);
        setStartAt(storedText);
        setSavedDraft(JSON.stringify({ ...(JSON.parse(draft) as object), startAt: storedText }));
      } else {
        setSavedDraft(draft);
      }
      setJustSaved(true);
      onSaved();
    } catch (e) {
      setError(errMessage(e, 'Could not save the track. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    clearError();
    try {
      await deleteClassTrack(track.id);
      onRemoved();
    } catch (e) {
      setError(errMessage(e, 'Could not remove the track. Try again.'));
      setBusy(false);
    }
  };

  /**
   * Keyboard commits for the typed fields: Enter from any single-line field,
   * ⌘/Ctrl+S anywhere in the field block. Scoped to that block rather than the
   * whole panel so an Enter inside a cue or move row still belongs to that row.
   * The notes textarea keeps Enter for newlines.
   */
  const commitFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const saveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
    const enterInField = event.key === 'Enter' && event.target instanceof HTMLInputElement;
    if (!saveShortcut && !enterInField) return;
    event.preventDefault();
    if (dirty && !busy) void save();
  };

  return (
    <section
      ref={containerRef}
      tabIndex={-1}
      aria-label={`Track inspector for ${title}`}
      className="flex flex-col gap-3 rounded-card border border-interactive/20 bg-bg-base p-4 outline-none rf-focus-ring"
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
          {/* `contents` keeps the panel's own vertical rhythm while giving the
              typed fields one keyboard-commit scope. */}
          <div className="contents" onKeyDown={commitFromKeyboard}>
            <label className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                  Intensity
                </span>
                {/* The zone commits on click, so it confirms itself here, beside
                  the control — a confirmation six fields lower is a confirmation
                  the eye never meets. */}
                {zoneState !== 'idle' && (
                  <span
                    aria-live="polite"
                    className={`font-ui text-xs ${
                      zoneState === 'saved' ? 'text-state-positive' : 'text-text-tertiary'
                    }`}
                  >
                    {zoneState === 'saved' ? '✓ Saved' : 'Saving…'}
                  </span>
                )}
              </span>
              {/* The control prints the pick in zone number, bars, word and gloss;
                the separate readout beside it repeated the same value in a third
                notation, which read as a second, unexplained state. */}
              <IntensitySegmentedControl
                value={intensity}
                onChange={chooseIntensity}
                ariaLabel="Track intensity"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                BPM for this class
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="—"
                  aria-describedby={`bpm-help-${track.id}`}
                  className="min-h-11 w-32 rounded-control border border-interactive/30 bg-bg-sunken px-3 font-data text-sm text-text-primary sm:rounded-pill"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                />
                {/* Auto-fill the track's base BPM from the tempo service (never Spotify). */}
                <button
                  type="button"
                  onClick={lookupTrackBpm}
                  disabled={bpmBusy}
                  className="min-h-11 rounded-control border border-interactive/40 px-3 font-ui text-xs font-semibold text-interactive hover:bg-interactive/10 disabled:opacity-50 sm:rounded-pill"
                >
                  {bpmBusy ? 'Looking up…' : 'Look up BPM'}
                </button>
                {bpmStatus && (
                  <span className="font-data text-xs text-text-tertiary">{bpmStatus}</span>
                )}
              </div>
              {/* "Display BPM override" named the column, not the act. What the
                reader needs is what happens if the box is left empty. */}
              <span id={`bpm-help-${track.id}`} className="font-ui text-xs text-text-tertiary">
                {bpm.trim() !== ''
                  ? 'Used instead of the track’s own BPM, in this class only. Clear it to go back.'
                  : displayBpm != null
                    ? `Blank uses the track’s own ${displayBpm} BPM. Type a number to use a different one here.`
                    : 'This track has no BPM yet. Type one, or use Look up BPM.'}
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                Track length
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="m:ss"
                {...fieldProps('duration', `duration-help-${track.id}`)}
                className={timeFieldClass('duration', 'w-32')}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <span id={`duration-help-${track.id}`} className="font-ui text-xs text-text-tertiary">
                Minutes:seconds.
              </span>
            </label>

            <fieldset className="flex flex-col gap-1">
              <legend className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                Clip window — play part of the track
              </legend>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="start"
                  aria-label="Clip start (minutes:seconds)"
                  {...fieldProps('clipStart', `clip-help-${track.id}`)}
                  className={timeFieldClass('clipStart', 'w-24')}
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
                  {...fieldProps('clipEnd', `clip-help-${track.id}`)}
                  className={timeFieldClass('clipEnd', 'w-24')}
                  value={clipEnd}
                  onChange={(e) => setClipEnd(e.target.value)}
                />
              </div>
              <span id={`clip-help-${track.id}`} className="font-ui text-xs text-text-tertiary">
                Start and end as minutes:seconds, for example 0:30 and 2:15. Previews and Live play
                only this part. Leave start blank to begin at 0:00. Leave end blank to follow Track
                length.
              </span>
            </fieldset>

            <label className="flex flex-col gap-1">
              <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                Creator notes
              </span>
              <textarea
                aria-label="Creator notes"
                rows={2}
                className="min-h-20 resize-none rounded-card border border-interactive/30 bg-bg-sunken px-3 py-2 font-ui text-sm text-text-primary"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            {/* Advanced — the long tail (cadence, holds, downbeat, placement),
              collapsed by default so the common act reads as scoring the class, not
              filling every field before the shape is visible (design system 09
              §Inspector "score, don't fill"). Native <details>: the inputs stay
              mounted, so the single Save below still commits them while collapsed. */}
            <details ref={advancedRef}>
              <summary className="flex min-h-11 cursor-pointer items-center font-ui text-xs font-semibold uppercase tracking-wide text-interactive hover:text-interactive-hover rf-focus-ring">
                Advanced timing and placement
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row">
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
                      className="min-h-11 w-32 rounded-control border border-interactive/30 bg-bg-sunken px-3 font-data text-sm text-text-primary sm:rounded-pill"
                      value={rpm}
                      onChange={(e) => setRpm(e.target.value)}
                    />
                    <span
                      id={`rpm-help-${track.id}`}
                      className="font-ui text-xs text-text-tertiary"
                    >
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
                      className="min-h-11 w-32 rounded-control border border-interactive/30 bg-bg-sunken px-3 font-data text-sm text-text-primary sm:rounded-pill"
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

                <label className="flex flex-col gap-1">
                  <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
                    Downbeat
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="m:ss"
                    {...fieldProps('downbeat', `downbeat-help-${track.id}`)}
                    className={timeFieldClass('downbeat', 'w-32')}
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
                      {...fieldProps('startAt', `startat-help-${track.id}`)}
                      className={timeFieldClass('startAt', 'w-32')}
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

            {error && (
              <p id={errorId} role="alert" className="font-ui text-sm text-state-danger">
                {error}
              </p>
            )}

            {/* Whether the panel matches what is stored, said in words next to the
              control that resolves it. Glyph + word, never colour alone (07). */}
            <p
              ref={saveStatusRef}
              tabIndex={-1}
              aria-live="polite"
              className={`flex items-center gap-1.5 font-ui text-xs outline-none rf-focus-ring ${
                dirty
                  ? 'text-state-caution'
                  : justSaved
                    ? 'text-state-positive'
                    : 'text-text-tertiary'
              }`}
            >
              <span aria-hidden className="font-data leading-none">
                {dirty ? '!' : justSaved ? '✓' : '·'}
              </span>
              {dirty
                ? 'Unsaved typing — press Save or Enter to keep it.'
                : justSaved
                  ? 'Saved.'
                  : 'Nothing typed to save. Intensity saves as you pick it.'}
            </p>

            <div className="flex items-center gap-2">
              <button
                ref={saveButtonRef}
                className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 sm:rounded-pill"
                onClick={save}
                disabled={busy || !dirty}
              >
                Save
              </button>
              <DestructiveControl className="ml-auto" onClick={() => void remove()} disabled={busy}>
                Remove track
              </DestructiveControl>
            </div>
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
              startEntryNonce={startCueEntry}
              focus={
                focus?.kind === 'cue'
                  ? { id: focus.id, anchorMs: focus.anchorMs, nonce: focus.nonce }
                  : null
              }
              onChanged={onChoreographyChanged}
              syncKey={cueSyncKey}
            />
            <MovesSection
              classTrackId={track.id}
              durationMs={durationMs}
              template={template}
              bpm={displayBpm}
              beatAnchorMs={track.beatAnchorMs}
              focus={
                focus?.kind === 'move'
                  ? { id: focus.id, anchorMs: focus.anchorMs, nonce: focus.nonce }
                  : null
              }
              onChanged={onChoreographyChanged}
              onOpenSongsByMove={onOpenSongsByMove}
              syncKey={moveSyncKey}
            />
          </Suspense>
        </>
      )}
    </section>
  );
}

function BuilderMusicPicker({
  classId,
  classTitle,
  assigningPlanBlock,
  sourcePanelId,
  trackSourceRef,
  manualEntryRef,
  connectionRevision,
  onOpenConnections,
  onAdded,
  onError,
  requestedMode = null,
  requestedModeKey = 0,
  existingProviderTrackKeys,
}: {
  classId: string;
  classTitle: string;
  assigningPlanBlock: PlanBlockTarget | null;
  sourcePanelId: string;
  trackSourceRef: Ref<HTMLElement>;
  manualEntryRef: Ref<HTMLDetailsElement>;
  connectionRevision: number;
  onOpenConnections: () => void;
  onAdded: (classTrackId?: string) => void;
  onError: (msg: string | null) => void;
  requestedMode?: 'search' | 'playlist' | null;
  requestedModeKey?: number;
  existingProviderTrackKeys: ReadonlySet<string>;
}) {
  return (
    <section
      id={sourcePanelId}
      ref={trackSourceRef}
      role="region"
      aria-label={
        assigningPlanBlock
          ? `Choose music for ${planBlockOptionLabel(assigningPlanBlock)} in ${classTitle}`
          : `Add music to ${classTitle}`
      }
      className="rounded-card border border-border-subtle bg-bg-sunken p-3 outline-none rf-focus-ring"
    >
      <TrackSearch
        classId={classId}
        planBlockId={assigningPlanBlock?.id ?? null}
        destinationLabel={assigningPlanBlock ? planBlockOptionLabel(assigningPlanBlock) : null}
        onOpenConnections={onOpenConnections}
        connectionRevision={connectionRevision}
        onAdded={onAdded}
        requestedMode={assigningPlanBlock ? null : requestedMode}
        requestedModeKey={requestedModeKey}
        existingProviderTrackKeys={existingProviderTrackKeys}
      />
      {/* Manual entry stays available but de-emphasized (search/import is the
          primary path; 09). For a track a provider can't return, or no creds. */}
      <details ref={manualEntryRef} className="mt-3 border-t border-border-subtle pt-3">
        <summary className="flex min-h-11 cursor-pointer items-center font-ui text-xs font-semibold text-text-secondary hover:text-text-primary">
          Add manually
        </summary>
        <AddTrackForm
          classId={classId}
          planBlockId={assigningPlanBlock?.id ?? null}
          onAdded={onAdded}
          onError={onError}
        />
      </details>
    </section>
  );
}

function AddTrackForm({
  classId,
  planBlockId = null,
  onAdded,
  onError,
}: {
  classId: string;
  planBlockId?: string | null;
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
            ...(planBlockId ? { planBlockId } : {}),
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
          className="min-h-11 min-w-0 flex-1 rounded-control border border-interactive/30 bg-bg-sunken px-3 font-ui text-sm text-text-primary sm:rounded-pill"
          placeholder="Title"
          aria-label="Track title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="min-h-11 min-w-0 flex-1 rounded-control border border-interactive/30 bg-bg-sunken px-3 font-ui text-sm text-text-primary sm:rounded-pill"
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
          className="min-h-11 w-28 rounded-control border border-interactive/30 bg-bg-sunken px-3 font-data text-sm text-text-primary sm:rounded-pill"
          inputMode="numeric"
          placeholder="3:00"
          aria-label="Track duration in minutes and seconds"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <button
          disabled={busy}
          className="ml-auto min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-50 sm:rounded-pill"
        >
          {busy ? '…' : 'Add track'}
        </button>
      </div>
    </form>
  );
}
