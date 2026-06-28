---
prompt: planning/roadmap-sync
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-28
inspected_head: ba6d6277ab208f29c75546aa56c5d1ad1f8fd03d
inspected_range: full-repo
completed: true
prs: []
---

# planning/roadmap-sync — 2026-06-28

## Summary

**The single most important call: this is a launch-*closing* week, not a feature week — drive the
Web Launch Gate to green, don't open new slices.** `main` is clean at `ba6d627`, CI-green, zero open
PRs, production aligned (Worker `e6fb7c1a`, remote D1 at head). M1–M4 are done and deployed; the only
active milestone is **Web Launch Readiness**, and its gate still has unchecked verification and one
credibility defect. Critically for sequencing: **no backend work is blocking iOS right now** — the
run-payload contract already advertises every field iOS is behind on, so "ship X because iOS is
waiting" is not a real driver this week. iOS catch-up is iOS-repo work and stays deferred per the
current sequence.

## Commands run + results

- `git rev-parse HEAD` / `git status --short` → `ba6d6277…`, clean tree, on the sync branch; remote
  default head matches (`git ls-remote origin HEAD` → `ba6d627`).
- `git log --oneline -15` → latest runtime change is #124 (PWA stale-shell fix, live in `e6fb7c1a`);
  #125 is the docs-only Session 1 audit record. Everything after is docs/prompts.
- `mcp__github__list_pull_requests (state=open)` → `[]` (no open PRs, no `auto-maintenance` pile).
- Read source-of-truth docs: `DEVELOPMENT_PLAN.md`, `web-launch-readiness.md`, `web-ios-parity.md`,
  `HISTORY.md`, prior `2026-06-28/command-brief.md`.
- Inspected contract-parity allowlist (`apps/api/src/lib/contract-parity.ts`) + `ios-snapshot/` →
  confirmed all iOS-lagging run-payload fields are *advertised by the contract already*.
- This is a brief-only run: no code, no PR, no full local gate re-run (CI was green at `ba6d627`).

## Findings

Ranked by what should claim the week.

- **[P1] CSP-blocked inline `<script>` console error on every page load** — `web-launch-readiness.md:80`
  - Evidence: `script-src 'self' https://static.cloudflareinsights.com`; an inline script (hash differs
    per load) is injected at runtime — built `index.html` has none, so it's a Cloudflare zone setting
    (Rocket Loader / Web Analytics auto-inject), not app code.
  - User impact: a console error on every load is a launch-credibility wound; cheap to fix infra-side.
  - Recommended owner: web (infra/zone config).
  - Recheck next run? yes.
- **[P1] Launch-gate verification items not yet checked off** — `web-launch-readiness.md:88`
  - Evidence: gate requires verified auth/email (reset, verification, expired session) and a full
    production core-workflow pass (create/edit/copy class, import tracks, cues/moves/sections, Live Mode,
    Explore save, share/team-share). Session 1 walked the loop once; these are not yet gate-signed.
  - User impact: these *are* the launch decision — unverified means not launch-ready.
  - Recommended owner: web.
  - Recheck next run? yes.
- **[P2] First-impression library/discovery polish (StructClub gap, launch-required)** —
  `web-launch-readiness.md:62`
  - Evidence: richer Library presentation (track-art collage, duration, last-opened, duplicate,
    create-class chooser), class-detail read mode, and Songs-by-Move as a prominent create path are all
    flagged launch-required; the durable StructClub read is that discovery/library is the competitive gap.
  - User impact: weakest first-use surface vs. the reference product.
  - Recommended owner: web (+ design).
  - Recheck next run? yes.
- **[P3] Manual-add track duration is raw milliseconds** — `web-launch-readiness.md:85`
  - Evidence: builder "Add manually" takes duration as `180000` ms, unlabeled, vs. the `m:ss` inspector.
  - User impact: minor authoring confusion. Recommended owner: web. Recheck? yes.

## Blockers

None for this run. The standing decision the owner already made (2026-06-28 scope) governs: only
launch-required work, Explore/Teams expansion deferred. The one judgment call left is ordering P2 polish
vs. spending the week purely on gate verification — recommendation below.

## Next recommended action

**Land these, in this order:** (1) fix the CSP inline-script error infra-side — one zone-config change
buys back launch credibility; (2) complete and gate-sign the auth/email + full core-workflow production
verification (this is the launch decision itself); (3) take the single highest-impact first-impression
polish item — richer Library presentation — since discovery/library is the documented StructClub gap;
(4) the ms-duration field if time remains. **Defer:** Explore expansion, Teams expansion, all iOS parity
implementation, design-token drift automation, iPad. **Ship-first-for-iOS: nothing this week** — the
backend already advertises every allowlisted run-payload field (`timelineMode`, `displayRpm`, `holdCount`,
`clipStartMs`, `beatAnchorMs`, `Move.beat`/`Move.bar`); iOS is not blocked on an unshipped endpoint, so
that work belongs in the iOS repo and does not preempt the web launch close.
