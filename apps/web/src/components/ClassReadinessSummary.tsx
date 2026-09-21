/**
 * Class readiness summary (redesign prescription §3 "readiness is state",
 * brutal-critique P0 #2). A glanceable instrument panel in the builder header
 * that tells the instructor what is ready before Live — duration, tempo,
 * cues/moves, and music — and what still needs attention, instead of that
 * surfacing only once they're on stage.
 *
 * State is encoded by glyph + word + severity, never color alone (design system
 * 07/11): the label itself always names the state ("set" / "ready" / "missing" /
 * "needed"). Only the duration gate is `blocked` — it prevents Run live,
 * mirroring `canRunPayload`; the rest are `attention`, so the class can still
 * run. Ready dimensions stay quiet (one line); anything needing attention
 * expands with its impact and click-to-fix track chips.
 *
 * Warnings use the caution channel only (design system 10 §Visual — amber for
 * readiness gaps, no new accent channel). Plasma/danger are never spent here.
 */
import { useState } from 'react';
import type {
  ClassReadiness,
  ReadinessDimension,
  ReadinessKey,
  ReadinessLevel,
} from '../lib/readiness.js';

const GLYPH: Record<ReadinessLevel, string> = {
  ready: '✓',
  attention: '!',
  blocked: '!',
};

/** Friendly noun per dimension, for an action-bearing fix-chip label. */
const DIMENSION_NOUN: Record<ReadinessKey, string> = {
  duration: 'length',
  tempo: 'BPM',
  choreography: 'cues and moves',
  music: 'music',
};

/**
 * Lead-in for the chip row. The same track can appear on tempo and music because
 * those are two jobs — this names the job so "Solo" twice is not the same chip.
 */
const FIX_LEADIN: Record<ReadinessKey, string> = {
  duration: 'Open to set length:',
  tempo: 'Open to add BPM:',
  choreography: 'Open to write cues:',
  music: 'Open to link music:',
};

/**
 * The status in plain words. "Runnable · 2 to finish" made the reader decode two
 * pieces of jargon at once — whether "runnable" meant it *had* run, and what the
 * count was counting.
 */
function headline(
  readiness: ClassReadiness,
  planLead?: string | null,
): { text: string; tone: string } {
  if (planLead) return { text: planLead, tone: 'text-state-caution' };
  if (!readiness.runnable) return { text: 'Not ready for Live', tone: 'text-state-caution' };
  if (readiness.fullyReady)
    return { text: 'Class shape ready · take it live', tone: 'text-state-positive' };
  const n = readiness.attentionCount;
  return {
    text: `Can run live · ${n} ${n === 1 ? 'thing' : 'things'} left`,
    tone: 'text-text-secondary',
  };
}

