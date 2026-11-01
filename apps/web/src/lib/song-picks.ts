/**
 * Music › Songs pick mode (RF-151). The Songs list is always in pick mode: a row
 * tap ticks the song, up to the 15 a class takes, and "Create a class" turns the
 * ticked songs into the class blocks.
 *
 * The selection belongs to one provider account. Search, Load more and sort only
 * change which rows are visible, so they keep it; switching provider, a
 * disconnect or a different account changes the scope and clears it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PLAYLIST_SONG_BLOCK_CAP, type TrackSearchResult } from '@ritmofit/shared';

/** The most songs a class takes, the same cap as a playlist's song blocks. */
export const SONG_PICK_CAP = PLAYLIST_SONG_BLOCK_CAP;

export const songPickKey = (track: TrackSearchResult) =>
  `${track.provider}:${track.providerTrackId}`;

export type SongPicks = { scope: string | null; tracks: TrackSearchResult[] };

/**
 * Whose list the selection belongs to: the provider plus the connected account,
 * or null while the provider is not connected (nothing can be picked).
 */
export function songPickScope(
  provider: string,
  connected: boolean,
  connection: { id: string; providerUserId: string | null } | undefined,
): string | null {
  if (!connected || !connection) return null;
  return `${provider}:${connection.providerUserId ?? connection.id}`;
}

/** The picks that still belong to `scope`; picks from another scope count as none. */
export function picksInScope(picks: SongPicks, scope: string | null): TrackSearchResult[] {
  return scope !== null && picks.scope === scope ? picks.tracks : [];
}

/** Tick or untick `track`. A tick past the cap is refused; an untick always works. */
export function togglePick(
  picks: SongPicks,
  scope: string | null,
  track: TrackSearchResult,
  cap = SONG_PICK_CAP,
): SongPicks {
  if (scope === null) return picks;
  const current = picksInScope(picks, scope);
  const key = songPickKey(track);
  if (current.some((pick) => songPickKey(pick) === key)) {
    return { scope, tracks: current.filter((pick) => songPickKey(pick) !== key) };
  }
  if (current.length >= cap) return { scope, tracks: current };
  return { scope, tracks: [...current, track] };
}

/**
 * The picks in the order the list shows them (`listOrder` is the whole loaded
 * list in its current sort). A pick the list does not hold, such as an Apple
 * Music search result past the loaded pages, follows in the order it was ticked.
 */
export function orderPicks(
  picks: readonly TrackSearchResult[],
  listOrder: readonly TrackSearchResult[],
): TrackSearchResult[] {
  const position = new Map(listOrder.map((track, index) => [songPickKey(track), index]));
  const listed = picks.filter((pick) => position.has(songPickKey(pick)));
  const unlisted = picks.filter((pick) => !position.has(songPickKey(pick)));
  listed.sort((a, b) => position.get(songPickKey(a))! - position.get(songPickKey(b))!);
  return [...listed, ...unlisted];
}

/** The pick-mode selection for one scope; a scope change clears it. */
export function useSongPicks(scope: string | null, cap = SONG_PICK_CAP) {
  const [picks, setPicks] = useState<SongPicks>({ scope, tracks: [] });
  useEffect(() => {
    // Also clears on a disconnect (scope null), so reconnecting starts empty.
    setPicks((current) => (current.scope === scope ? current : { scope, tracks: [] }));
  }, [scope]);
  const tracks = picksInScope(picks, scope);
  const keys = useMemo(() => new Set(tracks.map(songPickKey)), [tracks]);
  const toggle = useCallback(
    (track: TrackSearchResult) => setPicks((current) => togglePick(current, scope, track, cap)),
    [scope, cap],
  );
  const clear = useCallback(() => setPicks({ scope, tracks: [] }), [scope]);
  return { tracks, keys, toggle, clear, full: tracks.length >= cap, cap };
}
