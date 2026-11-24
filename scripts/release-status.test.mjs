import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATES } from './owner-gate.mjs';
import {
  SHIPPED_ROOT_FILES,
  checkRange,
  classify,
  gateClasses,
  isShipped,
  parseSubject,
  planSteps,
} from './release-status.mjs';

const SCRIPT = fileURLToPath(new URL('./release-status.mjs', import.meta.url));

// Fixture repos must not see the caller's repository (git hooks and some runners export GIT_*).
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, env: ENV, encoding: 'utf8', stdio: 'pipe' }).trim();

const run = (cwd, ...args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: ENV, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
};

// The files each 2026-11-23 PR changed (git show --name-only on main).
const PR_FILES = {
  789: [
    'apps/web/src/components/LiveMode.test.tsx',
    'apps/web/src/components/LiveMode.tsx',
    'ritmofit_dev_plan/handoffs/2026-11-23-r1123-lane1-spa-live.md',
    'ritmofit_dev_plan/tasks.md',
    'ritmofit_dev_plan/tasks/RF-130.json',
    'ritmofit_dev_plan/tasks/RF-239.json',
  ],
  790: [
    'apps/web/src/components/TrackSearch.test.tsx',
    'apps/web/src/components/TrackSearch.tsx',
    'ritmofit_dev_plan/tasks.md',
    'ritmofit_dev_plan/tasks/RF-149.json',
  ],
  792: [
    'apps/web/src/components/TrackSearch.test.tsx',
    'apps/web/src/components/TrackSearch.tsx',
    'ritmofit_dev_plan/tasks.md',
    'ritmofit_dev_plan/tasks/RF-241.json',
  ],
  793: [
    'apps/web/src/components/Dashboard.test.tsx',
    'e2e/smoke.spec.ts',
    'ritmofit_dev_plan/handoffs/2026-11-23-r1123b-lane1-spa-likes.md',
    'ritmofit_dev_plan/tasks.md',
    'ritmofit_dev_plan/tasks/RF-157.json',
  ],
  docs: ['ritmofit_dev_plan/HISTORY.md', 'ritmofit_dev_plan/tasks/RF-238.json'],
};

const commit = (sha, pr, files) => ({ sha, pr, title: `change ${sha}`, files, ...classify(files) });

test('shipped paths are what the Worker, the SPA build or remote D1 use', () => {
  const shipped = [
    'apps/web/src/components/LiveMode.tsx',
    'apps/web/src/lib/energy-hold.fixture.ts',
    'apps/web/index.html',
    'apps/web/public/_headers',
    'apps/web/vite.config.ts',
    'apps/web/package.json',
    'apps/web/scripts/generate-tokens.mjs',
    'apps/api/src/index.ts',
    'apps/api/src/lib/mock-catalog.ts',
    'apps/api/migrations/0042_add_thing.sql',
    'apps/api/wrangler.toml',
    'apps/api/package.json',
    'packages/music/src/spotify.ts',
    'packages/shared/src/index.ts',
    ...SHIPPED_ROOT_FILES,
  ];
  const notShipped = [
    'apps/web/src/components/LiveMode.test.tsx',
    'apps/api/src/lib/authz.test.ts',
    'apps/api/test/authz.integration.test.ts',
    'apps/api/test/apply-migrations.ts',
    'apps/api/src/lib/__snapshots__/scaffold-recipes.test.ts.snap',
    'apps/api/vitest.config.ts',
    'apps/api/vitest.integration.config.ts',
    'apps/api/scripts/generate-openapi.ts',
    'apps/api/openapi/openapi.json',
    'apps/api/drizzle.config.ts',
    'apps/web/smoke/README.md',
    'apps/web/smoke/run.mjs',
    'apps/web/scripts/check-bundle-budget.mjs',
    'packages/music/README.md',
    'e2e/smoke.spec.ts',
    'scripts/deploy.sh',
    'scripts/release-status.mjs',
    '.github/workflows/ci.yml',
    'package.json',
    '.nvmrc',
    'eslint.config.js',
    'AGENTS.md',
    'CLAUDE.md',
    'agent-prompts/daily/close-session.md',
    'ritmofit_dev_plan/HISTORY.md',
    'ritmofit_dev_plan/tasks/RF-244.json',
    'ritmofit_design_system/05-components.md',
    'ritmofit_design_system/scripts/verify.mjs',
    'ios-snapshot/RunPayload.swift',
    'docs/audits/x/README.md',
  ];
  for (const p of shipped) assert.equal(isShipped(p), true, p);
  for (const p of notShipped) assert.equal(isShipped(p), false, p);
});

