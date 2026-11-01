// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { TrackSearchResult } from '@ritmofit/shared';
import {
  orderPicks,
  picksInScope,
  SONG_PICK_CAP,
  songPickScope,
  togglePick,
  useSongPicks,
  type SongPicks,
} from './song-picks.js';

const song = (id: string): TrackSearchResult => ({
  provider: 'apple_music',
  providerTrackId: id,
  providerUri: null,
  title: `Song ${id}`,
  artist: 'Artist',
  albumArtUrl: null,
  durationMs: 180_000,
});

const ids = (tracks: readonly TrackSearchResult[]) => tracks.map((t) => t.providerTrackId);

describe('songPickScope', () => {
  it('is the provider plus the account, and null while not connected', () => {
    const connection = { id: 'conn-1', providerUserId: 'user-a' };
    expect(songPickScope('spotify', true, connection)).toBe('spotify:user-a');
    expect(songPickScope('apple_music', true, { id: 'conn-2', providerUserId: null })).toBe(
      'apple_music:conn-2',
    );
    expect(songPickScope('spotify', false, connection)).toBeNull();
    expect(songPickScope('spotify', true, undefined)).toBeNull();
  });
});

describe('togglePick', () => {
  it('ticks, unticks, and refuses a tick past the cap', () => {
    let picks: SongPicks = { scope: 's', tracks: [] };
    picks = togglePick(picks, 's', song('1'));
    picks = togglePick(picks, 's', song('2'));
    expect(ids(picks.tracks)).toEqual(['1', '2']);
    picks = togglePick(picks, 's', song('1'));
    expect(ids(picks.tracks)).toEqual(['2']);

    let full: SongPicks = { scope: 's', tracks: [] };
    for (let i = 0; i < SONG_PICK_CAP; i += 1) full = togglePick(full, 's', song(`f${i}`));
    expect(togglePick(full, 's', song('extra')).tracks).toHaveLength(SONG_PICK_CAP);
    // A ticked song can still be unticked at the cap.
    expect(togglePick(full, 's', song('f0')).tracks).toHaveLength(SONG_PICK_CAP - 1);
  });

  it('starts over in a new scope and ignores ticks with no scope', () => {
    const picks: SongPicks = { scope: 'spotify:a', tracks: [song('1')] };
    expect(picksInScope(picks, 'spotify:b')).toEqual([]);
    expect(ids(togglePick(picks, 'spotify:b', song('2')).tracks)).toEqual(['2']);
    expect(togglePick(picks, null, song('2'))).toBe(picks);
  });
});

describe('orderPicks', () => {
  it('follows the list order, then appends unlisted picks in tick order', () => {
    const list = [song('a'), song('b'), song('c')];
    expect(ids(orderPicks([song('x'), song('c'), song('a'), song('y')], list))).toEqual([
      'a',
      'c',
      'x',
      'y',
    ]);
  });
});

describe('useSongPicks', () => {
  it('keeps picks within a scope and clears them when the scope changes', () => {
    const { result, rerender } = renderHook(({ scope }) => useSongPicks(scope), {
      initialProps: { scope: 'spotify:a' as string | null },
    });
    act(() => result.current.toggle(song('1')));
    expect(result.current.keys.has('apple_music:1')).toBe(true);

    rerender({ scope: null });
    expect(result.current.tracks).toEqual([]);
    // Reconnecting the same account starts empty, not with the old picks.
    rerender({ scope: 'spotify:a' });
    expect(result.current.tracks).toEqual([]);

    act(() => result.current.toggle(song('2')));
    act(() => result.current.clear());
    expect(result.current.tracks).toEqual([]);
  });

  it('reports full at the cap', () => {
    const { result } = renderHook(() => useSongPicks('s', 2));
    act(() => result.current.toggle(song('1')));
    act(() => result.current.toggle(song('2')));
    expect(result.current.full).toBe(true);
    act(() => result.current.toggle(song('3')));
    expect(result.current.tracks).toHaveLength(2);
  });
});
