/**
 * Provider disconnect → purge enqueue (integration) — drives the real mounted
 * worker's `DELETE /providers/:provider/connection` and asserts the route's
 * side effect on D1: a real disconnect forgets the connection and enqueues the
 * deferred metadata purge, while a no-op disconnect (never connected / double
 * click) must not enqueue a second duty that would strip a user's refs + art.
 *
 * The purge *store* SQL is unit/integration-tested directly in launch-blockers;
 * this proves the route boundary actually schedules it (and only when warranted).
 */
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { drainPurgeQueue, createD1PurgeStore } from '../src/lib/music/purge.js';
import { providerPurgeQueue, trackProviderIds, tracks } from '../src/db/schema.js';
import { authed, signUpUser } from './helpers.js';

/** Count the caller's queued purge duties. */
async function purgeCount(userId: string): Promise<number> {
  const rows = await createDb(env)
    .select()
    .from(providerPurgeQueue)
    .where(eq(providerPurgeQueue.userId, userId))
    .all();
  return rows.length;
}

describe('provider disconnect purge enqueue (integration)', () => {
  it('enqueues a purge on a real disconnect and forgets the connection', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    // Mock-provider seam connects with placeholder tokens — no network/credentials.
    const connected = await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    expect(connected.status).toBe(200);
    const listed = (await (await api('/api/v1/providers/connections')).json()) as unknown[];
    expect(listed).toHaveLength(1);
    expect(await purgeCount(user.userId)).toBe(0);

    const disconnect = await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });
    expect(disconnect.status).toBe(204);

    const after = (await (await api('/api/v1/providers/connections')).json()) as unknown[];
    expect(after).toHaveLength(0);

    const duty = await createDb(env)
      .select()
      .from(providerPurgeQueue)
      .where(eq(providerPurgeQueue.userId, user.userId))
      .get();
    expect(duty?.provider).toBe('soundcloud');
    expect(duty?.failedAt).toBeNull();
    expect(await purgeCount(user.userId)).toBe(1);
  });

  it('does not enqueue a duty when disconnecting an absent connection', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const noop = await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });
    expect(noop.status).toBe(204);
    expect(await purgeCount(user.userId)).toBe(0);
  });

  it('does not enqueue a second duty on a repeated disconnect', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });
    await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });

    expect(await purgeCount(user.userId)).toBe(1);
  });

  it('cancels the pending purge when the user reconnects the same provider', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });
    expect(await purgeCount(user.userId)).toBe(1);

    // Reconnecting re-grants the metadata, so the deferred forget must be dropped.
    const reconnected = await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    expect(reconnected.status).toBe(200);
    expect(await purgeCount(user.userId)).toBe(0);
  });

  it('preserves re-imported provider refs + art when the drain runs after a reconnect', async () => {
    // The consequence-level falsifier: a zero queue count only proves the row is
    // gone; this proves the actual data-loss the row would have caused no longer
    // happens. Seed a track+ref (as a re-import would), disconnect (enqueue purge),
    // reconnect (should cancel it), then run the real drain and assert the ref and
    // album art survive. Before the fix the purge row persists and the drain wipes
    // both; after the fix the drain finds nothing to do.
    const user = await signUpUser();
    const api = authed(user.cookie);
    const db = createDb(env);
    const now = Date.now();
    const trackId = crypto.randomUUID();

    await db.batch([
      db.insert(tracks).values({
        id: trackId,
        ownerUserId: user.userId,
        title: 'Reconnected song',
        artist: 'Artist',
        albumArtUrl: 'https://example.com/provider-art.jpg',
        durationMs: 180000,
        displayBpm: null,
        isrc: null,
        matchKey: 'reconnected song::artist',
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(trackProviderIds).values({
        id: crypto.randomUUID(),
        trackId,
        ownerUserId: user.userId,
        provider: 'soundcloud',
        providerTrackId: 'soundcloud-reimport-1',
        providerUri: 'https://soundcloud.com/example/song',
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });
    expect(await purgeCount(user.userId)).toBe(1);

    // Reconnect + re-import, then let the daily Cron drain fire.
    await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    const summary = await drainPurgeQueue(createD1PurgeStore(db));
    expect(summary.processed).toBe(0);

    const track = await db.select().from(tracks).where(eq(tracks.id, trackId)).get();
    const refs = await db
      .select()
      .from(trackProviderIds)
      .where(eq(trackProviderIds.trackId, trackId))
      .all();
    expect(track?.albumArtUrl).toBe('https://example.com/provider-art.jpg');
    expect(refs.map((ref) => ref.provider)).toEqual(['soundcloud']);
  });

  it('invalidates a purge item already captured by the drain when the user reconnects', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const db = createDb(env);
    const store = createD1PurgeStore(db);
    const now = Date.now();
    const trackId = crypto.randomUUID();

    await db.batch([
      db.insert(tracks).values({
        id: trackId,
        ownerUserId: user.userId,
        title: 'Stale snapshot song',
        artist: 'Artist',
        albumArtUrl: 'https://example.com/stale-snapshot-art.jpg',
        durationMs: 180000,
        displayBpm: null,
        isrc: null,
        matchKey: 'stale snapshot song::artist',
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(trackProviderIds).values({
        id: crypto.randomUUID(),
        trackId,
        ownerUserId: user.userId,
        provider: 'soundcloud',
        providerTrackId: 'soundcloud-stale-snapshot-1',
        providerUri: 'https://soundcloud.com/example/stale-snapshot-song',
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });
    const [captured] = await store.listQueue(1);
    expect(captured).toBeDefined();

    // The Cron has already captured the item in memory when reconnect cancels its
    // persisted duty. A stale item must not retain authority to erase metadata.
    await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
    expect(await purgeCount(user.userId)).toBe(0);

    const counts = await store.purgeProviderMetadata(user.userId, 'soundcloud', captured!.id);
    expect(counts).toEqual({ tracksCleared: 0, refsDeleted: 0 });

    const track = await db.select().from(tracks).where(eq(tracks.id, trackId)).get();
    const refs = await db
      .select()
      .from(trackProviderIds)
      .where(eq(trackProviderIds.trackId, trackId))
      .all();
    expect(track?.albumArtUrl).toBe('https://example.com/stale-snapshot-art.jpg');
    expect(refs.map((ref) => ref.provider)).toEqual(['soundcloud']);
  });
});
