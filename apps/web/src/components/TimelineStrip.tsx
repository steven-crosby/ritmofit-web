/**
 * The timeline strip (design system `09-class-builder-guidelines.md`): a thin band
 * beneath the energy ribbon that shares its time axis — proportional track blocks
 * with cue (▲) and placed-move (◆) markers at their absolute time. Cues and moves
 * are **distinct shapes**, not just colors (09: "distinct shapes/icons, not just
 * colors"); color is decorative reinforcement, and the shape + position + title
 * carry the meaning. Derived entirely from the run-payload — no new schema.
 *
 * Static (no playhead): the playhead + on-beat pulse are a Live concern, rationed
 * away from the planning surface (deferred). Read-only this slice — it reflects
 * edits made in the inspector after a reload.
 */
import { type RunPayload } from '@ritmofit/shared';
import { formatDuration } from '../lib/class-summary.js';

export type TimelineBlock = {
  /** The class_track this block represents (for click-to-select). */
  classTrackId: string;
  /** Left edge as a percentage of the assembled total. */
  leftPct: number;
  /** Width as a percentage of the assembled total. */
  widthPct: number;
  /** 0-based index in the track list (display is `position + 1`). */
  position: number;
};

export type TimelineMarker = {
  key: string;
  /** The cue / placed-move id (run-payload), so a row correlates uniquely even
   *  when two markers share an `anchorMs`. */
  id: string;
  /** The class_track this marker sits on (for click-to-select). */
  classTrackId: string;
  /** 0-based index of the marker's track (display is `position + 1`). */
  position: number;
  leftPct: number;
  kind: 'cue' | 'move';
  /** Absolute time on the class timeline (ms from start). */
  absMs: number;
  /** In-track anchor (ms from the track's start) — correlates to the inspector row. */
  anchorMs: number;
  /** Cue text or move name (resolved server-side in the run-payload). */
  label: string;
  /** A ready-to-use CSS color (cue tag hex / move intensity var), or null. */
  color: string | null;
};

