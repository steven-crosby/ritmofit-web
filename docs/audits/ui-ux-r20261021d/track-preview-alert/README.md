# Track preview failure alerts — r20261021d

`TrackPreview` reports a blank failure through the existing `errMessage`. An empty `Error` or a non-Error becomes a sentence in the alert. A normal `Error` message stays.

`apps/web/src/lib/errors.ts` was not edited. Playback helpers were not edited. No schema, API, migration, or OpenAPI change.

An empty string is not stored as a connections failure. `listConnections` stores `errMessage`'s sentence, and the unverified chip reads that non-empty string. A loaded connection leaves the chip alone.

The preview-interrupt line uses `errMessage` on the message the controller already built. An empty message becomes “Something went wrong.” A non-Error still shows the controller’s existing “Could not start …” or “Could not resume preview.” sentence. Search uses “Search failed.” Attach uses “Could not attach.”

## Verification

`TrackPreview.test.tsx` passed 22/22, including `new Error('')`, a non-Error, and a normal message for the connections status, the preview alert, search, and attach.

[Verification receipt](./verification.json): the CI-equivalent gate passed on 2026-10-21 from 22:40:26Z to 22:42:17Z. Format, typecheck, lint, design-system verify, theme classes, root tests (music 30, web 1233, api 486), Worker/D1 integration (196), web build, OpenAPI with no diff, contract parity, and `pnpm audit:ci` all passed.

[Browser receipt](./browser.json): local Chrome, signed-in builder, mock track Titanium. The page replaced `window.Spotify.Player` so preview prepare rejected with `new Error('')`, then on a later load with `{ code: 1 }`. At 1440 and 390 the alert showed “Preview interrupted” and “Something went wrong.” for the empty `Error`, and “Could not start "Titanium".” for the non-Error. No `role="alert"` was blank. `documentElement.scrollWidth` matched the viewport at both widths. No page errors.

Screenshots: [empty Error, desktop](./empty-error-1440.png), [empty Error, 390px](./empty-error-390.png), [non-Error, 390px](./non-error-390.png), [non-Error, desktop](./non-error-1440.png). Cropped alert shots: [empty 1440](./empty-error-1440-alert.png), [empty 390](./empty-error-390-alert.png), [non-Error 390](./non-error-390-alert.png), [non-Error 1440](./non-error-1440-alert.png).

Native 200% zoom is **NOT_ASSESSED**. No provider audio, screen-reader, or device acceptance is claimed. Production was not checked. This lane did not merge and did not deploy.

## Ownership

Product edits: `apps/web/src/components/TrackPreview.tsx` and `TrackPreview.test.tsx` only, plus this evidence folder and the lane handoff.
