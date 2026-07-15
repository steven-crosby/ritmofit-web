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
post-launch to enable one-tap tempo fill (owner deferral, 2026-06-28). **BPM lookup is built but unprovisioned** (`GETSONGBPM_API_KEY` not set — activate at will); **Google sign-in is unprovisioned** (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` not set — activate when credentials are provisioned). Both tracked in `DEVELOPMENT_PLAN.md` → "Known deferred post-launch features."

## Pre-deploy

1. On `main`, clean tree, in sync with origin; the change is merged.
2. Run the CI-equivalent gates (also enforced by `.github/workflows/ci.yml`):
   ```bash
   pnpm format:check
   pnpm -r typecheck
   pnpm lint
   (cd ritmofit_design_system && npm run verify)
   pnpm test
   pnpm --filter @ritmofit/api test:integration
   pnpm --filter @ritmofit/web build
   pnpm --filter @ritmofit/api openapi
   git diff --exit-code apps/api/openapi/openapi.json
   pnpm --filter @ritmofit/api contract-parity
   pnpm audit:ci
   ```
3. Record the current live Worker version for rollback:
   `pnpm --filter @ritmofit/api exec wrangler deployments status`.
4. Check remote D1 migration state:
   `pnpm --filter @ritmofit/api exec wrangler d1 migrations list ritmofit --remote`.
5. Confirm `BETA_ALLOWED_EMAILS` appears in `wrangler secret list` (name only). Production HTTPS
   intentionally rejects every new account when the secret is absent; never print the allowlist.

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

Note the printed **Current Version ID** and the built SPA entry-asset hash. They prove different parts
of the single-origin release: the version identifies Worker code/bindings, while the asset hash identifies
the served SPA. Never infer that checking only one proves production matches the merged commit.

## Post-deploy smoke

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/                      # SPA → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/health         # → 200
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/classes        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/explore        # unauth → 401
curl -s -o /dev/null -w "%{http_code}\n" https://ritmofit.studio/api/v1/teams          # unauth → 401
curl -s -D - -o /dev/null https://ritmofit.studio/api/v1/health | \
  grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer|permissions'  # headers present
curl -s "https://ritmofit.studio/?release-check=$(date +%s)" | \
  grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'                                      # matches built hash
```

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
