#!/usr/bin/env node
// Boots the Worker that serves the built SPA against a fresh local D1, for the e2e smoke.
//
// Each run starts from an empty database in `e2e/.state/`, so the smoke never reads or
// writes the developer's own local D1 (`apps/api/.wrangler/state`). The Worker's vars
// come from a generated env file, which also keeps the developer's `.dev.vars` (and any
// real provider or email keys in it) out of the run.
//
// Two local-dev gotchas this handles:
// - `wrangler dev` rewrites `Origin` to the custom-domain route (`ritmofit.studio`), and
//   Better Auth rejects that. `--local-upstream` keeps the request on localhost.
// - The Worker serves `apps/web/dist`; it does not build it. `pnpm e2e` builds first.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const E2E_ROOT = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(E2E_ROOT, '..', 'apps', 'api');
const WEB_DIST = join(E2E_ROOT, '..', 'apps', 'web', 'dist', 'index.html');
const STATE = join(E2E_ROOT, '.state');
const PORT = process.env.E2E_PORT ?? '8798';
const ORIGIN = `http://localhost:${PORT}`;

if (!existsSync(WEB_DIST)) {
  console.error('apps/web/dist is missing. Run `pnpm e2e`, which builds the SPA first.');
  process.exit(1);
}

rmSync(STATE, { recursive: true, force: true });
mkdirSync(STATE, { recursive: true });

const envFile = join(STATE, 'worker.env');
writeFileSync(
  envFile,
  [
    // Local-only throwaway values. The smoke never talks to a real provider or mailer.
    'BETTER_AUTH_SECRET=e2e-local-only-secret-never-used-outside-this-run',
    `BETTER_AUTH_URL=${ORIGIN}`,
    `WEB_ORIGIN=${ORIGIN}`,
    'MOCK_PROVIDERS=true',
    '',
  ].join('\n'),
);

const wrangler = (args, options) =>
  process.platform === 'win32'
    ? ['cmd', ['/c', 'pnpm', 'exec', 'wrangler', ...args], options]
    : ['pnpm', ['exec', 'wrangler', ...args], options];

const migrate = spawnSync(
  ...wrangler(['d1', 'migrations', 'apply', 'ritmofit', '--local', '--persist-to', STATE], {
    cwd: API_ROOT,
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  }),
);
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const server = spawn(
  ...wrangler(
    [
      'dev',
      '--port',
      PORT,
      '--local-upstream',
      `localhost:${PORT}`,
      '--persist-to',
      STATE,
      '--env-file',
      envFile,
      '--inspector-port',
      '0',
      '--show-interactive-dev-session=false',
      '--log-level',
      'warn',
    ],
    { cwd: API_ROOT, stdio: 'inherit' },
  ),
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code) => process.exit(code ?? 0));
