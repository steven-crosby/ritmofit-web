import Foundation
import Observation

/// Owns the Better Auth session lifecycle: restore-on-launch, sign in / up / out,
/// and the persisted session cookie. The backend is authoritative — this only holds
/// the cookie (Keychain) and the canonical profile fetched from `/auth/session`.
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

    /// Shared, cookie-carrying client — reused by feature views for authed reads.
    let api: APIClient
    private let cookies: SessionCookieStore

    // Defaults are `nil` (not constructed in default-argument position) so building
    // an `AuthStore` from SwiftUI's nonisolated `@State` initializer stays warning-free.
    init(api: APIClient? = nil, keychain: KeychainStore? = nil) {
        let api = api ?? APIClient()
        let keychain = keychain ?? KeychainStore()
        self.api = api
        self.cookies = SessionCookieStore(
            baseURL: api.baseURL,
            storage: api.session.configuration.httpCookieStorage ?? .shared,
            keychain: keychain
        )
    }

    /// Restore a persisted session at launch: rehydrate the cookie, then validate it.
    func restore() async {
        cookies.restore()
        do {
            let user = try await api.postEmpty("api/v1/auth/session", as: UserProfile.self)
            phase = .signedIn(user)
        } catch {
            // No valid session — clear any stale cookie and present sign-in.
            cookies.clear()
            phase = .signedOut
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
        cookies.clear()
        errorMessage = nil
        isWorking = false
        phase = .signedOut
    }

    /// Call when an authed read returns 401 — the session is no longer valid.
    func handleUnauthorized() {
        cookies.clear()
        phase = .signedOut
    }

    // MARK: - Private

    private struct EmptyBody: Encodable {}

    /// Run a Better Auth credential request, then persist the cookie and load the
    /// canonical profile. Surfaces failures as `errorMessage` without changing phase.
    private func authenticate(_ request: () async throws -> Void) async {
        isWorking = true
        errorMessage = nil
        do {
            try await request()
            cookies.capture()
            let user = try await api.postEmpty("api/v1/auth/session", as: UserProfile.self)
            phase = .signedIn(user)
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        isWorking = false
    }
}
