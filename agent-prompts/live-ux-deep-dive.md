# Live UX deep dive — production, canon + modern standards, published report

> **INTERACTIVE, production-facing.** Paste this in a normal Claude Code session (not a
> worktree, not unattended) when Steven wants a deep-dive UI/UX assessment of the **live**
> app at `ritmofit.studio`, judged both against this repo's own design canon and against
> general modern web standards. This is the complement to
> [`remote-prompts/technical/design-system.md`](./remote-prompts/technical/design-system.md):
> that one audits **local**, canon-only, unattended, and commits a markdown report; this one
> audits **production**, canon **+ modern standards**, is interactive (asks scope questions
> up front, needs the human logged into Chrome), and its deliverable is a **published
> Claude Artifact** (a shareable link), not a repo-committed file. Do not run this instead of
> the local audit — they check different things and neither substitutes for the other.

## When to use

- Steven asks for a "deep dive," "UI/UX audit," or "assessment" of the live site, or wants
  a second opinion judged against modern standards (WCAG 2.2, Core Web Vitals, current SaaS
  UX conventions) rather than only this repo's canon.
- Before a milestone/redesign decision when he wants an outside-eye pass on what's actually
  deployed, not just what the code says it should do.

## Do not use when

- The ask is canon-drift only (tokens vs code vs render) with no live-site requirement — use
  `remote-prompts/technical/design-system.md` instead.
- The ask is a quick delta check on recent commits — use
  `remote-prompts/daily/changed-code-sentinel.md`.
- No human is available to confirm Chrome extension access / log into the live account —
  this prompt needs a person in the loop for that.

## Step 0 — Scope questions (always ask, don't assume)

Before doing anything else, ask (via `AskUserQuestion`) at minimum:

1. **Scope** — which surfaces to cover (multi-select): Marketing/auth · Dashboard/class
   list · Class Builder/editing · Live Mode · Music/Library discovery shell · Account. Full
   scope is expensive; let Steven trim it.
2. **Live access** — how to reach authenticated flows: Steven logs in once and hands back
   control · he shares test credentials · fall back to local dev with
   `MOCK_PROVIDERS=true` · or public/marketing-only, no auth.
3. **Standards** — beyond this repo's design canon, which modern-standard lenses to weigh
   (multi-select): WCAG 2.2 AA · Core Web Vitals / perf · current SaaS/creator-tool UX
   conventions · responsive/mobile-web behavior.
4. **Output** — published Artifact report (default/recommended) · local markdown file ·
   inline chat summary only.

Do not skip this even under a general "run the usual audit" instruction — scope and access
drift session to session (new surfaces ship, test accounts rotate).

## Step 1 — Build the judgment frame (~15 min)

Read, in this order, before touching the browser:

1. `AGENTS.md` (overrides everything on conflict).
2. `ritmofit_design_system/01-design-principles.md` through `11-library-guidelines.md` —
   the canon this app is judged against internally. Do not skip any file even if the scope
   is narrow; the principles cross-reference each other (e.g. the rhythm-pulse allowlist in
   `10` gates what's allowed in both Builder and Live).
3. `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` — current operating focus, what shipped
   recently vs what's a known deferred gap (don't re-report a documented, owner-deferred
   item as a fresh finding).
4. Skim `docs/audits/` for the most recent prior design-audit's disposition ledger
   (`run-decisions.md`) — a finding already `approve`d-and-shipped or explicitly deferred
   by the owner is context, not a new discovery.

## Step 2 — Parallel code review, one fork per in-scope surface

