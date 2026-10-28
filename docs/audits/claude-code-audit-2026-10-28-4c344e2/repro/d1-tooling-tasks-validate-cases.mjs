// Usage: node d1-tooling-tasks-validate-cases.mjs <worktree> — probes validateTasks() with crafted graphs.
import { pathToFileURL } from 'node:url';
const { validateTasks, newTask } = await import(pathToFileURL(`${process.argv[2]}/scripts/tasks.mjs`).href);
const base = (id, over = {}) => ({ schemaVersion: 1, id, title: id, kind: 'task', status: 'backlog', priority: 'P3', parent: null, dependsOn: [], acceptance: ['a'], nextAction: 'n', blocker: null, evidence: [], resolution: null, followUps: [], ...over });
const done = (id, over = {}) => base(id, { status: 'done', nextAction: null, resolution: 'r', evidence: [{ kind: 'pr', ref: 'https://x/y', summary: 's', checkedOn: '2026-10-27' }], ...over });
const cases = {
  'dependsOn cycle': [base('RF-1', { dependsOn: ['RF-2'] }), base('RF-2', { dependsOn: ['RF-1'] })],
  'parent cycle': [base('RF-1', { parent: 'RF-2' }), base('RF-2', { parent: 'RF-1' })],
  'child depends on parent (completion deadlock)': [base('RF-1'), base('RF-2', { parent: 'RF-1', dependsOn: ['RF-1'] })],
  'missing dependency': [base('RF-1', { dependsOn: ['RF-9'] })],
  'done with open child': [done('RF-1'), base('RF-2', { parent: 'RF-1' })],
  'ready with cancelled dependency': [base('RF-1', { status: 'cancelled', nextAction: null, resolution: 'r' }), base('RF-2', { status: 'ready', dependsOn: ['RF-1'] })],
  'pr evidence whose ref is not a PR URL': [done('RF-1', { evidence: [{ kind: 'pr', ref: 'https://example.com/', summary: 's', checkedOn: '2026-10-27' }] })],
  'checkedOn in the future': [done('RF-1', { evidence: [{ kind: 'test', ref: 'https://x/y', summary: 's', checkedOn: '2099-01-01' }] })],
  'invalid calendar date': [done('RF-1', { evidence: [{ kind: 'test', ref: 'https://x/y', summary: 's', checkedOn: '2026-02-30' }] })],
};
for (const [name, tasks] of Object.entries(cases)) {
  const errors = validateTasks(tasks);
  console.log(`${errors.length ? 'REJECT' : 'ACCEPT'}\t${name}${errors.length ? '\t' + errors.join('; ') : ''}`);
}
// ID recycling: deleting the highest record makes `create` reuse its ID.
const all = [base('RF-104'), base('RF-105')];
console.log('create after RF-105 exists ->', newTask(all, 't').id, '; after RF-105 is deleted ->', newTask(all.slice(0, 1), 't').id);
