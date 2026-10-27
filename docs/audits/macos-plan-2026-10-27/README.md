# Adversarial review — Ritmo Studio macOS plan

Reviewed October 27, 2026. Target: original plan preserved at [v1](original-plan.md). Revisions applied to [the development plan](../../../ritmofit_dev_plan/macos-desktop-plan.md). Repository inspected at `65d4deb4aba90f26c6706a099351709680d11aee`. Source links are pinned to that revision. At publication, `main` had advanced to `7c627eb`; the revised plan and kickoff prompt require rechecking #634 and the broader #633 audit before implementation. This report remains a historical review of the original plan, not a new native test run.

## Verdict

The original plan was a useful discovery outline, but too optimistic to serve as an implementation commitment. It recognized provider compatibility risk while leaving several other architecture-changing questions until after runtime selection. The most consequential gaps are the actual OAuth cookie journey, reload safety across web deployments, and proving playback in the signed application rather than only a development shell.

There is no demonstrated critical vulnerability or native playback defect from this review: no desktop application exists yet. Findings below distinguish confirmed source behavior from design risks and unverified capabilities. P1 means resolve before the affected architecture or beta-release commitment; P2 means a material planning improvement. These are review priorities, not claims that production is currently broken.

## P1 findings

### R1. The promised reload safety is not supplied by the existing app

Original plan: sections 4, 6 and 9 promise no reload during Live or pending edits, mostly through update deferral.

