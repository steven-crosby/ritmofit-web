# Known issues — do not re-report as novel

Source: docs/audits/codex-code-audit-2026-10-27-4e0b150/findings.md (audited 4e0b150) and open RF tasks. Only report one of these with a materially new trigger, higher impact, or wrong recorded status, and cite its ID.

## Ranked accepted findings

| Rank | ID | Sev | Status | One line |
| --- | --- | --- | --- | --- |
| 1 | B-3 | P1 | Confirmed | A text-only cue, move, or section edit rewrites the time. At 128 BPM a cue moves one beat early. |
| 2 | B-1 | P1 | Confirmed | After a free-placement timeline drag, saving notes writes the old start time back. |
| 3 | B-2 | P1 | Confirmed | After a marker drag, a text-only cue edit writes the old anchor back. Moves use the same shape. |
| 4 | C-1 | P1 | Confirmed | Spotify is treated as disconnected when the ~1 h access token expires. The server would refresh it. Live never asks. |
| 5 | D-1 | P1 | Confirmed | One SQL statement cannot bind more than 100 values. Disconnect purge never finishes past ~97 tracks. A class with 101 tracks cannot enter Live. A custom-move rename returns 500 after the name is saved. |
| 6 | A-7 | P1 | Confirmed, latent | Drizzle table-rebuild migrations cascade-delete child rows on D1. The shipped migrations are already applied. The next parent rebuild would do it again. |
| 7 | C-21 | P2 | Confirmed, not independently challenged | Same-song matching collapses different recordings, and resolve attaches the first hit. |
| 8 | C-22 | P2 | Confirmed, not independently challenged | A match accepted at a 4 s duration gap fails Live at the 1 s endpoint check. |
| 9 | C-24 | P2 | Confirmed, not independently challenged | Retrying a URL import after a lost response duplicates the playlist. |
| 10 | C-25 | P2 | Confirmed, not independently challenged | A failed library resolve is dropped and the import reports success. |
| 11 | A-8 | P2 | Confirmed | Sessions created before a password reset still work afterwards. |
| 12 | B-4 | P2 | Confirmed | Unsaved inspector text is discarded on Back, top nav, and Run live, with no leave prompt. |
| 13 | C-2 | P2 | Confirmed, narrower trigger | Once a refresh is attempted, a 5xx, 429, or network error is reported as "reconnect". |
| 14 | B-5 | P2 | Confirmed for the builder | A 401 signs the builder out and drops the open class. Live is kept mounted on purpose. |
| 15 | D-4 | P2 | Confirmed counts | Classes home and Live each refetch a full run payload per class on every visit. Latency was not measured. |
| 16 | C-3 | P2 | Probable | A Spotify state whose track URI differs from the requested one fails the class. A live relink was not observed. |
| 17 | C-7 | P2 | Probable | Explicit sign-out and Disconnect leave the Spotify and Apple sessions authorized in the browser. |


## P3 (compact)

