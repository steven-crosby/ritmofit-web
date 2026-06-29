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
- Password reset email delivery.
- Email verification delivery.
- Multi-user collaboration with a second independently signed-in account.
- Long-duration Live Mode playback through a complete class.