Evidence: [lazyWithReload.ts](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/lib/lazyWithReload.ts#L24) reloads on the first rejected import without checking why it failed or whether a class/save is active. The [existing test](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/lib/lazyWithReload.test.ts#L36) explicitly expects that reload. [UpdatePrompt.tsx](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/components/UpdatePrompt.tsx#L74) directly invokes an update/reload from its action; it does not consult Live or write state. No actual interrupted class was reproduced here.

Adversarial case: leave an old desktop renderer open, deploy new web assets, then open a previously unloaded class/connection/editor surface. A missing chunk can invoke a reload even if the native updater is perfectly deferred. Offline/transient import failure can reach the same catch path.

Revision: centralize reload decisions across SW, lazy imports, native menu commands and recovery; retain compatible immutable chunks and API contracts; test web deployment and missing chunks during Live and pending writes. A shell-version handshake alone cannot prevent this failure.

Acceptance: injected chunk failures do not silently reload or discard pending edits; user-controlled recovery and old-shell/new-web behavior are verified.

### R2. System-browser provider login breaks the current cookie-based transaction unless explicitly redesigned

Original plan: section 7 proposes external-browser handoff generically, without tracing the existing provider flow.

Evidence: [provider-connections.ts](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/api/src/routes/provider-connections.ts#L255) writes state, PKCE verifier, provider and initiating user into encrypted HttpOnly `rf_oauth_state`. The [callback](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/api/src/routes/provider-connections.ts#L282) requires that cookie and returns `state_missing` when absent. [connection-return.ts](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/lib/connection-return.ts#L12) stores return navigation in sessionStorage.

Adversarial case: initiate SoundCloud connect in the app, then open the returned authorization URL in Safari. Safari does not receive the cookie written into the app's separate store. Completing authorization does not complete the current callback transaction. App termination also loses the sessionStorage return context unless separately restored.

Revision: separate Ritmo login, SoundCloud connection and MusicKit authorization. Select a supported same-store journey or design an explicit server-mediated external transaction. Do not move an authorize URL between stores and assume PKCE resolves the missing cookie.

Acceptance: the actual installed-app/browser journey completes against the intended Ritmo account after cold launch, cancellation and retry, without copying cookies or weakening browser policy.

### R3. One-use login codes need proof of possession and a concrete session-installation mechanism

Original plan: section 7 says to assess PKCE and perform an authenticated exchange, leaving the central security and integration mechanism unspecified.

Risk: a desktop app is a public client. A custom-scheme callback can be intercepted by another registered handler. An expiring, single-use bearer code can still be redeemed first by an interceptor unless redemption is bound to a verifier held by the initiating app. Separately, successfully authenticating a native network client does not automatically populate WKWebView's cookie store.

Revision: require app-generated verifier/challenge, state, expiry, replay protection, intended-account binding, restricted return destinations and rate limiting. Use PKCE S256 where applicable. Specify how HttpOnly session establishment occurs in the actual renderer store without exposing reusable credentials to JS. Evaluate an OS authentication session/claimed HTTPS return before custom-scheme fallbacks. Do not introduce desktop client secrets.

Acceptance: a stolen callback code cannot establish a session without the verifier; wrong/expired/replayed attempts fail; the app subsequently makes authenticated API calls after restart. No new authentication protocol was implemented or security-tested here.

### R4. Signing and distribution proof came too late to protect the runtime decision

Original plan: M0 tests disposable shells; signing/hardened runtime/notarization are primarily M4 work.

Risk: a development-shell success does not establish the installed release's provider behavior, entitlements, native dependencies or protected-media support. Discovering that gap after shell/auth work can invalidate the architecture. The original plan also omitted verifying any embedded DRM/runtime redistribution requirements.

Revision: introduce M0b: a minimally signed/hardened and notarized candidate installed on a clean Mac, repeating authorization and audible playback. Make Apple team access and signing feasibility early dependencies. Leave installer polish and automated updates for the later release phase.

Acceptance: receipts identify OS/CPU, runtime, signing mode, web/API revision and witnessed playback. Neither candidate is considered proven until this passes. This review establishes no WKWebView/Electron MusicKit support claim.

### R5. Hosted-app failure needs a local recovery path and three independent release policies

Original plan: section 4 favors hosted HTTPS and mentions a safe recovery screen, but does not specify one that can run before the site loads. Web/SW and native update policies remain conflated.

Adversarial case: Wi-Fi is connected but a captive portal, TLS failure, site outage, API outage or incompatible web deployment prevents application startup. A React recovery component cannot help if React itself never loads. A native binary rollback does not roll back a remotely served web app or its service worker.

Revision: a local native bootstrap/recovery surface, bounded retry, safe diagnostics, explicit TLS failure behavior, and separate compatibility/rollback policies for native binary, web/SW and backend. Preserve secure failure; do not render arbitrary failure pages with a native bridge.

Acceptance: an installed app displays useful recovery when the origin is unavailable and when an old shell meets a newer web release, without treating `navigator.onLine` as proof of service health.

### R6. Crash/quit safety lacked a pending-write model and a hung-player escape path

Original plan: sections 3 and 8 promise safe close/quit and data integrity without specifying save receipts, uncertain responses or an unresponsive renderer.

Evidence: [ordered-import.ts](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/lib/ordered-import.ts#L26) restores and persists recovery intent through sessionStorage. That is not a durable application-relaunch journal. Existing server-confirmed class data remains separate from pending intent; this review found no demonstrated loss of confirmed writes.

Adversarial case: the server commits an import, its response is lost, and the renderer crashes. Repeating the import blindly can duplicate intent; assuming it failed can lose the recovery trail. A quit handler that only waits for an SDK stop acknowledgement can hang indefinitely.

Revision: inventory pending and uncertain writes, reconcile against server truth before retry, define which user-owned recovery data persists across full relaunch, and use a bounded stop/teardown path for app-owned playback. Handle Cmd-W, Cmd-Q, Dock reopen/quit and system shutdown distinctly; do not promise save-on-force-quit.

Acceptance: injected commit/response loss produces no silent loss or duplicate class occurrences; SDK/renderer hang has a tested exit path and audible silence; unrelated music apps are unaffected.

### R7. Origin validation is necessary but insufficient for the native bridge

Original plan: section 6 correctly requires isolation, sender validation and narrow capabilities, but treats trusted origin checks too much like a complete boundary and leaves external-link/permission details implicit.

Evidence: MusicKit and SoundCloud scripts load into the app page; their code executes in that page's origin. A compromised allowed SDK or same-origin XSS can therefore invoke whatever bridge the top page can invoke. Official [Electron security guidance](https://github.com/electron/electron/blob/main/docs/tutorial/security.md) also requires permission handling and warns against `shell.openExternal` with untrusted content.

Revision: design each capability to remain low impact under malicious renderer calls; validate payloads, rates and lifecycle in native code; never expose broad network/file/process/secret access. Validate external URL schemes and purpose, isolate provider windows, preserve TLS validation, and configure deny-by-default Electron permissions for each session.

Acceptance: tests include hostile same-origin renderer calls, child frames, malformed payloads, arbitrary external protocols and permission requests. No exploit was attempted or demonstrated.

## P2 findings

### R8. Runtime recommendation was premature and omitted cheaper or narrower alternatives

Original plan: WKWebView is preferred before comparative evidence; the native fallback is a full SwiftUI rewrite.

Gap: an installed Safari web app may already meet the basic request. A custom app should identify its added instructor value before inheriting a native maintenance burden. Conversely, failed Web MusicKit does not automatically require rewriting the React UI: a supported native MusicKit adapter may fit behind the existing playback interface.

Revision: test the installed-web baseline; treat WebKit as the first candidate, not the winner; compare maintenance skill and reliability before size; add React plus native MusicKit as a separately researched hybrid fallback. Current Apple installed-web-app prerequisites were not verified here because the support-page request returned HTTP 403.

Acceptance: a decision record explains the required capabilities beyond the baseline and why the selected approach supplies them. Native MusicKit API/entitlement feasibility remains an open gate.

### R9. Native wake-lock rules would conflict with existing recovery behavior, and do not solve timer throttling

Original plan: section 8 says release wake assertions on error. The current [LiveMode.tsx](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/components/LiveMode.tsx#L635) deliberately requests a wake lock in some playback-error states so recovery remains visible. Its [prompter/gap timing](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/components/LiveMode.tsx#L598) depends on requestAnimationFrame; [use-virtual-clock.ts](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/web/src/lib/use-virtual-clock.ts#L86) uses performance.now. Official Electron [WebPreferences](https://github.com/electron/electron/blob/main/docs/api/structures/web-preferences.md) defaults backgroundThrottling to true.

Revision: explicit lifecycle state table, separate display/system idle assertions, native status in the UI, and separate timing rules for provider-led playback versus intentional silence/prompter. Test background suspension, wall-clock changes and wake reconciliation. Do not blindly disable throttling as a substitute for lifecycle design.

Acceptance: paused/error recovery stays usable according to agreed UX; backgrounding does not skip cues or invent track completion; native wake-lock cleanup passes even after renderer failure.

### R10. Test environment, production fixtures and revision identity were underspecified

Original plan: load production HTTPS during M0 and test complete workflows, without identifying the data/account environment.

Evidence: [prod-fixture-hygiene.md](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/ritmofit_dev_plan/prod-fixture-hygiene.md#L1) explains that real provider verification can use the owner's actual production account and requires `[QA]` names, `qa-fixture` tags and authorized cleanup. Existing deployment notes also identify main/production divergence; a shell loading production does not necessarily test the inspected main revision.

Revision: local mocks for destructive automation, deliberately provisioned provider-capable test context when available, explicit authorization for production mutations, fixture hygiene and exact web/API/shell/runtime identity in receipts. Staging is a prerequisite to provision, not a service assumed to exist.

Acceptance: every provider receipt identifies its environment and builds; created test data is inventoried and cleaned up only within owner authority. No production test, mutation or deployment occurred during this review.

### R11. A single-instance desktop shell does not prevent two-client conflicts

Original plan: section 6 uses one window/instance to avoid concurrent Live transports, but a user can leave the web app open or use another device.

Evidence: [classes.ts](https://github.com/steven-crosby/ritmofit-web/blob/65d4deb4aba90f26c6706a099351709680d11aee/apps/api/src/routes/classes.ts#L455) patches mutable class fields without a visible optimistic-version precondition in that route. Some import operations already use richer reconciliation; do not generalize one route into a claim that all endpoints lack conflict control.

Revision: test browser plus desktop editing and playback takeover. Define a conflict/refresh policy and release limitation; only add global leases or broader write-versioning if the actual product requirement justifies backend changes.

Acceptance: the beta does not silently promise cross-device exclusivity or conflict-free editing; targeted coexistence cases behave as documented.

### R12. Beta criteria, maintenance ownership and schedule were too open-ended

Original plan: a full-class check and "no critical failures" are mentioned without repeat counts, a concrete support matrix, failure-injection cases, or ongoing runtime/certificate ownership. The 6–11-week estimate omits the explicit early signed-build milestone and may conceal new auth backend work.

Revision: define proposed repeatable soaks, supported OS/CPU boundaries, targeted fault cases and an evidence receipt. Assign runtime/OS security, signing expiry/rotation, updater and rollback ownership. Separate engineer effort from account approvals, hearing checks and tester calendars. Carry 6–12 engineering weeks only as a preliminary uncomplicated-wrapper envelope; re-estimate after M0a/M0b, and estimate native MusicKit/auth infrastructure separately.

Acceptance: dated M0 decision includes a costed backlog, measurable agreed beta gates, owner availability and operational responsibility. The schedule is not an architecture-feasibility claim.

## What survives the review

- Reuse the React product, hosted Worker/D1 backend and existing provider-controlled playback architecture.
- Prove real authorization and audible playback before substantial shell investment.
- Keep provider audio outside app-owned caching/processing; preserve the private-beta constraints.
- Use direct signed/notarized distribution before considering an App Store release.
- Retain the existing web regression gates and require real Mac/provider acceptance in addition.

## Evidence and limitations

Method: read the original plan, trace the relevant repository flows and their existing tests, inspect current source/version state, and retrieve official Electron security/WebPreferences/FAQ sources through the configured network path. The [source manifest](sources.json) records retrieval URLs and SHA-256 hashes of the documentation used. The third-party bodies are not vendored and their remote main branches may change; hashes describe the copies used in this review, not a claim about later content. This is documentation evidence, not runtime evidence. Apple support documentation retrieval returned HTTP 403. No claim about then-current provider permission, embedded DRM support or native API availability was verified from Apple/provider authorities here.

No macOS build, device test, provider hearing test, OAuth exploit or new test run was performed. This is an adversarial planning/static-source review. Revisions are specifications for future work, not implemented fixes. The review made no tracked application-code changes. This publication adds documentation and the implementation kickoff only.
