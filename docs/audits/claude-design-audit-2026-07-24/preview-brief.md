# Preview brief — binding specification for phase 3

**Run:** `claude-design-audit-2026-07-24` · **Baseline:** `main` @ `9b188df`
This file governs the prototype. Every prototype view must trace to a row here, and every `primary` and
`must-mock-state` inventory row must appear below.

---

## 1. Product-specific direction

### Domain concepts (the vocabulary the design is built from)

1. **The arc** — a class is not a list, it is a shape over time: warm-up, build, peak, release. The
   instructor plans the arc before they plan the tracks.
2. **Cadence and tempo** — BPM is the number the instructor plans against; it is the value that decides
   whether a track can carry a climb or a sprint.
3. **The cue** — a sentence said out loud at a known millisecond. It is speech, not metadata.
4. **The placed move** — a movement anchored to a moment, drawn from a library the instructor has built.
5. **The clip window** — the authored slice of a track that will actually be used, distinct from the
   track's own length.
6. **Readiness** — the honest answer to "can I take this into a room tomorrow?", derived rather than
   asserted.
7. **The run of show** — the ordered, timed score an instructor scans before walking in.
8. **Sourcing** — provider libraries as raw material, never as a listening destination.

Why these: they are the units an instructor actually manipulates. A design organized around them reads as
an instrument; one organized around records, forms, and tabs reads as an admin tool.

### Colour and material world (already correct in canon — the prototype inherits, it does not invent)

1. **Warm espresso ink** (`bg/base` `#050403`, `bg/raised` `#1A1712`) — a dim studio, not a black void.
   It is the room the product is used in.
2. **Copper** (`#E07E3C` → `#C8682A`) — identity and the single committed action. Warm, metallic, the
   colour of effort.
3. **Cyan** (`#3AC0D4`, focus `#74D6E5`) — everything operable. Cool against the copper so "act on this"
   never reads as "this is the brand".
4. **Ember** (`#FF…` ramp top) — the top of the intensity ramp, where the class costs something.
5. **Plasma magenta** (`#FF2E88`) — peak affect only, roughly 1% of pixels. The drop.
6. **Bone** (`#FBF7F0` → `#9E927E`) — content and structure; translucent bone for borders so the warm
   dark stays calm.
7. **Hatch and grain** — non-colour texture for provisional/unscored data, so meaning survives greyscale.

Why this world and not a neutral grey dashboard: rhythm fitness happens in a warm, low-light, high-effort
room. The palette is the room. Latin identity lives in the copper–cyan–magenta triad, never in ornament.

### Signature — the Class Pulse as a load-bearing object

The signature is the **Class Pulse**: the class's effort over time, height-encoded, hatched where
unscored, and carrying a visible `◇ derived · confirm` provenance marker. It already exists and is the
best idea in the product. The prototype's contribution is to make it **load-bearing rather than
decorative** — the same object at four altitudes, doing real work at each:

1. **Marketing (PUB-01)** — proof of what the product produces.
2. **Classes and rehearsal (CLS-01, CLS-04)** — the class's identity in a list, replacing artwork.
3. **Builder (BLD-01)** — the editing target; changing effort reshapes it immediately.
4. **Live queue and runtime (LIVE-01, LIVE-03)** — the shape you are about to teach, and where you are in it.
5. **Empty and provisional states (CLS-03, LIVE-01)** — never a flat slab; a derived draft marked `auto`.

That is five relevant surfaces, and in each the Pulse is the thing being acted on, not an illustration.
It could belong to no other product: it is derived only from authored order, duration, and effort — never
from provider audio.

### Rejected generic defaults

| Rejected default | Why it fails here | Replacement |
| --- | --- | --- |
| **Three-up integration cards as a workspace** (current Music home) | It makes connection status the product and leaves 40% of the viewport empty; it is the default SaaS integrations page | A compact source rail (provider + state, one line each) plus a real result list — status becomes a rail item, sourcing becomes the surface |
| **Equal-weight choice grids** ("Choose the strongest starting point", four identical cards) | Offering four peers at the moment of least context is deferral dressed as flexibility | One recommended path rendered as the primary, the other three as visible, equal-access secondaries — plurality preserved, indecision removed |
| **Album-art-led music rows** | Artwork tells an instructor nothing about how to *use* a track | 44px bounded art; BPM and duration in the data face carry the visual weight |
| **A repeated generic primary** ("Finish refinements" ×3) | A call to action that appears identically four times is wallpaper | The readiness derivation supplies the verb per card |
| **Detail-page cards in a chooser** (current Live queue) | Full readiness detail at selection time is detail before decision | A scan row: name, shape, one readiness verdict, one action; detail on disclosure |
| **Two-orb gradient atmosphere** | Explicitly banned by `04-layout-and-surfaces.md`; it is Dribbble decoration | If a surface needs texture, derive it from the class's own bar grid |