test('deploy-alone is an owner-gated shipped file; agent rules never ship', () => {
  assert.deepEqual(
    GATES.map((g) => g.name),
    [
      'D1 migrations / schema',
      'auth / authz',
      'provider / playback',
      'CI / deploy / infrastructure',
      'agent rules',
    ],
    'owner-gate classes changed: recheck what deploy-alone means',
  );
  const alone = {
    'apps/api/migrations/0042_add_thing.sql': 'D1 migrations / schema',
    'apps/api/src/db/schema.ts': 'D1 migrations / schema',
    'apps/api/src/lib/auth.ts': 'auth / authz',
    'apps/web/src/lib/session-guard.ts': 'auth / authz',
    'apps/web/src/lib/playback/runtime.ts': 'provider / playback',
    'packages/music/src/spotify.ts': 'provider / playback',
    'apps/api/wrangler.toml': 'CI / deploy / infrastructure',
    'apps/web/public/_headers': 'CI / deploy / infrastructure',
    'pnpm-workspace.yaml': 'CI / deploy / infrastructure',
  };
  for (const [path, gate] of Object.entries(alone)) {
    const c = classify([path]);
    assert.equal(c.deployAlone, true, path);
    assert.deepEqual(c.aloneClasses, [gate], path);
  }
  for (const path of [
    'AGENTS.md',
    'CLAUDE.md',
    'agent-prompts/daily/start-session.md',
    'ritmofit_dev_plan/tasks/README.md',
    'ritmofit_dev_plan/handoffs/README.md',
    'ritmofit_dev_plan/two-machine-rules.md',
  ]) {
    assert.deepEqual(gateClasses([path]), ['agent rules'], path);
    assert.equal(isShipped(path), false, path);
  }
  // Gated files that never ship (tests, CI, repo scripts) do not make a change deploy-alone.
  for (const path of [
    'apps/api/test/authz.integration.test.ts',
    'apps/web/src/components/LiveMode.test.tsx',
    'apps/api/drizzle.config.ts',
    '.github/workflows/ci.yml',
    'scripts/deploy.sh',
    'package.json',
  ]) {
    const c = classify([path]);
    assert.ok(c.classes.length > 0, path);
    assert.equal(c.deployAlone, false, path);
    assert.equal(c.shipped, false, path);
  }
});

test('the 2026-11-23 PRs: #789 deploys alone, #790 and #792 ship, #793 does not', () => {
  const c789 = classify(PR_FILES[789]);
  assert.equal(c789.shipped, true);
  assert.equal(c789.deployAlone, true);
  assert.deepEqual(c789.aloneClasses, ['provider / playback']);
  assert.deepEqual(c789.shippedFiles, ['apps/web/src/components/LiveMode.tsx']);
  for (const pr of [790, 792]) {
    const c = classify(PR_FILES[pr]);
    assert.equal(c.shipped, true, `#${pr}`);
    assert.equal(c.deployAlone, false, `#${pr}`);
    assert.deepEqual(c.shippedFiles, ['apps/web/src/components/TrackSearch.tsx'], `#${pr}`);
  }
  const c793 = classify(PR_FILES[793]);
  assert.equal(c793.shipped, false);
  assert.deepEqual(c793.classes, []);
  assert.equal(classify(PR_FILES.docs).shipped, false);
});

test('squash subjects give the PR number and title', () => {
  assert.deepEqual(parseSubject('fix(web): a late My likes page (RF-241) (#792)'), {
    pr: 792,
    title: 'fix(web): a late My likes page (RF-241)',
  });
  assert.deepEqual(parseSubject('docs: a direct push'), { pr: null, title: 'docs: a direct push' });
});