| ID | Status | Finding | Challenge |
| --- | --- | --- | --- |
| A-1 | Confirmed | An edit-share collaborator can publish the owner's class. The share UI is not mounted. | Not challenged. Same dormant surface as A-2. |
| A-2 | Confirmed | Any beta session can share a class to a verified email. The class appears in that person's Library and they cannot remove it. The share and team dialogs are not mounted in the SPA. | Downgraded from P2. The API is live for a hand-written request. |
| A-3 | Confirmed | Share or team-add by email reveals whether the address is unknown, unverified, or verified. | Not challenged. |
| A-4 | Confirmed | A team admin can add members with the owner role. | Not challenged. Teams UI is not mounted. |
| A-5 | Confirmed | Each request repeats the session lookup once per router mounted earlier. Explore does 11. An unknown authed path does 12. Anonymous does 0. No wrong authorization. | Downgraded from P2. |
| A-6 | Confirmed | An edit collaborator cannot move a placement that uses the owner's custom move (422). | Not challenged. |
| A-10 | Probable | Some read-then-write paths return 500 instead of 409 or 404 under concurrency. Not reproduced. | Not challenged. |
| A-11 / D-8 | Confirmed | `GET /auth/capabilities` is mounted and absent from OpenAPI. Regeneration diffs the hand-written registry, so an unregistered route stays green. | Merged. |
| B-6 | Confirmed | Tag-filter replies can land out of order and show the wrong filter selected. | Not challenged. |
| B-7 | Confirmed, product call | End Class leaves Live in one tap. Re-entry starts at 0:00. | Not challenged. Owner decision, not a defect until the owner wants a confirm. |
| B-8 | Confirmed | Live countdowns use `Math.round`, so they show 0:00 for about half a second before the event. | Not challenged. |
| C-3b | Confirmed logic | One transient null Spotify state fails the class within 250 ms. Apple gets a 10 s grace. | Re-ran. Stays P3. |
| C-4 | Probable | The Spotify device id is cached for the page. `not_ready` does not rebuild it. A real id change after a network drop was not shown. | Downgraded from P2. |
| C-9 | Confirmed | A `Retry-After` that would pass the preview deadline is shown as "took too long". | Upheld. |
| C-15 | Probable | SoundCloud playlist import does not filter `access=playable`. Search and likes do. | Not re-executed. |
| C-23 | Confirmed | Resolve and manual attach store a SoundCloud URN beside an existing numeric id, as two tracks. | Not independently challenged. |
| C-26 | Confirmed | Two concurrent first imports of one new provider track: one caller gets 409. A later call is idempotent. Ordered import then hides it via C-25. | Not independently challenged. |
| D-5 | Confirmed | zod is about 26 kB gzip of the startup entry and the web app does not parse with it. The entry is 172.40 kB gzip of a 180 kB budget. | Downgraded from P2. |
| D-6 | Confirmed | `apps/api` typecheck includes `src` only. Typechecking `apps/api/test` reports 61 errors. | Upheld. |
| D-7 | Confirmed | A Dashboard test passes while Live throws, because the fixture omits `sections` and the error boundary catches it. Production payloads include `sections`. | Upheld. |
| D-9 | Confirmed | No React hooks lint rule. | Not challenged. Tooling. |
| D-10 | Confirmed | The Playwright smoke is not in CI or the gate. It passed 2/2 when run separately, on a no-music Live path. | Not challenged. |
| D-11 | Confirmed | CI still ignores GHSA-gv7w, which GitHub withdrew on 2026-06-17. | Not challenged. |

Lane files hold the long form for each P3.

## Probable findings kept out of the confirmed list

C-3 and C-7 are in the ranked table because the code path is real and the unverified condition is a specific SDK behavior. C-4 and C-15 are in the P3 table for the same reason. A-10 was not reproduced.

## Hypotheses not promoted

