# Lane A — API / security / data

Reviewer A. Audited SHA `4e0b15096995c125b3941bf374a6a580e2ff52f8` (main, clean tree at start).
Status: **COMPLETE** for the scope below. Audit-only: no tracked file changed. All reproductions ran
in the disposable worktree `/tmp/wt-a` against **local Miniflare D1 only** (vitest-pool-workers,
`vitest.integration.config.ts`). Nothing touched production, remote D1, secrets, or provider accounts.

## Summary of accepted findings

| ID | Title | Sev | Status | Confidence |
| --- | --- | --- | --- | --- |
| A-7 | Drizzle table-rebuild migrations silently cascade-delete child rows on D1 | P1 | Confirmed (local D1); latent for the next parent rebuild | High |
| A-9 | Unbounded `inArray()` lists exceed D1's 100 bound-parameter ceiling; the disconnect purge then fails for good once a user has more than ~97 linked tracks | P2 | Confirmed (local D1) | High |
| A-5 | `requireSession` runs once per earlier root router: up to 12 session lookups per request | P2 | Confirmed | High |
| A-2 | Any beta user can push classes into a verified stranger's Library (direct share or team add), and the victim cannot remove them | P2 | Confirmed (API); UI rendering inferred from code | High |
| A-8 | Password reset leaves existing sessions alive (`revokeSessionsOnPasswordReset` unset) | P2 | Confirmed | High |
| A-1 | An edit-share collaborator can publish the owner's private class (visibility=public) | P3 (P2 if sharing reopens) | Confirmed | High |
| A-3 | Share/team-add by email is an account-existence and verification oracle | P3 | Confirmed | High |
| A-4 | A team admin can mint `role: 'owner'` members, who can then remove admins | P3 | Confirmed | High |
| A-6 | An edit collaborator cannot change any placement that references the owner's custom move (422) | P3 | Confirmed | High |
| A-10 | Read-then-write with no unique-violation mapping returns 500 under concurrency (plan-block append, PATCH after delete) | P3 | Probable (code path) | Medium |
| A-11 | `GET /auth/capabilities` is missing from the OpenAPI registry | P3 | Confirmed | High |

## 1. Coverage

Depth key: **Traced** (input → validation → authz → persistence → output read end to end),
**Tested** (exercised with a reproduction in `/tmp/wt-a`), **Sampled** (skimmed or partly read),
**Not assessed**.