### Depth, typography, spacing, radius, navigation, motion

- **Depth:** canvas `bg/base` → workbench `bg/sunken` → contained `bg/raised` → elevated `bg/overlay`
  with `shadow.lifted`. Glass only for overlays and the Live HUD; never glass on glass; never dense
  editable data on glass. Resting surfaces cast no shadow.
- **Typography roles:** Bricolage Grotesque for display moments only (marketing hero, Live title, screen
  heroes); Sora for all working text; **Azeret Mono for every number without exception** — BPM,
  timecodes, durations, counts, positions. A BPM in Sora is a bug.
- **Spacing:** 4px grid, `space.1`–`space.16`. Generous around information-bearing elements; tightened
  only inside deliberate dense regions such as the run-of-show list.
- **Radius:** `sheet` 24 for Live hero cards, `panel` 20 for overlays, `card` 16 for contained groups,
  `input` 12 for fields and buttons, `control` 10 for track rows, `pill` only for chips and tags.
- **Navigation:** the four locked destinations, unchanged, with `aria-current` and a neutral underline.
  Cyan is never used for persistent location. The prototype introduces **no fifth destination**.
- **Motion:** `fast`/`base` for nearly everything; `snap` only for "it landed" confirmations; `onBeat`
  only for the two allowlisted pulse surfaces. Under reduced motion everything degrades to a static state
  change with zero information loss — the current build already achieves this and the prototype must not
  regress it.

---

## 2. Coverage contract

Every `primary` and `must-mock-state` row from `surface-inventory.md`. `D` = desktop required,
`M` = 390 required.