test('steps put each deploy-alone change on its own, in merge order', () => {
  const nov23 = [
    commit('787', 787, PR_FILES.docs),
    commit('788', 788, PR_FILES.docs),
    commit('789', 789, PR_FILES[789]),
    commit('790', 790, PR_FILES[790]),
    commit('791', 791, PR_FILES.docs),
    commit('792', 792, PR_FILES[792]),
    commit('793', 793, PR_FILES[793]),
    commit('794', 794, PR_FILES.docs),
  ];
  const steps = planSteps(nov23);
  assert.deepEqual(
    steps.map((s) => ({
      sha: s.sha,
      alone: s.alone,
      classes: s.classes,
      shipped: s.shipped.map((c) => c.pr),
      carried: s.carried.map((c) => c.pr),
    })),
    [
      {
        sha: '789',
        alone: true,
        classes: ['provider / playback'],
        shipped: [789],
        carried: [787, 788],
      },
      { sha: '794', alone: false, classes: [], shipped: [790, 792], carried: [791, 793, 794] },
    ],
  );
  assert.equal(checkRange(nov23).ok, false);
  assert.equal(checkRange(nov23.slice(0, 3)).ok, true, 'docs plus #789 alone');

  const migration = ['apps/api/migrations/0042_add_thing.sql', 'apps/api/src/db/schema.ts'];
  const playback = ['apps/web/src/lib/playback/runtime.ts'];
  const screen = ['apps/web/src/components/ClassesHome.tsx'];
  const twoAlone = [commit('a', 1, playback), commit('b', 2, migration), commit('c', 3, screen)];
  assert.deepEqual(
    planSteps(twoAlone).map((s) => [s.sha, s.alone]),
    [
      ['a', true],
      ['b', true],
      ['c', false],
    ],
  );
  assert.equal(checkRange(twoAlone.slice(0, 2)).ok, false, 'two deploy-alone changes');
  const aloneLast = [
    commit('c', 3, screen),
    commit('d', 4, PR_FILES.docs),
    commit('a', 1, playback),
  ];
  assert.deepEqual(
    planSteps(aloneLast).map((s) => [
      s.sha,
      s.shipped.map((c) => c.pr),
      s.carried.map((c) => c.pr),
    ]),
    [
      ['d', [3], [4]],
      ['a', [1], []],
    ],
  );
  const ordinary = [commit('c', 3, screen), commit('e', 5, ['packages/shared/src/index.ts'])];
  assert.equal(planSteps(ordinary).length, 1);
  assert.equal(checkRange(ordinary).ok, true);
  assert.deepEqual(planSteps([commit('d', 4, PR_FILES.docs), commit('t', 793, PR_FILES[793])]), []);
  assert.deepEqual(planSteps([]), []);
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'release-status-'));
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  git(root, 'init', '-q', '--bare', origin);
  git(root, 'init', '-q', '-b', 'main', work);
  for (const [k, v] of [
    ['user.email', 'release-status-test@example.com'],
    ['user.name', 'release-status-test'],
    ['commit.gpgSign', 'false'],
    ['tag.gpgSign', 'false'],
  ]) {
    git(work, 'config', k, v);
  }
  git(work, 'remote', 'add', 'origin', origin);
  const add = (subject, files) => {
    for (const f of files) {
      mkdirSync(join(work, dirname(f)), { recursive: true });
      appendFileSync(join(work, f), `${subject}\n`);
    }
    git(work, 'add', '-A');
    git(work, 'commit', '-q', '-m', subject);
    return git(work, 'rev-parse', 'HEAD');
  };
  return { root, work, add, g: (...args) => git(work, ...args) };
}

