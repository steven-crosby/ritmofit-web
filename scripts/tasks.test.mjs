import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {
  eligibleTasks,
  isoWeek,
  loadTasks,
  main,
  needsOwnerCheck,
  newTask,
  renderBoard,
  saveTask,
  taskHistory,
  validateTasks,
} from './tasks.mjs';

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

async function printed(t, run) {
  const lines = [];
  t.mock.method(console, 'log', (line) => lines.push(line));
  await run();
  t.mock.restoreAll();
  return lines;
}

test('eligible lists unblocked Backlog and Ready tasks with no owner-only check, by priority then id', async (t) => {
  const tasks = [
    completed('RF-1'),
    task('RF-2', { priority: 'P2', dependsOn: ['RF-1'] }),
    task('RF-3', { status: 'ready', priority: 'P0' }),
    task('RF-4', { dependsOn: ['RF-5'] }),
    task('RF-5', { priority: 'untriaged' }),
    task('RF-6', { kind: 'investigation' }),
    task('RF-7', { acceptance: ['Owner device check: audible playback on iPhone Safari.'] }),
    task('RF-8', { status: 'in_progress' }),
    task('RF-9'),
    task('RF-10', { status: 'blocked', blocker: 'Waiting for a decision.' }),
    task('RF-11', { status: 'ready', priority: 'P0', acceptance: ['Plays against production.'] }),
    task('RF-12', { priority: 'P0', dependsOn: ['RF-13'] }),
    task('RF-13', { status: 'cancelled', nextAction: null, resolution: 'Superseded.' }),
  ];
  assert.deepEqual(
    eligibleTasks(tasks).map((item) => item.id),
    ['RF-3', 'RF-9', 'RF-2', 'RF-5'],
  );
  const root = await fixture(t, tasks);
  const lines = await printed(t, () => main(['eligible'], root));
  assert.deepEqual(lines, [
    `RF-3\tready\tP0\t${task().title}`,
    `RF-9\tbacklog\tP1\t${task().title}`,
    `RF-2\tbacklog\tP2\t${task().title}`,
    `RF-5\tbacklog\tuntriaged\t${task().title}`,
  ]);
  await assert.rejects(main(['eligible', 'RF-3'], root), /Usage: tasks eligible/);
});

test('owner-only acceptance wording is recognized; ordinary wording is not', () => {
  const owes = (line) =>
    needsOwnerCheck(task('RF-1', { acceptance: ['A unit test passes.', line] }));
  for (const line of [
    'Owner check: the class plays to the end.',
    'Owner device check: tap to jump feels right.',
    'Owner: confirms the copy.',
    'Audible on iPhone Safari.',
    'Works on an iPad in landscape.',
    'Feels right on a real iPhone.',
    'Scrubbing works on device.',
    'Real provider playback starts at the clip window.',
    'Real audio is heard within 1 s.',
    'Against production, the song plays.',
    'On production after a deploy, the banner names the provider.',
    'Checked against a production build that includes RF-216.',
    'The TestFlight build launches.',
    'Signed in to Spotify Premium, Live resumes.',
  ]) {
    assert.ok(owes(line), line);
  }
  for (const line of [
    'The owner-gate check prints none owner-gated.',
    'The production build config is unchanged.',
    'The session cookie is set once signed in.',
    'The addon device list renders.',
    'Buttons are 44 px on phones.',
  ]) {
    assert.equal(owes(line), false, line);
  }
});

