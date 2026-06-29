# Web Live Test Report - 2026-06-29

## Summary

Production live test passed for the deployed RitmoFit web app at `https://ritmofit.studio/`.
No blocking web launch issues were found during the browser walkthrough, API smoke checks,
responsive checks, or post-test cleanup verification.

This report covers the manual production test run after the web handoff docs commit:

- Commit: `81f8e15 docs: record web handoff to ios parity`
- Production Worker version: `e60e5138-3248-4c0f-a926-997955016199`
- Remote D1 migration state: no migrations to apply
- Test account: disposable timestamped account, removed after the run

## Production Smoke Checks

Passed:

- `GET /` returned the SPA shell.
- `GET /api/v1/health` returned `200` with `{"status":"ok","service":"ritmofit-api","version":"v1"}`.
- `GET /api/v1/auth/capabilities` returned `200` with Apple enabled.
- Unauthenticated `GET /api/v1/classes` returned `401`.
- Health and auth responses included expected security headers:
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `Permissions-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`

## Browser Walkthrough

Passed:

- Landing page rendered with hero content and primary auth CTAs.
- Login screen rendered email/password auth, Continue with Apple, forgot password, and signup.
- Created disposable account.
- Empty dashboard/class library rendered correctly.
- Created a new class.
- Added a manual track.
- Edited track details:
  - BPM override
  - RPM
  - hold count
  - instructor notes
- Added a segment band.
- Added a timed cue with color.
- Added a timed move with custom move text and intensity.
- Entered Live Mode.
- Started playback timer.
- Confirmed pause state, current section, countdown, next cue, timeline markers, notes, BPM, RPM,
  and holds.
- Opened the Full List view in Live Mode.
- Exited Live Mode back to the builder.

## Provider Catalog Search And Import

Passed:

- Spotify catalog search returned live results.
- Imported a Spotify catalog result into the class.
- SoundCloud catalog search returned live results.
- Apple Music catalog search returned live results.
- Connections dialog showed current expected state:
  - SoundCloud not connected, with Connect action.
  - Spotify catalog search only.
  - Apple Music catalog search only.
  - Disconnect-purge explanatory copy present.

## Teams, Sharing, And Explore

Passed:

- Created a team.
- Confirmed current user appeared as owner.
- Shared the class with the team.
- Confirmed shared-with row appeared with view permission and remove action.
- Published the class.
- Confirmed public/listed state.
- Opened Explore.
- Confirmed the published class appeared in Community.
- Opened class preview.
- Confirmed preview included summary, sections, tracks, cue, move, durations, and average BPM.
- Saved a copy from Explore.
- Confirmed copied class appeared in the library with tracks and choreography data.

## Account And Session

Passed:

- Account dialog showed email and display name.
- Updated display name.
- Confirmed success notice and nav display update.
- Signed out.
- Confirmed browser returned to the login screen.

## Responsive Checks

Passed at these viewport sizes:

- `320x720`
- `768x900`
- `1280x900`

Observed:

- No horizontal overflow.
- Class list remained reachable.
- Track list remained reachable.
- Run Live remained reachable.
- No obvious text overlap or broken layout in the tested workflow surfaces.

## Production Test Data Cleanup

The disposable production data used one timestamped account and timestamped class/team names.

Pre-cleanup targeted counts:

- users: `1`
- accounts: `1`
- classes: `2`
- class_tracks: `4`
- tracks: `2`
- track_provider_ids: `1`
- cues: `2`
- class_track_moves: `2`
- class_sections: `2`
- shares: `1`
- teams: `1`
- team_memberships: `1`

Post-cleanup verification returned `0` rows for all targeted tables:

- users
- sessions
- accounts
- classes
- class_tracks
- tracks
- track_provider_ids
- cues
- class_track_moves
- class_sections
- shares
- teams
- team_memberships
- user_moves
- music_connections
- provider_purge_queue
- verifications

## Findings

No blocking issues were found.

Residual coverage not included in this pass:

- Real third-party OAuth connection flows for providers that are not currently enabled as full
  connection flows.
- Password reset email delivery. **(Closed in the verification run below — confirmed delivered.)**
- Email verification delivery. **(Closed in the verification run below — confirmed delivered.)**
- Multi-user collaboration with a second independently signed-in account.
- Long-duration Live Mode playback through a complete class. **(Closed in the verification run
  below — ran a class to completion.)**

