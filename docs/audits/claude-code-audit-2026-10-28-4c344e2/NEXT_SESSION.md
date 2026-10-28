# Next session — restart point

- **Audited SHA:** `4c344e2d895cde1af4f9deefe638c0374c24a750` (`main`). The package is on branch
  `audit/2026-10-28-4c344e2` in a docs-only draft PR. Status: COMPLETE (see `README.md` for limits).
- **To re-run the gate:** `git worktree add --detach <dir> 4c344e2 && cd <dir> && pnpm install
  --frozen-lockfile`, then run the list in `verification.md`. In a container without
  `cdn.playwright.dev`, apply `evidence/gate/e2e-env-patch.diff` inside the disposable worktree
  only.
- **To re-run a repro:** see the table in `verification.md`. Copy the file into the stated
  package directory of a disposable worktree. Never edit the main checkout.

## Unfinished investigations

| Item | Why open | How to continue |
| --- | --- | --- |
| AUD-002 on real WebKit / iPhone | No WebKit in the container | In Safari Web Inspector on an iPhone, run `const r = navigator.requestMediaKeySystemAccess; r('com.apple.fps', [{}]).catch(e => console.log(e.name))`. Expect `TypeError`. |
| AUD-002 fix risk: iOS user activation | Device-only | After the Packet 1 fix, check that the first Apple play still starts from one tap. |
| AUD-001 real start latency vs the 200 ms seek cadence | Device-only | Scrub an Apple track in Live on iPhone. Before the fix, expect "still finishing a previous queue request". |
| AUD-010 SoundCloud refresh-token reuse | No provider access | Check SoundCloud's OAuth docs or a test account. If reuse is allowed, downgrade or close. |
| AUD-014 downstream Live behaviour | Not exercised | Load an overlapping free-mode payload into Live (jsdom) and observe the prompter and the coordinator selection. |
| iOS session-cookie refresh via `/api/v1` | Hypothesis (lane A) | Read Better Auth's session `updateAge` handling for non-`/api/auth` routes. |
| Production alignment, Workers Logs contents | Not authorized | Owner-only: check whether reset URLs appear in request logs (AUD-003 qualification). |

## Decisions needed from Steven

See `remediation-plan.md` › "Decisions needed". The most time-sensitive: **AUD-002 vs RF-29.** The
pending iPhone check cannot show `modern-access:` until the probe is fixed, so decide on Packet 1
before spending another device session.

## Explicitly unauthorized in this audit (still needs separate permission)

- Product fixes.
- RF record, handoff or board edits. RF-29, RF-88 and RF-91 text corrections are proposed only.
- Marking the PR ready, merging it, labels, review requests.
- Deploys, remote D1, secrets, production data, branch deletion.
