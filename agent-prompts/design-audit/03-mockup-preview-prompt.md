# Phase 3: comprehensive navigable product preview

Build the complete owner-review artifact specified by `preview-brief.md`. This phase is mandatory and cannot
be skipped because no single P0 “direction item” exists. The product-wide proposal is the deliverable, and
it is what the owner will judge every phase-4 prompt against.

Do not edit `apps/web/`, API code, shared contracts, or production design-system sources.

## Inputs

- `surface-inventory.md`, `critique.md`, `backlog.md`, and `preview-brief.md`.
- Current screenshots and the live local UI.
- Current design-system tokens, components, and mockups.

## Required outputs

```text
<run-folder>/
  mockups/
    index.html
    preview.css
    preview.js
    assets/                 # only when genuinely needed
    README.md               # craft-pass log
  screenshots/proposed/
```

Additional split HTML/CSS/JS files are allowed when they improve maintainability. All links must work when
served by a simple local static server from the repository root.

The owner-facing entry point (`<run-folder>/README.md`) and the decision ledger (`run-decisions.md`) are
written at closeout, after phase 4, so they can describe the finished deliverable.

## Prototype requirements

1. Cover every inventory row marked `primary` and `must-mock-state`.
2. Provide desktop and 390px treatments for every primary surface; validate fragile surfaces at 320px and
   200% zoom.
3. Provide realistic, internally coherent data across the whole product. The same instructor, classes,
   playlists, tracks, cues, and readiness conditions should tell one story.
4. Demonstrate populated plus materially different empty/loading/error/disconnected/disabled/recovery states.
5. Keep public entry/auth and active solo-product surfaces; omit dormant community functionality.
6. Keep the current shell recognizable. Annotate structural findings rather than smuggling in an IA redesign.
7. Use shared prototype tokens and components. Avoid one-off page styling that cannot become a maintainable
   implementation system.
8. Make important navigation and state switches functional enough for review. Do not build a fake backend.
9. Use real product copy. Do not rely on generated-image text or lorem ipsum.
10. Cite backlog IDs in the review layer, not as clutter inside the proposed product UI.
11. Let the reviewer reveal the matching current screenshot beside or over the proposed surface without
    contaminating the proposed UI itself.

## Direction exploration

If visual direction remains ambiguous and image generation is available, it may be used for direction boards
or screenshot paintovers. Save only references that materially shaped the proposal and document the extracted
decisions. Generated images are never the final UI source of truth.

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

Capture every primary surface at desktop and 390x844 from the prototype into
`<run-folder>/screenshots/proposed/`. Use JPEG or WebP named after the canonical surface ID and viewport,
mirroring the `current/` naming so the two folders line up. Add state-specific captures where they
materially affect a decision, and drop state variants first if the run approaches the size budget.
Screenshots are evidence and review shortcuts; the navigable prototype remains authoritative.

## Quality gate

Before phase 4:

- Every `primary` and `must-mock-state` row from the coverage contract is navigable in the prototype.
- Every adversarial check above is recorded as pass, revision, or gap in `mockups/README.md`.
- Current and proposed captures exist for every primary surface, or the gap is explicit.
- No production code, token source, schema, or configuration file changed.

Then continue to phase 4. This is a single continuous run; the owner reviews the finished folder, not a
mid-run checkpoint.
