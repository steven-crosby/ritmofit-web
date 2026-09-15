# Production fixture hygiene

> Scope: identifying, cleaning up, and preventing non-real (verification/probe) classes in the
> production account. Written for [SPC-21](../docs/audits/studio-pulse-check-2026-09-13/run-decisions.md)
> (PROD-HYGIENE): "A QA liveness-probe class is visible and top-ranked in the production account."

## Why this happens

Production account creation is gated to `BETA_ALLOWED_EMAILS` (decision D22) — the owner's household
and a small number of instructor friends. There is no separate QA/test account: it couldn't hold real
provider connections (Spotify Premium, Apple Music) without also being an invited real user.

`AGENTS.md` requires live playback/liveness verification in a real, authenticated browser — "API probes
and automated tests are not enough." That verification needs a real class to run, and the only account
with real provider connections is the owner's own production account. So a verification pass
necessarily creates a real class in real production data, unlike the `browser-verification/` harness's
local fixtures, which are additive-and-revoked (`auth.mjs`'s `signIn()`/`revoke()` pattern) against a
local D1 that nobody depends on for real use.

`GET /classes` orders `updatedAt DESC` (`api.md`), so any verification class that was just touched
sorts to the top of the owner's real list — that's the "top-ranked" half of the SPC-21 finding. Nothing
in the deploy runbook's post-deploy smoke creates this (it's unauthenticated `curl` checks only); the
contamination comes from ad hoc live-verification sessions that had no cleanup convention to follow.

## Identifying a fixture class

Two mechanisms, both already in the product — no schema change:

1. **Naming convention.** Prefix any class created for verification/testing purposes with `[QA] `
   (e.g. `[QA] liveness probe`). Human-scannable in the Classes list without tooling.
2. **Tag.** Tag it with the reserved tag `qa-fixture` via `POST /classes/:id/tags` (`class_tags`,
   `api.md`). There is no bulk list-by-tag endpoint today, so the tag is machine-checkable per class
   (`GET /classes/:id`) rather than a filter — a cheap trail marker, not a query mechanism.

Apply both at creation time, not after the fact — a probe class is easy to tag while you're still the
one who just made it, and easy to lose track of once other real classes accumulate around it.

## Inventory (current state — not run by this session)

This session has no production D1 or API credentials, so it cannot enumerate what's in the production
account today. The specific class SPC-21 cites has not been re-identified here. To inventory it:

1. Sign in to the production account and sort Classes by recency (the default `GET /classes` order).
2. Anything named/shaped like a verification artifact and not recognizable as real instructor content
   is a candidate — cross-reference against known live-verification sessions in `HISTORY.md` /
   `docs/audits/*/playback-liveness-investigation.md` for likely creation dates.
3. Tag each candidate `qa-fixture` (above) before doing anything else, so the finding survives even if
   the deletion step is deferred.

## Cleanup (owner-authorized only)

Deletion is **not authorized by this document**. This session does not delete anything in production.
When the owner is ready:

1. Confirm the candidate is tagged `qa-fixture` or otherwise clearly a probe (never delete on a name
   guess alone).
2. Open it and confirm it has no choreography/content the owner recognizes as real.
3. Delete via the normal UI delete path (or `DELETE /classes/:id` with production auth), which cascades
   to `class_tracks`, their `cues`/`class_track_moves`, `class_tags`, `class_sections`, and app-enforced
   `shares` cleanup (`schema.md` CASCADE table) — no separate cleanup steps needed.
4. Record the deletion (what, when, why) in `ritmofit_dev_plan/HISTORY.md` as a material production-state
   finding, per the deployment runbook's convention.

## Prevention going forward

Add to any session doing **live production verification** (playback, liveness, or anything else that
needs a real class in the real account):

- Name the class `[QA] <purpose>` and tag it `qa-fixture` immediately on creation — same session, not
  a follow-up.
- Delete it (or explicitly hand off the pending deletion to the owner, tagged, per above) before closing
  the session. Treat it the same as `browser-verification/auth.mjs`'s "always revoke" rule, just against
  production instead of a local fixture session row.
- Do not reuse a stale, previously-tagged `[QA]` class across sessions — a fresh probe class per
  verification pass keeps the tag trail meaningful.

This is a convention, not enforcement — the API takes no fixture flag today, and adding one would be a
schema/behavior change outside this hygiene pass. If production accumulates fixtures again despite the
convention, that's a signal to revisit a real backend flag instead of relying on discipline alone.
