# Findings — ritmofit-web @ 4c344e2

Audited SHA `4c344e2d895cde1af4f9deefe638c0374c24a750` (`main` = `origin/main`, 2026-10-28T05:29Z).
These are the results after the independent challenge (`challenge-review.md`). Each record below
gives the decision-relevant facts. The full trace for each finding is in the lane file named under
**Long form**, and repros are in `repro/`.

Severity scale: P0 critical, P1 high, P2 meaningful, P3 low. Challengers proposed some items as
"P4", which this scale does not have. Those items are listed under **Hardening / low** and are not
counted as defects.

**No P0 or P1 survived.** Two P2s and twelve P3s are accepted. Every accepted finding has an
executed repro or a conclusive code-path trace, and every P2 and the important P3s were challenged
independently.

## Ranked table

| Rank | ID | Sev | Status | Known? | One line |
| --- | --- | --- | --- | --- | --- |
| 1 | AUD-001 | P2 | Confirmed (real adapters + real runtime, fake SDKs) | New | In Live, a seek, skip, or pause→resume while an Apple queue/play or a Spotify start is still in flight puts the class in `error` and stops the teaching clock. |
| 2 | AUD-002 | P2 | Confirmed (unbound call throws in real Chromium) | New; affects RF-29 | The #634/#636 FairPlay probe calls `requestMediaKeySystemAccess` unbound, so it never runs. The RF-29 iPhone check therefore cannot collect the evidence it is waiting for. |
| 3 | AUD-003 | P3 | Confirmed (mounted Worker + D1 failure) | New | Any D1 query failure logs the full bound parameters: a live reset token, emails, password hashes and provider-token ciphertext. Logs go to Workers Logs. |
| 4 | AUD-004 | P3 | Confirmed (mutation test) | New; RF-88 resolution is wrong | One block of `deploy.sh --self-check` cannot fail. A mutant that deploys `sha~1` passes both the self-check and the CI wrapper. |
| 5 | AUD-005 | P3 | Confirmed (jsdom repro) | New | Saved-playlist dialog: a late reply for playlist A shows A's songs under B, and "Start class" creates class "B" with A's songs. |
| 6 | AUD-006 | P3 | Confirmed (code trace) | Extends B-7, C-1 | The Live recovery panel's "Reconnect" redirect drops the class position, and Live returns at preflight 0:00. This contradicts D24 "preserve position". Today it is Spotify-only. |
| 7 | AUD-007 | P3 | Confirmed (jsdom repro) | New | Duplicate class fails silently on error, and a second tap makes a second copy. |
| 8 | AUD-008 | P3 | Confirmed (jsdom repro) | New | Closing the playlist or likes dialog during "Creating…" still navigates the instructor into the new class later. |
| 9 | AUD-009 | P3 | Confirmed (code trace) | Extends B-4 | Builder preview "Reconnect" redirects without a return record. The open class and unsaved inspector text are lost, and a failure is an unhandled rejection. |
| 10 | AUD-010 | P3 | Confirmed logic | Promotes C-16 | Parallel likes and playlists loads refresh one token twice inside the 60 s skew window. With a single-use refresh token, one shelf shows "Reconnect" for a healthy grant. |
| 11 | AUD-011 | P3 | Confirmed (integration repro) | New (merges A-02, Q-03) | A server-side ZodError (from response re-validation) is returned as a client 422 "Request body failed validation" and is never logged. |
| 12 | AUD-012 | P3 | Confirmed (integration repro) | Extends D-1 / RF-91 | Unpaginated `GET /classes` (the legacy iOS path) returns 500 above 100 visible classes. The cause is `authz.ts:288`, which RF-91's list omits. |
| 13 | AUD-013 | P3 | Confirmed | New; product call | Unauthenticated sign-up tells a registered email (422) apart from an unknown one (403 beta). |
| 14 | AUD-014 | P3 | Confirmed (integration repro) | New | `PATCH /tracks/:id` can lengthen a track into a free-mode overlap that `PATCH /class-tracks` refuses. No SPA caller. |

