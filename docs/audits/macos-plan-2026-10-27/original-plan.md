# Ritmo Studio for macOS — development plan

Date: October 27, 2026
Status: historical v1, superseded by the [revised plan](../../../ritmofit_dev_plan/macos-desktop-plan.md). Retained as the review target; do not use it as the implementation instruction.

## 1. Recommendation and release objective

Develop a macOS companion to the existing web product, reusing the React application, shared TypeScript contracts, playback coordinator, and hosted Cloudflare API/D1 backend. Ship an invite-only, non-monetized, signed and notarized beta directly to testers before considering the Mac App Store.

Start with a short, decisive feasibility comparison. The preferred macOS-only candidate is a thin Swift/AppKit application hosting the production HTTPS app in WKWebView. Compare Electron using the same app and test accounts. Select the runtime only after real Apple Music authorization and audible protected playback pass. Neither WebKit ancestry nor Chromium compatibility establishes provider support inside an embedded app. If neither passes, investigate an official native MusicKit adapter as a separately estimated path; do not ship an unsupported streaming workaround.

This preference prioritizes macOS integration, first-party web authentication, small distribution size, and preservation of the existing Apple Music implementation. Electron becomes the implementation choice if its measured compatibility and development cost are better. Tauri is a secondary option if the team specifically wants Rust or future Windows support; it shares the WKWebView compatibility question on macOS and does not resolve it by itself.

Successful v1: an instructor installs a trusted Mac application, signs in, browses/imports music, builds a Cycle or Pilates class, rehearses, teaches with supported provider playback or prompter-only Live, and exits without lingering audio or losing confirmed edits.

## 2. Repository findings that shape the work

- `apps/web`: React 18, Vite, Tailwind, TypeScript, service worker/PWA, existing desktop-oriented instructor surfaces.
- `apps/api`: hosted Hono Worker, Better Auth, D1, R2; the production Worker serves SPA and API on the same HTTPS origin.
- `packages/shared` and `packages/music`: reusable contracts and provider logic.
- `apps/web/src/lib/auth-client.ts`: production assumes relative API calls and first-party cookies; `VITE_API_URL` is an override, not a complete desktop authentication solution.
- `apps/web/src/lib/playback/`: provider adapters, coordinator, timeline and transport/liveness contracts already exist. Preserve them as the reference behavior.
- Apple playback uses MusicKit JS; SoundCloud uses its official widget; Spotify uses the Web Playback SDK but is currently tabled.
- Existing wake-lock, connection-return, local storage and PWA recovery logic require embedded-runtime review.
- D13/D19 prohibit owned audio streaming, downloading, caching, decoding, analysis, mixing and crossfade. Playback windows remain metadata over provider-owned streams. No Spotify BPM.
- D20/D21 keep the product solo-first and web-first. D22 limits distribution to the private beta and requires renewed provider review before meaningful expansion.
- Current development notes defer the Apple 5:18 investigation and Spotify. Desktop work must record whether it encounters those symptoms; reopening the existing investigation requires explicit owner instruction.

Local onboarding evidence: production web build, repository gates, 2,078 unit/component tests, 237 Worker/D1 integration tests, and a local authenticated class create/read/delete flow passed. These results validate the starting web environment, not a macOS binary or real provider playback.

## 3. Scope and priorities

Required for beta:

1. Existing class creation, music browsing/import, choreography, rehearsal, and Live flows.
2. Email sign-in, session persistence, sign-out, verification/reset links and account switching. Maintain the beta allowlist.
3. Apple Music and SoundCloud only after runtime-specific acceptance; accurately display unavailable providers. Prompter-only Live remains complete.
4. Native app lifecycle, standard menus/shortcuts, window sizing, full screen, safe close/quit, external links, and controlled navigation.
5. Live-specific idle-sleep prevention, explicit sleep/wake recovery, audio-device change handling and network-loss states.
6. Signed/notarized installation, repeatable releases, update deferral during teaching, rollback, and privacy-conscious diagnostics.

Later, unless a release requirement changes: Mac App Store, Spotify reactivation, native MusicKit rewrite, Windows, multiple instructor windows, global shortcuts, menu-bar transport, offline editing/sync, local file import, notifications, and native Now Playing controls.