test('CLI: report and guard on a fixture repo with an origin', () => {
  const { root, work, add, g } = fixture();
  try {
    const base = add('fix(web): one button radius (#786)', ['apps/web/src/components/Button.tsx']);
    g('push', '-q', 'origin', 'HEAD:main');

    let r = run(work);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Fetched origin main and tags\./m);
    assert.match(r.stdout, /No deploy\/\* tag yet/);
    assert.match(r.stdout, /Verdict: unknown \(no deploy tag to compare with\)\./);
    r = run(work, '--guard', 'HEAD');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /no deploy\/\* tag yet, so the deploy-alone guard is skipped/);
    assert.match(r.stdout, /^since: none$/m);

    const tag = `deploy/2026-11-23T1730Z-${base.slice(0, 7)}`;
    g(
      'tag',
      '-a',
      tag,
      base,
      '-m',
      'deploy\n\nworker version: fedc7fbf-1bc2-46cd-a90a-3059505e0a7b',
    );
    g('push', '-q', 'origin', `refs/tags/${tag}`);
    add('docs: record a deploy (#787)', PR_FILES.docs);
    const alone = add('feat(web): Live names the next song (#789)', [
      'apps/web/src/components/LiveMode.tsx',
      'apps/web/src/components/LiveMode.test.tsx',
    ]);
    const screen = add('feat(web): likes past 200 (#790)', [
      'apps/web/src/components/TrackSearch.tsx',
    ]);
    add('test(web): likes in pick mode (#793)', PR_FILES[793].slice(0, 2));
    const direct = add('docs: a direct push', ['ritmofit_dev_plan/DEVELOPMENT_PLAN.md']);
    g('push', '-q', 'origin', 'HEAD:main');
    // A tag that is not a deploy/<time>-<sha7> name is ignored.
    g('tag', 'deploy/latest', direct);
    // Only the fetch can bring back origin/main and the deploy tag.
    g('update-ref', '-d', 'refs/remotes/origin/main');
    g('tag', '-d', tag);

    r = run(work);
    assert.equal(r.status, 0, r.stderr);
    const s7 = (sha) => sha.slice(0, 7);
    for (const line of [
      `Production (newest deploy tag): ${tag}`,
      `  commit ${s7(base)}, deployed 2026-11-23 17:30 UTC, Worker fedc7fbf-1bc2-46cd-a90a-3059505e0a7b`,
      `origin/main: ${s7(direct)}, 5 commits after the tag`,
      `  #789 ${s7(alone)} feat(web): Live names the next song`,
      '       shipped, deploys alone (provider / playback); owner-gate: provider / playback',
      `  #790 ${s7(screen)} feat(web): likes past 200`,
      '       shipped; owner-gate: none',
      `  ${s7(direct)} ${s7(direct)} docs: a direct push`,
      "Verdict: deploy due, 2 steps in merge order. Each needs the owner's yes in the session:",
      `  1. scripts/deploy.sh ${s7(alone)}   #789 alone (provider / playback) (also carries #787: not shipped)`,
      `  2. scripts/deploy.sh ${s7(direct)}   #790 (also carries #793, ${s7(direct)}: not shipped)`,
    ]) {
      assert.ok(r.stdout.split('\n').includes(line), `missing line: ${line}\n${r.stdout}`);
    }
    assert.match(
      r.stdout,
      /#793 \S+ test\(web\): likes in pick mode\n {7}not shipped; owner-gate: none/,
    );
    assert.doesNotMatch(r.stdout, /only local/);

    r = run(work, '--guard', direct);
    assert.equal(r.status, 1);
    assert.match(r.stdout, new RegExp(`^since: ${tag}$`, 'm'));
    assert.match(r.stderr, /mixes a deploy-alone change with other shipped changes/);
    assert.match(r.stderr, new RegExp(`#789 ${s7(alone)} deploys alone \\(provider / playback\\)`));
    assert.match(r.stderr, new RegExp(`also shipped: #790 ${s7(screen)}`));
    assert.match(
      r.stderr,
      /Pass --allow-batch only when the owner said, in this session, to batch them/,
    );
    r = run(work, '--guard', direct, '--allow-batch');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^batch: allowed by --allow-batch \(#789 with #790\)$/m);
    r = run(work, '--guard', alone);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /deploy guard: ok, 1 shipped change since/);
    assert.doesNotMatch(r.stdout, /^batch:/m);
    r = run(work, '--guard', base);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /\(a redeploy\)/);

    // A deploy whose tag push failed: the tag is only local.
    const local = `deploy/2026-11-24T0237Z-${s7(direct)}`;
    g('tag', '-a', local, direct, '-m', 'deploy');
    r = run(work);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`Production \\(newest deploy tag\\): ${local}`));
    assert.match(r.stdout, /this tag is only local; its deploy did not push it/);
    assert.ok(r.stdout.includes(`    git push origin refs/tags/${local}`), r.stdout);
    assert.match(r.stdout, /Verdict: nothing to ship \(production has origin\/main\)\./);

    g('push', '-q', 'origin', `refs/tags/${local}`);
    add('docs: close the round (#795)', ['ritmofit_dev_plan/handoffs/x.md']);
    g('push', '-q', 'origin', 'HEAD:main');
    r = run(work);
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /only local/);
    assert.match(r.stdout, /1 commit after the tag/);
    assert.match(r.stdout, /Verdict: nothing to ship \(docs, records and tests only\)\./);
    r = run(work, '--no-fetch');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Skipped the fetch \(--no-fetch\)/m);

    // Moving a shipped file out of the shipped roots still ships: its old path is deleted.
    mkdirSync(join(work, 'docs'));
    g('mv', 'apps/web/src/components/Button.tsx', 'docs/old-button.tsx');
    g('commit', '-q', '-m', 'chore: move the button (#796)');
    const moved = g('rev-parse', 'HEAD');
    r = run(work, '--guard', moved);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /deploy guard: ok, 1 shipped change since/);

    for (const args of [['--guard'], ['--bogus'], ['--guard', 'a', 'b']]) {
      assert.equal(run(work, ...args).status, 2, args.join(' '));
    }
    r = run(work, '--guard', 'no-such-commit');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^release-status: /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
