# Challenge 2: API (A-01..A-07) and tooling (T-01..T-04)

Challenger: Claude Code subagent (independent skeptical challenger), 2026-10-28. Audited SHA `4c344e2`.
I worked audit-only and tried to disprove, downgrade or merge each candidate. All runs used a
disposable worktree `$SCRATCH/wt-chal2`, detached at 4c344e2, after `pnpm install --frozen-lockfile`.
I ran no remote calls, no wrangler and no deploy, and changed no tracked file in the main checkout.
I edited `scripts/deploy.sh` only inside the disposable worktree, for mutation runs, and restored it
afterwards (`git status --porcelain` was empty).

## Verdict table

| ID | Filed | Verdict | Final sev | One line |
| --- | --- | --- | --- | --- |
| A-01 | P3 | Upheld-qualified | P3 (low) | Real, but only a hand-written or buggy client can reach it. The SPA always sends `JSON.stringify`. The proposed `onError` SyntaxError mapping would mislabel server-side `JSON.parse` failures. |
| A-02 | P3 | Upheld | P3 | The 422 mapping for every `ZodError` with no log line is real and was not considered (the provider branch shows the authors thought only about provider ZodErrors). The trigger is self-inflicted, but the mapping defect is general. |
| A-03 | P3 | Merged into A-11/D-8, downgraded | P4 | Every item is accurate, but no current consumer is affected: the web uses shared types, and the iOS snapshot calls neither shares nor bpm-lookup. Same root cause as A-11/D-8 (a hand-written registry). |
| A-04 | P3 | Upheld-qualified | P3 (dormant) / P4 (self) | Better Auth `/update-user` does accept any string for `image` (`z.record(z.string(), z.any())`). The SPA normalises `''` to null, so neither arm can be reached from the SPA. The Explore arm sits on a deferred, unmounted surface. The self-lockout arm only harms the caller, who can undo it through `/update-user`. |
| A-05 | P3 | Merged into D-1 (new call site; same as Q-02) | P3 | Confirmed that neither D-1 nor RF-91's acceptance lists `lib/authz.ts:288`. Only the legacy unpaginated path (iOS) can reach it. The web always paginates. |
| A-06 | P3 | Upheld-qualified | P3 | Real, and nothing records it as accepted. The overstatement: sign-up is a standard enumeration surface, and the approved anti-enumeration decision (PUB-03) covers recovery only. Remediation option 1 would **not** close the oracle under the beta gate (see below). |
| A-07 | P3 | Upheld-qualified | P3 (low) | Real gap in the `PATCH /tracks` guard. Only hand-written or iOS calls reach it, and no SPA path changes a library duration. Live impact is not shown. |
| T-01 | P3 | Upheld | P3 | Re-ran it: M1/M2/M3 all pass self-check, and M3 passes the CI vitest wrapper. Making the assertion fail-stop catches M3. Nothing else in `deploy.sh` or CI would catch a `sha~1` deploy. |
| T-02 | P3 | Merged into RF-101 (addendum) | P4 | Matcher misses are confirmed, but AGENTS.md makes `owner-gate.mjs` the authoritative list and calls the gate a guardrail. RF-101 already holds the owner decision on widening it. The subdirectory paths are hypothetical, and the PR that moves files would itself be gated. |
| T-03 | P3 | Downgraded | P4 / informational | Needs a deliberately odd path casing, which AGENTS.md puts outside the gate's scope. drizzle-kit writes to the configured `migrations/`, so no accidental trigger exists. The owner still approves every merge, and the diff shows the path. |
| T-04 | P3 | Upheld-qualified, downgraded | P4 | The runbook's "same list" sentence is wrong. Of the omitted checks, only the e2e smoke bears on the deployed artifact, and only for an explicit-sha deploy (the default `origin/main` path already had CI run on push). |

---

## A-01: malformed JSON returns 500

**Verdict: Upheld-qualified (P3, low).**

- **Re-ran:** `repro/a-api-probes.integration.test.ts` in the worktree. 7/7 pass, so all A-0x
  behaviours still reproduce.