| Inventory ID | Prototype view ID | D/M | Fixture + state | Backlog IDs shown | Interaction needed | Compare against |
| --- | --- | --- | --- | --- | --- | --- |
| PUB-01 | `pub-entry` | D+M | Marketing, synthetic demo class | — (reference) | scroll | `PUB-01-marketing-desktop.jpg` |
| PUB-02 | `pub-auth` | D+M | Sign in + sign up | P1-05 | toggle signin/signup | `PUB-02-signin-desktop.jpg` |
| PUB-03 | `pub-recovery` | D+M | Request + sent | — | submit | `PUB-03-recovery-sent-desktop.jpg` |
| PUB-05 | `pub-reset` | D | Token completion | — | — | `PUB-05-reset-desktop.jpg` |
| PUB-06 | `pub-notfound` | D+M | Unknown path | — | — | `PUB-06-notfound-desktop.jpg` |
| PUB-07 | `pub-invite` | D+M | Rejected signup | — | — | `PUB-07-invite-rejected-desktop.jpg` |
| SYS-01 | `sys-loading` | D | Workspace restoring | — | — | `SYS-01-workspace-loading-desktop.jpg` |
| SYS-02 | `sys-update` | D | Update available | — | — | code-confirmed only — annotate |
| SYS-03 | `sys-recovery` | D | Render recovery | — | — | code-confirmed only — annotate |
| CLS-00 | `cls-firstrun` | D | Tutorial overlay | — | — | code-confirmed only — annotate |
| CLS-01 | `classes-home` | D+M | 5 classes, mixed readiness | **P0-02, P0-03, P0-07, P0-08**, P1-06, P1-07, P2-02 | switch ordering | `CLS-01-library-desktop.jpg`, `-390.jpg` |
| CLS-02 | `classes-fresh` | D+M | Fresh account | P0-03, P1-05 | — | `CLS-02-fresh-desktop.jpg` |
| CLS-03 | `class-empty` | D+M | Untitled class, 0 tracks | P0-08, P1-05 | — | `CLS-03-empty-class-desktop.jpg` |
| CLS-04 | `class-rehearsal` | D+M | Sunrise Climb, read-only | P0-07 | — | `CLS-04-rehearsal-populated-desktop.jpg` |
| CLS-05 | `class-library-error` | D | Library unavailable | P1-05 | — | `CLS-05-library-error-desktop.jpg` |
| MUS-01 | `music-home` (disconnected) | D+M | No connections | **P0-01**, P0-06, P1-02 | state switch | `MUS-01-music-disconnected-desktop.jpg` |
| MUS-02 | `music-home` (mixed) | D+M | Connected/expired/none | **P0-01**, P0-06, P1-02 | state switch | `MUS-02-music-mixed-desktop.jpg` |
| MUS-03 | `music-likes` | D+M | 2 liked tracks, selection | P0-01 | select → tray | `MUS-03-likes-desktop.jpg` |
| MUS-04 | `music-created` | D | Class created from likes | P0-01 | — | `MUS-04-class-created-desktop.jpg` |
| MUS-05 | `music-playlist` | D | Playlist detail (populated) | P0-01, PDR-02 | — | **no current capture** — annotate as unverified |
| MUS-06 | `music-search` | D+M | Catalog results | **P0-01**, PDR-02 | type → results | `MUS-06-catalog-search-desktop.jpg` |
| MUS-07 | `music-status-unavailable` | D | Status 503 | — | — | `MUS-07-status-unavailable-desktop.jpg` |
| CONN-01 | `connections-dialog` (disconnected) | D+M | None connected | **P0-06** | — | `CONN-01-disconnected-desktop.jpg` |
| CONN-02 | `connections-dialog` (mixed) | D+M | Mixed states | P0-06 | state switch | `CONN-02-mixed-desktop.jpg` |
| BLD-01 | `builder-workbench` | D+M | Sunrise Climb, 10 tracks | P0-07, P1-07 | select a track | `BLD-01-builder-desktop.jpg`, `-390.jpg` |
| BLD-02 | `builder-inspector` | D+M | Track 1 essentials | **P1-01** | — | `BLD-02-inspector-desktop.jpg` |
| BLD-03 | `builder-advanced` | D | Advanced disclosure | P1-01 | expand | `BLD-03-advanced-desktop.jpg` |
| BLD-04 | `builder-timeline` | D+M | Slow Burn, free placement + gap | P0-07 | — | `BLD-04-timeline-desktop.jpg` |
| BLD-05/06/14 | `builder-preview` | D | ready / playing / paused | — | transport | `BLD-05`, `BLD-06`, `BLD-14` |
| BLD-15/16 | `builder-preview` (annotated) | D | resume failed / clip complete | — | — | **not induced** — annotate |
| BLD-07 | `builder-addmusic` | D+M | Search source | P0-01, PDR-02 | — | `BLD-07-addmusic-desktop.jpg` |
| BLD-08 | `builder-addmusic` (likes) | D | Likes source | P0-01 | — | `BLD-08-likes-desktop.jpg` |
| BLD-09 | `builder-addmusic` (playlists empty) | D | Empty | P0-08 | — | `BLD-09-playlists-empty-desktop.jpg` |
| BLD-10 | `builder-import` | D | URL import | — | — | `BLD-10-playlist-import-desktop.jpg` |
| BLD-11 | `builder-moves` (custom) | D | Hover Pulse | **P1-04** | — | `BLD-11-custom-moves-desktop.jpg` |
| BLD-12/13 | `builder-moves` (songs by move) | D | empty + results | **P1-04** | pick a move | `BLD-12`, `BLD-13` |
| LIVE-01 | `live-queue` | D+M | 4 runnable classes | **P0-02, P0-03, P0-07**, P1-03 | expand detail | `LIVE-01-queue-desktop.jpg` |
| LIVE-02 | `live-preflight` | D+M | Blocked playback | — | — | `LIVE-02-preflight-desktop.jpg` |
| LIVE-03 | `live-run-ready` | D+M | Ready | **P0-04**, P2-01 | — | `LIVE-03-run-ready-desktop.jpg` |
| LIVE-04 | `live-run-active` | D+M | Running | **P0-04**, P2-01 | — | `LIVE-04-run-active-dense-desktop.jpg` |
| LIVE-05 | `live-run-paused` | D | Paused | P0-04 | — | `LIVE-05-run-paused-dense-desktop.jpg` |
| LIVE-06 | `live-run-of-show` | D | Full list | P0-04 | — | `LIVE-06-run-of-show-desktop.jpg` |
| LIVE-09 | `live-run-failure` | D | Runtime failure | — | — | **not induced** — annotate |
| ACC-01 | `account` | D+M | Profile + preferences | P1-05 | — | `ACC-01-account-disconnected-desktop.jpg` |
| ACC-02 | `account` (connections) | D | Mixed provider ledger | P0-06 | — | `ACC-02-connections-desktop-full.jpg` |
| ACC-03 | `account-status-unavailable` | D | 503 | — | — | `ACC-03-status-unavailable-desktop.jpg` |

**No primary row is dropped.** Four rows (MUS-05, BLD-15, BLD-16, LIVE-09) and three code-confirmed rows
(CLS-00, SYS-02, SYS-03) are shown as proposals explicitly labelled *"current behaviour not verified in
this run"*, so the owner is never shown a proposal that pretends to rest on evidence it does not have.

## 3. Prototype information architecture

A single-page prototype, served statically, with:

