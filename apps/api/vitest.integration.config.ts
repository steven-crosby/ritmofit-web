/**
 * Integration-test config — runs the *mounted* Hono worker against a real (local,
 * Miniflare) D1 with the production migrations applied. This is the layer the unit
 * suite can't reach: it proves each route actually calls `requireAccess` (D1 has no
 * RLS, so a dropped gate is a security bug) and that the real auth → DB → route
 * stack composes. Kept in its own config + `*.integration.test.ts` glob so the fast
 * node-env unit suite (`vitest.config.ts`) is untouched.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineWorkersConfig(async () => {
  // The same SQL migrations prod runs — applied to the test D1 in the setup file.
  const migrations = await readD1Migrations(path.join(dir, 'migrations'));

  return {
    test: {
      include: ['src/**/*.integration.test.ts', 'test/**/*.integration.test.ts'],
      setupFiles: ['./test/apply-migrations.ts'],
      poolOptions: {
        workers: {
          singleWorker: true,
          main: './src/index.ts',
          miniflare: {
            compatibilityDate: '2024-11-06',
            compatibilityFlags: ['nodejs_compat'],
            d1Databases: { DB: 'ritmofit-test' },
            r2Buckets: { IMAGES_BUCKET: 'ritmofit-images-test' },
            bindings: {
              // Surfaced to the setup file to migrate the test DB.
              TEST_MIGRATIONS: migrations,
              // Auth needs a secret + an https origin (the latter also flips Better
              // Auth's rate limiter on, which we exercise). 32+ chars.
              BETTER_AUTH_SECRET: 'integration-test-secret-not-a-real-key-0123456789',
              BETTER_AUTH_URL: 'https://test.ritmofit.studio',
              // Force the dev mock catalog so provider routes never hit the network.
              MOCK_PROVIDERS: 'true',
              // 32-byte base64 key so the provider-connection/crypto code can boot.
              ENCRYPTION_KEY: 'aW50ZWdyYXRpb24tdGVzdC1lbmNyeXB0aW9uLWtleS0zMmI=',
            },
          },
        },
      },
    },
  };
});
