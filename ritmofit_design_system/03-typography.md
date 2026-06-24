# 03 — Typography

Three families, three jobs. Values in [`tokens.json`](./tokens.json).

## The brief, and the migration decision

The 4.1 typography migration gives each role a more ownable voice without changing the established
hierarchy. **The most-read glyphs in this app are numerals** — BPM, timecodes, zones, durations. In a
rhythm product, the numbers are part of the brand, so the data layer keeps a dedicated mechanical face.

## Families

- **Web UI / body — Sora** (`"Sora", "SF Pro Text", system-ui`). The workhorse for prose, labels,
  lists, and controls. iOS deliberately retains native SF Pro Text for UI.
- **Display — Bricolage Grotesque** (`"Bricolage Grotesque", "SF Pro Display", system-ui`). Used **with restraint**:
  marketing, large screen titles, Live-mode headers, and the brand mark. It runs at normal width,
  uses optical sizing, and supports weights through 800.
- **Data — Azeret Mono** (`"Azeret Mono", "SF Mono", ui-monospace, monospace`). **The hero face.** All
  numerals: BPM, timecodes, zones, durations, counts. Monospaced (so inherently tabular — digits never
  jitter as values change), with a precise, instrument-panel character that makes the tool feel like
  gear. At the big sizes (`data-hero`, the Live BPM readout) it does the most brand work in the product.

> Azeret Mono is open-source under the SIL OFL: self-host on web and bundle on iOS. Do not introduce
> a fourth family casually.

## Scale

px on web; iOS maps 1:1 to points. Tracking in em.

| Token         | Size / Line | Weight | Tracking | Family        | Use                                   |
| ------------- | ----------- | ------ | -------- | ------------- | ------------------------------------- |
| `display-xl`  | 52 / 56     | 700    | -0.04    | Bricolage Grotesque | Campaign/share display with rhythm     |
| `display-lg`  | 48 / 52     | 700    | -0.035   | Bricolage Grotesque | Marketing hero, big titles            |
| `display`     | 34 / 40     | 700    | -0.03    | Bricolage Grotesque | Section heroes, Live title            |
| `title`       | 24 / 30     | 600    | -0.01    | Sora         | Screen titles                         |
| `heading`     | 18 / 24     | 600    | 0        | Sora         | Card / group headers                  |
| `body`        | 15 / 22     | 400    | 0        | Sora         | Default text                          |
| `body-strong` | 15 / 22     | 600    | 0        | Sora         | Emphasis in body                      |
| `label`       | 13 / 16     | 500    | +0.01    | Sora         | Field labels, chips                   |
| `caption`     | 11 / 14     | 500    | +0.04    | Sora         | Meta, units (uppercase)               |
| `data-hero`   | 88 / 84     | 700    | -0.04    | Azeret Mono  | The Live BPM readout — the screenshot |
| `data-lg`     | 28 / 30     | 600    | -0.03    | Azeret Mono  | Big BPM, timeline readouts            |
| `data`        | 15 / 18     | 500    | -0.02    | Azeret Mono  | Inline BPM, timecodes, counts         |

## Rules

- **Sentence case** for UI text. Reserve uppercase for tiny `caption` units like `BPM`, `DURATION`.
- **Weights carry hierarchy** more than size in dense areas — 400 vs 600 Sora does a lot of work in a
  list. Don't stack many sizes in the class builder; lean on weight + space.
- **Numbers are always the data face** in data contexts. A BPM in Sora is a bug. The mono _is_ the cue
  that "this is a value you plan against."
- **Dynamic Type (iOS) / browser zoom** must reflow cleanly — relative units on web, Dynamic Type
  categories on iOS (see [`07-accessibility.md`](./07-accessibility.md)).
- **Live mode** leans on `data-hero` / `display` so it is readable across a room. A giant
  tempo-locked Azeret Mono number is the emotional center of the screen.
- The marketing hero may use a scoped fluid display size up to 5.75rem. This exception never applies
  to Builder, Library, or ordinary product headings.

## Loading

Web: self-host Sora, Bricolage Grotesque, and Azeret Mono (all OFL) with `display=swap`; preload Sora
and Azeret Mono when integrating into production. iOS: bundle Bricolage Grotesque and Azeret Mono;
retain SF Pro Text for native UI. System fallbacks keep each platform usable if a custom face fails.
