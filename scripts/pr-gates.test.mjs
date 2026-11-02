// Tests for .github/scripts/pr-gates.sh's decisions (RF-176): record-approval, void-approval and
// gate-status run against a fake `gh` that answers from fixtures and logs every write, so no
// test touches GitHub. Needs bash and jq on PATH, as the workflows do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../.github/scripts/pr-gates.sh', import.meta.url));
const CHECKER = fileURLToPath(new URL('./owner-gate.mjs', import.meta.url));
const REPO = 'acme/app';
const PR = '7';
const HEAD = 'a'.repeat(40);
const RUN_ID = '99';

// Answers `gh api <path>` from $FAKE_GH/<path with / as _>.json; a numbered file (.2.json) answers
// that call number instead, to model a lagging API. Writes (-X DELETE, or POSTs to statuses) are
// appended to $FAKE_GH/writes.log. A path with no fixture fails like an API error.
const FAKE_GH = `#!/usr/bin/env bash
shift
method=GET path= jqexpr= fields=()
while [ $# -gt 0 ]; do
  case "$1" in
    -X) method=$2; shift 2 ;;
    --jq) jqexpr=$2; shift 2 ;;
    --paginate) shift ;;
    -f) fields+=("$2"); shift 2 ;;
    *) path=$1; shift ;;
  esac
done
path=\${path#repos/${REPO}/}
if [ "$method" != GET ] || { [[ $path == statuses/* ]] && [ \${#fields[@]} -gt 0 ]; }; then
  echo "$method $path \${fields[*]}" >> "$FAKE_GH/writes.log"
  exit 0
fi
key=\${path//\\//_}
count_file="$FAKE_GH/.count-$key"
n=$(( $(cat "$count_file" 2> /dev/null || echo 0) + 1 ))
echo "$n" > "$count_file"
file="$FAKE_GH/$key.$n.json"
[ -f "$file" ] || file="$FAKE_GH/$key.json"
[ -f "$file" ] || { echo "fake gh: no fixture for $path" >&2; exit 1; }
if [ -n "$jqexpr" ]; then jq -r "$jqexpr" "$file"; else cat "$file"; fi
`;

const iso = (s) => new Date(s * 1000).toISOString().replace('.000Z', 'Z');
const T0 = 1_800_000_000;

