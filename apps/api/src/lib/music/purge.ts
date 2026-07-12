/**
 * Metadata-purge-on-disconnect (M2 slice 4) — the deferred compliance duty.
 *
 * Disconnecting a provider forgets the OAuth tokens immediately (security), but
 * provider terms also require deleting the *derived metadata* we cached for that
 * user within 7 days: the provider IDs/URIs (`track_provider_ids`) and the
 * platform-supplied album art on their tracks. We do NOT touch our own metadata
 * (title/artist/manual BPM, classes, cues, moves) and we never delete tracks —
 * they may still be referenced by classes. We only strip the provider linkage and
 * the platform image.
 *
 * The disconnect route enqueues a `provider_purge_queue` row; a daily Cron Trigger
 * drains it (well inside the 7-day SLA). Splitting the queue *port* from its D1
 * implementation keeps the drain orchestration — batching, retry, dead-letter — unit
 * testable without a database, mirroring how slice 3 split adapter from
 * orchestration.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Provider } from '@ritmofit/shared';
import type { Db } from '../db.js';
import { tracks, trackProviderIds, providerPurgeQueue } from '../../db/schema.js';

/** One queued purge request for a (user, provider) pair. */
export interface PurgeRequest {
  id: string;
  userId: string;
  provider: Provider;
  attempts: number;
}

/** What a single purge removed — surfaced for logging/summary, never to a client. */
export interface PurgeCounts {
  tracksCleared: number;
  refsDeleted: number;
}

/**
 * The persistence the drain loop needs, abstracted so it can be faked in tests.
 * The D1 implementation is `createD1PurgeStore`.
 */
export interface PurgeStore {
  /** Oldest-first queued requests, capped at `limit`. */
  listQueue(limit: number): Promise<PurgeRequest[]>;
  /** Strip `provider`'s derived metadata from `userId`'s tracks. Idempotent. */
  purgeProviderMetadata(userId: string, provider: Provider): Promise<PurgeCounts>;
  /** Drop a queue row once its purge has succeeded. */
  removeQueueItem(id: string): Promise<void>;
  /** Record a failed attempt so a transient error is retried on the next sweep. */
  bumpAttempts(id: string): Promise<void>;
  /** Retain an exhausted duty in a durable failed state for operator recovery. */
  markFailed(id: string): Promise<void>;
}

/** Move a queue row to failed state after this many unsuccessful sweeps. */
export const MAX_PURGE_ATTEMPTS = 5;
/** Cap rows handled per sweep so one run can't fan out unboundedly. */
export const PURGE_BATCH = 100;

export interface DrainSummary {
  processed: number;
  purged: number;
  retried: number;
  abandoned: number;
  tracksCleared: number;
  refsDeleted: number;
}

/**
 * Drain queued purges. Each request is independent: a failure retries that row on
 * the next sweep (up to `MAX_PURGE_ATTEMPTS`, after which it is retained in a
 * failed state so it cannot wedge the active queue or disappear) and never blocks
 * the others.
 */
export async function drainPurgeQueue(
  store: PurgeStore,
  log: (msg: string) => void = () => {},
): Promise<DrainSummary> {
  const summary: DrainSummary = {
    processed: 0,
    purged: 0,
    retried: 0,
    abandoned: 0,
    tracksCleared: 0,
    refsDeleted: 0,
  };
  const queue = await store.listQueue(PURGE_BATCH);
  for (const item of queue) {
    summary.processed += 1;
    try {
      const counts = await store.purgeProviderMetadata(item.userId, item.provider);
      await store.removeQueueItem(item.id);
      summary.purged += 1;
      summary.tracksCleared += counts.tracksCleared;
      summary.refsDeleted += counts.refsDeleted;
    } catch {
      // Don't log the error object — it could carry user/provider detail.
      if (item.attempts + 1 >= MAX_PURGE_ATTEMPTS) {
        await store.markFailed(item.id);
        summary.abandoned += 1;
        log(`purge ${item.id} moved to failed state after ${item.attempts + 1} attempts`);
      } else {
        await store.bumpAttempts(item.id);
        summary.retried += 1;
      }
    }
  }
  return summary;
}

