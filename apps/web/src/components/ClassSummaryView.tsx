import { useCallback, useEffect, useState } from 'react';
import type { ClassWithAccess, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { getRunPayload, copyClass } from '../lib/api.js';
import { Dialog } from './Dialog.js';
import { formatDuration, avgBpm } from '../lib/class-summary.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { SEGMENT_META } from './SegmentBand.js';
import { INTENSITY_LABEL } from './IntensityReadout.js';

/**
 * Read-only class detail — the full class shape (songs, plus each track's placed
 * moves and cues, plus the section/energy bands) without entering the builder. Used
 * two ways:
 *  - Explore public preview: pass `onCopied`; the CTA saves a copy into the library.
 *  - Owned-class preview (from a Library card): pass `onOpenInBuilder`; the CTA opens
 *    the class in the editor.
 * All data comes from the existing run-payload — no new API.
 */
export function ClassSummaryView({
  classId,
  onClose,
  onCopied,
  onOpenInBuilder,
}: {
  classId: string;
  onClose: () => void;
  /** Explore preview — save a copy of this (public) class into the library. */
  onCopied?: (cls: ClassWithAccess) => void;
  /** Owned preview — open this class in the builder to edit it. */
  onOpenInBuilder?: () => void;
}) {
  const [payload, setPayload] = useState<RunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { busy: saving, run: saveCopy } = useAsyncAction(setError);
  const owned = onOpenInBuilder != null;

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
      onCopied?.({ ...cls, accessLevel: 'owner' });
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
          <div className="flex items-center justify-between gap-3 rounded-card bg-bg-base p-4">
            <p className="min-w-0 flex-1 font-ui text-sm text-text-secondary">
              {owned
                ? 'Read-only preview — songs, moves, cues, and sections at a glance.'
                : 'Read-only preview. Save a copy to your library to edit it.'}
            </p>
            {owned ? (
              <button
                className="shrink-0 rounded-pill rf-btn-primary px-4 py-2 font-ui text-sm font-semibold text-text-on-accent"
                onClick={onOpenInBuilder}
              >
                Open in builder
              </button>
            ) : (
              <button
                className="shrink-0 rounded-pill rf-btn-primary px-4 py-2 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
                onClick={handleSaveCopy}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save a copy'}
              </button>
            )}
          </div>

          {/* Section / energy bands (read-only): label + start time, tint dot reinforces
              the color (never color alone). */}
          {payload.sections.length > 0 && (
            <div>
              <p className="mb-1.5 font-ui text-xs uppercase tracking-wide text-text-tertiary">
                Sections
              </p>
              <ul className="flex flex-wrap gap-2">
                {payload.sections.map((s, i) => (
                  <li
                    key={`${s.type}-${s.startOffsetMs}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-bg-base px-2.5 py-1 font-ui text-xs text-text-secondary"
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: SEGMENT_META[s.type].tint }}
                    />
                    <span className="text-text-primary">{SEGMENT_META[s.type].label}</span>
                    <span className="font-data text-text-tertiary">
                      {formatDuration(s.startOffsetMs)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className="flex flex-col gap-2">
            {payload.tracks.map((t, i) => (
              <TrackDetailRow key={t.classTrackId} entry={t} index={i} />
            ))}
          </ol>
        </div>
      ) : null}
    </Dialog>
  );
}

/** One read-only track row: song line, then its placed moves and cues (if any). */
function TrackDetailRow({ entry, index }: { entry: RunPayloadTrackEntry; index: number }) {
  const { track, moves, cues } = entry;
  return (
    <li className="flex flex-col gap-2 rounded-card bg-bg-base px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 font-data text-xs text-text-tertiary">{index + 1}</span>
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-raised text-text-tertiary"
            aria-hidden
          >
            ♪
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-sm font-semibold text-text-primary">{track.title}</p>
          <p className="truncate font-ui text-xs text-text-secondary">{track.artist}</p>
        </div>
        {entry.displayBpm != null && (
          <span className="shrink-0 font-data text-sm text-text-secondary">
            {entry.displayBpm}
            <span className="ml-1 text-xs text-text-tertiary">BPM</span>
          </span>
        )}
        <span className="shrink-0 font-data text-xs text-text-tertiary">
          {track.durationMs != null ? formatDuration(track.durationMs) : '--:--'}
        </span>
      </div>

      {/* Placed moves — name + time, with intensity when set. */}
      {moves.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pl-8">
          {moves.map((m) => (
            <li
              key={m.id}
              className="inline-flex items-center gap-1 rounded-pill bg-bg-raised px-2 py-0.5 font-ui text-xs text-text-secondary"
            >
              <span className="text-text-primary">{m.name}</span>
              <span className="font-data text-text-tertiary">{formatDuration(m.anchorMs)}</span>
              {m.intensity && m.intensity !== 'none' && (
                <span className="text-text-tertiary">· {INTENSITY_LABEL[m.intensity]}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Cues — text + time, with a color dot when one is set (never color alone). */}
      {cues.length > 0 && (
        <ul className="flex flex-col gap-0.5 pl-8">
          {cues.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5 font-ui text-xs text-text-tertiary">
              {c.color && (
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
              )}
              <span className="min-w-0 truncate text-text-secondary">{c.text}</span>
              <span className="shrink-0 font-data text-text-tertiary">
                {formatDuration(c.anchorMs)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
