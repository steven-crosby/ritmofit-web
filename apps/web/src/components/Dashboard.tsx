/** Minimal authenticated builder: create a class, add a tagged track, see the timeline. */
import { useEffect, useState, useCallback } from 'react';
import { intensityValues, type ClassWithAccess, type ClassTrack, type Intensity } from '@ritmofit/shared';
import { authClient } from '../lib/auth-client.js';
import { listClasses, createClass, listClassTracks, addTrack } from '../lib/api.js';

export function Dashboard({ userName }: { userName: string }) {
  const [classes, setClasses] = useState<ClassWithAccess[]>([]);
  const [selected, setSelected] = useState<ClassWithAccess | null>(null);
  const [tracks, setTracks] = useState<ClassTrack[]>([]);
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

  const openClass = useCallback(async (cls: ClassWithAccess) => {
    setSelected(cls);
    setTracks(await listClassTracks(cls.id));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">RitmoFit</h1>
          <p className="font-ui text-sm text-text-secondary">Signed in as {userName}</p>
        </div>
        <button
          className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive"
          onClick={() => authClient.signOut()}
        >
          Sign out
        </button>
      </header>

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
              onTrackAdded={async () => setTracks(await listClassTracks(selected.id))}
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
  onTrackAdded,
}: {
  cls: ClassWithAccess;
  tracks: ClassTrack[];
  onTrackAdded: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-bg-raised p-5 shadow-card">
      <h2 className="font-display text-xl font-semibold text-text-primary">{cls.title}</h2>
      <ol className="flex flex-col gap-2">
        {tracks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-pill bg-bg-base px-3 py-2">
            <span className="font-data text-xs text-text-tertiary">#{t.position + 1}</span>
            <span
              className="h-3 w-3 rounded-pill"
              style={{ backgroundColor: `var(--rf-color-intensity-${t.intensity})` }}
              aria-hidden
            />
            <span className="font-ui text-sm text-text-secondary">{t.intensity}</span>
            <span className="ml-auto font-data text-xs text-text-tertiary">
              +{Math.round((t.startOffsetMs ?? 0) / 1000)}s
            </span>
          </li>
        ))}
        {tracks.length === 0 && <li className="font-ui text-sm text-text-tertiary">No tracks yet.</li>}
      </ol>
      <AddTrackForm classId={cls.id} onAdded={onTrackAdded} />
    </div>
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
