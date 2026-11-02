import Foundation

/// Persists the Better Auth session cookie across launches via the Keychain.
///
/// `HTTPCookieStorage` only reliably keeps non-expiring "session" cookies for the
/// process lifetime, so we snapshot the host's cookies to the Keychain after sign-in
/// and restore them on launch — then validate with `POST /auth/session`. The cookie
/// is the only credential we store; we never persist the password.
///
/// The cookie is kept with no client-side expiry (RF-1012, design C). `/auth/session`
/// extends the session on the server without sending a new cookie, so the expiry the
/// sign-in response gave the cookie goes stale; the server alone decides when the
/// session ends, and a 401 tells us.
struct SessionCookieStore {
    let baseURL: URL
    let storage: HTTPCookieStorage
    let keychain: KeychainStore
    static let account = "better-auth-session-cookies"

    /// Serializable subset of an `HTTPCookie` (its `properties` aren't Codable). Snapshots
    /// saved by earlier builds also carry an `expiresAt`, which decoding ignores.
    private struct Snapshot: Codable {
        let name: String
        let value: String
        let domain: String
        let path: String
        let isSecure: Bool
    }

    /// Snapshot the current cookies for the backend host into the Keychain, and swap the
    /// live ones for copies without an expiry so a long-running process keeps them too.
    func capture() {
        let cookies = storage.cookies(for: baseURL) ?? []
        let snapshots = cookies.map {
            Snapshot(name: $0.name, value: $0.value, domain: $0.domain, path: $0.path, isSecure: $0.isSecure)
        }
        guard !snapshots.isEmpty, let data = try? JSONEncoder().encode(snapshots) else { return }
        keychain.save(data, account: Self.account)
        install(snapshots)
    }

    /// Rehydrate persisted cookies into the cookie storage at launch.
    func restore() {
        guard let data = keychain.load(account: Self.account),
              let snapshots = try? JSONDecoder().decode([Snapshot].self, from: data) else { return }
        install(snapshots)
    }

    /// Forget the session everywhere — cookie storage and the Keychain.
    func clear() {
        for cookie in storage.cookies(for: baseURL) ?? [] {
            storage.deleteCookie(cookie)
        }
        keychain.delete(account: Self.account)
    }

    /// Put each snapshot in the cookie storage as a cookie with no expiry, replacing any
    /// cookie of the same name, domain and path.
    private func install(_ snapshots: [Snapshot]) {
        for snapshot in snapshots {
            var properties: [HTTPCookiePropertyKey: Any] = [
                .name: snapshot.name,
                .value: snapshot.value,
                .domain: snapshot.domain,
                .path: snapshot.path,
            ]
            if snapshot.isSecure { properties[.secure] = "TRUE" }
            if let cookie = HTTPCookie(properties: properties) {
                storage.setCookie(cookie)
            }
        }
    }
}
