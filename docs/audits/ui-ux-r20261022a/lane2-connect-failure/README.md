# Connect failure copy — r20261022a lane 2

`useProviderConnect` trims an `Error` message and stores that trim, or the existing sentence **Could not connect. Try again.** when the trim is empty. `new Error('')` and `new Error('   ')` show that sentence in the alert `ProviderConnectAction` already renders. **Cancel Apple Music connection** goes away, and **Connect Apple Music** is enabled again. **Consent cancelled.** and the timeout sentence **did not finish** stay. A non-Error still uses the same fallback.

`apps/web/src/lib/errors.ts` and `ProviderConnectAction.tsx` were not edited. No schema, API, migration, or OpenAPI change.

## Verification

On the previous hook, the empty `Error` had no alert and left **Cancel** up, and the whitespace `Error` showed a blank alert. **Consent cancelled.**, **did not finish**, and a non-Error already passed. After the change, `use-provider-connect.test.tsx` passed 9/9.

[Verification receipt](./verification.json): the CI-equivalent gate passed on 2026-10-22 from 17:30:42Z to 17:32:42Z. Format, typecheck, lint, design-system verify, theme classes, root tests (music 30, web 1261, api 486), Worker/D1 integration (196), web build, OpenAPI with no diff, contract parity, and `pnpm audit:ci` all passed.

[Browser receipt](./browser.json): local Chrome, signed-in Music shelf. `window.MusicKit` was stubbed so authorize rejected with `new Error('')`. At 1440 the alert showed “Could not connect. Try again.” **Cancel Apple Music connection** was absent. **Connect Apple Music** was enabled. `documentElement.scrollWidth` matched the viewport. No page errors.

Screenshot: [empty Error, desktop](./empty-error-1440.png).

390 and native 200% zoom are **NOT_ASSESSED**. No provider audio, real Apple account, screen-reader, or device acceptance is claimed. Production was not checked. This lane did not merge and did not deploy.

## Ownership

Product edits: `apps/web/src/lib/use-provider-connect.ts` and `use-provider-connect.test.tsx` only, plus this evidence folder and the lane handoff.