- **Reachability:** none from the SPA. All 34 `c.req.json()` sites sit behind
  `schema.parse(await c.req.json())`. The one route with an optional body (`POST /classes/:id/copy`,
  `classes.ts:199`) already uses `.catch(() => ({}))`. Only a hand-written request or a future client
  bug reaches it. The impact is log noise and a wrong status. No data is affected.
- **Fix regression risk (new):** the lane's first remediation was "in `onError`, map
  `SyntaxError` … to 400". That would repeat A-02's bug class. The server has its own `JSON.parse`
  calls that throw `SyntaxError` on corrupt stored data:
  - `lib/serialize.ts:98` (`guidanceJson`)
  - `routes/class-plan-blocks.ts:125`
  - `lib/ordered-class-import.ts:172` (`result_json` receipts)
  - `lib/authz.ts:300` (`tagsJson`)
  - `class-list-pagination.ts:21` (cursor; that one really is client input)

  A blanket mapping would report a server-side corruption as a client 400 with no log line. Prefer
  the second option: one body-parse helper that throws `HttpError(400)`.

## A-02: server-side ZodError mapped to an unlogged 422

**Verdict: Upheld (P3).**

- **Counterevidence I checked:**
  - The `ProviderError` comment in `index.ts` says "a provider `ZodError` would otherwise read as
    'your request was invalid'". So the authors knew about the misclassification, but they fixed
    it only for providers. Nothing documents output-parse errors as intentional.
  - Cloudflare request logs would still record a 422 status, but not the issue detail, and a 4xx
    is not something an operator would chase.
- **Trigger:** confirmed. `trackSchema.durationMs` (`packages/shared/src/entities/tracks.ts:18`) has no
  `.max(MAX_DURATION_MS)`. The class-track fields in `choreography.ts:33,87` do have it. This trigger
  is self-inflicted and needs a hand-written request. A-04 supplies more triggers of the same kind.
- **Fix regression risk:** clients (web, iOS) may treat 422 as "show the validation message". To
  move output failures to 500, tag errors at the output site (the `serialize*` helpers, plus the
  `runPayloadSchema` and explore parses). Do not reclassify all ZodErrors, or real input validation
  stops returning 422.

## A-03: OpenAPI drift in five places

**Verdict: Merged into A-11/D-8, downgraded to P4.**

- **Verified:**
  - `generate-openapi.ts:688` (bpm-lookup), `:865` (callback) and `:1005` (`/classes/{id}/shares`)
    exist.
  - `/health` is unregistered.
  - The spec has 92 `additionalProperties` entries.
- **Counterevidence:**
  - `grep` finds no `bpm-lookup`, `bpmLookup` or `shares` in `ios-snapshot/`.
  - Shares and teams are deferred community surfaces (AGENTS.md "Product Boundaries").
  - The web reads `@ritmofit/shared` types, not the spec.
  - Swift `Codable` ignores extra keys.

  No current consumer breaks. The root cause and the fix are the same as A-11/D-8's: the
  registry is hand-written, and regeneration only proves self-consistency. List these five as
  extra instances of A-11, not as a separate finding.

## A-04: input/output asymmetry (Explore 422 / self-lockout)

**Verdict: Upheld-qualified (P3 for the dormant cross-user arm, P4 for the self arm).**

- **Is the `image` claim true?** Yes. In better-auth 1.7.14,
  `dist/api/routes/update-user.mjs:13` is `z.record(z.string(), z.any())`, and `image` is copied
  through unchecked (`:54-65`). The column mapping `user.fields.image → imageUrl`
  (`lib/auth.ts:140`) sends it straight to the column that `serializeUser` validates with `z.url()`.
  The same applies to `image` on `/sign-up/email` (`sign-up.mjs:150`), which is another route to
  the same self-lockout.
