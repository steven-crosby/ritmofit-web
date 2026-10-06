---
prompt: technical/stability
repo: ritmofit-web
agent: claude (opus)
date: 2026-06-26
inspected_head: 1130438acb1692b8ffed5c258466ccd4636e78ad
inspected_range: full-repo
completed: true
prs:
  - https://github.com/steven-crosby/ritmofit-web/pull/115
---

# technical/stability — 2026-06-26

## Summary

Inspected the stability hotspots named in the prompt (provider/network `boundFetch`
injection, unhandled fetch/D1 paths, skipped/empty tests, run-payload nullability). Found
one ship-relevant production bug: `sendEmail` (`apps/api/src/lib/email.ts`) defaulted its
injectable `fetchImpl` to the bare global `fetch`, and Better Auth's password-reset and
email-verification hooks call it without an explicit impl. A detached global `fetch` throws
`TypeError: Illegal invocation` in the production Workers runtime — the exact failure
`lib/fetch.ts`'s `boundFetch` exists to prevent — so transactional emails fail in prod
whenever `RESEND_API_KEY` is set, while local dev (miniflare) and the existing tests (which
always inject a fake impl) stay green. Opened one small DRAFT PR with a failing regression
test plus the one-line default fix. Needs owner review/merge; nothing else needs attention
today.

## Commands run + results

Full CI-equivalent submission gate, all green:

- `pnpm format:check` → pass (all files match Prettier style)
- `pnpm -r typecheck` → pass (shared, music, web, api)
- `pnpm lint` → pass (eslint clean)
- `pnpm test` → pass (api 235 tests across 27 files; web suites green)
- `pnpm --filter @ritmofit/api test:integration` → pass (64 tests, 14 files)
- `pnpm --filter @ritmofit/web build` → pass (built in ~2.1s)
- `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code …/openapi.json` → clean
- `pnpm audit:ci` → exit 0 (only documented dev/build advisories, all ignored)

Bug-reproduction evidence: temporarily reverting the default to `= fetch` makes the new
regression test fail (1 failed / 5 passed); with `= boundFetch` it passes (6/6).

## Findings

- **[P1] `sendEmail` defaults to bare global `fetch`, breaking prod reset/verify email** —
  `apps/api/src/lib/email.ts:51` (pre-fix)
  - Evidence: `fetchImpl: FetchLike = fetch`; callers `auth.ts:72` (`sendResetPassword`)
    and `auth.ts:92` (`sendVerificationEmail`) pass no impl. `lib/fetch.ts` documents that
    a detached global `fetch` throws `Illegal invocation` in the Workers runtime; every
    other production network seam (music registry, bpm-lookup, user-likes,
    provider-connections) injects `boundFetch`. Email was the lone exception. Existing
    tests masked it by always injecting a fake `fetchImpl`.
  - User impact: password-reset and email-verification emails fail to send in production
    (any environment with `RESEND_API_KEY` set); users can't reset passwords or verify
    email. Silent — local/dev and CI stay green.
  - Recommended owner: api
  - Recheck next run? no (fixed in this PR; regression test now guards the default)

No other PR-worthy stability defects found this run: no `.skip`/`.only`/empty tests; the
other provider construction paths already inject `boundFetch`; run-payload nullability
contract (`packages/shared/src/entities/run-payload.ts`) unchanged this run.

## Blockers

None. Gate ran clean and the change fit the timebox.

## Next recommended action

Review and merge the draft PR. As a follow-up (out of scope for this run), consider an
ESLint guard or a grep-based check that flags any default parameter or call that captures
the bare global `fetch` instead of `boundFetch`, so this class of detached-call bug can't
recur in a new network seam.
