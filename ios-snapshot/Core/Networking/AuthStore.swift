import Foundation
import Observation
import os

/// Owns the Better Auth session lifecycle: restore-on-launch, sign in / up / out,
/// and the persisted session cookie. The backend is authoritative — this only holds
/// the cookie (Keychain) and the canonical profile fetched from `/auth/session`.
///
/// Only a 401 ends a session (RF-1010, option A). A launch whose session check fails any
/// other way (offline, timeout, 5xx, an unreadable response) keeps the cookie and signs in
/// as the last confirmed profile, saved in the Keychain beside it, so the app runs from
/// its cache; `recheckSession()` confirms the session once the server answers.
///
/// The server extends the session only through `POST /auth/session` and never sends a new
/// cookie (RF-1012, design C), so the session is checked at launch, on every return to the
/// foreground and when the network comes back, confirmed or not. A check that started for
/// an earlier session (one since signed out or replaced) is ignored (RF-1032).
@MainActor
@Observable
final class AuthStore {
    enum Phase: Equatable {
        case restoring          // validating a persisted cookie at launch
        case signedOut
        case signedIn(UserProfile)
    }

    private(set) var phase: Phase = .restoring
    /// User-facing error for the current sign-in / sign-up attempt.
    var errorMessage: String?
    /// True while a sign-in / sign-up / sign-out request is in flight.
    private(set) var isWorking = false
    /// Whether the server confirmed the session in this run. False after a launch that
    /// signed in from the saved profile because the check couldn't reach the server.
    private(set) var isSessionConfirmed = false

    /// Bumped whenever the session on this device changes (a sign-in starts, or the
    /// session is forgotten), so a check that began for an earlier session can tell its
    /// answer is stale (RF-1032).
    private var sessionGeneration = 0
    /// A launch check failed without a 401 and no profile was saved, so sign-in is showing
    /// with the cookie still kept; the next check may still confirm it (RF-1032).
    private var hasUncheckedCookie = false
    /// The session check in flight, shared by every caller for the same session.
    private var sessionCheck: (generation: Int, task: Task<Void, Never>)?

    /// Shared, cookie-carrying client — reused by feature views for authed reads.
    let api: APIClient
    private let cookies: SessionCookieStore
    private let keychain: KeychainStore
    /// The last profile the server confirmed, stored with the cookie (same Keychain service).
    static let profileAccount = "last-confirmed-profile"
    private static let log = Logger(subsystem: "studio.ritmofit", category: "auth")

    // Defaults are `nil` (not constructed in default-argument position) so building
    // an `AuthStore` from SwiftUI's nonisolated `@State` initializer stays warning-free.
    init(api: APIClient? = nil, keychain: KeychainStore? = nil) {
        let api = api ?? APIClient()
        let keychain = keychain ?? KeychainStore()
        self.api = api
        self.keychain = keychain
        self.cookies = SessionCookieStore(
            baseURL: api.baseURL,
            storage: api.session.configuration.httpCookieStorage ?? .shared,
            keychain: keychain
        )
    }

    /// Restore a persisted session at launch: rehydrate the cookie, then validate it.
    /// A 401 signs out. Any other failure keeps the session and, if a profile was saved,
    /// signs in as it unconfirmed; with no saved profile it shows sign-in and keeps the
    /// cookie for the next check. On the first launch after an install
    /// (`forgettingStoredSession`) the Keychain's session is cleared and sign-in shows.
    func restore(forgettingStoredSession: Bool = false) async {
        if forgettingStoredSession {
            forgetSession()
            return
        }
        cookies.restore()
        do {
            let user = try await api.postEmpty("api/v1/auth/session", as: UserProfile.self)
            confirm(user)
        } catch APIError.unauthorized {
            forgetSession()
        } catch {
            if let saved = savedProfile() {
                phase = .signedIn(saved)
            } else {
                hasUncheckedCookie = keychain.load(account: SessionCookieStore.account) != nil
                phase = .signedOut
            }
        }
    }

    /// Check the session with the server, on return to the foreground or when the network
    /// comes back. This also keeps a confirmed session alive: the server extends it here.
    /// A 200 confirms (and signs in a kept cookie), a 401 signs out, and any other failure
    /// leaves things as they are. Overlapping calls for the same session share one request.
    func recheckSession() async {
        let generation = sessionGeneration
        if let check = sessionCheck, check.generation == generation {
            await check.task.value
            return
        }
        guard needsCheck else { return }
        let task = Task { await checkSession(generation: generation) }
        sessionCheck = (generation, task)
        await task.value
        if sessionCheck?.task == task { sessionCheck = nil }
    }

