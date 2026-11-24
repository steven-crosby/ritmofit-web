import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repoRoot = decodeURIComponent(new URL('../../../..', import.meta.url).pathname);

describe('scripts/deploy.sh guards', () => {
  // The self-check builds throwaway git repos and runs node several times. Under heavy machine
  // load (an iOS build beside it) the old 5 s default was too tight (RF-243), so it has headroom.
  it('keeps deploy refusals, tags what it deployed and never prints secret values', () => {
    const result = spawnSync('bash', ['scripts/deploy.sh', '--self-check'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 55_000,
    });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(0);
    expect(output).toContain('self-check passed');
    expect(output).toContain('empty secret alternative fails closed');
    expect(output).toContain('unexpected secret name is not printed');
    expect(output).toContain('bracketed log line fails without printing the payload');
    expect(output).toContain('bad smoke line fails before the request');
    expect(output).toContain('git guard and /tmp worktree');
    // RF-244: the deploy tag, its push, and the deploy-alone guard.
    for (const check of [
      'deploy tag name and message',
      'Worker and rollback versions for the tag message',
      'deploy guard warns and skips with no deploy tag',
      'deploy guard lets a deploy-alone change ship alone',
      'deploy guard refuses a deploy-alone batch and prints the steps',
      'deploy guard --allow-batch records the batch',
      'deploy tag pushes only its own ref',
      'failed tag push keeps the local tag and exits 3',
      'failed tag creation prints the message and exits 3',
    ]) {
      expect(output).toContain(`self-check ok: ${check}`);
    }
    expect(output).not.toMatch(/SUPER_SECRET|ALSO_DO_NOT_PRINT|SECRET_BODY|SECRET_COOKIE/);
  }, 60_000);
});
