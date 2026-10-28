# Challenge review — ritmofit-web @ 4c344e2

Three independent challenger agents ran after the lanes. Each had its own disposable worktree at
`4c344e2`, re-ran the lane repros, and was told to disprove findings, not confirm them. Their full
write-ups are `lanes/challenge-1.md` (playback and web), `lanes/challenge-2.md` (API and tooling) and
`lanes/challenge-3.md` (Q-01). The lead also independently checked CM-02 in real Chromium, and
confirmed by reading code CM-01, B-01, and T-01's bash semantics.

## Outcomes

| Lane ID | Filed | Verdict | Final | Why |
| --- | --- | --- | --- | --- |
| CM-01 → AUD-001 | P2 | Upheld-qualified | P2 | Reachable from the timeline, which has no disabled state while preparing. Impact is worse than filed: the error also stops the teaching clock. The owner already saw the Apple string on an iPhone. The fix must bound its wait. |
| CM-02 → AUD-002 | P2 | Upheld-qualified | P2 (P3 for playback) | Only diagnostic, but it invalidates RF-29's next action. New fix risk: a real request awaited before `play()` may use up iOS user activation. |
| CM-03 → AUD-010 | P3 | Upheld-qualified | P3 | Transient effect. Provider rotation semantics unverified. |
| B-01 → AUD-005 | P2 | Downgraded | P3 | Reachable (Back stays enabled), plus a second ordering found. But A's titles are visible, and the result is a new deletable class with no existing data touched. |
| B-01b → AUD-008 | P3 | Upheld | P3 | — |
| B-02 → AUD-007 | P3 | Upheld-qualified | P3 | A second copy needs the menu reopened, not a double-click. |
| B-03 → AUD-006 | P2 | Downgraded and split | P3 (P2 when Spotify resumes) | Reload, discard and Back are a product call, so they merge into B-7. The recovery-panel redirect contradicts D24. Spotify is the only redirecting provider there, and it is parked. |
| B-04 → AUD-009 | P3 | Upheld | P3 | Few real cases today. |
| A-01 → AUD-016 | P3 | Upheld-qualified | low | The SPA cannot reach it. The lane's proposed global `SyntaxError` mapping would mis-tag server `JSON.parse` failures. |
| A-02 → AUD-011 | P3 | Upheld | P3 | Merged with Q-03. Fix by tagging output parses, not by reclassifying all ZodErrors. |
| A-03 → AUD-017 | P3 | Merged into A-11/D-8 | low | Accurate, but nothing consumes those entries. |
| A-04 → AUD-015 | P3 | Upheld-qualified | low | Better Auth accepts any `image`, but the SPA cannot send one, and Explore is not mounted. |
| A-05 / Q-02 → AUD-012 | P3 | Merged into D-1 | P3 | Confirmed that `authz.ts:288` is absent from D-1, A-9 and RF-91 acceptance. |
| A-06 → AUD-013 | P3 | Upheld-qualified | P3 | Not recorded as accepted. The lane's option 1 would not close the oracle, so this needs a product call. |
| A-07 → AUD-014 | P3 | Upheld-qualified | P3 | No SPA caller. `sequencing.ts:9` shows the gap is an oversight. |
| T-01 → AUD-004 | P3 | Upheld | P3 | All 3 mutants re-ran green. `|| exit 1` fixes it. No other check catches a `sha~1` deploy. |
| T-02 → AUD-018 | P3 | Merged into RF-101 | low | Only 4 of 12 paths exist. AGENTS.md calls the gate a guardrail. |
| T-03 → AUD-019 | P3 | Downgraded | informational | Needs deliberate odd casing. drizzle-kit writes to `migrations/`. |
| T-04 → AUD-020 | P3 | Downgraded | low | The default deploy path already had full CI. Fix the runbook sentence. |
| Q-01 → AUD-003 | P3 | Upheld-qualified | P3 | Params really are in `.message` and `.stack`. better-call's `SERVER_ERROR` log is a second sink the lane missed. Reset tokens probably already reach logs via request URLs, so the extra exposure is mostly PII. |
| Q-03 | P3 | Merged into AUD-011 | — | Same mechanism as A-02. |

## Rejected and not-filed leads (do not re-file)

Lane files hold the details. The main ones:

- **Authz:** all 83 mounted handlers are gated, including every body-supplied foreign id (reorder,
  import, copy, plan-block assignment, user moves, tracks, shares, teams). No cross-class leak.
- **Schema and contract:** `drizzle-kit generate` shows no schema/migration drift, and cascade
  rules match `schema.md`. iOS DTO nullability matches the server.
- **better-auth 1.7.14:** implicit linking still needs a verified email, and foreign reset
  redirects still return 403.
- **Playback math and provider plumbing:** clip-window and ms/s math, stale callbacks after an
  adapter switch, liveness (record-only), OAuth state and PKCE, AES-GCM token encryption, Apple
  JWT, playlist-URL encoding, and the BPM source are all sound. The music constraints hold.
- **Web plumbing:** effects, timers and listeners all clean up. The PWA `/api/` denylist is
  present. `lazyWithReload` cannot loop at startup. Session loss keeps Live mounted.
- **CI tooling:**
  - ci.yml shell pipelines, `@tsv` escaping, renames and deletes are all handled.
  - rf-trace behaves as the policy defines on 8 crafted cases.
  - tasks.mjs rejects cycles and other invalid graphs.
  - There is no drift between the AGENTS.md gate list and ci.yml.
- **deploy.sh with an unresolvable sha:** it fails closed, but only by accident, because
  `resolve_deploy_sha` returns 0 with an empty sha. A one-line hardening, not a finding.
- **Tests and tooling hygiene:**
  - No test file sits outside a vitest config.
  - There are no skipped, only, or vacuous tests, and no floating promises.
  - No phantom or unused dependencies.
  - The bundle checker measures the right entry.
- **Scheduled handler:** a failure in prune does not abort purge, or the reverse, though no test
  calls `scheduled`.

## Limits of the challenge

- Challengers are the same model family as the lanes. They had independent context and reran
  everything, but this is not a human review.
- No challenger ran WebKit, a real provider, a real device, or production.
- Nobody re-ran the prior audit's A-7 wrangler replay or its purge scale run.
