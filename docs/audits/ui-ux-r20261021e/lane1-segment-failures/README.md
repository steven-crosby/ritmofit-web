# Segment failure copy — r20261021e lane 1

`SegmentBand` reports a blank failure through the existing `errMessage`. An empty `Error` or a non-Error becomes a sentence in the danger paragraph that was already there. A normal `Error` message stays. The editor stays mounted. No `role="alert"` was added.

| Action | Fallback |
| --- | --- |
| Load | Could not load segments. |
| Boundary save | Could not save the segment boundary. |
| Add | Could not add the segment. |
| Save edit | Could not save the segment. |
| Delete | Could not delete the segment. |

A view-only load with no band still returns nothing before that paragraph, including for a normal message.

`apps/web/src/lib/errors.ts` was not edited. No schema, API, migration, or OpenAPI change.

## Verification

On the previous component, the five new blank cases failed and the normal-message and view-only cases already passed. After the change, `SegmentBand.test.tsx` and `SegmentBand.test.ts` passed 41/41.

[Verification receipt](./verification.json): the CI-equivalent gate passed on 2026-10-22 from 05:41:21Z to 05:43:14Z. Format, typecheck, lint, design-system verify, theme classes, root tests (music 30, web 1240, api 486), Worker/D1 integration (196), web build, OpenAPI with no diff, contract parity, and `pnpm audit:ci` all passed.

[Browser receipt](./browser.json): local Chrome, signed-in Cycle class, mock track Titanium, timeline open. Page `fetch` for `GET /sections` rejected with `new Error('')`, then on a later open with `new Error('segment offline')`. At 1440 the danger line showed “Could not load segments.” and then “segment offline”. **Add segment** stayed. The paragraph is not an alert. `documentElement.scrollWidth` matched the viewport. No page errors.

Screenshots: [empty Error](./empty-error-1440.png), [normal message](./normal-message-1440.png).

390 and native 200% zoom are **NOT_ASSESSED**. No provider audio, screen-reader, or device acceptance is claimed. Production was not checked. This lane did not merge and did not deploy.

## Ownership

Product edits: `apps/web/src/components/SegmentBand.tsx` and `SegmentBand.test.tsx` only, plus this evidence folder and the lane handoff. `SegmentBand.test.ts` was not edited.
