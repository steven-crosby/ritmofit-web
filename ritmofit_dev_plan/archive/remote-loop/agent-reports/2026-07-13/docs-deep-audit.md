---
prompt: owner-requested/docs-deep-audit
repo: ritmofit-web
agent: Coop (Codex)
date: 2026-07-13
inspected_head: 34ef84e5a5cb00118b624c370a542c72cd845dd3
inspected_range: full-repo
completed: true
prs: []
---

# docs-deep-audit — 2026-07-13

## Summary

Owner-requested, read-only audit of the active documentation surface, especially agent
operating documents, `ritmofit_dev_plan/`, the design system, `docs/`, and the root README.
All 64 active Markdown files were audited; 46 archived/report files were boundary-checked.
Claims were compared with repository source, generated OpenAPI, package configuration,
design tokens, and live read-only Cloudflare deployment state.

**Headline:** the documentation has a strong foundation, but current-state facts are
duplicated across too many purported authorities. The largest risk is contradictory
documentation, not missing documentation. The highest-priority defects were API/OpenAPI
contract drift, a destructive-workflow contradiction in the close-session prompt, and a
documented production version that did not match live state. No repository content was
changed during the audit itself; remediation started only after owner approval.

The checkout moved to `34ef84e5a5cb00118b624c370a542c72cd845dd3` during the audit. Tracked
Markdown was unchanged from the initially pinned baseline, so the evidence remained valid.
Pre-existing untracked lane prompts in the shared checkout were left untouched.

## Commands run + results

- Markdown inventory → 64 active files; 26 development-plan archive files and 20 prior
  reports boundary-checked.
- Local-link validation → one broken archive link in
  `ritmofit_dev_plan/archive/cues-vs-notes-decision.md`.
- Active-document anchor validation → pass.
- Backtick-path validation → one stale tracked one-off prompt references nonexistent
  `apps/api/src/lib/music/rate-limit.ts` instead of `apps/api/src/lib/rate-limit.ts`.
- `cd ritmofit_design_system && npm run verify` → pass: web/iOS token sync, token lint,
  and dark/light semantic AA contrast.
- `pnpm format:check` → pass. Long-form docs are intentionally excluded by Prettier config.
- Forced Prettier parse with the ignore file disabled → all active Markdown parsed; 39 files
  would be reformatted, which was not treated as a defect.
- Package-scoped Wrangler 4.99.0 read-only checks → active Worker initially identified as
  `832547d5-a7ea-4683-8507-1e647c1268eb`, superseding the documented `a83a71d2...` version.

## Findings

### P1 — Narrative API and generated OpenAPI disagreed

`ritmofit_dev_plan/api.md` called generated OpenAPI the contract of record, but implemented
section CRUD, Explore, and whole-class copy operations were absent from OpenAPI. The narrative
used `GET` for provider connect while implementation/OpenAPI use `POST`, omitted Apple Music
connection/config and saved-playlist bulk import operations, called URL playlist import
Spotify-only despite three-provider support, listed a nonexistent provider error code, and
described public cover delivery as authenticated.

**Impact:** agents and clients could use internally contradictory contract sources.

**Recommended repair:** register the implemented paths and shared schemas in OpenAPI; correct
the narrative method/capability/auth/error statements; retain the two dev-only mock operations
as explicitly documented OpenAPI-only exceptions.

### P1 — Close-session workflow conflicted with work-preservation rules

`AGENTS.md` prohibits stashing, discarding, resetting, or overwriting existing work.
`agent-prompts/daily/close-session.md` offered stash/discard as routine choices.

**Recommended repair:** identify ownership, offer to commit only finished in-scope work, leave
unrelated files untouched, and escalate unclear recovery rather than mutating the tree.

### P1 — Documented production state was unreliable

The plan/history named `a83a71d2...` as latest, while Cloudflare reported active version
`832547d5...`. The runbook also mixed package-scoped and unavailable bare Wrangler commands,
embedded dated provider verification, and treated Worker version/history as sufficient proof
of current production state.

