# Lane 2 — Live preflight header

Measured 2026-10-21 in headless Chrome (`/usr/bin/google-chrome`) against the real `LiveMode` preflight header. Font confirmed: Bricolage Grotesque, 600 18px/28px. Viewport height 800, device scale 1. No audio. No provider playback.

The page was a local Vite probe that mounts `LiveMode` and was deleted before commit. The API was not running, so the body under the header shows the existing connection-check failure (`Failed to fetch`). That panel is not part of this change.

Titles:

| Name | Text | Length |
| --- | --- | --- |
| qa | `[QA] Preflight 15 r20261021` | 27 |
| spaced | `Saturday Morning Power Cycle Hills Repeats Climbs and Cadence Drills for the Long Room` | 86 |
| unbreakable | `W` repeated, no spaces | 200 |

A case passes when Exit's border box is inside the header and the viewport, the header's right edge is inside the viewport, neither the title box nor the title ink crosses Exit, Exit is at least 44×44, Tab focuses Exit, and Enter calls `onExit`.

## Before `min-w-0` and `break-words`

QA and the spaced title passed at 320, 390, and 1440. The 200-character title failed at all three widths. The header stayed viewport-wide, and Exit's left edge was outside it:

| Width | Exit left | Exit size | Title lines |
| --- | --- | --- | --- |
| 320 | 3608.8 | 60.5×44 | 1 |
| 390 | 3608.8 | 60.5×44 | 1 |
| 1440 | 3616.8 | 60.5×44 | 1 |

`shrink-0` was not added. Exit was already 60.5×44; it was pushed out, not shrunk.

Before screenshots were taken after Tab, so Exit can show its focus ring. Box numbers were measured before that keypress.

## After

9/9 passed. Exit stayed 60.5×44. The full title stayed in the `h1`. The unbreakable title wrapped beside Exit (17 lines at 320, 13 at 390, 3 at 1440). After screenshots are the resting layout; Tab then Enter was checked after the shot.

| Width | Title | Exit box | Title lines | Pass |
| --- | --- | --- | --- | --- |
| 320 | qa | 243.5–304 × 12–56 | 1 | yes |
| 320 | spaced | 243.5–304 × 46–90 | 4 | yes |
| 320 | unbreakable | 243.5–304 × 228–272 | 17 | yes |
| 390 | qa | 313.5–374 × 12–56 | 1 | yes |
| 390 | spaced | 313.5–374 × 32–76 | 3 | yes |
| 390 | unbreakable | 313.5–374 × 172–216 | 13 | yes |
| 1440 | qa | 1355.5–1416 × 12–56 | 1 | yes |
| 1440 | spaced | 1355.5–1416 × 12–56 | 1 | yes |
| 1440 | unbreakable | 1355.5–1416 × 32–76 | 3 | yes |

`prefers-reduced-motion: reduce` matched those unbreakable boxes at all three widths. It is not a behavior change for this header.

Native 200% zoom: **NOT_ASSESSED**. This was headless Chrome at device scale 1. No isolated window was zoomed.

## Teaching header

Not edited. At viewport height 900 (so the short-viewport rule does not hide the title) and the same 200-character title, Exit stayed inside the teaching header at 320, 390, and 1440 (52.5×44). The control row wraps below the title, so the title ink does not cross Exit. That ink still runs to about x=3609 because the teaching `h1` has no `break-words`. That is not the preflight push-out this lane fixes.

Raw box data: `before-measurements.json`, `after-measurements.json`.