No teams/community expansion, local production database, bundled Worker server, billing, or music-engine rewrite is needed for this release.

## 4. Architecture decision record

| Candidate | Advantages | Main unknowns/costs | Decision condition |
|---|---|---|---|
| Swift/AppKit + WKWebView | Native Mac shell; persistent web data store; production HTTPS origin; limited privileged bridge | MusicKit protected playback and popup auth support; Swift/Xcode ownership; web deployment compatibility | Preferred if both target providers and auth pass the real-device matrix |
| Electron + existing React app | Strong TypeScript reuse and automation; consistent Chromium version; mature packaging ecosystem | Apple protected-media compatibility; larger footprint; frequent runtime/security updates | Select if provider evidence and maintainability beat the WebKit candidate |
| Tauri + React | Small native shell; capability-based bridge | Same macOS WebView provider uncertainty; Rust adds a toolchain | Consider only with a concrete team/cross-platform reason |
| Native SwiftUI + native MusicKit | Direct Apple platform integration | Significant UI and adapter rewrite; SoundCloud still needs approved playback; separate authorization model | Separate fallback project after wrapper evidence fails |

Hosted HTTPS renderer is the first implementation model. It preserves the current first-party API/cookie setup and minimizes backend changes. Treat web releases and shell releases as independently versioned products: expose only a versioned, minimal shell bridge; make web changes backward compatible; provide a supported-shell policy and safe recovery screen for incompatible versions. A versioned web release channel may become necessary, but do not duplicate the backend without evidence.

A bundled renderer offers reproducible UI versions and a packaged launch screen, but introduces custom/file-origin cookies, CORS, redirects, service-worker and authentication work. Evaluate it only if hosted delivery cannot satisfy release compatibility or launch reliability. Never allow arbitrary localhost origins or broadly weaken cookies/CORS to accommodate it.

Proposed components, subject to runtime selection:

- Swift route: `apps/macos/` for the Xcode project, app lifecycle, navigation policy, native bridge, signing configuration and native tests. It is not a pnpm package.
- Electron route: `apps/desktop/` with TypeScript main/preload code, packaging config and shell tests, using the current pnpm workspace.
- `apps/web/src/lib/platform/`: a small typed platform interface and browser default implementation, added only for capabilities actually needed.
- Existing playback adapters remain shared. A future native adapter must satisfy the existing transport, timing, cancellation and error semantics through a narrow bridge.
- Backend changes only where demonstrated: desktop login handoff, shell compatibility metadata, or update metadata. No class schema migration is assumed.

## 5. Phase 0 — constraints and provider/runtime spike

Estimate: 4–7 working days; time-box each candidate rather than building two products.

Inputs: a supported physical Mac, Apple Music subscriber/test account, approved SoundCloud test content, current app/provider configuration, and current official provider documentation. An Apple Developer membership is needed for distribution, not merely a local unsigned spike. Choose the minimum macOS version from tester hardware and actual API/runtime requirements; target Apple Silicon first and add Intel only when needed and supported.

Activities:

1. Read current Apple Music/MusicKit, SoundCloud, Apple sign-in and embedded authentication requirements. Record source links, access dates, supported environments and unresolved provider questions. API credentials are not distribution permission.
2. Create disposable shells outside product code and load the existing HTTPS application with normal TLS and browser security enabled.
3. Verify real email auth and persistent sessions. Verify social auth only if required for these testers; unsupported embedded login must use a supported external-browser flow.
4. Apple: connect/authorize, catalog/library access, audible preview, Live start, seek to playback-window boundaries, pause/resume, natural handover, stop/Exit, disconnect and reconnect. Repeat across cold launches and token expiry.
5. SoundCloud: run the equivalent widget-supported operations, including autoplay/user gesture behavior and unavailable tracks.
6. Exercise a mixed-provider class if both providers pass individually. Confirm late events from the old provider cannot take ownership of the new track.
7. Try minimized/background/full-screen states, sleep/wake, wired/Bluetooth output changes, temporary network loss and renderer termination.
8. Record memory/CPU, startup time, binary size and notable runtime limitations. Do not infer audible success from UI state.

