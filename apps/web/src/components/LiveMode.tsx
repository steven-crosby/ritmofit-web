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
import type { RunPayload, RunPayloadTrackEntry, Intensity } from '@ritmofit/shared';
import { IntensityReadout } from './IntensityReadout.js';

type View = 'cue' | 'list';

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** A cue or move flattened onto the class-absolute timeline. */
interface TimelineEvent {
  atMs: number; // absolute ms from class start
  kind: 'cue' | 'move';
  text: string;
  color: string | null;
  intensity: Intensity | null;
}

/** The live track for a class-absolute time: the last track whose window contains it. */
function trackAt(payload: RunPayload, elapsedMs: number): { entry: RunPayloadTrackEntry; index: number } | null {
  if (payload.tracks.length === 0) return null;
  let current = 0;
  payload.tracks.forEach((t, i) => {
    if ((t.startOffsetMs ?? 0) <= elapsedMs) current = i;
  });
  return { entry: payload.tracks[current]!, index: current };
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

  const seek = (ms: number) => {
    const clamped = Math.max(0, Math.min(ms, payload.class.totalDurationMs));
    baseRef.current = clamped;
    // Rebase the running segment to *now*, or a seek while playing would re-add the
    // time already elapsed since play started (jumping the clock forward).
    startRef.current = performance.now();
    setElapsedMs(clamped);
  };

  const live = useMemo(() => trackAt(payload, elapsedMs), [payload, elapsedMs]);
  const events = useMemo(() => (live ? eventsFor(live.entry) : []), [live]);
  const currentEvent = useMemo(() => {
    // Backward scan (events is sorted) — avoids cloning+reversing the array on every
    // animation frame while playing.
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i]!.atMs <= elapsedMs) return events[i]!;
    }
    return null;
  }, [events, elapsedMs]);
  const nextEvent = useMemo(() => events.find((e) => e.atMs > elapsedMs) ?? null, [events, elapsedMs]);

  // A track with no entered duration occupies zero timeline width, so a per-track
  // countdown would read a misleading 0:00. Track whether we have a real window.
  const trackDurationMs = live ? live.entry.track.durationMs : null;
  const trackEndMs = live ? (live.entry.startOffsetMs ?? 0) + (trackDurationMs ?? 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-base">
      <header className="flex items-center justify-between border-b border-interactive/20 px-6 py-3">
        <div>
          <h1 className="font-display text-lg font-semibold text-text-primary">{payload.class.title}</h1>
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
          />
        ) : (
          <FullList payload={payload} liveIndex={live?.index ?? -1} elapsedMs={elapsedMs} onSeek={seek} />
        )}
      </div>

      <Transport
        playing={playing}
        onToggle={() => setPlaying((p) => !p)}
        onReset={() => {
          setPlaying(false);
          seek(0);
        }}
        elapsedMs={elapsedMs}
        totalMs={payload.class.totalDurationMs}
        onSeek={seek}
      />
    </div>
  );
}

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div className="flex rounded-pill border border-interactive/30 p-0.5" role="tablist" aria-label="Prompter view">
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
}: {
  live: { entry: RunPayloadTrackEntry; index: number } | null;
  currentEvent: TimelineEvent | null;
  nextEvent: TimelineEvent | null;
  elapsedMs: number;
  trackEndMs: number;
  trackHasDuration: boolean;
  classTotalMs: number;
  playing: boolean;
}) {
  if (!live) {
    return <p className="p-8 font-ui text-text-tertiary">This class has no tracks yet.</p>;
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
          <p className="font-display text-xl font-semibold text-text-primary">{entry.track.title}</p>
          <p className="font-ui text-sm text-text-secondary">{entry.track.artist}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <IntensityReadout intensity={entry.intensity} />
          {entry.displayBpm != null && (
            <span className="font-data text-sm text-text-secondary">{entry.displayBpm} BPM</span>
          )}
        </div>
      </div>

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
        <span>{trackHasDuration ? `Track ends in ${fmt(trackEndMs - elapsedMs)}` : 'No track duration set'}</span>
        <span>Class ends in {fmt(classTotalMs - elapsedMs)}</span>
      </div>
    </div>
  );
}

function FullList({
  payload,
  liveIndex,
  elapsedMs,
  onSeek,
}: {
  payload: RunPayload;
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
              <button className="text-left" onClick={() => onSeek(start)} aria-label={`Jump to track ${i + 1}`}>
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
              </div>
            </div>
            {(t.cues.length > 0 || t.moves.length > 0) && (
              <ul className="mt-3 flex flex-col gap-1 border-t border-interactive/15 pt-2">
                {eventsFor(t).map((e, j) => {
                  const past = e.atMs <= elapsedMs && isLive;
                  return (
                    <li
                      key={j}
                      className={`flex items-center gap-2 font-ui text-sm ${past ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}
                    >
                      <span className="font-data text-xs text-text-tertiary">{fmt(e.atMs - start)}</span>
                      <span
                        className="rounded-pill px-1.5 py-0.5 font-data text-[10px] uppercase"
                        style={{
                          backgroundColor:
                            e.kind === 'cue'
                              ? (e.color ?? 'var(--rf-color-interactive)')
                              : 'var(--rf-color-bg-base)',
                          color: e.kind === 'cue' ? 'var(--rf-color-text-on-accent)' : undefined,
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
  elapsedMs,
  totalMs,
  onSeek,
}: {
  playing: boolean;
  onToggle: () => void;
  onReset: () => void;
  elapsedMs: number;
  totalMs: number;
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
      <input
        type="range"
        min={0}
        max={Math.max(1, totalMs)}
        value={elapsedMs}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 accent-brand"
        aria-label="Seek class timeline"
      />
    </div>
  );
}
