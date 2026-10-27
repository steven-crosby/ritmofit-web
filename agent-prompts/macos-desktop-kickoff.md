# macOS desktop — first implementation session

Use this prompt from the `ritmofit-web` repository. A physical Mac is preferred.
Read the current files and verify their claims; the planning chat is not required.

## Objective and authorization

Review the macOS plan against current `main`, then **implement the first bounded M0
feasibility slice**. Deliver runnable prototype tooling and evidence, not another
general plan and not a production desktop release.

When I supply this prompt as my session instruction, I authorize the M0 scope below:
repository inspection, local prototype tooling, focused tests, local mock validation,
and a reviewed PR through the repository's normal solo workflow. Present a concise
execution plan after orientation, then proceed with this already-authorized slice.
Do not ask me to reconfirm routine implementation choices. Ask only when a missing
prerequisite or a material scope expansion requires an actual owner decision; continue
independent work while that answer is pending.

This instruction does not authorize production data changes, deployment, publishing
or uploading release artifacts, Apple account enrollment, new paid services, or fixes
outside M0. Record signing/notarization prerequisites now; perform any external
submission only with appropriate session authority. Preserve unrelated local work.

## Read and revalidate

1. [AGENTS.md](../AGENTS.md), then
   [start-session](daily/start-session.md) in clear-objective/solo mode. Discover the
   actual checkout, branch, upstream state, open PRs and relevant handoffs. Use the
   existing isolated checkout; do not create a Git worktree unless I request one.
2. [macOS development plan](../ritmofit_dev_plan/macos-desktop-plan.md), especially
   M0a/M0b, and its [adversarial review](../docs/audits/macos-plan-2026-10-27/README.md).
3. The current `Now` block in
   [DEVELOPMENT_PLAN.md](../ritmofit_dev_plan/DEVELOPMENT_PLAN.md), current
   [decisions](../ritmofit_dev_plan/decisions.md) D13/D19/D20/D21/D22/D24, and
   [music-provider constraints](../ritmofit_dev_plan/music-providers.md).
4. The [broader engineering audit](../docs/audits/codex-code-audit-2026-10-27-4e0b150/README.md)
   and its next-session packets. Identify baseline problems affecting your tests;
   do not start those remediation packets without separate scope authority.
5. Inspect today's code for auth, provider connect/callback, MusicKit configuration,
   playback adapters, Live timing/wake locks, PWA updates and lazy-chunk recovery.
   The plan started at `65d4deb`, and #634 subsequently changed the MusicKit
   error dialog/FairPlay probe. Recheck latest code; neither the old plan's line
   numbers nor a successful FairPlay capability probe proves audible playback.

Inspect host OS/CPU, available native SDKs/toolchain, tester login methods, real-provider
access and signing configuration by name/presence only. Never print secret values or
copy them into the prototype or evidence. Record actual local web/API/shell revisions;
do not assume hosted production is the checked-out `main`.

## Implement this first slice

Create a deliberately small, removable harness under the proposed
`tools/macos-feasibility/` directory, with reproducible build/run instructions and
ignored local output. Keep it separate from production app code. Do not add a
production `apps/macos` or `apps/desktop` implementation yet.

1. **Baseline and decision criteria.** On a supported Mac, compare the current
   Safari/installed-web experience with the native capabilities the instructor
   actually needs. Record what a custom shell must improve. Check current official
   MusicKit, WebKit, provider-auth and distribution documentation, recording URLs
   and retrieval dates. Mark unknown support explicitly.
2. **Minimal WKWebView candidate.** Implement a buildable AppKit/WKWebView harness
   with an application-owned persistent data store, a configurable approved HTTPS
   origin, and a clearly separate localhost-only development mode. Include local
   loading/error/retry UI that works before hosted JavaScript loads. Keep normal
   TLS/security protections. Add explicit top-level navigation/external-link policy
   and only the provider-popup handling needed for the tested auth journey.
   No privileged JS bridge, broad permissions, arbitrary protocol launch, provider
   cookie copying or disabled browser security.
3. **Local functional proof.** Run against the repository-supported local Worker,
   migrated local D1 and built SPA with mock providers. Verify rendered launch,
   sign-in, a class create/read/edit flow, ordinary quit/relaunch, and unreachable
   origin recovery. Mock success proves the harness only, not provider playback.
   Use a fresh, isolated local test account/data store when practical.
