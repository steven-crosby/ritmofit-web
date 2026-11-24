#!/usr/bin/env node
// Release status (RF-244): what is in production, and is a deploy due?
//
// scripts/deploy.sh tags every deploy it finishes `deploy/<UTC YYYY-MM-DDTHHMMZ>-<sha7>`. That tag is
// production's record. This script compares `origin/main` with the newest one and lists each commit
// merged since, whether it changes shipped code, and its owner-gate classes. It ends with
// "deploy due" and the deploy steps in merge order, or "nothing to ship". It runs local git only
// after fetching origin main and the deploy tags (plus one `git ls-remote` for the tag), and never
// calls Cloudflare. See ritmofit_dev_plan/deployment-runbook.md.
//
//   pnpm release:status                                   # fetch, then report
//   node scripts/release-status.mjs --no-fetch           # report from refs already fetched
//   node scripts/release-status.mjs --guard <sha> [--allow-batch]
//
// --guard is scripts/deploy.sh's deploy-alone guard (AGENTS.md › "Security And Deployment"). It
// exits 0 when the deploy may go ahead, 1 when the range from the newest deploy tag to <sha> mixes
// a deploy-alone change with any other shipped change (it prints the steps) or when there is no
// deploy tag yet, and 2 on a usage or git error. With --allow-batch it reports the batch and exits
// 0. For deploy.sh it prints `since: <tag>`, `since-worker: <the tag's Worker version>` and, for
// an allowed batch, a `batch: ...` line for the deploy tag's message.
//
// Run from the repository whose history should be read (deploy.sh and pnpm run it at the root).

import { execFileSync, spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GATES } from './owner-gate.mjs';

export const TAG_GLOB = 'deploy/*';
/** Fetches main and force-updates deploy tags, so one stale local tag cannot block a deploy. */
export const FETCH_ARGS = [
  'fetch',
  '--quiet',
  'origin',
  'main',
  '+refs/tags/deploy/*:refs/tags/deploy/*',
];
/** deploy/2026-11-24T0237Z-1eed288: the UTC minute of the upload, then the deployed commit. */
export const TAG_PATTERN = /^deploy\/(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})Z-([0-9a-f]{7})$/;

// "Shipped" means a path that can change what production runs: the Worker bundle and its config,
// the SPA build, or remote D1 (migrations). Tests, docs, CI and repo scripts never ship.
const SHIPPED_ROOT = /^(apps\/(api|web)|packages)\//;
/** Root files the Worker or SPA build reads: dependencies, compiler settings and design tokens. */
export const SHIPPED_ROOT_FILES = [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.pnpmfile.cjs',
  '.npmrc',
  // The deploy builds with this Node major (deploy.sh checks it).
  '.nvmrc',
  'tsconfig.base.json',
  // apps/web/scripts/generate-tokens.mjs turns it into the SPA's tokens.css.
  'ritmofit_design_system/tokens.json',
];
const NOT_SHIPPED = [
  // Tests and their snapshots, fixtures and configs.
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /\.fixture\.[^/]+$/,
  /(^|\/)(test|tests|__tests__|__snapshots__)\//,
  /(^|\/)vitest[^/]*\.config\.[cm]?[jt]s$/,
  // Docs, except files the SPA serves from apps/web/public/.
  /^(?!apps\/web\/public\/).*\.md$/i,
  // Repo tools under the shipped roots that never reach production.
  /^apps\/api\/(scripts|openapi)\//,
  /^apps\/api\/drizzle\.config\.ts$/,
  /^apps\/web\/smoke\//,
  /^apps\/web\/scripts\/check-[^/]*$/,
];

/** True when a changed path can change what production runs. */
export function isShipped(path) {
  const inRoot = SHIPPED_ROOT.test(path) || SHIPPED_ROOT_FILES.includes(path);
  return inRoot && !NOT_SHIPPED.some((re) => re.test(path));
}

/** Owner-gate class names (scripts/owner-gate.mjs GATES, in its order) matched by any path. */
export function gateClasses(paths) {
  return GATES.filter((gate) => paths.some((p) => gate.match(p))).map((gate) => gate.name);
}

/**
 * A change is deploy-alone when one of its shipped files is owner-gated. The "agent rules" class
 * has no shipped paths, so this is the D1 migrations / schema, auth / authz, provider / playback
 * and CI / deploy / infrastructure classes.
 */
