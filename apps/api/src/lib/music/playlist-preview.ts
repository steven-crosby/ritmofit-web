/**
 * Paste-a-link playlist preview. One deadline covers every page and any
 * retry backoff. A late page is discarded: timeout wins over a partial list,
 * and nothing is written.
 */
import type { PlaylistReadOptions } from '@ritmofit/music';
import { isAbortError } from '@ritmofit/music';
import type { TrackSearchResult } from '@ritmofit/shared';

export const PREVIEW_FETCH_TIMEOUT_MS = 8_000;
export const PREVIEW_TIMEOUT_MESSAGE = 'The playlist took too long to load. Try again.';

export class PreviewTimeoutError extends Error {
  constructor() {
    super(PREVIEW_TIMEOUT_MESSAGE);
    this.name = 'PreviewTimeoutError';
  }
}

export async function loadPlaylistPreview(
  read: (opts: PlaylistReadOptions & { signal: AbortSignal }) => Promise<TrackSearchResult[]>,
  timeoutMs: number = PREVIEW_FETCH_TIMEOUT_MS,
): Promise<TrackSearchResult[]> {
  const controller = new AbortController();
  const deadlineAt = Date.now() + timeoutMs;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortPromise = new Promise<never>((_, reject) => {
    const onAbort = () => reject(new PreviewTimeoutError());
    if (controller.signal.aborted) onAbort();
    else controller.signal.addEventListener('abort', onAbort, { once: true });
  });

  try {
    const result = await Promise.race([
      read({ signal: controller.signal, deadlineAt }),
      abortPromise,
    ]);
    if (timedOut || controller.signal.aborted || Date.now() >= deadlineAt) {
      throw new PreviewTimeoutError();
    }
    return result;
  } catch (err) {
    if (err instanceof PreviewTimeoutError) throw err;
    if (timedOut || isAbortError(err) || controller.signal.aborted) {
      throw new PreviewTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