4. **Real-provider matrix.** Use available authorized accounts to test email and
   required social login separately from Apple Music consent and SoundCloud OAuth.
   Trace which store owns the SoundCloud state cookie and callback; opening an
   authorize URL in another browser does not preserve it. Verify audible preview,
   Live start, playback windows/seek, pause/resume, natural handover, End/Exit silence,
   and reconnect. Prefer a representative Cycle/Pilates class. Do not implement a
   new auth protocol merely to force this first candidate through the spike.
5. **Early release feasibility.** If the necessary Mac, signing identity and session
   authority exist, produce the minimal signed/hardened candidate and run M0b's
   clean-install check, including notarization only when external submission is
   authorized. Distinguish unsigned, ad-hoc signed, Developer ID signed and
   notarized results. If blocked, finish the harness and record the exact remaining
   prerequisite; do not call the runtime selected or the M0b gate passed.

Test WKWebView first. Implement an equivalent Electron candidate only if a documented
failure or unresolved support limit makes that comparison useful, within the same
time box. Do not build two complete products. If both web playback paths fail, write a
small, evidence-based native MusicKit adapter investigation brief; preserve the React
UI and existing playback interface as the first fallback. Do not implement that
adapter or a full native rewrite in this session.

## Failure handling and boundaries

- If running on Linux or without a usable Mac SDK, still implement the portable
  harness sources, documented Mac build path and evidence template, and run useful
  platform-independent checks. Mark native build/UI/audio/signing as `NOT_RUN` or
  `BLOCKED`. Do not fake a Mac build, simulate DRM acceptance or end with only a plan.
- A real-provider permission/account problem blocks that matrix entry, not local
  prototype work. Keep `PASS`, `FAIL`, `BLOCKED`, and `NOT_RUN` distinct.
- Production verification needs explicit session authority and must follow
  [fixture hygiene](../ritmofit_dev_plan/prod-fixture-hygiene.md). Do not create or
  delete real classes, connect/disconnect real accounts, or deploy just to unblock
  a test. Local mocks are the default until the relevant authority exists.
- Leave Spotify and the tabled Apple 5:18 investigation tabled. Record relevant
  observations and baseline failures without silently opening their remediation.
- Preserve provider-authorized playback. Never cache, proxy, download, decode,
  analyze, mix or crossfade provider audio, and never source BPM from Spotify.
- Make no speculative changes to production API/auth, schemas, migrations, shared
  contracts or the web playback engine. Expose required follow-up work with evidence.

## Evidence and acceptance

Create a dated evidence receipt under the proposed
`docs/audits/macos-feasibility-YYYY-MM-DD/` path. Record host OS/CPU, runtime/SDK,
build commands and exit statuses, signing mode, tested origin, known web/API/shell
revisions, account/provider prerequisites by presence only, and the result of every
attempted case. Redact credentials and personal account/class details. Never use
UI state, a green mock test or an EME capability probe as a hearing receipt.

The first PR is reviewable when:

- Another developer can build/run the harness from its documented directory.
- The navigation/recovery behaviors you implemented have meaningful focused tests.
- Local proof and available Mac/provider checks have recorded outcomes, with no
  claimed passes for unrun steps.
- The evidence matrix identifies which R1–R12 risks remain open and whether any
  architecture-changing failure was found.
- The decision is one of: candidate supported by completed gates; candidate rejected
  with evidence; or decision blocked on named evidence. Do not select a production
  runtime while required provider/auth or M0b proof is missing.

Follow the verification requirements in AGENTS.md for the actual changed files.
Run the native build/tests on a Mac when available; also run the existing repository
gate when required for code/tooling changes. Preserve underlying exit codes, confirm
tests actually ran, and distinguish known baseline failures from your changes. Do
not expand into unrelated suites after the necessary checks have passed.

## Deliver and close

Follow [close-session](daily/close-session.md): commit only this slice, open a focused
PR, and record an authored handoff before any merge. Apply the repository's existing
solo merge authority and required checks; do not bypass protections or merge another
session's work. Never treat merging as deployment.

Finish with the PR, files implemented, exact checks/outcomes, supported versus
unverified capabilities, the runtime decision status, and **one** recommended next
slice. Prefer a runnable, honestly partial harness with precise external blockers
over claiming M0 completion without the Mac/provider evidence.