From Lane C, still open: C-10 (Spotify `getOAuthToken` failure swallowed), C-11 (`expiresAt: null` after refresh never refreshes again), C-12 (SoundCloud follows `next_href` with the user bearer and does not retry), C-13 (Apple 401/403 always becomes user reconnect; Apple's error-code page could not be retrieved), C-14 (Apple library id used as a catalog id), C-16 (concurrent refresh with a rotating refresh token). D-12: the bundle budget does not see `modulepreload` or CSS. Nothing escapes it on this SHA.

## What the challenge changed

| ID | Filed | Verdict |
| --- | --- | --- |
| A-7 | P1 | Qualified. Latent. Not an active incident. |
| B-1, B-2, B-3, C-1, D-1 | P1 | Upheld. B-1 is free placement only. |
| A-9, D-2, D-3 | P2 / P2 / P3 | Merged into D-1. |
| A-2, A-5, C-4, D-5 | P2 | Downgraded to P3. |
| A-8, B-4 | P2 | Upheld. |
| B-5, C-2, C-3, C-7, D-4 | P2 | Qualified, kept. |
| A-11 / D-8 | P3 | Merged. |

The challenge re-ran the API repro, the builder repros, and the provider repro in `/tmp/wt-x`. It did not repeat the A-7 wrangler replay or the purge scale run. It did not open a browser. Details are in `challenge.md`.

## Rejected leads

Recorded so they are not re-filed. Full writeups are in the lane appendices.

- Class-scoped handlers are gated. A missing `requireAccess` was not found on the routes Lane A traced.
- Account linking does not pre-hijack a verified email under the installed Better Auth defaults.
- Password-reset return target does not open-redirect (403).
- No exploitable OAuth callback swap. SoundCloud's callback suite (8 tests) still requires the encrypted state cookie. Refresh persistence keeps a rotated refresh token and does not wipe it when the provider omits a new one.
- SoundCloud ignoring a seek before play. The owner confirmed resume-from-pause by ear on 2026-10-13, and resume uses that path.
- Spotify episodes imported as tracks. They fail the shared schema and are dropped.
- SoundCloud numeric id versus URN on the import path. Fixed earlier. C-23 is the attach path, which still bypasses that fix.
- Apple playback errors are filtered to the active adapter.
- Music constraints hold on the paths reviewed. No Spotify BPM or audio-analysis call. Nothing caches provider audio or provider-derived analysis.
- The service worker does not use the offline shell for `/api/`, and the prompted-update path is present.
- Out-of-order class-detail loads, reorder rollback, and duplicate class creation are guarded.
- The no-music Live clock is wall-clock based.
- Hot queries that were explained use an index (`evidence/d-query-plans.txt`).
- Ignored esbuild advisories are in the production audit graph and do not ship in the Worker or the browser bundle.


## Open RF tasks (non-done)
27:| [RF-29](tasks/RF-29.json) iPhone Apple Music plays sound in Safari | P1 / verification | — | Latest recorded iPhone Safari attempt failed; waiting for a fresh owner device check of the loaded bundle. Next: Leave L
28:| [RF-92](tasks/RF-92.json) Triage Spotify expiry finding C-1 and retry classification C-2 | P1 / plan | — | Spotify work remains tabled by the owner. Next: Ask Steven to reopen Spotify work when prioritizing this f
29:| [RF-80](tasks/RF-80.json) Define device playback verification before Start | untriaged / plan | — | Full plan and root-cause document exist only in the prior tool project store; contents are not available in git. 
35:| [RF-90](tasks/RF-90.json) Triage Builder timing and lost-update findings B-3, B-2, B-1 | P1 / plan | — | Review audit packet 1 and seek owner implementation approval. | recorded |
36:| [RF-91](tasks/RF-91.json) Triage D1 parameter-limit finding D-1 | P1 / plan | — | Review packet 2 and seek approval; do not query production or modify data. | recorded |
37:| [RF-93](tasks/RF-93.json) Triage latent migration rebuild finding A-7 | P1 / plan | — | Review packet 4 and seek approval for a local guard. No historical or production data-loss claim. | recorded |
38:| [RF-94](tasks/RF-94.json) Disposition the remaining engineering audit findings | P2 / plan | — | Review the remaining ranked findings with Steven before scheduling implementation. | recorded |
39:| [RF-96](tasks/RF-96.json) Disposition legacy planning and handoff obligations | P2 / plan | — | Triage legacy planning and handoffs without treating their old approval or merge instructions as current authority. |
40:| [RF-16](tasks/RF-16.json) Editorial Spotify playlist 404 still shares the outage envelope | untriaged / investigation | — | Reconfirm the 404/error mapping against current code; Spotify implementation remains tabl
41:| [RF-23](tasks/RF-23.json) Health check touches D1 and an authed smoke uses a gitignored token | untriaged / verification | — | Reconcile the merged implementation with its outstanding review/verification; current 
42:| [RF-32](tasks/RF-32.json) Reconcile Classes redesign B → A → C against shipped work | untriaged / plan | — | Reconcile #598 (B), #601 (A), and #607 (builder navigation) against the plan, especially remaining C
54:| [RF-87](tasks/RF-87.json) Verify open-tab update recovery across a deployment | P2 / verification | needs RF-11 | Arrange an attended check during a separately authorized deployment; do not deploy just to close this
55:| [RF-100](tasks/RF-100.json) Label changes rerun only the PR gates, not the full CI job | P3 / task | needs RF-98 | Owner decides whether this is worth doing; then design a gate-only path (separate job or workflow on
56:| [RF-101](tasks/RF-101.json) Owner-gate route authz call sites and CI-config files | P3 / task | needs RF-98 | Owner decides whether to gate route and CI-config files, given every merge already needs per-PR permissio
57:| [RF-102](tasks/RF-102.json) Owner approval binds only to a commit the owner actually saw | P3 / task | needs RF-98 | Owner decides whether to harden further (for example, bind to the reviewed SHA named in the approv
58:| [RF-103](tasks/RF-103.json) Task claims stay visible from claim to merge | P3 / task | needs RF-98 | Design a claim signal that survives the draft-to-ready transition (for example, any open PR whose head changes the
59:| [RF-104](tasks/RF-104.json) Parallel delegated agents run the e2e smoke without port collisions | P3 / task | needs RF-98 | Document E2E_PORT per worktree in delegate-task.md, or serialize local e2e runs for paralle
60:| [RF-105](tasks/RF-105.json) CI gate steps stay robust and fast under failures and reopen | P3 / task | needs RF-98 | Pick the cheapest fixes first (reopen handling, clear message when gate inputs are missing), then 
61:| [RF-73](tasks/RF-73.json) Classes buttons fail WCAG 2.5.3 label in name | untriaged / task | — | Reproduce affected controls, propose the smallest label-in-name correction, then seek implementation approval. | rec
62:| [RF-74](tasks/RF-74.json) Spotify playlist dialog offers Try again where retry cannot help | untriaged / task | — | Review the error/action mapping; obtain approval before changing Spotify behavior while that work
68:| [RF-98](tasks/RF-98.json) Delegated PRs merge on a thorough required CI gate with owner-gated exceptions | P1 / task | needs RF-97 | Standing delegation grant (revised by the owner on 2026-10-27 to ask before each f
69:| [RF-99](tasks/RF-99.json) Session prompts, handoffs and the RF board agree for delegated CI/CD | P1 / documentation | needs RF-97 | Ready is the owner's queue, draft PRs claim tasks, the final state lands in the wor
70:| [RF-88](tasks/RF-88.json) Review deploy guard regression coverage PR #596 | P2 / task | — | Reviewed against current main on 2026-10-27: the self-check assertions are meaningful (ran under macOS bash 3.2; no temp 
71:| [RF-89](tasks/RF-89.json) Review core workflow regression coverage PR #625 | P2 / task | — | Reviewed against current main on 2026-10-27: web 171, Spotify 49 and D1 integration 4 tests passed on the merged tree. S
72:| [RF-95](tasks/RF-95.json) Implement the repository-owned RF task system | P2 / task | — | Repository-owned task tooling and migration completed; all acceptance checks passed locally. PR #640 publishes this result 
73:| [RF-97](tasks/RF-97.json) Align session prompts with the canonical RF task lifecycle | P2 / task | follow-ups RF-98 | Codex's six corrections were reviewed and carried into the RF-98 branch from main on 2026-10-27 w
84:| [RF-11](tasks/RF-11.json) Keep the update toast available after an app crash | untriaged / task | follow-ups RF-87 | Implementation merged. Open-tab deployment verification was explicitly still owed; tracked separat
93:| [RF-22](tasks/RF-22.json) Refuse dirty-tree deployment even when a SHA is supplied | untriaged / task | follow-ups RF-88 | Implementation merged in #592. Additional deploy guard regression tests remain open in #596 
94:| [RF-24](tasks/RF-24.json) Clean ignore-list and documentation references | untriaged / documentation | — | Repository cleanup merged in #594; GitHub merge state checked during migration. | recorded; checked 2026-1
110:| [RF-43](tasks/RF-43.json) Record the playback, Spotify status, and reconnect implementation batch | untriaged / task | follow-ups RF-29 | Historical implementation batch recorded complete. iPhone audible acceptance
