# Ritmo Studio app icon

The "R" brand mark: a heavy geometric **R** with Polynesian tribal infill (niho teeth,
down-chevrons, koru spirals, sun rays) weighted to the left stem and dissolving to a clean
copper face on the right, set on an espresso tile.

## Files

| File                 | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `icon.svg`           | **Source of truth.** Self-contained SVG — no font dependency.        |
| `render.mjs`         | Renders the three variants to PNG (requires Playwright/Chromium).    |
| `AppIcon.png`        | Light / default, 1024×1024.                                          |
| `AppIcon-Dark.png`   | Dark variant, 1024×1024.                                             |
| `AppIcon-Tinted.png` | Tinted (grayscale) variant for iOS tinting, 1024×1024.              |

## How it's built

- **Letterform:** the R is the **Archivo Black** glyph, converted to an outline `<path>` so
  the SVG carries no font dependency. (Archivo is SIL OFL; only the outline of one glyph is
  embedded.) The bare letterform was chosen as the closest match to the reference icon's heavy,
  straight-legged geometric R.
- **Color:** the copper face uses the brand copper ramp from `../../tokens.json`
  (copper-200 → deep red), the one identity channel. The three variants are encoded as CSS
  custom-property palettes in the `<style>` block at the top of `icon.svg` (`:root`, `.dark`,
  `.tinted`).
- **Tribal infill:** hand-authored SVG (`#tribal` pattern + scattered `#koru` / `#sun` motifs),
  masked with a left-to-right fade so it reads dense on the stem and clean on the bowl/leg.

## Regenerating

Edit `icon.svg` (palette vars, pattern density, motif placement, or the bevel), then:

```sh
npx playwright install chromium   # one-time
node render.mjs
```

To wire these into the iOS app, drop the three PNGs into `AppIcon.appiconset/` alongside its
`Contents.json` (universal 1024 light, `luminosity=dark`, and `luminosity=tinted`).
