import { useCallback, useEffect, useState } from 'react';
import type { ClassWithAccess, RunPayload } from '@ritmofit/shared';
import { getRunPayload, copyClass } from '../lib/api.js';
import { Dialog } from './Dialog.js';
import { formatDuration, avgBpm } from '../lib/class-summary.js';
import { useAsyncAction } from '../lib/use-async-action.js';

export function ClassSummaryView({
  classId,
  onClose,
  onCopied,
}: {
  classId: string;
  onClose: () => void;
  onCopied: (cls: ClassWithAccess) => void;
}) {
  const [payload, setPayload] = useState<RunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { busy: saving, run: saveCopy } = useAsyncAction(setError);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getRunPayload(classId);
      setPayload(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (payload?.class?.title) {
      document.title = `Preview: ${payload.class.title} - RitmoFit`;
    }
  }, [payload]);

  const handleSaveCopy = () => {
    void saveCopy(async () => {
      const cls = await copyClass(classId);
      onCopied({ ...cls, accessLevel: 'owner' });
    });
  };

  const averageBpm = payload ? avgBpm(payload) : null;

  return (
    <Dialog
      onClose={onClose}
      label="Class Summary"
      panelClassName="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl font-semibold text-text-primary">
            {payload ? payload.class.title : 'Loading…'}
          </h2>
          {payload && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-text-secondary">
              <span>{payload.tracks.length} tracks</span>
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
              <span>{formatDuration(payload.class.totalDurationMs)} total</span>
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
          )}
        </div>
        <button
          className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
          onClick={onClose}
          aria-label="Close summary dialog"
        >
          ✕
        </button>
      </header>

      {error && (
        <p className="font-ui text-sm text-state-danger" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="font-ui text-sm text-text-tertiary">Loading class details…</p>
      ) : payload ? (
        <div className="flex flex-col gap-4 overflow-y-auto">
          <div className="flex justify-between items-center bg-bg-base p-4 rounded-card">
            <div className="min-w-0 flex-1">
              <p className="font-ui text-sm text-text-secondary">
                To view cues, moves, and edit this class, you must save a copy to your library.
              </p>
            </div>
            <button
              className="ml-4 shrink-0 rounded-pill rf-btn-primary px-4 py-2 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
              onClick={handleSaveCopy}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save a copy'}
            </button>
          </div>
          <ol className="flex flex-col gap-2">
            {payload.tracks.map((t, i) => (
              <li
                key={t.classTrackId}
                className="flex items-center gap-3 rounded-card bg-bg-base px-3 py-2 text-left"
              >
                <span className="w-5 shrink-0 font-data text-xs text-text-tertiary">{i + 1}</span>
                {t.track.albumArtUrl ? (
                  <img
                    src={t.track.albumArtUrl}
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
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-sm font-semibold text-text-primary">
                    {t.track.title}
                  </p>
                  <p className="truncate font-ui text-xs text-text-secondary">{t.track.artist}</p>
                </div>
                {t.displayBpm != null && (
                  <span className="shrink-0 font-data text-sm text-text-secondary">
                    {t.displayBpm}
                    <span className="ml-1 text-xs text-text-tertiary">BPM</span>
                  </span>
                )}
                <span className="shrink-0 font-data text-xs text-text-tertiary">
                  {t.track.durationMs != null ? formatDuration(t.track.durationMs) : '--:--'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Dialog>
  );
}
