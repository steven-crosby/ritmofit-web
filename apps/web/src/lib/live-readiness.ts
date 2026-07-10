/**
 * Live-queue readiness aggregation. The Live workspace fetches each queued class's
 * run-payload and computes per-class {@link ClassReadiness}; this pure helper rolls
 * those up into the counts the right-rail "Preflight checks" tiles display, so the
 * rail reflects real state instead of placeholders.
 *
 * Kept separate from the per-class `classReadiness` (readiness.ts) so the queue-level
 * math is unit-testable without React, and so the two never drift: a class is
 * `runnable` here iff its duration gate is satisfied — the same gate Live Mode
 * enforces via `canRunPayload` (both bottom out on `tracksMissingDuration`).
 */
import type { ClassReadiness } from './readiness.js';

export type QueueSummary = {
  /** Classes whose duration gate is satisfied — "Run live" is enabled. */
  runnable: number;
  /** Classes blocked from Live because a track still needs a length. */
  blocked: number;
  /** Runnable classes that still carry an attention gap (tempo/choreography/music). */
  needsAttention: number;
  /** Classes with at least one track missing a provider link (music not fully ready). */
  musicIncomplete: number;
  /** How many classes were summarized (successfully-loaded payloads only). */
  total: number;
};

/**
 * Roll per-class readiness into the queue-level preflight counts. Only pass
 * readiness for classes whose payload actually loaded — errored/loading classes
 * have unknown state and must not be counted as runnable or blocked.
 */
export function summarizeQueue(readinesses: ClassReadiness[]): QueueSummary {
  let runnable = 0;
  let blocked = 0;
  let needsAttention = 0;
  let musicIncomplete = 0;
  for (const r of readinesses) {
    if (r.runnable) {
      runnable += 1;
      // A runnable class can still be imperfect (tempo/choreography/music).
      if (!r.fullyReady) needsAttention += 1;
    } else {
      blocked += 1;
    }
    const music = r.dimensions.find((d) => d.key === 'music');
    if (music && music.level !== 'ready') musicIncomplete += 1;
  }
  return { runnable, blocked, needsAttention, musicIncomplete, total: readinesses.length };
}
