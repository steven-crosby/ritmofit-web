import Foundation

/// Persists the Better Auth session cookie across launches via the Keychain.
///
/// `HTTPCookieStorage` only reliably keeps non-expiring "session" cookies for the
/// process lifetime, so we snapshot the host's cookies to the Keychain after sign-in
/// and restore them on launch — then validate with `POST /auth/session`. The cookie
/// is the only credential we store; we never persist the password.
struct SessionCookieStore {
    let baseURL: URL
    let storage: HTTPCookieStorage
    let keychain: KeychainStore
    private let account = "better-auth-session-cookies"

    /// Serializable subset of an `HTTPCookie` (its `properties` aren't Codable).
    private struct Snapshot: Codable {
        let name: String
        let value: String
        let domain: String
        let path: String
        let expiresAt: Date?
        let isSecure: Bool
    }

    /// Snapshot the current cookies for the backend host into the Keychain.
    func capture() {
        let cookies = storage.cookies(for: baseURL) ?? []
        let snapshots = cookies.map {
            Snapshot(name: $0.name, value: $0.value, domain: $0.domain,
                     path: $0.path, expiresAt: $0.expiresDate, isSecure: $0.isSecure)
        }
        guard !snapshots.isEmpty, let data = try? JSONEncoder().encode(snapshots) else { return }
        keychain.save(data, account: account)
    }

    /// Rehydrate persisted cookies into the cookie storage at launch.
    func restore() {
        guard let data = keychain.load(account: account),
              let snapshots = try? JSONDecoder().decode([Snapshot].self, from: data) else { return }
        for snapshot in snapshots {
            var properties: [HTTPCookiePropertyKey: Any] = [
                .name: snapshot.name,
                .value: snapshot.value,
                .domain: snapshot.domain,
                .path: snapshot.path,
            ]
            if let expiresAt = snapshot.expiresAt { properties[.expires] = expiresAt }
            if snapshot.isSecure { properties[.secure] = "TRUE" }
            if let cookie = HTTPCookie(properties: properties) {
                storage.setCookie(cookie)
            }
        }
    }

    /// Forget the session everywhere — cookie storage and the Keychain.
    func clear() {
        for cookie in storage.cookies(for: baseURL) ?? [] {
            storage.deleteCookie(cookie)
        }
        keychain.delete(account: account)
    }
}
