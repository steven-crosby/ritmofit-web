import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit config — generates SQL migrations from `src/db/schema.ts` into
 * `migrations/`, which `wrangler d1 migrations apply` consumes (D1/SQLite).
 *
 * No `dbCredentials` here: migration generation is offline (diffs the schema
 * against the committed migrations), and migrations are applied through
 * Wrangler against the D1 binding, not by Drizzle Kit directly.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
});