| Subsystem / routes | Depth | Notes |
| --- | --- | --- |
| `index.ts` middleware order, CSP and security headers, nested-UUID 404 guard, `onError` envelope, `notFound`, CORS | Traced + Tested | Mount order drives A-5. CORS echoes only `WEB_ORIGIN` and `https://ritmofit.studio`, with `credentials:true`. |
| `middleware/auth.ts` `requireSession` | Traced + Tested | A-5. |
| `lib/authz.ts` (`resolveAccess`, `requireAccess`, nested `require*Access`, `listVisibleClasses`) | Traced | All nested resources resolve their parent chain. A foreign or stale ID returns 404. The public floor sits below shares. |
| `routes/classes.ts` (CRUD, opened, run-payload, copy, cover, tags) | Traced + Tested | A-1, A-9 (copy). Cover upload uses an allowlisted MIME type and a server-chosen key. |
| `routes/class-tracks.ts` + `lib/ordered-class-import.ts` | Traced | Track ownership is checked for both `trackId` and import placements. The plan block must belong to the class. The snapshot-guarded batch rolls back on CHECK failure. Receipt replay requires edit access first. |
| `routes/cues.ts`, `placed-moves.ts`, `sections.ts`, `class-plan-blocks.ts` | Traced | A-6, A-10. The guarded anchor-window writes are sound. |
| `routes/moves.ts` (`user_moves`, songs-by-move) | Traced | Owner-scoped. Songs-by-move filters on `classes.owner_user_id`. |
| `routes/tracks.ts` (+ provider ids, resolve-provider, bpm-lookup) | Traced | Owner checks on every handler, including `lookupAndApplyBpm`. |
| `routes/shares.ts`, `teams.ts`, `lib/team-authz.ts`, `share-target.ts`, `member-target.ts` | Traced + Tested | A-2, A-3, A-4. Both surfaces are dormant in the UI but live on the API. |
| `routes/explore.ts` | Traced + Tested | Paginated, never exposes owner email. Used in A-1. |
| `routes/uploads.ts` (public cover capability URLs) | Traced | Public by design: UUIDv4 key, `nosniff`, global CSP. No traversal (single path segment, literal R2 key). |
| `routes/mock.ts` gate | Traced | Gate scoped to `/mock/*`, 404 unless `MOCK_PROVIDERS=true`. |
| `routes/provider-connections.ts` (connect, callback, Apple Music token, playback token, disconnect) | Traced | The encrypted state cookie binds userId, provider, state, and expiry. The callback deletes the cookie on every path. Tokens use AES-GCM. Callback failures log only sanitized messages. |
| `lib/music/spotify-playback-token.ts` refresh/persist | Traced | Refresh race with a reconnect is noted as a hypothesis (A-12). Error taxonomy belongs to lane C. |
| `lib/music/purge.ts` (disconnect metadata purge, cron) | Traced + Tested | A-9. |
| `lib/auth.ts` Better Auth configuration | Traced + Tested | A-8. Beta allowlist gate on user create, rate-limit rules, CF-IP keying, trusted origins. |
| Better Auth 1.6.25 internals: password reset, OAuth account linking | Sampled (library source) | `requireLocalEmailVerified` defaults to true, which blocks pre-hijack linking (rejected R-3). |
| `lib/rate-limit.ts` | Traced | Read-then-upsert race is documented and acceptable. Cron prunes stale rows. |
| `lib/email.ts` | Traced | Dev fallback logs reset links when `RESEND_API_KEY` is unset. Health reports the missing key (rejected R-6). |
| Migrations `0000`–`0021` vs Drizzle | Sampled + Tested | A-7. Table rebuilds reviewed: 0004, 0005, 0010, 0014, 0016, 0018, 0021. Full column-by-column `schema.md` reconciliation not done. |
| OpenAPI registry vs mounted routes | Tested (route list diffed against committed `openapi.json`) | A-11 only. DTO-by-DTO schema parity not assessed; lane D runs the regeneration diff. |
| Run-payload assembly | Sampled | Batched queries, no N+1. Hits the 100-parameter ceiling (A-9). |
| What the integration tests prove | Sampled | See each finding's coverage note. All suites migrate an **empty** DB, so no test can catch A-7. |
| Production state, remote D1, real providers, real email | Not assessed | Out of bounds. |
| CSRF on `/api/v1` | Traced | Relies on Better Auth's default `SameSite=Lax` cookie with the SPA same-origin. No exploitable path found (rejected R-4). |

## 2. Candidate ledger

