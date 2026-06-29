/**
 * M3 live mode — the cue prompter the instructor runs a class against, consuming
 * the hardened run-payload (one fetch). It does NOT play audio (the three music
 * rules: playback stays in the provider apps) — it's a synchronized prompter +
 * interval timer over the class timeline.
 *
 * A single virtual clock (`elapsedMs`) drives everything: which track is live,
 * the current/next cue, the countdowns, and the intensity readout. Two views:
 * Cue-by-Cue (one big current cue + what's next) and Full List (the whole
 * timeline). Intensity is redundantly encoded (color + label + filled bars) per
 * the accessibility rules — never color alone.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { RunPayload, RunPayloadTrackEntry, Intensity, SegmentType } from '@ritmofit/shared';
import { PROVIDER_ORDER, providerHandoffHref, providerLabel } from '../lib/providers.js';
import { useWakeLock } from '../lib/use-wake-lock.js';
import { IntensityReadout } from './IntensityReadout.js';
import { LiveTimeline } from './LiveTimeline.js';
import { SEGMENT_META, SegmentIcon } from './SegmentBand.js';

type View = 'cue' | 'list';

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** A cue or move flattened onto the class-absolute timeline. */
export interface TimelineEvent {
  atMs: number; // absolute ms from class start
  kind: 'cue' | 'move';
  text: string;
  color: string | null;
  intensity: Intensity | null;
}

/** Stable empty reference so a track-less / pre-roll frame doesn't churn memos. */
const NO_EVENTS: TimelineEvent[] = [];

