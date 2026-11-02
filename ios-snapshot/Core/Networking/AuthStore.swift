import Foundation
import Observation

/// Owns the Better Auth session lifecycle: restore-on-launch, sign in / up / out,
/// and the persisted session cookie. The backend is authoritative — this only holds
/// the cookie (Keychain) and the canonical profile fetched from `/auth/session`.
///
/// Only a 401 ends a session (RF-1010, option A). A launch whose session check fails any
/// other way (offline, timeout, 5xx, an unreadable response) keeps the cookie and signs in
/// as the last confirmed profile, saved in the Keychain beside it, so the app runs from
/// its cache; `recheckSession()` confirms the session once the server answers.
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

    /// Shared, cookie-carrying client — reused by feature views for authed reads.
    let api: APIClient
    private let cookies: SessionCookieStore
    private let keychain: KeychainStore
    /// The last profile the server confirmed, stored with the cookie (same Keychain service).
    static let profileAccount = "last-confirmed-profile"

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
    /// signs in as it unconfirmed; with no saved profile (never signed in, or signed out)
    /// it shows sign-in.
    func restore() async {
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
                phase = .signedOut
            }
        }
    }

    /// Check an unconfirmed session again, when the network returns or the app comes back
    /// to the foreground. A 401 signs out; any other failure leaves things as they are.
    func recheckSession() async {
        guard case .signedIn = phase, !isSessionConfirmed else { return }
        do {
            let user = try await api.postEmpty("api/v1/auth/session", as: UserProfile.self)
            guard case .signedIn = phase else { return } // signed out while in flight
            confirm(user)
        } catch APIError.unauthorized {
            handleUnauthorized()
        } catch {
            // Still unreachable: keep running from the cache.
        }
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
        // Best-effort server sign-out; local state is cleared regardless.
        try? await api.postExpectingSuccess("api/auth/sign-out", EmptyBody())
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

    /// The server confirmed `user`: sign in as them and save the profile for offline launches.
    private func confirm(_ user: UserProfile) {
        if let data = try? JSONEncoder().encode(user) {
            keychain.save(data, account: Self.profileAccount)
        }
        isSessionConfirmed = true
        phase = .signedIn(user)
    }

    /// End the session on this device: the cookie and the saved profile both go.
    private func forgetSession() {
        cookies.clear()
        keychain.delete(account: Self.profileAccount)
        isSessionConfirmed = false
        phase = .signedOut
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
