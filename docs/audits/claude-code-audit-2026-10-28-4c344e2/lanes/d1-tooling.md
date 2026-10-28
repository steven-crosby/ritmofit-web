# Lane d1-tooling — CI and governance tooling as executable code

Audited commit `4c344e2` (main). Worktree:
`/tmp/claude-0/-home-user-ritmofit-web/225314d5-8442-5f3f-bf78-85de30171bbc/scratchpad/wt-d1-tooling`
(detached, `pnpm install --frozen-lockfile` OK). Bash 5.2.21, Node 22, pnpm 11.4.0. No remote,
production or wrangler calls. `deploy.sh` was run with `--self-check` only, plus once in a throwaway
sandbox repo with a local bare origin and a `pnpm` stub that refuses to run.

Paths below are relative to `$A = docs/audits/claude-code-audit-2026-10-28-4c344e2/`.

## 1. Scope and depth

| Area | Depth | Notes |
| --- | --- | --- |
| `scripts/owner-gate.mjs` + test | Traced and tested | All 2,218 tracked files classified. Crafted stdin lists. Self-test 5/5. |
| `scripts/rf-trace.mjs` + test | Traced and tested | 8 crafted `evaluate()` cases. Self-test 5/5. |
| `scripts/tasks.mjs` + test | Traced and tested | 10 crafted graphs. `tasks:test` 11/11. `tasks:check` green on 103 records. |
| `scripts/deploy.sh` (+ `deploy-script.test.ts`) | Traced and tested | `--self-check`, 3 mutants + 1 control, bad-sha run in a sandbox. Deploy and remote paths: trace only. |
| `.github/workflows/ci.yml` | Traced | Event types, `if:` conditions, status binding, void step, 3,000-file guard, shell pipelines, main's copy of the checkers. Not executed (needs GitHub). |
| AGENTS.md gate list vs ci.yml | Diffed | Same commands. No drift. |
| deploy.sh `run_gates` vs ci.yml | Diffed | Drift. See T-04. |
| `package.json` scripts | Read | `test` uses `--if-present`. Every package with tests has a `test` script. |
| `apps/web/scripts/check-*`, `apps/api/scripts/*` | Sampled | Only checked that they are wired into scripts and CI. Logic not assessed (D-12 is known). |

## 2. Candidates

### T-01 — deploy.sh self-check: the "git guard and /tmp worktree" assertions are inert. A deploy-the-wrong-commit mutant passes

- **Category:** test or guard correctness (production deploy regression net)
- **Proposed severity:** P3. Today's deploy behaviour is correct. The defect is that the regression
  net CI relies on has no effect for these assertions. RF-88 was closed on the conclusion that "the
  self-check assertions are meaningful", and that is false for this block.
- **Confidence:** high. **Status:** confirmed.
- **Refs:** `scripts/deploy.sh:602-649` (the subshell is the left side of
  `( … ) && pass … || fail …` at :649). Inert assertions:
  - `grep -q "not empty" "$dirty_err"` (:623)
  - `grep -q "not empty" "$dirty_sha_err"` (:629)
  - `grep -q "not origin/main"` (:639)
  - `[[ "$(git -C "$wt" rev-parse HEAD)" == "$(git rev-parse HEAD)" ]]` (:645)
  - `[[ "$(git -C "$wt" status --porcelain)" == "" ]]` (:646)

  CI wrapper: `apps/api/src/lib/deploy-script.test.ts:6-23`.
- **Mechanism:** bash ignores `set -e` in any command that is part of an `&&`/`||` list. That holds
  inside a subshell too, even when the subshell runs `set -euo pipefail` itself. Only the explicit
  `exit 1`s and the subshell's last command (`[[ ! -d "$wt" ]]`) decide pass or fail. Every bare
  assertion in between runs, fails, and is ignored. Minimal demo:
  `( set -euo pipefail; false; echo still running; true ) && echo pass` prints both lines.
- **Expected:** each assertion fails the self-check when its property breaks.
- **Observed:** all three mutants of a copy of `deploy.sh` still print
  `self-check ok: git guard and /tmp worktree` and `self-check passed`, exit 0:
  - M1: the dirty-tree refusal message no longer contains "not empty".
  - M2: the divergence message no longer contains "not origin/main".
  - M3: `create_deploy_worktree` checks out `"$sha~1"`, so the deploy would build and upload the
    parent of the requested commit.

  M3 also passes the CI vitest wrapper, 1/1. A control mutant that removes the dirty-tree check
  itself is caught (`dirty tree was accepted`, exit 1), because that branch uses an explicit `exit 1`.
