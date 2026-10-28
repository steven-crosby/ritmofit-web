# Remediation plan — ritmofit-web @ 4c344e2

These are proposals only. No RF records were created, and nothing here grants implementation,
merge or deploy authority. Each packet is shaped so it can become one Backlog RF record plus a
`agent-prompts/delegate-task.md` brief. The packets are ordered by value against effort.

## Straightforward fixes

### Packet 1 — FairPlay probe actually runs, so the RF-29 check yields real evidence

- **Proposed RF title:** "The iPhone FairPlay probe records `modern-access:` on a playback error".
- **Covers:** AUD-002. **Priority:** P2. It unblocks a meaningful RF-29 (P1) device check.
  **Effort:** small. **Risk:** low to medium (iOS user-activation timing).
- **Product decision needed first:** RF-29 says not to add another probe. Steven must OK fixing
  this one.
- **Change direction:**
  - Call `navigator.requestMediaKeySystemAccess(...)` as a bound method.
  - Give it a short timeout, for example 2 s, that resolves `null` with a distinct word such as
    `timeout`.
  - Run it after `instance.play()` has been called, or without awaiting it before `play()`, so it
    cannot use up the user gesture.
  - Make the test double throw `TypeError` on a wrong receiver.
- **Acceptance:**
  - (a) A unit test with a receiver-checked stub resolves `'ok'` after one call.
  - (b) The stub rejecting an unbound call makes the old code fail, as a regression lock.
  - (c) A never-settling stub resolves `timeout` without delaying `play()`.
  - (d) The owner's iPhone check shows `modern-access: <word>`.
- **Owner-gated:** yes (Apple playback). **Device check:** yes (RF-29).
- **Also update:** RF-29's next action. A missing `modern-access:` word is explained by the bug,
  not only by a stale bundle.

### Packet 2 — A Live seek or resume during an in-flight start waits, then plays

- **Proposed RF title:** "Scrubbing or pausing Live during a track start keeps music playing".
- **Covers:** AUD-001. **Priority:** P2. **Effort:** medium. **Risk:** medium, because it touches
  the runtime concurrency model.
- **Change direction:**
  - Expose a settle promise for each singleton adapter's lease, such as `whenIdle()`.
  - Have `runtime.enterTrack` await it, bounded to about 3 s, then re-check the epoch before
    `prepare`.
  - Fail with a clear timeout message only after the bound.
- **Acceptance:**
  - Lane repro CM-01 (Spotify seek, Apple pause→resume) ends `playing`/`buffering` at the new
    position.
  - A never-settling old call ends in a bounded error.
  - Existing runtime supersession tests still pass.
  - Add one runtime test that uses a real adapter with a lease.
- **Owner-gated:** yes. **Device check:** yes. Scrub, pause and resume audibly on iPhone Safari
  (Apple) and desktop Chrome.

### Packet 3 — Database errors never put bound values in logs

- **Proposed RF title:** "Worker logs carry no query parameters, tokens or emails on D1 failure".
- **Covers:** AUD-003. **Priority:** P3 (security hygiene, AGENTS.md "never log tokens").
  **Effort:** small to medium. **Risk:** low.
- **Change direction:**
  - Add a `safeErrorSummary(err)` helper. For an error with `query`/`params`, it returns `name` plus
    `cause.message`.
  - Use it in `app.onError` and `describeOAuthConnectFailure`.
  - Set Better Auth `onAPIError: { throw: true }` so Hono's sanitized handler owns logging. This
    also covers better-call's `# SERVER_ERROR` line.
  - Optional: `verification.storeIdentifier: 'hashed'`. It invalidates links already sent, so
    deploy it with a note.
- **Acceptance:**
  - Repro `d2-quality-q01-reset-token-log` reports `tokenInLog=false` (message and stack), and the
    status is still 5xx.
  - The unit repro shows no ciphertext sentinel in the logged string.
  - Existing auth integration tests stay green.
- **Owner-gated:** yes (`index.ts`, `lib/auth.ts`, provider routes). **Device check:** no.

### Packet 4 — The deploy self-check can fail

- **Proposed RF title:** "`deploy.sh --self-check` fails when its git-guard or worktree
  assertions break".
- **Covers:** AUD-004, and AUD-020's runbook sentence. **Priority:** P3. **Effort:** small.
  **Risk:** low.
- **Change direction:**
  - Add `|| exit 1` to each bare assertion in `deploy.sh:602-649`, or move the block into a
    function with checked returns.
  - Keep the `sha~1` mutant as a negative test in `deploy-script.test.ts`.
  - Correct `deployment-runbook.md:119` ("same list").