- **Reachability from the SPA:** none. The SPA profile form sends `normalizeOptional(displayName)`
  and `normalizeOptional(imageUrl)` (`Dashboard.tsx:3085-3088`). The repro had to set
  `origin: https://ritmofit.studio` by hand, which a non-browser client can do.
- **Cross-user arm:** `ExploreDialog` is defined but never rendered. `grep "<ExploreDialog"` finds
  nothing, so no SPA user hits `/explore`. Explore is a deferred surface that AGENTS.md says not to
  expand. Any beta user can 422 the API feed today, but no client calls it.
- **Self arm:** the victim is the caller. It can be recovered: `/api/auth/update-user` does not run
  `serializeUser`, so a second call with a valid `image` undoes it. Even so, the SPA would show a
  broken session with no way to fix it in the UI.
- **Fix:** making `serializeUser` tolerant (an invalid `imageUrl` becomes null) is low-risk and is
  not owner-gated.

## A-05: unpaginated `GET /classes` 500 above 100 classes

**Verdict: Merged into D-1 as a new call site (it duplicates d2-quality Q-02). P3 as a standalone
surface.**

- **Is the site really missing from D-1's list?** Yes.
  - D-1 (`codex-code-audit-2026-10-27-4e0b150/findings.md:86`) lists `purge.ts`, `run-payload.ts`,
    `classes.ts:225-231` and `moves.ts` / `class-recency.ts`.
  - A-9 (`lanes/api-security-data.md:70`) adds `class-tracks.ts:744`.
  - Neither names `lib/authz.ts`.
  - RF-91's acceptance covers "purge, run-payload, copy, and rename" only.
  - The code comment at `authz.ts:270-272` claims the query is "≤ page size classes". That is false
    on the legacy path, where `limit` is undefined.
- **Reachability:** the web always paginates. The legacy path is documented for "the current iOS
  cache" (`routes/classes.ts:128-131`). iOS is paused under D20. A library of 101 or more classes
  is plausible for a long-time instructor.
- **Recommendation:** add `authz.ts:288` to RF-91's acceptance, so the shared helper fix covers five
  surfaces, not four. The repro inserts classes directly, but the read path is identical.

## A-06: sign-up enumerates registered emails

**Verdict: Upheld-qualified (P3).**

- **Is it inherent to Better Auth, or already accepted?**
  - Better Auth 1.7.14 (`sign-up.mjs:155,194-204`) returns `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`
    unless `requireEmailVerification` is set or `autoSignIn === false`. Neither is set
    (`lib/auth.ts:141-178`).
  - `authorization.md` and `decisions.md` contain no "enumeration" text. The only recorded
    anti-enumeration decision is design audit PUB-03 (`claude-design-audit-2026-07-24/run-decisions.md:49`),
    which covers the recovery copy only.
  - The `auth.ts:161-162` comment accepts *unverified sign-in* ("send-don't-block"), not
    enumeration.

  So nothing records it as accepted. Still, it is the default behaviour of most sign-up forms. The
  lane's claim that it "defeats the no-enumeration property" overstates what was decided. It is a
  residual, not a regression.
- **Remediation option 1 is insufficient (new):** with `requireEmailVerification` or
  `autoSignIn:false`, a registered email gets the synthetic 200. An unknown, non-allowlisted email
  still reaches `databaseHooks.user.create.before` and gets **403 `BETA_INVITE_REQUIRED`**. The
  oracle survives as 200 vs 403. Only option 2 (one generic outcome for both) closes it, and the
  invite-only UX then loses its explicit "you are not invited" message. That is a product call.
- **Related, not filed:** an attacker who knows an allowlisted invitee's email can sign up first
  (201, unverified) and squat the account. That belongs to the A-8 and `requireEmailVerification`
  family. Worth a line in that owner decision.

## A-07: `PATCH /tracks/:id` breaks the free-mode no-overlap invariant

**Verdict: Upheld-qualified (P3, low).**

- **Re-ran:** the repro printed
  `override PATCH -> 422 | library PATCH -> 200 | track0 end = 240000 track1 start = 180000`.
