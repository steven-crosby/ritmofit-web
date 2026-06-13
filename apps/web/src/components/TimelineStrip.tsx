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
  /** Left edge as a percentage of the assembled total. */
  leftPct: number;
  /** Width as a percentage of the assembled total. */
  widthPct: number;
  /** 0-based index in the track list (display is `position + 1`). */
  position: number;
};

export type TimelineMarker = {
  key: string;
  leftPct: number;
  kind: 'cue' | 'move';
  /** Absolute time on the class timeline (ms from start). */
  absMs: number;
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
      leftPct: (startMs / totalDurationMs) * 100,
      widthPct: (dur / totalDurationMs) * 100,
      position: i,
    });
    t.cues.forEach((cue, ci) => {
      const absMs = startMs + clamp(cue.anchorMs, 0, dur);
      markers.push({
        key: `c-${i}-${ci}`,
        leftPct: (absMs / totalDurationMs) * 100,
        kind: 'cue',
        absMs,
        label: cue.text,
        color: cue.color ?? null,
      });
    });
    t.moves.forEach((mv, mi) => {
      const absMs = startMs + clamp(mv.anchorMs, 0, dur);
      markers.push({
        key: `m-${i}-${mi}`,
        leftPct: (absMs / totalDurationMs) * 100,
        kind: 'move',
        absMs,
        label: mv.name,
        color: mv.intensity ? `var(--rf-color-intensity-${mv.intensity})` : null,
      });
    });
    startMs += dur;
  });
  return { blocks, markers };
}

export function TimelineStrip({ payload }: { payload: RunPayload }) {
  const { blocks, markers } = computeTimeline(payload.tracks, payload.class.totalDurationMs);
  if (blocks.length === 0) return null;

  const cueCount = markers.filter((m) => m.kind === 'cue').length;
  const moveCount = markers.length - cueCount;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const summary = `Timeline: ${plural(blocks.length, 'track')}, ${plural(cueCount, 'cue')}, ${plural(moveCount, 'move')}`;

  return (
    <figure className="mt-2 flex flex-col gap-1">
      <figcaption className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
        Timeline
      </figcaption>
      <div role="img" aria-label={summary} className="relative h-10 w-full rounded-card bg-bg-base">
        {/* Track blocks — the upper band, numbered, divided by quiet rules. */}
        {blocks.map((b) => (
          <div
            key={b.position}
            aria-hidden
            className="absolute top-0 flex h-5 items-center justify-center overflow-hidden border-l border-interactive/15 first:border-l-0"
            style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
          >
            <span className="font-data text-[10px] text-text-tertiary">{b.position + 1}</span>
          </div>
        ))}
        {/* Markers — the lower band. ▲ cue / ◆ move; shape distinguishes kind, color reinforces. */}
        {markers.map((m) => (
          <span
            key={m.key}
            className="absolute bottom-0 -translate-x-1/2 font-data text-[11px] leading-none text-text-secondary"
            style={{ left: `${m.leftPct}%`, color: m.color ?? undefined }}
            title={`${m.kind} ${formatDuration(m.absMs)} — ${m.label}`}
            aria-label={`${m.kind} at ${formatDuration(m.absMs)}: ${m.label}`}
          >
            {m.kind === 'cue' ? '▲' : '◆'}
          </span>
        ))}
      </div>
    </figure>
  );
}