| ID | Issue | Location | Impact | Status |
| --- | --- | --- | --- | --- |
| A-1 | Edit collaborator can set `visibility: 'public'` | `apps/api/src/routes/classes.ts:455-474`, `packages/shared/src/entities/classes.ts:103,157` | Owner's private class readable and copyable by every user | Confirmed |
| A-2 | Unsolicited share or team add into a stranger's Library; victim can't remove it | `apps/api/src/routes/shares.ts:26-114`, `routes/teams.ts:110-162`, `lib/authz.ts:220-229` | Persistent content injection / harassment | Confirmed |
| A-3 | Email oracle (unknown / unverified / verified) | `apps/api/src/lib/share-target.ts:31-33`, `routes/shares.ts:59-65`, `lib/member-target.ts:24-27`, `routes/teams.ts:135-141` | Account enumeration (password reset deliberately avoids this) | Confirmed |
| A-4 | Admin can add `role:'owner'` | `packages/shared/src/entities/identity.ts:68`, `routes/teams.ts:152`, `lib/team-authz.ts:52` | Team privilege escalation | Confirmed |
| A-5 | Repeated `requireSession` per request | `apps/api/src/index.ts:170-190`, each `routes/*.ts` `use('*', requireSession)` | 2–12× D1 session+user reads per request | Confirmed |
| A-6 | Collaborator can't move an owner's custom-move placement | `apps/api/src/routes/placed-moves.ts:136-143,29-53` | Collaboration workflow broken (dormant) | Confirmed |
| A-7 | Rebuild migrations cascade-delete children | `apps/api/migrations/0005…:1,24`, `0010…:1,21`, `0014…:1,24`, `0016…:1,25`, `0018…:1,29` | Silent loss of cues, placed moves, tags, sections, plan blocks, or class_tracks on the next rebuild of `classes` / `class_tracks` | Confirmed (local) |
| A-8 | Sessions survive password reset | `apps/api/src/lib/auth.ts:141-161` | Stolen or shared session persists after the victim resets | Confirmed |
| A-9 | `inArray()` over unbounded lists breaks the 100-parameter ceiling | `apps/api/src/lib/music/purge.ts:164-178`, `lib/run-payload.ts:122-158`, `routes/classes.ts:225-231,274`, `routes/class-tracks.ts:744`, `lib/class-recency.ts:39-42` | Compliance purge permanently fails; 500s on large classes | Confirmed |
| A-10 | Read-then-insert races and PATCH-after-delete return 500 | `apps/api/src/routes/class-plan-blocks.ts:88-111`, `routes/cues.ts:116-145`, `routes/placed-moves.ts:132-169` | 500 instead of a clean 409/404 | Probable |
| A-11 | `/auth/capabilities` not in OpenAPI | `apps/api/src/routes/auth.ts:20-29`, `apps/api/scripts/generate-openapi.ts` | Contract gap for iOS | Confirmed |
| A-12 | Spotify refresh can overwrite tokens from a concurrent reconnect (row id survives the upsert) | `apps/api/src/lib/music/spotify-playback-token.ts:75-118`, `routes/provider-connections.ts:180-193` | Stale scope/tokens after a narrow race | Hypothesis |
| A-13 | `Promise.all` with several failing D1 reads leaves extra rejections unhandled (copy route logged "Unhandled error") | `apps/api/src/routes/classes.ts:216-253` | Noisy logs only | Hypothesis (seen as side effect in the A-9 run) |
| R-1…R-8 | See appendix | | | Rejected |

## 3. Accepted finding records

### A-7 — Drizzle table-rebuild migrations silently cascade-delete child rows on D1

- **Category:** data integrity / migrations. **Severity:** P1. **Confidence:** high on local D1, probable on remote D1. **Status:** Confirmed locally; latent.
- **Refs:** every drizzle-kit rebuild starts with `PRAGMA foreign_keys=OFF;` and later drops the parent: `apps/api/migrations/0005_worried_harpoon.sql:1,24` and `0016_motionless_shocker.sql:1,25` (`DROP TABLE classes`), `0010_overconfident_corsair.sql:1,21`, `0014_flaky_puppet_master.sql:1,24`, `0018_overjoyed_roxanne_simpson.sql:1,29` (`DROP TABLE class_tracks`). Cascade children are in `apps/api/src/db/schema.ts`: `onDelete: 'cascade'` at lines 218, 249, 307, 326, 381, 418, 458; `set null` at 255, 421, 422.
- **Trigger:** any future migration where drizzle-kit rebuilds a referenced table: `classes`, `class_tracks`, `users`, `teams`, `class_plan_blocks` (set-null), or `user_moves` (set-null, which can violate the at-most-one CHECK). drizzle-kit emits a rebuild for column-constraint changes, CHECK changes, and many type changes, which this repo does routinely (0010/0014/0018 all rebuilt `class_tracks`).
- **Expected vs observed:** expected: children survive (that is the intent of `PRAGMA foreign_keys=OFF`). Observed: D1 keeps FK enforcement on, so `DROP TABLE` runs SQLite's implicit `DELETE FROM`, which fires the `ON DELETE CASCADE` actions. Replaying the already-applied `0018` rebuild against a populated local DB gave:
  - before: `{"class_tracks":1,"cues":1,"class_track_moves":1}`
  - after: `{"class_tracks":1,"cues":0,"class_track_moves":0}`
  - no error raised
  - replacing the pragma with `PRAGMA defer_foreign_keys=on` also lost the cue (`cues 1 → 0`). Deferral only changes when constraints are checked; it does not stop cascade **actions**.