Exit: runtime decision with evidence, supported provider matrix, deployment model, proposed minimum OS/CPU matrix and a revised estimate. If either required provider lacks a supported and tested playback path, stop that release commitment and resolve the adapter/provider question first. Prompter-only beta is a separate product-scope decision, not an implicit substitute for music playback.

## 6. Phase 1 — shell, integration boundary and security

Estimate: 1–2 weeks after Phase 0 passes.

- Implement one main window and a single app instance; route subsequent launches/links into it. Avoid two concurrent Live transports.
- Add app name/icon, About, standard Edit/View/Window/Help menus, Cmd shortcuts, full screen, resize constraints, focus behavior and restored window geometry.
- Restrict top-level app navigation to explicit trusted HTTPS origins. Open ordinary external destinations in the system browser. Handle authorized provider windows with precise lifecycle and origin rules; test callbacks before closing them.
- Keep renderer permissions minimal. No general filesystem, process execution, shell command, arbitrary URL-fetch or secret-reading bridge.
- Swift: narrow, typed WKScriptMessageHandler operations with frame/origin validation, payload validation and controlled lifetime. Avoid injecting native capabilities into provider frames.
- Electron: sandbox and context isolation enabled, Node integration disabled, explicit preload API, validated IPC sender/origin, blocked unsafe navigation and a maintained runtime. Remote web content must not gain broad native authority.
- Preserve CSP and provider frame/script policies. Deny camera/microphone/location unless a later feature requires them.
- Add explicit app/shell version diagnostics and a compatibility handshake. Unknown capabilities fall back safely.
- Audit service-worker updates and stale-chunk recovery inside the desktop app. No automatic renderer reload in a class or with pending edits.

Exit: installable development app, safe navigation/bridge tests, core builder usable, supported web/shell combinations documented.

## 7. Phase 2 — authentication and link lifecycle

Estimate: 1 week; can overlap non-auth shell work.

Hosted model: use an application-owned persistent browser data store/session partition. Keep session cookies HttpOnly and scoped to the app origin; do not assume Safari login state is shared. Sign-out must clear application/provider state according to existing semantics without erasing unrelated browser data.

For providers that require system-browser authentication, design a one-use login handoff: browser completes server-side login; the app receives a short-lived, single-use, state-bound code; an authenticated exchange establishes the application session. Assess PKCE and loopback/universal-link/custom-scheme support against the actual provider and desktop runtime. Do not put session cookies, provider tokens or reusable bearer credentials in links. A custom URL scheme alone is not proof that the caller or recipient is trusted.

Register a unique reverse-DNS application identifier and any callback scheme once naming is confirmed. Validate callback state, expiry, replay, intended account and allowed destination. Handle app closed/open, duplicate callback, multiple pending attempts, cancelled consent, wrong account, failed exchange, expired session and sign-out during connection.

Store native credentials in Keychain only if the final architecture needs native credentials. Do not migrate working cookie auth into a second token system by default. Keep provider app secrets and signing keys on the backend or secure release infrastructure.

Exit: real installed-app login and restart persistence, verification/reset links, account switching and disconnect/reconnect pass; web authentication remains unchanged.

## 8. Phase 3 — teaching reliability and macOS behavior

Estimate: 1–2 weeks, plus any separately approved provider remediation.

- Map Live lifecycle to native idle-sleep assertions; acquire only when appropriate and release on pause/end/error/quit. Do not attempt to defeat lid closure or forced system sleep.
- Explicitly model sleep/wake, minimize/background, device changes, network loss, auth expiry and renderer failure. Reconcile from provider transport state; do not advance teaching time from an assumed timer or auto-resume audio after interruption without a safe product rule.
- Determine and implement close versus quit behavior. During Live, offer a clear choice to return to the class or end playback and quit. No hidden continuing audio after explicit quit.
- Prevent simultaneous playback owners across previews, Live, provider changes and reopened windows. Preserve existing generation/cancellation protections.
- On lost network, explain unavailable functions and retain only supported existing draft state. Offline music is unavailable. Offline editing or cached class run payloads require a separate data-retention/sync design and do not enter v1 implicitly.
- Add keyboard accessibility, VoiceOver, native 200% zoom, reduced motion, contrast and multi-display/full-screen checks. Reserve global shortcuts and hardware media keys for a later explicit design to avoid conflicting controls.
- Collect sanitized errors, shell/web versions and provider state transitions without cookies, tokens, private keys, class content or audio. Diagnostic export is deliberate and reviewable.

