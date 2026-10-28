#!/usr/bin/env node
// RF trace for PRs (AGENTS.md › "Delegation And Merge Policy").
//
// A PR that changes product code (apps/, packages/, e2e/) must also change at least one
// ritmofit_dev_plan/tasks/RF-*.json record that cites this PR's URL. That keeps every merged
// product change traceable to a task, lets a task reach Done inside its own work PR, and lets
// start-session treat a merge as recorded when an RF record cites it.
//
// Usage (CI): PR_NUMBER=123 GITHUB_REPOSITORY=owner/repo node scripts/rf-trace.mjs < changed-files.txt
// Run from the repo root of the PR checkout so the changed records can be read.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PRODUCT = /^(apps|packages|e2e)\//;
const RECORD = /^ritmofit_dev_plan\/tasks\/RF-\d+\.json$/;

/**
 * paths: changed files. readRecord(path) returns the record text at the PR head, or null when the
 * file was deleted. Returns { product, cited: [paths], pass }.
 */
export function evaluate(paths, prUrl, readRecord) {
  const product = paths.some((p) => PRODUCT.test(p));
  const cited = paths.filter((p) => RECORD.test(p) && citesPr(readRecord(p), prUrl));
  return { product, cited, pass: !product || cited.length > 0 };
}

function citesPr(text, prUrl) {
  if (text === null) return false;
  // Exact URL only, so pull/12 never matches pull/123.
  return new RegExp(`${escape(prUrl)}(?![0-9])`).test(text);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

function main() {
  const { PR_NUMBER, GITHUB_REPOSITORY } = process.env;
  if (!/^\d+$/.test(PR_NUMBER ?? '') || !/^[\w.-]+\/[\w.-]+$/.test(GITHUB_REPOSITORY ?? '')) {
    console.error(
      'rf-trace: PR_NUMBER and GITHUB_REPOSITORY are required; refusing to pass blind.',
    );
    process.exit(1);
  }
  const paths = readFileSync(0, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (paths.length === 0) {
    console.error('rf-trace: no changed files read from stdin; refusing to pass blind.');
    process.exit(1);
  }
  const prUrl = `https://github.com/${GITHUB_REPOSITORY}/pull/${PR_NUMBER}`;
  const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
  const { product, cited, pass } = evaluate(paths, prUrl, read);
  if (!product) {
    console.log('rf-trace: no product paths changed; no RF record required.');
    return;
  }
  if (pass) {
    console.log(`rf-trace: product change traced by ${cited.join(', ')}.`);
    return;
  }
  console.error(
    `rf-trace: FAIL. This PR changes apps/, packages/ or e2e/ but no changed RF record cites ` +
      `${prUrl}. Add the PR to the task's evidence (kind "pr") in this PR.`,
  );
  process.exit(1);
}

// Compare resolved paths: a symlinked path (macOS /var -> /private/var) must still run the
// gate. A guard that silently skips main() would let CI pass without checking anything.
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (invokedDirectly) main();
