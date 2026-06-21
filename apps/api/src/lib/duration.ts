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
