# Prompt 01 browser evidence

Captured from the live Vite application on 2026-07-19 after the Prompt 01 implementation. No credentials,
personal provider-library content, or production data were used.

| File                              | State / viewport                             |
| --------------------------------- | -------------------------------------------- |
| `workspace-loading-1440x1000.jpg` | Real app session request paused, 1440×1000   |
| `workspace-loading-390x844.jpg`   | Real app session request paused, 390×844     |
| `update-390x844.jpg`              | Actual `RecoveryState` update composition    |
| `render-recovery-320x844.jpg`     | Actual `ErrorBoundary` with an induced throw |
| `hostile-recovery-320x844.jpg`    | Actual primitive with long multilingual copy |

The update and hostile-content compositions were mounted temporarily in the local browser through the Vite
module graph so the actual React component and generated Tailwind CSS could be inspected without adding a
production-only audit route. Unit tests separately verify `UpdatePrompt` service-worker actions and
`ErrorBoundary` reset behavior.

## Verified results

- Zero page-level horizontal overflow at 1280×800, 1440×1000, 390×844, direct 320px, and 640 CSS-pixel
  200%-equivalent reflow.
- Reload, Later, retry, and hostile-content actions retain a 44px minimum target.
- Keyboard focus renders a 3px cyan outline with a 3px offset.
- `prefers-reduced-motion: reduce` leaves no animation on the recovery surface and collapses the primary
  button transition to `0s`; glyph and visible state label remain.
- Sora, Bricolage Grotesque, and Azeret Mono loaded successfully.
- Loading shapes are hidden from assistive technology; the containing region is one polite, busy status.
- The only browser console errors were the deliberately induced render exception used to exercise the error
  boundary.

Browser inspection caught and corrected one issue before capture: `bg-border-default` is not a generated
background utility in this Tailwind mapping, so the class-shape skeleton initially rendered transparent.
The final captures use the valid `bg-border-strong` token utility.
