# Web Launch Session Plan

This is the session-sized workflow for the active Web Launch Readiness milestone. It complements
`web-launch-readiness.md`: that file is the gate; this file is the working order.

## Session 0 — Lock The Docs

Status: mostly done.

- Review the launch-readiness documentation diff.
- Commit the launch-readiness refactor.
- Confirm the launch rule: everything in `ritmofit_dev_plan/` is launch-required except Explore feature
  expansion and Teams feature expansion.
- Confirm StructClub parity and polish are launch-critical for the web launch surface.

## Session 1 — Production Truth Audit

Goal: find what is actually broken or rough before building more.

- Run the full CI-equivalent gate locally.
- Smoke production routes: SPA, health, protected routes, Explore, Teams, Shares, playlist import, and
  uploads.
- Manually walk the core instructor loop in production or a launch-candidate local stack.
- Produce a short launch blocker list.

## Session 2 — Auth, Account, And Provider Readiness

Goal: remove first-user friction.

- Verify sign-up, sign-in, sign-out, password reset, verification email, and expired-session behavior.
- Verify provider connect, search, import, likes, and BPM paths.
- Verify provider disconnect purge behavior.
- Confirm Apple/Google auth provisioning status.

## Session 3 — Library Polish

Goal: make the first impression feel launch-worthy.

- Improve Library presentation: track-art collage, duration, last-opened date, and duplicate action.
- Add or refine the create-class chooser.
- Verify empty, loading, and error states.
- Check mobile and desktop layouts.

## Session 4 — Class Detail And Songs By Move

Goal: make the planning loop discoverable instead of buried.

- Add or improve class-detail read mode outside the editor.
- Promote Songs by Move into a first-class class-starting path.
- Confirm class tags and theme search fit the workflow.

## Session 5 — Builder Polish

Status: **done and deployed (2026-06-28).** All four shipped-code gaps closed (PRs #137–#140, Workers
`4eab08f3` → `c34515d1`), then the Session 5 follow-up PR #143 deployed at Worker `92d3904e`. See
`HISTORY.md`.

Goal: close the known shipped-code gaps.

- ~~Add custom-move `baseMoveId` / template editing.~~ Done (#139) — manager edit form sets discipline +
  base move; UI-only, contract/API already supported it.
- ~~Add the planning timeline playing-track pulse.~~ Done (#137) — the active track's block carries the
  design system's second sanctioned tempo pulse, reduced-motion-safe.
- ~~Add segment-band track-range binding.~~ Done (#140) — "Snap to tracks" snaps a dragged/keyed segment
  boundary to the nearest track edge; authoring affordance, no contract change.
- ~~Expand the rhythm-cycle default move vocabulary.~~ Done (#138) — +7 cycle moves; data-only seed, remote
  re-seed applied.
- ~~Manual visual pass + 320px layout fix.~~ Done (#143) — pulse cadence, reduced-motion fallback,
  segment snap, and 320px/desktop layouts verified; fixed track-list overflow at 320px.
- ~~Settings/profile surface beyond sign-out.~~ Done (#143) — Account dialog backed by `GET/PATCH
  /auth/me`, with sign-out retained inside the dialog.

Deferred follow-ups: none for Session 5. Continue with Session 6.

## Session 6 — Live Mode And StructClub Parity Pass

Status: **done (web, 2026-06-28).** Live Mode verified via a browser walk (desktop + 320px): cue
prompter, virtual interval timer, intensity (bars + label + color), notes, trim/clip handling, beat
pulse, cue colors, wake lock, and the no-in-app-playback constraint all hold. One gap closed — the live
prompter now renders a compact current-section energy-arc band from the run-payload `sections[]` (it was
previously dropped in Live). Web-only, no contract/schema change; iOS parity tracked in
`web-ios-parity.md`. Continue with Session 7.

Goal: pass the core competitor comparison without compromising RitmoFit's constraints.

- ~~Verify cue prompter, timer, intensity, notes, sections, trim, and beat behavior.~~ Done — all
  verified; the missing live **sections** indicator was added (compact current-section band).
- ~~Confirm beat-aware authoring, cue colors, class copying, sharing, and team-share support.~~ Done —
  cue colors render in Live (focal card, full-list pill, timeline markers); copying/sharing/team-share
  verified in earlier sessions.
- ~~Confirm the UI does not imply in-app playback, embedded provider playback, audio mixing, or Spotify
  BPM.~~ Done — Play/Pause drives the virtual prompter clock only; provider handoff is validated external
  links; BPM is manual `displayBpm`.

## Session 7 — Accessibility And Responsive Sweep

Status: **done (web, 2026-06-29).** Swept the launch surface for a11y and responsive issues; the
surface was already in strong shape (centralized `Dialog` focus-trap primitive, `PendingList`
loading→retry primitive, global 401→sign-out→`<Login>`), so this stayed surgical — two launch-blocking
fixes, no churn. Verified live via a real-browser screen-reader + responsive walk at 320/768/1280.
Web-only, no contract/schema change; iOS parity tracked in `web-ios-parity.md`. Continue with Session 8.

Goal: reach launch-grade usability.

- ~~Verify keyboard focus, labels, and reduced-motion behavior.~~ Done — centralized dialog focus trap
  (inert background + restore + Escape), zero clickable non-buttons, all imgs carry alt, reduced-motion
  handled in CSS + the two motion components; confirmed in the browser walk.
- ~~Check mobile, tablet, and desktop layouts.~~ Done — Live Mode, dashboard, and the builder verified at
  320/768/1280 with zero horizontal-overflow offenders (programmatic check + screenshots).
- ~~Verify empty, error, loading, and permission states.~~ Done — audited every surface; closed the one
  launch-blocker (the class-library load-error had no retry, PR #151). Added a `role="alert"` + working
  "Try again" matching the dialogs' `PendingList` pattern.
- ~~Fix launch-blocking design-system issues only.~~ Done — also added Live Mode section/energy-arc
  screen-reader announcements (a polite live region, on-change only, PR #150), the one a11y gap the
  Session 6 section bar left.

Deferred follow-ups: none for Session 7. Continue with Session 8.

## Session 8 — Launch Candidate

Goal: ship the web app.

- Run the full launch gate.
- Build the web app.
- Apply any required remote D1 migrations before code.
- Deploy manually through `deployment-runbook.md`.
- Run production smoke.
- Delete production test data.
- Update `HISTORY.md` and launch notes.

## Session 9 — iOS Handoff Prep

Goal: move cleanly from web launch to iOS parity wrap.

- Refresh OpenAPI and run-payload expectations.
- Reconcile `web-ios-parity.md`.
- Start iOS wrap with contract/design drift first, then capability parity.

## Current Recommendation

Sessions 1–7 are done. Start with **Session 8 — Launch Candidate**: run the full launch gate, build the
SPA, apply any required remote D1 migrations before code, deploy manually through
`deployment-runbook.md`, run production smoke, delete any production test data, and update `HISTORY.md`
plus launch notes. No schema/migration changes are pending from Sessions 6–7 (both web-only), so the
deploy is code-only.
