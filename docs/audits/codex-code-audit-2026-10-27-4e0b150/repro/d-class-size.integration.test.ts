// Audit repro (reviewer D): run-payload and class copy against classes near D1's
// 100-bound-parameter limit. Lives only in the disposable worktree.
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { classes, classTracks, tracks } from '../src/db/schema.js';
import { authed, signUpUser } from './helpers.js';

async function seedClass(userId: string, n: number): Promise<string> {
  const db = createDb(env);
  const now = Date.now();
  const classId = crypto.randomUUID();
  await db.insert(classes).values({
    id: classId,
    ownerUserId: userId,
    title: `Big class ${n}`,
    createdAt: now,
    updatedAt: now,
  });
  for (let start = 0; start < n; start += 40) {
    const stmts = [];
    for (let i = start; i < Math.min(n, start + 40); i++) {
      const trackId = crypto.randomUUID();
      stmts.push(
        db.insert(tracks).values({
          id: trackId,
          ownerUserId: userId,
          title: `Song ${i}`,
          artist: 'Artist',
          albumArtUrl: null,
          durationMs: 180000,
          displayBpm: null,
          isrc: null,
          matchKey: `song ${i}::artist`,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(classTracks).values({
          id: crypto.randomUUID(),
          classId,
          trackId,
          position: i,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    await db.batch(stmts as unknown as Parameters<typeof db.batch>[0]);
  }
  return classId;
}

describe('d-audit class size', () => {
  for (const n of [100, 101, 150]) {
    it(`run-payload and copy for a ${n}-track class`, async () => {
      const user = await signUpUser();
      const api = authed(user.cookie);
      const classId = await seedClass(user.userId, n);
      const run = await api(`/api/v1/classes/${classId}/run-payload`);
      const runBody = (await run.json()) as { tracks?: unknown[] };
      const copy = await api(`/api/v1/classes/${classId}/copy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      console.log(
        `D-CLASSSIZE n=${n} runPayload=${run.status} tracks=${runBody.tracks?.length ?? 'n/a'} copy=${copy.status}`,
      );
      expect(true).toBe(true);
    });
  }
});