function setup({
  labels = [],
  pushes = [{ at: T0, sha: HEAD }],
  events = [],
  approvals = 0,
  runCreated = T0 + 300,
  files = ['AGENTS.md'],
  checker = readFileSync(CHECKER, 'utf8'),
  extra = {},
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pr-gates-'));
  const fake = join(dir, 'fake');
  const bin = join(dir, 'bin');
  const temp = join(dir, 'runner');
  for (const d of [fake, bin, temp]) mkdirSync(d);
  writeFileSync(join(bin, 'gh'), FAKE_GH);
  chmodSync(join(bin, 'gh'), 0o755);
  const fixture = (name, value) => writeFileSync(join(fake, `${name}.json`), JSON.stringify(value));
  fixture(`pulls_${PR}`, {
    head: { sha: HEAD, ref: 'feature', repo: { full_name: REPO } },
    labels: labels.map((name) => ({ name })),
    changed_files: files.length,
  });
  fixture(
    'activity',
    pushes.map(({ at, sha }) => ({ timestamp: iso(at), after: sha })),
  );
  fixture(
    `issues_${PR}_timeline`,
    events.map(([at, event]) => ({
      event,
      created_at: iso(at),
      label: { name: 'owner-approved' },
    })),
  );
  fixture(
    `commits_${HEAD}_statuses`,
    Array.from({ length: approvals }, () => ({ context: 'owner-approval', state: 'success' })),
  );
  fixture(`actions_runs_${RUN_ID}`, { created_at: iso(runCreated) });
  for (const [name, value] of Object.entries(extra)) fixture(name, value);
  // Stand-ins for what `prepare` leaves behind.
  writeFileSync(join(temp, 'pr-files.txt'), files.map((f) => `${f}\n`).join(''));
  if (checker !== null) writeFileSync(join(temp, 'owner-gate.mjs'), checker);
  return { dir, fake, bin, temp };
}

function run(env, command, extraEnv = {}) {
  const output = join(env.dir, 'github-output');
  writeFileSync(output, '');
  // gate-status's prepare is replaced by a no-op: these tests judge what follows it.
  const script = join(env.dir, 'pr-gates.sh');
  writeFileSync(
    script,
    readFileSync(SCRIPT, 'utf8').replace(
      /^prepare\(\) \{$/m,
      'prepare() {\n  return 0\n}\nreal_prepare() {',
    ),
  );
  const result = spawnSync('bash', [script, command], {
    env: {
      ...process.env,
      PATH: `${env.bin}:${process.env.PATH}`,
      FAKE_GH: env.fake,
      GH_TOKEN: 'x',
      GITHUB_REPOSITORY: REPO,
      GITHUB_SERVER_URL: 'https://github.example',
      GITHUB_RUN_ID: RUN_ID,
      GITHUB_OUTPUT: output,
      RUNNER_TEMP: env.temp,
      PR_NUMBER: PR,
      BASE_REF: 'main',
      HEAD_SHA: HEAD,
      EVENT_SHA: HEAD,
      PR_GATES_RETRY_DELAY: '0',
      ...extraEnv,
    },
    encoding: 'utf8',
  });
  const writesFile = join(env.fake, 'writes.log');
  return {
    status: result.status,
    log: result.stdout + result.stderr,
    writes: existsSync(writesFile) ? readFileSync(writesFile, 'utf8') : '',
    output: readFileSync(output, 'utf8'),
  };
}

const ownerGateWrite = (writes) => writes.split('\n').find((l) => l.includes('context=owner-gate'));

test('record-approval records when the head was pushed well before this run’s label', () => {
  const env = setup({ events: [[T0 + 290, 'labeled']], runCreated: T0 + 295 });
  const r = run(env, 'record-approval');
  assert.equal(r.status, 0, r.log);
  assert.match(r.writes, /statuses\/a+ state=success context=owner-approval/);
});

test('record-approval refuses a head pushed less than 120 s before the label', () => {
  const env = setup({ events: [[T0 + 30, 'labeled']], runCreated: T0 + 35 });
  const r = run(env, 'record-approval');
  assert.equal(r.status, 1);
  assert.equal(r.writes, '');
  assert.match(
    r.output,
    /refusal=aaaaaaa was pushed 30s before owner-approved; review it, then remove/,
  );
});

test('record-approval uses this run’s label event, not a newer one, and ignores later pushes', () => {
  // Labelled at T0+200 (this run); re-labelled at T0+400 (another run). The head was pushed again
  // at T0+390, after this run's label: that push must not make the age negative.
  const env = setup({
    events: [
      [T0 + 200, 'labeled'],
      [T0 + 300, 'unlabeled'],
      [T0 + 400, 'labeled'],
    ],
    pushes: [
      { at: T0 + 390, sha: HEAD },
      { at: T0, sha: HEAD },
    ],
    runCreated: T0 + 205,
  });
  const r = run(env, 'record-approval');
  assert.equal(r.status, 0, r.log);
  assert.match(r.log, /labelled 200s after it was pushed/);
});

test('record-approval waits for a lagging timeline, then refuses with the label reason', () => {
  const lagging = setup({
    events: [[T0 - 600, 'labeled']], // only an old add is listed
    runCreated: T0 + 300,
    extra: {
      [`issues_${PR}_timeline.3`]: [
        { event: 'labeled', created_at: iso(T0 + 298), label: { name: 'owner-approved' } },
      ],
    },
  });
  const ok = run(lagging, 'record-approval');
  assert.equal(ok.status, 0, ok.log);
  assert.match(ok.log, /labelled 298s after/);

  const missing = run(setup({ events: [], runCreated: T0 + 300 }), 'record-approval');
  assert.equal(missing.status, 1);
  assert.match(missing.output, /refusal=Could not read when owner-approved was added/);
});

test('record-approval refuses with the push reason when the head’s push is not listed', () => {
  const env = setup({ pushes: [], events: [[T0 + 290, 'labeled']], runCreated: T0 + 295 });
  const r = run(env, 'record-approval');
  assert.equal(r.status, 1);
  assert.match(r.output, /refusal=Could not read when aaaaaaa was pushed/);
});

test('void-approval drops a label added before the push and keeps one added after it', () => {
  const stale = run(
    setup({ labels: ['owner-approved'], events: [[T0 - 60, 'labeled']] }),
    'void-approval',
  );
  assert.match(stale.writes, /DELETE issues\/7\/labels\/owner-approved/);

  const fresh = run(
    setup({ labels: ['owner-approved'], events: [[T0 + 5, 'labeled']] }),
    'void-approval',
  );
  assert.equal(fresh.writes, '');
  assert.match(fresh.log, /added after/);
});

test('void-approval keeps the label when the timeline or the push lags, or the head is approved', () => {
  // The label is on the PR, but the timeline's newest event is still its earlier removal.
  const lagging = run(
    setup({
      labels: ['owner-approved'],
      events: [
        [T0 - 60, 'labeled'],
        [T0 - 30, 'unlabeled'],
      ],
    }),
    'void-approval',
  );
  assert.equal(lagging.writes, '');

  const noPush = run(
    setup({ labels: ['owner-approved'], pushes: [], events: [[T0 - 60, 'labeled']] }),
    'void-approval',
  );
  assert.equal(noPush.writes, '');
  assert.match(noPush.log, /best-effort/);

  const approved = run(
    setup({ labels: ['owner-approved'], approvals: 1, events: [[T0 - 60, 'labeled']] }),
    'void-approval',
  );
  assert.equal(approved.writes, '');
});

test('void-approval re-checks before deleting, so an add reaching the timeline late survives', () => {
  const env = setup({
    labels: ['owner-approved'],
    events: [[T0 - 60, 'labeled']],
    extra: {
      // Second timeline read (the re-check) shows the owner's fresh remove-and-add.
      [`issues_${PR}_timeline.2`]: [
        { event: 'labeled', created_at: iso(T0 - 60), label: { name: 'owner-approved' } },
        { event: 'unlabeled', created_at: iso(T0 + 2), label: { name: 'owner-approved' } },
        { event: 'labeled', created_at: iso(T0 + 3), label: { name: 'owner-approved' } },
      ],
    },
  });
  const r = run(env, 'void-approval');
  assert.equal(r.writes, '');
});

test('void-approval makes no time lookups when the label is absent', () => {
  const env = setup({ labels: [] });
  const r = run(env, 'void-approval');
  assert.match(r.log, /No 'owner-approved' label/);
  assert.equal(existsSync(join(env.fake, '.count-activity')), false);
});

test('gate-status writes the verdict, and says how to fix an unrecorded label', () => {
  const clean = run(setup({ files: ['README.md'] }), 'gate-status');
  assert.match(ownerGateWrite(clean.writes), /state=success .*No owner-gated paths changed/);

  const approved = run(setup({ labels: ['owner-approved'], approvals: 1 }), 'gate-status');
  assert.match(ownerGateWrite(approved.writes), /state=success .*owner-approved on aaaaaaa/);

  const none = run(setup(), 'gate-status');
  assert.match(ownerGateWrite(none.writes), /state=failure .*need owner-approved on aaaaaaa/);

  const unrecorded = run(setup({ labels: ['owner-approved'] }), 'gate-status');
  assert.match(
    ownerGateWrite(unrecorded.writes),
    /state=failure .*owner-approved is on the PR but not recorded for aaaaaaa; remove and re-add it/,
  );

  const refused = run(setup({ labels: ['owner-approved'] }), 'gate-status', {
    UNAPPROVED_DESCRIPTION: 'refused for a reason',
  });
  assert.match(ownerGateWrite(refused.writes), /description=refused for a reason/);
});

test('gate-status reads a pre-RF-176 checker as legacy, with the refusal reason when set', () => {
  const legacy = 'process.exit(process.env.OWNER_GATE_LABELS.includes("owner-approved") ? 0 : 1);';
  const fail = run(setup({ checker: legacy }), 'gate-status');
  assert.match(ownerGateWrite(fail.writes), /state=failure .*or the gate failed/);

  const reason = run(setup({ checker: legacy }), 'gate-status', {
    UNAPPROVED_DESCRIPTION: 'Recording owner approval failed; re-run the job or re-add the label',
  });
  assert.match(ownerGateWrite(reason.writes), /description=Recording owner approval failed/);

  const pass = run(
    setup({ checker: legacy, labels: ['owner-approved'], approvals: 1 }),
    'gate-status',
  );
  assert.match(ownerGateWrite(pass.writes), /state=success .*Owner gate passed/);
});

test('gate-status errors, writing nothing, when the checker is missing or gave no verdict', () => {
  const missing = run(setup({ checker: null }), 'gate-status');
  assert.equal(missing.status, 1);
  assert.equal(ownerGateWrite(missing.writes), undefined);

  // Supports verdicts (mentions OWNER_GATE_RESULT) but crashed before writing one.
  const crashed = run(setup({ checker: '// OWNER_GATE_RESULT\nprocess.exit(1);' }), 'gate-status');
  assert.equal(crashed.status, 1);
  assert.equal(ownerGateWrite(crashed.writes), undefined);
});

test('gate-error writes failure on the live head', () => {
  const r = run(setup(), 'gate-error');
  assert.match(ownerGateWrite(r.writes), /statuses\/a+ state=failure .*Owner gate errored/);
});
