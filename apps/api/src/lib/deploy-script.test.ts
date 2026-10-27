import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repoRoot = decodeURIComponent(new URL('../../../..', import.meta.url).pathname);

describe('scripts/deploy.sh guards', () => {
  it('keeps deploy refusals and never prints secret values', () => {
    const result = spawnSync('bash', ['scripts/deploy.sh', '--self-check'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30_000,
    });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(0);
    expect(output).toContain('self-check passed');
    expect(output).toContain('empty secret alternative fails closed');
    expect(output).toContain('unexpected secret name is not printed');
    expect(output).toContain('bracketed log line fails without printing the payload');
    expect(output).toContain('bad smoke line fails before the request');
    expect(output).toContain('git guard and /tmp worktree');
    expect(output).not.toMatch(/SUPER_SECRET|ALSO_DO_NOT_PRINT|SECRET_BODY|SECRET_COOKIE/);
  });
});
