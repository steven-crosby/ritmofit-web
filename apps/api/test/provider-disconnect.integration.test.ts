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
import { providerPurgeQueue } from '../src/db/schema.js';
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
});