- **Impact:** silent, non-erroring loss of all choreography (cues, placed moves) on a `class_tracks` rebuild. A `classes` rebuild would also wipe class_tracks, tags, sections, and plan blocks. Recovery would need D1 time-travel. The existing review rule (AGENTS.md "Engineering Rules": review `INSERT … SELECT` alignment) does not cover this. Historical impact of 0005/0010/0014/0016 on production is **unknown and not assessable from here**. HISTORY notes production `class_tracks` had 0 rows at 0018; `0021` rebuilt `cues`, which has no children, so it is safe.
- **Evidence:** `repro/a-migration-rebuild.integration.test.ts`; log `evidence/a-migration-rebuild-run.log`.
- **Test coverage and limits:** `test/apply-migrations.ts` applies migrations to an **empty** DB before each file, so no suite can observe cascade loss. No migration lint exists.
- **Counterevidence considered:** local Miniflare D1 might differ from remote D1. Both are the same workerd SQLite engine with FKs always enforced. The defer test shows the outcome does not depend on the pragma. Remote behaviour stays "probable" because remote D1 was out of bounds.
- **Smallest remediation direction:**
  - Add a migration-review rule plus a check script (alongside `contract-parity`) that fails when a migration contains `DROP TABLE <t>` and some FK references `<t>`.
  - Hand-edit such migrations to copy children into temporary tables and re-insert them after the rename. Alternatives: rebuild the children in the same migration, or avoid the rebuild (`ALTER TABLE ADD COLUMN` when the constraint change can be dropped).
  - Add a populated-DB migration test: seed a parent with children, apply the pending migration, assert child counts are unchanged.
  - Record the pragma behaviour in `conventions.md`. Never rewrite applied migrations.
- **Acceptance checks:** the check script fails on a replay of 0018 and passes on 0021. A populated-DB test keeps cue and placed-move counts across a synthetic `class_tracks` rebuild.
- **Overlap with #625/#596:** none (both are test-only and unrelated).

### A-9 — Unbounded `inArray()` lists exceed D1's 100 bound-parameter ceiling

- **Category:** query scaling / compliance. **Severity:** P2. **Confidence:** high. **Status:** Confirmed on local D1. Local D1 rejects 101 parameters with `D1_ERROR: too many SQL variables`, matching D1's documented 100-parameter limit.
- **Refs:**
  - `apps/api/src/lib/music/purge.ts:164-178`: `inArray(trackProviderIds.trackId, trackIds)` and `inArray(tracks.id, trackIds)`, where `trackIds` = **every** track the user owns with that provider, plus 2–5 more parameters.
  - `apps/api/src/lib/run-payload.ts:122,124,127,133`.
  - `apps/api/src/routes/classes.ts:225,227,229,231` (copy).
  - `apps/api/src/lib/class-recency.ts:39-42` (all classes using a user move).
  - `routes/classes.ts:274` and `routes/class-tracks.ts:744` (distinct user moves; small in practice).
- **Trigger:** a user who disconnects a provider after linking more than ~97 tracks to it. One saved-playlist import can add 100, so heavy users get there quickly. Run-payload and copy need a class with more than 100 placements or distinct tracks, which is rare for a 45–60 min class but reachable through repeated imports.
- **Expected vs observed:** expected: the purge strips refs and art within the 7-day SLA. Observed with 120 Spotify-linked tracks:
  - the drain retried 4 times, then `moved to failed state after 5 attempts`
  - `spotify refs remaining = 120`
  - queue row `{"attempts":5,"failed":1}`

  A class with 101 placements gave `run-payload → 500` and `copy → 500`, while the list (≤50 classes per page) still returned 200.
- **Impact:** the provider-terms purge duty (`purge.ts` header) silently never completes for exactly the users with the most provider data. The failed row is retained for "operator recovery", but no operator alert exists beyond a cron log line. Large classes cannot open Live (the run-payload is the single-fetch live contract) or be copied.
- **Evidence:** `repro/a-param-limit.integration.test.ts`; log `evidence/a-param-limit-run.log`.
- **Test coverage and limits:** purge tests (`provider-disconnect`, `launch-blockers`) use 1–2 tracks. No test exceeds 100 IDs anywhere.
- **Counterevidence considered:** the ordered import deliberately uses `json_each(?)` for its snapshot (one parameter), and its `inArray(tracks.id, libraryIds)` stays at 100 or fewer. Those sites are safe. Reviewer D's `evidence/d-purge-scale.log` probes purge scale independently and should corroborate.
- **Smallest remediation direction:** replace `inArray(col, ids)` on unbounded lists with a `json_each(?)` subquery (`col IN (SELECT value FROM json_each(?))`), as `ordered-class-import.ts` already does. Alternatively, chunk to 90 or fewer per statement inside the same `db.batch`. For the purge, express the delete as a subquery on `owner_user_id` + `provider` so no ID list is materialized.
- **Acceptance checks:** the repro purge with 120 and 1,000 tracks completes with `refsDeleted = n`. Run-payload and copy on a 150-placement class return 200. A regression test uses more than 100 IDs.
- **Overlap:** none with #625/#596. Shares a surface with lane D's purge-scale probe and lane C's provider purge.