test('stats counts records created and first finished per ISO week from a synthetic git log', () => {
  assert.equal(isoWeek('2026-11-23'), '2026-11-23'); // Monday
  assert.equal(isoWeek('2026-11-24'), '2026-11-23');
  assert.equal(isoWeek('2026-11-29'), '2026-11-23'); // Sunday
  assert.equal(isoWeek('2027-01-01'), '2026-12-28'); // across a year end
  assert.throws(() => isoWeek('2026-02-30'), /Not a date/);
  const record = (id) => `ritmofit_dev_plan/tasks/${id}.json`;
  const diff = (id, ...lines) => [`diff --git a/${record(id)} b/${record(id)}`, ...lines];
  const log = [
    '\x1eaaaaaaa 2026-11-03',
    '',
    ...diff(
      'RF-1',
      'new file mode 100644',
      'index 0000000..1111111',
      '--- /dev/null',
      `+++ b/${record('RF-1')}`,
      '@@ -0,0 +1,3 @@',
      '+{',
      '+  "status": "backlog",',
      '+}',
    ),
    // Imported already Done: created and finished in the same week. The nested imported status
    // and the board are not the record's status.
    ...diff(
      'RF-2',
      'new file mode 100644',
      '--- /dev/null',
      `+++ b/${record('RF-2')}`,
      '@@ -0,0 +1,5 @@',
      '+  "status": "done",',
      '+  "imported": {',
      '+    "status": "done",',
    ),
    'diff --git a/ritmofit_dev_plan/tasks.md b/ritmofit_dev_plan/tasks.md',
    '+  "status": "done",',
    '\x1ebbbbbbb 2026-11-10',
    '',
    ...diff(
      'RF-1',
      'index 1111111..2222222 100644',
      `--- a/${record('RF-1')}`,
      `+++ b/${record('RF-1')}`,
      '@@ -2 +2 @@',
      '-  "status": "backlog",',
      '+  "status": "done",',
    ),
    ...diff(
      'RF-3',
      'new file mode 100644',
      '--- /dev/null',
      `+++ b/${record('RF-3')}`,
      '@@ -0,0 +1,2 @@',
      '+  "status": "backlog",',
      '+  "resolution": "Not \\"status\\": \\"done\\" yet",',
    ),
    '\x1eccccccc 2026-11-17',
    '',
    // Reopened and finished again: only the first finish counts. Cancelled counts as finished.
    ...diff('RF-1', '@@ -2 +2 @@', '-  "status": "done",', '+  "status": "in_progress",'),
    ...diff('RF-3', '@@ -2 +2 @@', '-  "status": "backlog",', '+  "status": "cancelled",'),
    '\x1eddddddd 2026-11-18',
    '',
    ...diff('RF-1', '@@ -2 +2 @@', '-  "status": "in_progress",', '+  "status": "done",'),
    ...diff('RF-4', 'deleted file mode 100644', `--- a/${record('RF-4')}`, '+++ /dev/null'),
  ].join('\n');
  assert.deepEqual(taskHistory(log), [
    { week: '2026-11-02', created: 2, finished: 1 },
    { week: '2026-11-09', created: 1, finished: 1 },
    { week: '2026-11-16', created: 0, finished: 1 },
  ]);
  assert.deepEqual(taskHistory(''), []);
});

test('stats reads the checkout history through git and leaves the tree unchanged', async (t) => {
  const root = await fixture(t, [task('RF-1')]);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  const git = (args, date = '2026-11-03T12:00:00Z') => {
    const result = spawnSync(
      'git',
      [
        '-c',
        'user.name=RF test',
        '-c',
        'user.email=rf@example.com',
        '-c',
        'commit.gpgsign=false',
        ...args,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  const save = (item) =>
    writeFile(
      path.join(root, `ritmofit_dev_plan/tasks/${item.id}.json`),
      `${JSON.stringify(item, null, 2)}\n`,
    );
  git(['init', '-q']);
  await save(task('RF-1'));
  git(['add', '-A']);
  git(['commit', '-q', '--no-verify', '-m', 'create RF-1']);
  await save(completed('RF-1'));
  await writeFile(path.join(root, 'ritmofit_dev_plan/tasks.md'), renderBoard([completed('RF-1')]));
  git(['commit', '-q', '--no-verify', '-am', 'finish RF-1'], '2026-11-10T12:00:00Z');
  const lines = await printed(t, () => main(['stats'], root));
  assert.deepEqual(lines, [
    'week\tcreated\tfinished',
    '2026-11-02\t1\t0',
    '2026-11-09\t0\t1',
    'Now: 1 tasks. backlog: 0 · ready: 0 · in_progress: 0 · blocked: 0 · review: 0 · done: 1 · cancelled: 0.',
  ]);
  assert.equal(git(['status', '--porcelain']), '');
  await assert.rejects(main(['stats', 'extra'], root), /Usage: tasks stats/);
});