- **Impact:** a later edit to `create_deploy_worktree` could deploy the wrong commit. So could an edit
  that breaks the refusal text the runbook and operators rely on. CI and `--self-check` would stay
  green. A secondary effect: the setup commands (`cd "$tmp"`, `git init -b main`) are not fail-stop
  either. If `git init -b` failed (git < 2.28) while `$TMPDIR` sits inside a work tree, the following
  `git commit` and `git update-ref refs/remotes/origin/main` would run against the enclosing repo.
  That is a hypothesis with unlikely preconditions, and it was not reproduced.
- **Evidence:** `$A/repro/d1-tooling-deploy-selfcheck-mutation.sh <worktree>` writes
  `$A/evidence/d1-tooling-deploy-selfcheck-mutation.txt`. That file has the baseline, M1, M2, M3, the
  control, M3 under vitest, and the bash-semantics demo.
- **Existing coverage and why it misses:** `deploy-script.test.ts` only checks that the
  `git guard and /tmp worktree` pass line is printed, and the block cannot fail on these assertions.
- **Counterevidence considered:** the explicit `if … exit 1` checks inside the block do work (the
  control proves it). The defect is limited to the bare assertions listed above.
- **Remediation direction:** run the block as `if ( … ); then pass; else fail; fi`. That form still
  ignores `-e`, so it does not fix this on its own. The fix is to convert each bare assertion to
  `cond || exit 1`, or to run the block as its own `bash -euo pipefail -c` / function invoked in a
  plain context and test `$?` afterwards. Add M3 as a test: the worktree HEAD must equal the
  requested sha.
- **Fix check:** re-run the repro. All three mutants must report `self-check FAIL: git guard and /tmp worktree`.
- **Known status:** new. It contradicts RF-88's resolution ("self-check assertions are meaningful").
- **Owner-gated fix:** yes. `scripts/deploy*` is in the CI / deploy / infrastructure gate. The test
  file `apps/api/src/lib/deploy-script.test.ts` is not gated (RF-101 lists it).
- **Real browser or device needed:** no.

### T-02 — Owner gate misses paths the AGENTS.md list names: auth tests and the harness behind the authz net, plus subdirectory refactors

- **Category:** governance guard coverage (matcher vs. policy)
- **Proposed severity:** P3. The gate is a declared guardrail, and every merge still needs per-PR
  owner permission.
- **Confidence:** high. **Status:** confirmed.
- **Refs:** `scripts/owner-gate.mjs:27-37` (auth), `:21-25` (D1), `:40-53` (provider); AGENTS.md
  "Owner-gated" bullets ("auth and authz (Better Auth, sessions, `requireAccess` helpers, **their
  tests**)", "D1 migrations").
- **Trigger:** a PR that touches only the paths below passes `owner-gate.mjs` with no label (exit 0,
  "none owner-gated"):
  - `apps/api/test/password-reset.integration.test.ts`. This is the Better Auth reset-flow test. The
    test regex only matches basenames containing `auth`, `authz` or `access`.
  - `apps/api/test/helpers.ts`. It provides `signUpUser`, `authed(cookie)` and `call`, and 40 of the
    integration suites import it, including `authz`, `nested-resource-access`, `class-route-access`,
    `team-access` and `choreography-access`. Changing `authed()` or `call()` can make every authz
    assertion vacuous while the gated test files stay unchanged.
  - `apps/api/test/apply-migrations.ts`. This is the setup file that applies the migrations to the
    integration D1. RF-101 names the vitest configs, not this file.
  - Subdirectory refactors. `lib/auth/index.ts`, `lib/authz/class.ts`,
    `routes/provider/callback.ts` and `test/authz/*.test.ts` all fall outside the
    `[^/]*$`-anchored regexes. The PR that moves `lib/auth.ts` into a folder is gated, because the
    old path is listed. Every later edit inside the new folder is not.
  - `apps/api/src/middleware/session.ts`. Only `middleware/auth*` is matched, so any new session
    middleware file is ungated.
  - `.cursor/install.sh`. It is tracked and runs in Cursor agent environments (the owner works in
    Cursor). It is not matched by the "agent rules" gate.
- **Expected:** paths in classes that AGENTS.md lists fail the gate without `owner-approved`.
- **Observed:** see `$A/evidence/d1-tooling-owner-gate-misses.txt`. Twelve paths give exit 0. Control
  paths (`apps/api/migrations/0099_x.sql`, `apps/api/test/authz.integration.test.ts`) give exit 1.
- **Evidence:** run
  `OWNER_GATE_LABELS='[]' node scripts/owner-gate.mjs < $A/repro/d1-tooling-owner-gate-misses.txt`.
  To classify each path: `node $A/repro/d1-tooling-gate-classify.mjs <worktree> < <list>`.
- **Existing coverage and why it misses:** `owner-gate.test.mjs` "every gated class is caught" lists
  one sample path per pattern. It never asserts on harness files or on subdirectories.