For each in-scope surface, launch one `Agent` call with `subagent_type: "fork"` (forks
share your cached context from Step 1, so don't re-paste the canon — reference it). Keep
forks scoped to disjoint file sets so two forks never review the same component. Suggested
per-surface file lists (adjust to what's actually in the tree — verify with `ls`/`grep`
first, don't trust this list blindly across time):

| Surface | Core files (verify current paths) |
|---|---|
| Marketing/auth | `MarketingPage.tsx`, `Login.tsx`, `ResetPassword.tsx`, `PrivacyPage.tsx`, `lib/auth-client.ts` |
| Dashboard/class list | `Dashboard.tsx`, `ClassHeaderCard`/`ClassPulse`/`ClassSummaryView`/`ClassReadinessSummary`, `PendingList`, `SourceList`, `LibraryRail`, `ConnectionsDialog`, `ProviderCapabilityLedger`, `lib/class-summary.ts`, `lib/readiness.ts` |
| Class Builder | `ChoreographyEditor.tsx`, `MovesPicker`/`MovesSection`, `CuesSection`, `ClassRunOfShowShelf`, `TimelineStrip`, `IntensityRibbon`, `IntensitySegmentedControl`, `IntensityReadout`, `SegmentBand`, `ReorderableTrackList`, `TrackSearch`, `TrackPreview`, `lib/energy-arc.ts`, `lib/class-ordering.ts`, `lib/reorder.ts` |
| Live Mode | `LiveMode.tsx`, `LiveTimeline.tsx`, `LivePreflight.tsx`, `lib/live-readiness.ts`, `lib/playback/*`, `lib/use-wake-lock.ts` |

Each fork's prompt must tell it explicitly:

- **Its own scope only** — name the files it owns and the surfaces other forks own, so it
  doesn't wander.
- **Read full source, not just tests**, and judge against the specific canon rules that
  apply to that surface (cite the doc section, e.g. "`05-components.md`: error = ember
  border + icon + message, never color alone" — quote the rule, don't paraphrase from
  memory, since canon text changes between runs).
- **The modern-standards lenses** picked in Step 0, made concrete for that surface (e.g.
  for Live Mode: WCAG AAA contrast target, motion-safety; for Builder: keyboard-operable
  drag equivalents, focus restoration after delete/reorder).
- **Citable output**: every finding needs `file:line`, severity (P0–P3), the rule it
  violates, and a concrete fix. Require it to also report what's done well — a
  findings-only report reads as more broken than the app actually is.
- A **word budget** (600–900 words) so four forks don't return four essays you can't
  synthesize.

Do not read the full component tree yourself in the main thread — that's what the forks
are for. Stay free to do the live pass while they run.

## Step 3 — Live pass in Chrome (yourself, not a fork — browser state doesn't fork cleanly)

1. Load the browser toolset in one `ToolSearch` call (see the Claude-in-Chrome tool
   instructions) before first use.
2. `tabs_context_mcp` → if the extension isn't connected, stop and ask Steven to check it
   rather than retrying in a loop.
3. Navigate to `https://ritmofit.studio`. He is normally already logged in per Step 0's
   answer — do not sign him out to test the logged-out marketing page unless he explicitly
   asks; rely on the marketing/auth fork's code review for that surface instead.
4. Walk every in-scope surface, screenshotting as you go. Concretely useful checks that
   code review alone won't catch:
   - **Zoom into any control that looks visually off** (overlapping text, misaligned
     bars) rather than assuming a screenshot artifact — a past run found a genuine
     `container-type: inline-size` CSS bug this way (an intensity-readout element
     collapsing to 0-width and wrapping character-by-character) that static code reading
     had missed. When something looks wrong, use `javascript_tool` to inspect the actual
     computed styles/bounding rects, not just eyeball it.
   - Console errors (`read_console_messages`, `onlyErrors: true`) on every surface.
   - Focus-ring visibility: click into a form/list, press Tab a few times, screenshot.
   - Rough perf snapshot via `javascript_tool`: `performance.getEntriesByType('navigation')`,
     `paint` entries, resource transfer sizes. This is a directional signal from one
     authenticated/cached session, not a Lighthouse run — say so in the report.
   - Provider/connection-state colors actually match the documented channel (e.g. "Session
     expired" should read amber/caution, not neutral gray) — a case where the icon+label
     redundant-encoding rule was followed but the color reinforcement was dropped.
5. **Responsive breakpoints (390/320px) are a known tooling gap.** The Claude-in-Chrome
   `resize_window` tool has not reliably resized the underlying window in past runs (it
   changes `window.innerWidth` partially, then floors out) — this matches the project's
   own documented caveat in `04-layout-and-surfaces.md` ("the headless screenshot tooling
   used here did not reliably set a sub-default layout viewport"). Try it once; if it
   floors out below what you need, don't fight it — note the constraint in the report and
   lean on: (a) the Class Builder fork's review of the breakpoint CSS/logic, and (b) the
   repo's own `apps/web/smoke/narrow-width.smoke.mjs` Playwright smoke as the authoritative
   P0 gate for that check (don't run it against production — it signs up a fresh test
   account; only run it locally against `dev:web`/`dev:api` if Steven asks for that extra
   rigor).
6. **Do not trigger side effects carelessly.** Starting real playback (Spotify/SoundCloud/
   Apple Music) from Preflight/Live plays real audio through the user's speakers — prefer
   `Run without music` to inspect the at-rest/prompter UI unless audio behavior is
   specifically in scope and Steven is expecting it. Never trigger a destructive action
   (Delete class/track) against real account data.

## Step 4 — Synthesize

1. Wait for all forks (`ListAgents` / the task-notification, never poll faster than that).
2. Merge fork findings with live-pass findings. A defect seen in both is one finding with
   higher confidence; a live-only finding (like the CSS collapse bug) is still fully
   valid — code review and live rendering catch different bug classes, that's the point of
   doing both.
3. Rank P0–P3. Call out what's working well, not just defects — this codebase has
   historically been unusually canon-compliant, and a report that reads as "everything is
   broken" when it isn't is itself a miscalibration worth avoiding.
4. Note explicit scope boundaries in the report: which surfaces were skipped, what the
   responsive-breakpoint constraint was, that perf numbers are directional not a full
   Core Web Vitals audit.

## Step 5 — Deliver per Step 0's output choice

- **Published Artifact (default):** load the `artifact-design` skill, then the general
  Artifact publishing flow — a single HTML report, sections per surface, findings tables,
  screenshots where they carry evidence, an executive summary up top. This is a
  conversation-owned artifact, separate from `agent-reports/` (which is reserved for
  unattended remote-prompt runs) — do not write it there.
- **Local markdown / inline:** honor whichever Steven picked in Step 0.

## What this prompt deliberately does not do

- It does not open a PR or edit product code — this is report-only, same spirit as the
  local design-system audit's Phase-3 rule, just for a different environment.
- It does not replace `remote-prompts/technical/design-system.md`'s canon-integrity sweep
  (token lint, prose-vs-token drift, guard-gap analysis) — that's a different, narrower,
  more mechanical pass better suited to an unattended local run.
- It does not commit anything to git. If a finding is worth turning into tracked work,
  that's a follow-up Steven asks for explicitly, not an automatic next step here.