- **Is another path reachable?** The only writers to `tracks` are:
  - `routes/tracks.ts:139,158` (the PATCH)
  - `bpm-lookup.ts:69` (BPM only)
  - `purge.ts:174` (art only)

  The SPA has no `updateTrack` caller (`apps/web/src/lib/api.ts`). Only a hand-written request or
  a future iOS client reaches it. The `sequencing.ts:9` docstring says "overlaps rejected by the
  route", so the invariant is intended, and the guard's own comment covers clip, cue and move but
  omits overlap. That makes it an oversight, not a design choice.
- **Impact:** what Live does with two overlapping windows is not demonstrated, and the effect is on
  the owner's own data.

---

## T-01: deploy.sh self-check git-guard block cannot fail on its bare assertions

**Verdict: Upheld (P3, high confidence).**

- **Re-ran:** `repro/d1-tooling-deploy-selfcheck-mutation.sh` against the worktree:

  ```
  baseline                                         exit=0  1x guard-ok | self-check passed
  M1 dirty-tree message no longer 'not empty'      exit=0  1x guard-ok | self-check passed
  M2 diverge message no longer 'not origin/main'   exit=0  1x guard-ok | self-check passed
  M3 worktree builds sha~1 instead of sha          exit=0  1x guard-ok | self-check passed
  ```

- **CI wrapper:** I applied M3 to the worktree's real `scripts/deploy.sh` and ran
  `pnpm exec vitest run src/lib/deploy-script.test.ts`. Result: 1/1 passed. The test's
  `toContain('git guard and /tmp worktree')` matches both the pass and the fail line, but
  `status 0` and `self-check passed` would have caught a real fail, so the wrapper is not the
  problem. The block is.
- **Positive control (new):** with M3 still applied, I appended `|| exit 1` to the `rev-parse HEAD`
  assertion at `:645`. The self-check then printed `self-check FAIL: git guard and /tmp worktree`
  and `self-check failed: 1`. So the assertion would catch M3 if it were fail-stop.
- **Bash demo:** `( set -euo pipefail; false; echo still-running; true ) && echo pass` printed both
  lines. That is POSIX behaviour. RF-88's macOS bash 3.2 behaves the same, so its "meaningful"
  resolution is contradicted for this block.
- **Would any other check catch a `sha~1` deploy?** No.
  - `deploy_tree` (`:342-394`) never compares the worktree HEAD with `$sha`.
  - `expected` (the entry hash) is read from the same wrong tree's `dist/`, so `propagation_loop`
    agrees with itself.
  - `--message "$short"` labels the Worker version with the *requested* sha, so
    `wrangler deployments status` would also mislead.
  - `/health` reports `API_VERSION`, not a commit.
  - `smoke_statuses` and `security_headers_ok` check status codes and headers, not identity.

  The only remaining nets are human. `scripts/deploy*` is owner-gated, and the PR diff would show
  a `"$sha~1"` edit plainly. A subtler edit, such as a variable mix-up, would get through.
- **Severity stays P3:** today's behaviour is correct. The defect is a regression net with no
  effect, on the one script that touches production.

## T-02: owner-gate misses paths

**Verdict: Merged into RF-101 as an addendum. Downgraded to P4.**

- **Re-ran:** `OWNER_GATE_LABELS='[]' node scripts/owner-gate.mjs < repro/d1-tooling-owner-gate-misses.txt`
  printed "12 changed files, none owner-gated", exit 0. The controls exit 1.
- **Counterevidence:**
  - AGENTS.md says "The authoritative path list is `scripts/owner-gate.mjs`" and "The owner gate is
    a guardrail, not a security boundary". Every merge still needs per-PR owner permission.
  - RF-101 (backlog) is exactly the open owner decision about widening the matcher, and it records
    the trade-off against friction.
  - Of the 12 paths, only 4 exist today: `password-reset.integration.test.ts`, `helpers.ts`,
    `apply-migrations.ts` and `.cursor/install.sh`. The `lib/auth/`, `lib/authz/`, `middleware/session.ts`,
    `routes/provider/` and `test/authz/` paths are hypothetical, and the PR that creates them by
    moving gated files is itself gated.
  - `helpers.ts` is imported by 43 test files. Making `authed()` vacuous would also break the
    positive (200/201) assertions, which limits a silent weakening.
