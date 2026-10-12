# Native Chrome 200% zoom — 2026-10-12

Local UI verification on merged main `dbc8afbe8483502f13209d10729a199eb5e00780`.
Layout/readability/reachability checks passed for Builder and Live at actual Chrome 200%,
with one pre-existing tab-keyboard issue recorded below. This is not full accessibility acceptance.

## Zoom provenance

Steven set Chrome's native menu to 200% and explicitly reported the displayed percentage.
Agent native Chrome UI access timed out; tab shortcuts did not change zoom. The subsequent
real Chrome tab reports devicePixelRatio 4 (baseline 2), visualViewport.scale 1 and a
720×325 CSS viewport. No viewport override, device-scale override, page-scale override or
CSS zoom was applied. Owner confirmation plus corroborating runtime geometry establish
the zoom setting; the native menu itself was not captured by agent tooling.

## Verified

- Builder has no horizontal overflow. The selected track inspector and lower cue controls
  are reachable by scrolling. Keyboard reorder produces the synthetic saved/read-failed warning;
  Tab/Enter activates a reads-only retry. The unsaved Creator notes draft survives and visible
  focus returns to the selected First Light row.
- Live Cue-by-Cue and Full List remain reachable. The short desktop layout scrolls to effort,
  124 BPM, 8 holds, track/class time, complete long current/next guidance and full list marks.
  It does not display all teaching context simultaneously at this height.
- Tab/Enter switches views, opens More and reaches Reset/timeline. Right Arrow on the focused
  timeline changes the synthetic position to 0:05. Visible Complete is unobscured in both views.
  Keyboard Exit returns this standalone fixture to preflight (fixture reload, not a Builder-return test).
- Settled synthetic error shows four unobscured 44px recovery buttons; Retry is keyboard operable,
  and Continue without music removes recovery and moves focus to transport. Captured warning/error
  browser log list is empty. All sampled stages have zero document horizontal overflow.

## Finding retained

The Live view selector uses tablist/tab roles but Right Arrow did not move tab focus or selection.
Tab/Enter works. ViewToggle is byte-identical to pre-round `6691c9d`; this is an existing keyboard
accessibility gap, not introduced by #518/#519. The [WAI tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
expects left/right focus movement within a horizontal tablist. No product fix was made in this
verification-only pass; route a scoped follow-up before claiming complete tab keyboard conformance.

## Evidence and boundaries

`observations.json` records viewport, focus, preserved draft, completion visibility and recovery-hit
measurements. PNGs show actual zoomed Builder and Live states. `source-sha256.json` identifies
product source; `sha256.json` identifies this packet. Data and recovery adapter are local synthetic
fixtures from the merged evidence harness. This does not establish real audio, real provider
transport, screen-reader speech, real iPhone behavior, all browser/window sizes or production UI.

Production SPA rechecked read-only: `assets/index-DyruxT0m.js`. New UI fixes remain undeployed.
The Worker deployment identity was not rechecked during this pass. Subsequent Apple/SoundCloud
checks and their human/runtime boundaries are recorded in the
[provider packet](../provider-acceptance-2026-10-12/README.md). Steven authorized a local commit
of both packets and the handoff; push, PR, merge, deployment and cleanup remain separate.
