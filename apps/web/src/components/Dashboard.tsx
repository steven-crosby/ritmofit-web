/** Minimal authenticated builder: create a class, add a tagged track, see the timeline. */
import { useCallback, useEffect, useReducer, useRef, useState, lazy, Suspense } from 'react';
import {
  intensityValues,
  type Class,
  type ClassWithAccess,
  type ClassTrack,
  type Intensity,
  type RunPayload,
  type RunPayloadTrackEntry,
} from '@ritmofit/shared';
import { authClient } from '../lib/auth-client.js';
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listClassTracks,
  addTrack,
  updateClassTrack,
  deleteClassTrack,
  reorderTracks,
  getRunPayload,
  lookupBpm,
} from '../lib/api.js';
import { moveItem } from '../lib/reorder.js';
import { avgBpm, formatDuration } from '../lib/class-summary.js';
import { classDetailReducer, initialClassDetailState } from '../lib/class-detail-state.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { IntensityRibbon } from './IntensityRibbon.js';
import { TimelineStrip } from './TimelineStrip.js';
import { SegmentBand } from './SegmentBand.js';
import { IntensityReadout } from './IntensityReadout.js';
import { TrackSearch } from './TrackSearch.js';

// Code-split the heavy, interaction-gated surfaces into their own chunks so the
// initial builder paint doesn't ship Live mode, the choreography editor, or the
// modal dialogs. Each loads on first use behind a <Suspense> boundary below.
const LiveMode = lazy(() => import('./LiveMode.js').then((m) => ({ default: m.LiveMode })));
const ShareDialog = lazy(() => import('./ShareDialog.js').then((m) => ({ default: m.ShareDialog })));
const TeamsDialog = lazy(() => import('./TeamsDialog.js').then((m) => ({ default: m.TeamsDialog })));
const ExploreDialog = lazy(() => import('./ExploreDialog.js').then((m) => ({ default: m.ExploreDialog })));
const ConnectionsDialog = lazy(() =>
  import('./ConnectionsDialog.js').then((m) => ({ default: m.ConnectionsDialog })),
);
const CuesSection = lazy(() => import('./ChoreographyEditor.js').then((m) => ({ default: m.CuesSection })));
const MovesSection = lazy(() => import('./ChoreographyEditor.js').then((m) => ({ default: m.MovesSection })));

/** Full-screen Suspense fallback while a lazy chunk (e.g. Live mode) loads. */
function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="font-ui text-text-tertiary">Loading…</p>
    </main>
  );
}

