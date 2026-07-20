# Prototype notes and craft gate

This is one static, navigable owner-review artifact. `index.html` supplies the review shell; `preview.js` renders 51 proposed surfaces/states from one coherent fixture model; `preview.css` supplies shared tokens, components, desktop/mobile treatment, focus, and reduced-motion behavior.

Open from the run folder's repository root:

```bash
python3 -m http.server 4175
```

Then visit <http://localhost:4175/docs/audits/2026-07-19-full-product-preview/mockups/#PUB-01>. Serving from the repository root also makes the canonical local design-system fonts available.

Use the persistent index to navigate. `Desktop` / `390 mobile` changes the product treatment. `Show current` reveals the matching captured `origin/main` screenshot. `Show decisions` reveals the backlog IDs and recommendation for the selected surface. Related-state buttons traverse the material variants.

## Adversarial craft gate

| Check         | Result                                | Evidence / revision                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swap          | pass                                  | Replacing Class Pulse, track score, count strip, and Live pressure hierarchy with generic dashboard cards would materially remove the product’s music/class identity.                                                                                                                                                                                                                               |
| Squint        | pass after revision                   | Reduced simultaneous accent use; copper is primary authoring action, cyan is control/focus/playback, amber is warning, plasma appears only at the actual peak.                                                                                                                                                                                                                                      |
| Signature     | pass                                  | Class Pulse appears in public entry, Classes, summary, Builder, queue/preflight context, and Live. Track score and pressure hierarchy reinforce it.                                                                                                                                                                                                                                                 |
| Token         | pass                                  | All 51 views use one token/component stylesheet. No per-page palette exists. Canonical design-system contrast verification passed.                                                                                                                                                                                                                                                                  |
| Composition   | pass                                  | Discovery uses shelves/lists, creation uses a dense workbench, Account is quiet, and Live removes navigation chrome in favor of cue/transport.                                                                                                                                                                                                                                                      |
| Content       | pass                                  | Marisol, the same four classes, ten-track run-of-show, provider states, long hostile track, cues, timing, and readiness conditions persist across views.                                                                                                                                                                                                                                            |
| State         | pass with evidence gaps               | Populated, fresh, empty, loading, update, contextual error, disconnected, mixed authorization, preview ready/playing/paused/resume-failed/complete, Live active/paused/full-list, and runtime recovery are represented. Some current states are source-confirmed rather than induced.                                                                                                               |
| Responsive    | pass after two revisions              | The first draft stacked the entire class rail before mobile Builder; revised to a bounded horizontal chooser. A second pass removed inspector/grid overflow. Verified no internal overflow at 390, 300 internal pixels, and 640 CSS-pixel 200%-equivalent reflow.                                                                                                                                   |
| Accessibility | pass with one review-shell limitation | Representative public, Classes, Music, Builder, Live, and dialog views have no 390 overflow or sub-44px mobile targets after revision. Dialogs expose `role=dialog`, `aria-modal=true`, and names. Focus styling is 3px cyan. Reduced motion collapses animation and adds static `Now playing`. The review shell itself remains outside simulated dialog trapping so the owner can change surfaces. |
| Feasibility   | pass with two PDR seams               | The hierarchy maps to existing components and token architecture. Class Pulse authorship/persistence and provider playlist pre-browse need decisions PDR-02/PDR-03.                                                                                                                                                                                                                                 |

## Verification record

- `node --check mockups/preview.js` — pass.
- `(cd ritmofit_design_system && npm run verify)` — pass; tokens in sync, lint clean, semantic contrast pairs AA.
- Prototype console warnings/errors after full inventory load — none.
- 390 representative DOM checks — no page overflow after revision; no sub-44px targets in PUB-01, CLS-01, MUS-03, BLD-01/02, LIVE-04, or ACC-02.
- Preview-state checks — BLD-05/06/14/15/16 captured at desktop and mobile; BLD-15 exposes a persistent alert, preserves elapsed/provider context, and has no overflow or sub-44px controls.
- Preview workflow check — ready → playing → paused → observed resume-failed → restart-playing → stop-ready completed through the prototype controls with the expected view and accessible-region labels.
- Accuracy correction check — invitation-required, Classes unavailable, Music connection-status unavailable, and Account unavailable states added to the inventory, prototype, decisions, and desktop/mobile capture set.
- 320 viewport check — 300px internal product frame, no horizontal overflow, no sub-44px interactive target in Builder inspector.
- 200%-equivalent 640 CSS-pixel check — no prototype or page horizontal overflow after responsive revision.
- Narrow recovery check — PUB-07 at 320px and ACC-03 at 640px each expose one alert, no horizontal overflow, and no visible sub-44px interactive target.
- Reduced motion — media query matched; active pulse animation reduced to 0.01ms and static `Now playing` pseudo-label present.
- Long content — the 69-character multilingual title and long artist are present in track score/inspector fixtures; scan rows truncate while edit context remains available.
- Fixture arithmetic — the ten displayed manual tempos average exactly 127 BPM and the readiness language identifies carried manual values requiring confirmation.

## Known limitations

- Static actions change preview surfaces but do not persist edits or simulate a backend.
- Current/proposed comparison is screenshot-based by design; it is not a pixel overlay.
- Populated saved playlists, completed Apple authorization, production provider failure, PWA update, and stale-chunk failure were not observed live. Their proposed states are grounded in mounted code and adjacent observed behavior.
- The prototype demonstrates 390 mobile and reflow behavior, not a full physical-device matrix or screen-reader session.
- The generated Builder direction reference is non-authoritative and contains invented visual detail; only the extracted composition ideas listed in `preview-brief.md` were retained.