- **Acceptance:** the three mutants from `repro/d1-tooling-deploy-selfcheck-mutation.sh` fail both
  the self-check and the vitest wrapper. The unmutated script passes. Also correct RF-88's
  resolution text.
- **Owner-gated:** yes (`scripts/deploy*`). **Device check:** no.

### Packet 5 — Music and Classes async actions are race-safe and visible

- **Proposed RF title:** "Opening, closing and duplicating in Music and Classes never acts on a
  stale or hidden request".
- **Covers:** AUD-005, AUD-007, AUD-008, and AUD-009's missing return record. **Priority:** P3.
  **Effort:** small to medium. **Risk:** low.
- **Change direction:**
  - Add a request-id guard in `openPlaylist`, and clear the songs on Back.
  - Route Duplicate through `useAsyncAction`, which gives pending state and an error message.
  - Either disable Close during "Creating…" or skip navigation once the dialog has unmounted (a
    product micro-call; recommend skipping navigation and showing a toast).
  - Have `TrackPreview` Reconnect write a `destination:'builder'` return record and catch
    failures.
- **Acceptance:**
  - Both lane-B repros pass.
  - A new test covers the preview return record.
  - No change to the e2e smoke.
- **Owner-gated:** no (verified with `scripts/owner-gate.mjs`). **Device check:** no.

### Packet 6 — Server-side contract failures are 500 and logged; unpaginated list survives >100

- **Proposed RF title:** "A stored row that fails the response schema returns a logged 500, not a
  silent 422".
- **Covers:** AUD-011, AUD-015 (tolerant output), and AUD-012. AUD-012 can instead go into RF-91's
  acceptance. **Priority:** P3. **Effort:** small to medium. **Risk:** low to medium, because
  output tolerance must not hide real drift.
- **Change direction:**
  - Wrap response re-validation so its ZodError becomes a tagged `ResponseValidationError`, which
    maps to 500 and is logged through the Packet 3 sanitizer.
  - Bound `durationMs` in the shared schema. That is a shared-contract change: check OpenAPI and
    iOS parity.
  - Chunk the `authz.ts:273-291` lookup.
- **Acceptance:**
  - Repro A-02 or Q-03 returns 500 with one sanitized log line.
  - Real input-validation 422s are unchanged (existing tests).
  - The Q-02 repro returns 200 at 101 classes.
- **Owner-gated:** yes (`index.ts`, `authz.ts`). **Device check:** no. **iOS:** the legacy list is
  fixed, and the `durationMs` bound is a contract change.

### Packet 7 — Free-mode overlap is enforced on every write path

- **Proposed RF title:** "No API write can create overlapping free-mode tracks".
- **Covers:** AUD-014. **Priority:** P3. **Effort:** small. **Owner-gated:** no.
- **Acceptance:** repro A-07 returns 422 from `PATCH /tracks/:id`, and existing track-edit tests
  stay green.

### Packet 8 — Token refresh is single-flight per connection

- **Proposed RF title:** "Parallel library loads never show Reconnect for a healthy provider".
- **Covers:** AUD-010. **Priority:** P3. **Effort:** small to medium. **Owner-gated:** yes.
- **Do first:** verify SoundCloud refresh-token reuse semantics. If refresh tokens are reusable,
  park this packet.
- **Change direction:** a conditional update keyed on the old refresh token. On losing the race,
  re-read the row and use the winner's access token.
- **Acceptance:** the CM-03 repro yields two successes and one provider refresh.

## Decisions needed from Steven (not straightforward fixes)

| Decision | Findings | Recommended option |
| --- | --- | --- |
| Allow fixing the FairPlay probe despite RF-29's "no more probes" | AUD-002 | Yes. It is a bug in the existing probe, not a new one. Packet 1. |
| Should Live keep its position across reconnect, reload and discard? | AUD-006, B-7 | Do a minimal version first: carry `elapsedMs` in the connection-return record (D24). Decide the reload/discard checkpoint separately with B-7. Packet when Spotify reopens (RF-92). |
| Make sign-up give one generic response for "exists" and "not invited"? | AUD-013 | Low priority. Accept and document for the beta, and revisit before an open launch. |
| Prune inert audit ignores and refresh the comment | AUD-021, D-11 | Yes, with the D-11 cleanup. |
| Gate the 4 missing real paths | AUD-018 | Add them to RF-101's list for its decision. |

## Suggested order

Packet 1 first: it is small, and it makes the open P1 device check meaningful. Then Packet 2
(core Live gesture), then Packets 3 and 4 (small hygiene fixes on gated paths, which can share one
owner-gated PR window if Steven prefers), then Packets 5, 6, 7 and 8. The prior audit's packets
(RF-90..RF-94) are unaffected. AUD-012 can ride RF-91.
