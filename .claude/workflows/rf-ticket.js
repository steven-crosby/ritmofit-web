export const meta = {
  name: 'rf-ticket',
  description:
    'Run one ritmofit-web RF ticket through agent-prompts/rf-pipeline.md stages 2-6: build, fresh-context verify and review, at most two fix rounds, then publish the PR or park it. Never merges.',
  whenToUse:
    'One RF ticket that is Ready or in a pre-approved batch queue, run from a clean checkout dedicated to that ticket (its cloud session, or its own worktree on the Neo). args: { rf: "RF-N", batchIssue?: <pre-approval issue number> }.',
  phases: [
    { title: 'Build' },
    { title: 'Verify and review' },
    { title: 'Fix' },
    { title: 'Publish' },
  ],
};

// Claude Code, 2026-11-24, RF-250. The rules live in AGENTS.md and agent-prompts/rf-pipeline.md; the
// roles live in .claude/agents/. This script only sequences stages 2-6 for one ticket. Nothing here
// merges, applies owner-approved or ready-to-merge, or sets Ready: stage 7 stays the conductor's.
// The Workflow runtime runs this body as an async function (hence the top-level returns) with
// agent, parallel, phase, log and args as globals.

const RF_ID = /^RF-[1-9]\d*$/;
if (!args || typeof args !== 'object' || typeof args.rf !== 'string' || !RF_ID.test(args.rf)) {
  throw new Error('rf-ticket needs args { rf: "RF-N", batchIssue?: <issue number> }');
}
if (args.batchIssue !== undefined && !(Number.isInteger(args.batchIssue) && args.batchIssue > 0)) {
  throw new Error('rf-ticket: batchIssue must be a positive issue number');
}
const rf = args.rf;
const batchIssue = args.batchIssue;
const MAX_FIX_ROUNDS = 2;

const NEVER =
  'Never merge, never apply owner-approved or ready-to-merge, never set any task to Ready, and never deploy or touch production, remote D1 or secrets.';
const CLAIM = batchIssue
  ? `This ticket is queued in the pre-approved batch of issue #${batchIssue}. That issue's queue is the claim (ritmofit_dev_plan/two-machine-rules.md › 7.4), so open no PR until publish; push the branch.`
  : "Open a draft PR as the claim as soon as the branch is pushed, and cite it as the record's pr evidence.";

// ---------- Schemas ----------

const text = (description) => ({ type: 'string', description });
const FINDING_PROPS = {
  title: text('One line'),
  location: text('file:line, or an empty string'),
  detail: text('What is wrong and how it shows'),
  significant: {
    type: 'boolean',
    description: 'The significance test in AGENTS.md › "Delegation And Merge Policy"',
  },
  reason: text('Why it is or is not significant'),
};
const FINDING_REQUIRED = ['title', 'location', 'detail', 'significant', 'reason'];
const FINDING = { type: 'object', properties: FINDING_PROPS, required: FINDING_REQUIRED };

const BUILD = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['built', 'blocked'] },
    branch: text('The ticket branch'),
    headSha: text(
      'Full 40-character SHA of the pushed head, or an empty string if nothing was pushed',
    ),
    prUrl: text('The PR URL, or an empty string when none is open yet'),
    summary: text('What changed and what ran'),
    blockedReason: text('Why the ticket could not be built or fixed; an empty string when built'),
  },
  required: ['status', 'branch', 'headSha', 'prUrl', 'summary', 'blockedReason'],
};

const VERIFY = {
  type: 'object',
  properties: {
    headSha: text('Full SHA of the commit verified (git rev-parse HEAD)'),
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    summary: text('One paragraph that names the head'),
    gate: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: text('The gate command'),
          result: { type: 'string', enum: ['pass', 'fail', 'skipped'] },
          detail: text('Failure output or why skipped; may be empty'),
        },
        required: ['step', 'result', 'detail'],
      },
    },
    acceptance: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: text('The acceptance line, verbatim'),
          result: { type: 'string', enum: ['proven', 'not provable here', 'failing'] },
          evidence: text('Test name or screenshot, the owner check to run, or why it fails'),
          failing: { type: 'boolean' },
        },
        required: ['line', 'result', 'evidence', 'failing'],
      },
    },
    findings: { type: 'array', items: FINDING },
    treeClean: { type: 'boolean', description: 'git diff --exit-code stayed clean after the gate' },
    screenshotsDir: text('Scratch directory outside the repo, or an empty string'),
  },
  required: [
    'headSha',
    'verdict',
    'summary',
    'gate',
    'acceptance',
    'findings',
    'treeClean',
    'screenshotsDir',
  ],
};

