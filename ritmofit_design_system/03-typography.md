# 03 — Typography

Three families, three jobs. Values in [`tokens.json`](./tokens.json).

## The brief, and the one decision that changed
"Spotify-clean, not Nike-performance" — attractive but a *workspace*. The earlier drafts answered with
Inter (and Inter-tabular for numbers). That's legible and characterless. **The most-read glyphs in this
app are numerals** — BPM, timecodes, zones, durations. In a rhythm product, the numbers *are* the brand.
So the data layer gets its own face with mechanical character, and the numbers become the signature.

## Families

- **UI / body — Inter** (`"Inter", "SF Pro Text", system-ui`). The workhorse for prose, labels, lists.
  Renders near-identically on web and iOS, every weight, deep language coverage. Chosen for legibility in
  density over character — character lives elsewhere.
- **Display — Space Grotesk** (`"Space Grotesk", "SF Pro Display", system-ui`). Used **with restraint**:
  marketing, large screen titles, Live-mode headers. A confident, slightly mechanical music-tech voice.
- **Data — Martian Mono** (`"Martian Mono", "SF Mono", ui-monospace, monospace`). **The hero face.** All
  numerals: BPM, timecodes, zones, durations, counts. Monospaced (so inherently tabular — digits never
  jitter as values change), with a precise, instrument-panel character that makes the tool feel like
  gear. At the big sizes (`data-hero`, the Live BPM readout) it does the most brand work in the product.

> Martian Mono is wide by design — the scale below pulls tracking negative at small sizes so inline
> timecodes stay tight. Open-source (SIL OFL): self-host on web, bundle on iOS. If a lighter mono is ever
> wanted, **Commit Mono** is the sanctioned swap. Do not introduce a fourth family casually.

## Scale

px on web; iOS maps 1:1 to points. Tracking in em.

| Token | Size / Line | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|
| `display-lg` | 48 / 52 | 600 | -0.02 | Space Grotesk | Marketing hero, big titles |
| `display` | 34 / 40 | 600 | -0.02 | Space Grotesk | Section heroes, Live title |
| `title` | 24 / 30 | 600 | -0.01 | Inter | Screen titles |
| `heading` | 18 / 24 | 600 | 0 | Inter | Card / group headers |
| `body` | 15 / 22 | 400 | 0 | Inter | Default text |
| `body-strong` | 15 / 22 | 600 | 0 | Inter | Emphasis in body |
| `label` | 13 / 16 | 500 | +0.01 | Inter | Field labels, chips |
| `caption` | 11 / 14 | 500 | +0.04 | Inter | Meta, units (uppercase) |
| `data-hero` | 88 / 84 | 700 | -0.04 | Martian Mono | The Live BPM readout — the screenshot |
| `data-lg` | 28 / 30 | 600 | -0.03 | Martian Mono | Big BPM, timeline readouts |
| `data` | 15 / 18 | 500 | -0.02 | Martian Mono | Inline BPM, timecodes, counts |

## Rules

- **Sentence case** for UI text. Reserve uppercase for tiny `caption` units like `BPM`, `DURATION`.
- **Weights carry hierarchy** more than size in dense areas — 400 vs 600 Inter does a lot of work in a
  list. Don't stack many sizes in the class builder; lean on weight + space.
- **Numbers are always the data face** in data contexts. A BPM in Inter is a bug. The mono *is* the cue
  that "this is a value you plan against."
- **Dynamic Type (iOS) / browser zoom** must reflow cleanly — relative units on web, Dynamic Type
  categories on iOS (see [`07-accessibility.md`](./07-accessibility.md)).
- **Live mode** leans on `data-hero` / `display` so it's readable across a room, and it's where Martian
  Mono earns its keep — a giant tempo-locked number is the emotional center of the screen.

## Loading
Web: self-host Inter, Space Grotesk, and Martian Mono (all OFL) with `display=swap`; preload Inter and
Martian Mono (the data face is above the fold on the builder). iOS: bundle Space Grotesk and Martian
Mono; Inter or SF Pro Text for UI. System-font fallbacks in each stack keep things native if a custom
face fails to load.
