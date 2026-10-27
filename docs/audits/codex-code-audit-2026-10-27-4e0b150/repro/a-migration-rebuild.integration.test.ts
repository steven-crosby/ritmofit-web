/**
 * Reviewer A (audit 2026-10-27 @ 4e0b150) — disposable reproduction. NOT for commit.
 *
 * Does a drizzle-kit table rebuild of a cascade parent (`PRAGMA foreign_keys=OFF` →
 * CREATE __new → INSERT…SELECT → DROP → RENAME) delete child rows on local D1?
 * Replays the already-applied 0018 `class_tracks` rebuild under a new migration name
 * against a populated database. Local Miniflare D1 only.
 */
import { applyD1Migrations, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { authed, signUpUser } from './helpers.js';

async function count(table: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{ n: number }>();
  return row!.n;
}

describe('A-7: drizzle table-rebuild migration vs ON DELETE CASCADE children (local D1)', () => {
  it('replaying the 0018 class_tracks rebuild on populated data', async () => {
    const u = await signUpUser();
    const me = authed(u.cookie);
    const cls = await me('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Rebuild probe' }),
    });
    const classId = ((await cls.json()) as { id: string }).id;
    await me(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track: { title: 'T', artist: 'A', durationMs: 180000 } }),
    });
    const cts = (await (await me(`/api/v1/classes/${classId}/tracks`)).json()) as Array<{
      id: string;
    }>;
    const cue = await me(`/api/v1/class-tracks/${cts[0]!.id}/cues`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 1000, text: 'Climb' }),
    });
    expect(cue.status).toBe(201);
    const moveRes = await me(`/api/v1/class-tracks/${cts[0]!.id}/moves`, {
      method: 'POST',
      body: JSON.stringify({ anchorMs: 1500, nameOverride: 'Sprint' }),
    });
    expect(moveRes.status).toBe(201);

    const fk = await env.DB.prepare('PRAGMA foreign_keys').first();
    const before = {
      class_tracks: await count('class_tracks'),
      cues: await count('cues'),
      class_track_moves: await count('class_track_moves'),
    };

    const migrations = env.TEST_MIGRATIONS as Array<{ name: string; queries: string[] }>;
    const m18 = migrations.find((m) => m.name.startsWith('0018_'))!;
    // Current class_tracks has plan_block_id (later migration); 0018's DDL predates it,
    // which is irrelevant to the cascade question.
    let applyError: string | null = null;
    try {
      await applyD1Migrations(env.DB, [{ name: '9999_a_replay_0018', queries: m18.queries }]);
    } catch (e) {
      applyError = String(e);
    }

    const after = {
      class_tracks: await count('class_tracks'),
      cues: await count('cues'),
      class_track_moves: await count('class_track_moves'),
    };
    console.log(
      '[A-7] PRAGMA foreign_keys at test time =',
      JSON.stringify(fk),
      '\n[A-7] before =',
      JSON.stringify(before),
      '\n[A-7] after  =',
      JSON.stringify(after),
      '\n[A-7] applyError =',
      applyError,
    );
  });

  it('same replay with PRAGMA defer_foreign_keys=on instead of foreign_keys=OFF', async () => {
    const u = await signUpUser();
    const me = authed(u.cookie);
    const cls = await me('/api/v1/classes', { method: 'POST', body: JSON.stringify({ title: 'Defer probe' }) });
    const classId = ((await cls.json()) as { id: string }).id;
    await me(`/api/v1/classes/${classId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track: { title: 'T', artist: 'A', durationMs: 180000 } }),
    });
    const cts = (await (await me(`/api/v1/classes/${classId}/tracks`)).json()) as Array<{ id: string }>;
    await me(`/api/v1/class-tracks/${cts[0]!.id}/cues`, { method: 'POST', body: JSON.stringify({ anchorMs: 1000, text: 'Climb' }) });
    const before = { cues: await count('cues'), class_tracks: await count('class_tracks') };
    const migrations = env.TEST_MIGRATIONS as Array<{ name: string; queries: string[] }>;
    const m18 = migrations.find((m) => m.name.startsWith('0018_'))!;
    const queries = m18.queries.map((q) => q.replace(/PRAGMA foreign_keys=OFF;?/i, 'PRAGMA defer_foreign_keys=on;'));
    let applyError: string | null = null;
    try {
      await applyD1Migrations(env.DB, [{ name: '9998_a_replay_0018_defer', queries }]);
    } catch (e) {
      applyError = String(e);
    }
    const after = { cues: await count('cues'), class_tracks: await count('class_tracks') };
    console.log('[A-7 defer] before =', JSON.stringify(before), 'after =', JSON.stringify(after), 'applyError =', applyError);
  });
});
