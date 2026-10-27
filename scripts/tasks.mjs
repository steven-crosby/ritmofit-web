import { readFile, readdir, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const taskDirectory = 'ritmofit_dev_plan/tasks';
const boardPath = 'ritmofit_dev_plan/tasks.md';
export const statuses = [
  'backlog',
  'ready',
  'in_progress',
  'blocked',
  'review',
  'done',
  'cancelled',
];
const kinds = [
  'task',
  'plan',
  'investigation',
  'verification',
  'release',
  'documentation',
  'group',
];
const priorities = ['P0', 'P1', 'P2', 'P3', 'untriaged'];
const fields = [
  'schemaVersion',
  'id',
  'title',
  'kind',
  'status',
  'priority',
  'parent',
  'dependsOn',
  'acceptance',
  'nextAction',
  'blocker',
  'evidence',
  'resolution',
  'followUps',
  'imported',
];
const idPattern = /^RF-[1-9]\d*$/;
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const strings = (value) => Array.isArray(value) && value.every(nonempty);
const terminal = (task) => ['done', 'cancelled'].includes(task.status);
const number = (id) => Number(id.slice(3));

export function validateTasks(tasks) {
  const errors = [];
  const byId = new Map();
  for (const task of tasks) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
      errors.push('Task must be an object');
      continue;
    }
    const fail = (message) => errors.push(`${task.id ?? '(missing id)'}: ${message}`);
    for (const key of Object.keys(task)) if (!fields.includes(key)) fail(`unknown field ${key}`);
    for (const key of fields.filter((key) => key !== 'imported')) {
      if (!Object.hasOwn(task, key)) fail(`missing field ${key}`);
    }
    if (task.schemaVersion !== 1) fail('schemaVersion must be 1');
    if (typeof task.id !== 'string' || !idPattern.test(task.id)) fail('invalid RF id');
    if (byId.has(task.id)) fail('duplicate id');
    byId.set(task.id, task);
    if (!nonempty(task.title) || /[\r\n]/.test(task.title)) fail('title must be one nonempty line');
    if (!kinds.includes(task.kind)) fail('invalid kind');
    if (!statuses.includes(task.status)) fail('invalid status');
    if (!priorities.includes(task.priority)) fail('invalid priority');
    if (task.parent !== null && !idPattern.test(task.parent)) fail('invalid parent');
    for (const key of ['dependsOn', 'followUps']) {
      if (!strings(task[key]) || task[key].some((id) => !idPattern.test(id))) {
        fail(`${key} must contain RF ids`);
      } else if (new Set(task[key]).size !== task[key].length) fail(`duplicate ${key}`);
    }
    if (!strings(task.acceptance) || task.acceptance.length === 0) fail('acceptance is required');
    if (
      ['ready', 'in_progress', 'review', 'done'].includes(task.status) &&
      Array.isArray(task.acceptance) &&
      task.acceptance.some(
        (item) => typeof item === 'string' && item.startsWith('Replace with a concrete'),
      )
    ) {
      fail('replace draft acceptance before starting or closing');
    }
    if (task.nextAction !== null && !nonempty(task.nextAction)) fail('invalid nextAction');
    if (!terminal(task) && !nonempty(task.nextAction)) fail('open task needs nextAction');
    if (terminal(task) && task.nextAction !== null) fail('closed task must have null nextAction');
    if (task.blocker !== null && !nonempty(task.blocker)) fail('invalid blocker');
    if (task.status === 'blocked' && !nonempty(task.blocker)) fail('blocked task needs blocker');
    if (task.status !== 'blocked' && task.blocker !== null) fail('only blocked tasks have blocker');
    if (task.resolution !== null && !nonempty(task.resolution)) fail('invalid resolution');
    if (terminal(task) && !nonempty(task.resolution)) fail('closed task needs resolution');
    if (!terminal(task) && task.resolution !== null) fail('open task must have null resolution');
    if (!Array.isArray(task.evidence)) fail('evidence must be an array');
    else {
      if (task.status === 'done' && task.evidence.length === 0) fail('done needs evidence');
      for (const entry of task.evidence) {
        if (
          !entry ||
          typeof entry !== 'object' ||
          Object.keys(entry).sort().join(',') !== 'checkedOn,kind,ref,summary' ||
          !['source', 'pr', 'test', 'observation', 'document'].includes(entry.kind) ||
          !nonempty(entry.ref) ||
          !nonempty(entry.summary) ||
          (entry.checkedOn !== null &&
            (typeof entry.checkedOn !== 'string' ||
              !/^\d{4}-\d{2}-\d{2}$/.test(entry.checkedOn) ||
              !Number.isFinite(Date.parse(entry.checkedOn)) ||
              new Date(entry.checkedOn).toISOString().slice(0, 10) !== entry.checkedOn))
        )
          fail('invalid evidence entry');
      }
    }
    if (
      task.imported !== undefined &&
      (!task.imported ||
        Object.keys(task.imported).sort().join(',') !== 'status,title' ||
        !nonempty(task.imported.status) ||
        !nonempty(task.imported.title))
    )
      fail('invalid imported record');
  }
  if (errors.length) return errors;
  for (const task of byId.values()) {
    for (const id of [task.parent, ...(task.dependsOn ?? []), ...(task.followUps ?? [])]) {
      if (id === null) continue;
      if (!byId.has(id)) errors.push(`${task.id}: unknown reference ${id}`);
      if (id === task.id) errors.push(`${task.id}: self reference`);
    }
    if (['ready', 'in_progress', 'review', 'done'].includes(task.status)) {
      for (const id of task.dependsOn ?? []) {
        if (byId.has(id) && byId.get(id).status !== 'done') {
          errors.push(`${task.id}: dependency ${id} is not done`);
        }
      }
    }
    if (task.status === 'done') {
      for (const child of byId.values()) {
        if (child.parent === task.id && !terminal(child)) {
          errors.push(`${task.id}: child ${child.id} is still open`);
        }
      }
    }
  }
  // Completion also waits for children. A child that depends on its parent
  // creates a deadlock even when the parent/dependency graphs alone are acyclic.
  for (const relation of ['parent', 'dependsOn', 'followUps', 'completion']) {
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
      if (visiting.has(id)) {
        errors.push(`${id}: ${relation} cycle`);
        return;
      }
      if (visited.has(id) || !byId.has(id)) return;
      visiting.add(id);
      const value =
        relation === 'completion'
          ? [
              ...byId.get(id).dependsOn,
              ...tasks.filter((task) => task.parent === id).map((task) => task.id),
            ]
          : byId.get(id)[relation];
      for (const next of Array.isArray(value) ? value : value ? [value] : []) visit(next);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of byId.keys()) visit(id);
  }
  return errors;
}