- **Counterevidence considered:** RF-101 already tracks route call sites, CI-config files
  (vitest/Playwright/eslint configs, `scripts/tasks.mjs`, `.nvmrc`), "provider/OAuth integration
  tests", `deploy-script.test.ts`, the lockfile and the Live readiness UI. None of the paths above
  are in that list. `.npmrc` was considered and dropped: pnpm 11.4 does not read its two keys
  (`pnpm config get engine-strict` gives `undefined`), and the lockfile integrity hashes limit a
  registry swap.
- **Remediation direction:** gate `apps/api/test/{helpers,apply-migrations}.ts` and
  `password-reset*`. Match directories as well as basenames (`(auth|authz)(/|[^/]*$)`). Widen
  `middleware/` to the whole directory. Add `.cursor/`. Add a self-test case for each.
- **Fix check:** the repro list exits 1 and names each path.
- **Known status:** extends RF-101 with paths that are not in its list.
- **Owner-gated fix:** yes (`scripts/owner-gate*`).
- **Real browser or device needed:** no.

### T-03 — Gate matching is case-sensitive, but the owner's deploy machine (macOS) is case-insensitive

- **Category:** governance guard bypass, platform semantics
- **Proposed severity:** P3. It needs an unusual path that an agent is unlikely to produce by mistake.
  Under the AGENTS.md model a deliberate bypass is out of scope, but the effect lands on remote D1.
- **Confidence:** medium. **Status:** probable. The matcher miss is confirmed. The macOS checkout
  behaviour was reasoned, not reproduced: no case-insensitive filesystem was available.
- **Refs:** `scripts/owner-gate.mjs:22` (`startsWith('apps/api/migrations/')`) and every other gate;
  `apps/api/wrangler.toml` (`migrations_dir = "migrations"`); `apps/api/vitest.integration.config.ts:17`
  (`readD1Migrations(path.join(dir, 'migrations'))`); `scripts/deploy.sh:371-379`;
  `ritmofit_dev_plan/deployment-runbook.md:89` (`wrangler d1 migrations apply ritmofit --remote`).
- **Trigger:** a PR adds `apps/api/Migrations/0099_x.sql`, `apps/api/src/DB/schema.ts` or
  `agents.md`. On Linux CI the gate reports nothing and the integration suite does not see the
  migration, because it reads only `migrations/`. On a case-insensitive APFS checkout, git writes
  the file into the existing `migrations/` directory. `deploy.sh` then reports an unapplied remote
  migration, and the runbook's next step applies it with `--remote`. `agents.md` would likewise
  collide with `AGENTS.md` on macOS, and the copy git writes last wins.
- **Evidence:** `$A/evidence/d1-tooling-owner-gate-misses.txt` (last three rows, UNGATED).
- **Existing coverage:** the self-test asserts only that `Owner-Approved` is not the label. Path
  case is never tested.
- **Counterevidence considered:** GitHub reads `.github/` case-sensitively, so the CI files
  themselves are not exposed. The deploy refuses until migrations are applied, so a person is in the
  loop. That person would see an unfamiliar migration name, but nothing marks it as ungated.
- **Remediation direction:** lowercase the path before matching in `evaluate()`. Optionally, fail
  when two changed paths differ only by case.
- **Known status:** new.
- **Owner-gated fix:** yes.
- **Real browser or device needed:** a macOS checkout is needed to confirm the collision.

### T-04 — `deploy.sh` runs a smaller gate than ci.yml, though the runbook says it runs "the same list"

- **Category:** deploy gate drift
- **Proposed severity:** P3. On the default path (HEAD = `origin/main`) CI already ran the full job on
  push. The gap matters for `scripts/deploy.sh <sha>`, which accepts any commit, merged or not.
  `deploy.sh` never consults that commit's CI status.
- **Confidence:** high. **Status:** confirmed.
- **Refs:** `scripts/deploy.sh:325-339` (`run_gates`), `:88-92, 806-811` (any resolvable sha);
  `.github/workflows/ci.yml:75-209`; `ritmofit_dev_plan/deployment-runbook.md:119`.
- **Observed:** `run_gates` omits:
  - the Playwright e2e smoke (the only real-browser core-loop and axe check)
  - `theme-classes --selftest`
  - `owner-gate:test`
  - `rf-trace:test`
  - `tasks:test`
  - `tasks:check`

  These were added to CI by #643 after #596 shaped `run_gates`.
- **Evidence:** `$A/evidence/d1-tooling-deploy-vs-ci-gates.txt` (mechanical diff of the run steps).
- **Remediation direction:** add the e2e smoke to `run_gates` (port collisions, RF-104, do not apply
  in a single deploy run). Alternatively, require a green `checks` run on the sha via `gh` before
  deploying. Either way, fix the runbook sentence.
