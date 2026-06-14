/** Resolve the duration used by one class-track timeline entry. */
export function effectiveDurationMs(
  trackDurationMs: number | null,
  durationMsOverride: number | null,
): number | null {
  return durationMsOverride ?? trackDurationMs;
}
