# Production Deployment & Recovery Runbook

Canonical operational procedure for the single Cloudflare Worker that serves `https://ritmofit.studio`
(API at `/api/*` + the built SPA from `apps/web/dist`). Deployments are **manual and production-facing** —
get owner confirmation before deploying (`AGENTS.md`). All commands run from the repo root unless noted;
API-scoped Wrangler commands use `pnpm --filter @ritmofit/api exec wrangler …`.

## Environment matrix

| Where                             | Contents                                                                                                                                                               | Notes                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/wrangler.toml` `[vars]` | `BETTER_AUTH_URL`, `WEB_ORIGIN` (both `https://ritmofit.studio`)                                                                                                       | Committed, non-secret. The session cookie binds to `BETTER_AUTH_URL`.               |
| Worker secrets (prod)             | `BETTER_AUTH_SECRET`, `BETA_ALLOWED_EMAILS`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SOUNDCLOUD_CLIENT_ID`/`_SECRET`, `SPOTIFY_CLIENT_ID`/`_SECRET`, Apple sign-in (`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` or static `APPLE_CLIENT_SECRET`), Apple Music (`APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_PRIVATE_KEY` or static `APPLE_MUSIC_DEVELOPER_TOKEN`) | `BETA_ALLOWED_EMAILS` is the private-beta account-creation allowlist. `wrangler secret list` shows names only. Never echo values in terminal logs or docs. |
| D1                                | database `ritmofit`, bound as `DB`                                                                                                                                     | Forward-only Drizzle migrations under `apps/api/migrations`. For the live level, run `pnpm --filter @ritmofit/api exec wrangler d1 migrations list ritmofit --remote` (don't trust a number hard-coded here). |
| Local dev                         | `apps/api/.dev.vars` (gitignored), `MOCK_PROVIDERS=true`, no `RESEND_API_KEY` (email logs to console)                                                                  | Never commit secrets.                                                               |

`MOCK_PROVIDERS` is unset in prod (live providers). **Auth target: email/password + Apple + Google
sign-in** on both web and iOS. Apple sign-in uses Better Auth plus a Worker-signed ES256 client-secret
JWT. Set `APPLE_CLIENT_ID` (the web Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and
`APPLE_PRIVATE_KEY`; the legacy/static `APPLE_CLIENT_SECRET` fallback is accepted but expires and should
not be the default. The web Apple callback must be registered in Apple as
`https://ritmofit.studio/api/auth/callback/apple`. Google remains credential-gated by
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.

Apple Music is separate from Apple sign-in. Prefer `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, and
`APPLE_MUSIC_PRIVATE_KEY` so the Worker signs the developer token; `APPLE_MUSIC_DEVELOPER_TOKEN` remains
as a static fallback. Optional `APPLE_MUSIC_STOREFRONT` defaults to `us`.

SoundCloud OAuth connect uses `https://ritmofit.studio/api/v1/providers/soundcloud/callback` unless
`SOUNDCLOUD_REDIRECT_URI` overrides it. Spotify supports **both** server-side catalog/playlist search
(the client-credentials pair) **and** a per-user confidential Authorization Code connection. The
canonical scope set lives in `packages/music/src/spotify-oauth.ts`; it covers saved-library reads,
saved-playlist reads, and official Web Playback SDK/Connect playback. Do not duplicate the scope string
in this runbook. The callback is
`https://ritmofit.studio/api/v1/providers/spotify/callback` unless `SPOTIFY_REDIRECT_URI` overrides it,
and the registered Spotify dashboard URI must match exactly. There is still **no Spotify BPM path**
(permanent constraint — `music-providers.md`). Apple Music per-user connect uses **MusicKit JS** in the browser (no
redirect or new secret beyond the existing Apple Music developer-token creds): the SPA mints a
Music-User-Token and `POST`s it to `/providers/apple_music/connection`, stored encrypted.

Redirect-OAuth callbacks are top-level browser navigations, so the SPA's PWA service worker must keep
`/api/` in its `navigateFallbackDenylist`; otherwise the callback is captured by the SPA fallback.
Apple Music authorizes in-page and does not use this redirect path. Provider verification history belongs
in `HISTORY.md`; re-run the relevant live connect/playback checks after provider or auth changes instead
of treating an old verification note as current state.

