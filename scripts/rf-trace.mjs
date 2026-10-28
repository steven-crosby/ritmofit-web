#!/usr/bin/env node
// RF trace for PRs (AGENTS.md › "Delegation And Merge Policy").
//
// A PR that changes product code (apps/, packages/, e2e/) must also change at least one
// ritmofit_dev_plan/tasks/RF-*.json record that cites this PR as `pr` evidence and has left the
// working states (Done, For review, Blocked or Cancelled). That keeps every merged product change
// traceable to a task, makes the task's final state land inside its own work PR, and lets
// start-session treat a merge as recorded when an RF record cites it. A draft PR whose task is
// still In progress fails here by design until the work is finished.
//
// Self-contained on purpose: CI may run main's copy of this file from a temp directory.
//
// Usage (CI): PR_NUMBER=123 GITHUB_REPOSITORY=owner/repo node scripts/rf-trace.mjs < changed-files.txt
// Run from the repo root of the PR checkout so the changed records can be read.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PRODUCT = /^(apps|packages|e2e)\//;
const RECORD = /^ritmofit_dev_plan\/tasks\/RF-\d+\.json$/;
export const FINAL_STATUSES = ['done', 'review', 'blocked', 'cancelled'];

/**
 * paths: changed files. readRecord(path) returns the record text at the PR head, or null when the
 * file was deleted. Returns { product, cited: [{ path, status }], final: [paths], pass }.
 */
export function evaluate(paths, prUrl, readRecord) {
  const product = paths.some((p) => PRODUCT.test(p));
  const cited = [];
  for (const path of paths.filter((p) => RECORD.test(p))) {
    const record = parse(readRecord(path));
    const citesPr = record?.evidence?.some?.((e) => e?.kind === 'pr' && e?.ref === prUrl);
    if (citesPr) cited.push({ path, status: String(record.status) });
  }
  const final = cited.filter((c) => FINAL_STATUSES.includes(c.status)).map((c) => c.path);
  return { product, cited, final, pass: !product || final.length > 0 };
}

function parse(text) {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null; // tasks:check reports invalid JSON; here it simply does not count.
  }
}

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
  const { product, cited, final, pass } = evaluate(paths, prUrl, read);
  if (!product) {
    console.log('rf-trace: no product paths changed; no RF record required.');
    return;
  }
  if (pass) {
    console.log(`rf-trace: product change traced by ${final.join(', ')}.`);
    return;
  }
  if (cited.length > 0) {
    const list = cited.map((c) => `${c.path} (${c.status})`).join(', ');
    console.error(
      `rf-trace: FAIL. ${list} cites this PR but is still in a working state. Set the task's ` +
        `final state (${FINAL_STATUSES.join(', ')}) in this PR before it merges.`,
    );
  } else {
    console.error(
      `rf-trace: FAIL. This PR changes apps/, packages/ or e2e/ but no changed RF record cites ` +
        `${prUrl} as "pr" evidence. Add it to the task's evidence in this PR.`,
    );
  }
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
