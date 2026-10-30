/**
 * The one bounded-race helper for playback (RF-108): settle with `work`, or
 * with `onTimeout()` once `timeoutMs` passes, whichever comes first. The timer
 * is always cleared. `onTimeout` may throw to reject instead.
 */
export async function raceTimer<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: () => T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      try {
        resolve(onTimeout());
      } catch (error) {
        reject(error);
      }
    }, timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
