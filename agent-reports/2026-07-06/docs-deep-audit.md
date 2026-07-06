---
prompt: owner-requested/docs-deep-audit # interactive owner-requested run, not a scheduled remote prompt
repo: ritmofit-web
agent: claude-fable-5 (Claude Code, interactive session with owner)
date: 2026-07-06
inspected_head: c4e4840a4c95503dacf9e9b4277a9df6480ad88e
inspected_range: full-repo
completed: true
prs: []
---

# docs-deep-audit — 2026-07-06

## Summary

Owner-requested deep audit of every live doc surface — root docs (`CLAUDE.md`, `AGENTS.md`,
`README.md`, `INBOX.md`), `ritmofit_dev_plan/` (16 live files), `ritmofit_design_system/`,
and `agent-prompts/` — across four dimensions: accuracy vs. code (static verification),
cross-doc consistency, structure/redundancy, and content gaps. Historical records
(`agent-reports/`, `archive/`, `HISTORY.md`) were read-only context. **Headline: the doc set
is in unusually good health** — schema.md matches Drizzle on every table, all documented
commands exist, the design system is fully D17/D21-consistent and its verify gate passes,
and the prompt library's references all resolve. Seven clear-cut drift fixes were applied in
this session (P1–P3 below, all docs-only); four structural judgment calls need an owner
decision. Ran in the same session that made `CLAUDE.md` canonical (AGENTS.md → pointer stub).

## Commands run + results

- `pnpm format:check` → pass (after fixes; all matched files use Prettier style)
- `(cd ritmofit_design_system && npm run verify)` → pass (token drift, lint, contrast AA all clear)
- Static cross-checks (read, not executed): all 13 commands documented in `CLAUDE.md`/README
  exist in root/workspace `package.json` scripts; the documented CI-equivalent gate exactly
  matches `.github/workflows/ci.yml` (11 steps incl. design-system verify + contract-parity);
  `schema.md` vs `apps/api/src/db/schema.ts` — all 17 tables, enums, CHECKs, partial uniques,
  and the 21-move seed match; `api.md` vs mounted routes in `apps/api/src/index.ts`;
  engines (`node >=22.13`, `pnpm >=11.4`) match README prerequisites; `.nvmrc`,
  `ios-snapshot/README.md`, `apps/web/smoke/README.md`, `/api/v1/health`, and every
  agent-prompts-referenced path verified present.

## Fixes applied this session (docs-only, in the working tree pending owner review/commit)

1. **[P1] README.md intro described the pre-D20 product** — "two complete surfaces… explore,
   share… rhythm spin cycle instructors." Contradicted locked D20/D21 (solo-first, web-first,
   community deferred, Cycle/Pilates/HIIT). Rewritten to the current frame.
2. **[P1] api.md missing the whole Sections route group** — `GET/POST /classes/:id/sections`,
   `PATCH/DELETE /sections/:id` are live (`apps/api/src/routes/sections.ts`) but undocumented.
   Added.
3. **[P2] api.md missing `POST /tracks/:id/resolve-provider`** — shipped 2026-07-06
   (cross-provider resolution, commit `510516f`). Added to the Tracks table.
4. **[P2] decisions.md D14 said Holds was "unsettled"** — it was settled as Option B (manual
   `hold_count`, PR #110) and shipped end-to-end. Updated.
5. **[P3] decisions.md D15 said the marketing landing didn't exist yet** — `MarketingPage.tsx`
   shipped. Reworded to decision-time phrasing + shipped marker.
6. **[P3] architecture.md repo-layout named nonexistent files** — `lib/api-client.ts` /
   `lib/auth.ts` → actual `lib/api.ts` / `lib/auth-client.ts`.
7. **[P3] schema.md implied the classes→shares cascade is FK-enforced** — it's app-enforced
   (polymorphic `resource_id`, no FK; per the Drizzle comment). Delete-semantics table now says so.
8. **[P3] web-launch-readiness.md "Handoff To iOS" still framed iOS wrap-up as "the next
   milestone"** — superseded by D20. Marked and reworded.

(Also this session, pre-audit: `CLAUDE.md` made canonical, `AGENTS.md` → pointer stub, ~25 live
references updated, and four stale section-name references repaired.)

## Judgment calls — owner approved same session (2026-07-06); all four executed

- **[P2] `agent-prompts/ritmofit-design-audit-prompts-v2/` was an orphaned prompt pack** —
  referenced by neither `agent-prompts/README.md` nor `SCHEDULE.md`; used the retired
  "RitmoFit" name; its output paths (`docs/audits/…`) don't exist in the repo; its purpose
  (the studio redesign critique/prescription) was fulfilled by
  `agent-reports/studio-aesthetic-critique.md` + `studio-redesign-prescription.md`.
  **Done:** moved to `ritmofit_dev_plan/archive/ritmofit-design-audit-prompts-v2/` and
  indexed in the archive README.
- **[P2] DEVELOPMENT_PLAN.md "Current operating focus" had become a dense dated status log**
  (~25 lines of deploy IDs and PR chronology) inside a map that claims "this map carries no
  dated status" — duplicating `HISTORY.md` and creating a recurring reconciliation duty.
  **Done:** slimmed to a ~10-line summary (frame, active slice, remaining gaps, pointers);
  all removed detail verified present in `HISTORY.md`, `decisions.md` D21, and
  `provider-playback-implementation.md` before cutting.
- **[P3] `solo-first-reset-implementation.md` was a completed one-off prompt** — the D20
  reset it drove shipped (PRs #203/#206); it sat outside SCHEDULE.md. **Done:** moved to
  `ritmofit_dev_plan/archive/` and indexed in the archive README.
- **[P3] `docs/onboarding/ritmofit-tutorial-video-cuts.md` was referenced by nothing** — a
  live video cut/caption spec (matches shipped `apps/web/src/lib/onboarding-video.ts`), so
  indexing beat archiving. **Done:** linked from README "Where to read more."

## Non-findings worth recording (checked, clean)

- `schema.md` ↔ Drizzle: full match (17 tables + rate-limit note; clip-window/one-target/
  reference CHECKs; partial uniques; seed moves 21/21).
- Design system: D17 zone vocabulary (Z0–Z4 Build/Push/Attack/All Out) consistent across
  `02-color-system.md`, `10-rhythm-system.md`, and the brand authority doc; D21 library/shell
  language consistent across README, `01`, `05`, `11`; `npm run verify` green.
- `provider-playback-implementation.md`, `deployment-runbook.md`, `milestones.md`,
  `glossary.md`, `overview.md`, `conventions.md`, `authorization.md`, `music-providers.md`:
  current through the 2026-07-06 deploys; no drift found.
- Paused/as-built docs (`web-ios-parity.md`, `editing-granularity-scoping.md`) are clearly
  banner-labeled with dated agent notes — good pattern, keep it.
- `INBOX.md` is empty (drained) and its routing table's targets all exist.
- agent-prompts: SCHEDULE.md covers every live prompt; house-rules report-naming scheme
  matches actual `agent-reports/` layout; daily prompts' gate lists match CI exactly.

## Blockers

None. All four audit dimensions completed; no gate failed.

## Next recommended action

None outstanding from this audit — all fixes and all four judgment calls landed in this
batch. Keep status slim going forward: at close-session, update the trimmed "Current
operating focus" pointer-style and append detail to `HISTORY.md` only.
