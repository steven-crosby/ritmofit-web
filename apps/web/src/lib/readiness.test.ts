import { describe, expect, it } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { classReadiness, type ReadinessKey, type ReadinessLevel } from './readiness.js';

/** Loose override — `track` may be partial (fixtures only care about title/duration). */
type EntryOverride = Partial<Omit<RunPayloadTrackEntry, 'track'>> & {
  track?: { title?: string; durationMs?: number | null };
};

/** A fully-shaped run-payload track entry; override only what a case cares about. */
function entry(over: EntryOverride = {}): RunPayloadTrackEntry {
  return {
    classTrackId: over.classTrackId ?? 'ct-1',
    displayBpm: over.displayBpm ?? null,
    cues: over.cues ?? [],
    moves: over.moves ?? [],
    providerRefs: over.providerRefs ?? [],
    track: {
      title: over.track?.title ?? 'Track',
      // Preserve an explicit `null` (a track missing its duration); only default
      // when the case didn't specify one.
      durationMs: over.track && 'durationMs' in over.track ? over.track.durationMs : 180000,
    },
  } as unknown as RunPayloadTrackEntry;
}

function payload(...tracks: RunPayloadTrackEntry[]): RunPayload {
  return { tracks } as RunPayload;
}

/** Pull one dimension by key for terse assertions. */
const dim = (p: RunPayload, key: ReadinessKey) =>
  classReadiness(p).dimensions.find((d) => d.key === key)!;

/** A track that is complete on every dimension. */
const readyTrack = (over: Partial<RunPayloadTrackEntry> = {}) =>
  entry({
    displayBpm: 128,
    cues: [{ id: 'c1' }] as RunPayloadTrackEntry['cues'],
    moves: [{ id: 'm1' }] as RunPayloadTrackEntry['moves'],
    providerRefs: [{ provider: 'soundcloud' }] as RunPayloadTrackEntry['providerRefs'],
    ...over,
  });

describe('classReadiness — dimensions', () => {
  it('reports every dimension ready for a complete class', () => {
    const r = classReadiness(payload(readyTrack()));
    expect(r.runnable).toBe(true);
    expect(r.fullyReady).toBe(true);
    expect(r.attentionCount).toBe(0);
    expect(r.dimensions.map((d) => d.level)).toEqual<ReadinessLevel[]>([
      'ready',
      'ready',
      'ready',
      'ready',
    ]);
  });

  it('blocks on duration and lists the tracks that need one', () => {
    const p = payload(
      readyTrack({ classTrackId: 'a' }),
      entry({ classTrackId: 'b', track: { title: 'No Length', durationMs: null } }),
    );
    const duration = dim(p, 'duration');
    expect(duration.level).toBe('blocked');
    expect(duration.tracks.map((t) => t.classTrackId)).toEqual(['b']);
    expect(classReadiness(p).runnable).toBe(false);
  });

  it('treats an empty class as blocked, not crashy', () => {
    const duration = dim(payload(), 'duration');
    expect(duration.level).toBe('blocked');
    expect(duration.label).toMatch(/add a track/i);
  });

  it('flags tempo off when no track has a BPM and incomplete when some do', () => {
    const allMissing = dim(payload(entry(), entry()), 'tempo');
    expect(allMissing.level).toBe('attention');
    expect(allMissing.label).toMatch(/tempo missing — pulse off/i);
    expect(allMissing.tracks).toHaveLength(2);

    const some = dim(payload(entry({ displayBpm: 120 }), entry()), 'tempo');
    expect(some.level).toBe('attention');
    expect(some.label).toMatch(/tempo incomplete/i);
    expect(some.tracks).toHaveLength(1);

    expect(dim(payload(entry({ displayBpm: 120 })), 'tempo').level).toBe('ready');
  });

  it('flags choreography until at least one cue or move is anchored', () => {
    expect(dim(payload(entry()), 'choreography').level).toBe('attention');
    expect(
      dim(
        payload(entry({ moves: [{ id: 'm1' }] as RunPayloadTrackEntry['moves'] })),
        'choreography',
      ).level,
    ).toBe('ready');
  });

  it('flags music as prompter-only until every track carries a provider ref', () => {
    const none = dim(payload(entry()), 'music');
    expect(none.level).toBe('attention');
    expect(none.label).toMatch(/prompter only/i);

    const some = dim(
      payload(
        entry({
          providerRefs: [{ provider: 'soundcloud' }] as RunPayloadTrackEntry['providerRefs'],
        }),
        entry(),
      ),
      'music',
    );
    expect(some.level).toBe('attention');
    expect(some.tracks).toHaveLength(1);
  });

  it('can be runnable while still needing attention on softer dimensions', () => {
    // Durations set, but no BPM / cues / provider — runnable, not fully ready.
    const r = classReadiness(payload(entry({ track: { title: 'T', durationMs: 200000 } })));
    expect(r.runnable).toBe(true);
    expect(r.fullyReady).toBe(false);
    expect(r.attentionCount).toBe(3);
  });
});