function ProviderHandoffLinks({ entry }: { entry: RunPayloadTrackEntry }) {
  const refs = PROVIDER_ORDER.flatMap((provider) => {
    const ref = entry.providerRefs.find((candidate) => candidate.provider === provider);
    const href = providerHandoffHref(provider, ref?.providerUri ?? null);
    return href ? [{ provider, href }] : [];
  });
  if (refs.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label={`Open ${entry.track.title} in a music provider`}
    >
      {refs.map(({ provider, href }) => (
        <a
          key={provider}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${entry.track.title} in ${providerLabel(provider)}`}
          className="inline-flex min-h-11 items-center rounded-pill border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
        >
          Open in {providerLabel(provider)}
        </a>
      ))}
    </nav>
  );
}

/**
 * Index of the live track for a class-absolute time: the last track whose start
 * offset has been reached, or `0` before the first track's offset. Returns `-1`
 * only for an empty class. A primitive index (not a fresh object) so frame-rate
 * memos that depend on "which track" don't invalidate while the index is stable.
 */
export function trackIndexAt(payload: RunPayload, elapsedMs: number): number {
  if (payload.tracks.length === 0) return -1;
  let current = 0;
  payload.tracks.forEach((t, i) => {
    if ((t.startOffsetMs ?? 0) <= elapsedMs) current = i;
  });
  return current;
}

/**
 * Index of the last event at or before `t` (or `-1`), via binary search over the
 * `atMs`-sorted list. With ties it returns the last of the equal run, matching the
 * prior backward linear scan. The next event is simply the following index.
 */
export function lastAtOrBefore(events: TimelineEvent[], t: number): number {
  let lo = 0;
  let hi = events.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid]!.atMs <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/** All cues + moves of a track as class-absolute events, time-ordered. */
function eventsFor(entry: RunPayloadTrackEntry): TimelineEvent[] {
  const base = entry.startOffsetMs ?? 0;
  const cues: TimelineEvent[] = entry.cues.map((c) => ({
    atMs: base + c.anchorMs,
    kind: 'cue',
    text: c.text,
    color: c.color,
    intensity: null,
  }));
  const moves: TimelineEvent[] = entry.moves.map((m) => ({
    atMs: base + m.anchorMs,
    kind: 'move',
    text: m.name,
    color: null,
    intensity: m.intensity,
  }));
  return [...cues, ...moves].sort((a, b) => a.atMs - b.atMs);
}

/** The active section + the one after it, for the live energy-arc indicator. */
export interface LiveSection {
  type: SegmentType;
  /** The next section ahead (null when the current one runs to the class end). */
  next: { type: SegmentType; inMs: number } | null;
}

/**
 * The section band active at a class-absolute time: the last section whose start
 * has been reached, or `null` before the first section (a leading gap with no
 * band) or when the class has no sections. Defensively sorts by `startOffsetMs`
 * so an unordered payload still resolves correctly.
 */
export function liveSectionAt(
  sections: RunPayload['sections'],
  elapsedMs: number,
): LiveSection | null {
  if (sections.length === 0) return null;
  const sorted = [...sections].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
  let idx = -1;
  sorted.forEach((s, i) => {
    if (s.startOffsetMs <= elapsedMs) idx = i;
  });
  if (idx < 0) return null; // before the first section
  const upcoming = sorted[idx + 1];
  return {
    type: sorted[idx]!.type,
    next: upcoming ? { type: upcoming.type, inMs: upcoming.startOffsetMs - elapsedMs } : null,
  };
}

/**
 * The compact live energy-arc indicator: a slim, full-width band under the header
 * naming the current section (icon + tint + label, never color alone) and, when a
 * later section is ahead, a muted countdown to it. View-independent (shows in both
 * Cue-by-Cue and Full List) so the instructor always knows where they are in the
 * arc. Static — no motion to gate under reduced-motion.
 */
function LiveSectionBar({ section }: { section: LiveSection }) {
  const meta = SEGMENT_META[section.type];
  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-interactive/15 px-6 py-2"
      aria-label={`Current section: ${meta.label}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span style={{ color: meta.tint }}>
          <SegmentIcon type={section.type} />
        </span>
        <span className="truncate font-ui text-sm font-semibold text-text-secondary">
          {meta.label}
        </span>
      </span>
      {section.next && (
        <span className="shrink-0 font-data text-xs text-text-tertiary">
          {SEGMENT_META[section.next.type].label} in {fmt(section.next.inMs)}
        </span>
      )}
    </div>
  );
}

export function LiveMode({ payload, onExit }: { payload: RunPayload; onExit: () => void }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<View>('cue');

  // Virtual clock: accumulate real time only while playing, via rAF.
  const baseRef = useRef(0); // elapsed banked before the current play segment
  const startRef = useRef(0); // performance.now() when the segment began
  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const live = baseRef.current + (performance.now() - startRef.current);
      const capped = Math.min(live, payload.class.totalDurationMs);
      setElapsedMs(capped);
      if (capped >= payload.class.totalDurationMs) {
        baseRef.current = payload.class.totalDurationMs;
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      baseRef.current += performance.now() - startRef.current;
      cancelAnimationFrame(raf);
    };
  }, [playing, payload.class.totalDurationMs]);

  // Keep the studio screen awake while the class is running.
  useWakeLock(playing);

  const seek = (ms: number) => {
    const clamped = Math.max(0, Math.min(ms, payload.class.totalDurationMs));
    baseRef.current = clamped;
    // Rebase the running segment to *now*, or a seek while playing would re-add the
    // time already elapsed since play started (jumping the clock forward).
    startRef.current = performance.now();
    setElapsedMs(clamped);
  };

  // Flatten + sort each track's cues/moves once per payload, not on every animation
  // frame. The frame-rate clock only changes *which* index we read, never these arrays.
  const eventsByTrack = useMemo(() => payload.tracks.map(eventsFor), [payload]);
  const liveIndex = useMemo(() => trackIndexAt(payload, elapsedMs), [payload, elapsedMs]);
  const live = useMemo(
    () => (liveIndex >= 0 ? { entry: payload.tracks[liveIndex]!, index: liveIndex } : null),
    [payload, liveIndex],
  );
  const events = liveIndex >= 0 ? eventsByTrack[liveIndex]! : NO_EVENTS;
  // One binary search over the stable, pre-sorted array yields both current and next.
  const { currentEvent, nextEvent } = useMemo(() => {
    const i = lastAtOrBefore(events, elapsedMs);
    return {
      currentEvent: i >= 0 ? events[i]! : null,
      nextEvent: i + 1 < events.length ? events[i + 1]! : null,
    };
  }, [events, elapsedMs]);

  // A track with no entered duration occupies zero timeline width, so a per-track
  // countdown would read a misleading 0:00. Track whether we have a real window.
  const trackDurationMs = live ? live.entry.track.durationMs : null;
  const liveStartMs = live ? (live.entry.startOffsetMs ?? 0) : 0;
  const trackEndMs = liveStartMs + (trackDurationMs ?? 0);

  // Free-mode gaps: we're in silence either before the live track starts (leading
  // gap) or after it ends with a later track still ahead. trackIndexAt returns the
  // surrounding track in both cases, so derive the gap from its window.
  const nextEntry =
    liveIndex >= 0 && liveIndex + 1 < payload.tracks.length ? payload.tracks[liveIndex + 1] : null;
  const nextStartMs = nextEntry ? (nextEntry.startOffsetMs ?? 0) : null;
  const beforeLive = live != null && elapsedMs < liveStartMs;
  const afterLive = live != null && trackDurationMs != null && elapsedMs >= trackEndMs;
  const inGap = beforeLive || (afterLive && nextStartMs != null && elapsedMs < nextStartMs);
  const gap = inGap
    ? {
        untilMs: beforeLive ? liveStartMs : (nextStartMs ?? 0),
        nextTitle: beforeLive
          ? (live?.entry.track.title ?? null)
          : (nextEntry?.track.title ?? null),
      }
    : null;

  // Screen-reader announcement of the focal state. Built from stable values (cue
  // text, gap, end) — never the per-frame countdown — so it speaks once per change
  // rather than continuously. The live region below re-announces only when this
  // string actually changes.
  const section = useMemo(
    () => liveSectionAt(payload.sections, elapsedMs),
    [payload.sections, elapsedMs],
  );

  const ended = payload.class.totalDurationMs > 0 && elapsedMs >= payload.class.totalDurationMs;
  let announcement = '';
  if (payload.tracks.length === 0) {
    announcement = '';
  } else if (ended) {
    announcement = 'Class complete.';
  } else if (gap) {
    announcement = gap.nextTitle ? `Silence. Next track: ${gap.nextTitle}.` : 'Silence.';
  } else if (currentEvent) {
    announcement = `${currentEvent.kind === 'move' ? 'Move' : 'Cue'}: ${currentEvent.text}.`;
  } else if (live) {
    announcement = `Track ${live.index + 1}: ${live.entry.track.title}.`;
  }

  // Live runs on bg-live (ink-950, darker than bg-base) for maximum AAA contrast
  // in a dim studio — and stays dark in both themes (02/04-layout).
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-live">
      {/* The advancing cue, spoken for screen readers — the prompter's core function.
          Visually hidden; the Cue-by-Cue card carries the same content on screen. */}
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </p>
      <header className="flex items-center justify-between border-b border-interactive/20 px-6 py-3">
        <div>
          <h1 className="font-display text-lg font-semibold text-text-primary">
            {payload.class.title}
          </h1>
          <p className="font-data text-xs text-text-tertiary">
            {fmt(elapsedMs)} / {fmt(payload.class.totalDurationMs)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} setView={setView} />
          <button
            className="rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive"
            onClick={onExit}
          >
            Exit
          </button>
        </div>
      </header>

      {section && <LiveSectionBar section={section} />}

      <div className="min-h-0 flex-1 overflow-auto">
        {view === 'cue' ? (
          <CueByCue
            live={live}
            currentEvent={currentEvent}
            nextEvent={nextEvent}
            elapsedMs={elapsedMs}
            trackEndMs={trackEndMs}
            trackHasDuration={trackDurationMs != null}
            classTotalMs={payload.class.totalDurationMs}
            playing={playing}
            gap={gap}
          />
        ) : (
          <FullList
            payload={payload}
            eventsByTrack={eventsByTrack}
            liveIndex={liveIndex}
            elapsedMs={elapsedMs}
            onSeek={seek}
          />
        )}
      </div>

      <Transport
        playing={playing}
        onToggle={() => setPlaying((p) => !p)}
        onReset={() => {
          setPlaying(false);
          seek(0);
        }}
        payload={payload}
        elapsedMs={elapsedMs}
        onSeek={seek}
      />
    </div>
  );
}

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div
      className="flex rounded-pill border border-interactive/30 p-0.5"
      role="tablist"
      aria-label="Prompter view"
    >
      {(['cue', 'list'] as const).map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={view === v}
          onClick={() => setView(v)}
          className={`rounded-pill px-3 py-1 font-ui text-sm ${
            view === v ? 'bg-interactive text-text-on-accent' : 'text-text-secondary'
          }`}
        >
          {v === 'cue' ? 'Cue-by-Cue' : 'Full List'}
        </button>
      ))}
    </div>
  );
}

