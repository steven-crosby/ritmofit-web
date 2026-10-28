# Lane a-api — API / auth / authz / data (apps/api + packages/shared)

Reviewer: Claude Code subagent (lane a-api), 2026-10-28. Audited SHA `4c344e2` (main).
Status: **COMPLETE** for the scope below. Audit-only. No tracked product file was changed.
Every run used a disposable worktree, `$SCRATCH/wt-a-api`, detached at 4c344e2, with
`pnpm install --frozen-lockfile`. All runs hit local Miniflare D1 only: no production, no remote
D1, no third-party APIs.

- Repro (canonical): `repro/a-api-probes.integration.test.ts`. It has 7 tests. Each one asserts
  the current defective behaviour, so a green run means the defect still reproduces.
- Evidence: `evidence/a-api-probes-run.log`. Verification tokens are stripped.
- Command (cwd `apps/api` of the worktree, after copying the repro into `test/`):
  `pnpm exec vitest run --config vitest.integration.config.ts test/a-api-probes.integration.test.ts`.
  Result: 7/7 pass.

## Summary

| ID | Sev | Status | One line |
| --- | --- | --- | --- |
| A-01 | P3 | Confirmed | A malformed JSON body gets 500 `INTERNAL_ERROR` and an "Unhandled error" log line. It is a client error and should be a 4xx. |
| A-02 | P3 | Confirmed | `onError` turns every `ZodError` into a client 422 "Request body failed validation.", including server-side output/contract parses, and never logs it. A bricked run-payload (GET, no body) shows up as a 422 and leaves no log line. |
| A-03 | P3 | Confirmed | OpenAPI registry drift beyond A-11. `GET /classes/{id}/shares` is declared `Share[]` but returns `ShareView`. `POST /tracks/{id}/bpm-lookup` is declared `Track` but adds `bpmApplied`. Both component schemas set `additionalProperties:false`. `/health` is missing too, and the public OAuth callback inherits the global session requirement. |
| A-04 | P3 (dormant cross-user) | Confirmed | Some values pass input validation and then fail output validation. An empty `displayName` on one publisher makes `GET /explore` 422 for every user. A non-URL `image` set through Better Auth's `/update-user` makes every `/api/v1` call of that user 422. |
| A-05 | P3 (extends D-1) | Confirmed. Duplicate of d2-quality Q-02. | The legacy unpaginated `GET /classes` (no `limit`/`cursor`, documented as the iOS path) returns 500 once a library has more than 100 classes: `lib/authz.ts:288` `inArray` over all class ids. |
| A-07 | P3 | Confirmed (lead from lane B) | `PATCH /tracks/:id` can grow a library duration so a free-mode placement overlaps the next track; the class-track route refuses the identical growth. |
| A-06 | P3 | Confirmed | Unauthenticated sign-up is an account-existence oracle. A registered email gets 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`. An unknown email gets 403 `BETA_INVITE_REQUIRED`. This defeats the "no enumeration" property that the password-reset route and its test protect. |

**Known-item status after the better-auth 1.7.14 upgrade (#637).** I re-ran the prior lane's repro
(`codex-code-audit-2026-10-27-4e0b150/repro/a-repro.integration.test.ts`) on 4c344e2. It passed
7/7. **A-1, A-2, A-3, A-4, A-5, A-6 and A-8 all still reproduce unchanged.** Details:

- In 1.7.14, `resetCredentialPassword` (`better-auth/dist/utils/password.mjs:34`) still deletes
  sessions only when `revokeSessionsOnPasswordReset` is true. The option is still unset.
- R-3 (no implicit-linking pre-hijack) still holds. `requireLocalEmailVerified ?? true` is at
  `oauth2/link-account.mjs:140`.
- R-5 (no reset `redirectTo` open redirect) still returns 403.
- A-11 is extended by A-03: `/health` is also unregistered.

No route or schema code under `apps/api/src` or `packages/shared` changed between 4e0b150 and
4c344e2. The only API change is the better-auth bump and an `auth-schema.ts` comment. Test-only
additions: `class-delete` and `class-opened`.

## 1. Coverage

Depth: **Traced** = input → validation → gate → persistence → output read end to end.
**Tested** = exercised in the worktree. **Sampled** = partly read.

| Area | Depth | Notes |
| --- | --- | --- |
| `index.ts` middleware order, nested-UUID 404, `onError`, `notFound`, CORS, BA mount, `scheduled` | Traced + Tested | A-01, A-02. Mount order holds: `/uploads` and `providerConnectionRoutes` (callback) are mounted before the root routers, and the anonymous callback gets 302, not 401. `mockRoutes` gate is scoped to `/mock/*`. |
| `lib/auth.ts`: Better Auth 1.7.14 config, beta allowlist hook, rate-limit rules, IP header, email hooks | Traced + Tested | A-06. The allowlist hook (`databaseHooks.user.create.before`) covers email sign-up and implicit social sign-up. The 1.7 database rate-limiter now uses atomic `incrementOne` and self-prunes rows older than the longest window (1 h). That does not conflict with our 60 s `rate_limit` keys. Cookie defaults: `__Secure-` prefix, `httpOnly`, `SameSite=Lax` (`cookies/index.mjs:23-37`). `changeEmail` and `deleteUser` are disabled by default. `/update-user` needs a trusted `Origin` (403 without one). |
| Password reset / email verification (1.7.14 library source) | Sampled + Tested | A-8 still reproduces. The reset email send goes through `runInBackgroundOrAwait`. No `advanced.backgroundTasks.handler` is configured, so it is awaited, which leaves a timing difference. It is moot next to A-06. |
| `lib/authz.ts` + every `requireAccess` / `require*Access` call | Traced | All 83 mounted handlers are enumerated in the gate table below. |
| Body-supplied foreign ids (focus of this lane) | Traced | All checked. See the gate table and the rejected leads. |
| `lib/ordered-class-import.ts` (receipts, snapshot CHECK, client-chosen placement ids) | Traced | Sound. A foreign or colliding placement id fails the batch with UNIQUE, which maps to 409. Nothing leaks across classes. Receipt replay is bound to `class_id` + request hash and runs only after `requireAccess(edit)`. |
| `lib/sequencing.ts`, plan-block reorder / delete renumber, tags cap, cover upload | Traced | Plan-block reorder guards with an in-batch snapshot. The tag cap is a single `INSERT…SELECT`. |
| `lib/run-payload.ts` + `runPayloadSchema` + iOS `RunPayload.swift` nullability | Traced + Tested | A-02 trigger. Swift optionals match the server's nullable fields, and enums decode tolerantly. `contract-parity` is green with 4 allowlisted cue lags. |
| OpenAPI registry vs mounted routes and runtime DTOs | Tested | Scripted route/spec diff: only `GET /health` and `GET /auth/capabilities` are missing. DTO checks: A-03. |
| Schema: Drizzle vs migrations vs `schema.md` | Tested (drizzle-kit) + Sampled | `drizzle-kit generate` reports "No schema changes, nothing to migrate". The cascade/restrict/set-null table in `schema.md:468-473` matches `schema.ts`. |
| `lib/rate-limit.ts`, `pruneRateLimits`, `lib/music/purge.ts` drain, `scheduled` | Traced | The purge binds its writes to the active queue row. A reconnect cancels the row. Two `waitUntil`s keep prune and purge failures independent. Nothing new beyond D-1. |
| Dormant community (shares/teams/explore) | Traced + Tested | A-1..A-4 still reproduce. New: A-04 (Explore feed DoS) and the team-share note under rejected leads. |
| Provider token refresh, likes, playlists, BPM | Sampled | Lane C scope. Only the authz shape was checked: every call uses the caller's own connection or own track. |

### Gate table (every mounted handler)

`V/E/O` = `requireAccess` view/edit/owner, direct or through a `require*Access` chain helper.
"own" = owner-scoped check in the route.

| Router | Handlers → gate | Body / foreign ids → check |
| --- | --- | --- |
| classes | `POST /` (caller-owned); `GET /` (`listVisibleClasses`); `POST /:id/opened` V; `GET /:id/run-payload` V; `POST /:id/copy` V; `GET /:id` V; `PATCH /:id` E; `DELETE /:id` O; `POST /:id/cover` E (+limiter); `POST /:id/tags` E; `DELETE /:id/tags/:tag` E | `updateClassSchema` excludes `coverImageUrl`, so `deleteClassCover` only ever receives Worker-minted URLs. |
| class-tracks | `POST /classes/:id/tracks/import` E; `POST /classes/:id/tracks` E; `PATCH /class-tracks/:id/plan-block` E; `GET /classes/:id/tracks` V; `POST /classes/:id/tracks/reorder` E; `PATCH /class-tracks/:id` E; `DELETE /class-tracks/:id` E; `POST /class-tracks/:id/copy` E source + E target | `planBlockId` must belong to the same class (`:170-179`, `:276-284`, import `:223`). `trackId` must be the caller's own (`:186-197`, import `:246`). Reorder ids must be an exact permutation (`:368-380`). |
| cues | `GET/POST /class-tracks/:id/cues` V/E; `PATCH/DELETE /cues/:id` E | `updateCueSchema` has no `classTrackId`, so a cue cannot be re-parented. |
| placed-moves | `GET/POST /class-tracks/:id/moves` V/E; `PATCH/DELETE /class-track-moves/:id` E | `moveId` must be a known global move. `userMoveId` must be the caller's own (`:183-207`). |
| sections | `GET/POST /classes/:id/sections` V/E; `PATCH/DELETE /sections/:id` E | No foreign ids in the body. |
| plan-blocks | `GET/POST /classes/:id/plan-blocks` V/E; `POST …/reorder` E; `PATCH/DELETE /plan-blocks/:id` E | Reorder ids must be an exact permutation, guarded by an in-batch snapshot. |
| moves | `GET /moves`, `GET /moves/:id/songs` (scoped to the caller's own classes); `GET/POST /user-moves`, `PATCH/DELETE/GET …/:id(/songs)` own | `baseMoveId` must be a known global move. |
| tracks | all own (`requireOwnedTrack`); `DELETE /track-provider-ids/:id` checks the parent track is own | — |
| providers / provider-connections / playlist-import / mock | caller's own connection; callback is public (cookie-bound state); `POST /classes/:id/import-playlist` E | — |
| shares / teams / explore | O on the share resource; team manager / member; explore lists public classes | See A-2/A-4 and the rejected leads. |
| auth / uploads / health | public, or session-only | — |

## 2. Candidates

### A-01 — Malformed JSON body returns 500 INTERNAL_ERROR

- **Category:** error handling / API contract. **Severity:** P3. A client error is misreported as a
  server fault, and it adds noise to error monitoring (`console.error('Unhandled error:')` per
  request). There is no data impact. **Confidence:** high. **Status:** confirmed.
- **Refs:** every route parses with `schema.parse(await c.req.json())`, for example
  `apps/api/src/routes/classes.ts:67`. Hono's `c.req.json()` throws `SyntaxError`, which is not
  handled in `apps/api/src/index.ts:76-123` and falls through to the 500 branch at `:118-122`.
- **Observed:** `POST /api/v1/classes` with body `{"title": "unterminated` returns
  `500 {"error":{"code":"INTERNAL_ERROR",...}}`, and `console.error` is called once
  (test A-01).
- **Expected:** 400 or 422 with the standard envelope, and no error-level log.
- **Coverage:** no test sends malformed JSON.
- **Remediation:** in `onError`, map `SyntaxError` from body parsing (or Hono's
  `HTTPException`) to `400 BAD_REQUEST`. Alternatively, wrap body parsing in one helper.
- **Fix check:** test A-01 should flip to 400.
- **Known:** new. **Owner-gated:** yes (`apps/api/src/index.ts`). **Browser:** no.

### A-02 — Server-side ZodErrors become an unlogged client 422

- **Category:** error handling / observability / availability. **Severity:** P3.
  - The silent-failure part is the real cost. A contract or serializer drift that bricks a class
    (run-payload) or a list shows up to clients as "your request was invalid", and nothing is
    logged, so the operator never sees it.
  - `details: err.issues` also echoes internal output-field paths to the client.
- **Confidence:** high. **Status:** confirmed.
- **Refs:**
  - The branch at `apps/api/src/index.ts:106-117` has no log line.
  - Output parses that throw `ZodError` include:
    - `lib/run-payload.ts:279` (`runPayloadSchema.parse`)
    - every `serialize*` in `lib/serialize.ts`, for example `serializeUser:208-217`, which
      `requireSession` calls on every request (`middleware/auth.ts:22`)
    - `routes/explore.ts:240`
- **Trigger used:** the library track duration is unbounded. `createTrackSchema` /
  `updateTrackSchema` use `z.int().positive()` with no max (`packages/shared/src/entities/tracks.ts:18,30-41`).
  Every class-track field is bounded by `MAX_DURATION_MS` (`classes.ts:217-235`), and its comment
  says this is to stop exactly this overflow. Steps:
  1. The owner PATCHes their own track to `durationMs = MAX_SAFE_INTEGER`, which returns 200.
  2. The class has one more track, so `totalDurationMs` is no longer a safe integer.
  3. `GET /classes/:id/run-payload` returns `422 VALIDATION_ERROR "Request body failed validation."`
     with issue path `["class","totalDurationMs"]`, and `console.error` is called 0 times
     (test A-02).
  4. Live and the builder timeline for that class fail until the duration is fixed.
- **Reachability:** the SPA has no `PATCH /tracks` caller, so this needs a hand-written request
  (or inline `POST /classes/:id/tracks` with `track.durationMs`). A-04 shows two more output-parse
  triggers.
- **Coverage:** none of the integration suites assert the error class for an output-parse failure.
- **Counterevidence:** the trigger is self-inflicted. The finding is about the mapping and the
  missing log, which affect every output-schema failure, not about this one trigger.
- **Remediation:**
  - Only map a `ZodError` raised while parsing request input to 422. For example, parse inputs
    through a helper that tags the error, or catch output-schema failures in the `serialize*`
    helpers and rethrow them as a logged 500.
  - Separately, bound `trackSchema.durationMs` by `MAX_DURATION_MS`.
- **Fix check:** test A-02 expects 500 plus one `console.error`, and the PATCH expects 422.
- **Known:** new. **Owner-gated:** yes (`index.ts`). The schema bound is not gated.

### A-03 — OpenAPI registry advertises shapes the routes do not return (extends A-11)

- **Category:** contract. **Severity:** P3. The spec is the iOS and third-party contract. The web
  uses `@ritmofit/shared` types directly, so the SPA is unaffected.
- **Confidence:** high. **Status:** confirmed.
- **Refs:** `apps/api/scripts/generate-openapi.ts:688-700` (bpm-lookup → `Track`), the
  `/classes/{id}/shares` entry (→ `Share`), and `index.ts:160` (`/health` is never registered).
- **Observed (test A-03):**
  - `GET /classes/:id/shares` returns `targetEmail`, `targetDisplayName` and `targetTeamName`.
    `shareSchema.strict()` rejects that response. The spec's `Share` component has
    `additionalProperties:false`, and `shareViewSchema` (`packages/shared/src/entities/sharing.ts:42`)
    is not registered.
  - `POST /tracks/:id/bpm-lookup` returns `bpmApplied`, which `apps/web/src/lib/api.ts:354` and
    `Dashboard.tsx:5777` consume. The spec says `Track` with `additionalProperties:false`.
  - The scripted route/spec diff leaves exactly `GET /health` and `GET /auth/capabilities`.
  - `GET /providers/{provider}/callback` has no `security: []`, so it inherits the global
    `sessionCookie` requirement. The runtime is public: the anonymous call returns 302.
  - `POST /teams/{id}/members` 201 has no schema. The route returns `TeamMembership`.
- **Why CI misses it:** the regeneration diff only proves that `openapi.json` matches the
  hand-written registry (the same blind spot as A-11/D-8).
- **Remediation:**
  - Register `ShareView`, `TeamMembership`, the `Track & {bpmApplied}` response, `/health` and
    `/auth/capabilities`.
  - Add `security: []` to the callback.
  - Optionally add an integration test that validates each documented 2xx response against its
    registered component.
- **Fix check:** test A-03 inverts.
- **Known:** extends A-11/D-8. **Owner-gated:** yes (`apps/api/scripts/`).

### A-04 — Input/output schema asymmetry: one stored value breaks other users' Explore feed or the user's whole session

- **Category:** availability / validation. **Severity:** P3. The cross-user arm is in the dormant
  Explore surface (`ExploreDialog` is not mounted). The self-lockout arm needs a hand-written
  Better Auth call.
- **Confidence:** high. **Status:** confirmed.
- **Refs:**
  - `updateUserProfileSchema` lets `displayName` be `""` (`packages/shared/src/entities/identity.ts:14-27`).
  - `routes/explore.ts:67` uses `r.ownerName ?? '…'`, so an empty string is kept, and then
    `exploreClassSchema.ownerName` (`z.string().min(1)`, `classes.ts:210-213`) fails the whole
    page parse.
  - Better Auth's `/update-user` stores any string as `image`, but `userSchema.imageUrl` is
    `z.url()`. `serializeUser` runs in `requireSession` (`middleware/auth.ts:22`).
- **Observed (test A-04):**
  - Publisher: `PATCH /auth/me {"displayName":""}` returns 200, then `POST /classes {visibility:'public'}`
    returns 201. Another user's `GET /explore` then returns `422 VALIDATION_ERROR`.
  - Victim: `POST /api/auth/update-user {"image":"not a url"}` (trusted Origin) returns 200, then
    `GET /api/v1/auth/me` returns 422 and `GET /api/v1/classes` returns 422.
- **Remediation:**
  - Use `?.trim() || 'Ritmo Studio instructor'` in explore, and/or give `displayName` a `min(1)`
    (or normalise `''` → null on input).
  - Validate `image` through a Better Auth `user.update.before` hook, or make `serializeUser`
    tolerant (drop an invalid `imageUrl` to null).
  - A-02's fix turns the symptom into a logged 500 but does not stop one row from failing a
    shared feed.
- **Fix check:** test A-04 inverts.
- **Known:** new. **Owner-gated:** the `serializeUser` and explore fixes are not gated. A Better
  Auth hook would be gated (`lib/auth.ts`).

### A-05 — Unpaginated `GET /classes` 500s above 100 classes (extends D-1; duplicate of d2-quality Q-02)

- **Severity:** P3. The web always paginates (`apps/web/src/lib/api.ts:149-161`). The legacy
  array path is documented as the one "used by the current iOS cache" (`routes/classes.ts:128-131`).
- **Status:** confirmed.
- **Ref:** `lib/authz.ts:273-291`. `classIds` holds every visible class when `limit` is unset, and
  `inArray(classTracks.classId, classIds)` then binds more than 100 parameters.
- **Observed (test A-05):** with 101 classes, `GET /classes` returns 500
  (`D1_ERROR: too many SQL variables`), while `?limit=50` returns 200.
- **Remediation:** use the same `json_each(?)` subquery as D-1, or chunk the summary query.
- **Known:** new call site. The D-1 list omits `authz.ts:288`. Same as d2-quality Q-02, so the
  lead should merge the two. **Owner-gated:** yes (`lib/authz.ts`).

### A-06 — Sign-up is an unauthenticated account-existence oracle

- **Category:** authentication / privacy. **Severity:** P3. It is IP-limited to 10 per hour
  (`lib/auth.ts:193`) and the beta user base is small. It does undo the deliberate
  no-enumeration stance (`password-reset.integration.test.ts:63-70`).
- **Status:** confirmed.
- **Refs:** better-auth 1.7.14 `api/routes/sign-up.mjs:155,204`. A generic duplicate response is
  returned only when `requireEmailVerification` is set or `autoSignIn === false`, and neither is
  set in `lib/auth.ts:141-180`. The beta hook runs after the existence check, so an unknown email
  gets 403.
- **Observed (test A-06):** registered email → 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`.
  Unknown email → 403 `BETA_INVITE_REQUIRED`.
- **Counterevidence:** the authenticated share oracle (A-3) is stronger but needs a beta session.
  This one needs nothing.
- **Remediation (owner product call):**
  - Option 1: `requireEmailVerification: true` (also closes the A-8 chain) or `autoSignIn: false`.
    Better Auth then returns a generic duplicate response, and the client shows "check your email".
  - Option 2: return one generic error for both cases from a `hooks.before` on `/sign-up/email`.
  - Separately, wire `advanced.backgroundTasks.handler` to `ctx.waitUntil` so reset and
    verification sends stop adding a timing difference.
- **Known:** new. A-3 is the authenticated variant. **Owner-gated:** yes (`lib/auth.ts`).

### A-07 — Library duration PATCH bypasses the free-mode no-overlap invariant (lead from lane B)
- **Category:** data integrity / timeline invariant. **Severity:** P3 — reachable only by a hand-written or iOS request (the SPA has no `PATCH /tracks` caller); owner-only on own data; in a dormant edit-share a collaborator's own track could do it to the owner's class. **Status:** confirmed.
- **Refs:** `apps/api/src/routes/tracks.ts:98-156` guards only clip-start/cue/move reachability (`collapsedPlacement`, `unreachableCue`, `unreachableMove`) — no `wouldOverlap`. Contrast `routes/class-tracks.ts:516-532`, which rejects the same growth via `durationMsOverride`. `lib/run-payload.ts:180-189` free mode emits authored offsets with no overlap check.
- **Observed (test A-07):** free class, two 180 s tracks back-to-back. `PATCH /class-tracks/:id {durationMsOverride:240000}` → 422 (overlap); `PATCH /tracks/:trackId {durationMs:240000}` → 200; run-payload then has track0 end 240000 > track1 start 180000.
- **Impact:** the free timeline carries overlapping windows; what Live shows vs plays when two windows overlap is lane B/C territory (not verified here; would need a browser).
- **Remediation:** in the PATCH /tracks guard add a `NOT EXISTS` over free-mode classes where any inherited placement's new end exceeds the next placement's start (or reject duration changes on tracks placed in free classes without override); also bound `durationMs` by `MAX_DURATION_MS` (A-02).
- **Fix check:** test A-07 library PATCH → 422. **Known:** new (lane-B lead). **Owner-gated:** no (`routes/tracks.ts`). **Browser:** only to characterise Live behaviour.

## 3. Rejected leads (do not re-file)

- **Cue re-parenting via PATCH.** `updateCueSchema` / `updateClassTrackMoveSchema` carry no
  `classTrackId`, and Zod strips unknown keys.
- **Cover deletion of another class's R2 object.** `coverImageUrl` cannot be set by create or
  PATCH (`packages/shared/src/entities/classes.ts:94` comment + `.pick`). `classCoverObjectKey` only accepts Worker-minted
  paths.
- **Ordered import with a foreign or colliding placement id.** The PK UNIQUE failure maps to 409
  and the batch rolls back. The receipt is bound to class + hash and is reachable only after edit
  access.
- **Reorder / plan-block reorder with ids from another class.** Rejected by the exact-permutation
  check. Plan-block reorder is also snapshot-guarded inside the batch.
- **Class-track copy to a class the caller cannot edit.** `requireAccess(target,'edit')` at
  `class-tracks.ts:658`.
- **Team share to an arbitrary team id.** The owner can share their class to any team without
  being a member (`shares.ts:51-58`). That is the same unsolicited-push surface as A-2 and needs
  the team UUID. Not filed separately.
- **`POST /classes/:id/opened` by view/public users stamps the owner's `lastOpenedAt`.**
  Intentional and locked by #625 (`class-opened.integration.test.ts`).
- **Better Auth 1.7 rate-limit self-prune deleting our limiter rows.** It prunes at
  `now − 3600 s`. Our windows are ≤ 60 s.
- **Better Auth 1.7 `incrementOne` on D1.** Exercised by the existing auth rate-limit
  integration test, which passes.
- **Allowlist bypass through social sign-up.** The `user.create.before` hook covers every
  creation path. `changeEmail` is disabled.
- **CORS / Origin.** Production `WEB_ORIGIN` is set (`wrangler.toml:23`), so the localhost
  fallback is not trusted in production.
- **Schema drift.** `drizzle-kit generate` finds no diff, and the cascades match `schema.md`.
- **iOS run-payload nullability drift.** Swift optionals match the server's nullable fields.

## 4. Gaps

- **iOS session cookie refresh.** `requireSession` calls `auth.api.getSession` without
  `returnHeaders`. A sliding refresh extends the DB session but never re-issues the cookie through
  `/api/v1`. The web refreshes through `authClient.useSession`. An iOS client that only calls
  `/api/v1` might be logged out after `expiresIn`. Not tested (needs a time shift). Hypothesis.
- **D1 per-invocation query limit on very large class copies.** Workers Paid allows 1000 queries,
  and copy and resequence issue one statement per row. Not measured.
- **Concurrency (A-10 family).** Not re-run. Miniflare cannot produce the interleavings
  deterministically.
- **Provider token refresh and the likes/playlists error taxonomy.** Lane C.
