// Audit repro (reviewer D): renaming a custom move used in many classes binds one
// parameter per parent class. Lives only in the disposable worktree.
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { classes, classTrackMoves, classTracks, tracks, userMoves } from '../src/db/schema.js';
import { authed, signUpUser } from './helpers.js';

async function seedParents(userId: string, userMoveId: string, n: number) {
  const db = createDb(env);
  const now = Date.now();
  const trackId = crypto.randomUUID();
  await db.insert(tracks).values({
    id: trackId,
    ownerUserId: userId,
    title: 'Song',
    artist: 'Artist',
    albumArtUrl: null,
    durationMs: 180000,
    displayBpm: null,
    isrc: null,
    matchKey: `song::artist::${userMoveId}`,
    createdAt: now,
    updatedAt: now,
  });
  for (let start = 0; start < n; start += 25) {
    const stmts = [];
    for (let i = start; i < Math.min(n, start + 25); i++) {
      const classId = crypto.randomUUID();
      const ctId = crypto.randomUUID();
      stmts.push(
        db.insert(classes).values({
          id: classId,
          ownerUserId: userId,
          title: `Class ${i}`,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(classTracks).values({
          id: ctId,
          classId,
          trackId,
          position: 0,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(classTrackMoves).values({
          id: crypto.randomUUID(),
          classTrackId: ctId,
          anchorMs: 0,
          userMoveId,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    await db.batch(stmts as unknown as Parameters<typeof db.batch>[0]);
  }
}

describe('d-audit user-move rename scale', () => {
  for (const n of [50, 97, 98, 99, 150]) {
    it(`rename a move used in ${n} classes`, async () => {
      const user = await signUpUser();
      const api = authed(user.cookie);
      const created = await api('/api/v1/user-moves', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Old name' }),
      });
      const move = (await created.json()) as { id: string };
      await seedParents(user.userId, move.id, n);
      const res = await api(`/api/v1/user-moves/${move.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'New name' }),
      });
      const body = await res.text();
      const row = await createDb(env).select().from(userMoves).where(eq(userMoves.id, move.id)).get();
      console.log(
        `D-RENAME n=${n} create=${created.status} status=${res.status} storedName=${row?.name} body=${body.slice(0, 120)}`,
      );
      expect(created.status).toBe(201);
    });
  }
});