- **Persistent left index** grouping views by domain (Public · System · Classes · Music · Connections ·
  Builder · Live · Account), each entry a stable `#anchor`.
- **Viewport switch** — Desktop / Mobile, re-rendering each view at 1440-equivalent or 390 width.
- **State switch** per view where the inventory names variants (disconnected/mixed, ready/active/paused,
  empty/populated/error).
- **Annotation toggle** — backlog badges (`P0-01`…) that can be turned off so the composition can be
  judged without chrome. Annotations never overlay controls when on.
- **Evidence line** on every view: the current screenshot filename it replaces, its surface IDs, and its
  coverage label.
- Every view reachable by direct anchor for owner review, and the whole thing usable from a simple
  static server at the repository root.

## 4. Shared component and token plan

One set of primitives guarantees the prototype reads as one product:

| Primitive | Purpose | Backlog tie |
| --- | --- | --- |
| `shell` | header, four destinations, `aria-current`, mobile compression | P1-07 |
| `pulse` | Class Pulse: height-encoded arc, hatched unscored, `◇ derived · confirm`, never flat | **P0-07, P0-08** |
| `readiness` | glyph + word + consequence + click-to-fix chip; supplies the primary verb | **P0-03** |
| `source-list` | one row model shared by Music search, likes, playlists, and Builder Add music | **P0-01**, PDR-02 |
| `source-rail` | compact provider + capability state, one line per provider | P0-01, P1-02 |
| `provider-state` | six-state matrix, glyph + label, colour only reinforcing | P0-06 |
| `track-row` | position, 44px art, title, artist, zone bars + label, BPM in data face, grip | — |
| `btn` | one copper primary per surface; neutral secondary; cyan text actions | P1-02 |
| `segmented` | neutral fill + 3px cyan indicator, `aria-pressed` | **P1-01** |
| `state-panel` | loading / empty / unavailable / error / recovery grammar | P1-05 |
| `live-hud` | AAA-safe label colour, data-hero BPM, dual timers, transport | **P0-04** |
| `annotation` | backlog badge + evidence line | — |

Tokens are taken from `ritmofit_design_system/tokens.json` values directly. The prototype introduces
**no new token values**. It makes two Live-scoped **re-maps** of existing values, both proposed by P0-04
and both marked in `preview.css` with their measurement: supporting labels move from `text/tertiary` to
`text/secondary`, and the Live primary's gradient runs `copper-400 → copper-300` instead of
`copper-400 → copper-500`.

## 5. Before/after evidence plan

Every primary surface gets a proposed capture written to `screenshots/proposed/`, named
`<SURFACE-ID>-<view>-<viewport>.jpg`, matching the current capture's viewport so the pair can be compared
side by side. Required proposed captures (desktop and, where the contract says M, 390):

`PUB-01`, `PUB-02`, `CLS-01`, `CLS-02`, `CLS-03`, `CLS-04`, `CLS-05`, `MUS-01`, `MUS-02`, `MUS-03`,
`MUS-06`, `CONN-01`, `CONN-02`, `BLD-01`, `BLD-02`, `BLD-04`, `BLD-11`, `LIVE-01`, `LIVE-02`, `LIVE-03`,
`LIVE-04`, `LIVE-06`, `ACC-01`.

Proposed captures are produced with the same tooling, viewports, and JPEG budget as the current set.

## 6. Hostile and accessibility plan

| Check | Demonstrated in |
| --- | --- |
| Long multilingual track title + long artist | `builder-workbench`, `live-run-of-show` (the fixture's track 4) |
| Long class title | `classes-home` |
| 180-character cue note | `builder-inspector` |
| Dense content (10 tracks + cues + moves) | `builder-workbench`, `live-run-of-show` |
| Empty / error / disconnected / unavailable | `class-empty`, `class-library-error`, `music-home` (disconnected), `music-status-unavailable`, `account-status-unavailable` |
| Visible focus | `foundations`, `live-run-ready` (focus states rendered, one ring token — P1-08) |
| Reduced motion | `live-run-active` (static equivalent shown alongside) |
| Narrow reflow | every view at 390; `builder-workbench` and `live-run-ready` additionally at 320 |
| Colour-independent meaning | `pulse` hatching, zone bars + number + word, provider glyph + label — all rendered in a greyscale proof strip on `foundations` |
| Live pressure hierarchy | `live-run-ready`, `live-run-active`, with the P0-04 label colour applied and measured |

**Traceability gate.** Inventory row → backlog ID → prototype view → proposed screenshot forms a closed
chain for every `primary` row. Rows with no backlog item (pure references such as PUB-04) are marked
`reference-only` and carry no proposal.