- **What is real:** the password-reset suite is an auth test that the "their tests" bullet covers,
  and the basename regex misses it. That is a one-line policy and matcher mismatch. Add the four
  existing paths to RF-101's acceptance list. Do not file a separate finding.

## T-03: case-sensitive gate matching vs a macOS checkout

**Verdict: Downgraded to P4 / informational. The macOS half is still unreproduced.**

- **Counterevidence:**
  - The trigger is a deliberately odd casing (`Migrations/`, `DB/`, `agents.md`). drizzle-kit
    writes to `./migrations` from `drizzle.config.ts`, so an agent has no accidental path to it.
  - AGENTS.md puts deliberate bypass out of the gate's scope.
  - The owner approves every merge, and the diff shows the new path. On deploy, `deploy.sh` stops
    and lists the unapplied migration by name before anything is applied, so a person sees it at
    two points.
- The macOS deploy machine is plausible: RF-88 records a macOS bash 3.2 run. Lowercasing in
  `evaluate()` is cheap, so log it as RF-101 hygiene.

## T-04: deploy.sh `run_gates` is smaller than CI

**Verdict: Upheld-qualified, downgraded to P4 (doc drift plus a narrow gap).**

- **Verified:**
  - `run_gates` (`deploy.sh:325-339`) lacks e2e, `theme-classes --selftest`, `owner-gate:test`,
    `rf-trace:test`, `tasks:test` and `tasks:check`. CI runs all of them (`ci.yml:76-209`).
  - The runbook (`deployment-runbook.md:118`) says "the same list as `.github/workflows/ci.yml`".
  - Neither `deploy.sh` nor the runbook mentions e2e.
- **Counterevidence:**
  - Five of the six omitted checks are governance and tool self-tests. They do not affect the
    deployed Worker or SPA, so leaving them out of a deploy is harmless.
  - CI runs on `push: main` (`ci.yml` `on:`), so the default deploy path (HEAD = `origin/main`)
    already has the full job, e2e included, on that sha.
  - The gap is e2e on an explicit-sha deploy. Rollbacks to older shas are a designed use.
- **Fix regression risk:** adding e2e to `run_gates` needs Playwright and Chromium on the owner's
  deploy machine and a free port 8798, and it slows every deploy, including urgent rollbacks.
  The cheaper fix is to correct the runbook sentence, and optionally to warn when the sha has no
  green `checks` run.

## What I re-ran

| Item | Command | Result |
| --- | --- | --- |
| A-01..A-07 | `pnpm exec vitest run --config vitest.integration.config.ts test/a-api-probes.integration.test.ts` (repro copied into `apps/api/test/`, removed afterwards) | 7/7 pass, so every defect reproduces |
| T-01 mutants | `bash repro/d1-tooling-deploy-selfcheck-mutation.sh $SCRATCH/wt-chal2` | baseline, M1, M2 and M3 all exit 0 with "self-check passed" |
| T-01 CI wrapper | M3 applied to the worktree's `scripts/deploy.sh`, then `vitest run src/lib/deploy-script.test.ts` | 1/1 pass (not caught) |
| T-01 positive control | M3 plus `|| exit 1` on the `:645` assertion, then `--self-check` | `self-check FAIL: git guard and /tmp worktree`, `self-check failed: 1` |
| T-01 bash semantics | `( set -euo pipefail; false; echo still-running; true ) && echo pass` | both lines print |
| T-02/T-03 | `owner-gate.mjs` on the misses and controls lists | misses exit 0 (12 ungated); controls exit 1 |
| A-04 library check | read better-auth 1.7.14 `update-user.mjs`, `sign-up.mjs` | `image` is unvalidated; duplicate handling is as the lane described |
