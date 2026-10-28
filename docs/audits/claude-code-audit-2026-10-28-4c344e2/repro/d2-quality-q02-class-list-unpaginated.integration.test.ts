// Q-02 repro: the unpaginated (legacy, iOS-cache) GET /api/v1/classes binds one
// parameter per visible class in the card-aggregate query, so >100 classes is a 500.
// Copy to apps/api/test/ and run:
//   pnpm --filter @ritmofit/api exec vitest run --config vitest.integration.config.ts test/d2-quality-q02-class-list-unpaginated.integration.test.ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { classes } from '../src/db/schema.js';
import { authed, signUpUser } from './helpers.js';

async function seedClasses(userId: string, n: number): Promise<void> {
  const db = createDb(env);
  const now = Date.now();
  for (let start = 0; start < n; start += 50) {
    const stmts = [];
    for (let i = start; i < Math.min(n, start + 50); i++) {
      stmts.push(
        db.insert(classes).values({
          id: crypto.randomUUID(),
          ownerUserId: userId,
          title: `Class ${i}`,
          createdAt: now + i,
          updatedAt: now + i,
        }),
      );
    }
    await db.batch(stmts as unknown as Parameters<typeof db.batch>[0]);
  }
}

describe('Q-02 unpaginated class list at D1 bound-parameter limit', () => {
  for (const n of [100, 101]) {
    it(`GET /classes with ${n} classes`, async () => {
      const user = await signUpUser();
      const api = authed(user.cookie);
      await seedClasses(user.userId, n);
      const legacy = await api('/api/v1/classes');
      const paged = await api('/api/v1/classes?limit=50');
      console.log(`Q-02 n=${n} unpaginated=${legacy.status} paginated=${paged.status}`);
      expect(paged.status).toBe(200);
      if (n <= 100) expect(legacy.status).toBe(200);
      // Observed defect: 500 INTERNAL_ERROR once the page holds 101+ classes.
      else expect(legacy.status).toBe(500);
    });
  }
});