    func signIn(email: String, password: String) async {
        struct Credentials: Encodable { let email: String; let password: String }
        await authenticate {
            try await self.api.postExpectingSuccess(
                "api/auth/sign-in/email",
                Credentials(email: email, password: password)
            )
        }
    }

    func signUp(name: String, email: String, password: String) async {
        struct NewAccount: Encodable { let name: String; let email: String; let password: String }
        await authenticate {
            try await self.api.postExpectingSuccess(
                "api/auth/sign-up/email",
                NewAccount(name: name, email: email, password: password)
            )
        }
    }

    /// Native Sign in with Apple: exchange the device-issued identity token for a
    /// Better Auth session. `rawNonce` is the unhashed nonce (the request nonce given
    /// to Apple was its SHA-256); the server recomputes the digest to validate it.
    func signInWithApple(idToken: String, rawNonce: String) async {
        await authenticate {
            try await self.api.postExpectingSuccess(
                "api/auth/sign-in/social",
                AppleSocialSignInBody(token: idToken, rawNonce: rawNonce)
            )
        }
    }

    /// Surface an Apple-flow failure that happened before any network call (e.g. a
    /// missing identity token) using the same error channel as a failed request.
    func reportAppleSignInFailure(_ message: String) {
        errorMessage = message
        isWorking = false
    }

    func signOut() async {
        isWorking = true
        // Best-effort server sign-out; local state is cleared regardless. A failure is
        // logged (its kind only), since the server session then lives until it expires.
        do {
            try await api.postExpectingSuccess("api/auth/sign-out", EmptyBody())
        } catch APIError.unauthorized {
            // The server had already ended the session.
        } catch {
            Self.log.error("sign-out request failed: \(Self.failureKind(error), privacy: .public)")
        }
        errorMessage = nil
        isWorking = false
        forgetSession()
    }

    /// Call when an authed read returns 401 — the session is no longer valid.
    func handleUnauthorized() {
        forgetSession()
    }

    // MARK: - Private

    private struct EmptyBody: Encodable {}

    /// Whether `recheckSession()` has anything to check: a signed-in session, or a kept
    /// cookie behind the sign-in screen while no sign-in is under way.
    private var needsCheck: Bool {
        switch phase {
        case .signedIn: true
        case .signedOut: hasUncheckedCookie && !isWorking
        case .restoring: false
        }
    }

    /// Ask the server about the session `generation` names; drop the answer if the session
    /// changed while the request was in flight.
    private func checkSession(generation: Int) async {
        do {
            let user = try await api.postEmpty("api/v1/auth/session", as: UserProfile.self)
            guard generation == sessionGeneration else { return }
            confirm(user)
        } catch APIError.unauthorized {
            guard generation == sessionGeneration else { return }
            forgetSession()
        } catch {
            // Still unreachable: keep running from the cache.
        }
    }

    /// The server confirmed `user`: sign in as them and save the profile for offline launches.
    private func confirm(_ user: UserProfile) {
        if let data = try? JSONEncoder().encode(user) {
            keychain.save(data, account: Self.profileAccount)
        }
        isSessionConfirmed = true
        hasUncheckedCookie = false
        phase = .signedIn(user)
    }

    /// End the session on this device: the cookie and the saved profile both go.
    private func forgetSession() {
        cookies.clear()
        keychain.delete(account: Self.profileAccount)
        sessionGeneration += 1
        isSessionConfirmed = false
        hasUncheckedCookie = false
        phase = .signedOut
    }

    /// A loggable kind for a failed request: never its message, headers or body.
    private static func failureKind(_ error: Error) -> String {
        switch error as? APIError {
        case .unauthorized: "HTTP 401"
        case .forbidden: "HTTP 403"
        case let .server(status, _, _): "HTTP \(status)"
        case .decoding: "decoding"
        case .transport, nil: "transport"
        }
    }

    private func savedProfile() -> UserProfile? {
        guard let data = keychain.load(account: Self.profileAccount) else { return nil }
        return try? JSONDecoder().decode(UserProfile.self, from: data)
    }

    /// Run a Better Auth credential request, then persist the cookie and load the
    /// canonical profile. Surfaces failures as `errorMessage` without changing phase.
    private func authenticate(_ request: () async throws -> Void) async {
        isWorking = true
        errorMessage = nil
        sessionGeneration += 1 // a check still in flight answers for the session this replaces
        do {
            try await request()
            cookies.capture()
            let user = try await api.postEmpty("api/v1/auth/session", as: UserProfile.self)
            confirm(user)
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isWorking = false
    }
}