export type Timeline = { blocks: TimelineBlock[]; markers: TimelineMarker[] };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Pure geometry: lay tracks out by their share of the assembled total (same math
 * as `computeRibbonSegments`, so the strip lines up under the ribbon), and place
 * each track's cues/moves at `trackStart + clamp(anchorMs, 0, trackDuration)`.
 * A null/zero-duration track contributes no block and drops its markers (they
 * can't be positioned on a time axis). Returns empty when there's nothing to draw.
 */
export function computeTimeline(tracks: RunPayload['tracks'], totalDurationMs: number): Timeline {
  if (totalDurationMs <= 0) return { blocks: [], markers: [] };
  const blocks: TimelineBlock[] = [];
  const markers: TimelineMarker[] = [];
  let startMs = 0;
  tracks.forEach((t, i) => {
    const dur = t.track.durationMs ?? 0;
    if (dur <= 0) return;
    blocks.push({
      classTrackId: t.classTrackId,
      leftPct: (startMs / totalDurationMs) * 100,
      widthPct: (dur / totalDurationMs) * 100,
      position: i,
    });
    t.cues.forEach((cue, ci) => {
      const anchorMs = clamp(cue.anchorMs, 0, dur);
      const absMs = startMs + anchorMs;
      markers.push({
        key: `c-${i}-${ci}`,
        id: cue.id,
        classTrackId: t.classTrackId,
        position: i,
        leftPct: (absMs / totalDurationMs) * 100,
        kind: 'cue',
        absMs,
        anchorMs,
        label: cue.text,
        color: cue.color ?? null,
      });
    });
    t.moves.forEach((mv, mi) => {
      const anchorMs = clamp(mv.anchorMs, 0, dur);
      const absMs = startMs + anchorMs;
      markers.push({
        key: `m-${i}-${mi}`,
        id: mv.id,
        classTrackId: t.classTrackId,
        position: i,
        leftPct: (absMs / totalDurationMs) * 100,
        kind: 'move',
        absMs,
        anchorMs,
        label: mv.name,
        color: mv.intensity ? `var(--rf-color-intensity-${mv.intensity})` : null,
      });
    });
    startMs += dur;
  });
  return { blocks, markers };
}

export function TimelineStrip({
  payload,
  selectedTrackId = null,
  onSelectTrack,
}: {
  payload: RunPayload;
  /** The class_track currently open in the inspector — its block is highlighted. */
  selectedTrackId?: string | null;
  /**
   * Click/keyboard-select a track from the timeline (opens it in the inspector).
   * A marker click also passes its `{ kind, id, anchorMs }` so the inspector can
   * focus the matching cue/move row (by `id`, with `anchorMs` as a fallback); a
   * block click passes no marker.
   */
  onSelectTrack?: (
    classTrackId: string,
    marker?: { kind: 'cue' | 'move'; id: string; anchorMs: number },
  ) => void;
}) {
  const { blocks, markers } = computeTimeline(payload.tracks, payload.class.totalDurationMs);
  if (blocks.length === 0) return null;

  const cueCount = markers.filter((m) => m.kind === 'cue').length;
  const moveCount = markers.length - cueCount;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const summary = `Timeline: ${plural(blocks.length, 'track')}, ${plural(cueCount, 'cue')}, ${plural(moveCount, 'move')}`;
  const interactive = !!onSelectTrack;

  return (
    <figure className="mt-2 flex flex-col gap-1">
      <figcaption className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
        Timeline
      </figcaption>
      <div
        role={interactive ? undefined : 'img'}
        aria-label={interactive ? undefined : summary}
        className="relative h-10 w-full rounded-card bg-bg-base"
      >
        {/* Track blocks — the upper band, numbered, divided by quiet rules. Click to
            open the track in the inspector; the open track's block is ringed. */}
        {blocks.map((b) => {
          const selected = b.classTrackId === selectedTrackId;
          const ring = selected ? 'ring-2 ring-interactive' : '';
          const style = { left: `${b.leftPct}%`, width: `${b.widthPct}%` };
          const inner = <span className="font-data text-[10px] text-text-tertiary">{b.position + 1}</span>;
          return interactive ? (
            <button
              key={b.position}
              type="button"
              aria-pressed={selected}
              aria-label={`Select track ${b.position + 1}`}
              onClick={() => onSelectTrack(b.classTrackId)}
              style={style}
              className={`absolute top-0 flex h-5 items-center justify-center overflow-hidden rounded-sm border-l border-interactive/15 first:border-l-0 hover:bg-bg-raised ${ring}`}
            >
              {inner}
            </button>
          ) : (
            <div
              key={b.position}
              aria-hidden
              style={style}
              className={`absolute top-0 flex h-5 items-center justify-center overflow-hidden border-l border-interactive/15 first:border-l-0 ${ring}`}
            >
              {inner}
            </div>
          );
        })}
        {/* Markers — the lower band. ▲ cue / ◆ move; shape distinguishes kind, color reinforces.
            The clickable hit area is padded around the small glyph. */}
        {markers.map((m) => {
          const glyph = (
            <span className="font-data text-[11px] leading-none" style={{ color: m.color ?? undefined }}>
              {m.kind === 'cue' ? '▲' : '◆'}
            </span>
          );
          const tip = `${m.kind} ${formatDuration(m.absMs)} — ${m.label}`;
          return interactive ? (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelectTrack(m.classTrackId, { kind: m.kind, id: m.id, anchorMs: m.anchorMs })}
              style={{ left: `${m.leftPct}%` }}
              title={tip}
              aria-label={`${m.kind} at ${formatDuration(m.absMs)}: ${m.label}, select track ${m.position + 1}`}
              className="absolute bottom-0 -translate-x-1/2 px-1 py-0.5 text-text-secondary"
            >
              {glyph}
            </button>
          ) : (
            <span
              key={m.key}
              className="absolute bottom-0 -translate-x-1/2 text-text-secondary"
              style={{ left: `${m.leftPct}%` }}
              title={tip}
              aria-label={`${m.kind} at ${formatDuration(m.absMs)}: ${m.label}`}
            >
              {glyph}
            </span>
          );
        })}
      </div>
    </figure>
  );
}
