---
date: 2026-11-22
tool: 'Claude Code (desktop, Neo)'
lane: 'solo'
branch: 'feat/rf-231-apple-white-button'
head: '91e34bc'
base: '72fd059'
prs: ['#782 (merged as 72fd059)', '#783 (draft)']
status: open
---

# 08 has its Mac column (RF-233, merged); RF-231 is claimed in a draft PR and waits on one owner answer

## Done

- [#782](https://github.com/steven-crosby/ritmofit-web/pull/782), merged as `72fd059` with the
  owner's approval at `310a38d`: `08-ios-web-alignment.md` has its Mac column (D28), the
  design-system README names the glass tokens, and the #778 and #779 review notes are routed.
- The iOS copies of 08 and the design-system README were refreshed from `72fd059` in
  [ritmofit-ios#217](https://github.com/steven-crosby/ritmofit-ios/pull/217) (iOS RF-1226). Its
  merge state at this close is in the close summary, not here.

## Tasks

- [RF-233](../tasks/RF-233.json), [RF-234](../tasks/RF-234.json) (new, from #779's review),
  [RF-228](../tasks/RF-228.json) (its 08 links landed with RF-233).
- [RF-231](../tasks/RF-231.json) and [RF-232](../tasks/RF-232.json): the rest of the owner's
  2026-11-22 ask, "Web: RF-233 chain".

## In flight

- Draft [#783](https://github.com/steven-crosby/ritmofit-web/pull/783) on
  `feat/rf-231-apple-white-button`. It has three commits: the claim, 08's three wording fixes from
  #782's final review (with RF-232's matching acceptance wording), and this close. It has no button
  code. To resume, get the owner's answer in RF-231's next action, then build on this branch.

## Restart context

- **08 on `main` is wrong in three places until #783 merges,** and so is the iOS copy: the view
  toggle's arrows (they move focus; Enter or Space selects), the Mac main window's title bar (it
  has none) and the missing Back key ⌘[. The fixes are commit `91e34bc` on #783's branch. If
  RF-231 stays parked for long, they can move to a docs PR of their own.
- **Each merge that changes 08 turns iOS `main`'s parity red** until an iOS snapshot-refresh PR
  merges. Open that iOS PR at once after #783, and again after RF-232's PR.
- **#782's `owner-approved` label and approval comment were applied after the owner's "Yes, merge
  #782" in session,** and the final review ran after the ask, as the web policy orders it.
- **Apple's logo file was not downloaded.** Only its headers were read (195,405 bytes,
  last modified 2025-01-04).

## Verification

- Run on #782's final head `310a38d`: the required CI job and `owner-gate`, both green; locally
  `pnpm tasks:check`, `pnpm format:check` and the design system's `npm run verify`.
- Run on this branch: `pnpm tasks:check` and `pnpm format:check` at this close.
- Skipped: typecheck, tests, build and e2e locally, since no code changed in either PR. #783's CI
  result on this close's head isn't recorded here.

## Production as observed

- `main` is ahead of production by docs and records only: #780, #781 and #782.
- Evidence, read on 2026-11-22 at start-session: Worker `1fa79a87-f765-45a1-8ff5-f4f2e5d40e37`
  (message `35b5e73`) at 100%, and SPA `assets/index-BpJZWsjk.js` on three of three cache-busted
  fetches.

## Shared zones touched

- None. `ritmofit_design_system/08-ios-web-alignment.md` and `README.md` are files iOS vendors.

## Notes for other lanes / iOS

- iOS `web-contract/08-ios-web-alignment.md` carries the three wording errors above until the
  refresh that follows #783.
- 08's Mac column was checked against the owner's recorded decisions, `tokens.json` and the iOS
  source on `aee50f6`, not against a running Mac build.
