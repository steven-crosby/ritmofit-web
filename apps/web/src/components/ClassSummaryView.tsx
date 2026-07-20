import { useCallback, useEffect, useState } from 'react';
import type { ClassWithAccess, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { getRunPayload, copyClass } from '../lib/api.js';
import { Dialog } from './Dialog.js';
import { formatDuration, avgBpm, formatTemplateLabel } from '../lib/class-summary.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { SEGMENT_META } from './SegmentBand.js';
import { INTENSITY_LABEL } from './IntensityReadout.js';
import { classReadiness } from '../lib/readiness.js';
import { ClassPulse } from './ClassPulse.js';
import { ClassReadinessSummary } from './ClassReadinessSummary.js';
import { RecoveryState, StatusLabel } from './SharedState.js';

/**
 * Read-only class detail — the full class shape (songs, plus each track's placed
 * moves and cues, plus the section/energy bands) without entering the builder. Used
 * two ways:
 *  - Owned-class preview (from a Library card): pass `onOpenInBuilder`; the CTA opens
 *    the class in the editor.
 *  - Dormant public-copy scaffolding: pass `onCopied`; the CTA saves a copy into
 *    the library. Not mounted in the current solo-first web product.
 * All data comes from the existing run-payload — no new API.
 */
export function ClassSummaryView({
  classId,
  onClose,
  onCopied,
  onOpenInBuilder,
  pulseConfirmed = false,
  onTogglePulseConfirmation,
}: {
  classId: string;
  onClose: () => void;
  /** Dormant public-copy mode — save a copy of this class into the library. */
  onCopied?: (cls: ClassWithAccess) => void;
  /** Owned preview — open this class in the builder to edit it. */
  onOpenInBuilder?: () => void;
  /** Ephemeral confirmation owned by the authenticated Dashboard session. */
  pulseConfirmed?: boolean;
  onTogglePulseConfirmation?: () => void;
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
      document.title = `Preview: ${payload.class.title} - Ritmo Studio`;
    }
  }, [payload]);

  const handleSaveCopy = () => {
    void saveCopy(async () => {
      const cls = await copyClass(classId);
      onCopied?.({ ...cls, accessLevel: 'owner' });
    });
  };

  const averageBpm = payload ? avgBpm(payload) : null;
  const templateLabel = payload ? formatTemplateLabel(payload.class.template) : null;
  const readiness = payload ? classReadiness(payload) : null;

  return (
    <Dialog
      onClose={onClose}
      label="Class Summary"
      panelClassName="flex max-h-[calc(100svh-2rem)] w-full max-w-4xl flex-col gap-4 rounded-panel bg-bg-raised p-4 shadow-lifted sm:p-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-data text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
            Read-only rehearsal view
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] text-text-primary sm:text-3xl">
            {payload ? payload.class.title : 'Loading class…'}
          </h2>
          {payload && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-text-secondary">
              {templateLabel && (
                <>
                  <span className="text-text-primary">{templateLabel}</span>
                  <span aria-hidden className="text-text-tertiary">
                    ·
                  </span>
                </>
              )}
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
          className="min-h-11 min-w-11 rounded-control px-2 font-ui text-sm text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
          onClick={onClose}
          aria-label="Close summary dialog"
        >
          ✕
        </button>
      </header>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="rounded-card bg-bg-sunken p-5"
        >
          <StatusLabel kind="loading" label="Loading rehearsal details" />
          <div aria-hidden="true" className="mt-4 h-24 rounded-card bg-border-subtle/50" />
        </div>
      ) : error && !payload ? (
        <RecoveryState
          compact
          kind="unavailable"
          role="alert"
          statusLabel="Rehearsal unavailable"
          title="The class summary could not load."
          event={error}
          safety="The class remains in your library, and no score or ordering changed."
          primaryAction={
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
            >
              Try rehearsal again
            </button>
          }
          secondaryAction={
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-control border border-interactive/50 px-4 font-ui text-sm font-semibold text-interactive sm:rounded-pill"
            >
              Return to Classes
            </button>
          }
        />
      ) : payload ? (
        <div className="flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div role="alert" className="rounded-card bg-bg-sunken p-3">
              <StatusLabel kind="error" label={error} />
            </div>
          )}
          <ClassPulse
            payload={payload}
            confirmed={pulseConfirmed}
            onConfirm={onTogglePulseConfirmation}
          />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            {readiness && (
              <ClassReadinessSummary
                readiness={readiness}
                canEdit={false}
                onSelectTrack={() => {}}
              />
            )}
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {owned ? (
                <button
                  className="min-h-11 shrink-0 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
                  onClick={onOpenInBuilder}
                >
                  Open in Builder
                </button>
              ) : (
                <button
                  className="min-h-11 shrink-0 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40 sm:rounded-pill"
                  onClick={handleSaveCopy}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save a copy'}
                </button>
              )}
            </div>
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

          <section aria-labelledby="summary-run-of-show">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="font-data text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  Run of show
                </p>
                <h3
                  id="summary-run-of-show"
                  className="font-display text-lg font-semibold text-text-primary"
                >
                  Track score
                </h3>
              </div>
              <span className="font-data text-xs text-text-tertiary">
                {payload.tracks.length} tracks
              </span>
            </div>
            <ol className="flex flex-col gap-2">
              {payload.tracks.map((t, i) => (
                <TrackDetailRow key={t.classTrackId} entry={t} index={i} />
              ))}
            </ol>
          </section>
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
        <span className="shrink-0 font-data text-xs text-text-secondary">
          {entry.intensity === 'none' ? 'Effort unscored' : INTENSITY_LABEL[entry.intensity]}
        </span>
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