---

## Verification Run — 2026-06-29 (independent re-test)

A second, independent production run was performed against `https://ritmofit.studio/` to verify
the findings above and close three of the residual-coverage gaps. The run used a fresh disposable,
timestamped account in an isolated browser context (kept fully separate from any real session), and
all disposable data was removed from production D1 afterward.

- Production Worker version: `e60e5138-3248-4c0f-a926-997955016199` (unchanged from the run above;
  the two intervening commits are docs-only).
- Remote D1 database: `ritmofit` (`5bf15d82-10f5-4d03-b96e-6b8358334fc5`).
- Test account: `steven.crosby09+rf20260629-153838@gmail.com` (Gmail alias, used so transactional
  email delivery could be confirmed in a real inbox).

### Confirmed — prior findings reproduced

- API smoke: `GET /api/v1/health` `200`; `GET /api/v1/auth/capabilities` `200` with Apple enabled;
  unauthenticated `GET /api/v1/classes` `401`; all six security headers present (HSTS, CSP,
  Permissions-Policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options).
- Auth: landing + login + signup screens; disposable account created; email/password sign-in,
  sign-out, and sign-in again all worked.
- Builder: created a class; added two manual tracks; edited track details (display-BPM override,
  RPM, hold count, instructor notes); added two section bands (Warm-up + Sprint) with "Snap to
  tracks"; added a colored cue (Amber, 0:10); added a timed custom move with intensity (Attack,
  0:20). Beat-snapping, energy arc, and average-BPM summary rendered.
- Provider catalog search: Spotify, SoundCloud, and Apple Music each returned live results; a
  Spotify result was imported into the class.
- Connections dialog: SoundCloud "Not connected" with a Connect action; Spotify and Apple Music
  "Catalog search only / sign-in not yet supported"; 7-day disconnect-purge copy present.
- Teams / sharing / Explore: created a team (self shown as owner); shared the class to the team
  (view permission + revoke action); published (Public — listed in Explore); the class appeared in
  Explore › Community; preview showed summary, sections, tracks, cue, move, durations, and average
  BPM; saved a copy back into the library with choreography intact.
- Account: display name updated with success confirmation and nav update; sign-out returned to the
  login screen.
- Responsive: no horizontal overflow and class list / track list / Run Live reachable at `320x720`
  (true mobile emulation), `768x900`, and `1280x900`.

### Newly covered (previously residual)

- **Long-duration Live Mode through a complete class — passed.** Ran a class to completion in Live
  Mode. The virtual clock advanced; the cue (0:10) and move (0:20) surfaced; the section transition
  (Warm-up → Sprint) and the track transition (1 → 2) both fired at 0:30 with matching screen-reader
  announcements; the class reached 0:00-remaining at 1:00 and announced "Class complete." The Full
  List view rendered both tracks with their readouts, cue, move, and jump-to-track controls.
- **Password-reset email delivery — passed.** Triggered "Send reset link"; the UI confirmed the
  request; a "Reset your RitmoFit password" email from `noreply@ritmofit.studio` arrived in the
  inbox with a valid, branded reset link to the canonical origin
  (`https://ritmofit.studio/api/auth/reset-password/<token>?callbackURL=…/reset-password`,
  1-hour expiry).
- **Email-verification delivery — passed (bonus).** A "Confirm your RitmoFit email" verification
  email from `noreply@ritmofit.studio` was also delivered to the inbox at signup. (Signup itself
  does not gate on verification — the account was usable immediately.)

Still residual after this run: real third-party OAuth connection flows for providers not enabled as
full connection flows, and multi-user collaboration with a second independently signed-in account.

### Production test-data cleanup

All disposable rows were deleted from production D1 (scoped strictly to the disposable user id) and
re-verified as `0`. Deleted: `cues` 2, `class_track_moves` 2, `class_sections` 4, `class_tracks` 5,
`classes` 2, `tracks` 3, `track_provider_ids` 1, `shares` 1, `teams` 1, `team_memberships` 1,
`sessions` 1, `accounts` 1, `verifications` 1 (the reset token), `users` 1. No real account data was
touched.

### Findings (verification run)

No blocking issues were found. The deployed web app reproduced the original report end-to-end, and
the two targeted email-delivery gaps plus the long-duration Live Mode gap are now confirmed working.