function CueByCue({
  live,
  currentEvent,
  nextEvent,
  elapsedMs,
  trackEndMs,
  trackHasDuration,
  classTotalMs,
  playing,
  gap,
}: {
  live: { entry: RunPayloadTrackEntry; index: number } | null;
  currentEvent: TimelineEvent | null;
  nextEvent: TimelineEvent | null;
  elapsedMs: number;
  trackEndMs: number;
  trackHasDuration: boolean;
  classTotalMs: number;
  playing: boolean;
  /** Free-mode silence between tracks: a countdown to the next track. */
  gap: { untilMs: number; nextTitle: string | null } | null;
}) {
  if (!live) {
    return <p className="p-8 font-ui text-text-tertiary">This class has no tracks yet.</p>;
  }
  if (gap) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 p-8 text-center">
        <div className="flex w-full flex-col items-center gap-1 rounded-card bg-bg-raised py-10 shadow-card">
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Silence</p>
          <p className="font-display text-3xl font-semibold text-text-secondary">
            No track playing
          </p>
        </div>
        <div className="flex w-full items-center justify-between rounded-card bg-bg-raised p-4 shadow-card">
          <div className="text-left">
            <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Next track</p>
            <p className="font-ui text-text-primary">{gap.nextTitle ?? '—'}</p>
          </div>
          <span className="font-data text-2xl text-interactive" aria-label="Time to next track">
            {fmt(gap.untilMs - elapsedMs)}
          </span>
        </div>
        <div className="flex w-full justify-end font-data text-sm text-text-tertiary">
          <span>Class ends in {fmt(classTotalMs - elapsedMs)}</span>
        </div>
      </div>
    );
  }
  const { entry } = live;
  // The on-beat pulse: the focal "Now" card breathes on the track's beat while
  // playing (design system 10). Needs a BPM to time the beat; removed under
  // reduced motion by CSS. Exactly one pulsing element on screen.
  const pulse = playing && entry.displayBpm != null;
  // "The drop" (design system 10 §5): the one big motion spend, rationed to All-Out
  // tracks. On each cue advance there, a plasma glow blooms behind the card and the
  // cue text cross-fades in. Reduced motion degrades both to an instant swap (CSS).
  const isAllOut = entry.intensity === 'all_out';
  const nowText = currentEvent ? currentEvent.text : '—';
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 p-8 text-center">
      <div className="flex w-full items-center justify-between">
        <div className="text-left">
          <p className="font-data text-xs uppercase tracking-wide text-text-tertiary">
            Track {live.index + 1}
          </p>
          <p className="font-display text-xl font-semibold text-text-primary">
            {entry.track.title}
          </p>
          <p className="font-ui text-sm text-text-secondary">{entry.track.artist}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <IntensityReadout intensity={entry.intensity} />
          {entry.displayBpm != null && (
            <span className="font-data text-sm text-text-secondary">{entry.displayBpm} BPM</span>
          )}
          {entry.displayRpm != null && (
            <span className="font-data text-sm text-text-secondary">{entry.displayRpm} RPM</span>
          )}
          {entry.holdCount != null && (
            <span className="font-data text-sm text-text-secondary">
              {entry.holdCount} {entry.holdCount === 1 ? 'Hold' : 'Holds'}
            </span>
          )}
        </div>
      </div>

      {entry.notes && (
        <div className="w-full rounded-card border border-interactive/15 p-3 text-left">
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Notes</p>
          <p className="whitespace-pre-wrap font-ui text-sm text-text-secondary">{entry.notes}</p>
        </div>
      )}

      <ProviderHandoffLinks entry={entry} />

      <div className="relative w-full">
        {/* The drop's plasma bloom — keyed on the cue so it replays per advance. */}
        {isAllOut && currentEvent && (
          <span
            key={nowText}
            aria-hidden
            className="rf-drop-bloom pointer-events-none absolute inset-0 rounded-card"
          />
        )}
        <div
          className={`relative flex w-full flex-col items-center gap-1 rounded-card bg-bg-raised py-8 shadow-card ${
            pulse ? 'rf-beat-pulse' : ''
          }`}
          style={pulse ? ({ '--rf-bpm': entry.displayBpm } as CSSProperties) : undefined}
        >
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Now</p>
          <p
            key={nowText}
            className={`font-display text-4xl font-semibold leading-tight text-text-primary ${
              isAllOut ? 'rf-drop-in' : ''
            }`}
            style={currentEvent?.color ? { color: currentEvent.color } : undefined}
          >
            {nowText}
          </p>
          {currentEvent?.kind === 'move' && currentEvent.intensity && (
            <IntensityReadout intensity={currentEvent.intensity} />
          )}
        </div>
      </div>

      <div className="flex w-full items-center justify-between rounded-card bg-bg-raised p-4 shadow-card">
        <div className="text-left">
          <p className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Next</p>
          <p className="font-ui text-text-primary">{nextEvent ? nextEvent.text : 'End of track'}</p>
        </div>
        {nextEvent && (
          <span className="font-data text-2xl text-interactive" aria-label="Time to next cue">
            {fmt(nextEvent.atMs - elapsedMs)}
          </span>
        )}
      </div>

      <div className="flex w-full justify-between font-data text-sm text-text-tertiary">
        <span>
          {trackHasDuration
            ? `Track ends in ${fmt(trackEndMs - elapsedMs)}`
            : 'No track duration set'}
        </span>
        <span>Class ends in {fmt(classTotalMs - elapsedMs)}</span>
      </div>
    </div>
  );
}