Exit: owner witnesses complete Cycle and Pilates sessions on supported hardware, including natural track handover and audible silence after Exit/quit; interruptions recover predictably.

## 9. Phase 4 — packaging, updates and distribution

Estimate: 1–2 weeks, conditional on Apple account/certificates.

1. Enroll/select the Apple Developer team; assign final bundle identifier and product assets. Use least-privilege hardened-runtime entitlements. Review third-party dependency licenses and privacy disclosures.
2. Build arm64 and, when required, x86_64/universal artifacts. Validate all native dependencies for the intended architecture rather than assuming a universal wrapper is sufficient.
3. Sign Developer ID Application builds and nested executables, notarize, staple tickets where applicable, and verify Gatekeeper on a clean Mac outside the development account.
4. Produce a DMG or signed installer appropriate to the selected framework; test drag-to-Applications/install, first launch, duplicate copies, upgrade, uninstall and retained user settings. Never instruct testers to disable Gatekeeper.
5. Choose a maintained updater for the selected stack after checking current official support. Verify signed update metadata/artifacts, secure HTTPS delivery and failure behavior. An initial manually installed private beta may precede automated updates if documented; automated updates are required before wider release.
6. Download/check updates outside teaching; install only after Live ends and confirmed edits are saved. No forced reload, restart or web service-worker activation mid-session.
7. Keep previous known-good releases and backward-compatible backend contracts. Document rollback with local data/profile compatibility; avoid silently downgrading incompatible state.
8. Maintain a macOS release runner and protected signing/notarization credentials. Separate normal PR validation from authorized release jobs; no signing secrets in repo or application bundles.

Exit: a clean Mac can install and launch a notarized beta; release verification and the applicable update/rollback procedure pass. The Mac App Store remains a separate project with sandbox, entitlement, purchase and review requirements.

## 10. Verification strategy and acceptance matrix

Run existing repository gates for shared/web/backend changes: formatting, typecheck, lint, design-system verification, theme classes, unit/component tests, Worker/D1 integration, production SPA build and bundle budget, OpenAPI drift, contract parity and dependency audit.

Add targeted tests for actual native behavior: bridge validation and origin rejection, navigation allowlists, callback replay/state/expiry, single-instance routing, Live-aware close/update rules, and sleep assertion cleanup. Avoid testing framework boilerplate merely for coverage.

Reuse the existing Playwright signed-in core-loop smoke where practical, but also launch the packaged app through runtime-appropriate automation. Electron automation cannot validate WKWebView; use native UI testing/accessibility tooling for that choice. Mock tests never replace the provider hearing checks.

| Area | Required proof |
|---|---|
| Installation | Clean supported Mac, signed/notarized launch, no developer bypass |
| Core loop | Sign in → import/select music → create class → cues → rehearse → Live → End |
| Authentication | Restart persistence, expired session, cancelled login, external link return, sign-out |
| Apple/SoundCloud | Authorization, actual audible playback, seek/windows, handover, pause/resume, silence after Exit |
| Resilience | Offline/online, sleep/wake, background/minimize, output-device change, renderer crash |
| Data integrity | Confirmed edits persist; interrupted/failed saves are visible; account boundaries hold |
| Desktop UI | Keyboard/VoiceOver, 200% zoom, full screen, displays, window bounds |
| Release | Required CPU/OS matrix, upgrade, deferred updates, failure recovery and rollback |
| Security | Untrusted link/frame cannot call privileged bridge; callback replay rejected; logs redact secrets |

Performance budgets should be set from Phase 0 on representative tester hardware: cold/warm launch, builder responsiveness, idle/Live CPU and memory over a full class. Check background throttling through measured timeline/provider behavior. Do not claim a target is met before collecting baselines.

## 11. Delivery sequence, effort and decision gates