export function classify(files) {
  const shippedFiles = files.filter(isShipped);
  const aloneClasses = gateClasses(shippedFiles);
  return {
    shipped: shippedFiles.length > 0,
    shippedFiles,
    classes: gateClasses(files),
    aloneClasses,
    deployAlone: aloneClasses.length > 0,
  };
}

/** A squash subject ends with "(#N)". Returns { pr, title }; pr is null when it has none. */
export function parseSubject(subject) {
  const m = /^(.*?)\s*\(#(\d+)\)\s*$/.exec(subject);
  return m ? { pr: Number(m[2]), title: m[1] } : { pr: null, title: subject };
}

/** "#789", or the short SHA when the subject names no PR. */
export function label(commit) {
  return commit.pr === null ? commit.sha.slice(0, 7) : `#${commit.pr}`;
}

/**
 * commits: oldest first, each { sha, pr, title, shipped, deployAlone, aloneClasses }.
 * Returns deploy steps in merge order: each deploy-alone change on its own, consecutive ordinary
 * shipped changes together. A step deploys up to the commit before the next step's first shipped
 * commit, and the last step deploys the newest commit. Not-shipped commits ride along ("carried").
 */
export function planSteps(commits) {
  const steps = [];
  let current = null;
  for (const commit of commits) {
    if (commit.shipped && current?.shipped.length && (commit.deployAlone || current.alone)) {
      steps.push(current);
      current = null;
    }
    current ??= { commits: [], shipped: [], alone: false };
    current.commits.push(commit);
    if (commit.shipped) {
      current.shipped.push(commit);
      current.alone ||= commit.deployAlone;
    }
  }
  if (current?.shipped.length) steps.push(current);
  return steps.map((step) => ({
    sha: step.commits.at(-1).sha,
    alone: step.alone,
    classes: [...new Set(step.shipped.flatMap((c) => c.aloneClasses))],
    shipped: step.shipped,
    carried: step.commits.filter((c) => !c.shipped),
  }));
}

/** The guard's rule: a deploy-alone change may not ship with any other shipped change. */
export function checkRange(commits) {
  const shipped = commits.filter((c) => c.shipped);
  const alone = shipped.filter((c) => c.deployAlone);
  return { ok: alone.length === 0 || shipped.length <= 1, shipped, alone };
}

export function formatStep(step, index) {
  const what = step.alone
    ? `${step.shipped.map(label).join(', ')} alone (${step.classes.join(', ')})`
    : step.shipped.map(label).join(', ');
  const carried = step.carried.length
    ? ` (also carries ${step.carried.map(label).join(', ')}: not shipped)`
    : '';
  return `  ${index + 1}. scripts/deploy.sh ${step.sha.slice(0, 7)}   ${what}${carried}`;
}

function formatCommit(commit) {
  const shipped = !commit.shipped
    ? 'not shipped'
    : commit.deployAlone
      ? `shipped, deploys alone (${commit.aloneClasses.join(', ')})`
      : 'shipped';
  return [
    `  ${label(commit)} ${commit.sha.slice(0, 7)} ${commit.title}`,
    `       ${shipped}; owner-gate: ${commit.classes.join(', ') || 'none'}`,
  ];
}

/** Pushes one tag and nothing else, even with push.followTags set. */
export function pushCommand(name) {
  return `git push --no-follow-tags origin refs/tags/${name}:refs/tags/${name}`;
}

// ---- git ------------------------------------------------------------------------------------

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  }).trimEnd();
}

function gitOk(args) {
  return spawnSync('git', args, { stdio: 'ignore' }).status === 0;
}

function lines(text) {
  return text.split('\n').filter(Boolean);
}

/**
 * The newest deploy tag by creation date (an annotated tag's tagger date), then by name, or null.
 * Names that do not match TAG_PATTERN are ignored.
 */