const REVIEW = {
  type: 'object',
  properties: {
    headSha: text('Full SHA of the commit whose diff was reviewed'),
    summary: text('One paragraph that names the head and the review that ran'),
    findings: { type: 'array', items: FINDING },
  },
  required: ['headSha', 'summary', 'findings'],
};

const AUDIT = {
  type: 'object',
  properties: {
    headSha: text('Full SHA of the commit audited'),
    summary: text('One paragraph that names the head'),
    acceptance: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: text('The acceptance line, verbatim'),
          status: { type: 'string', enum: ['met', 'unmet', 'owner check'] },
          evidence: text('File, test or screenshot; or what is missing'),
        },
        required: ['line', 'status', 'evidence'],
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ...FINDING_PROPS,
          category: {
            type: 'string',
            enum: ['unmet', 'scope', 'contract or design', 'music constraint', 'authz', 'other'],
          },
        },
        required: [...FINDING_REQUIRED, 'category'],
      },
    },
  },
  required: ['headSha', 'summary', 'acceptance', 'findings'],
};

const PUBLISH = {
  type: 'object',
  properties: {
    prUrl: text('The PR URL'),
    headSha: text('Full SHA of the PR head after publishing'),
    ready: { type: 'boolean', description: 'The PR is open and not a draft' },
    needsOwner: {
      type: 'boolean',
      description: 'owner-gate listed gated paths; needs-owner added',
    },
    dispositions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          finding: text('The finding title'),
          handling: {
            type: 'string',
            enum: [
              'fixed here',
              'P1/P2 task for the conductor to file',
              'polish record line',
              'dropped',
            ],
          },
          detail: text('Round it was fixed in, the task or polish line to record, or the reason'),
        },
        required: ['finding', 'handling', 'detail'],
      },
    },
    ownerChecks: { type: 'array', items: text('Task, what to do, where, and what result counts') },
    summary: text('One line'),
  },
  required: ['prUrl', 'headSha', 'ready', 'needsOwner', 'dispositions', 'ownerChecks', 'summary'],
};

const PARK = {
  type: 'object',
  properties: {
    prUrl: text('The draft PR URL'),
    headSha: text('Full SHA of the head after the park commit'),
    summary: text('One line'),
  },
  required: ['prUrl', 'headSha', 'summary'],
};

// ---------- Helpers ----------

const fullSha = (sha) => typeof sha === 'string' && /^[0-9a-f]{7,40}$/i.test(sha);
const sameSha = (a, b) =>
  fullSha(a) &&
  fullSha(b) &&
  (a.toLowerCase().startsWith(b.toLowerCase()) || b.toLowerCase().startsWith(a.toLowerCase()));
const short = (sha) => (typeof sha === 'string' ? sha.slice(0, 12) : String(sha));

// A stage that reports a different head (or none) did not check this one: re-run it once.
async function onHead(stage, head, run) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await run(attempt);
    if (result && sameSha(result.headSha, head)) return result;
    log(
      `${rf}: ${stage} ${result ? `checked ${short(result.headSha)}` : 'returned nothing'}, not ${short(head)}` +
        (attempt === 1 ? '; re-running it once' : '; giving up'),
    );
  }
  return null;
}

const ticket = (build) => `RF ticket: ${rf}\nBranch: ${build.branch}\nHead SHA: ${build.headSha}`;
const FRESH =
  'Work from only the diff, the RF record and the repo rules. You are given no builder notes; do not look for any.';

