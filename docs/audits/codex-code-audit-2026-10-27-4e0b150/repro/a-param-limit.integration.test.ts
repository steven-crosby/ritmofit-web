/** Reviewer A (audit 2026-10-27 @ 4e0b150) — disposable reproductions. NOT for commit. */
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';
import { createDb } from '../src/lib/db.js';
import { createD1PurgeStore, drainPurgeQueue } from '../src/lib/music/purge.js';

async function seedTracks(userId: string, n: number, withSpotifyRef: boolean): Promise<string[]> {
  const now = Date.now();
  const ids = Array.from({ length: n }, () => crypto.randomUUID());
  const stmts: D1PreparedStatement[] = [];
  ids.forEach((id, i) => {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO tracks (id, owner_user_id, title, artist, album_art_url, duration_ms, created_at, updated_at)
         VALUES (?, ?, ?, 'Artist', 'https://i.scdn.co/image/x', 180000, ?, ?)`,
      ).bind(id, userId, `Song ${i}`, now, now),
    );
    if (withSpotifyRef) {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO track_provider_ids (id, track_id, owner_user_id, provider, provider_track_id, created_at, updated_at)
           VALUES (?, ?, ?, 'spotify', ?, ?, ?)`,
        ).bind(crypto.randomUUID(), id, userId, `sp-${id}`, now, now),
      );
    }
  });
  await env.DB.batch(stmts);
  return ids;
}

describe('A-9: D1 100-bound-parameter ceiling on unbounded inArray() lists', () => {
  it('bound-parameter ceiling on local Miniflare D1', async () => {
    for (const n of [100, 101]) {
      const placeholders = Array.from({ length: n }, () => '?').join(',');
      let out = 'ok';
      try {
        await env.DB.prepare(`SELECT count(*) AS c FROM tracks WHERE id IN (${placeholders})`)
          .bind(...Array.from({ length: n }, (_, i) => `id-${i}`))
          .first();
      } catch (e) {
        out = `ERROR ${String(e).slice(0, 120)}`;
      }
      console.log(`[A-9] ${n} params -> ${out}`);
    }
  });

  it('disconnect purge never completes for a user with >100 provider-linked tracks', async () => {
    const u = await signUpUser();
    const me = authed(u.cookie);
    expect((await me('/api/v1/providers/spotify/connect', { method: 'POST' })).status).toBe(200);
    await seedTracks(u.userId, 120, true);
    expect((await me('/api/v1/providers/spotify/connection', { method: 'DELETE' })).status).toBe(204);

    const store = createD1PurgeStore(createDb(env));
    const logs: string[] = [];
    const summaries = [];
    for (let i = 0; i < 5; i++) summaries.push(await drainPurgeQueue(store, (m) => logs.push(m)));
    const refs = await env.DB.prepare(
      "SELECT count(*) AS n FROM track_provider_ids WHERE owner_user_id = ? AND provider = 'spotify'",
    )
      .bind(u.userId)
      .first<{ n: number }>();
    const queue = await env.DB.prepare(
      'SELECT attempts, failed_at IS NOT NULL AS failed FROM provider_purge_queue WHERE user_id = ?',
    )
      .bind(u.userId)
      .first();
    console.log('[A-9 purge] summaries =', JSON.stringify(summaries));
    console.log('[A-9 purge] first log =', logs[0]?.slice(0, 200));
    console.log('[A-9 purge] spotify refs remaining =', refs?.n, 'queue row =', JSON.stringify(queue));
    expect(refs?.n).toBe(120);
  });

  it('run-payload and class copy 500 for a class with >100 placements', async () => {
    const u = await signUpUser();
    const me = authed(u.cookie);
    const cls = await me('/api/v1/classes', { method: 'POST', body: JSON.stringify({ title: 'Big' }) });
    const classId = ((await cls.json()) as { id: string }).id;
    const ids = await seedTracks(u.userId, 101, false);
    const now = Date.now();
    await env.DB.batch(
      ids.map((trackId, position) =>
        env.DB.prepare(
          `INSERT INTO class_tracks (id, class_id, track_id, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), classId, trackId, position, now, now),
      ),
    );
    const payload = await me(`/api/v1/classes/${classId}/run-payload`);
    const copy = await me(`/api/v1/classes/${classId}/copy`, { method: 'POST', body: '{}' });
    const list = await me('/api/v1/classes?limit=30');
    console.log('[A-9 class] run-payload ->', payload.status, 'copy ->', copy.status, 'list ->', list.status);
  });
});
