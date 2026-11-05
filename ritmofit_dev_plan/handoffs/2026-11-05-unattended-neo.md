---
date: 2026-11-05
tool: Claude Code (desktop, Neo)
lane: solo
branch: docs/handoff-2026-11-05-unattended-neo
head: n/a
base: 12475d5dd8af5ebd20ba36f0697a2ab7f95c3cbb
prs:
  [
    '#731 (merged 827ae64)',
    '#732 (merged a8f2512)',
    '#733 (merged aae4f2d)',
    '#734 (merged 92a04cb)',
    '#735 (merged 12475d5)',
  ]
status: open
---

# Unattended Neo session 2026-11-05 (pre-approval issue #730): five web PRs merged, two owner decisions and one device check owed

## Done

Each PR below had a fresh-context `/code-review high` before it opened (§7.4 step 2), green CI on
its final head, and an `owner-approved` label applied under #730 with a comment citing the issue
and the head SHA.

- [#731](https://github.com/steven-crosby/ritmofit-web/pull/731) (RF-196, squash `827ae64`): phone
  text fields stay 16px when the phone is turned sideways: the RF-189 rule also matches a touch
  screen under 640px tall and under 960px wide. The e2e zoom check shares the query and re-checks
  sign-up rotated.
- [#732](https://github.com/steven-crosby/ritmofit-web/pull/732) (RF-197, squash `a8f2512`):
  test-only. The feared restart of a ▶ preview tapped before the player chunk loads does not happen
  today (the lazy player and the preload share one module load); a new test pins one start.
- [#733](https://github.com/steven-crosby/ritmofit-web/pull/733) (RF-173, squash `aae4f2d`): the
  Music service chips' visible text is now inside their aria-label for axe (a space text node
  between name and state); the 'Music songs' KNOWN_AXE entry is gone.
- [#734](https://github.com/steven-crosby/ritmofit-web/pull/734) (RF-163 items 1–2, squash
  `92a04cb`): a Live queue card's readiness Retry keeps the queue's order and its one copper action
  (a leading card shows a busy copper "Checking…"). Item 1 (one copper action on the Classes
  library-error state) was already met; a test pins it.
- [#735](https://github.com/steven-crosby/ritmofit-web/pull/735) (RF-152 items 1–5 and 7, squash
  `12475d5`): Songs search autoload keeps to 10 page requests a minute shared by all services and
  across leaving Music; whitespace edits start no Apple search; only requests that go out count;
  Keep loading keeps a running round's budget; another account's songs and Apple matches never
  show; a cleared Apple search forgets its result. Four review passes; follow-ups in RF-202.

## Tasks

- [RF-196](../tasks/RF-196.json), [RF-197](../tasks/RF-197.json), [RF-173](../tasks/RF-173.json),
  [RF-163](../tasks/RF-163.json), [RF-152](../tasks/RF-152.json): tonight's queue.
- Follow-ups created tonight (reserved IDs RF-196 to RF-203; RF-203 was not used):
  [RF-198](../tasks/RF-198.json) (RF-196), [RF-199](../tasks/RF-199.json) (RF-197),
  [RF-200](../tasks/RF-200.json) (RF-173), [RF-201](../tasks/RF-201.json) (RF-163),
  [RF-202](../tasks/RF-202.json) (RF-152).

## In flight

- This handoff PR, then the §7.8 close-out by tonight's conductor: a close-out comment on #730 and
  closing it. Only tonight's conductor may merge this PR under #730, and only inside its window
  (2026-11-05 02:25–06:25 MST). If the night ends with this PR open and an `owner-approved` label
  that cites #730 on it, that label is not the owner's approval: the next session removes it with a
  comment (§7.1, §7.4 step 8) and the PR waits for the owner's own approval. If the session ends
  before the close-out, the owner closes #730; a later session only reports that it is still open.
- Worktrees `wt-rf152` and `wt-handoff` beside this checkout on the Neo are removed after the
  close-out.

## Restart context

- The owner decisions and the device check owed are in the RF records' blockers and next actions:
  RF-163 (item 3), RF-152 (item 6) and RF-196 (landscape iPhone check, with RF-189's).
- Nothing tonight was deployed. Deploys run only from the Air when the owner asks.

## Verification

- Run: each PR's local gates before opening (format, lint, web typecheck, `pnpm tasks:check`, the
  touched vitest files; `pnpm e2e` for #731 and #733), with fail-first runs recorded in each PR body
  and RF record. CI (`format · typecheck · lint · test · build · audit`) green on every final head.
- Skipped: a local full `pnpm test` and `pnpm --filter @ritmofit/api test:integration` per PR (no
  API change tonight; CI ran both). No real-device or real-provider checks: the landscape iPhone
  check is in RF-196's next action, the live rate-limit check is in #735's body.

## Production as observed

- `main` vs production: main ahead. Not checked from this environment. On main,
  `DEVELOPMENT_PLAN.md` and `HISTORY.md` still record production as `af800c8`; the Air's later deploy of `bd2b8fa`
  (Worker `229cf040`) is recorded in the still-open #729. Either way #726, #727 and tonight's PRs
  are not deployed.

## Shared zones touched

- `apps/web/src/components/Dashboard.tsx` (#733, #734, #735), `apps/web/src/index.css` (#731),
  `e2e/smoke.spec.ts` (#731, #733).

## Notes for other lanes / iOS

- The iOS half of the night ran under steven-crosby/ritmofit-ios#97 (closed): #98 (RF-1022)
  and #99 (handoff) merged.
