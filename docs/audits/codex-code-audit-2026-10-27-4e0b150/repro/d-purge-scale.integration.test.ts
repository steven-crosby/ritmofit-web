// Audit repro (reviewer D): does the provider purge survive a library larger than D1's
// 100-bound-parameter limit? Lives only in the disposable worktree.
import { env } from 'cloudflare:test';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { createD1PurgeStore } from '../src/lib/music/purge.js';
import { trackProviderIds, tracks, providerPurgeQueue } from '../src/db/schema.js';
import { authed, signUpUser } from './helpers.js';

async function seed(userId: string, n: number) {
  const db = createDb(env);
  const now = Date.now();
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
          albumArtUrl: 'https://example.com/art.jpg',
          durationMs: 180000,
          displayBpm: null,
          isrc: null,
          matchKey: `song ${i}::artist`,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(trackProviderIds).values({
          id: crypto.randomUUID(),
          trackId,
          ownerUserId: userId,
          provider: 'soundcloud',
          providerTrackId: `sc-${userId}-${i}`,
          providerUri: `https://soundcloud.com/example/${i}`,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    await db.batch(stmts as unknown as Parameters<typeof db.batch>[0]);
  }
}

describe('d-audit purge scale', () => {
  for (const n of [50, 95, 99, 100, 150, 500]) {
    for (const withDuty of [false, true]) {
      it(`purge with ${n} tracks (duty id: ${withDuty})`, async () => {
        const user = await signUpUser();
        const db = createDb(env);
        await seed(user.userId, n);
        let dutyId: string | undefined;
        if (withDuty) {
          const api = authed(user.cookie);
          await api('/api/v1/providers/soundcloud/connect', { method: 'POST' });
          await api('/api/v1/providers/soundcloud/connection', { method: 'DELETE' });
          const duty = await db
            .select()
            .from(providerPurgeQueue)
            .where(eq(providerPurgeQueue.userId, user.userId))
            .get();
          dutyId = duty?.id;
        }
        const t0 = Date.now();
        let outcome: string;
        try {
          const counts = await createD1PurgeStore(db).purgeProviderMetadata(
            user.userId,
            'soundcloud',
            dutyId,
          );
          outcome = `ok ${JSON.stringify(counts)}`;
        } catch (e) {
          outcome = `THROW ${(e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e)).slice(0, 160)}`;
        }
        const remaining = await db
          .select()
          .from(trackProviderIds)
          .where(
            and(eq(trackProviderIds.ownerUserId, user.userId), eq(trackProviderIds.provider, 'soundcloud')),
          )
          .all();
        console.log(
          `D-PURGE n=${n} duty=${withDuty} ms=${Date.now() - t0} outcome=${outcome} remainingRefs=${remaining.length}`,
        );
        expect(true).toBe(true);
      });
    }
  }
});
