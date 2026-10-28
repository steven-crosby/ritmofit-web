import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from './rf-trace.mjs';

const SCRIPT = fileURLToPath(new URL('./rf-trace.mjs', import.meta.url));
const PR = 'https://github.com/o/r/pull/123';
const REC = 'ritmofit_dev_plan/tasks/RF-7.json';
const records = (map) => (p) => (p in map ? map[p] : null);

test('product changes need a changed record citing this exact PR', () => {
  const product = ['apps/web/src/App.tsx'];
  assert.equal(evaluate(product, PR, records({})).pass, false);
  assert.equal(evaluate([...product, REC], PR, records({ [REC]: `"ref": "${PR}"` })).pass, true);
  // A different PR, a prefix of a longer number, or a deleted record does not count.
  assert.equal(evaluate([...product, REC], PR, records({ [REC]: `${PR}4` })).pass, false);
  assert.equal(
    evaluate([...product, REC], PR, records({ [REC]: 'https://github.com/o/r/pull/12' })).pass,
    false,
  );
  assert.equal(evaluate([...product, REC], PR, records({ [REC]: null })).pass, false);
  // The board or a non-record file citing the PR does not count.
  const board = 'ritmofit_dev_plan/tasks.md';
  assert.equal(evaluate([...product, board], PR, records({ [board]: PR })).pass, false);
});

test('packages/ and e2e/ are product; docs, prompts and scripts are not', () => {
  for (const p of ['packages/shared/src/index.ts', 'e2e/smoke.spec.ts', 'apps/api/src/index.ts']) {
    assert.equal(evaluate([p], PR, records({})).product, true, p);
  }
  for (const p of ['AGENTS.md', 'agent-prompts/delegate-task.md', 'scripts/tasks.mjs', REC]) {
    assert.equal(evaluate([p], PR, records({})).pass, true, p);
  }
});

test('CLI fails closed without PR context or input, and reads records from the checkout', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf-trace-'));
  mkdirSync(join(dir, 'ritmofit_dev_plan/tasks'), { recursive: true });
  writeFileSync(join(dir, REC), `{"ref": "${PR}"}`);
  const run = (stdin, env) =>
    spawnSync(process.execPath, [SCRIPT], {
      cwd: dir,
      input: stdin,
      env: { ...process.env, PR_NUMBER: '', GITHUB_REPOSITORY: '', ...env },
      encoding: 'utf8',
    });
  const ctx = { PR_NUMBER: '123', GITHUB_REPOSITORY: 'o/r' };
  assert.equal(run('apps/web/x.ts\n', {}).status, 1);
  assert.equal(run('', ctx).status, 1);
  assert.equal(run('apps/web/x.ts\n', ctx).status, 1);
  assert.equal(run(`apps/web/x.ts\n${REC}\n`, ctx).status, 0);
  assert.equal(run(`apps/web/x.ts\n${REC}\n`, { ...ctx, PR_NUMBER: '124' }).status, 1);
  assert.equal(run('README.md\n', ctx).status, 0);
});

test('CLI still runs when invoked through a symlinked path', () => {
  const link = join(mkdtempSync(join(tmpdir(), 'rf-trace-link-')), 'rf-trace.mjs');
  symlinkSync(SCRIPT, link);
  const result = spawnSync(process.execPath, [link], {
    input: 'apps/web/x.ts\n',
    env: { ...process.env, PR_NUMBER: '1', GITHUB_REPOSITORY: 'o/r' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, 'a skipped check would exit 0');
  assert.match(result.stderr, /rf-trace: FAIL/);
});