function sortChecks(verify, review, audit) {
  const blocking = [];
  const other = [];
  if (verify) {
    const before = blocking.length;
    for (const step of verify.gate) {
      if (step.result === 'fail')
        blocking.push({ from: 'verifier', kind: 'gate step failed', ...step });
    }
    for (const line of verify.acceptance) {
      if (line.failing || line.result === 'failing') {
        blocking.push({ from: 'verifier', kind: 'acceptance line failing', ...line });
      }
    }
    if (!verify.treeClean) {
      blocking.push({
        from: 'verifier',
        kind: 'a gate step changed tracked files',
        detail: verify.summary,
      });
    }
    for (const finding of verify.findings) {
      (finding.significant ? blocking : other).push({ from: 'verifier', ...finding });
    }
    if (verify.verdict === 'fail' && blocking.length === before) {
      blocking.push({ from: 'verifier', kind: 'verdict fail', detail: verify.summary });
    }
  }
  if (review) {
    for (const finding of review.findings) {
      (finding.significant ? blocking : other).push({ from: 'correctness reviewer', ...finding });
    }
  }
  if (audit) {
    for (const line of audit.acceptance) {
      if (line.status === 'unmet') {
        blocking.push({ from: 'acceptance auditor', kind: 'acceptance line unmet', ...line });
      }
    }
    for (const finding of audit.findings) {
      (finding.significant ? blocking : other).push({ from: 'acceptance auditor', ...finding });
    }
  }
  return { blocking, other };
}

async function verifyAndReview(build, round) {
  const head = build.headSha;
  const tag = round ? ` after fix ${round}` : '';
  const [review, checked] = await parallel([
    () =>
      onHead('correctness review', head, (attempt) =>
        agent(
          `${ticket(build)}\n\nRun stage 4's correctness review (agent-prompts/rf-pipeline.md) on exactly this head. ${FRESH}`,
          {
            label: `review ${short(head)}${attempt > 1 ? ' (again)' : ''}`,
            phase: 'Verify and review',
            agentType: 'rf-reviewer',
            schema: REVIEW,
          },
        ),
      ),
    async () => {
      const verify = await onHead('verifier', head, (attempt) =>
        agent(
          `${ticket(build)}\n\nRun stage 3 (Verify) of agent-prompts/rf-pipeline.md on exactly this head. ${FRESH}`,
          {
            label: `verify ${short(head)}${attempt > 1 ? ' (again)' : ''}`,
            phase: 'Verify and review',
            agentType: 'rf-verifier',
            schema: VERIFY,
          },
        ),
      );
      // The audit maps each acceptance line to the verifier's evidence (stage 4), so it follows
      // the verifier while the correctness review runs beside both.
      const audit = verify
        ? await onHead('acceptance audit', head, (attempt) =>
            agent(
              `${ticket(build)}\n\nRun stage 4's acceptance audit (agent-prompts/rf-pipeline.md) on exactly this head. ${FRESH}\n\n` +
                `The fresh-context verifier's evidence for this head:\n${JSON.stringify(
                  {
                    verdict: verify.verdict,
                    summary: verify.summary,
                    gate: verify.gate,
                    acceptance: verify.acceptance,
                    screenshotsDir: verify.screenshotsDir,
                  },
                  null,
                  2,
                )}`,
              {
                label: `audit ${short(head)}${attempt > 1 ? ' (again)' : ''}`,
                phase: 'Verify and review',
                agentType: 'rf-acceptance-auditor',
                schema: AUDIT,
              },
            ),
          )
        : null;
      return { verify, audit };
    },
  ]);
  const verify = checked ? checked.verify : null;
  const audit = checked ? checked.audit : null;
  const missing = [];
  if (!verify) missing.push('verifier');
  if (!review) missing.push('correctness review');
  if (!audit) missing.push(verify ? 'acceptance audit' : 'acceptance audit (no verifier result)');
  log(
    `${rf}: ${short(head)}${tag}: verifier ${verify ? verify.verdict : 'missing'}, ` +
      `review ${review ? `${review.findings.length} finding(s)` : 'missing'}, ` +
      `audit ${audit ? `${audit.findings.length} finding(s)` : 'missing'}`,
  );
  return { head, verify, review, audit, missing, ...sortChecks(verify, review, audit) };
}