**Optional automatic BPM lookup** (GetSongBPM) is likewise unprovisioned: `GETSONGBPM_API_KEY` is not
set in prod, so `POST /tracks/:id/bpm-lookup` returns a `503` with an instructor-facing fallback
message and manual BPM entry covers the loop. Set the key via
`pnpm --filter @ritmofit/api exec wrangler secret put GETSONGBPM_API_KEY`
post-launch to enable one-tap tempo fill (owner deferral, 2026-06-28). **BPM lookup is built but unprovisioned** (`GETSONGBPM_API_KEY` not set — activate at will); **Google sign-in is unprovisioned** (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` not set — activate when credentials are provisioned). Both tracked in `DEVELOPMENT_PLAN.md` → "Backlog / Open Items" → "Deferred (owner decision)."

## Pre-deploy

Deploy with `scripts/deploy.sh`. It is the procedure below; do not run the gates and `wrangler deploy`
by hand unless you are debugging the script itself.

```bash
scripts/deploy.sh --self-check   # local guards only; does not deploy or call Cloudflare
scripts/deploy.sh                 # clean tree whose HEAD is origin/main
scripts/deploy.sh <sha>           # clean tree; HEAD may differ from origin/main
```

The script fetches `origin main` and refuses when `git status --porcelain` is not empty, with or
without a SHA. A SHA does not override a dirty tree. With no SHA it also refuses unless `HEAD`
equals `origin/main`. A SHA deploys that commit from a clean tree whose HEAD is not `origin/main`.

The script then refuses unless `node -v`'s major matches `.nvmrc` (the file is `22`; Node 24 or 26
does not pass). It compares `wrangler secret list --format json` **names** to
`scripts/required-secrets.txt` and prints only missing requirement lines. It never prints secret
values, the raw list, or the allowlist. `BETA_ALLOWED_EMAILS` is one of those required names;
production HTTPS rejects every new account when it is absent.

`scripts/required-secrets.txt` is the committed list. Google sign-in and `GETSONGBPM_API_KEY` are
intentionally omitted (still unprovisioned). Apple sign-in accepts either the team/key/private-key
trio or static `APPLE_CLIENT_SECRET`. Apple Music accepts either its team/key/private-key trio or
static `APPLE_MUSIC_DEVELOPER_TOKEN`.

Before the gates, the script records `wrangler deployments status` (the rollback version) and lists
remote D1 migrations. If any migration is unapplied it exits. It does not apply migrations.

## Deploy

**Migrations before code.** If the change adds migrations, apply them to remote D1 _before_
`scripts/deploy.sh`, so the new code never runs against an un-migrated database. The script only
lists; it will not continue while any are unapplied, and it will not apply them:

```bash
pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote
scripts/deploy.sh
```

### Expand-only migrations

Migrations only add tables, columns, or indexes. Apply them with the command above, then
`scripts/deploy.sh`. The script only lists remote D1. It will not continue while any migration is
unapplied, and it does not apply migrations.

A drop, a rename, or a type change that loses data waits for a later deploy. Ship it only after the
Worker that is running no longer depends on the old table, column, or type. The previous Worker has
to keep running against the schema you just applied, so rolling back to that previous version is
safe. Leave D1 where it is: `wrangler rollback` does not un-apply a migration.

### /tmp worktree

The script does not build the checkout you invoke it from. After it resolves the commit, it creates
a detached worktree at `/tmp/ritmofit-deploy.<random>` (`git worktree add --detach`) and runs
`pnpm install --frozen-lockfile`, the gates, the SPA build, and `wrangler deploy` there. On exit it
`git worktree remove --force`s that path. A dirty tree always refuses, so a dirty lane checkout
cannot be what gets uploaded. With no SHA, HEAD must also equal `origin/main`. A SHA is only how a
clean checkout deploys a commit that is not `origin/main`.

### Design system

`ritmofit_design_system` is not a workspace package. It has no dependencies and no lockfile, so
there is no `npm ci` for it. Do not add an install step. The gate is
`(cd ritmofit_design_system && npm run verify)`, and it runs with node only.

The script runs the CI-equivalent gates (the same list as `.github/workflows/ci.yml`, including one
web build), then builds the SPA again, then deploys. `pnpm --filter @ritmofit/api run deploy` is
only `wrangler deploy` and does not build web or set a message. The shell script calls:

```bash
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api exec wrangler deploy --message <short-sha>
```

Note the printed **Current Version ID** and the built SPA entry-asset hash (`built entry:` in the
script log). They prove different parts of the single-origin release: the version identifies Worker
code/bindings, while the asset hash identifies the served SPA. Never infer that checking only one
proves production matches the merged commit.

## Post-deploy smoke

The script runs this after `wrangler deploy`. It is not a second manual checklist.

**One agreeing fetch is not enough.** During the propagation window, edge nodes hold different
versions of `index.html`, so cache-busted fetches **alternate** between the old and new entry — a
single check can hit either and tell you nothing. The script reads the built entry from
`apps/web/dist/index.html` in the deploy worktree, then fetches
`https://ritmofit.studio/?cb=…` with `Cache-Control: no-cache` up to **30** times, sleeping 10
seconds between tries. It continues until **three consecutive** fetches match the built entry. If
that does not happen, it exits 1 and prints every hash it saw (`(none)` when a response had no
entry).

Observed 2026-07-27 on Worker `75fc1b8d`: the first post-deploy fetch returned the **previous**
entry, then four cache-busted fetches alternated old/new/old/new before settling a couple of minutes
later. Thirty tries covers that window. Only once it has settled is a mismatch worth investigating.

It then checks the fixed status list in `scripts/production-smoke.txt` (status only; response bodies
are not printed):

| URL                                      | Expected |
| ---------------------------------------- | -------- |
| `https://ritmofit.studio/`               | 200      |
| `https://ritmofit.studio/api/v1/health`  | 200      |
| `https://ritmofit.studio/api/v1/classes` | 401      |
| `https://ritmofit.studio/api/v1/explore` | 401      |
| `https://ritmofit.studio/api/v1/teams`   | 401      |

On `GET /api/v1/health` it also requires these response-header names: Strict-Transport-Security,
Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy. It prints the matching header lines only.

Also smoke mounted launch routes so accidental route regressions show up as something other than
`404 NOT_FOUND`: class shares, playlist import, cover upload serving, provider search/import, and the
class cover/tag endpoints should reach their real handlers and fail as `401`/`403`/validation/domain
errors when unauthenticated or given invalid test data.

For UI-affecting changes, also run the browser smokes against a local stack (see
`apps/web/smoke/README.md`). Confirm the new Worker version with
`pnpm --filter @ritmofit/api exec wrangler deployments status`, and independently confirm the served
SPA entry hash matches the build. A matching Worker version does not prove static-asset alignment, and a
matching SPA hash does not prove the API Worker is current.

## Tail watch

After `scripts/deploy.sh` exits 0, watch live logs for about 5 minutes. The script does not tail.

```bash
pnpm --filter @ritmofit/api exec wrangler tail
```

Stop the tail (Ctrl-C) when those 5 minutes are up. Do not copy cookies, tokens, or authorization
headers out of the output. Read the HTTP status on each event. A `5xx` the Worker returned still
counts when the invocation did not throw. An uncaught error counts as an exception.

Stop and roll the Worker back (see Rollback / recovery) when the tail shows any of these:

- An exception.
- A burst of `5xx` responses.
- A failed health check. `/api/v1/health` has to stay `200`. `503` with `status: "unavailable"` is a
  failed health check.
- An auth failure that is not an expected unauthenticated `401`. Those `401`s are the smoke-list
  routes with no session: `/api/v1/classes`, `/api/v1/explore`, and `/api/v1/teams`. A `401` on a
  public route (`/` or `/api/v1/health`), or a failure from sign-in, a callback, or an authenticated
  request, means stop and roll back.

A quiet tail is not a substitute for the smoke checks above. The propagation loop, the status list
in `scripts/production-smoke.txt`, and the security-header check still have to pass. The tail only
shows requests that arrived while it was running.

## Authed production smoke

The curls above are unauthenticated. They do not prove a session, an authed D1 read, or that the
dedicated QA beta account can still use Spotify. After that public smoke, run this check. It does
not replace the deploy procedure.

The session token for that account lives only in `apps/api/.qa-beta-token`. `.gitignore` lists
`apps/api/.qa-beta-token`. Never commit the file, print the token, or paste it into a log. The file
is one line: the session cookie value, or a single assignment. Production https uses
`__Secure-better-auth.session_token`. `http` and `localhost` use `better-auth.session_token`.
Either name is accepted in the file. Lines that start with `#` are comments. The account
is an allowlisted beta user with a working Spotify connection, not a personal session.

```bash
pnpm --filter @ritmofit/api exec tsx scripts/authed-production-smoke.ts
```

`SMOKE_BASE_URL` overrides the default `https://ritmofit.studio`. The script sends
`__Secure-better-auth.session_token` when that base URL is https, and
`better-auth.session_token` for http and localhost. It prints paths and status codes only.
It exits non-zero unless both of these return 200:

- `GET /api/v1/classes`
- the Spotify connection check, `GET /api/v1/providers/spotify/playlists` (the stored grant can list
  that account's playlists; the body is discarded)

401 means the token is missing or expired. 409 on the Spotify check means that account needs to
reconnect Spotify. A redirect is not followed and does not count as 200.

`GET /api/v1/health` stays public. It runs D1 `SELECT 1` and includes `database` plus a `secrets`
object of booleans for required-secret presence. It never returns secret values. A missing database
binding or a failed `SELECT 1` responds **503** with `status: "unavailable"` and `database: false`,
so it does not look healthy. HTTP 200 on `/api/v1/health` means the probe returned a row. A false
secret boolean is reported as `false` and does not by itself change that status.

## Rollback / recovery

Both paths are verified available for these production resources.

### Worker code rollback

Cloudflare retains prior Worker versions. Use this after an expand-only migration too: the previous
Worker still matches the new schema. To revert code to a known-good version:

```bash
pnpm --filter @ritmofit/api exec wrangler deployments list     # find the last-good Version ID
pnpm --filter @ritmofit/api exec wrangler rollback <version-id> -m "reason"
```

This re-publishes that version's code **and bindings**; it does **not** touch D1 data.

### D1 point-in-time restore (data recovery)

D1 Time Travel keeps ~30 days of history. To inspect or restore:

```bash
pnpm --filter @ritmofit/api exec wrangler d1 time-travel info ritmofit          # current bookmark
pnpm --filter @ritmofit/api exec wrangler d1 time-travel restore ritmofit \
  --bookmark=<bookmark>           # or --timestamp=<ISO8601>
```

### Migration interaction (important)

Drizzle migrations are **forward-only** and are never rewritten after application. A Worker rollback
does **not** un-apply a migration. Follow the expand-only rule: the migration only added tables,
columns, or indexes, so the previous Worker still runs on the new schema. Roll the **code** back to
the prior version and leave D1 where it is.

If a migration was destructive anyway, and the previous Worker cannot read the new schema, restore
D1 with Time Travel to just before that migration **and** roll the code back. Then fix forward with
a corrected expand-only migration. Do both together so code and schema stay compatible.

### Rollback rehearsal

**Run this only when the owner asks.** It moves production back to an older Worker version, then
deploys that commit forward again. It is not part of a normal deploy.

`<previous-version-id>` is the Version ID to roll back to. Use the line `scripts/deploy.sh` printed
as `current Worker version (rollback target)` before the deploy, or a row from
`wrangler deployments list`. `<sha>` is the commit to put back in front, deployed from a clean tree
with `scripts/deploy.sh`. Do not run `wrangler deploy` yourself.

Roll the Worker back:

```bash
pnpm --filter @ritmofit/api exec wrangler deployments list
pnpm --filter @ritmofit/api exec wrangler rollback <previous-version-id> -m "rollback rehearsal"
```

That re-publishes the named version's code and bindings. It does not touch D1, and it does not run
the script's smoke. Run the smoke checks below before going forward. If they fail, stop.

Deploy forward again:

```bash
scripts/deploy.sh <sha>
```

The script's upload line, which you do not run yourself, is:

```bash
pnpm --filter @ritmofit/api exec wrangler deploy --message <short-sha>
```

The script then runs the propagation loop, `scripts/production-smoke.txt`, and the security-header
check. When it exits 0, confirm the smoke checks below and run the tail watch.

#### Smoke checks after each direction

Run these after the rollback, and again after the forward deploy:

- `pnpm --filter @ritmofit/api exec wrangler deployments status` shows the version just published,
  at 100%. After rollback that is `<previous-version-id>`. After the forward deploy it is the
  version the script just uploaded.
- The status list in `scripts/production-smoke.txt`: `/` and `/api/v1/health` return `200`;
  `/api/v1/classes`, `/api/v1/explore`, and `/api/v1/teams` return `401`.
- `GET /api/v1/health` carries the security-header names from Post-deploy smoke:
  Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy.
- Three consecutive cache-busted fetches of `https://ritmofit.studio/?cb=…` with
  `Cache-Control: no-cache`, 10 seconds apart, agree on that version's SPA entry hash. After
  rollback, the hash is the previous release's entry. One agreeing fetch is not enough.
- When `apps/api/.qa-beta-token` is present, run the authed production smoke. Do not print the
  token.

On the way forward, `scripts/deploy.sh` already runs the status list, the header check, and the
propagation loop before it exits. Still confirm `wrangler deployments status`, still run the authed
smoke when the token file is present, and still watch the tail. On the way back, `wrangler rollback`
runs none of those checks.

## References

- Manual deploy + migration ordering: `AGENTS.md` › "Security And Deployment".
- Deploy chronology: `ritmofit_dev_plan/HISTORY.md` (the archived
  `ritmofit_dev_plan/archive/REVIEW_HISTORY.md` holds the pre-launch remediation log) — one dated entry
  per production deploy or material production-state finding. Determine current live state with the
  commands in this runbook rather than a historical entry.
- Session close hygiene: `agent-prompts/daily/close-session.md`.
