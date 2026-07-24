# Phase 3: comprehensive navigable product preview

Build the complete owner-review artifact specified by `preview-brief.md`. This phase is mandatory and cannot be skipped because no single P0 “direction item” exists. The product-wide proposal is the deliverable.

Do not edit `apps/web/`, API code, shared contracts, or production design-system sources. All outputs land in `docs/audits/[agent-id]-design-audit-[ISO-date]/`.

## Inputs

- `surface-inventory.md`, `critique.md`, `backlog.md`, and `preview-brief.md`.
- Current screenshots and the live local UI.
- Current design-system tokens, components, and mockups.

## Required outputs

```text
docs/audits/[agent-id]-design-audit-[ISO-date]/
  mockups/
    index.html
    preview.css
    preview.js
    assets/                 # only when genuinely needed
    README.md
  screenshots/proposed/
  review-guide.md
  run-decisions.md
```

Additional split HTML/CSS/JS files are allowed when they improve maintainability. All links must work when served by a simple local static server from the repository root.

## Prototype requirements

1. Cover every inventory row marked `primary` and `must-mock-state`.
2. Provide desktop and 390px treatments for every primary surface; validate fragile surfaces at 320px and 200% zoom.
3. Provide realistic, internally coherent data across the whole product. The same instructor, classes, playlists, tracks, cues, and readiness conditions should tell one story.
4. Demonstrate populated plus materially different empty/loading/error/disconnected/disabled/recovery states.
5. Keep public entry/auth and active solo-product surfaces; omit dormant community functionality.
6. Keep the current shell recognizable. Annotate structural findings rather than smuggling in an IA redesign.
7. Use shared prototype tokens and components. Avoid one-off page styling that cannot become a maintainable implementation system.
8. Make important navigation and state switches functional enough for review. Do not build a fake backend.
9. Use real product copy. Do not rely on generated-image text or lorem ipsum.
10. Cite backlog IDs in the review layer, not as clutter inside the proposed product UI.
11. Let the reviewer reveal the matching current screenshot beside or over the proposed surface without contaminating the proposed UI itself.

## Direction exploration

If visual direction remains ambiguous and image generation tools are available, they may be used for direction boards or screenshot paintovers. Save only references that materially shaped the proposal and document the extracted decisions. Generated images are never the final UI source of truth.

## Adversarial craft pass

Before capturing proposed screenshots, inspect and revise the prototype using all of these checks:

- **Swap:** Would replacing the type, layout, or cards with common dashboard defaults make little difference?
- **Squint:** Is the focal hierarchy still clear without harsh borders or competing accents?
- **Signature:** Is the Ritmo-specific signature visible in at least five appropriate surfaces?
- **Token:** Do prototype variables form a coherent product system rather than random values?
- **Composition:** Do proportions and density change intentionally between discovery, creation, and Live?
- **Content:** Does every visible string and data point belong to the same credible instructor story?
- **State:** Are hover, active, focus, disabled, loading, empty, error, disconnected, and recovery treatments present where needed?
- **Responsive:** Is mobile a designed treatment rather than a cropped desktop composition?
- **Accessibility:** Does meaning survive grayscale and reduced motion, and can focus/targets be inspected?
- **Feasibility:** Could the proposal be built with the repository's component and token architecture without structural hacks?

For each check, record pass/revision/gap in `mockups/README.md`. Fix failures before owner review.

## Proposed screenshots

Capture every primary surface at desktop and 390x844 from the prototype. Use names that map directly to the inventory ID. Add state-specific captures where they materially affect a decision. Screenshots are evidence and review shortcuts; the navigable prototype remains authoritative.

## `review-guide.md`

Include:

1. Exact command and URL for opening the prototype.
2. Baseline branch/commit and scope statement.
3. Recommended review order by scenario.
4. Direct links/anchors to every primary surface.
5. A concise design thesis and the five most consequential changes.
6. How to compare current and proposed screenshots.
7. Known limitations and evidence gaps.
8. Instructions for recording decisions in `run-decisions.md` or supplying them in chat.

## `run-decisions.md`

Copy `run-decisions-template.md`. Pre-fill run metadata, every surface ID, every backlog ID, prototype links, and the executing agent's concise recommendation. Include `<agent-id>` in the run metadata. Leave owner disposition and owner notes unfilled.

The agent may recommend; it may not self-approve.

## Stop gate

After all Phase 3 outputs are complete:

- Stage `docs/audits/[agent-id]-design-audit-[ISO-date]/` and commit: `git commit -m "docs(audit): add [agent-id] design preview ([ISO-date])"`.
- Push branch `audit/[agent-id]-[ISO-date]` and open a draft PR: `gh pr create --draft ...`.
- Report the prototype path/open command, review guide, draft PR link, screenshot folders, inventory coverage, and evidence gaps.
- Confirm no production application code was modified.
- Stop and request owner review of `run-decisions.md` and the navigable prototype.
- Do not generate Phase 4 implementation prompts or merge the draft PR without explicit owner permission.
