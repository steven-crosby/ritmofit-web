import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { loadTasks, main, newTask, renderBoard, saveTask, validateTasks } from './tasks.mjs';

const task = (id = 'RF-1', patch = {}) => ({
  schemaVersion: 1,
  id,
  title: 'Preserve cue milliseconds on a text-only save',
  kind: 'task',
  status: 'backlog',
  priority: 'P1',
  parent: null,
  dependsOn: [],
  acceptance: ['A text-only save keeps the original 10313 ms anchor.'],
  nextAction: 'Review the reproduction and agree scope.',
  blocker: null,
  evidence: [],
  resolution: null,
  followUps: [],
  ...patch,
});
const completed = (id = 'RF-1', patch = {}) =>
  task(id, {
    status: 'done',
    nextAction: null,
    resolution: 'The scoped implementation passed its acceptance.',
    evidence: [
      { kind: 'test', ref: 'evidence.txt', summary: 'Regression passed.', checkedOn: '2026-10-27' },
    ],
    ...patch,
  });

async function fixture(t, tasks = [task()]) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rf-tasks-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'ritmofit_dev_plan/tasks'), { recursive: true });
  await writeFile(path.join(root, 'evidence.txt'), 'Recorded fixture evidence.');
  for (const item of tasks) {
    await writeFile(
      path.join(root, `ritmofit_dev_plan/tasks/${item.id}.json`),
      JSON.stringify(item),
    );
  }
  await writeFile(path.join(root, 'ritmofit_dev_plan/tasks.md'), renderBoard(tasks));
  return root;
}

test('malformed records, misspelled fields, empty acceptance and duplicate IDs fail closed', () => {
  for (const bad of [
    null,
    [],
    task('bad'),
    task('RF-1', { status: 'finished' }),
    task('RF-1', { acceptance: [] }),
    task('RF-1', { dependsOn: 12 }),
    task('RF-1', { evidence: [null] }),
    task('RF-1', { nextAction: null }),
    task('RF-1', { priorty: 'P1' }),
  ]) {
    assert.ok(validateTasks([bad]).length, JSON.stringify(bad));
  }
  assert.match(validateTasks([task(), task()]).join('\n'), /duplicate id/);
});

test('completion requires bounded acceptance, resolution and evidence; blocked needs a reason', () => {
  assert.deepEqual(validateTasks([completed()]), []);
  for (const patch of [
    { evidence: [] },
    { resolution: null },
    { nextAction: 'Still owing work' },
  ]) {
    assert.ok(validateTasks([completed('RF-1', patch)]).length);
  }
  assert.ok(validateTasks([task('RF-1', { status: 'blocked' })]).length);
  assert.deepEqual(
    validateTasks([task('RF-1', { status: 'blocked', blocker: 'Waiting for device check.' })]),
    [],
  );
});

test('unknown references and cycles fail; incomplete or cancelled prerequisites cannot become ready', () => {
  assert.match(
    validateTasks([task('RF-1', { dependsOn: ['RF-2'] })]).join('\n'),
    /unknown reference/,
  );
  for (const relation of ['dependsOn', 'followUps', 'parent']) {
    const value = (id) => (relation === 'parent' ? id : [id]);
    assert.match(
      validateTasks([
        task('RF-1', { [relation]: value('RF-2') }),
        task('RF-2', { [relation]: value('RF-1') }),
      ]).join('\n'),
      /cycle/,
    );
  }
  for (const prerequisite of [
    task('RF-1'),
    task('RF-1', {
      status: 'cancelled',
      nextAction: null,
      resolution: 'Superseded.',
    }),
  ]) {
    assert.match(
      validateTasks([prerequisite, task('RF-2', { status: 'ready', dependsOn: ['RF-1'] })]).join(
        '\n',
      ),
      /not done/,
    );
  }
});

test('a parent cannot be done with open children; a bounded done task may name an open follow-up', () => {
  assert.match(
    validateTasks([completed(), task('RF-2', { parent: 'RF-1' })]).join('\n'),
    /child RF-2 is still open/,
  );
  assert.deepEqual(validateTasks([completed('RF-1', { followUps: ['RF-2'] }), task('RF-2')]), []);
  assert.match(
    validateTasks([task('RF-1'), task('RF-2', { parent: 'RF-1', dependsOn: ['RF-1'] })]).join('\n'),
    /completion cycle/,
  );
});

test('new tasks cannot start with placeholder acceptance, and evidence dates must be real dates', () => {
  assert.match(
    validateTasks([{ ...newTask([], 'New task'), status: 'ready' }]).join('\n'),
    /draft acceptance/,
  );
  assert.ok(
    validateTasks([
      completed('RF-1', {
        evidence: [
          {
            kind: 'test',
            ref: 'evidence.txt',
            summary: 'Bad date.',
            checkedOn: '2026-02-30',
          },
        ],
      }),
    ]).length,
  );
});

