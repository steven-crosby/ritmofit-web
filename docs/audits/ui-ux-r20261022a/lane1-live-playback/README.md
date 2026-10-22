# Live playback failure copy — r20261022a lane 1

Confirmed playback that reports an empty or whitespace `message` now goes through the existing `errMessage` on that string. The recovery region is `role="alert"`, the heading is **Playback stopped**, the body is **Something went wrong.**, and **Retry playback** stays. It does not use the waiting heading or the waiting sentence.

A normal message stays, including **Apple Music stopped**. The waiting panel, with no failure string, stays **Waiting for music**, **Provider playback has not confirmed progress.**, and no **Retry playback**.

`errMessage` is called on `next.error.message`. Passing the plain playback error object would drop **Apple Music stopped**. `apps/web/src/lib/errors.ts` and `apps/web/src/lib/playback/runtime.ts` were not edited. No schema, API, migration, or OpenAPI change.

## Verification

On `c466994`, before the store change, the two new cases failed and the **Apple Music stopped** and 2-second waiting cases already passed. After the change, `LiveMode.test.tsx` passed 101/101.

[Verification receipt](./verification.json): the CI-equivalent gate passed on 2026-10-22 from 17:33:11Z to 17:34:57Z. Format, typecheck, lint, design-system verify, theme classes, root tests (music 30, web 1260, api 486), Worker/D1 integration (196), web build, OpenAPI with no diff, contract parity, and `pnpm audit:ci` (1 low and 1 moderate, both ignored) all passed.

[Browser receipt](./browser.json): local headless Chrome, signed-in Cycle class, mock track Baianá. `window.SC.Widget` `play()` threw `new Error('')`. At 1440 the alert showed **Playback stopped**, **Something went wrong.**, and **Retry playback**. No heading **Waiting for music**. `documentElement.scrollWidth` matched the viewport. No page errors.

The existing run-state string still reads **Teaching paused · waiting for music** while music is blocked, including this error. This lane did not change that string.

Screenshots: [full Live screen](./blank-playback-1440.png), [recovery alert](./blank-playback-1440-alert.png).

390 and native 200% zoom are **NOT_ASSESSED**. No provider audio, screen-reader, or device acceptance is claimed. Production was not checked. This lane did not merge and did not deploy.

## Ownership

Product edits: `apps/web/src/components/LiveMode.tsx` and `LiveMode.test.tsx` only, plus this evidence folder and the lane handoff.