export function newestDeployTag() {
  // for-each-ref sorts by the last --sort key first; the earlier one breaks ties.
  const names = lines(
    git([
      'for-each-ref',
      '--sort=-refname',
      '--sort=-creatordate',
      '--format=%(refname:strip=2)',
      `refs/tags/${TAG_GLOB}`,
    ]),
  ).filter((n) => TAG_PATTERN.test(n));
  if (names.length === 0) return null;
  const name = names[0];
  const sha = git(['rev-parse', '--verify', `refs/tags/${name}^{commit}`]);
  const message = git(['for-each-ref', `refs/tags/${name}`, '--format=%(contents)']);
  const worker = /^worker version: (\S+)/m.exec(message)?.[1] ?? null;
  const [, day, hh, mm] = TAG_PATTERN.exec(name);
  return { name, sha, worker, time: `${day} ${hh}:${mm} UTC` };
}

/** First-parent commits in (base, tip], oldest first, each classified. base null = none. */
export function commitsBetween(base, tip) {
  const range = base ? [`${base}..${tip}`] : [tip];
  const shas = lines(git(['rev-list', '--reverse', '--first-parent', ...range]));
  return shas.map((sha) => {
    const subject = git(['show', '-s', '--format=%s', sha]);
    const parents = git(['show', '-s', '--format=%P', sha]).split(' ').filter(Boolean);
    // Deletions count; --no-renames lists both sides of a rename. A merge is read against its
    // first parent, so it counts everything it brought in.
    const files = lines(
      parents.length
        ? git(['diff', '--name-only', '--no-renames', parents[0], sha])
        : git(['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '--no-renames', sha]),
    );
    return { sha, ...parseSubject(subject), files, ...classify(files) };
  });
}

// ---- CLI --------------------------------------------------------------------------------------

function report({ fetch }) {
  const out = [];
  if (fetch) {
    const fetched = spawnSync('git', FETCH_ARGS, { encoding: 'utf8' });
    if (fetched.status !== 0) {
      throw new Error(
        `fetching origin main and deploy tags failed; rerun with --no-fetch to use the refs already fetched.\n${fetched.stderr}`,
      );
    }
    out.push('Fetched origin main and the deploy tags.');
  } else {
    out.push('Skipped the fetch (--no-fetch): refs as last fetched.');
  }
  const tip = git(['rev-parse', '--verify', 'origin/main^{commit}']);
  const tag = newestDeployTag();
  if (!tag) {
    out.push(
      '',
      'No deploy/* tag yet: git does not record which commit production serves.',
      'Use the newest HISTORY.md deploy entry. Until the first tag is backfilled (RF-245),',
      'scripts/deploy.sh refuses to deploy unless the owner says to pass --allow-batch.',
      `origin/main: ${tip.slice(0, 7)}`,
      '',
      'Verdict: unknown (no deploy tag to compare with).',
    );
    return out;
  }
  out.push(
    '',
    `Production (newest deploy tag): ${tag.name}`,
    `  commit ${tag.sha.slice(0, 7)}, deployed ${tag.time}` +
      (tag.worker ? `, Worker ${tag.worker}` : ''),
  );
  if (fetch) {
    const remote = spawnSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag.name}`], {
      encoding: 'utf8',
    });
    if (remote.status !== 0) {
      out.push('  Warning: could not ask origin whether this tag is there.');
    } else if (!remote.stdout.trim()) {
      out.push(
        '  Warning: this tag is only local; its deploy did not push it. Push it now:',
        `    ${pushCommand(tag.name)}`,
      );
    }
  }
  if (!gitOk(['merge-base', '--is-ancestor', tag.sha, tip])) {
    out.push(
      "  Warning: the tag's commit is not on origin/main; the list holds the origin/main commits it lacks.",
    );
  }
  const commits = commitsBetween(tag.sha, tip);
  out.push(
    `origin/main: ${tip.slice(0, 7)}, ${commits.length} commit${commits.length === 1 ? '' : 's'} after the tag`,
  );
  if (commits.length) {
    out.push('', 'Merged since the tag, oldest first:');
    for (const commit of commits) out.push(...formatCommit(commit));
  }
  const steps = planSteps(commits);
  out.push('');
  if (steps.length === 0) {
    out.push(
      commits.length
        ? 'Verdict: nothing to ship (no commit changes shipped code).'
        : 'Verdict: nothing to ship (production has origin/main).',
    );
  } else {
    out.push(
      `Verdict: deploy due, ${steps.length} step${steps.length === 1 ? '' : 's'} in merge order. ` +
        "Each needs the owner's yes in the session:",
      ...steps.map(formatStep),
    );
  }
  return out;
}

function guard(ref, allowBatch) {
  const sha = git(['rev-parse', '--verify', `${ref}^{commit}`]);
  const tag = newestDeployTag();
  if (!tag) {
    console.log('since: none');
    if (allowBatch) {
      console.log(
        'deploy guard: no deploy/* tag yet, so nothing to check against; going ahead under ' +
          "--allow-batch. This deploy's tag starts the record.",
      );
      console.log('batch: allowed by --allow-batch (no deploy tag to compare with)');
      return 0;
    }
    console.error(
      'refusing to deploy: no deploy/* tag yet: the conductor backfills it (RF-245) before any ' +
        "deploy, or pass --allow-batch on the owner's word.",
    );
    return 1;
  }
  console.log(`since: ${tag.name}`);
  console.log(`since-worker: ${tag.worker ?? 'unknown'}`);
  const contains = gitOk(['merge-base', '--is-ancestor', tag.sha, sha]);
  if (!contains) {
    console.log(
      `deploy guard: note: ${sha.slice(0, 7)} does not contain ${tag.name}'s commit; ` +
        'checking the commits it has that the tag lacks.',
    );
  }
  const commits = commitsBetween(tag.sha, sha);
  const { ok, shipped, alone } = checkRange(commits);
  if (ok) {
    let note = '';
    if (sha === tag.sha) note = ' (a redeploy)';
    else if (commits.length === 0) {
      // sha is an ancestor of the tag: the commits sha..tag go back out of production.
      note = ` (an older commit: this deploy takes back ${sha.slice(0, 7)}..${tag.sha.slice(0, 7)})`;
    }
    console.log(
      `deploy guard: ok, ${shipped.length} shipped change${shipped.length === 1 ? '' : 's'} ` +
        `since ${tag.name}${note}.`,
    );
    return 0;
  }
  const others = shipped.filter((c) => !alone.includes(c));
  const describe = alone
    .map((c) => `${label(c)} ${c.sha.slice(0, 7)} deploys alone (${c.aloneClasses.join(', ')})`)
    .join('; ');
  const summary = `${alone.map(label).join(', ')} with ${others.map(label).join(', ') || 'each other'}`;
  if (allowBatch) {
    console.log(
      `deploy guard: batching under --allow-batch: ${describe}, shipping here with ` +
        `${others.map(label).join(', ') || 'each other'}.`,
    );
    console.log(`batch: allowed by --allow-batch (${summary})`);
    return 0;
  }
  const steps = planSteps(commits);
  console.error(
    [
      `refusing to deploy ${sha.slice(0, 7)}: ${tag.name}..${sha.slice(0, 7)} mixes a deploy-alone change with other shipped changes`,
      `  ${describe}`,
      `  also shipped: ${others.map((c) => `${label(c)} ${c.sha.slice(0, 7)}`).join(', ') || 'none'}`,
      "Deploy in these steps, one at a time, each with the owner's yes in the session:",
      ...steps.map(formatStep),
      'Pass --allow-batch only when the owner said, in this session, to batch them; record that in HISTORY.',
    ].join('\n'),
  );
  return 1;
}

const USAGE = [
  'usage: node scripts/release-status.mjs [--no-fetch]',
  '       node scripts/release-status.mjs --guard <sha> [--allow-batch]',
].join('\n');

export function main(argv) {
  const args = [...argv];
  const take = (flag) => {
    const i = args.indexOf(flag);
    if (i < 0) return false;
    args.splice(i, 1);
    return true;
  };
  try {
    if (take('-h') || take('--help')) {
      console.log(USAGE);
      return 0;
    }
    if (take('--guard')) {
      const allowBatch = take('--allow-batch');
      if (args.length !== 1 || args[0].startsWith('-')) {
        console.error(USAGE);
        return 2;
      }
      return guard(args[0], allowBatch);
    }
    const fetch = !take('--no-fetch');
    if (args.length) {
      console.error(USAGE);
      return 2;
    }
    console.log(report({ fetch }).join('\n'));
    return 0;
  } catch (err) {
    // execFileSync's message already carries the failed command and its stderr.
    console.error(`release-status: ${err?.message ?? err}`);
    return 2;
  }
}

// Same direct-run check as owner-gate.mjs: a symlinked path must still run main().
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (invokedDirectly) process.exitCode = main(process.argv.slice(2));