export function Dashboard({ userId, userName }: { userId: string; userName: string }) {
  const [classes, setClasses] = useState<ClassWithAccess[]>([]);
  const [selected, setSelected] = useState<ClassWithAccess | null>(null);
  const [detail, dispatchDetail] = useReducer(classDetailReducer, initialClassDetailState);
  const detailRequestId = useRef(0);
  const [live, setLive] = useState<RunPayload | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshClasses = useCallback(async () => {
    try {
      setClasses(await listClasses());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refreshClasses();
  }, [refreshClasses]);

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

    dispatchDetail({
      type: 'success',
      classId,
      requestId,
      tracks: tracksResult.value,
      payload: payloadResult.status === 'fulfilled' ? payloadResult.value : null,
    });
  }, []);

  const openClass = useCallback(
    async (cls: ClassWithAccess) => {
      setSelected(cls);
      await loadDetail(cls.id);
    },
    [loadDetail],
  );

  const runClass = useCallback(async (classId: string) => {
    try {
      setLive(await getRunPayload(classId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Merge an updated class into the list + the open detail pane (preserving the
  // caller's access level, which PATCH responses don't carry).
  const applyClassUpdate = useCallback((updated: Class) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...updated, accessLevel: c.accessLevel } : c)),
    );
    setSelected((prev) => (prev && prev.id === updated.id ? { ...updated, accessLevel: prev.accessLevel } : prev));
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
    <main className="flex min-h-screen flex-col">
      {/* Persistent top bar — glass nav surface (design system 04/05): brand
          mark + wordmark, then the cross-cutting destinations. */}
      <header className="rf-topbar flex items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="rf-brand-mark" aria-hidden="true">
            R
          </span>
          <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-text-primary">RitmoFit</h1>
        </div>
        <span className="flex-1" />
        <p className="hidden font-ui text-sm text-text-secondary sm:block">{userName}</p>
        <button
          className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive transition-colors hover:bg-interactive/10"
          onClick={() => setExploreOpen(true)}
        >
          Explore
        </button>
        <button
          className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive transition-colors hover:bg-interactive/10"
          onClick={() => setTeamsOpen(true)}
        >
          Teams
        </button>
        <button
          className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive transition-colors hover:bg-interactive/10"
          onClick={() => setConnectionsOpen(true)}
        >
          Connections
        </button>
        <button
          className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive transition-colors hover:bg-interactive/10"
          onClick={() => authClient.signOut()}
        >
          Sign out
        </button>
      </header>

      {/* Lazy modal chunks — fallback null so the trigger feels instant; the modal
          paints once its chunk resolves (near-instant on a warm cache). */}
      <Suspense fallback={null}>
        {teamsOpen && <TeamsDialog userId={userId} onClose={() => setTeamsOpen(false)} />}
        {connectionsOpen && <ConnectionsDialog onClose={() => setConnectionsOpen(false)} />}
        {exploreOpen && (
          <ExploreDialog
            onClose={() => setExploreOpen(false)}
            onPreview={(classId) => {
              setExploreOpen(false);
              void runClass(classId);
            }}
            onCopied={async (cls) => {
              setExploreOpen(false);
              await refreshClasses();
              await openClass({ ...cls, accessLevel: 'owner' });
            }}
          />
        )}
      </Suspense>

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">
        {error && <p className="mb-4 font-ui text-sm text-intensity-all_out">{error}</p>}

        {/* The 3-pane workstation (design system 09): library · class · inspector.
            Collapses to a single stacked column below xl so it stays usable on
            smaller laptops. The class workspace contributes the center + inspector
            columns; the library is the first column. */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[266px_minmax(0,1fr)_340px] xl:items-start">
          <LibraryRail
            classes={classes}
            selectedId={selected?.id ?? null}
            onError={setError}
            onCreate={async (cls) => {
              await refreshClasses();
              await openClass({ ...cls, accessLevel: 'owner' });
            }}
            onOpen={openClass}
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
            />
          ) : selected && detail.classId === selected.id && detail.status === 'error' ? (
            <section className="rounded-card bg-bg-raised p-8 shadow-card">
              <p className="font-ui text-sm text-intensity-all_out" role="alert">
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
            <section className="rounded-card bg-bg-raised p-8 shadow-card">
              <p className="font-ui text-text-tertiary">Select or create a class to start building.</p>
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
function LibraryRail({
  classes,
  selectedId,
  onError,
  onCreate,
  onOpen,
}: {
  classes: ClassWithAccess[];
  selectedId: string | null;
  onError: (msg: string | null) => void;
  onCreate: (cls: Awaited<ReturnType<typeof createClass>>) => void;
  onOpen: (cls: ClassWithAccess) => void;
}) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-6">
      <div className="flex items-center justify-between">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Your classes</span>
        <span className="font-data text-xs text-text-tertiary">{classes.length}</span>
      </div>
      <CreateClassForm onCreated={onCreate} onError={onError} />
      {classes.length === 0 ? (
        <p className="font-ui text-sm text-text-tertiary">No classes yet — create your first above.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map((cls) => (
            <li key={cls.id}>
              <button
                onClick={() => onOpen(cls)}
                aria-pressed={selectedId === cls.id}
                className={`w-full rounded-card bg-bg-raised p-3 text-left font-ui shadow-card ${
                  selectedId === cls.id ? 'ring-2 ring-interactive' : ''
                }`}
              >
                <span className="block truncate text-text-primary">{cls.title}</span>
                <span className="font-data text-xs uppercase text-text-tertiary">{cls.accessLevel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function CreateClassForm({
  onCreated,
  onError,
}: {
  onCreated: (cls: Awaited<ReturnType<typeof createClass>>) => void;
  onError: (msg: string | null) => void;
}) {
  const [title, setTitle] = useState('');
  const { busy, run } = useAsyncAction(onError);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        void run(async () => {
          const cls = await createClass({ title: title.trim() });
          setTitle('');
          onCreated(cls);
        });
      }}
    >
      <input
        className="flex-1 rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
        placeholder="New class title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button
        disabled={busy}
        className="rounded-pill rf-btn-primary px-4 py-2 font-ui font-semibold text-text-on-accent disabled:opacity-50"
      >
        {busy ? '…' : 'Add'}
      </button>
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
}: {
  cls: ClassWithAccess;
  tracks: ClassTrack[];
  payload: RunPayload | null;
  onError: (msg: string | null) => void;
  onTrackChanged: () => void;
  onRun: () => void;
  onClassUpdated: (cls: Class) => void;
  onClassDeleted: (classId: string) => void;
}) {
  const [sharing, setSharing] = useState(false);
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
    markerFocus && selectedTrack && markerFocus.classTrackId === selectedTrack.id ? markerFocus : null;

  return (
    <>
      <Suspense fallback={null}>
        {sharing && <ShareDialog classId={cls.id} classTitle={cls.title} onClose={() => setSharing(false)} />}
      </Suspense>

      {/* ── Center column: header summary · energy ribbon · track list ── */}
      <section className="flex min-w-0 flex-col gap-4">
        <ClassHeaderCard
          cls={cls}
          payload={payload}
          trackCount={payload?.tracks.length ?? tracks.length}
          isOwner={isOwner}
          canRun={tracks.length > 0}
          onError={onError}
          onRun={onRun}
          onShare={() => setSharing(true)}
          onClassUpdated={onClassUpdated}
          onDeleted={() => onClassDeleted(cls.id)}
        />

        {/* The energy arc + timeline — the class's shape and its cue/move markers,
            sharing one time axis, both derived from the run-payload (no new schema). */}
        {payload && payload.tracks.length > 0 && (
          <div className="rounded-card bg-bg-raised p-4 shadow-card">
            <IntensityRibbon payload={payload} />
            <TimelineStrip
              payload={payload}
              selectedTrackId={selectedTrackId}
              onSelectTrack={selectFromTimeline}
            />
            <SegmentBand
              classId={cls.id}
              totalDurationMs={payload.class.totalDurationMs}
              canEdit={canEdit}
              onChanged={onTrackChanged}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-card bg-bg-raised p-4 shadow-card">
          <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Track list</span>
          {tracks.length === 0 && (
            <p className="font-ui text-sm text-text-tertiary">No tracks yet — add your first below.</p>
          )}
          {/* Rich, reorderable song rows from the run-payload (title/artist/BPM/art);
              fall back to the lean, non-reorderable rows only if the payload couldn't
              load but tracks exist. */}
          {tracks.length > 0 &&
            (payload ? (
              <ReorderableTrackList
                classId={cls.id}
                entries={payload.tracks}
                canReorder={canEdit}
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
          <TrackInspector
            key={selectedTrack.id}
            track={selectedTrack}
            title={selectedEntry?.track.title ?? 'Track'}
            durationMs={selectedEntry?.track.durationMs ?? null}
            canEdit={canEdit}
            focus={inspectorFocus}
            onSaved={onTrackChanged}
            onRemoved={() => {
              setSelectedTrackId(null);
              onTrackChanged();
            }}
          />
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
 * The class header card (design system 09): title + visibility, the derived
 * summary stats (track count · assembled total · average BPM, all from the
 * run-payload — no new data), and the owner/run actions. Visibility and stats
 * use label + number, never color alone.
 */
function ClassHeaderCard({
  cls,
  payload,
  trackCount,
  isOwner,
  canRun,
  onError,
  onRun,
  onShare,
  onClassUpdated,
  onDeleted,
}: {
  cls: ClassWithAccess;
  payload: RunPayload | null;
  trackCount: number;
  isOwner: boolean;
  canRun: boolean;
  onError: (msg: string | null) => void;
  onRun: () => void;
  onShare: () => void;
  onClassUpdated: (cls: Class) => void;
  onDeleted: () => void;
}) {
  const { busy: publishing, run } = useAsyncAction(onError);
  const { busy: deleting, run: runDelete } = useAsyncAction(onError);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isPublic = cls.visibility === 'public';
  const averageBpm = payload ? avgBpm(payload) : null;

  const togglePublish = () =>
    void run(async () => {
      onClassUpdated(await updateClass(cls.id, { visibility: isPublic ? 'private' : 'public' }));
    });

  const confirmDelete = () =>
    void runDelete(async () => {
      await deleteClass(cls.id);
      onDeleted();
    });

  return (
    <div className="flex flex-col gap-3 rounded-card bg-bg-raised p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold text-text-primary">{cls.title}</h2>
          {/* Visibility: icon + label, never color alone (accessibility). */}
          <p className="font-ui text-xs text-text-tertiary">
            {isPublic ? '🌐 Public — listed in Explore' : '🔒 Private'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isOwner && (
            <button
              className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive disabled:opacity-40"
              onClick={togglePublish}
              disabled={publishing}
            >
              {isPublic ? 'Make private' : 'Publish'}
            </button>
          )}
          {isOwner && (
            <button
              className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive"
              onClick={onShare}
            >
              Share
            </button>
          )}
          {/* Owner-only delete with inline confirm (no native confirm() dialog). */}
          {isOwner &&
            (confirmingDelete ? (
              <span className="flex items-center gap-1">
                <button
                  className="rounded-pill bg-intensity-all_out/15 px-3 py-1.5 font-ui text-sm font-semibold text-intensity-all_out disabled:opacity-40"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? '…' : 'Delete class'}
                </button>
                <button
                  className="rounded-pill border border-interactive/40 px-3 py-1.5 font-ui text-sm text-text-secondary"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                className="rounded-pill border border-intensity-all_out/50 px-4 py-1.5 font-ui text-sm text-intensity-all_out"
                onClick={() => setConfirmingDelete(true)}
                title="Delete this class"
              >
                Delete
              </button>
            ))}
          <button
            className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
            onClick={onRun}
            disabled={!canRun}
            title={canRun ? 'Run this class live' : 'Add a track first'}
          >
            ▶ Run live
          </button>
        </div>
      </div>
      {/* Summary stats — BPM/time weighted in the Martian Mono data face. */}
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
        {averageBpm != null && (
          <>
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
            <span>
              avg <span className="text-text-primary">{averageBpm}</span> BPM
            </span>
          </>
        )}
      </div>
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
      {error && <li className="font-ui text-xs text-intensity-all_out">{error}</li>}
    </ol>
  );
}

/**
 * The low-noise song row (design system `09-class-builder-guidelines.md`): small
 * album art, title + artist, BPM weighted in the Martian Mono data face, and
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
      className={`flex items-center gap-1 rounded-card transition-opacity ${
        dropTarget ? 'ring-2 ring-interactive/60' : ''
      } ${dragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex flex-1 items-center gap-3 rounded-card bg-bg-base px-3 py-2 text-left ${
          selected ? 'ring-2 ring-interactive' : ''
        }`}
      >
        <span className="w-5 shrink-0 font-data text-xs text-text-tertiary">{position + 1}</span>
        {/* Album art is a small creative trigger (44px), not a focal point. */}
        {entry.track.albumArtUrl ? (
          <img
            src={entry.track.albumArtUrl}
            alt=""
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
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-sm font-semibold text-text-primary">{entry.track.title}</p>
          <p className="truncate font-ui text-xs text-text-secondary">{entry.track.artist}</p>
        </div>
        <IntensityReadout intensity={entry.intensity} />
        {entry.displayBpm != null && (
          <span className="shrink-0 font-data text-sm text-text-secondary">
            {entry.displayBpm}
            <span className="ml-1 text-xs text-text-tertiary">BPM</span>
          </span>
        )}
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
  canEdit,
  focus,
  onSaved,
  onRemoved,
}: {
  track: ClassTrack;
  title: string;
  durationMs: number | null;
  canEdit: boolean;
  /** A marker click asking to focus a cue/move row on this track (or null). */
  focus: { kind: 'cue' | 'move'; id: string; anchorMs: number; nonce: number } | null;
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const [intensity, setIntensity] = useState<Intensity>(track.intensity);
  const [bpm, setBpm] = useState(track.displayBpmOverride?.toString() ?? '');
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
    setBusy(true);
    setError(null);
    try {
      const trimmedBpm = bpm.trim();
      await updateClassTrack(track.id, {
        intensity,
        displayBpmOverride: trimmedBpm === '' ? null : Number(trimmedBpm),
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
            <span className="font-data text-sm text-text-secondary">{track.displayBpmOverride} BPM</span>
          )}
          {track.notes && <span className="font-ui text-xs text-text-tertiary">{track.notes}</span>}
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Intensity</span>
            <div className="flex items-center gap-3">
              <select
                className="rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-ui text-sm text-text-primary"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as Intensity)}
              >
                {intensityValues.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
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
              {bpmStatus && <span className="font-data text-xs text-text-tertiary">{bpmStatus}</span>}
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Notes</span>
            <textarea
              rows={2}
              className="resize-none rounded-card border border-interactive/30 bg-bg-raised px-3 py-2 font-ui text-sm text-text-primary"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error && <p className="font-ui text-sm text-intensity-all_out">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              className="rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
              onClick={save}
              disabled={busy}
            >
              Save
            </button>
            <button
              className="ml-auto rounded-pill border border-intensity-all_out/50 px-4 py-1.5 font-ui text-sm text-intensity-all_out disabled:opacity-40"
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
              focus={focus?.kind === 'cue' ? { id: focus.id, anchorMs: focus.anchorMs, nonce: focus.nonce } : null}
            />
            <MovesSection
              classTrackId={track.id}
              durationMs={durationMs}
              focus={focus?.kind === 'move' ? { id: focus.id, anchorMs: focus.anchorMs, nonce: focus.nonce } : null}
              onChanged={onSaved}
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
  const [durationMs, setDurationMs] = useState('180000');
  const [intensity, setIntensity] = useState<Intensity>('mod');
  const { busy, run } = useAsyncAction(onError);

  return (
    <form
      className="flex flex-col gap-2 border-t border-interactive/20 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !artist.trim()) return;
        void run(async () => {
          await addTrack(classId, {
            track: { title: title.trim(), artist: artist.trim(), durationMs: Number(durationMs) || null },
            intensity,
          });
          setTitle('');
          setArtist('');
          onAdded();
        });
      }}
    >
      <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Add a track</p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
          placeholder="Artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <select
          className="rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-ui text-sm text-text-primary"
          value={intensity}
          onChange={(e) => setIntensity(e.target.value as Intensity)}
        >
          {intensityValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <input
          className="w-28 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1.5 font-data text-sm text-text-primary"
          type="number"
          placeholder="ms"
          value={durationMs}
          onChange={(e) => setDurationMs(e.target.value)}
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
