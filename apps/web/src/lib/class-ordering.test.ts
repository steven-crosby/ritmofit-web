import { describe, expect, it } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  CLASS_ORDERING_OPTIONS,
  DEFAULT_CLASS_ORDERING,
  classNextStep,
  isClassOrdering,
  orderClassesBy,
  orderingSummary,
  type ClassDetailState,
} from './class-ordering.js';

function track(over: Partial<RunPayloadTrackEntry> = {}): RunPayloadTrackEntry {
  return {
    classTrackId: 'ct-1',
    position: 0,
    intensity: 'hard',
    track: { durationMs: 60_000 },
    providerRefs: [{ provider: 'spotify' }],
    cues: [{ id: 'cue-1' }],
    moves: [{ id: 'move-1' }],
    displayBpm: 128,
    ...over,
  } as unknown as RunPayloadTrackEntry;
}

function ready(...tracks: RunPayloadTrackEntry[]): ClassDetailState {
  return {
    status: 'ready',
    payload: {
      class: { title: 'Class', totalDurationMs: 60_000 * tracks.length },
      tracks,
    } as unknown as RunPayload,
  };
}

/** A class with nothing outstanding: durations, tempo, choreography, and music. */
const teachable = ready(track(), track({ classTrackId: 'ct-2', position: 1 }));
/** Runnable, but no BPM anywhere. */
const noTempo = ready(track({ displayBpm: null }));
/** Runnable, tempo present, but no cues or moves. */
const noChoreography = ready(track({ cues: [], moves: [] }));
/** Not runnable — a track has no length. */
const noDuration = ready(track({ track: { durationMs: null } as never }));
const emptyDraft = ready();

describe('classNextStep', () => {
  it('names the specific gap rather than a generic next step', () => {
    expect(classNextStep(teachable).action).toBe('Open class');
    expect(classNextStep(noTempo).action).toBe('Add the missing tempo');
    expect(classNextStep(noChoreography).action).toBe('Add cues and moves');
    expect(classNextStep(noDuration).action).toBe('Set track durations');
    expect(classNextStep(emptyDraft).action).toBe('Add the first track');
  });

  it('reports teachability only when every dimension is ready', () => {
    expect(classNextStep(teachable).teachable).toBe(true);
    expect(classNextStep(noTempo).teachable).toBe(false);
    expect(classNextStep(emptyDraft).teachable).toBe(false);
  });

  it('mirrors the two orderings across every known state', () => {
    for (const state of [teachable, noTempo, noChoreography, noDuration, emptyDraft]) {
      const step = classNextStep(state);
      expect(step.teachRank).toBe(4 - step.workRank);
    }
  });

  it('sinks a class it could not read in both orderings rather than guessing', () => {
    const loading = classNextStep({ status: 'loading' });
    const failed = classNextStep({ status: 'error' });
    const best = classNextStep(teachable);
    const worst = classNextStep(emptyDraft);
    for (const unknown of [loading, failed]) {
      expect(unknown.workRank).toBeGreaterThan(worst.workRank);
      expect(unknown.teachRank).toBeGreaterThan(best.teachRank);
    }
  });
});

describe('orderClassesBy', () => {
  const classes = [
    { id: 'empty', title: 'Empty draft', updatedAt: 5 },
    { id: 'teachable', title: 'Finished class', updatedAt: 1 },
    { id: 'tempo', title: 'Missing tempo', updatedAt: 3 },
  ];
  const states: Record<string, ClassDetailState> = {
    empty: emptyDraft,
    teachable,
    tempo: noTempo,
  };
  const stepFor = (cls: { id: string }) => classNextStep(states[cls.id]);

  it('puts the most run-ready class first under "ready to teach"', () => {
    expect(orderClassesBy('ready_to_teach', classes, stepFor).map((cls) => cls.id)).toEqual([
      'teachable',
      'tempo',
      'empty',
    ]);
  });

  it('puts the least-finished class first under "needs work"', () => {
    expect(orderClassesBy('needs_work', classes, stepFor).map((cls) => cls.id)).toEqual([
      'empty',
      'tempo',
      'teachable',
    ]);
  });

  it('breaks ties on recency then title, and never mutates its input', () => {
    const tied = [
      { id: 'b', title: 'Beta', updatedAt: 2 },
      { id: 'a', title: 'Alpha', updatedAt: 2 },
      { id: 'c', title: 'Gamma', updatedAt: 9 },
    ];
    const snapshot = [...tied];
    const ordered = orderClassesBy('ready_to_teach', tied, () => classNextStep(teachable));
    expect(ordered.map((cls) => cls.id)).toEqual(['c', 'a', 'b']);
    expect(tied).toEqual(snapshot);
  });
});

describe('ordering vocabulary', () => {
  it('defaults to teaching readiness and keeps "needs work" available', () => {
    expect(DEFAULT_CLASS_ORDERING).toBe('ready_to_teach');
    expect(CLASS_ORDERING_OPTIONS.map((option) => option.value)).toEqual([
      'ready_to_teach',
      'needs_work',
    ]);
  });

  it('states the active ordering in words', () => {
    expect(orderingSummary('ready_to_teach')).toContain('ready to teach');
    expect(orderingSummary('needs_work')).toContain('next creative step');
  });

  it('rejects anything that is not an ordering', () => {
    expect(isClassOrdering('ready_to_teach')).toBe(true);
    expect(isClassOrdering('recently_updated')).toBe(false);
    expect(isClassOrdering(null)).toBe(false);
  });
});