test('recorded claims and checked PR states remain distinguishable; Markdown titles cannot inject table rows', () => {
  const board = renderBoard([
    task('RF-1', {
      title: '<script> | [fake](https://example.com)',
      evidence: [
        {
          kind: 'source',
          ref: 'https://example.com/original',
          summary: 'Carried forward.',
          checkedOn: null,
        },
        {
          kind: 'pr',
          ref: 'https://example.com/pr',
          summary: 'Merged only.',
          checkedOn: '2026-10-27',
        },
      ],
    }),
  ]);
  assert.match(board, /recorded; checked 2026-10-27/);
  assert.match(board, /&lt;script&gt; &#124; &#91;fake&#93;/);
  assert.match(board, /Status is not authorization/);
});

test('a stale board, mismatched filename or nonportable evidence path fails the real loader/check', async (t) => {
  const root = await fixture(t);
  await main(['check'], root);
  await writeFile(path.join(root, 'ritmofit_dev_plan/tasks.md'), '# stale');
  await assert.rejects(main(['check'], root), /stale/);
  for (const ref of ['/cursor/stores/self/plan.md', '../outside.md', 'missing.md']) {
    await writeFile(
      path.join(root, 'ritmofit_dev_plan/tasks/RF-1.json'),
      JSON.stringify(
        completed('RF-1', {
          evidence: [{ kind: 'document', ref, summary: 'Not portable.', checkedOn: null }],
        }),
      ),
    );
    await assert.rejects(loadTasks(root));
  }
  await writeFile(
    path.join(root, 'ritmofit_dev_plan/tasks/RF-1.json'),
    JSON.stringify(task('RF-2')),
  );
  await assert.rejects(loadTasks(root), /filename must match/);
});

test('render is deterministic and recovers drift; create allocates above existing IDs and reserved gaps', async (t) => {
  const root = await fixture(t);
  assert.equal(newTask([task('RF-95')], 'Next task').id, 'RF-96');
  assert.equal(newTask([], 'Next task').id, 'RF-87');
  await main(['create', 'Keep the next cue visible'], root);
  const tasks = await loadTasks(root);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[1].status, 'backlog');
  await assert.rejects(main(['check'], root), /stale/);
  await main(['render'], root);
  await main(['check'], root);
  assert.equal(
    await readFile(path.join(root, 'ritmofit_dev_plan/tasks.md'), 'utf8'),
    renderBoard(tasks),
  );
});

test('updates reject malformed patches, ID changes, invalid completion and stale reads without clobbering records', async (t) => {
  const root = await fixture(t);
  const recordPath = path.join(root, 'ritmofit_dev_plan/tasks/RF-1.json');
  const original = await readFile(recordPath, 'utf8');
  const patchPath = path.join(root, 'patch.json');
  for (const patch of [
    [],
    { id: 'RF-2' },
    { status: 'done' },
    { typo: 'bad' },
    {
      evidence: [
        { kind: 'document', ref: '/cursor/plan.md', summary: 'Nonportable.', checkedOn: null },
      ],
    },
  ]) {
    await writeFile(patchPath, JSON.stringify(patch));
    await assert.rejects(main(['update', 'RF-1', patchPath], root));
    assert.equal(await readFile(recordPath, 'utf8'), original);
  }
  await writeFile(
    patchPath,
    JSON.stringify({ status: 'blocked', blocker: 'Waiting for approval.' }),
  );
  await main(['update', 'RF-1', patchPath], root);
  const updated = await readFile(recordPath, 'utf8');
  await assert.rejects(saveTask(root, task(), original), /changed since read/);
  assert.equal(await readFile(recordPath, 'utf8'), updated);
  await assert.rejects(saveTask(root, task()), /duplicate id/);
});

test('competing creators and updaters cannot overwrite each other silently', async (t) => {
  const root = await fixture(t);
  const created = newTask([task()], 'A single new task');
  const creations = await Promise.allSettled([saveTask(root, created), saveTask(root, created)]);
  assert.equal(creations.filter((result) => result.status === 'fulfilled').length, 1);
  const file = path.join(root, 'ritmofit_dev_plan/tasks/RF-1.json');
  const original = await readFile(file, 'utf8');
  const updates = await Promise.allSettled([
    saveTask(root, task('RF-1', { title: 'First writer' }), original),
    saveTask(root, task('RF-1', { title: 'Second writer' }), original),
  ]);
  assert.equal(updates.filter((result) => result.status === 'fulfilled').length, 1);
  const tasks = await loadTasks(root);
  assert.equal(tasks.length, 2);
  assert.ok(['First writer', 'Second writer'].includes(tasks[0].title));
});

test('the CLI still runs when invoked through a symlinked path', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rf-tasks-link-'));
  const link = path.join(dir, 'tasks.mjs');
  await symlink(fileURLToPath(new URL('./tasks.mjs', import.meta.url)), link);
  // An unknown command must fail; a CLI that silently skipped main() would exit 0.
  const result = spawnSync(process.execPath, [link, 'no-such-command'], { encoding: 'utf8' });
  await rm(dir, { recursive: true });
  assert.equal(result.status, 1, 'a skipped CLI would exit 0');
  assert.match(result.stderr, /Usage: tasks/);
});
