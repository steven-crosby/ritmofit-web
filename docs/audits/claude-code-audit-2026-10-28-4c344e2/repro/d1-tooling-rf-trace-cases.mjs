// Usage: node d1-tooling-rf-trace-cases.mjs <worktree>  — exercises scripts/rf-trace.mjs evaluate().
import { pathToFileURL } from 'node:url';
const { evaluate } = await import(pathToFileURL(`${process.argv[2]}/scripts/rf-trace.mjs`).href);
const url = 'https://github.com/steven-crosby/ritmofit-web/pull/700';
const rec = (status, ref = url, kind = 'pr') => JSON.stringify({ status, evidence: [{ kind, ref }] });
const cases = [
  ['unrelated already-done record gains a pr cite', ['apps/web/src/App.tsx', 'ritmofit_dev_plan/tasks/RF-5.json'], { 'ritmofit_dev_plan/tasks/RF-5.json': rec('done') }],
  ['task set to blocked (counts as final)', ['apps/api/src/index.ts', 'ritmofit_dev_plan/tasks/RF-9.json'], { 'ritmofit_dev_plan/tasks/RF-9.json': rec('blocked') }],
  ['record cites PR as kind=test only', ['apps/web/x.ts', 'ritmofit_dev_plan/tasks/RF-9.json'], { 'ritmofit_dev_plan/tasks/RF-9.json': rec('done', url, 'test') }],
  ['record cites a different PR', ['apps/web/x.ts', 'ritmofit_dev_plan/tasks/RF-9.json'], { 'ritmofit_dev_plan/tasks/RF-9.json': rec('done', url.replace('700', '699')) }],
  ['record deleted in the PR', ['apps/web/x.ts', 'ritmofit_dev_plan/tasks/RF-9.json'], { 'ritmofit_dev_plan/tasks/RF-9.json': null }],
  ['in_progress record', ['apps/web/x.ts', 'ritmofit_dev_plan/tasks/RF-9.json'], { 'ritmofit_dev_plan/tasks/RF-9.json': rec('in_progress') }],
  ['design-system tokens only (ships CSS to web)', ['ritmofit_design_system/tokens.json'], {}],
  ['lockfile / workspace overrides only (ships deps)', ['pnpm-lock.yaml', 'pnpm-workspace.yaml'], {}],
];
for (const [name, paths, files] of cases) {
  const r = evaluate(paths, url, (p) => (p in files ? files[p] : null));
  console.log(`${r.pass ? 'PASS' : 'FAIL'}\tproduct=${r.product}\t${name}`);
}