function FullList({
  payload,
  eventsByTrack,
  liveIndex,
  elapsedMs,
  onSeek,
}: {
  payload: RunPayload;
  eventsByTrack: TimelineEvent[][];
  liveIndex: number;
  elapsedMs: number;
  onSeek: (ms: number) => void;
}) {
  return (
    <ol className="mx-auto flex max-w-2xl flex-col gap-3 p-6">
      {payload.tracks.map((t, i) => {
        const start = t.startOffsetMs ?? 0;
        const isLive = i === liveIndex;
        return (
          <li
            key={t.classTrackId}
            className={`rounded-card bg-bg-raised p-4 shadow-card ${isLive ? 'ring-2 ring-interactive' : ''}`}
          >
            <div className="flex items-center justify-between">
              <button
                className="text-left"
                onClick={() => onSeek(start)}
                aria-label={`Jump to track ${i + 1}`}
              >
                <span className="font-data text-xs text-text-tertiary">
                  {fmt(start)} · #{i + 1}
                </span>
                <p className="font-display font-semibold text-text-primary">{t.track.title}</p>
                <p className="font-ui text-sm text-text-secondary">{t.track.artist}</p>
              </button>
              <div className="flex flex-col items-end gap-1">
                <IntensityReadout intensity={t.intensity} />
                {t.displayBpm != null && (
                  <span className="font-data text-xs text-text-tertiary">{t.displayBpm} BPM</span>
                )}
                {t.displayRpm != null && (
                  <span className="font-data text-xs text-text-tertiary">{t.displayRpm} RPM</span>
                )}
                {t.holdCount != null && (
                  <span className="font-data text-xs text-text-tertiary">
                    {t.holdCount} {t.holdCount === 1 ? 'Hold' : 'Holds'}
                  </span>
                )}
              </div>
            </div>
            {t.notes && (
              <p className="mt-2 whitespace-pre-wrap font-ui text-sm text-text-secondary">
                <span className="mr-1 font-ui text-xs uppercase tracking-wide text-text-tertiary">
                  Notes:
                </span>
                {t.notes}
              </p>
            )}
            {isLive && (
              <div className="mt-3 border-t border-interactive/15 pt-3">
                <ProviderHandoffLinks entry={t} />
              </div>
            )}
            {(t.cues.length > 0 || t.moves.length > 0) && (
              <ul className="mt-3 flex flex-col gap-1 border-t border-interactive/15 pt-2">
                {eventsByTrack[i]!.map((e, j) => {
                  const past = e.atMs <= elapsedMs && isLive;
                  return (
                    <li
                      key={j}
                      className={`flex items-center gap-2 font-ui text-sm ${past ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}
                    >
                      <span className="font-data text-xs text-text-tertiary">
                        {fmt(e.atMs - start)}
                      </span>
                      <span
                        className="rounded-pill px-1.5 py-0.5 font-data text-[10px] uppercase"
                        style={{
                          backgroundColor:
                            e.kind === 'cue'
                              ? (e.color ?? 'var(--rf-color-semantic-interactive-default)')
                              : 'var(--rf-color-semantic-bg-base)',
                          color:
                            e.kind === 'cue'
                              ? 'var(--rf-color-semantic-text-on-accent)'
                              : undefined,
                        }}
                      >
                        {e.kind}
                      </span>
                      <span>{e.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
      {payload.tracks.length === 0 && (
        <li className="font-ui text-text-tertiary">This class has no tracks yet.</li>
      )}
    </ol>
  );
}

function Transport({
  playing,
  onToggle,
  onReset,
  payload,
  elapsedMs,
  onSeek,
}: {
  playing: boolean;
  onToggle: () => void;
  onReset: () => void;
  payload: RunPayload;
  elapsedMs: number;
  onSeek: (ms: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-interactive/20 px-6 py-4">
      <button
        className="rounded-pill rf-btn-primary px-6 py-2 font-ui font-semibold text-text-on-accent"
        onClick={onToggle}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        className="rounded-pill border border-interactive px-4 py-2 font-ui text-sm text-interactive"
        onClick={onReset}
      >
        Reset
      </button>
      <LiveTimeline payload={payload} elapsedMs={elapsedMs} onSeek={onSeek} />
    </div>
  );
}
