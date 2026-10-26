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
scripts/deploy.sh <sha>           # that commit, even if the invoking tree is dirty
```

With no SHA, the script fetches `origin main` and refuses unless `git status --porcelain` is empty
and `HEAD` equals `origin/main`. An explicit SHA skips that refusal and deploys that commit.

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

### /tmp worktree

The script does not build the checkout you invoke it from. After it resolves the commit, it creates
a detached worktree at `/tmp/ritmofit-deploy.<random>` (`git worktree add --detach`) and runs
`pnpm install --frozen-lockfile`, the gates, the SPA build, and `wrangler deploy` there. On exit it
`git worktree remove --force`s that path. A dirty lane tree cannot be what gets uploaded. With no
SHA, the invoking checkout must still be clean and equal `origin/main`, so the commit you think you
are on is the commit it deploys.

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

## Rollback / recovery

Both paths are verified available for these production resources.

### Worker code rollback (no schema change)

Cloudflare retains prior Worker versions. To revert code to a known-good version:

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
does **not** un-apply a migration. If a bad deploy included a migration:

1. Roll the **code** back to the prior version (above) if the old code is compatible with the new schema
   (additive migrations usually are), **or**
2. If the schema change is breaking, restore D1 with Time Travel to just before the migration **and**
   roll the code back — then fix forward with a corrected migration. Coordinate both so code and schema
   stay compatible.

## References

- Manual deploy + migration ordering: `AGENTS.md` › "Security And Deployment".
- Deploy chronology: `ritmofit_dev_plan/HISTORY.md` (the archived
  `ritmofit_dev_plan/archive/REVIEW_HISTORY.md` holds the pre-launch remediation log) — one dated entry
  per production deploy or material production-state finding. Determine current live state with the
  commands in this runbook rather than a historical entry.
- Session close hygiene: `agent-prompts/daily/close-session.md`.
