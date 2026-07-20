# Owner review guide

## Open the prototype

From the repository root:

```bash
python3 -m http.server 4175
```

Open <http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-01>.

Baseline: `origin/main` / `main` at `addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b` on 2026-07-19. The review includes public/auth and all active D20/D21 solo-product surfaces. It excludes Explore, Teams, sharing/public/community, collaborators, pricing, and subscriptions.

## Thesis

Make Ritmo feel like one creator workstation: familiar music sourcing, a persistent class shape, fast scoring, and a pressure-safe Live instrument. Keep the current Classes / Music / Live / Account shell. Change hierarchy and shared component behavior, not the product IA.

## Five consequential changes

1. **Builder task hierarchy (P0-01):** Class Pulse, compact readiness, track score, focused inspector/drawer, persistent preview.
2. **Class Pulse signature (P0-02):** the class’s energy shape follows it from public proof through Classes, Builder, summary, queue, and Live.
3. **Unified sourcing (P0-04):** search, likes, playlists, URL import, and movement-led starts share selection continuity.
4. **Live pressure hierarchy (P0-05):** current cue/count, next cue, transport, time/effort survive ready, active, paused, list, and failure.
5. **Provider capability truth (P0-06):** catalog, library, and playback states use the same consequence/recovery language everywhere.

## Recommended inspection order

### 1. Product promise and first use

[Public entry](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-01) → [auth](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-02) → [invitation required](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-07) → [fresh account](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#CLS-02) → [empty class](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#CLS-03).

Decision focus: Does the four-verb loop feel concrete and private/solo-first? Are the music/template/movement starts peers without a forced funnel?

### 2. Resume and shape a real class

[Class library](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#CLS-01) → [library unavailable](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#CLS-05) → [summary](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#CLS-04) → [Builder](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-01) → [inspector](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-02) → [advanced](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-03) → [timeline](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-04) → preview [ready](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-05) → [playing](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-06) → [paused](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-14) → [resume failed](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-15) → [complete](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-16).

Decision focus: Is the Class Pulse useful without overclaiming? Does the workbench reduce context reconstruction? Toggle 390 mobile on BLD-01/02.

### 3. Source music from several starts

[Music disconnected](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#MUS-01) → [connected](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#MUS-02) → [status unavailable](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#MUS-07) → [likes](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#MUS-03) → [created confirmation](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#MUS-04) → [playlist](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#MUS-05) → [search](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#MUS-06).

Then review Builder-local [search](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-07), [likes](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-08), [playlist empty](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-09), [URL import](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-10), [custom moves](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-11), [songs-by-move empty](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-12), and [songs-by-move result](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#BLD-13).

Decision focus: Does one source/list/tray language preserve provider provenance and allow both “start class” and “add to class” outcomes?

### 4. Teach under pressure

[Live queue](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#LIVE-01) → [blocked preflight](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#LIVE-02) → [ready](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#LIVE-03) → [active](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#LIVE-04) → [paused](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#LIVE-05) → [full list](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#LIVE-06) → [playback recovery](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#LIVE-09).

Decision focus: In each state, can you find the next teaching action in one glance? Does prompter-only feel deliberate rather than degraded?

### 5. Trust, connections, and recovery

[Connections off](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#CONN-01) → [mixed/recovery](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#CONN-02) → [Account](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#ACC-01) → [Account connections](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#ACC-02) → [Account unavailable](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#ACC-03) → [loading](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#SYS-01) → [update](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#SYS-02) → [unexpected error](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#SYS-03).

Also inspect [password request](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-03), [privacy](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-04), [new password](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-05), and [not found](http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-06).

Decision focus: Is provider capability truth consistent? Does every recovery state say what is safe and what happens next?

## Compare current and proposed

On any surface, choose **Show current**. The left panel loads the matching captured current screenshot; the proposed UI remains live on the right. Use **Desktop / 390 mobile** to inspect treatment, and **Show decisions** for the recommendation and backlog IDs.

Raw evidence:

- `screenshots/current/` — 83 current captures.
- `screenshots/proposed/` — 102 captures: all 51 prototype inventory rows at desktop and mobile.
- `surface-inventory.md` — evidence level and source/component map for every row.

## Known limitations and gaps

- Populated provider playlist detail is code-confirmed, not observed; the mock provider returned no playlists.
- Completed Apple Music consent, runtime provider failure, PWA update, and stale-chunk/render recovery were not induced.
- A supplemental real-account SoundCloud check verified start, pause, and stop. Resume remained paused after two bounded attempts with no console error; provider/widget versus app-layer cause remains unisolated.
- Invitation rejection and contextual Classes/Music/Account load failures are code-confirmed and mocked, but were not induced for current screenshots.
- The 200% check uses a 640 CSS-pixel viewport equivalent rather than native zoom; 320px reflow was checked directly.
- The prototype is static: edits do not persist and audio does not play. SoundCloud preview start/pause/stop were verified separately in the real signed-in app; resume did not recover to playing.

## Record decisions

Use `run-decisions.md` or reply in chat with dispositions. Valid values are `approve`, `approve-with-notes`, `revise`, `reject`, or `defer`. Please decide the global direction first, then P0s/PDRs, then surface exceptions. Owner fields are intentionally blank; nothing in this preview is self-approved.

After all dispositions were recorded, the owner separately authorized Phase 4. The approved-only sequence is in `implementation-sequence.md`; six ready-to-run prompts are in `implementation-prompts/`. They do not authorize implementation or any Git/deployment action.