### A-5 — `requireSession` re-runs for every root router mounted earlier

- **Category:** performance / D1 cost. **Severity:** P2. **Confidence:** high. **Status:** Confirmed.
- **Refs:** `apps/api/src/index.ts:170-190` mounts 14 routers at `/` (and `/classes`). Each calls `use('*', requireSession)` (`routes/class-tracks.ts:53`, `cues.ts:61`, `placed-moves.ts:56`, `sections.ts:21`, `class-plan-blocks.ts:30`, `moves.ts:82`, `tracks.ts:42`, `providers.ts:33`, `teams.ts:25`, `shares.ts:19`, `explore.ts:20`, `playlist-import.ts:24`, `classes.ts:54`). Mounted at the root, these become global middleware, as the comments at `index.ts:166-175` acknowledge. Each run calls Better Auth `getSession` (`middleware/auth.ts:15`), which reads the session and the user from D1.
- **Observed** (D1 statements counted through a proxy on `env.DB.prepare`):

  | Route | Session selects | Total statements |
  | --- | --- | --- |
  | `/auth/me` | 1 | 2 |
  | `/classes/:id` | 1 | 5 |
  | `/classes/:id/tracks` | 2 | 6 |
  | `/user-moves` | 6 | 13 |
  | `/teams` | 9 | 19 |
  | `/explore` | 11 | 23 |
  | unknown `/api/v1/nope` | 12 | 24 |

  Anonymous requests short-circuit (0).
- **Impact:** roughly 2–11× redundant D1 reads and round-trip latency on most authenticated routes, including hot builder paths: cues 2, placed moves 3, sections 4, plan blocks 5, tracks 7, provider search 8, playlist import 12. This grows linearly with every new root router and adds D1 read billing.
- **Evidence:** `repro/a-repro.integration.test.ts` test A-5; `evidence/a-repro-run.log`.
- **Test coverage:** none measures middleware fan-out. `mock-gate-leak.integration.test.ts` guards a related leak (the mock gate) only.
- **Counterevidence considered:** Better Auth `cookieCache` would avoid the D1 reads but is not enabled. Session refresh writes happen only at `updateAge`.
- **Smallest remediation direction:** memoize inside `requireSession`: if `c.get('userId')` is already set, `await next()`. Better long-term: one `api.use('*', requireSession)` with an explicit public allowlist (`/health`, `/auth/capabilities`, `/auth/session`, `/uploads/*`, `/providers/:provider/callback`).
- **Acceptance checks:** the A-5 probe reports `sessionSelects ≤ 1` on every authed route. Existing `mock-gate-leak`, `provider-callback`, and `class-cover` integration suites stay green, proving the public routes are still public.
- **Overlap:** none.

### A-2 — Any user can push classes into a verified stranger's Library; the victim cannot remove them