/** D1-backed `PurgeStore` over the Drizzle client. */
export function createD1PurgeStore(db: Db): PurgeStore {
  return {
    async listQueue(limit) {
      const rows = await db
        .select()
        .from(providerPurgeQueue)
        .where(isNull(providerPurgeQueue.failedAt))
        .orderBy(providerPurgeQueue.requestedAt)
        .limit(limit)
        .all();
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        provider: r.provider,
        attempts: r.attempts,
      }));
    },

    async purgeProviderMetadata(userId, provider) {
      // Resolve the affected tracks BEFORE deleting the provider rows.
      const affected = await db
        .select({ id: tracks.id })
        .from(tracks)
        .innerJoin(trackProviderIds, eq(trackProviderIds.trackId, tracks.id))
        .where(and(eq(tracks.ownerUserId, userId), eq(trackProviderIds.provider, provider)))
        .all();
      const trackIds = [...new Set(affected.map((r) => r.id))];
      if (trackIds.length === 0) return { tracksCleared: 0, refsDeleted: 0 };

      // Delete the provider refs AND clear album art on every affected track in one
      // atomic batch. The schema stores one image URL without provenance, so
      // retaining it when another provider ref remains could keep art supplied by
      // the disconnected provider. Clearing conservatively preserves the purge duty.
      const deleteRefs = db
        .delete(trackProviderIds)
        .where(
          and(eq(trackProviderIds.provider, provider), inArray(trackProviderIds.trackId, trackIds)),
        );
      const clearArt = db
        .update(tracks)
        .set({ albumArtUrl: null, updatedAt: Date.now() })
        .where(inArray(tracks.id, trackIds));

      const [delRes, updRes] = await db.batch([deleteRefs, clearArt]);
      const changes = (r: unknown) =>
        (r as { meta?: { changes?: number } } | undefined)?.meta?.changes ?? 0;
      return { tracksCleared: changes(updRes), refsDeleted: changes(delRes) };
    },

    async removeQueueItem(id) {
      await db.delete(providerPurgeQueue).where(eq(providerPurgeQueue.id, id));
    },

    async bumpAttempts(id) {
      const row = await db
        .select({ attempts: providerPurgeQueue.attempts })
        .from(providerPurgeQueue)
        .where(eq(providerPurgeQueue.id, id))
        .get();
      if (!row) return;
      await db
        .update(providerPurgeQueue)
        .set({ attempts: row.attempts + 1 })
        .where(eq(providerPurgeQueue.id, id));
    },

    async markFailed(id) {
      await db
        .update(providerPurgeQueue)
        .set({ attempts: MAX_PURGE_ATTEMPTS, failedAt: Date.now() })
        .where(eq(providerPurgeQueue.id, id));
    },
  };
}

/** Enqueue the purge owed by a just-completed disconnect of (user, provider). */
export async function enqueueProviderPurge(
  db: Db,
  userId: string,
  provider: Provider,
): Promise<void> {
  await db.insert(providerPurgeQueue).values({
    id: crypto.randomUUID(),
    userId,
    provider,
    requestedAt: Date.now(),
    attempts: 0,
    failedAt: null,
  });
}

/**
 * Cancel an active (not-yet-run) purge owed for (user, provider) — reconnecting a
 * provider re-grants the metadata the pending purge would strip, so the deferred
 * forget is moot. Without this a reconnect + re-import inside the daily drain window
 * loses the freshly re-imported provider refs and album art when the Cron runs.
 *
 * Only clears rows still eligible for the drain (`failedAt IS NULL`, the same filter
 * `listQueue` applies). Exhausted duties already in the failed state are left intact
 * for operator recovery — they never run, so they can't cause the data loss.
 */
export async function cancelProviderPurge(
  db: Db,
  userId: string,
  provider: Provider,
): Promise<void> {
  await db
    .delete(providerPurgeQueue)
    .where(
      and(
        eq(providerPurgeQueue.userId, userId),
        eq(providerPurgeQueue.provider, provider),
        isNull(providerPurgeQueue.failedAt),
      ),
    );
}
