import { describe, it, expect } from 'vitest';
import {
  providerRefKey,
  resolveCopiedTrack,
  resolveTrackForClassCopy,
  refsToClone,
  remapPlacedMoveForCaller,
} from './copy-class-track.js';

describe('resolveTrackForClassCopy', () => {
  it('clones a foreign track only on first encounter, reusing the clone after', () => {
    const memo = new Map<string, string>();
    const first = resolveTrackForClassCopy({
      sourceTrackId: 't1',
      sourceTrackOwnerId: 'alice',
      callerId: 'me',
      newTrackId: 'clone1',
      memo,
    });
    expect(first).toEqual({ trackId: 'clone1', cloneTrack: true });

    // A second class_track pointing at the same foreign track reuses the clone and
    // does NOT clone again (a second newTrackId is ignored).
    const second = resolveTrackForClassCopy({
      sourceTrackId: 't1',
      sourceTrackOwnerId: 'alice',
      callerId: 'me',
      newTrackId: 'clone2_ignored',
      memo,
    });
    expect(second).toEqual({ trackId: 'clone1', cloneTrack: false });
  });

  it('reuses the caller`s own track without cloning, and memoizes it', () => {
    const memo = new Map<string, string>();
    const a = resolveTrackForClassCopy({
      sourceTrackId: 't2',
      sourceTrackOwnerId: 'me',
      callerId: 'me',
      newTrackId: 'unused',
      memo,
    });
    expect(a).toEqual({ trackId: 't2', cloneTrack: false });
    const b = resolveTrackForClassCopy({
      sourceTrackId: 't2',
      sourceTrackOwnerId: 'me',
      callerId: 'me',
      newTrackId: 'unused2',
      memo,
    });
    expect(b).toEqual({ trackId: 't2', cloneTrack: false });
  });

  it('clones two distinct foreign tracks independently', () => {
    const memo = new Map<string, string>();
    expect(
      resolveTrackForClassCopy({ sourceTrackId: 'tA', sourceTrackOwnerId: 'x', callerId: 'me', newTrackId: 'cA', memo }),
    ).toEqual({ trackId: 'cA', cloneTrack: true });
    expect(
      resolveTrackForClassCopy({ sourceTrackId: 'tB', sourceTrackOwnerId: 'x', callerId: 'me', newTrackId: 'cB', memo }),
    ).toEqual({ trackId: 'cB', cloneTrack: true });
  });
});

describe('resolveCopiedTrack', () => {
  it('reuses the caller`s own track (no clone)', () => {
    expect(
      resolveCopiedTrack({ sourceTrackId: 't1', sourceTrackOwnerId: 'me', callerId: 'me', newTrackId: 'new' }),
    ).toEqual({ trackId: 't1', cloneTrack: false });
  });

  it('clones a foreign track into the caller`s library under the new id', () => {
    expect(
      resolveCopiedTrack({ sourceTrackId: 't1', sourceTrackOwnerId: 'alice', callerId: 'me', newTrackId: 'new' }),
    ).toEqual({ trackId: 'new', cloneTrack: true });
  });

  it('reuses the id (no clone) when the source owner is unknown — fail loud on the FK', () => {
    expect(
      resolveCopiedTrack({ sourceTrackId: 't1', sourceTrackOwnerId: null, callerId: 'me', newTrackId: 'new' }),
    ).toEqual({ trackId: 't1', cloneTrack: false });
  });
});

describe('refsToClone', () => {
  const refs = [
    { provider: 'soundcloud' as const, providerTrackId: 's1', extra: 1 },
    { provider: 'spotify' as const, providerTrackId: 'sp1', extra: 2 },
  ];

  it('keeps refs the caller does not already own', () => {
    expect(refsToClone(refs, new Set())).toEqual(refs);
  });

  it('drops refs the caller already owns (owner-scoped unique index would reject them)', () => {
    const owned = new Set([providerRefKey('soundcloud', 's1')]);
    expect(refsToClone(refs, owned)).toEqual([refs[1]]);
  });

  it('drops all when the caller owns every ref', () => {
    const owned = new Set([providerRefKey('soundcloud', 's1'), providerRefKey('spotify', 'sp1')]);
    expect(refsToClone(refs, owned)).toEqual([]);
  });
});

describe('remapPlacedMoveForCaller', () => {
  const me = 'me';
  const userMoves = new Map([
    ['mine', { userId: 'me', name: 'My Move' }],
    ['hers', { userId: 'alice', name: 'Her Move' }],
  ]);

  it('passes through a placement with no user_move ref', () => {
    expect(remapPlacedMoveForCaller({ userMoveId: null, nameOverride: 'freeform' }, me, userMoves)).toEqual({
      userMoveId: null,
      nameOverride: 'freeform',
    });
  });

  it('keeps the caller`s own user_move ref unchanged', () => {
    expect(remapPlacedMoveForCaller({ userMoveId: 'mine', nameOverride: null }, me, userMoves)).toEqual({
      userMoveId: 'mine',
      nameOverride: null,
    });
  });

  it('drops a foreign user_move ref and snapshots its name into nameOverride', () => {
    expect(remapPlacedMoveForCaller({ userMoveId: 'hers', nameOverride: null }, me, userMoves)).toEqual({
      userMoveId: null,
      nameOverride: 'Her Move',
    });
  });

  it('prefers an existing nameOverride over the snapshot when dropping a foreign ref', () => {
    expect(remapPlacedMoveForCaller({ userMoveId: 'hers', nameOverride: 'kept' }, me, userMoves)).toEqual({
      userMoveId: null,
      nameOverride: 'kept',
    });
  });

  it('drops a dangling user_move ref (not in the map) with no name to fall back to', () => {
    expect(remapPlacedMoveForCaller({ userMoveId: 'gone', nameOverride: null }, me, userMoves)).toEqual({
      userMoveId: null,
      nameOverride: null,
    });
  });
});
