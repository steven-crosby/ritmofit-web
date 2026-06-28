# Production Deployment & Recovery Runbook

Canonical operational procedure for the single Cloudflare Worker that serves `https://ritmofit.studio`
(API at `/api/*` + the built SPA from `apps/web/dist`). Deployments are **manual and production-facing** —
get owner confirmation before deploying (`AGENTS.md`). All commands run from the repo root unless noted;
API-scoped Wrangler commands use `pnpm --filter @ritmofit/api exec wrangler …`.

Owner / deployer: `steven.crosby09@gmail.com` (Cloudflare account holder).

## Environment matrix

| Where                             | Contents                                                                                                                                                               | Notes                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/wrangler.toml` `[vars]` | `BETTER_AUTH_URL`, `WEB_ORIGIN` (both `https://ritmofit.studio`)                                                                                                       | Committed, non-secret. The session cookie binds to `BETTER_AUTH_URL`.               |
| Worker secrets (prod)             | `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SOUNDCLOUD_CLIENT_ID`/`_SECRET`, `SPOTIFY_CLIENT_ID`/`_SECRET`, `APPLE_MUSIC_DEVELOPER_TOKEN` | `wrangler secret list` (names only). Already provisioned — do **not** re-provision. |
| D1                                | database `ritmofit`, bound as `DB`                                                                                                                                     | Forward-only Drizzle migrations under `apps/api/migrations`. For the live level, run `wrangler d1 migrations list ritmofit --remote` (don't trust a number hard-coded here). |
| Local dev                         | `apps/api/.dev.vars` (gitignored), `MOCK_PROVIDERS=true`, no `RESEND_API_KEY` (email logs to console)                                                                  | Never commit secrets.                                                               |

`MOCK_PROVIDERS` is unset in prod (live providers). **Auth target: email/password + Apple + Google
sign-in** on both web and iOS. Apple/Google are implemented (Better Auth providers; the iOS Sign in
with Apple button is built), but their **prod secrets are not yet provisioned**, so the live Login UI
is **currently email/password only** until `APPLE_CLIENT_ID`/`APPLE_CLIENT_SECRET` (and the Google
client secrets) are set via `wrangler secret put`. This is a pending provisioning step, not a
permanent exclusion.

**Optional automatic BPM lookup** (GetSongBPM) is likewise unprovisioned: `GETSONGBPM_API_KEY` is not
set in prod, so `POST /tracks/:id/bpm-lookup` returns a `503` with an instructor-facing fallback
message and manual BPM entry covers the loop. Set the key via `wrangler secret put GETSONGBPM_API_KEY`
post-launch to enable one-tap tempo fill (owner deferral, 2026-06-28). Both BPM and Apple/Google are
tracked as deferrals in `web-launch-readiness.md`.

## Pre-deploy

1. On `main`, clean tree, in sync with origin; the change is merged.
2. Run the CI-equivalent gates (also enforced by `.github/workflows/ci.yml`):
   ```bash
   pnpm format:check
   pnpm -r typecheck
   pnpm lint
   pnpm test
   pnpm --filter @ritmofit/api test:integration
   pnpm --filter @ritmofit/web build
   pnpm --filter @ritmofit/api openapi
   git diff --exit-code apps/api/openapi/openapi.json
   pnpm audit:ci
   ```
   For launch candidates, also run the design-system and contract parity checks used by CI:
   ```bash
   (cd ritmofit_design_system && npm run verify)
   pnpm --filter @ritmofit/api contract-parity
   ```
3. Record the current live version for rollback (see below): `wrangler deployments status`.
4. Check remote D1 migration state: `wrangler d1 migrations list ritmofit --remote`.

## Deploy

**Migrations before code.** If the change adds migrations, apply them to remote D1 _first_ so the
new code never runs against an un-migrated database:

```bash
pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote
```

Then build the SPA (the `deploy` script is just `wrangler deploy`; it does **not** build web) and deploy:

```bash
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api run deploy
```

Note the printed **Current Version ID** — that is the new live version.

## Post-deploy smoke

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/                      # SPA → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/health         # → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/classes        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/explore        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/teams          # unauth → 401
curl -s -D - -o /dev/null https://ritmofit.studio/api/v1/health | \
  grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer|permissions'  # headers present
curl -s https://ritmofit.studio/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'          # matches the built hash
```

Also smoke mounted launch routes so accidental route regressions show up as something other than
`404 NOT_FOUND`: class shares, playlist import, cover upload serving, provider search/import, and the
class cover/tag endpoints should reach their real handlers and fail as `401`/`403`/validation/domain
errors when unauthenticated or given invalid test data.

For UI-affecting changes, also run the browser smokes against a local stack (see
`apps/web/smoke/README.md`). Confirm the new Worker version: `wrangler deployments status`.

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

- Manual deploy + migration ordering: `AGENTS.md` › "Security, Deployment & Session Close".
- Deploy history of record: `ritmofit_dev_plan/HISTORY.md` (the archived `ritmofit_dev_plan/archive/REVIEW_HISTORY.md`
  holds the pre-launch remediation log) — one dated entry per production deploy.
- Session close hygiene: `agent-prompts/daily/close-session.md`.