export async function loadTasks(root = repoRoot) {
  const directory = path.join(root, taskDirectory);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort();
  const tasks = [];
  for (const file of files) {
    const task = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
    if (file !== `${task.id}.json`) throw new Error(`${file}: filename must match id`);
    tasks.push(task);
  }
  const errors = validateTasks(tasks);
  if (errors.length) throw new Error(errors.join('\n'));
  // Evidence may be HTTPS (including immutable migration provenance) or a
  // repository-relative file. Never follow a tool-local or escaping path.
  await validateEvidencePaths(tasks, root);
  return tasks.sort((a, b) => number(a.id) - number(b.id));
}

async function validateEvidencePaths(tasks, root) {
  for (const task of tasks)
    for (const entry of task.evidence) {
      if (entry.ref.startsWith('https://')) {
        const url = new URL(entry.ref);
        if (url.username || url.password)
          throw new Error(`${task.id}: evidence URL must not contain credentials`);
        continue;
      }
      const file = entry.ref.split('#')[0];
      if (!file || path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) {
        throw new Error(`${task.id}: evidence must be HTTPS or a repo-relative file`);
      }
      await readFile(path.join(root, file));
    }
}

const cell = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;')
    .replaceAll('[', '&#91;')
    .replaceAll(']', '&#93;')
    .replace(/[\r\n]+/g, ' ');

export function renderBoard(tasks) {
  const lines = [
    '# RF task board',
    '',
    '<!-- Generated by pnpm tasks:render. Edit tasks/RF-*.json, then regenerate. -->',
    '',
    'The repository owns this board. [Workflow and record format](tasks/README.md).',
    '',
    '**Status is not authorization.** A task, dependency, or green check never grants permission',
    'to commit, push, merge, deploy, send, delete, or access production data. **Ready** is the',
    "owner's queue: any agent may execute a Ready task. Publishing follows AGENTS.md ›",
    '"Delegation And Merge Policy". An open draft PR moving a task to In progress is its claim.',
    '',
    'Evidence marked **recorded** is a carried-forward claim, not fresh verification.',
    'A checked PR proves its GitHub state, not product acceptance or production behavior.',
    '',
    `${tasks.length} tasks. ` +
      statuses
        .map((status) => `${status}: ${tasks.filter((task) => task.status === status).length}`)
        .join(' · ') +
      '.',
    '',
  ];
  const names = {
    backlog: 'Backlog',
    ready: 'Ready',
    in_progress: 'In progress',
    blocked: 'Blocked / waiting',
    review: 'For review',
    done: 'Done',
    cancelled: 'Cancelled',
  };
  for (const status of [
    'in_progress',
    'blocked',
    'review',
    'ready',
    'backlog',
    'done',
    'cancelled',
  ]) {
    lines.push(
      `## ${names[status]}`,
      '',
      '| Task | Priority / kind | Relationships | Next action / resolution | Evidence |',
      '| --- | --- | --- | --- | --- |',
    );
    const rows = tasks
      .filter((task) => task.status === status)
      .sort(
        (a, b) =>
          priorities.indexOf(a.priority) - priorities.indexOf(b.priority) ||
          number(a.id) - number(b.id),
      );
    for (const task of rows) {
      const relationships = [
        task.parent && `parent ${task.parent}`,
        task.dependsOn.length && `needs ${task.dependsOn.join(', ')}`,
        task.followUps.length && `follow-ups ${task.followUps.join(', ')}`,
      ]
        .filter(Boolean)
        .join('; ');
      const evidence = task.evidence.length
        ? task.evidence
            .map((entry) => (entry.checkedOn ? `checked ${entry.checkedOn}` : 'recorded'))
            .filter((value, index, values) => values.indexOf(value) === index)
            .join('; ')
        : 'none';
      lines.push(
        `| [${task.id}](tasks/${task.id}.json) ${cell(task.title)} | ` +
          `${task.priority} / ${task.kind} | ${cell(relationships || '—')} | ` +
          `${cell(task.blocker ? `${task.blocker} Next: ${task.nextAction}` : (task.nextAction ?? task.resolution))} | ${evidence} |`,
      );
    }
    if (rows.length === 0) lines.push('| — | — | — | — | — |');
    lines.push('');
  }
  return lines.join('\n');
}

