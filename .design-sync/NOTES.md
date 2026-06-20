# design-sync notes — RitmoFit

## Repo shape (read this first)
This repo is **not** a packaged component library. The "design system" is two things:
- `ritmofit_design_system/` — `tokens.json` (single source of truth) → CSS/Swift emitters, markdown docs, static HTML mockups. **No React components.**
- `apps/web/` — the React + Vite + **Tailwind** app. Reusable UI lives in `apps/web/src/components/` mixed with full app screens.

So the sync builds a Claude Design bundle **from the web app's source**, scoped to the curated reusable/presentational components (see `componentSrcMap` in config.json):
`Dialog, IntensityRibbon, IntensityReadout, TimelineStrip, LiveTimeline` (5).

**Excluded — `SegmentBand`:** it takes `{classId, totalDurationMs, canEdit, onChanged}` and **fetches** its sections from the API by `classId` on mount; with no backend it renders nothing (`return null`). It's a backend-coupled, edit-oriented container, not a prop-driven primitive the design agent could compose, so it's left out. To add it later you'd need to mock `lib/api.js` `listSections` in its preview.

## How the build inputs are produced (`cfg.buildCmd` = `node .design-sync/build-inputs.mjs`)
There is no component-library dist, so `build-inputs.mjs` (run from repo root) generates two gitignored inputs the converter consumes:
1. `apps/web/.ds-styles.css` — the app stylesheet **compiled** (Tailwind doesn't run inside the converter). Tailwind inlines `@import` of `tokens.css`/`fonts.css`, emits used utilities + the `rf-*` recipe classes from `index.css`. Font `url(/fonts/..)` are rewritten to `url(./public/fonts/..)` so the converter's font extractor (which ignores site-absolute paths) can resolve + ship them. `cfg.cssEntry` points here.
2. `apps/web/.ds-entry.tsx` — a barrel exporting only the 6 curated components, used as `cfg.entry`. Without it the converter's synth-entry would `export *` every src file (the whole app). `PKG_DIR` resolves to `apps/web` because the entry lives there (the converter walks up to the nearest named package.json).

`tailwind.sync.config.mjs` reuses the app's theme but widens `content` to also scan `.design-sync/previews/**` so preview-only utility classes land in the compiled CSS.

## Env / import.meta
`SegmentBand` → `lib/api.ts` → `lib/auth-client.ts` reads `import.meta.env.VITE_API_URL` at module top-level. The converter's IIFE bundle defines `import.meta.env` (MODE/DEV/PROD/BASE_URL), so this evaluates without throwing (falls back to `http://localhost:8787`). No network fires at import time.

## Known render warns (triaged — not new on re-sync)
- `[FONT_MISSING]` for "SF Pro Text/Display", "SF Mono", "Roboto Mono" is a **false positive** — these are fallback families in the `--rf-typography-family-*` stacks (system fonts, never shipped). The real brand fonts (Inter, Space Grotesk, Martian Mono) DO ship. Suppressed via `cfg.runtimeFontPrefixes`.
- `IntensityReadout` floor card renders <5KB (`[RENDER_BLANK]`) until its preview is authored — it's a tiny inline component (bars + label). Resolved by authoring `previews/IntensityReadout.tsx`.

## Re-sync risks (watch-list)
- **Compiled CSS is a snapshot of utilities used by app source + authored previews.** If a preview uses a Tailwind class that appears nowhere in `apps/web/src/**` or `.design-sync/previews/**`, it won't be in `.ds-styles.css` → unstyled. Keep preview classes within the component's own vocabulary, or they must be picked up by the `content` globs.
- **Fonts** live in `apps/web/public/fonts/` and are referenced site-absolute in source; the url rewrite in `build-inputs.mjs` is load-bearing. If `[FONT_MISSING]`/`[FONT_DANGLING]` appears, check that rewrite.
- **Curated set is hand-maintained** in both `config.json` `componentSrcMap` and `build-inputs.mjs` `COMPONENTS` — keep them in sync when adding/removing a component.
- Component `.d.ts` props reference cross-package types from `@ritmofit/shared` (e.g. `RunPayload`, `Intensity`, `ClassSection`). If `[DTS_PARSE]` fires, add `cfg.dtsPropsFor.<Name>`.
- **Toolchain:** verified with playwright `1.61.0` + chromium build `1228` (cached in `~/.cache/ms-playwright/`). On a fresh clone, re-run `(cd .ds-sync && npm i esbuild ts-morph @types/react playwright) && npx playwright install chromium`. Converter deps live in the gitignored `.ds-sync/` (re-copy from the skill on re-sync).
- **conventions.md** (the README header via `cfg.readmeHeader`) enumerates token families + the shipped utility/recipe classes. It was validated against the build: `bg-bg-overlay`, `text-display-xl`, `text-brand` are intentionally NOT claimed as shipped (defined in the Tailwind preset but unused by the 5 components, so absent from `_ds_bundle.css`). The header steers the design agent to `var(--rf-*)` tokens (all 241 ship) as the primary vocabulary. Re-validate these names if the synced set changes.

## Upload / project
- Synced to claude.ai/design project **RitmoFit Design System** (`projectId` in config.json). First sync was the **incremental** path into an empty project; future re-syncs run `resync.mjs --remote` against the project's `_ds_sync.json`.
- Tokens ship inlined inside `_ds_bundle.css` (compiled by `build-inputs.mjs`), so there is no separate `tokens/` dir in the bundle — expected, not a miss.
