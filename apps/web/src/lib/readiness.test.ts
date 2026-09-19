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

  it('treats an empty class as blocked on duration only — no spurious tempo/music warnings', () => {
    const r = classReadiness(payload());
    const duration = r.dimensions.find((d) => d.key === 'duration')!;
    expect(duration.level).toBe('blocked');
    expect(duration.label).toMatch(/add a track/i);
    // The other three have nothing to assess yet, so they must not fire "attention"
    // (they'd otherwise read "No BPM set" about zero tracks).
    expect(r.dimensions.filter((d) => d.key !== 'duration').every((d) => d.level === 'ready')).toBe(
      true,
    );
    expect(r.attentionCount).toBe(1);
    expect(r.runnable).toBe(false);
  });

  it('flags tempo off when no track has a BPM and incomplete when some do', () => {
    const allMissing = dim(payload(entry(), entry()), 'tempo');
    expect(allMissing.level).toBe('attention');
    expect(allMissing.label).toMatch(/no bpm set/i);
    expect(allMissing.tracks).toHaveLength(2);

    const some = dim(payload(entry({ displayBpm: 120 }), entry()), 'tempo');
    expect(some.level).toBe('attention');
    expect(some.label).toMatch(/bpm missing on 1 track/i);
    expect(some.tracks).toHaveLength(1);

    expect(dim(payload(entry({ displayBpm: 120 })), 'tempo').level).toBe('ready');
  });

  it('states tempo and choreography gaps without the "pulse"/"prompter" shorthand', () => {
    // "pulse" names an animation in canon and the Class Pulse chart on the same
    // screen; "bare prompter" named a mode the instructor has never seen. Both
    // made the reader decode the warning before acting on it.
    const p = payload(entry(), entry());
    const words = classReadiness(p)
      .dimensions.flatMap((d) => [d.label, d.detail])
      .join(' ');
    expect(words).not.toMatch(/pulse/i);
    expect(words).not.toMatch(/prompter/i);
    expect(dim(p, 'tempo').detail).toMatch(/add bpm so the class keeps time/i);
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

  it('flags silent tracks until every track carries a provider ref', () => {
    const none = dim(payload(entry()), 'music');
    expect(none.level).toBe('attention');
    expect(none.label).toMatch(/no music linked/i);
    expect(none.detail).toMatch(/no audio/i);

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