- **Known status:** new. RF-88 and RF-22 cover the other deploy guards. D-10, that e2e was missing
  from CI, is now fixed in CI but not in deploy.
- **Owner-gated fix:** yes (`scripts/deploy*`).
- **Real browser or device needed:** no.

## 3. Rejected leads (do not re-file)

| Lead | Why rejected |
| --- | --- |
| deploy.sh with an unresolvable sha | `resolve_deploy_sha` returns 0 with an empty sha, because bash clears `-e` inside `$(…)` and the function ends in `return 0`. The script then reads the index's `.nvmrc` and stops at `git rev-parse --short ""` (exit 128) before any install or wrangler call. It fails closed by accident. Sandbox run: `$A/repro/d1-tooling-deploy-badsha.sh`, `$A/evidence/d1-tooling-deploy-badsha.txt`. Worth a one-line hardening (`|| return 1`), not a finding. |
| `deploy.sh <sha>` deploys an unmerged commit | Documented ("A sha deploys that commit anyway"). The tree must still be clean. Drift in its gate is T-04. |
| Migration ordering in deploy | `wrangler d1 migrations list --remote` runs in the deploy worktree against that sha's `migrations/` and refuses unless it prints "No migrations to apply". Code deploys only after that check. A rollback to an older sha with newer remote migrations passes; that is intended. |
| Build before deploy | `run_gates` builds web, and `deploy_tree` builds again. `expected` is read from the fresh `dist/index.html`, and `wrangler.toml` assets point at `../web/dist` in the same worktree. |
| Errexit holes in the real deploy path | The `local` declarations are separate from the assignments, so `x="$(…)"` failures exit. The pipes (`secret list | names`) run under `pipefail`. `check_required_secrets` and `smoke_statuses` are plain calls. |
| ci.yml `grep -c … || true` and `set -e` | `grep -c` prints 0 and exits 1 on an empty file, and `|| true` keeps the 0. `gh … | awk` sums the paginated counts under `pipefail`, so a `gh` failure fails the step. |
| `@tsv` with odd filenames | jq escapes tab, newline and backslash in a name, so a name cannot split into an extra gated or ungated line. The escapes never remove a gated prefix, and exact-match gates (`AGENTS.md` and others) cannot contain those characters. |
| Renamed and deleted files | The files API's `previous_filename` is emitted, and deleted files are listed. Both reach the gates. |
| The files list is fetched live while `HEAD_SHA` comes from the event | A push between the event and the step cancels the run (concurrency), and a stale run's result binds to a sha that is no longer the head. |
| rf-trace: an unrelated or already-Done record gains a `pr` cite, or the status is `blocked`/`review` | Both pass, and AGENTS.md defines it that way ("at least one", final = Done/For review/Blocked/Cancelled). Cases: `$A/evidence/d1-tooling-rf-trace-cases.txt`. |
| rf-trace ignores `ritmofit_design_system/tokens.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | AGENTS.md defines product as `apps/`, `packages/`, `e2e/`. Raise it as a policy question if the owner wants shipped CSS and dependencies traced. |
| rf-trace wrong PR / kind / deleted / in-progress / non-canonical URL | All fail closed (evidence file). The URL variant is already RF-105. |
| tasks.mjs graph validation | Cycles (dependsOn, parent, completion), missing references, a Done parent with an open child, a cancelled prerequisite, and invalid calendar dates are all rejected. Evidence: `$A/evidence/d1-tooling-tasks-validate-cases.txt`. Render is deterministic: it sorts by priority and then id and contains no timestamps. |
| tasks.mjs accepts future `checkedOn` and `pr` refs that are not PR URLs; `create` reuses the ID of a deleted highest record | Minor hygiene. The validator says it checks structure, not truth (tasks/README.md:75). ID reuse needs a deleted published record, which the README already forbids. |
| ci.yml status binding, reopen, label rerun, write token, stacked base, cancelled-before-record | Known: RF-100, RF-102, RF-105. No new trigger found. |
| Fork PRs | The record step would 403 and fail the job, which fails closed. This is a solo repository with no fork flow. |
| AGENTS.md gate list vs ci.yml | Every listed command is in ci.yml with the same flags and order of effect. |

## 4. Gaps not covered

- ci.yml was not executed on GitHub. Event and label behaviour comes from tracing and GitHub's
  documented semantics.
- Case-insensitive checkout (T-03) was not reproduced on APFS.
- The logic of `apps/api/scripts/check-contract-parity.ts`, `generate-openapi.ts`,
  `apps/web/scripts/check-bundle-budget.mjs` and `check-theme-*.mjs` was not audited (only their wiring).
- The mutation score of the owner-gate and rf-trace self-tests (beyond RF-98's two mutations) was not measured.
- The deploy path past `resolve_deploy_sha` (secrets, migrations, wrangler, propagation) was
  traced only, never run.
