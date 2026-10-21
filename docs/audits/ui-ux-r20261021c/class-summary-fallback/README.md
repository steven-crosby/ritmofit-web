# Class summary load fallback — r20261021c

`ClassSummaryView` reports a failed `getRunPayload` through the existing `errMessage`. An empty `Error` or a non-Error becomes “Something went wrong.”, and the recovery panel opens. The dialog heading is “Class summary” once that panel is showing. A normal message such as `summary offline` stays as written.

`apps/web/src/lib/errors.ts` was not edited. No schema, API, migration, or OpenAPI change.

## Verification

On the previous component, the two new cases rendered only the heading `Loading class…` and did not show “The class summary could not load.” After the change, `ClassSummaryView.test.tsx` passed 7/7, including `new Error('summary offline')` still showing `summary offline`.

[Verification receipt](./verification.json): the CI-equivalent gate passed on 2026-10-21 from 20:15:00Z to 20:16:42Z. Format, typecheck, lint, design-system verify, theme classes, root tests (music 30, web 1221, api 486), Worker/D1 integration (196), web build, OpenAPI with no diff, contract parity, and `pnpm audit:ci` all passed.

[Browser receipt](./browser.json): local Chrome, signed-in Classes home. Page `fetch` for `/run-payload` rejected with `new Error('')`, then **Try rehearsal again** rejected with `{ code: 1 }`. At 1440 and 390 the dialog showed “Class summary”, “The class summary could not load.”, “Something went wrong.”, and **Try rehearsal again**. The heading was not `Loading class…`. `documentElement.scrollWidth` matched the viewport at both widths. No page errors. Screenshots: [empty Error, desktop](./empty-error-1440.png), [empty Error, 390px](./empty-error-390.png), [non-Error, 390px](./non-error-390.png), [non-Error, desktop](./non-error-1440.png).

Native 200% zoom is **NOT_ASSESSED**. No provider audio, screen-reader, or device acceptance is claimed. Production was not checked. This lane did not merge and did not deploy.

## Ownership

Product edits: `apps/web/src/components/ClassSummaryView.tsx` and `ClassSummaryView.test.tsx` only, plus this evidence folder and the lane handoff.
