/**
 * The Music › Songs row player chunk (RF-172). Dashboard preloads it with the Songs
 * view and renders the loaded component, so a ▶ tap plays inside the tap; its lazy
 * player covers only a tap before the chunk lands. Its own module so a test can hold
 * back one load without holding back the other (RF-199).
 */
export const loadSongRowPreview = () =>
  import('./SongRowPreview.js').then((m) => ({ default: m.SongRowPreview }));

/** A failed preload is tried again after this wait, up to `SONG_ROW_PRELOAD_TRIES` in all. */
export const SONG_ROW_PRELOAD_RETRY_MS = 2000;
export const SONG_ROW_PRELOAD_TRIES = 3;
