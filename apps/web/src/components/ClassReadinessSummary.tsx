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
import type { ClassReadiness, ReadinessKey, ReadinessLevel } from '../lib/readiness.js';

const GLYPH: Record<ReadinessLevel, string> = {
  ready: '✓',
  attention: '!',
  blocked: '!',
};

/** Friendly noun per dimension, for an action-bearing fix-chip label. */
const DIMENSION_NOUN: Record<ReadinessKey, string> = {
  duration: 'duration',
  tempo: 'tempo',
  choreography: 'cues and moves',
  music: 'music',
};

function headline(readiness: ClassReadiness): { text: string; tone: string } {
  if (!readiness.runnable) return { text: 'Not ready for Live', tone: 'text-state-caution' };
  if (readiness.fullyReady) return { text: 'Ready to run live', tone: 'text-state-positive' };
  const n = readiness.attentionCount;
  return { text: `Runnable · ${n} to finish`, tone: 'text-text-secondary' };
}

export function ClassReadinessSummary({
  readiness,
  canEdit,
  onSelectTrack,
}: {
  readiness: ClassReadiness;
  canEdit: boolean;
  /** Jump the inspector to a flagged track so the gap can be fixed in place. */
  onSelectTrack: (classTrackId: string) => void;
}) {
  const head = headline(readiness);
  return (
    <section
      aria-label="Class readiness"
      className="flex flex-col gap-2 rounded-card border border-interactive/15 bg-bg-base p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">
          Readiness
        </span>
        <span className={`font-data text-xs ${head.tone}`}>{head.text}</span>
      </div>
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
                <div className="ml-6 flex flex-wrap gap-1.5">
                  {d.tracks.map((t) => (
                    <button
                      key={t.classTrackId}
                      type="button"
                      // Action-bearing name so a screen-reader/keyboard user can tell
                      // this fix-chip apart from the identically-titled track row, and
                      // knows what it does. Keeps the visible title in the name
                      // (label-in-name / voice control).
                      aria-label={`Fix ${DIMENSION_NOUN[d.key]} on ${t.track.title}`}
                      className="min-h-8 rounded-pill border border-interactive/50 px-2.5 py-0.5 font-ui text-xs text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
                      onClick={() => onSelectTrack(t.classTrackId)}
                    >
                      {t.track.title}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