export function ClassReadinessSummary({
  readiness = null,
  canEdit,
  onSelectTrack,
  onStartChoreography,
  planLead = null,
  compact = false,
}: {
  readiness?: ClassReadiness | null;
  canEdit: boolean;
  compact?: boolean;
  /** Planning next step when the class has blocks. Leads the Live headline. */
  planLead?: string | null;
  /** Jump the inspector to a flagged track so the gap can be fixed in place. */
  onSelectTrack: (classTrackId: string) => void;
  /**
   * Open the first track's cue entry. Cues and moves have no flagged track to
   * jump to, so without this the row could only describe the gap — and an
   * instructor who has never planned a class cannot act on a description of
   * something she has not seen yet.
   */
  onStartChoreography?: () => void;
}) {
  if (planLead && !readiness) {
    return (
      <section
        aria-label="Class next step"
        className="flex flex-col gap-2 rounded-card border border-interactive/15 bg-bg-base p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
            Next step
          </span>
          <span className="font-data text-xs text-state-caution">{planLead}</span>
        </div>
      </section>
    );
  }
  if (!readiness) return null;

  const head = headline(readiness, planLead);
  const hideLiveBody = Boolean(planLead);
  return (
    <section
      aria-label={hideLiveBody ? 'Class next step' : 'Class readiness'}
      className="flex flex-col gap-2 rounded-card border border-interactive/15 bg-bg-base p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
          {hideLiveBody ? 'Next step' : 'Readiness'}
        </span>
        <span className={`font-data text-xs ${head.tone}`}>{head.text}</span>
      </div>
      {!hideLiveBody && (
        <p className="font-ui text-xs text-text-tertiary">
          What Live needs from this class before you run it.
        </p>
      )}
      {!hideLiveBody && (
        <ul className="flex flex-col gap-1.5">
          {readiness.dimensions.map((d) => {
            const ready = d.level === 'ready';
            return (
              <li key={d.key} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span
                    aria-hidden
                    className={`font-data text-sm leading-5 ${ready ? 'text-state-positive' : 'text-state-caution'}`}
                  >
                    {GLYPH[d.level]}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`font-ui text-sm ${ready ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}
                    >
                      {d.label}
                      {d.level === 'blocked' && (
                        <span className="ml-2 whitespace-nowrap rounded-pill bg-state-caution/15 px-1.5 py-0.5 font-data text-[10px] uppercase tracking-wide text-state-caution">
                          Blocks Live
                        </span>
                      )}
                    </p>
                    {!ready && <p className="font-ui text-xs text-text-tertiary">{d.detail}</p>}
                  </div>
                </div>
                {canEdit && d.tracks.length > 0 && (
                  <FixChips
                    dimension={d}
                    collapseAfter={compact ? 2 : null}
                    onSelectTrack={onSelectTrack}
                  />
                )}
                {canEdit && !ready && d.key === 'choreography' && onStartChoreography && (
                  <div className="ml-6 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onStartChoreography}
                      className="min-h-11 rounded-control border border-interactive/50 px-2.5 font-ui text-xs text-interactive transition-colors hover:bg-interactive/10 rf-focus-ring sm:rounded-pill"
                    >
                      Write the first cue
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * The click-to-fix chips for one dimension. A bare row of track titles read as
 * labels, so it never said that clicking one opens that track in the inspector —
 * the lead-in now names the action, and the overflow ("+7 more") is a real
 * button that shows the rest instead of a dead count.
 */
function FixChips({
  dimension,
  collapseAfter,
  onSelectTrack,
}: {
  dimension: ReadinessDimension;
  /** Show at most this many chips until expanded; null shows all of them. */
  collapseAfter: number | null;
  onSelectTrack: (classTrackId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const limit = collapseAfter == null || expanded ? dimension.tracks.length : collapseAfter;
  const visible = dimension.tracks.slice(0, limit);
  const hidden = dimension.tracks.length - visible.length;
  const noun = DIMENSION_NOUN[dimension.key];
  return (
    <div className="ml-6 flex flex-wrap items-center gap-1.5">
      <span className="font-ui text-xs text-text-tertiary">{FIX_LEADIN[dimension.key]}</span>
      {visible.map((t) => (
        <button
          key={t.classTrackId}
          type="button"
          // Action-bearing name so a screen-reader/keyboard user can tell
          // this fix-chip apart from the identically-titled track row, and
          // knows what it does. Keeps the visible title in the name
          // (label-in-name / voice control).
          aria-label={`Fix ${noun} on ${t.track.title}`}
          title={`Open ${t.track.title} in the track inspector`}
          className="min-h-11 rounded-control border border-interactive/50 px-2.5 font-ui text-xs text-interactive transition-colors hover:bg-interactive/10 rf-focus-ring sm:rounded-pill"
          onClick={() => onSelectTrack(t.classTrackId)}
        >
          {t.track.title}
        </button>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`Show ${hidden} more ${hidden === 1 ? 'track' : 'tracks'} to fix ${noun}`}
          className="min-h-11 rounded-control px-2 font-ui text-xs text-interactive underline underline-offset-2 hover:bg-interactive/10 rf-focus-ring sm:rounded-pill"
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
}
