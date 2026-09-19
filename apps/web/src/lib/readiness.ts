/**
 * Class readiness — the builder/Live "is this class ready to run?" model
 * (redesign prescription §3/§8 readiness-is-state; brutal-critique P0 #2).
 * Derived entirely from the run-payload (no new schema), so it is a pure,
 * unit-testable function.
 *
 * Four dimensions, matching the four things an instructor must trust before
 * class:
 *   • DURATION — the class clock; the one hard run gate (mirrors `canRunPayload`).
 *   • TEMPO — display BPM, which drives the beat pulse and tempo identity
 *     (rhythm-system §1–2). Missing BPM turns the pulse off.
 *   • CHOREOGRAPHY — cues + placed moves; the instructor's guidance. Without
 *     them Live is a bare prompter.
 *   • MUSIC — a provider link per track so Live can play audio rather than run
 *     prompter-only.
 *
 * Only DURATION is `blocked` (it prevents Run live). The other three are
 * `attention` states: the class can still run, but the instructor sees exactly
 * what is incomplete instead of discovering it on stage.
 *
 * NOTE on MUSIC: builder-level readiness asks only "does the track carry a
 * provider reference?" — the stronger "is a *connected* provider available to
 * play it?" check is Live preflight's job (it needs the connections fetch, see
 * `LivePreflight.tsx`). Keeping the two distinct is deliberate so they never
 * contradict each other.
 */
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { tracksMissingDuration } from './duration.js';

export type ReadinessLevel = 'ready' | 'attention' | 'blocked';
export type ReadinessKey = 'duration' | 'tempo' | 'choreography' | 'music';

export type ReadinessDimension = {
  key: ReadinessKey;
  level: ReadinessLevel;
  /** Short state label in Ritmo Studio voice (prescription §9). */
  label: string;
  /** One-line impact/fix hint. */
  detail: string;
  /** Tracks this dimension flags, for click-to-fix chips (empty when ready). */
  tracks: RunPayloadTrackEntry[];
};

export type ClassReadiness = {
  /** Ordered for display: duration, tempo, choreography, music. */
  dimensions: ReadinessDimension[];
  /** Live can start at all — the duration gate (mirrors `canRunPayload`). */
  runnable: boolean;
  /** All four dimensions are ready. */
  fullyReady: boolean;
  /** Dimensions not yet ready (attention + blocked). */
  attentionCount: number;
};

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export function classReadiness(payload: RunPayload): ClassReadiness {
  const tracks = payload.tracks;
  const count = tracks.length;

  // 1) DURATION — the hard run gate (single source of truth: duration.ts).
  const missingDuration = tracksMissingDuration(payload);
  const duration: ReadinessDimension =
    count === 0
      ? {
          key: 'duration',
          level: 'blocked',
          label: 'Add a track to begin',
          detail: 'Live needs at least one track to run.',
          tracks: [],
        }
      : missingDuration.length > 0
        ? {
            key: 'duration',
            level: 'blocked',
            label: 'Duration needed',
            detail: `Live can’t start until every track has a length (${plural(missingDuration.length, 'track')} left).`,
            tracks: missingDuration,
          }
        : {
            key: 'duration',
            level: 'ready',
            label: 'Durations set',
            detail: 'The class clock is complete.',
            tracks: [],
          };

  // 2) TEMPO — display BPM drives the beat pulse + tempo identity (10-rhythm §1–2).
  // The labels say "BPM", not "pulse": "pulse" is an animation in canon and the
  // word already names the Class Pulse chart on the same screen, so spending it
  // on the tempo gap made a reader guess which one was off.
  const missingBpm = tracks.filter((t) => t.displayBpm == null);
  const tempo: ReadinessDimension =
    // No tracks, or every track has a BPM → nothing to flag. An empty class's one
    // action ("add a track") is the duration dimension's job, so tempo/music/
    // choreography stay neutral rather than warning about zero tracks.
    missingBpm.length === 0
      ? {
          key: 'tempo',
          level: 'ready',
          label: 'BPM set on every track',
          detail: 'Live can keep the beat.',
          tracks: [],
        }
      : missingBpm.length === count
        ? {
            key: 'tempo',
            level: 'attention',
            label: 'No BPM set',
            detail: 'Add BPM so the class keeps time — without it Live shows no beat.',
            tracks: missingBpm,
          }
        : {
            key: 'tempo',
            level: 'attention',
            label: `BPM missing on ${plural(missingBpm.length, 'track')}`,
            detail: 'Add BPM so the class keeps time — those tracks run with no beat.',
            tracks: missingBpm,
          };

  // 3) CHOREOGRAPHY — cues + placed moves (the instructor's guidance). The `?? 0`
  // guards keep readiness from ever crashing the header on a partially-hydrated
  // payload; a real run-payload always carries these arrays (zod-validated).
  const cueCount = tracks.reduce((n, t) => n + (t.cues?.length ?? 0), 0);
  const moveCount = tracks.reduce((n, t) => n + (t.moves?.length ?? 0), 0);
  const choreography: ReadinessDimension =
    count === 0 || cueCount + moveCount > 0
      ? {
          key: 'choreography',
          level: 'ready',
          label: 'Cues & moves set',
          detail: `${plural(cueCount, 'cue')} · ${plural(moveCount, 'move')} anchored on the timeline.`,
          tracks: [],
        }
      : {
          key: 'choreography',
          level: 'attention',
          label: 'No cues or moves yet',
          detail: 'Live will show tracks and time only — nothing to call out.',
          tracks: [],
        };

  // 4) MUSIC — a provider link per track (builder-level; see file header note).
  const missingProvider = tracks.filter((t) => (t.providerRefs?.length ?? 0) === 0);
  const music: ReadinessDimension =
    missingProvider.length === 0
      ? {
          key: 'music',
          level: 'ready',
          label: 'Music ready',
          detail: 'Every track is linked to a music service Live can play.',
          tracks: [],
        }
      : missingProvider.length === count
        ? {
            key: 'music',
            level: 'attention',
            label: 'No music linked',
            detail: 'Live will run on the clock with no audio. Link tracks to a music service.',
            tracks: missingProvider,
          }
        : {
            key: 'music',
            level: 'attention',
            label: `No music on ${plural(missingProvider.length, 'track')}`,
            detail: 'Those tracks run silent in Live. Link them to a music service.',
            tracks: missingProvider,
          };

  const dimensions = [duration, tempo, choreography, music];
  return {
    dimensions,
    runnable: duration.level === 'ready',
    fullyReady: dimensions.every((d) => d.level === 'ready'),
    attentionCount: dimensions.filter((d) => d.level !== 'ready').length,
  };
}