export function newTask(tasks, title) {
  return {
    schemaVersion: 1,
    id: `RF-${Math.max(86, ...tasks.map((task) => number(task.id))) + 1}`,
    title,
    kind: 'task',
    status: 'backlog',
    priority: 'untriaged',
    parent: null,
    dependsOn: [],
    acceptance: ['Replace with a concrete observable acceptance check before starting work.'],
    nextAction: 'Define scope and acceptance criteria; obtain any required owner approval.',
    blocker: null,
    evidence: [],
    resolution: null,
    followUps: [],
  };
}

// Exclusive creation avoids clobbering another task creator. Updates compare the
// original bytes before writing; git remains the cross-checkout conflict boundary.
export async function saveTask(root, task, original = null) {
  const file = path.join(root, taskDirectory, `${task.id}.json`);
  const tasks = await loadTasks(root);
  const next =
    original === null ? [...tasks, task] : tasks.map((item) => (item.id === task.id ? task : item));
  const errors = validateTasks(next);
  if (errors.length) throw new Error(errors.join('\n'));
  await validateEvidencePaths(next, root);
  const content = `${JSON.stringify(task, null, 2)}\n`;
  if (original === null) await writeFile(file, content, { flag: 'wx' });
  else {
    const lock = `${file}.lock`;
    await writeFile(lock, '', { flag: 'wx' });
    try {
      if ((await readFile(file, 'utf8')) !== original)
        throw new Error(`${task.id}: changed since read; retry`);
      const temporary = `${file}.tmp`;
      await writeFile(temporary, content);
      await rename(temporary, file);
    } finally {
      await unlink(lock);
    }
  }
}

export async function main(args, root = repoRoot) {
  const [command = 'list', ...rest] = args;
  const tasks = await loadTasks(root);
  if (command === 'check') {
    if ((await readFile(path.join(root, boardPath), 'utf8')) !== renderBoard(tasks)) {
      throw new Error('Task board is stale. Run pnpm tasks:render.');
    }
    console.log(`Validated ${tasks.length} tasks and generated board.`);
  } else if (command === 'render') {
    await writeFile(path.join(root, boardPath), renderBoard(tasks));
    console.log(`Rendered ${tasks.length} tasks.`);
  } else if (command === 'list') {
    if (rest.length > 1 || (rest[0] && !statuses.includes(rest[0])))
      throw new Error('Usage: tasks list [status]');
    for (const task of tasks.filter((item) => !rest[0] || item.status === rest[0])) {
      console.log(`${task.id}\t${task.status}\t${task.priority}\t${task.title}`);
    }
  } else if (command === 'show') {
    const task = tasks.find((item) => item.id === rest[0]);
    if (rest.length !== 1 || !task) throw new Error('Usage: tasks show RF-<existing id>');
    console.log(JSON.stringify(task, null, 2));
  } else if (command === 'create') {
    if (rest.length !== 1 || !nonempty(rest[0])) throw new Error('Usage: tasks create "Title"');
    const task = newTask(tasks, rest[0]);
    await saveTask(root, task);
    console.log(`Created ${task.id}. Refine its record, then run pnpm tasks:render.`);
  } else if (command === 'update') {
    const [id, patchFile] = rest;
    if (rest.length !== 2 || !tasks.some((task) => task.id === id)) {
      throw new Error('Usage: tasks update RF-<existing id> <patch.json>');
    }
    const file = path.join(root, taskDirectory, `${id}.json`);
    const original = await readFile(file, 'utf8');
    const patch = JSON.parse(await readFile(patchFile, 'utf8'));
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.hasOwn(patch, 'id')) {
      throw new Error('Patch must be an object without id; task IDs are immutable.');
    }
    await saveTask(root, { ...JSON.parse(original), ...patch }, original);
    console.log(`Updated ${id}. Run pnpm tasks:render.`);
  } else throw new Error('Usage: tasks <list|show|create|update|render|check>');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
