/** The track-relative playback window a class-track plays. `endMs` is null when the
 *  track length is unknown and no explicit clip end bounds it. */
export interface ClipWindow {
  startMs: number;
  endMs: number | null;
}

/**
 * Resolve the effective playback window for one class-track placement. The window
 * is `[startMs, endMs)` in **track-relative** ms, bounded by the resolved base
 * length (`durationMsOverride ?? trackDurationMs`): a clip end never runs past the
 * base, and `endMs` is null only when the length is unknown and no clip end is set.
 */
export function resolveClipWindow(
  trackDurationMs: number | null,
  durationMsOverride: number | null,
  clipStartMs: number | null = 0,
  clipEndMs: number | null = null,
): ClipWindow {
  const base = durationMsOverride ?? trackDurationMs; // null = unknown length
  const startMs = clipStartMs ?? 0;
  const rawEnd = clipEndMs ?? base;
  const endMs = rawEnd == null ? null : base == null ? rawEnd : Math.min(rawEnd, base);
  return { startMs, endMs };
}

/**
 * Resolve the duration used by one class-track timeline entry — the length of its
 * playback window (`endMs − startMs`), clamped non-negative. Null (unknown) when the
 * window has no known end. With no clip args this is just `durationMsOverride ??
 * trackDurationMs`, so existing callers are unaffected.
 */
export function effectiveDurationMs(
  trackDurationMs: number | null,
  durationMsOverride: number | null,
  clipStartMs: number | null = 0,
  clipEndMs: number | null = null,
): number | null {
  const { startMs, endMs } = resolveClipWindow(
    trackDurationMs,
    durationMsOverride,
    clipStartMs,
    clipEndMs,
  );
  return endMs == null ? null : Math.max(0, endMs - startMs);
}

/**
 * Guard a clip window against a `clipStartMs` at or past the resolved base length
 * (`durationMsOverride ?? trackDurationMs`). Such a start collapses the playback
 * window to zero, which makes the run-payload's `track.durationMs` non-positive and
 * fails `runPayloadSchema.parse` — bricking the entire class's run-payload (the
 * builder timeline AND Live mode), not just the one track. The DB CHECK only
 * enforces `clipEndMs > clipStartMs`, so this invariant has to live in the route.
 * Returns a user-facing message when invalid, or null when the window is fine (or
 * the base length is unknown, in which case any start is permitted).
 */
export function clipStartBeyondTrack(
  trackDurationMs: number | null,
  durationMsOverride: number | null,
  clipStartMs: number | null = 0,
): string | null {
  const base = durationMsOverride ?? trackDurationMs;
  if (base == null) return null;
  const startMs = clipStartMs ?? 0;
  if (startMs >= base) {
    return `Clip start must be before the track length (${base}ms).`;
  }
  return null;
}

/**
 * Guard the clip window's cross-field invariant: an explicit `clipEndMs` must be
 * strictly greater than `clipStartMs` (a null end runs to the effective end and is
 * always fine). This mirrors the DB CHECK `clip_end_ms > clip_start_ms`, which the
 * flat request schema can't express (the two fields are validated independently), so
 * without this guard an inverted or zero-width window slips past validation and the
 * CHECK rejects the write as an unhandled 500 instead of a clean 422. Returns a
 * user-facing message when invalid, or null when the window is fine.
 */
export function clipWindowInverted(
  clipStartMs: number | null = 0,
  clipEndMs: number | null = null,
): string | null {
  if (clipEndMs == null) return null;
  const startMs = clipStartMs ?? 0;
  if (clipEndMs <= startMs) {
    return `Clip end (${clipEndMs}ms) must be after the clip start (${startMs}ms).`;
  }
  return null;
}
