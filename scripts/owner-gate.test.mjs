import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, APPROVAL_LABEL } from './owner-gate.mjs';

const SCRIPT = fileURLToPath(new URL('./owner-gate.mjs', import.meta.url));

const run = (stdin, labels) =>
  spawnSync(process.execPath, [SCRIPT], {
    input: stdin,
    env: { ...process.env, OWNER_GATE_LABELS: labels },
    encoding: 'utf8',
  });

test('every gated class is caught', () => {
  const cases = {
    'apps/api/migrations/0042_add_thing.sql': 'D1 migrations / schema',
    'apps/api/src/db/schema.ts': 'D1 migrations / schema',
    'apps/api/drizzle.config.ts': 'D1 migrations / schema',
    'apps/api/src/index.ts': 'auth / authz',
    'apps/web/src/lib/session-guard.ts': 'auth / authz',
    'apps/api/src/lib/share-target.ts': 'auth / authz',
    'apps/api/src/lib/resolve-provider.ts': 'provider / playback',
    'apps/web/src/lib/use-provider-connect.ts': 'provider / playback',
    'apps/web/vite.config.ts': 'CI / deploy / infrastructure',
    'package.json': 'CI / deploy / infrastructure',
    'apps/api/package.json': 'CI / deploy / infrastructure',
    'apps/web/package.json': 'CI / deploy / infrastructure',
    'apps/api/scripts/generate-openapi.ts': 'CI / deploy / infrastructure',
    'apps/web/scripts/check-bundle-budget.mjs': 'CI / deploy / infrastructure',
    'apps/api/src/lib/auth.ts': 'auth / authz',
    'apps/api/src/middleware/auth.ts': 'auth / authz',
    'apps/api/src/lib/authz.test.ts': 'auth / authz',
    'apps/api/test/nested-resource-access.integration.test.ts': 'auth / authz',
    'apps/web/src/lib/auth-client.ts': 'auth / authz',
    'packages/music/src/spotify.ts': 'provider / playback',
    'apps/api/src/lib/music/purge.ts': 'provider / playback',
    'apps/api/src/routes/provider-connections.ts': 'provider / playback',
    'apps/web/src/lib/playback/runtime.ts': 'provider / playback',
    'apps/web/src/lib/musickit.ts': 'provider / playback',
    '.github/workflows/ci.yml': 'CI / deploy / infrastructure',
    'scripts/deploy.sh': 'CI / deploy / infrastructure',
    'scripts/owner-gate.mjs': 'CI / deploy / infrastructure',
    'scripts/rf-trace.mjs': 'CI / deploy / infrastructure',
    'apps/api/wrangler.toml': 'CI / deploy / infrastructure',
    'pnpm-workspace.yaml': 'CI / deploy / infrastructure',
    'AGENTS.md': 'agent rules',
    'agent-prompts/daily/close-session.md': 'agent rules',
    'agent-prompts/templates/lane-brief.md': 'agent rules',
    'ritmofit_dev_plan/tasks/README.md': 'agent rules',
    'ritmofit_dev_plan/handoffs/README.md': 'agent rules',
    'apps/web/src/components/LiveMode.tsx': 'provider / playback',
    'apps/web/src/components/LiveMode.test.tsx': 'provider / playback',
    'apps/web/src/components/ProviderConnectAction.tsx': 'provider / playback',
    'apps/web/src/components/SpotifyActivationAction.tsx': 'provider / playback',
    'apps/web/src/lib/providers.ts': 'provider / playback',
    'CLAUDE.md': 'agent rules',
  };
  for (const [path, gate] of Object.entries(cases)) {
    assert.deepEqual(evaluate([path], []).gated, [{ path, gate }], path);
  }
});

test('ordinary product and docs changes are not gated', () => {
  const free = [
    'apps/web/src/components/ClassesHome.tsx',
    'apps/web/src/lib/readiness.ts',
    'apps/api/src/routes/classes.ts',
    'apps/api/src/lib/run-payload.ts',
    'packages/shared/src/entities/class.ts',
    'ritmofit_dev_plan/handoffs/2026-10-27-example.md',
    'ritmofit_dev_plan/tasks/RF-98.json',
    'README.md',
    'e2e/smoke.spec.ts',
    'pnpm-lock.yaml',
    'apps/web/scripts/generate-tokens.mjs',
    'packages/shared/package.json',
  ];
  const result = evaluate(free, []);
  assert.deepEqual(result.gated, []);
  assert.equal(result.pass, true);
});

test('approval label is required, and only the exact label counts', () => {
  assert.equal(evaluate(['AGENTS.md'], []).pass, false);
  assert.equal(evaluate(['AGENTS.md'], ['needs-owner']).pass, false);
  assert.equal(evaluate(['AGENTS.md'], ['Owner-Approved']).pass, false);
  assert.equal(evaluate(['AGENTS.md'], [APPROVAL_LABEL]).pass, true);
});

test('CLI fails closed on gated paths, empty input and malformed labels', () => {
  assert.equal(run('AGENTS.md\n', '[]').status, 1);
  assert.equal(run('AGENTS.md\n', 'not json').status, 1);
  assert.equal(run('AGENTS.md\n', '{"0":"owner-approved"}').status, 1);
  assert.equal(run('', '["owner-approved"]').status, 1);
  assert.equal(run('AGENTS.md\n', '["owner-approved"]').status, 0);
  assert.equal(run('README.md\napps/web/src/App.tsx\n', '[]').status, 0);
});

test('CLI still runs the gate when invoked through a symlinked path', () => {
  const link = join(mkdtempSync(join(tmpdir(), 'owner-gate-')), 'owner-gate.mjs');
  symlinkSync(SCRIPT, link);
  const result = spawnSync(process.execPath, [link], {
    input: 'AGENTS.md\n',
    env: { ...process.env, OWNER_GATE_LABELS: '[]' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, 'a skipped gate would exit 0');
  assert.match(result.stdout + result.stderr, /owner-gated paths/);
});
