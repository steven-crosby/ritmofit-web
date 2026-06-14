/**
 * Integration-test setup: apply the production D1 migrations to the in-memory test
 * database once per test file, before any test runs. `TEST_MIGRATIONS` is injected
 * by `vitest.integration.config.ts` (read from `migrations/` at config time).
 */
import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll } from 'vitest';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