Follow-up provenance work after the audit found a stronger anomaly: live SPA assets matched a
clean build of current `origin/main`, while the active Worker API script remained byte-identical
to round 12. Production was therefore split across source states. The detailed evidence is now
recorded at the top of `ritmofit_dev_plan/HISTORY.md`.

**Recommended repair:** make the runbook procedural, use executable package-scoped commands,
track history as chronology only, and independently verify Worker version, D1 state, and served
SPA asset hash.

### P2 — Development-plan information architecture is overloaded

`DEVELOPMENT_PLAN.md` acts as product overview, current focus, milestone tracker, deployment
log, backlog, and recently completed history. Related completed/paused trackers retain stale
contract counts and shipped work as open. `provider-playback-implementation.md` mixes as-built
architecture with a dated implementation diary and contradictory provider states.

**Recommended structure:** `AGENTS.md` for durable rules; root README for setup; a short
`DEVELOPMENT_PLAN.md` for current direction/open work; focused subject docs for architecture,
schema, API, auth, and providers; a procedure-only runbook; chronological-only `HISTORY.md`;
archive or tombstone completed trackers.

### P2 — Design token machinery is healthy, but prose canon is split

Design verification passed. The distinctive principles remain coherent: creator-first framing,
rhythm/time language, copper/cyan/plasma palette, energy ribbon, and restrained motion.

The modular documents and 1,517-line monolith both claim authority, while prose retains old
Library/Moves/Builder navigation, catalog-only Spotify/Apple behavior, unbuilt saved-playlist
claims, D18 parity requirements superseded by D20, and iOS-primary Live framing.

**Recommended repair:** make modular `01`–`11` documents the editable human canon, keep tokens
authoritative for values, and archive the monolith or generate it mechanically only when a real
consumer needs a compiled artifact.

### P2 — Prompt lifecycle is unclear

A tracked D21 one-off prompt contains obsolete absolute paths, old commit/clone context, and a
nonexistent source path. Five reusable planning/report prompts do not explicitly inherit house
rules despite the prompt README saying they do. Round-specific untracked lane briefs sit beside
durable daily prompts.

**Recommended repair:** separate durable prompts, ephemeral lane briefs, and archived execution
records; make `SCHEDULE.md` the sole trigger/cadence map.

### P3 — Smaller setup/onboarding/archive drift

- Root README claims complete env-template coverage, but `SPOTIFY_REDIRECT_URI` is absent.
- `.dev.vars.example` calls the encryption key unused and retains a pre-rename sender identity.
- Tutorial-video prose calls deferred Teams/Explore surfaces incomplete.
- One archive link resolves to a nonexistent archive-local development plan.
- CI comments still point to removed Claude-only guidance.

## Verified healthy surfaces

- Design token synchronization, lint, and contrast checks.
- Active-document local anchors.
- Root package scripts and documented Node/pnpm versions.
- Referenced font files and licenses.
- Broad Worker mounting, bindings, CORS/security, architecture, and schema descriptions.
- The schema document's deliberate Better Auth rate-limit-table treatment.

## Blockers

No blocker prevented the read-only audit. Structural consolidation and production mutation
were intentionally deferred pending owner direction. Production deployment remains a separate,
explicit decision.

## Owner-approved first repair

Steven approved a narrow first slice:

1. Investigate the unlogged live Worker version without mutating production.
2. Reconcile API narrative/OpenAPI.
3. Remove destructive close-session choices.
4. Make runbook commands executable and record production state accurately.
5. Use an isolated clone, verify fully, and do not deploy without separate approval.

## Next recommended action

After the narrow P1 repair lands, obtain explicit owner approval for a full production build +
Worker deploy to restore API/SPA source alignment. Then undertake the planning/design/prompt
information-architecture work as separately reviewable documentation changes.
