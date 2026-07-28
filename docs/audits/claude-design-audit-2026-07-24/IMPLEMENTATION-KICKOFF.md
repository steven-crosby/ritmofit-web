# Implementation kickoff — authorized work from the 2026-07-24 design audit

**Read this first if you are an agent starting an implementation session.**
Everything you need is in this folder. You do not need the audit transcript.

> ## Where this run stands — 2026-07-27
>
> **The six-prompt run is closed.** All six prompts landed, the §8 reconciliation passed, and the one
> defect the run introduced was fixed and merged (#382, merge commit `1acf615`). Nothing in
> [Step 2](#step-2--run-the-prompts) remains to be executed. **Not deployed** — that grant was never given.
>
> **If you are a new session, your work is [Follow-up work](#follow-up-work--open-as-of-2026-07-27), not
> the prompt table.** Read Step 0, the [measurement traps](#measurement-traps--read-before-you-verify-anything),
> and the non-negotiables — those all still bind — then go to the follow-up section. Skip Step 2.

---

## Authorization status

**All 18 backlog items are owner-approved.** Dispositions were recorded by the owner (Steven) in chat on
**2026-07-24** and are transcribed in [`run-decisions.md`](run-decisions.md), which is the authority — if
this file and the ledger ever disagree, **the ledger wins**.

All three product decisions were resolved by the owner in the same exchange:

| ID | Owner's resolution |
| --- | --- |
| **PDR-01** | **Teaching readiness is the default ordering** on both Classes and Live. Keep the labelled switch; "needs work" (today's behaviour) stays available. |
| **PDR-02** | **Music owns sourcing** via one shared source-list component, consumed by both Music and Builder's Add music. |
| **PDR-03** | **Group and demote** in the move picker — current template first, other disciplines collapsed but reachable. Never hidden. |

All six prompts are authorized to execute.

### Git rights — granted 2026-07-24

You may **branch, commit, push, open a PR, and merge it once CI is green.** The owner granted this on
2026-07-24, after approving the backlog.

**Deploy is NOT granted.** Deploys are manual and production-facing (`AGENTS.md`, "Security And
Deployment"), Ritmo ships in deliberate batches, and **merging to `main` does not deploy**. Ask the owner
separately, and never fold a deploy into a merge.

Working rules that come with the grant:

- **Branch from `main`; never commit directly to it.** One branch per slice.
- **One PR per slice.** Keep it to that slice's scope — no drive-by refactors or unrelated cleanup.
- **Run the repo gates before requesting merge** (see each prompt's Tests section for the proportionate
  set; the full CI-equivalent gate is in `AGENTS.md`).
- **Commit messages:** small Conventional Commits, e.g. `feat(web): …`, `fix(api): …`, `docs: …`.
- **PRs** explain behaviour and risk, list verification, include screenshots for UI changes, and call out
  schema, migration, shared-contract, config, secret, or deployment impact.

> **Note on production drift.** As of 2026-07-24 production is behind `main` by 7 app-code commits from
> *before* this work started. That is a pre-existing batch decision for the owner — do not treat it as
> something your slice should resolve, and do not deploy to "catch up".

---

## Do this, in this order

### Step 0 — orient (once, ~15 min)

Read, in order:

1. [`README.md`](README.md) — the verdict and the five consequential changes.
2. [`implementation-sequence.md`](implementation-sequence.md) — order, dependency graph, collision map, gates.
3. [`shared-foundations-contract.md`](shared-foundations-contract.md) — the primitives prompts 02–06 may not redefine.
4. `AGENTS.md` at the repo root — the canonical operating rules. **It wins over anything here.**

Then open the prototype so you can see what you are building toward:

```bash
python3 -m http.server 8099
# http://127.0.0.1:8099/docs/audits/claude-design-audit-2026-07-24/mockups/index.html
```

### Step 1 — boot the app

```bash
pnpm install --frozen-lockfile
cp apps/api/.dev.vars.example apps/api/.dev.vars   # if absent
# set BETTER_AUTH_SECRET and ENCRYPTION_KEY to freshly generated local-only values
# keep MOCK_PROVIDERS=true and BETA_ALLOWED_EMAILS blank
pnpm --filter @ritmofit/web build                  # wrangler needs apps/web/dist to exist
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
pnpm dev:api    # :8787
pnpm dev:web    # :5173
```

Two setup facts this run learned the hard way, both of which will otherwise cost you time:

- **`wrangler dev` fails if `apps/web/dist` does not exist** — it is the Worker's `assets.directory`.
  Build the SPA once first.
- **`ENCRYPTION_KEY` is blank in the example file, and without it every provider connection returns 503.**
  You will conclude providers are broken when they are not.

### Step 2 — run the prompts

**Prompt 01 is a hard gate.** Merge it and pass gate G1 before starting anything else.

> **Status, 2026-07-25: all six prompts have landed and the §8 reconciliation passed.** Nothing in
> this file remains to be executed. PRs #370 (01), #375 (02), #377 (03), #378 (04), #379 (05), and
> #380 (06); every one merged with GitHub CI green. **Not deployed** — that grant was never given.
>
> The reconciliation measured every touched surface at 1440×1000, 390×844, 320×844, and a
> 200%-equivalent reflow: **Live runtime 0 of 36 text nodes below AAA**, zero animations over 50ms
> under reduced motion, and a clean console across the whole traversal.
>
> Six primitives from the landed slices are binding on anything built next, and each is easy to
> re-fork by accident:
>
> 1. The focus ring is the single class `.rf-focus-ring`; do not write
>    `focus-visible:ring-2 focus-visible:ring-interactive`.
> 2. Live token re-maps live under `.bg-bg-live` in `index.css` plus `semantic.live.*` in
>    `tokens.json`.
> 3. `SourceList.tsx` is the one source-row, provider-handoff, selection, and tray grammar for Music
>    and Builder. Extend its action modes instead of copying its rows.
> 4. Provider state remains `providerCapabilityTruth` rendered by `ProviderCapabilityLedger`
>    (Catalog / Library / Playback). Do not create new labels or a second capability matrix.
> 5. `lib/class-ordering.ts` is the one ranking rule and the one next-step verb, shared by the
>    Classes shelf and the Live queue. A surface that ranks classes consumes it; it does not
>    re-derive one.
> 6. `lib/error-reference.ts` is how a failure is named to the instructor. No user-facing string
>    interpolates an upstream message.
>
> **Two findings this run measured but did not fix in the slices themselves:**
>
> - ~~The Builder surface's horizontal overflow is pre-existing.~~ **Corrected 2026-07-25: it was
>   introduced by prompt 05. Fixed and merged 2026-07-27 in PR #382, merge commit `1acf615`** —
>   `min-w-0 grow basis-48` makes the control layout-driven instead of content-driven, verified
>   `overflows: false` across all seven surface states at 320 and 390 with the select at 254/236/218px
>   and its 44px target intact. The cause was not `CompactClassChooser` — that track
>   scrolls correctly inside itself (clientWidth 262, scrollWidth 1096). It was the move picker: a
>   native `<select>` sizes itself to its widest `<option>`, so carrying each move's description in the
>   label made the control 392px wide and pushed the document to 425px against a 320px viewport.
>   Proven by shortening the option text in the live DOM, which took the document straight back to 320.
>
>   The original "identical on clean `main` at `798b9dc`" comparison was **wrong**: it used `git stash`
>   while Vite served the page with HMR, and the harness navigated before the rebuild landed, so the
>   same code was measured twice. **Lesson for the next run: to compare against another commit, use a
>   separate checkout or wait for the dev server to actually reload — never `git stash` under a running
>   HMR server.**
> - `.rf-brand-mark` (the header "R") is ink on the copper gradient at **3.79:1**. It is a logotype,
>   which WCAG 1.4.3 exempts from contrast, and it is app-shell branding no slice touched — recorded
>   so the next run does not re-derive it as new.
>
> Prompt 02's evidence gap stands: the local mock seam returns an empty saved-playlist array, so the
> populated MUS-05 playlist-detail path was never verified and must not be claimed. LIVE-09 likewise
> remains `code-confirmed` only — the fixture class runs prompter-only and never requests a stream.

| Order | Prompt | Owns | Concurrency |
| --- | --- | --- | --- |
| 1 | [`01-shared-foundations.md`](implementation-prompts/01-shared-foundations.md) — ✅ landed | tokens, contrast gate, `ClassPulse`, intensity control, focus ring | **alone** |
| 2 | [`02-music-sourcing.md`](implementation-prompts/02-music-sourcing.md) — ✅ landed | source-list extraction, Music workspace, connections | serial w/ 03, 04, 06 |
| 3 | [`03-classes-ranking.md`](implementation-prompts/03-classes-ranking.md) — ✅ landed | Classes ordering, card verbs, mobile rail | serial w/ 02, 04, 06 |
| 4 | [`04-live-pressure.md`](implementation-prompts/04-live-pressure.md) — ✅ landed | Live queue density, runtime composition | serial w/ 02, 03, 06 |
| 5 | [`05-builder-moves.md`](implementation-prompts/05-builder-moves.md) — ✅ landed | move picker, moves dialogs | **parallel-safe** |
| 6 | [`06-truthful-state-copy.md`](implementation-prompts/06-truthful-state-copy.md) — ✅ landed | account trust copy, derived access mode, error hygiene | last; serial w/ 02–04 |

**The one hard constraint:** `apps/web/src/components/Dashboard.tsx` is 4,975 lines and prompts 02, 03,
04, and 06 all edit it. Ownership is partitioned by *workspace region*, not by file. **Never run two of
those concurrently.** Prompt 05 is the only slice that does not touch it, so it can run alongside any one
of them.

Recommended shape: **two lanes after 01** — Lane A runs 02 → 03 → 04 → 06 strictly serially; Lane B runs
05 whenever. More lanes will produce merge conflicts, not throughput.

### Step 3 — gates between slices

Each prompt carries its own acceptance criteria. `implementation-sequence.md` §7 defines the gates
between them. Do not start the next slice until the previous one's gate passes.

### Step 4 — final combined pass

After the last slice, run the reconciliation in `implementation-sequence.md` §8 — the full local gate,
browser regression at all four geometries, a re-measured contrast pass, reduced motion, and a clean
console. **Per-PR verification is not a substitute for this.**

---

## Measurement traps — read before you verify anything

This run produced two false findings before catching them. Both are easy to repeat, and neither looks
wrong in the output — the incorrect numbers are entirely plausible:

1. **Focus rings.** Tailwind's `outline-none` emits `outline: 2px solid transparent` and draws the real
   ring with `box-shadow`. Reading only `outline` reports "no focus ring" on controls that have one.
   **Read both.**
2. **Contrast on gradient fills.** The copper primary paints a `linear-gradient` with a transparent
   `background-color`. A naive ancestor walk finds the page background and reports ~1:1 for ink-on-copper,
   which actually measures 5.34–7.04:1. **Composite the gradient stops and take the worst one.**

Trap 2 is not merely a false-positive generator: correcting it is what surfaced a *real* finding — the
Live transport primary at 5.34:1, below the AAA target. Prompt 01 fixed it.

A third trap the audit did not hit, but an implementation session will: **Chrome grants
`:focus-visible` only when the last interaction was a keypress.** A programmatic `.focus()` reports "no
ring" on every control in the app. Send real Tab keys.

Two more the *implementation* run hit, both of which produced confidently-stated false findings that
reached merged PR descriptions before being caught. They share one root cause — **a command's output was
trusted without checking the conditions it ran under**:

4. **Comparing against another commit under a live dev server.** `git stash` while Vite is serving with
   HMR does not give you the other commit's page: the harness navigates before the rebuild lands and you
   measure the same code twice. This is what made a defect *introduced by prompt 05* look pre-existing on
   `main`. **Use a separate checkout, or wait for the dev server to actually reload.**
5. **Running workspace scripts from a package directory.** `pnpm audit:ci` in `apps/web` answers
   `Command "audit:ci" not found` — the script is real and defined at root `package.json:20`; the working
   directory was wrong. This was reported as documentation drift in `AGENTS.md` twice. **Run the
   documented gates from the repository root.**
6. **Reasoning from config instead of the page.** A class missing from `tailwind.config.js` does *not*
   imply the property is unset: preflight supplies `border-color: #E5E7EB`, so a dead `border-*` class
   renders a bright gray hairline while a dead `bg-*` class goes transparent. And a component's source is
   not evidence it is mounted — `AccountDialog.tsx` is imported by nothing but its own test. **Grep for
   the call site, and read the computed style off the running page.**

The method that catches all of these is the one the harness README already prescribes: **swap the old
value back onto the same nodes in the same session and re-measure.** Two numbers from one session beat
two numbers from two runs, because everything else is held constant.

### Use the harness rather than re-deriving this

`agent-prompts/browser-verification/` handles the first three. It drives real Chrome over the DevTools
Protocol with zero dependencies, and measures contrast (AAA thresholds on Live, worst backdrop per
node), focus rings, horizontal overflow, and animations under reduced motion. `auth.mjs` signs a
headless browser in as a local fixture user without a password.

**Run its self-test first, every time:**

```bash
node agent-prompts/browser-verification/selftest.mjs
```

It renders swatches whose correct ratio is computed from `tokens.json` and requires the harness to
agree — gradients included. Expectations are derived rather than hardcoded, so it cannot rot as tokens
change, and it is verified to fail when the harness is broken. **If the self-test disagrees with
`tokens.json`, nothing else the harness prints is trustworthy.** Start at
[`agent-prompts/browser-verification/README.md`](../../../agent-prompts/browser-verification/README.md).

---

## Non-negotiables that outrank every proposal here

- **Music constraints.** Official provider-authorized playback only. Never cache, proxy, download, decode,
  mix, crossfade, or analyze provider audio. **Never source BPM from Spotify.**
- **No schema or migration changes.** Nothing in this plan needs one. If a slice appears to require one,
  that is a stop condition — report it.
- **D20/D21 boundaries.** Solo-first, web-first. Multi-entry creative flow: never collapse the product to
  one forced funnel. Explore, Teams, sharing, collaborators, publishing, and pricing stay dormant.
- **Token changes go through `ritmofit_design_system/tokens.json`** and the documented generation
  workflow. Never hand-edit generated output.
- **Real-browser verification is mandatory** for non-trivial UI work. Do not declare completion without
  it. Use `agent-prompts/browser-verification/` — and run its self-test before trusting any number it
  gives you.
- **Do not over-literalize the prototype.** It is a review artifact, not a component library. Preserve the
  proposed hierarchy, behaviour, states, and craft — not its static markup.

---

## What is deliberately NOT in scope

| Item | Status |
| --- | --- |
| MUS-05 populated playlist detail | Cannot be verified locally — the mock seam returns an empty playlist array by design. Do not claim it works. |
| BLD-15 / BLD-16 preview failure and clip completion | Not induced this run; need real provider audio |
| LIVE-09 runtime playback failure | Not induced — prompter-only mode never requests a stream. Code-confirmed only. |
| CLS-00, SYS-02, SYS-03 | Code-confirmed only; no change proposed |
| Audible playback truth | Headless blocks `encrypted-media`; `AGENTS.md` already requires a real browser |
| Any IA change or fifth destination | Out of scope by the audit's own constraints |

If a slice tempts you to close one of these gaps, stop and ask — it is new scope, not this plan.

---

## Follow-up work — open as of 2026-07-27

**This is what a new session implements.** The six prompts are done; these are the items the run
surfaced but did not close. Each says plainly whether it is actionable now.

A third measurement lesson, from F-01 itself: **reading the config is not measuring the page.** Both
false claims in the first draft of F-01 came from reasoning about `tailwind.config.js` instead of asking
the browser — one about what a dead class renders, one about whether the file renders at all. The
corrected findings are below; the method that caught them is in [Measurement
traps](#measurement-traps--read-before-you-verify-anything).

### Authorization for this follow-up

The 2026-07-24 git grant was scoped to *that run's six slices*. **It does not automatically extend
here.** The owner asked for this follow-up kickoff on 2026-07-27 but has not restated branch/push/PR/merge
rights for it. **Confirm the grant before pushing anything.** Deploy remains not granted, as always.

### F-01 — Color classes Tailwind never generates (✅ fixed 2026-07-27)

**Three class names were used in 12 places across 5 files that Tailwind never emitted**, so each element
fell back to something other than the token it named. Found by sweeping every `bg-*`/`text-*`/`border-*`
usage in `apps/web/src` against `apps/web/tailwind.config.js`; the INBOX breadcrumb had recorded only the
`AccountDialog` case.

| Dead class | Uses | Where | Why it was dead | What it actually rendered |
| --- | --- | --- | --- | --- |
| `border-border-default` | 7 | `Login.tsx:196,209,224,281`, `ResetPassword.tsx:131,148`, `IntensitySegmentedControl.tsx:83` | `border` is a `DEFAULT` key — the class is **`border-border`** | Preflight's `#E5E7EB` — a cool gray hairline, where `border/default` is `rgba(251,247,240,0.14)` |
| `bg-border-default` | 3 | `DialogState.tsx:47,55,71` | Same `DEFAULT` mistake — the class is **`bg-border`** | `transparent` — genuinely invisible |
| `bg-bg-surface` | 2 | `AccountDialog.tsx:97,140` | No `surface` key under `colors.bg` (`base`/`raised`/`overlay`/`sunken`/`live`); the `surface` token is the unrelated glass block | `transparent` — but latent, see below |

**Two things a config-only reading of this gets wrong, and both were caught only by measuring:**

1. **A dead `border-*` class does not remove the border.** Tailwind preflight supplies
   `border-color: #E5E7EB`, so the auth inputs rendered a *bright cool-gray* hairline on a near-black
   warm surface — off-palette and more prominent than intended, not absent. Measured in real Chrome on
   the same nodes in one session: PUB-02 sign-in inputs, PUB-05 reset inputs (the form needs a `token`
   query param to render), and the Builder intensity control all read `rgb(229,231,235)` before and
   `rgba(251,247,240,0.14)` after. **A dead `bg-*` class does go fully transparent** — the SYS-01
   skeleton's primary line was empty space beside its `bg-border-subtle` sibling at 0.08.
2. **`AccountDialog.tsx` is orphaned.** It is referenced by nothing but its own test — the app renders
   `AccountWorkspace` inside `Dashboard.tsx` instead. So the `bg-bg-surface` uses had **no user-facing
   impact**; ACC-01 in the running app was never affected. Corrected to `bg-bg-base` anyway, matching the
   sibling cards at `AccountDialog.tsx:121,132`.

Fixed as a **token-consumption change only** — `tokens.json` untouched — and the built CSS now emits all
three classes against the intended custom properties.

~~**Still open:** a class that does not exist is invisible to both `tsc` and lint, which is why 12
accumulated. A gate belongs in CI.~~ **Closed 2026-07-27:** `pnpm --filter @ritmofit/web theme-classes`
runs in CI ahead of the test step, with `--selftest` first. Valid names are derived from
`tailwind.config.js`, so the gate cannot rot as tokens change, and the self-test asserts it still rejects
all three original regressions.

Building it surfaced a fourth class of bug worth knowing: **a colour-utility prefix is not owned by the
colour scale.** The first version flagged `shadow-peak-glow` in `TutorialVideo.tsx` as dead — it is a
legitimate `theme.extend.boxShadow` key, and the built CSS proves it generates. The checker now resolves
each utility against every scale it reads (`shadow`→`boxShadow`, `border`→`borderRadius`,
`text`→`fontSize`, `bg`→`backgroundImage`), and the self-test covers every key of those scales.

### F-02 — D11 `createPattern` `InvalidStateError` (unconfirmed, do not close)

The audit reported it; the implementation run could not reproduce it. There is **no canvas and no canvas
dependency anywhere in `apps/web`**, and a full Builder session in Chrome 150 logged zero console errors.
**Treat as unconfirmed, not fixed and not closed** — if a future change introduces a canvas, re-check.

### F-03 — Evidence gaps — mostly closed 2026-07-27

Verified on **production** in a real (non-headless) Chrome against a live Apple Music and SoundCloud
account, which is the only place these paths exist. Nothing was written: the run used browse-only and
playback controls, `Start class` in the playlist browser was never clicked (it imports and creates a
class), and Live mode issues no writes at all — it consumes one `run-payload` GET.

| Surface | Status | Evidence |
| --- | --- | --- |
| **MUS-05** playlist detail, populated | ✅ **works** | 70 real Apple Music playlists; opening one renders tracks with artwork, artist, and duration. **But see F-05 — the track count is wrong.** |
| **BLD-05/06/14** preview ready / playing / paused | ✅ **works** | "Preview ready" → "Now playing · SoundCloud" with the clock advancing → "Preview paused" at 0:15 |
| **BLD-15** preview resume failed | ✅ **works** | Induced by neutralising the SoundCloud widget while paused. Renders "Resume failed" → "SoundCloud could not start playback", names the provider without leaking an upstream message, states "your class edit, selected track, and scoring changes are unchanged", and offers Start clip again / Stop auditioning / Reconnect SoundCloud. Recovery works: "Start clip again" rebuilt the widget and resumed. |
| **BLD-16** preview clip complete | ✅ **works** | Let the clip run its full 3:04 window; renders "Preview complete" at 3:04/3:04 with the action flipped to "Replay clip on SoundCloud" |
| **LIVE-01/02** queue and preflight | ✅ **works** | Readiness ledger reads "Runnable 3 of 3 · needs a duration 0 · music all linked"; preflight resolves real provider capability — "10 tracks ready · 0 need a decision", per-track "Plays on SoundCloud" |
| **LIVE-09** runtime playback failure | ❌ **still not induced** | See below — two attempts, both unfaithful |

**LIVE-09 resisted induction, and the reason is worth carrying forward.** `PlaybackRuntime.fail()`
(`apps/web/src/lib/playback/runtime.ts:403`) is reachable only from five triggers: preflight finds a
track unplayable, connections change mid-class, no adapter factory exists for the provider, the adapter
emits `onError`, or the adapter throws while loading. Two inductions were tried and **neither is a fair
test**:

1. **Blanking the SoundCloud widget iframe.** The widget stops responding without emitting anything, so
   no `onError` ever fires. This proves nothing about a genuine provider error.
2. **Removing `window.SC.Widget`.** The loader (`soundcloud-adapter.ts:65`) re-injects the script and
   recovers, so the adapter never throws.

Reaching it honestly needs a real provider outage, or a connection change mid-class — which is a write.
**LIVE-09 stays `code-confirmed` only. Do not claim it works.**

**One risk surfaced while trying, unproven and worth a look:** when the player died silently (iframe
blanked), the Live runtime kept advancing the clock and kept displaying "♪ SoundCloud" with no alert —
the instructor would get silence with no signal. `LiveMode.tsx` states the intent as "playback failure is
a serious recoverable alert … never a silent skip", and there is **no liveness check** on the adapter to
enforce that. Whether a provider player can die this way in the wild is unknown; the induction was
artificial. **Treat as a question to investigate, not a defect.**

### F-05 — Apple Music playlists always report "0 tracks" (open, found 2026-07-27)

Every one of 70 saved playlists renders "0 tracks" — on each list row and in the detail header, directly
above a list of real tracks. `packages/music/src/apple-music.ts:397` reads
`trackCount: a?.trackCount ?? 0`, but the fetch is `/v1/me/library/playlists` and Apple's
`LibraryPlaylists` attributes do not carry `trackCount`, so the fallback fires every time.

**Apple-Music-specific.** Spotify reads `raw.items.total` (`spotify.ts:353`) and SoundCloud reads
`pl.data.track_count` (`soundcloud.ts:458`); both providers do return those.

This is a P1-05 violation in the shipped product — the surface states a confident "0 tracks" for
something it never learned. The truthful fix is to **omit the count when the provider does not report
one** rather than fetch tracks for every playlist to compute it. Confirm the API behaviour first; do not
assume this note is still accurate.

**Only live providers could have found this.** The local mock seam returns an empty playlist array, so
there was never a row to render a count on.

### F-04 — Owner decisions still open

Not agent work; listed so a session does not treat them as its own to resolve.

- ~~**Deploy.**~~ **Done 2026-07-27** — Worker `085a153f`, then `d0a89df6` to realign prod with `main`.
  See `ritmofit_dev_plan/HISTORY.md`.
- **`.rf-brand-mark` at 3.79:1.** A logotype, which WCAG 1.4.3 exempts. Recorded, not a defect.
- ~~**Repo cleanup.**~~ Done 2026-07-27; merged branches from this run are off `origin`.

---

## Suggested first message for a fresh session

> Read `docs/audits/claude-design-audit-2026-07-24/IMPLEMENTATION-KICKOFF.md` — the six-prompt run is
> closed, so **skip Step 2** and work the **Follow-up work** section. F-01 is fixed and F-03 is largely
> verified on production; **F-05 is the open defect.** Do not re-derive F-02 or LIVE-09 as new findings —
> read why each is open
> first. Preserve `.rf-focus-ring`, `ClassPulse`, `SourceList`, `lib/class-ordering.ts`,
> `lib/error-reference.ts`, and the provider capability truth/ledger rather than re-forking them. Run the
> full CI-equivalent gate in `AGENTS.md` **from the repository root**. Verify any UI change in a real
> browser at 1440×1000, 390×844, and 320×844 with the committed `agent-prompts/browser-verification/`
> harness, and run its self-test first. **Confirm your git rights with the owner before pushing** — the
> 2026-07-24 grant covered that run's six slices, not this follow-up. **Do not deploy.**

If you are instead re-running one of the six prompts, swap in its filename and cite the gate that
unblocked it — but check the Step 2 status first, because all six have landed.

---

## Housekeeping — done

Both items this file used to leave open are closed. [`docs/audits/README.md`](../README.md) now carries a
row for this run recording that all six prompts landed, and its 2026-07-19 row already describes that run
correctly as all six landed rather than "prompts 01–02 … implemented".

~~One item is genuinely open: `AGENTS.md` lists a `pnpm audit:ci` gate that is not defined.~~
**Corrected 2026-07-25: that finding was wrong.** `audit:ci` **is** defined in the root `package.json`
as `pnpm audit --prod`. It was reported missing after being run from `apps/web`, where pnpm's workspace
resolution answers `Command "audit:ci" not found` — the script is real, the working directory was not
the root. **Run the documented gate from the repository root.**

Worth knowing when it does fail: `pnpm audit` depends on npm's live advisory endpoint, which
intermittently returns a body pnpm cannot parse (`ERR_PNPM_AUDIT_BAD_RESPONSE`). That failure is
registry-side and reproduces for everyone at once — check whether it also fails on an untouched
checkout before treating it as a defect in your change.
