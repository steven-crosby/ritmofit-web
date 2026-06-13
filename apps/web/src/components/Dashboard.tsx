/** Minimal authenticated builder: create a class, add a tagged track, see the timeline. */
import { useEffect, useState, useCallback } from 'react';
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
  listClassTracks,
  addTrack,
  updateClassTrack,
  deleteClassTrack,
  getRunPayload,
} from '../lib/api.js';
import { LiveMode } from './LiveMode.js';
import { IntensityRibbon } from './IntensityRibbon.js';
import { IntensityReadout } from './IntensityReadout.js';
import { CuesSection, MovesSection } from './ChoreographyEditor.js';
import { ShareDialog } from './ShareDialog.js';
import { TeamsDialog } from './TeamsDialog.js';
import { ExploreDialog } from './ExploreDialog.js';

export function Dashboard({ userId, userName }: { userId: string; userName: string }) {
  const [classes, setClasses] = useState<ClassWithAccess[]>([]);
  const [selected, setSelected] = useState<ClassWithAccess | null>(null);
  const [tracks, setTracks] = useState<ClassTrack[]>([]);
  // The open class's run-payload — the server-authoritative assembled timeline that
  // feeds the energy ribbon (durations + total). Distinct from `live` (full Live mode).
  const [detailPayload, setDetailPayload] = useState<RunPayload | null>(null);
  const [live, setLive] = useState<RunPayload | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshClasses = useCallback(async () => {
    try {
      setClasses(await listClasses());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refreshClasses();
  }, [refreshClasses]);

  // Load (or reload) the open class's detail: its tracks plus the run-payload that
  // drives the energy ribbon. The ribbon is optional, so a payload failure never
  // blanks the editor — it just hides the ribbon.
  const loadDetail = useCallback(async (classId: string) => {
    setTracks(await listClassTracks(classId));
    try {
      setDetailPayload(await getRunPayload(classId));
    } catch {
      setDetailPayload(null);
    }
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

  if (live) return <LiveMode payload={live} onExit={() => setLive(null)} />;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">RitmoFit</h1>
          <p className="font-ui text-sm text-text-secondary">Signed in as {userName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive"
            onClick={() => setExploreOpen(true)}
          >
            Explore
          </button>
          <button
            className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive"
            onClick={() => setTeamsOpen(true)}
          >
            Teams
          </button>
          <button
            className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive"
            onClick={() => authClient.signOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      {teamsOpen && <TeamsDialog userId={userId} onClose={() => setTeamsOpen(false)} />}
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

      {error && <p className="font-ui text-sm text-intensity-all_out">{error}</p>}

      <div className="grid grid-cols-[1fr_1.4fr] gap-6">
        <section className="flex flex-col gap-3">
          <CreateClassForm
            onCreated={async (cls) => {
              await refreshClasses();
              await openClass({ ...cls, accessLevel: 'owner' });
            }}
          />
          <ul className="flex flex-col gap-2">
            {classes.map((cls) => (
              <li key={cls.id}>
                <button
                  onClick={() => openClass(cls)}
                  className={`w-full rounded-card bg-bg-raised p-3 text-left font-ui shadow-card ${
                    selected?.id === cls.id ? 'ring-2 ring-interactive' : ''
                  }`}
                >
                  <span className="text-text-primary">{cls.title}</span>
                  <span className="ml-2 font-data text-xs uppercase text-text-tertiary">
                    {cls.accessLevel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          {selected ? (
            <ClassDetail
              cls={selected}
              tracks={tracks}
              payload={detailPayload}
              onTrackAdded={() => loadDetail(selected.id)}
              onRun={() => runClass(selected.id)}
              onClassUpdated={applyClassUpdate}
            />
          ) : (
            <p className="font-ui text-text-tertiary">Select or create a class.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function CreateClassForm({ onCreated }: { onCreated: (cls: Awaited<ReturnType<typeof createClass>>) => void }) {
  const [title, setTitle] = useState('');
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const cls = await createClass({ title: title.trim() });
        setTitle('');
        onCreated(cls);
      }}
    >
      <input
        className="flex-1 rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
        placeholder="New class title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button className="rounded-pill bg-brand px-4 py-2 font-ui font-semibold text-text-on-accent">Add</button>
    </form>
  );
}

function ClassDetail({
  cls,
  tracks,
  payload,
  onTrackAdded,
  onRun,
  onClassUpdated,
}: {
  cls: ClassWithAccess;
  tracks: ClassTrack[];
  payload: RunPayload | null;
  onTrackAdded: () => void;
  onRun: () => void;
  onClassUpdated: (cls: Class) => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // The selected track (by class_track id) drives the inspector. Reset when the
  // open class changes so a stale selection from another class never lingers.
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  useEffect(() => setSelectedTrackId(null), [cls.id]);
  const isPublic = cls.visibility === 'public';
  const isOwner = cls.accessLevel === 'owner';
  const canEdit = cls.accessLevel === 'owner' || cls.accessLevel === 'edit';

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null;
  const selectedEntry = payload?.tracks.find((e) => e.classTrackId === selectedTrackId) ?? null;

  const togglePublish = async () => {
    setPublishing(true);
    try {
      onClassUpdated(await updateClass(cls.id, { visibility: isPublic ? 'private' : 'public' }));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-card bg-bg-raised p-5 shadow-card">
      {sharing && <ShareDialog classId={cls.id} classTitle={cls.title} onClose={() => setSharing(false)} />}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold text-text-primary">{cls.title}</h2>
          {/* Visibility: icon + label, never color alone (accessibility). */}
          <p className="font-ui text-xs text-text-tertiary">
            {isPublic ? '🌐 Public — listed in Explore' : '🔒 Private'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              onClick={() => setSharing(true)}
            >
              Share
            </button>
          )}
          <button
            className="rounded-pill bg-brand px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
            onClick={onRun}
            disabled={tracks.length === 0}
            title={tracks.length === 0 ? 'Add a track first' : 'Run this class live'}
          >
            ▶ Run live
          </button>
        </div>
      </div>
      {/* The energy arc — the class's shape, derived from the run-payload (no new schema). */}
      {payload && payload.tracks.length > 0 && <IntensityRibbon payload={payload} />}
      <ol className="flex flex-col gap-2">
        {tracks.length === 0 && <li className="font-ui text-sm text-text-tertiary">No tracks yet.</li>}
        {/* Rich song rows from the run-payload (title/artist/BPM/art); fall back to the
            lean rows only if the payload couldn't load but tracks exist. */}
        {tracks.length > 0 &&
          (payload
            ? payload.tracks.map((t) => (
                <SongRow
                  key={t.classTrackId}
                  entry={t}
                  selected={t.classTrackId === selectedTrackId}
                  onSelect={() =>
                    setSelectedTrackId((cur) => (cur === t.classTrackId ? null : t.classTrackId))
                  }
                />
              ))
            : tracks.map((t) => <LeanTrackRow key={t.id} track={t} />))}
      </ol>
      {/* Inspector: edit the selected track. Editing reshapes the ribbon + rows live. */}
      {selectedTrack && (
        <TrackInspector
          key={selectedTrack.id}
          track={selectedTrack}
          title={selectedEntry?.track.title ?? 'Track'}
          durationMs={selectedEntry?.track.durationMs ?? null}
          canEdit={canEdit}
          onSaved={onTrackAdded}
          onRemoved={() => {
            setSelectedTrackId(null);
            onTrackAdded();
          }}
        />
      )}
      <AddTrackForm classId={cls.id} onAdded={onTrackAdded} />
    </div>
  );
}

/**
 * The low-noise song row (design system `09-class-builder-guidelines.md`): small
 * album art, title + artist, BPM weighted in the Martian Mono data face, and
 * intensity as bars+label — never color alone. No oversized art, no chrome.
 * The whole row is the selection target (opens the inspector). Drag-reorder is a
 * later slice.
 */
function SongRow({
  entry,
  selected,
  onSelect,
}: {
  entry: RunPayloadTrackEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex w-full items-center gap-3 rounded-card bg-bg-base px-3 py-2 text-left ${
          selected ? 'ring-2 ring-interactive' : ''
        }`}
      >
        <span className="w-5 shrink-0 font-data text-xs text-text-tertiary">{entry.position + 1}</span>
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
  onSaved,
  onRemoved,
}: {
  track: ClassTrack;
  title: string;
  durationMs: number | null;
  canEdit: boolean;
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const [intensity, setIntensity] = useState<Intensity>(track.intensity);
  const [bpm, setBpm] = useState(track.displayBpmOverride?.toString() ?? '');
  const [notes, setNotes] = useState(track.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="—"
              className="w-32 rounded-pill border border-interactive/30 bg-bg-raised px-3 py-1.5 font-data text-sm text-text-primary"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
            />
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
              className="rounded-pill bg-brand px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
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

          {/* Choreography anchored to this track — cues + placed moves. */}
          <hr className="border-interactive/20" />
          <CuesSection classTrackId={track.id} durationMs={durationMs} />
          <MovesSection classTrackId={track.id} durationMs={durationMs} />
        </>
      )}
    </section>
  );
}

function AddTrackForm({ classId, onAdded }: { classId: string; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [durationMs, setDurationMs] = useState('180000');
  const [intensity, setIntensity] = useState<Intensity>('mod');

  return (
    <form
      className="flex flex-col gap-2 border-t border-interactive/20 pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !artist.trim()) return;
        await addTrack(classId, {
          track: { title: title.trim(), artist: artist.trim(), durationMs: Number(durationMs) || null },
          intensity,
        });
        setTitle('');
        setArtist('');
        onAdded();
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
        <button className="ml-auto rounded-pill bg-brand px-4 py-1.5 font-ui text-sm font-semibold text-text-on-accent">
          Add track
        </button>
      </div>
    </form>
  );
}