Hardening and low-impact items (accepted as accurate, not counted as defects): AUD-015 (dormant
Explore 422 and self-lockout), AUD-016 (malformed JSON → 500), AUD-017 (OpenAPI shape drift, folded
into A-11), AUD-018 (owner-gate path misses, an addendum to RF-101), AUD-019 (case-sensitive gate),
AUD-020 (deploy `run_gates` is smaller than CI), and AUD-021 (D-11 is wider: 4 of 6 audit ignores
are inert).

## Status changes to known items

| Known item | Change at 4c344e2 | Evidence |
| --- | --- | --- |
| D-10 (e2e not in CI) | **Resolved** by #643. ci.yml runs the smoke, and the gate passed 2/2. | `verification.md` |
| RF-88 resolution ("self-check assertions are meaningful") | **Wrong** for one block. See AUD-004. | `evidence/d1-tooling-deploy-selfcheck-mutation.txt` |
| RF-29 next action (reload and look for `modern-access:`) | **Rests on a false premise.** The probe cannot produce that word. See AUD-002. | `evidence/lead-cm02-chromium.txt` |
| RF-91 / D-1 call-site list | **Incomplete.** It is missing `apps/api/src/lib/authz.ts:288`. See AUD-012. | `evidence/d2-quality-q02-run.log` |
| C-16 (hypothesis) | **Promoted** to confirmed logic with an in-app trigger. See AUD-010. | `repro/c-music-refresh-race-repro.test.ts` |
| A-1..A-6, A-8 | **Still reproduce** after the better-auth 1.7.14 upgrade (#637). A-8: `revokeSessionsOnPasswordReset` is still unset. | lane a-api §prior-repro |
| D-5 | Startup entry is 174.08 kB gzip (was 172.40). 5.9 kB headroom. zod is still bundled. | `evidence/gate/13-build.log` |
| D-6 | Typechecking API tests reports 59 errors in 10 files (was 61). | lane d2-quality |
| D-9 | Applying the hooks lint rule now finds 0 rules-of-hooks errors and 12 exhaustive-deps warnings, all deliberate. Adding it would find no current bug. | lane d2-quality |
| D-11 | Wider. vite and vitest are not in the prod graph, so 4 of 6 `ignoreGhsas` match nothing. The ci.yml comment is stale. | lane d2-quality |
| B-8, B-9, B-10, C-25 | Unchanged and still present. | lane b-web §3 |

---

## P2 records

### AUD-001 — Live seek/skip/resume during an in-flight provider start fails the class

- **Category:** playback lifecycle, concurrency. **Severity:** P2. A common instructor gesture
  stops music and the teaching clock with an error banner mid-class. It can be recovered by Retry
  after the old SDK call settles, and no data is lost. **Confidence:** high for the logic. Real
  start latency was not measured on a device. **Status:** Confirmed. Challenge: Upheld-qualified,
  with impact found worse than filed.
- **Where:**
  - Every `seek`/`resume`/skip re-enters and builds a fresh adapter: `apps/web/src/lib/playback/runtime.ts:246-260`.
  - Any `prepare` rejection in the current epoch calls `fail()`: `runtime.ts:437-450`.
  - This contradicts the design comment at `runtime.ts:138-142`, "A pending old SDK call cannot
    block a new epoch".
  - Adapter leases refuse the new prepare: Spotify at `spotify-adapter.ts:170-173` and `:200-228`;
    Apple at `apple-music-adapter.ts:200-203` and `:468-472`.
  - Live commits a drag-seek every 200 ms: `LiveMode.tsx:648-657`.
- **Trigger:** Live, current track on Apple Music (or Spotify). The instructor scrubs the
  timeline, double-skips, or toggles pause→play while the start or queue for the current position
  is still pending. A Spotify start is two serial network calls, and an Apple start is a MusicKit
  `setQueue`.
- **Expected:** the newest intent wins once the superseded call settles. **Observed:**
  `status: error`, with "still finishing a cancelled start request" (Spotify) or "still finishing
  a previous queue request" (Apple). Nothing resumes when the old call settles. The owner has
  already seen the Apple string on an iPhone (challenge-1).
- **Evidence:** `repro/c-music-playback-repro.test.ts` › CM-01 (2 tests, green = defect
  reproduced). Copy the file into `apps/web/src/lib/playback/` and run
  `pnpm --filter @ritmofit/web exec vitest run src/lib/playback/c-music-playback-repro.test.ts`.
  It was re-run independently by challenge-1.
- **Why tests miss it:** the runtime supersession tests use a `FakeAdapter` with no shared lease.
  The adapter tests assert the refusal itself as intended behavior.
- **Counterevidence:** the lease is correct and needed, because it stops stale audio. SoundCloud
  is unaffected. Spotify work is parked (RF-92), so Apple is the half that matters now. A long
  drag can recover on a later commit, but the final release and pause→resume do not.
- **Remediation direction:** treat a held lease as *wait*, not *fail*. Await the superseded
  command's settle promise, with a bound such as ≤ 3 s, then re-check the epoch. The wait must be
  bounded, or a never-settling SDK call becomes a hang instead of an error.
- **Fix check:** both repro cases end in `playing` or `buffering` at the new position with one
  transport owner. A forced never-settling old call ends in a timed-out error, not a hang. Do an
  audible scrub on iPhone Safari and desktop.
- **Contract/iOS:** none. **Owner-gated:** yes (`apps/web/src/lib/playback/**`). **Needs real
  device:** yes, for audible scrub and resume.
- **Long form:** `lanes/c-music.md` CM-01; `lanes/challenge-1.md`.

### AUD-002 — The FairPlay probe never runs, so RF-29's diagnostic cannot appear

- **Category:** correctness of new code (#634/#636) and verification integrity. **Severity:** P2,
  because the open P1 RF-29 decision depends on this evidence. It is P3 for playback, because
  nothing gates playback on the probe. **Confidence:** high. **Status:** Confirmed. Challenge:
  Upheld-qualified.
- **Where:** `apps/web/src/lib/musickit.ts:142-147`. The code assigns
  `const request = navigator.requestMediaKeySystemAccess;` and then calls `await request(...)`.
  `domExceptionName` at `:124-127` maps the resulting `TypeError` to `null`, and the result is
  cached per page at `:162-175`. The banner word is added only when the result is non-null, at
  `apple-music-adapter.ts:150-157`.
- **Trigger:** every iOS Safari, and every `WebKitMediaKeys` engine that takes the probe path.
- **Expected:** one `com.apple.fps` access request, after which the banner reads
  `modern-access: ok` or a DOMException name. **Observed:** a WebIDL receiver check throws
  `TypeError: Illegal invocation` before any request, so the probe yields `null` and the banner
  never carries the word.
- **Evidence:**
  - Real headless Chromium, secure context: the unbound call threw `TypeError … Illegal
    invocation` and the bound call resolved (`evidence/lead-cm02-chromium.txt`, script
    `repro/lead-cm02-unbound-eme-chromium.cjs`).
  - jsdom repro with a receiver-checked stub: `repro/c-music-playback-repro.test.ts` › CM-02.
  - WebKit was not run, because no WebKit is available in the container. Receiver checks are
    required by WebIDL for every engine.
- **Why tests miss it:** `musickit.test.ts:252-300` and `apple-music-adapter.test.ts:470-520` stub
  the method with `vi.fn()`, which ignores `this`.
- **Impact on RF-29:** the owner's iPhone banner had no `modern-access:` word. The handoff
  (`handoffs/2026-10-27-iphone-fairplay.md`) attributed that to a stale cached bundle, and RF-29's
  next action is to reload and retry. AUD-002 alone explains the missing word, so the reload check
  will mislead whatever the bundle state.
- **Remediation direction:** call it as a method, with `navigator.requestMediaKeySystemAccess(...)`
  or `.call(navigator, …)`. Make the test double reject a wrong receiver. Add a short timeout.
  Challenge-1 also flagged a risk: awaiting a real key-system request *before* `play()` may use up
  iOS's user-gesture activation. Run the probe after `play()` or without blocking it. RF-29 says
  not to add another probe, so this needs **Steven's go-ahead**.
- **Fix check:** the repro probe resolves `'ok'` with exactly one call. On a real iPhone, a forced
  error banner shows `modern-access: …`.
- **Owner-gated:** yes (Apple playback code). **Needs real device:** yes, the iPhone Safari check
  under RF-29.
- **Long form:** `lanes/c-music.md` CM-02; `lanes/challenge-1.md`.

## P3 records

### AUD-003 — D1 failures log raw bound parameters (reset token, PII, token ciphertext)

- **Category:** security and observability. **Severity:** P3. Triggering it needs a D1 failure on
  a secret-bearing query, and reading it needs the owner's Cloudflare account. No Logpush or tail
  consumer is configured. It would be P2 if logs ever leave the account. **Confidence:** high.
  **Status:** Confirmed. Challenge: Upheld-qualified.
- **Mechanism:**
  - drizzle-orm 0.45.2 puts `params: <all values>` into `DrizzleQueryError.message`, and therefore
    into `.stack` (`node_modules/drizzle-orm/errors.js:10-19`).
  - Better Auth logs non-API errors in full by default, because `lib/auth.ts` sets no
    `logger`/`onAPIError`.
  - better-call always runs `console.error('# SERVER_ERROR: ', error)` (`router.mjs:93`). This one
    is only silenced by `onAPIError: { throw: true }`.
  - The Worker logs the full error object at `apps/api/src/index.ts:118`.
  - The provider callback logs `name: message` at `routes/provider-connections.ts:139-141,334`,
    under a comment saying no tokens are logged.
  - Reset tokens are stored as plaintext identifiers (`reset-password:<token>`) and stay valid
    after the failed request.
- **Evidence:** `repro/d2-quality-q01-reset-token-log.integration.test.ts` returns
  `status=500 tokenInLog=true`, re-run by challenge-3 with raw console arguments. Unit repro:
  `repro/d2-quality-q01-drizzle-error-params.test.ts` (2/2). The token is redacted in all saved
  evidence.
- **Counterevidence and qualification:** reset links are served by the Worker, so the token
  probably already appears in Workers Logs request URLs (not checked on production). The extra
  exposure is therefore mainly PII (emails, password hashes) and ciphertext. Provider tokens are
  encrypted with a secret that is never logged. Session tokens need `BETTER_AUTH_SECRET` to replay.
- **Remediation direction:** one sanitizer that logs `name` plus the D1 `cause.message` and never
  `.message`, `.params` or `.stack` for query errors (detect them by the `query`/`params` fields).
  Apply it in `app.onError` and `describeOAuthConnectFailure`, and in Better Auth via
  `onAPIError: { throw: true }` so Hono's handler sanitizes. Hashed verification identifiers are
  optional defense in depth, and they invalidate links already sent.
- **Fix check:** the repro flips to `tokenInLog=false`, with no token in any logged `.stack`, and
  still returns 500.
- **Owner-gated:** yes (`index.ts`, `lib/auth.ts`, `routes/provider*`). **Device:** no.
- **Long form:** `lanes/d2-quality.md` Q-01; `lanes/challenge-3.md`.

### AUD-004 — `deploy.sh --self-check` has an inert assertion block

- **Category:** false-green verification of a production guard. **Severity:** P3. Today's
  `deploy.sh` behaves correctly, but the test that claims to lock its git guards and worktree
  checkout cannot fail. **Confidence:** high. **Status:** Confirmed. Challenge: Upheld.
- **Where:** `scripts/deploy.sh:602-649` has the form `( set -euo pipefail; …assertions… ) && pass
  || fail`. Bash disables `errexit` inside a compound command on the left of `&&`/`||`, so the bare
  `[[ … ]]` assertions at `:623, :629, :639, :645, :646` never stop the block.
- **Evidence:** `repro/d1-tooling-deploy-selfcheck-mutation.sh`. Three mutants still print
  `self-check passed`: changed refusal messages, and a worktree that checks out `sha~1` (deploying
  the wrong commit). The `sha~1` mutant also passes `deploy-script.test.ts` in vitest. A control
  mutant that removes the dirty-tree check is caught. Challenge-2 re-ran all of this and showed
  that adding `|| exit 1` to `:645` makes the mutant fail. Nothing else in `deploy.sh` or CI
  catches a `sha~1` checkout.
- **Remediation direction:** make each assertion explicit (`… || exit 1`), or run the block as a
  function whose return code is checked. Add the `sha~1` mutant as a permanent negative test.
- **Fix check:** the three mutants fail the self-check and the vitest wrapper, and the unmutated
  script passes.
- **Owner-gated:** yes (`scripts/deploy*`). **Device:** no.
- **Long form:** `lanes/d1-tooling.md` T-01; `lanes/challenge-2.md`.

### AUD-005 — Saved-playlist dialog shows, and imports, a stale playlist's songs

- **Severity:** P3, downgraded from P2 by challenge-1. It creates a wrong but deletable class, and
  A's song titles are visible before Start. **Status:** Confirmed by jsdom repro.
- **Where:** `apps/web/src/components/Dashboard.tsx:3617-3631`. `openPlaylist` sets `tracks` from
  whichever reply lands last and has no request id. "Back to playlists" stays enabled while songs
  load. The builder `TrackSearch` already guards the same pattern.
- **Trigger:** Music → open playlist A on a slow provider page → Back → open B, then A's reply
  lands after B's. A second ordering: if A answers first, Start is briefly enabled on A's songs
  under B's heading.
- **Evidence:** `repro/b-web-playlist-stale-tracks.repro.test.tsx`. Copy it into
  `apps/web/src/components/`. The correct-behavior test fails, and the "observed" test passes
  while asserting the wrong import.
- **Remediation direction:** add a generation/request-id guard (the TrackSearch pattern) and clear
  `tracks` on Back. **Fix check:** the repro's correct-behavior test passes.
- **Owner-gated:** no. **Device:** no. **Long form:** `lanes/b-web.md` B-01.

### AUD-006 — The Live recovery panel's reconnect returns to preflight at 0:00

- **Severity:** P3 now, and P2 once Spotify work resumes (RF-92). **Status:** Confirmed by code
  trace. Challenge-1 split the finding: losing position on reload, tab discard or Back is a product
  call that **merges into B-7** (still undecided). The recovery-panel redirect, however, violates
  D24 ("Preserve position and expose recovery").
- **Where:** "Manage music connection" (`LiveMode.tsx:1201-1206`) leads to `beforeRedirect`
  (`:1290-1300`) and then `window.location.assign` (`lib/use-provider-connect.ts:113-120`). The
  return record is `{userId, destination:'live', classId, provider}` and holds no position
  (`Dashboard.tsx:848-855`, `lib/connection-return.ts:5-11`). On return, `enterLive(payload,
  false)` mounts preflight with the clock at 0.
- **Trigger today:** Spotify only. Apple connects in-page, and SoundCloud needs no connection. The
  likeliest path is the C-1 token expiry followed by Reconnect.
- **Remediation direction:** add `elapsedMs` and a timestamp to the return record, and offer
  "Resume at m:ss" in preflight. **Fix check:** a unit test for record round-trip plus preflight
  resume, then a real Spotify reconnect mid-class.
- **Owner-gated:** yes (`LiveMode*`). **Device:** yes. **Long form:** `lanes/b-web.md` B-03.

### AUD-007 — Duplicate class: a failure is silent and a repeat tap makes a second copy

- **Where:** `apps/web/src/components/ClassesHome.tsx:796-803` calls `void onDuplicate(cls)`, and
  `Dashboard.tsx:1187-1192` has no catch and no in-flight guard. The repo already has
  `useAsyncAction` for this. There is no global unhandled-rejection handler.
- **Trigger:** a failed copy shows nothing. To get a second copy, the instructor must reopen the
  menu and tap again (challenge-1).
- **Evidence:** `repro/b-web-duplicate-class.repro.test.tsx` (2/2 fail as expected).
  **Remediation direction:** route it through `useAsyncAction`, which gives pending state and an
  error message. **Owner-gated:** no. **Long form:** `lanes/b-web.md` B-02.

### AUD-008 — A playlist or likes import the instructor walked away from navigates them anyway

- **Where:** Close and backdrop stay enabled during "Creating…" (`Dashboard.tsx:3708-3716`,
  `:3973`). The import's completion always navigates into the builder (`:744-754`, `:778-787`).
- **Evidence:** `repro/b-web-playlist-stale-tracks.repro.test.tsx` › B-01b fails as expected.
  Whether reopening the dialog can create a duplicate class is code-path only.
- **Remediation direction:** either block Close while creating, or skip navigation once the
  dialog has unmounted (and say "Class created"). **Owner-gated:** no. **Long form:**
  `lanes/b-web.md` B-01b.

### AUD-009 — Builder preview "Reconnect" drops the open class and the draft

- **Where:** `apps/web/src/components/TrackPreview.tsx:182-189` and `:330` call `connectProvider`
  without saving a connection-return record. The error-row button has no catch.
- **Trigger:** today, SoundCloud or Spotify (parked). It is another trigger for B-4 (unsaved text
  is lost). **Remediation direction:** write the same `destination:'builder'` return record that
  other entry points write. **Owner-gated:** no (`TrackPreview.tsx` and `Dashboard.tsx` both exit 0
  from `scripts/owner-gate.mjs`). **Long form:** `lanes/b-web.md` B-04.

### AUD-010 — Concurrent token refresh from parallel shelf loads

- **Where:** two effects in `Dashboard.tsx:1739-1803` fire `listPlaylists` and `listLikes` per
  provider. The web treats a token as connected until `expiresAt`, but the server refreshes 60 s
  early (`user-likes.ts:120-125`, `user-playlists.ts:306-310`). Both paths refresh with the same
  stored token, there is no guard, and the loser returns `409 REAUTH_REQUIRED`
  (`user-likes.ts:156-193`).
- **Evidence:** `repro/c-music-refresh-race-repro.test.ts` (1/1; copy it into
  `apps/api/src/lib/music/`). Whether SoundCloud refresh tokens are single-use is **unverified**,
  and that decides whether this is real in production.
- **Remediation direction:** a conditional update keyed on the old refresh token, or re-read on
  `invalid_grant` and retry once. **Owner-gated:** yes (provider code). **Long form:**
  `lanes/c-music.md` CM-03.

### AUD-011 — A server-side ZodError is reported as a client 422 and is not logged

- **Where:** `apps/api/src/index.ts` `app.onError` maps every `ZodError` to 422 "Request body
  failed validation." without logging. Responses are re-validated in `lib/serialize.ts:71-209`.
  The provider branch's comment shows the authors knew about this and fixed only that case.
- **Trigger shown:** library `durationMs` has no upper bound, so `Number.MAX_SAFE_INTEGER` makes
  `GET /classes/:id/run-payload` return 422 with zero log lines. In general, any stored row that
  fails the response schema does the same.
- **Evidence:** `repro/a-api-probes.integration.test.ts` (A-02) and
  `repro/d2-quality-q03-response-zod-422.integration.test.ts`.
- **Remediation direction:** tag errors where output is parsed (for example a
  `ResponseValidationError` returning 500 with a log). Do **not** reclassify all ZodErrors, which
  would break real input 422s. Bound `durationMs`, which is a shared-contract change. **Owner-gated:**
  yes (`index.ts`). **Long form:** `lanes/a-api.md` A-02; `lanes/d2-quality.md` Q-03.

### AUD-012 — Unpaginated `GET /classes` returns 500 above 100 visible classes

- **Where:** `apps/api/src/lib/authz.ts:273-291`. An `inArray` over every visible class id hits
  D1's 100-bound-parameter limit. The comment there says "≤ page size", which is wrong for the
  unpaginated path (`routes/classes.ts:136-141`).
- **Evidence:** `repro/d2-quality-q02-class-list-unpaginated.integration.test.ts` returns 100
  classes → 200, 101 → 500, and `?limit=50` → 200. The web always paginates, so only legacy iOS
  is affected.
- **Remediation direction:** add the call site to RF-91's acceptance and chunk the call.
  **Owner-gated:** yes (`authz.ts`). **iOS:** affects the legacy list. **Long form:**
  `lanes/a-api.md` A-05; `lanes/d2-quality.md` Q-02.

### AUD-013 — Sign-up is an account-existence oracle

- **Where:** Better Auth 1.7.14 `sign-up.mjs:155,204` together with the beta allowlist hook in
  `lib/auth.ts`. A registered email gets 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, and an
  unknown email gets 403 `BETA_INVITE_REQUIRED`.
- **Qualification:** the only recorded anti-enumeration decision (PUB-03) covers password
  recovery, so this is an inconsistency rather than a broken guarantee. A generic duplicate
  response alone does not close the oracle, because unknown emails still get 403. Closing it needs
  one generic outcome for both cases, which is a **product call**.
- **Owner-gated:** yes (`lib/auth.ts`). **Long form:** `lanes/a-api.md` A-06; `lanes/challenge-2.md`.

### AUD-014 — Library duration PATCH bypasses the free-mode no-overlap invariant

- **Where:** `apps/api/src/routes/tracks.ts:98-156` has no `wouldOverlap` check, while
  `routes/class-tracks.ts:516-532` refuses the same growth. `lib/sequencing.ts:9` documents that
  overlaps are rejected.
- **Evidence:** `repro/a-api-probes.integration.test.ts` (A-07). `/class-tracks` returns 422 and
  `/tracks` returns 200. The run payload then has track 0 ending at 240000 after track 1 starts at
  180000. What Live shows or plays with overlapping windows was not tested.
- **Reachability:** a hand-written or iOS request only. The SPA never calls this route.
- **Remediation direction:** run the overlap check for every free-mode placement of the track, or
  reject the change. **Owner-gated:** no. **Long form:** `lanes/a-api.md` A-07.

## Hardening / low (accurate, not counted as defects)

| ID | Source | Summary | Disposition |
| --- | --- | --- | --- |
| AUD-015 | A-04 | Better Auth `/update-user` and sign-up accept any `image`. A non-URL `image` makes the user's own `/api/v1` calls return 422, and an empty publisher `displayName` makes `GET /explore` return 422 for everyone. The SPA cannot send either value, and Explore is not mounted. | Dormant surface. Fix with AUD-011 (tolerant output parsing) or input validation. |
| AUD-016 | A-01 | Malformed JSON gets 500 `INTERNAL_ERROR`. The SPA always sends valid JSON. | Use a body-parse helper. Do not map `SyntaxError` globally: the server `JSON.parse`s stored data in 4 places. |
| AUD-017 | A-03 | OpenAPI shape drift in 5 places (shares, bpm-lookup, `/health`, public OAuth callback security, team-member 201). | Fold into A-11/D-8. No current consumer. |
| AUD-018 | T-02 | owner-gate misses 4 existing paths: `apps/api/test/password-reset.integration.test.ts`, `apps/api/test/helpers.ts`, `apply-migrations.ts`, `.cursor/install.sh`. | Addendum to RF-101. A guardrail, not a boundary. |
| AUD-019 | T-03 | Gate matching is case-sensitive, and macOS is not. | Informational. Needs deliberate odd casing. |
| AUD-020 | T-04 | `deploy.sh run_gates` skips e2e and 5 tool self-tests, although the runbook says "same list". | Fix the runbook sentence. The real gap is e2e on an explicit-sha deploy. |
| AUD-021 | D-11 | 4 of 6 `auditConfig.ignoreGhsas` entries can never match the prod graph. The ci.yml comment is stale. | Prune with D-11. |

Leads handed between lanes and not filed: `lib/email.ts:60` logs the full reset link when
`RESEND_API_KEY` is unset (documented dev fallback; production configuration not checked).
`/api/v1/health` reports which secrets are present, which is intentional and tracked by RF-23.

## Investigation section (low-confidence, not findings)

- Whether awaiting a *real* FairPlay request before `play()` uses up iOS user activation (AUD-002
  fix risk). Device only.
- Whether SoundCloud refresh tokens are single-use (decides whether AUD-010 matters in production).
- Whether the iOS session cookie is ever refreshed through `/api/v1` (lane A gap).
- D1's 1000-queries-per-invocation limit on very large class copies (not measured).
- What Live renders and plays with overlapping free-mode windows (AUD-014 downstream).
