// Realistic run-payload fixtures for the design-sync preview cards. Shaped to
// the @ritmofit/shared RunPayload contract (see packages/shared/src/entities/
// run-payload.ts). A spin/HIIT class whose intensities trace a full energy arc
// (easy → mod → hard → all-out → recovery → easy) so the visualizations read.
import type { RunPayload, Intensity } from '@ritmofit/shared';

type Entry = RunPayload['tracks'][number];

let seq = 0;
const uuid = (p: string) => `${p}0000000-0000-4000-8000-${String(seq++).padStart(12, '0')}`;

function track(
  intensity: Intensity,
  durationMs: number,
  title: string,
  artist: string,
  opts: {
    bpm?: number;
    cues?: { atMs: number; text: string; color?: string }[];
    moves?: { atMs: number; name: string; intensity?: Intensity }[];
  } = {},
): Entry {
  const position = seq;
  return {
    classTrackId: uuid('c'),
    position,
    displayBpm: opts.bpm ?? null,
    intensity,
    startOffsetMs: null,
    notes: null,
    track: {
      id: uuid('1'),
      title,
      artist,
      durationMs,
      albumArtUrl: null,
    },
    providerRefs: [],
    cues: (opts.cues ?? []).map((c) => ({
      id: uuid('a'),
      anchorMs: c.atMs,
      beat: null,
      bar: null,
      text: c.text,
      color: c.color ?? null,
    })),
    moves: (opts.moves ?? []).map((m) => ({
      id: uuid('b'),
      anchorMs: m.atMs,
      name: m.name,
      intensity: m.intensity ?? null,
    })),
  };
}

const min = (m: number) => m * 60_000;

const tracks: Entry[] = [
  track('easy', min(3), 'Slow Burn', 'Nova Sound', {
    bpm: 102,
    cues: [{ atMs: min(0.5), text: 'Find your pace', color: '#E07E3C' }],
  }),
  track('mod', min(4), 'Uphill', 'Kasai', {
    bpm: 128,
    moves: [{ atMs: min(1), name: 'Standing climb', intensity: 'mod' }],
  }),
  track('hard', min(4), 'Summit Push', 'Vela', {
    bpm: 140,
    cues: [{ atMs: min(2), text: 'Add resistance' }],
    moves: [{ atMs: min(3), name: 'Heavy climb', intensity: 'hard' }],
  }),
  track('all_out', min(3), 'Redline', 'Ember Kit', {
    bpm: 158,
    cues: [{ atMs: min(0.75), text: 'All out — leave it here' }],
    moves: [{ atMs: min(1.5), name: 'Seated sprint', intensity: 'all_out' }],
  }),
  track('mod', min(3), 'Cooldown Groove', 'Lune', { bpm: 120 }),
  track('easy', min(2), 'Float', 'Mira', {
    bpm: 92,
    cues: [{ atMs: min(0.5), text: 'Stretch it out' }],
  }),
];

const totalDurationMs = tracks.reduce((sum, t) => sum + (t.track.durationMs ?? 0), 0);

export const demoClass: RunPayload = {
  schemaVersion: 1,
  class: {
    id: uuid('f'),
    title: 'Sunset Climb',
    template: null,
    targetDurationMs: totalDurationMs,
    totalDurationMs,
  },
  tracks,
  sections: [
    { type: 'warm_up', startOffsetMs: 0 },
    { type: 'climb', startOffsetMs: min(3) },
    { type: 'sprint', startOffsetMs: min(11) },
    { type: 'recovery', startOffsetMs: min(14) },
    { type: 'cool_down', startOffsetMs: min(17) },
  ],
};

export const DEMO_TOTAL_MS = totalDurationMs;
