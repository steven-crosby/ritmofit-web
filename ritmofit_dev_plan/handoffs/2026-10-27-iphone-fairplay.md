---
date: 2026-10-27
tool: Cursor
lane: solo
branch: cursor/iphone-fairplay-handoff-615a
head: 0b7ac032263cafe020dfe5f4b1e70082f0fff5cc
base: 0b7ac032263cafe020dfe5f4b1e70082f0fff5cc
prs: []
status: open
---

# iPhone Safari still shows the bare Apple Music failure on #636

## Done

- [#637](https://github.com/steven-crosby/ritmofit-web/pull/637) (`2bd73e08`, better-auth 1.7.14) is on main.
- [#636](https://github.com/steven-crosby/ritmofit-web/pull/636) (`535e61aa9e940ca357f7d4d71ac5c65cdf3adf80`, FairPlay probe without `WebKitMediaKeys`) is on main and deployed.
- [#638](https://github.com/steven-crosby/ritmofit-web/pull/638) (`0b7ac032263cafe020dfe5f4b1e70082f0fff5cc`) records that deploy. Docs only. Not in the deployed tree.
- The empty-probe investigation on worker `bc-d8fc811c-21b0-5683-9ae1-2702e3852f76` finished. No code change and no deploy came out of it.

## In flight

- This docs handoff. No product-code PR is open for the probe word.
- Preflight that plays before Start is not started and not approved. Plan: project store `bc-22530555-6204-4e0e-bf89-4a3cbeeddcf2`, `docs/preflight-playback-plan.md`. Root cause: `docs/iphone-apple-music-root-cause.md` in that same store. Neither file is in this repo.

## Next action

Steven leaves Live, taps Reload now, and retries "Break Stuff" once. Confirm the loaded script is `assets/index-CClNobxY.js`.

Reload now is hidden while the class is open: the update card is `z-40` (`UpdatePrompt`) and Live Mode is `z-50`. The most likely reading of the bare banner is that the phone is still executing the previous precached bundle.

If a confirmed load of `assets/index-CClNobxY.js` still shows the bare sentence, the smallest next change is to remember `skipped` / `no-api` / the rejection name in the probe. Do not open that code PR. Do not deploy.

## Blockers and owner decisions

- iPhone iOS 27.0.1 Safari, after a cache clear and after the `535e61a` deploy: the banner is exactly `Apple Music playback failed for "Break Stuff"`. No `modern-access` word. Clock `0:00`. No MusicKit OK dialog. The screenshot is in the coordinator chat, not in the repo.
- That sentence is the authorized `mediaPlaybackError` path with an empty probe word. Production is Worker `24cdedc9-8103-417c-a502-23b0846c0967` at `535e61a`, and the network serves `assets/index-CClNobxY.js`.
- Steven wants preflight to actually play before Start. Not approved. Not started.
- Queued, not approved: Classes WCAG 2.5.3 label-in-name; Spotify playlist dialog "Try again" where retry cannot help.
- No deploy. No product-code PR.

## Verification

- Run: `git status -sb` on `main` at `0b7ac03`, clean, in sync with `origin/main`. `git fetch origin main` did not move it. `gh pr list --state open`: [#625](https://github.com/steven-crosby/ritmofit-web/pull/625) and draft [#596](https://github.com/steven-crosby/ritmofit-web/pull/596), both other sessions, left open. On this tree, `UpdatePrompt` is `z-40` and Live Mode is `z-50`.
- This environment: `GET https://ritmofit.studio/` and `/api/v1/health` returned 403, so the Worker was not re-read here. The finished investigation reports the network serves `assets/index-CClNobxY.js` on Worker `24cdedc9` at `535e61a`.
- Skipped: full CI-equivalent gate (light close, docs only). `ritmofit_dev_plan/` is Prettier-ignored, so `pnpm format:check` does not cover this file. No deploy. D1 was not re-checked; [#638](https://github.com/steven-crosby/ritmofit-web/pull/638) records that no migration was applied.

## Production as observed

- `main` vs production: after this handoff merges, main is ahead of production by docs only — [#638](https://github.com/steven-crosby/ritmofit-web/pull/638) `0b7ac03` and this handoff. The deployed tree stays `535e61aa9e940ca357f7d4d71ac5c65cdf3adf80`.
- Evidence: not re-checked from this environment (public origin 403). Investigation report: Worker `24cdedc9-8103-417c-a502-23b0846c0967`, tree `535e61a`, served JS `assets/index-CClNobxY.js`. Rollback recorded in #638 is Worker `df90f169-a51d-4476-bb9a-d4fbf6ab3663`. `DEVELOPMENT_PLAN.md` and `HISTORY.md` already match that deploy and were not edited.

## Shared zones touched

- none

## Notes for other lanes / iOS

- No API or run-payload change. iPhone Safari Apple Music Live still fails on the deployed web app. Do not start the probe-memory change or a deploy from this handoff.
- `DEVELOPMENT_PLAN.md` Now still says [#636](https://github.com/steven-crosby/ritmofit-web/pull/636) awaits the iPhone check and that production equals main `535e61a`. The Worker and asset in that record are right. The check has failed with the bare banner. Those files were left unchanged because the deploy record did not need a correction.