| Milestone | Working estimate | Exit decision |
|---|---|---|
| M0 Provider/runtime feasibility | 4–7 days | Runtime, hosting model and required providers proven or explicitly blocked |
| M1 Desktop shell/security | 5–10 days | Core UI safely running with versioned platform boundary |
| M2 Auth and links | 4–7 days | Installed-app auth lifecycle passes |
| M3 Teaching reliability | 5–10 days | Owner-witnessed full classes and interruption matrix pass |
| M4 Release engineering | 5–10 days | Signed/notarized clean-machine installation and release procedure |
| M5 Private beta/hardening | 5–10 days | Testers complete repeated class workflows; no critical unresolved failures |

Planning envelope: approximately 6–11 engineering weeks for one experienced engineer, with 8–12 calendar weeks as a reasonable initial allowance for beta feedback and external prerequisites. These are estimates, not commitments. Native MusicKit integration, provider approvals, significant existing playback remediation or offline sync require re-estimation after discovery. Do not hide them in contingency.

Recommended PR slices: feasibility decision/evidence; minimal shell; constrained bridge/navigation; auth/link return; native Live lifecycle; desktop regression tests; signing/package pipeline; updater/release docs. Each functional slice includes its own focused validation and follows the repository's review workflow.

## 12. Risks, dependencies and owner decisions

| Risk/dependency | Mitigation / release condition |
|---|---|
| Protected provider playback unsupported in embedded runtime | Prove it first; use only official supported adapters; scope/architecture decision if blocked |
| Hosted web change breaks installed shell | Versioned bridge, compatibility tests, supported-version policy, safe recovery and staged rollout |
| Embedded/system-browser auth mismatch | Dedicated lifecycle spike and secure one-time handoff when required |
| Webview suspension or native sleep disrupts timing | Explicit lifecycle reconciliation and long real-class runs |
| D22 provider-policy uncertainty | Preserve current private beta; re-review then-current terms before desktop expansion/distribution changes |
| No physical Mac or signing account | Obtain access before native proof/distribution; Linux tests cannot establish Mac readiness |
| Signing/update credential exposure | Protected release jobs and scoped secure credential storage |
| Previously deferred Apple failure recurs | Record evidence and request explicit scope decision before reopening the tabled investigation |

Defaults proposed by this plan: macOS-only, hosted backend, Apple Silicon first, direct private-beta distribution, Apple Music + SoundCloud, online workflows and no broad native rewrite. Decisions required at the appropriate milestone: minimum macOS/Intel support from tester hardware, official runtime selection, required social login methods, final bundle identity, Apple Developer team, update hosting/tooling and the actual beta acceptance roster. They do not block producing this plan.

## 13. Immediate next action

Authorize a time-boxed M0 feasibility implementation on a physical Mac: create disposable WKWebView and Electron shells, run the same Apple Music/SoundCloud/auth scenarios, and deliver the runtime decision with actual playback evidence. Do not begin broad packaging/UI work until this evidence exists.

This planning session changes no tracked product files, reopens no tabled playback work, and does not publish or deploy anything. The cloud machine used for inspection is Linux; no macOS build, signing, notarization or native playback was executed.

## 14. Reference sources for implementation discovery

Repository sources: `AGENTS.md`, `README.md`, `ritmofit_dev_plan/decisions.md` (D13/D19/D20/D21/D22/D24), `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, `ritmofit_dev_plan/music-providers.md`, the auth client and playback files identified above, `e2e/smoke.spec.ts`, and the current provider acceptance handoffs.

Official documentation to verify during M0 and release-tool selection (links are starting points, not claims of current embedded-runtime approval):

- Apple WKWebView: https://developer.apple.com/documentation/webkit/wkwebview
- Apple MusicKit: https://developer.apple.com/musickit/
- Apple notarization: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Apple Developer ID: https://developer.apple.com/developer-id/
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron distribution: https://www.electronjs.org/docs/latest/tutorial/application-distribution
- Tauri distribution: https://v2.tauri.app/distribute/
- Spotify Web Playback SDK: https://developer.spotify.com/documentation/web-playback-sdk
- SoundCloud Widget API: https://developers.soundcloud.com/docs/api/html5-widget

External documentation was not independently fetched in this planning session. Current API support, terms, entitlements and updater compatibility remain explicit discovery tasks.
