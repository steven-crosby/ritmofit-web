import { describe, it, expect } from 'vitest';
import type { Provider } from '@ritmofit/shared';
import {
  drainPurgeQueue,
  MAX_PURGE_ATTEMPTS,
  PURGE_BATCH,
  type PurgeRequest,
  type PurgeStore,
} from './purge.js';

/**
 * In-memory `PurgeStore` standing in for D1, so the drain orchestration —
 * batching, per-row isolation, retry, give-up — is tested without a database.
 * The actual SQL scoping in `createD1PurgeStore` is verified against local D1.
 */
function fakeStore(
  queue: PurgeRequest[],
  opts: { failFor?: Set<string>; counts?: Record<string, { tracksCleared: number; refsDeleted: number }> } = {},
) {
  const rows = new Map(queue.map((r) => [r.id, { ...r }]));
  const purged: Array<{ userId: string; provider: Provider }> = [];
  const removed: string[] = [];
  const store: PurgeStore = {
    async listQueue(limit) {
      return [...rows.values()].slice(0, limit).map((r) => ({ ...r }));
    },
    async purgeProviderMetadata(userId, provider) {
      if (opts.failFor?.has(userId)) throw new Error('boom');
      purged.push({ userId, provider });
      return opts.counts?.[userId] ?? { tracksCleared: 0, refsDeleted: 0 };
    },
    async removeQueueItem(id) {
      rows.delete(id);
      removed.push(id);
    },
    async bumpAttempts(id) {
      const r = rows.get(id);
      if (r) r.attempts += 1;
    },
  };
  return { store, rows, purged, removed };
}

const req = (over: Partial<PurgeRequest> = {}): PurgeRequest => ({
  id: 'q1',
  userId: 'u1',
  provider: 'soundcloud',
  attempts: 0,
  ...over,
});

describe('drainPurgeQueue', () => {
  it('purges each queued request and drops its row', async () => {
    const { store, rows, purged } = fakeStore([
      req({ id: 'q1', userId: 'u1' }),
      req({ id: 'q2', userId: 'u2' }),
    ]);
    const summary = await drainPurgeQueue(store);
    expect(summary.processed).toBe(2);
    expect(summary.purged).toBe(2);
    expect(purged).toEqual([
      { userId: 'u1', provider: 'soundcloud' },
      { userId: 'u2', provider: 'soundcloud' },
    ]);
    expect(rows.size).toBe(0);
  });

  it('accumulates the cleared/deleted counts into the summary', async () => {
    const { store } = fakeStore([req({ id: 'q1', userId: 'u1' })], {
      counts: { u1: { tracksCleared: 3, refsDeleted: 5 } },
    });
    const summary = await drainPurgeQueue(store);
    expect(summary.tracksCleared).toBe(3);
    expect(summary.refsDeleted).toBe(5);
  });

  it('retries a failed row (keeps it, bumps attempts) without blocking others', async () => {
    const { store, rows } = fakeStore(
      [req({ id: 'q1', userId: 'bad' }), req({ id: 'q2', userId: 'ok' })],
      { failFor: new Set(['bad']) },
    );
    const summary = await drainPurgeQueue(store);
    expect(summary.purged).toBe(1);
    expect(summary.retried).toBe(1);
    expect(rows.has('q1')).toBe(true); // retained for the next sweep
    expect(rows.get('q1')!.attempts).toBe(1);
    expect(rows.has('q2')).toBe(false); // the good one still drained
  });

  it('abandons (drops) a row once it hits MAX_PURGE_ATTEMPTS', async () => {
    const { store, rows } = fakeStore([req({ id: 'q1', userId: 'bad', attempts: MAX_PURGE_ATTEMPTS - 1 })], {
      failFor: new Set(['bad']),
    });
    const summary = await drainPurgeQueue(store);
    expect(summary.abandoned).toBe(1);
    expect(summary.retried).toBe(0);
    expect(rows.has('q1')).toBe(false); // poisoned row removed so it can't wedge the queue
  });

  it('caps the sweep at PURGE_BATCH rows', async () => {
    const many = Array.from({ length: PURGE_BATCH + 10 }, (_, i) =>
      req({ id: `q${i}`, userId: `u${i}` }),
    );
    const { store } = fakeStore(many);
    const summary = await drainPurgeQueue(store);
    expect(summary.processed).toBe(PURGE_BATCH);
  });

  it('is a no-op on an empty queue', async () => {
    const { store } = fakeStore([]);
    const summary = await drainPurgeQueue(store);
    expect(summary).toMatchObject({ processed: 0, purged: 0, retried: 0, abandoned: 0 });
  });
});
