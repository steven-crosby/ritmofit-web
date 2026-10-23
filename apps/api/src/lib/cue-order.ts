/**
 * Next teaching-order slot for a song's cue list. A null max (no rows yet)
 * starts at 0. The builder lists by this; the run payload does not read it.
 */
export function nextCuePosition(maxPosition: number | null): number {
  return (maxPosition ?? -1) + 1;
}

/** Blank or whitespace notes are unset. The move name stays in `text`. */
export function cueNote(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
