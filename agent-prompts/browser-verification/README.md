# Browser verification harness

Measures the running app in real Chrome — contrast, focus rings, overflow, animations —
for the "verify in a real browser" requirement in `AGENTS.md` and in the design-audit
implementation prompts.

Zero dependencies: it drives the installed Chrome over the DevTools Protocol using Node's
built-in `WebSocket` (Node 22+). Nothing to install, nothing added to the workspace.

Built during the 2026-07-24 design-audit prompt-01 slice (PR #370), where it measured the
Live AAA fix. Reusable for the remaining slices and for the final reconciliation pass.

## Why this exists rather than eyeballing it

The audit run that commissioned this work produced **two false findings** from unvalidated
measurement, and both are invisible in the output — the wrong numbers look perfectly
plausible:

1. **Focus.** Tailwind's `outline-none` emits `outline: 2px solid transparent` and draws
   the real ring with `box-shadow`. Reading only `outline` reports "no focus ring" on
   controls that plainly have one.
2. **Gradient fills.** The copper primary paints a `linear-gradient` over a transparent
   `background-color`. A naive ancestor walk finds the page background and reports ~1:1
   for ink-on-copper, which actually measures 5.34–7.04:1.

Correcting trap 2 is what surfaced the *real* P0-04 finding — the Live transport primary
at 5.34:1, below the AAA target. A harness you have not validated can hide a defect and
invent one in the same pass.

There is a third trap the tooling cannot fix for you: **Chrome only grants
`:focus-visible` when the last interaction was a keypress.** A programmatic `.focus()`
reports "no ring" on every control in the app. Send real Tab keys —
`Input.dispatchKeyEvent` — as `focus-ring.mjs`-style traversals must.

## Always run the self-test first

```bash
node agent-prompts/browser-verification/selftest.mjs
```

It renders swatches whose correct ratio is computed from `tokens.json`, measures them
through the harness, and requires agreement — including two gradients, where it asserts
the harness finds the **worst stop**. Expectations are derived, never hardcoded, so it
cannot rot as tokens change. It is also verified to fail: disabling gradient-stop
expansion makes it report 1.86:1 and exit 1.

If the self-test disagrees with `tokens.json`, **nothing else the harness prints is
trustworthy.**

## Setup

```bash
# 1. App running locally (see AGENTS.md; build the SPA once first — wrangler needs dist/)
pnpm --filter @ritmofit/web build
pnpm dev:api    # :8787
pnpm dev:web    # :5173

# 2. Chrome with the DevTools Protocol open
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 --disable-gpu \
  --user-data-dir=/tmp/rf-verify-profile --no-first-run \
  --force-color-profile=srgb --hide-scrollbars
```

`--force-color-profile=srgb` matters: without it, colour management can shift measured
values. Drop `--headless=new` to watch it drive.

Headless is fine for contrast, layout, focus, and reduced motion. It is **not** fine for
provider playback — headless blocks `encrypted-media`, and `AGENTS.md` requires a real
browser for playback verification regardless.

## Files

| File | What it is |
| --- | --- |
| `cdp.mjs` | The driver: `eval`, `goto`, `viewport`, `reducedMotion`, `screenshot`, `setCookie` |
| `measure.js` | Injected into the page: `contrast()`, `focus()`, `horizontalOverflow()`, `animations()` |
| `auth.mjs` | Signs in as a local fixture user without a password (see below) |
| `selftest.mjs` | Validates the harness against `tokens.json`. Run first, every time. |

## Signing in

Local fixture accounts have no password anyone knows. `auth.mjs` mints one extra session
row and hands the browser the cookie the server would have set — additive, and `revoke()`
removes exactly the row it created. **Always revoke.**

```js
import { firstPage } from './cdp.mjs';
import { signIn } from './auth.mjs';

const session = signIn('marisol.audit@example.com');
const page = await firstPage();
await page.viewport(1440, 1000);
await page.setCookie(session.cookie);
await page.goto('http://localhost:5173/', { waitMs: 3000 });
// ... measure ...
session.revoke();
page.close();
```

## Measuring

```js
import { readFileSync } from 'node:fs';
await page.eval(readFileSync('agent-prompts/browser-verification/measure.js', 'utf8'));

// Every text node under a root, worst backdrop each, AAA thresholds on Live.
const rows = await page.eval(`return window.__measure.contrast('.bg-bg-live')`);
const failures = rows.filter((r) => !r.pass);

// Reduced motion: the Live runtime must report zero.
await page.reducedMotion(true);
const anims = await page.eval(`return window.__measure.animations(50)`);
```

`contrast()` returns `ratio` (the worst backdrop), `need` (7.0, or 4.5 for WCAG-large),
and `pass`. It applies the Live AAA target; for planning surfaces at AA, compare against
`ratio` yourself.

## Conventions worth keeping

- **Measure before and after in one session.** Undoing a change in the live DOM and
  re-measuring the same nodes is far stronger evidence than two numbers from two runs.
- **Report node counts, not just minimums.** "25 of 51 below target → 0" says something
  "min 5.34 → 7.04" does not.
- **Build DOM with `createElement`, not `innerHTML`** — pages with Trusted Types reject
  `innerHTML` outright.
- Screenshots are evidence, not proof. The numbers are the proof.