async function park(build, open, rounds, why) {
  log(`${rf}: parking (${why}) with ${open.length} open item(s)`);
  const parked = await agent(
    `${ticket(build)}\n\nPark this ticket (agent-prompts/rf-pipeline.md stage 5): ${why}. Check out the branch, ` +
      `set ${rf} to review with these open items as its nextAction (one short sentence each), keep its evidence, ` +
      `render and check the board, commit, and push. Leave the PR a draft and add the open items to its body; ` +
      `if no PR exists yet (a batch), open one as a draft for the owner's review and cite it as pr evidence. ` +
      `${NEVER}\n\nOpen items (verbatim):\n${JSON.stringify(open, null, 2)}`,
    { label: `park ${rf}`, phase: 'Fix', agentType: 'rf-builder', schema: PARK, effort: 'low' },
  );
  return {
    status: 'parked',
    rf,
    why,
    branch: build.branch,
    prUrl: parked ? parked.prUrl : build.prUrl,
    headSha: parked ? parked.headSha : build.headSha,
    parkRecorded: Boolean(parked),
    fixRounds: rounds.length - 1,
    openFindings: open,
  };
}

// ---------- Stage 2: Build ----------

phase('Build');
log(`${rf}: build${batchIssue ? ` (batch issue #${batchIssue})` : ''}`);
let build = await agent(
  `Build ${rf} as the Builder in agent-prompts/rf-pipeline.md stage 2, in Builder mode of agent-prompts/daily/start-session.md. ` +
    `${CLAIM} Set the task's final state on the branch and push. ${NEVER} ` +
    'If the ticket has no scope approval, an unfinished prerequisite, an existing claim, or needs something this checkout lacks, return status blocked with the reason.',
  { label: `build ${rf}`, phase: 'Build', agentType: 'rf-builder', schema: BUILD },
);
if (!build) return { status: 'failed', rf, reason: 'The builder returned no result.' };
if (build.status === 'blocked') {
  log(`${rf}: blocked: ${build.blockedReason}`);
  return {
    status: 'blocked',
    rf,
    branch: build.branch,
    prUrl: build.prUrl,
    reason: build.blockedReason,
  };
}
if (!fullSha(build.headSha)) {
  return {
    status: 'failed',
    rf,
    branch: build.branch,
    reason: `The builder reported no head SHA (${build.headSha}).`,
  };
}

// ---------- Stages 3-5: verify and review, then at most two fix rounds ----------

const rounds = [];
for (;;) {
  phase('Verify and review');
  const round = rounds.length;
  log(
    `${rf}: verify and review ${short(build.headSha)}${round ? ` (after fix round ${round})` : ''}`,
  );
  const checks = await verifyAndReview(build, round);
  rounds.push(checks);
  if (checks.missing.length) {
    // Nothing for the builder to fix: a stage could not report on this head even after a re-run.
    return park(
      build,
      [
        ...checks.missing.map((stage) => ({ from: stage, kind: 'no result for this head' })),
        ...checks.blocking,
      ],
      rounds,
      `${checks.missing.join(', ')} returned no result for ${short(build.headSha)}`,
    );
  }
  if (!checks.blocking.length) break;
  if (round === MAX_FIX_ROUNDS) {
    return park(
      build,
      checks.blocking,
      rounds,
      `still blocking after ${MAX_FIX_ROUNDS} fix rounds`,
    );
  }

  phase('Fix');
  log(
    `${rf}: fix round ${round + 1} of ${MAX_FIX_ROUNDS}: ${checks.blocking.length} blocking item(s)`,
  );
  const fixed = await agent(
    `${ticket(build)}\n\nFix round ${round + 1} of ${MAX_FIX_ROUNDS} (agent-prompts/rf-pipeline.md stage 5). Check out the branch, ` +
      'fix every blocking item below, also fix the non-significant findings that are small and inside the ticket ' +
      '("Findings: fix or drop"), keep the record\'s final state, re-run the affected tests, and push. ' +
      `${NEVER}\n\nBlocking items, verbatim from the fresh-context verifier and reviewers:\n${JSON.stringify(checks.blocking, null, 2)}` +
      `\n\nNon-significant findings, verbatim:\n${JSON.stringify(checks.other, null, 2)}`,
    { label: `fix ${round + 1} ${rf}`, phase: 'Fix', agentType: 'rf-builder', schema: BUILD },
  );
  if (!fixed || fixed.status !== 'built' || !fullSha(fixed.headSha)) {
    const reason = fixed
      ? fixed.blockedReason || `no head SHA (${fixed.headSha})`
      : 'the builder returned no result';
    return park(build, checks.blocking, rounds, `fix round ${round + 1} did not finish: ${reason}`);
  }
  if (sameSha(fixed.headSha, build.headSha)) {
    return park(build, checks.blocking, rounds, `fix round ${round + 1} pushed no new commit`);
  }
  build = { ...fixed, branch: fixed.branch || build.branch, prUrl: fixed.prUrl || build.prUrl };
}

// ---------- Stage 6: Publish ----------

phase('Publish');
const last = rounds[rounds.length - 1];
log(`${rf}: publish ${short(build.headSha)}`);
const results = {
  headSha: build.headSha,
  verifier: {
    verdict: last.verify.verdict,
    summary: last.verify.summary,
    acceptance: last.verify.acceptance,
    screenshotsDir: last.verify.screenshotsDir,
  },
  correctnessReview: last.review.summary,
  acceptanceAudit: { summary: last.audit.summary, acceptance: last.audit.acceptance },
  rounds: rounds.map((checks, index) => ({
    round: index,
    head: checks.head,
    fixedInNextRound: checks.blocking,
    nonSignificant: checks.other,
  })),
};
const published = await agent(
  `${ticket(build)}\n\nPublish (agent-prompts/rf-pipeline.md stage 6). The head above passed verify and review. ` +
    'Fill .github/pull_request_template.md with a Pipeline section from the results below: the head SHA they all checked, ' +
    "the verifier's verdict, each reviewer's summary, how every finding was handled (Findings: fix or drop), and the owner checks left. " +
    (batchIssue
      ? `Open the PR (not a draft): the batch issue #${batchIssue} was the claim. Then cite it as ${rf}'s pr evidence in one records-only push (ritmofit_dev_plan/two-machine-rules.md › 7.4 step 3). `
      : `The draft PR and its pr evidence already exist from stage 2: edit its body, then mark it ready for review. Push nothing; if the pr evidence is missing, add it in one records-only commit and say so. `) +
    'Run the owner-gate check on the final diff and add needs-owner if it lists gated paths. ' +
    `Do not ask for the merge: the conductor does that at stage 7. ${NEVER}\n\nResults:\n${JSON.stringify(results, null, 2)}`,
  { label: `publish ${rf}`, phase: 'Publish', agentType: 'rf-builder', schema: PUBLISH },
);
if (!published) {
  return {
    status: 'failed',
    rf,
    branch: build.branch,
    prUrl: build.prUrl,
    reviewedHeadSha: build.headSha,
    reason:
      'Publish returned no result; check the PR body and draft state before re-running publish.',
  };
}
if (!sameSha(published.headSha, build.headSha)) {
  log(
    `${rf}: the head moved from ${short(build.headSha)} to ${short(published.headSha)} at publish` +
      (batchIssue
        ? ' (the pr evidence push, 7.4 step 3)'
        : '; per AGENTS.md the new head needs review before any merge ask'),
  );
}
log(`${rf}: published ${published.prUrl}${published.needsOwner ? ' (needs-owner)' : ''}`);
return {
  status: 'published',
  rf,
  prUrl: published.prUrl,
  headSha: published.headSha,
  reviewedHeadSha: build.headSha,
  ready: published.ready,
  needsOwner: published.needsOwner,
  fixRounds: rounds.length - 1,
  findingsDisposition: published.dispositions,
  ownerChecks: published.ownerChecks,
};