- **Category:** authorization / abuse (dormant community surface with live exposure). **Severity:** P2. **Confidence:** high. **Status:** Confirmed at the API.
- **Refs:** `apps/api/src/routes/shares.ts:26-114` (only the *sharer's* ownership is checked; there is no consent or acceptance step); `lib/authz.ts:220-229` (direct and team shares feed `GET /classes`); `routes/shares.ts:148-153,171-177` (revoke is owner-only); `routes/teams.ts:110-162` (any team owner adds any verified user by email). The web Library renders every `GET /classes` row and hides only owner actions (`apps/web/src/components/ClassesHome.tsx:797,810`).
- **Trigger:** an attacker with any beta account who knows the victim's email, and the victim's email is verified.
- **Observed:**
  - `stranger shares to victim email → 201`
  - the class `appears in victim GET /classes → true`
  - `victim DELETE share → 403` (the victim holds view access, so the response is 403 rather than a hidden 404)
  - `stranger adds victim to team → 201`, after which the victim's email is listed to all team members (`routes/teams.ts:90-107`)
- **Impact:** persistent, attacker-titled entries in the victim's personal Library, with no remove or leave affordance in the solo-first UI. Team adds expose the victim's email to strangers. This contradicts D20's "present the caller's own personal library" (`ritmofit_dev_plan/authorization.md:15-18`).
- **Evidence:** `repro/a-repro.integration.test.ts` test A-2.
- **Test coverage:** `launch-blockers.integration.test.ts:28-101` proves the verified-email gate only, not consent or removability.
- **Counterevidence:** the closed beta allowlist limits attackers to invited users. Sharing is not surfaced in the UI. The routes are live, though, and reachable with a session cookie.
- **Smallest remediation direction:** while D20 holds, gate the share and team **write** routes off (404 unless a feature flag is on), or exclude non-owned classes from `listVisibleClasses` for the solo-first Library. If sharing reopens, add recipient-side "leave share" / "leave team" and an accept step.
- **Acceptance checks:** a stranger's share to the victim no longer appears in the victim's Library, or the share/team writes return 404 with the flag off. Owner-path integration suites updated accordingly.
- **Overlap:** #625 adds delete-share cleanup tests (owner path). It does not address recipient removal.

### A-8 — Existing sessions survive a password reset

- **Category:** authentication. **Severity:** P2. **Confidence:** high. **Status:** Confirmed.
- **Refs:** `apps/api/src/lib/auth.ts:141-161` sets `emailAndPassword` without `revokeSessionsOnPasswordReset`. Better Auth 1.6.25 deletes sessions only when that option is true (`node_modules/better-auth/dist/api/routes/password.mjs:172`).
- **Observed:** a session minted before the reset still returns `GET /api/v1/auth/me → 200` after `/reset-password` succeeds, with `sessions rows = 1`.
- **Impact:** the standard recovery action (reset after a suspected compromise) does not evict the attacker. Compounding condition: email verification is not required to sign in (`auth.ts:163-165`). Someone who signs up first with an invited address keeps their session after the real owner resets. This chain is a hypothesis and needs knowledge of an allowlisted email.
- **Evidence:** `repro/a-repro.integration.test.ts` test A-8.
- **Test coverage:** `password-reset.integration.test.ts:28-61` checks credential rotation only.
- **Counterevidence:** session lifetime is bounded by Better Auth expiry (default 7 days, sliding), so it does not persist forever.
- **Remediation:** set `emailAndPassword.revokeSessionsOnPasswordReset: true`. Consider `requireEmailVerification: true` once beta onboarding allows it.
- **Acceptance:** extend the password-reset integration test so the pre-reset cookie gets 401 after the reset.
- **Overlap:** #625 touches live sign-out tests, which is a different path.

### A-1 — An edit-share collaborator can publish the owner's private class

- **Category:** authorization (privilege escalation inside dormant sharing). **Severity:** P3 now; P2 if sharing reopens. **Confidence:** high. **Status:** Confirmed.
- **Refs:** `packages/shared/src/entities/classes.ts:103,157`: `updateClassSchema` includes `visibility` and `featuredCategory`. `apps/api/src/routes/classes.ts:455-474`: PATCH requires only `edit`. `lib/authz.ts:106`: the public floor grants VIEW to everyone. `ritmofit_dev_plan/authorization.md:40-50` and the schema comment at `classes.ts:155` describe publishing as an **owner** act, while the operations table (`authorization.md` "Update class fields: EDIT") does not carve out visibility.
- **Observed:**
  - `collaborator PATCH visibility=public → 200`
  - then a stranger gets `GET class → 200`, `run-payload → 200`, `copy → 201`, and the class shows in Explore
  - revoking the collaborator's share does **not** unpublish
- **Impact:** an editor can expose the owner's full choreography and cloned provider refs to every user, and the exposure survives revocation. Exploitable only after the owner grants an edit share, which the UI does not offer today.
- **Evidence:** test A-1. **Coverage:** `authz.integration.test.ts:284-309` covers owner publishing only.
- **Counterevidence:** under D20, no edit shares should exist in production unless created via the raw API.
- **Remediation:** in PATCH, require `owner` when the body contains `visibility` (and `featuredCategory`), or move visibility to an owner-only endpoint.
- **Acceptance:** an editor PATCH with `visibility` returns 403. Owner publishing still passes.

### A-3 — Share/team-add by email is an account-existence and verification oracle

- **Severity:** P3. **Status:** Confirmed.
- **Refs:** `apps/api/src/lib/share-target.ts:31-33`, `routes/shares.ts:59-65`, `lib/member-target.ts:24-27`, `routes/teams.ts:135-141`.
- **Observed:** three distinguishable responses:
  - unknown email → `422 VALIDATION_ERROR "No user with that email."`
  - unverified → `422 EMAIL_NOT_VERIFIED`
  - verified → `201`
- **Impact:** any beta user can enumerate which emails hold accounts and whether each is verified. Password reset deliberately hides existence (`password-reset.integration.test.ts:63-70`); this route undoes that. Not rate-limited.
- **Remediation:** return one generic outcome for unknown and unverified targets, and rate-limit share/team writes. Moot if A-2's flag-off remedy is taken.
- **Acceptance:** identical status, code, and message for unknown and unverified emails.

### A-4 — A team admin can mint owner-role members

- **Severity:** P3 (dormant). **Status:** Confirmed.
- **Refs:** `packages/shared/src/entities/identity.ts:68` (`role: teamRoleSchema` admits `'owner'`), `routes/teams.ts:152`, `lib/team-authz.ts:52` (`role === 'owner'` counts as a manager).
- **Observed:** `admin adds member with role=owner → 201`; roles become `["owner","admin","owner"]`; then `minted owner removes admin → 204`.
- **Remediation:** restrict `addTeamMemberSchema.role` to `admin | member`, and allow `admin` only when the caller `isOwner`.
- **Acceptance:** an admin adding `role:'owner'` gets 422 or 403.

### A-6 — An edit collaborator cannot change any placement that references the owner's custom move

- **Category:** functional authz bug (dormant collaboration). **Severity:** P3. **Status:** Confirmed.
- **Refs:** `apps/api/src/routes/placed-moves.ts:136-143`: the merged row re-validates the existing `userMoveId` against the caller via `assertValidMoveRefs` at `placed-moves.ts:29-53`.
- **Observed:** a PATCH of only `anchorMs` returns `422 "userMoveId does not reference one of your moves."`
- **Remediation:** validate ref ownership only when `moveId` / `userMoveId` is present in the patch body.
- **Acceptance:** an editor can move the anchor, and still cannot attach a foreign `userMoveId`.

### A-10 — Read-then-write without conflict mapping returns 500 under concurrency

- **Severity:** P3. **Status:** Probable (code path; not reproduced, since concurrency is nondeterministic in Miniflare).
- **Refs:**
  - `apps/api/src/routes/class-plan-blocks.ts:88-111`: append uses `position = current.length` against the unique `(class_id, position)` index (`apps/api/src/db/schema.ts:237`). Two concurrent appends, or any position gap, raise an unmapped UNIQUE error, which becomes 500. `ordered-class-import.ts:487-492` documents the gap case.
  - `routes/cues.ts:116-145` and `routes/placed-moves.ts:132-169`: PATCH after a concurrent DELETE dereferences `updated[0]!` / `existing!`, producing a 500 instead of a 404.
- **Remediation:** use `max(position)+1` inside an `INSERT … SELECT`, map `isUniqueViolation` to 409, and return 404 when `returning()` is empty.

### A-11 — `GET /auth/capabilities` missing from the OpenAPI registry

- **Severity:** P3. **Status:** Confirmed.
- **Evidence:** a scripted diff of mounted route literals against `apps/api/openapi/openapi.json` path keys left exactly one route in code but not in the spec: `GET /auth/capabilities` (`apps/api/src/routes/auth.ts:20-29`). The spec has no route without code.
- **Remediation:** register the path and response schema in `apps/api/scripts/generate-openapi.ts`.

## 4. Commands run (exit codes)

| Command (cwd) | Exit |
| --- | --- |
| `git rev-parse HEAD && git status --porcelain` (`/workspace`) | 0 (clean apart from the audit dir) |
| `git -C /workspace worktree add /tmp/wt-a HEAD` | 0 |
| `pnpm install --frozen-lockfile --offline` (`/tmp/wt-a`) | 0 |
| `npx vitest run --config vitest.integration.config.ts test/a-repro.integration.test.ts` (`/tmp/wt-a/apps/api`), run 1 | 1 (one wrong expectation: 404 vs 403 for the victim revoke; corrected) |
| same, run 2 (after the ASCII/expectation fix) | 1 (syntax error from the quote replacement; fixed) |
| same, run 3 (6 tests) | 0 |
| same, final (7 tests, adds A-8) | 0 |
| `npx vitest run … test/a-migration-rebuild.integration.test.ts` (2 tests) | 0 |
| `npx vitest run … test/a-param-limit.integration.test.ts` (probe, then 3 tests) | 0, 0 |
| Route-literal vs `openapi.json` diff (python, read-only) | 0 |
| `grep` / `rg` / file reads across `apps/api`, `packages/shared`, `ritmofit_dev_plan`, `node_modules/better-auth/dist` | 0 |
| `git add -N apps/api/test/a-*.ts && git diff > …/repro/a-repro.patch` (in `/tmp/wt-a` only) | 0 |
| `git -C /workspace worktree remove --force /tmp/wt-a` | 0 |
| `git -C /workspace status --porcelain` (final) | 0: `?? docs/audits/codex-code-audit-2026-10-27-4e0b150/` only |

To reproduce: `git worktree add /tmp/wt-a 4e0b150 && cd /tmp/wt-a && pnpm install --frozen-lockfile --offline && git apply <audit>/repro/a-repro.patch && cd apps/api && npx vitest run --config vitest.integration.config.ts test/a-repro.integration.test.ts test/a-migration-rebuild.integration.test.ts test/a-param-limit.integration.test.ts`.

## Appendix — rejected candidates

| ID | Candidate | Reason rejected |
| --- | --- | --- |
| R-1 | Missing `requireAccess` on some class-scoped route | Swept every handler. All class-scoped handlers gate through `requireAccess` / `requireClassTrackAccess` / `requireCueAccess` / `requireClassTrackMoveAccess` / `requireSectionAccess` / `requirePlanBlockAccess`. Owner-scoped resources check ownership. `nested-resource-access` and `class-route-access` integration suites cover this. |
| R-2 | IDOR via foreign `trackId` / `planBlockId` / `userMoveId` on nested writes | Each foreign reference is checked: track owner (`class-tracks.ts:186-197`, `ordered-class-import.ts:246`), block class (`class-tracks.ts:170-179,276-284`, `ordered-class-import.ts:223`), user-move owner (`placed-moves.ts:39-51`). Copies clone foreign tracks and snapshot foreign move names. |
| R-3 | OAuth account-linking pre-hijack (attacker password account + victim social sign-in) | Better Auth 1.6.25 `requireLocalEmailVerified` defaults to true (`oauth2/link-account.mjs:22-23`), so implicit linking to an unverified local account is refused. |
| R-4 | CSRF on `/api/v1` JSON routes (`c.req.json()` ignores Content-Type) | No state-changing GET except the state-cookie-bound OAuth callback. The session cookie is Better Auth's default `SameSite=Lax`, the SPA is same-origin, and there are no sibling subdomains. Defence-in-depth only: an Origin check on mutating `/api/v1` routes would harden it. |
| R-5 | Open redirect via password-reset `redirectTo` | `request-password-reset` with `https://evil.example/...` returns **403** (Better Auth origin check against `trustedOrigins`; test A-8 log). |
| R-6 | Reset and verify links logged in production | Only when `RESEND_API_KEY` is unset (`lib/email.ts:59-61`). `lib/health.ts:23` reports the missing secret, so the condition is monitored. |
| R-7 | OAuth callback login-CSRF / connection swap | The callback requires the encrypted, expiring state cookie set on the initiating user's browser, with matching `state` and `provider` (`provider-connections.ts:286-305`). A victim lacks the attacker's cookie, so the flow fails. |
| R-8 | Public cover uploads serving attacker HTML | MIME allowlist, server-chosen extension, `nosniff`, and global `default-src 'none'` CSP on Worker responses. Content is not sniffed, but the browser will not render it as HTML. |
