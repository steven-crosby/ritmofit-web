import Foundation
import Security

/// Minimal Keychain wrapper for small secrets (the persisted session cookie).
/// Generic-password items scoped to the app's service; readable after first unlock
/// (so the offline outbox can replay while locked) but device-bound — never synced
/// to iCloud Keychain, keeping the session token on the one device that signed in.
///
/// On macOS the items go in the data-protection keychain (the iOS-style, app-scoped one), so
/// the accessibility class applies there too (RF-1045). An unsigned build such as CI's macOS
/// test run lacks the entitlement for it and uses the default login keychain instead.
struct KeychainStore {
    let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "studio.ritmofit.RitmoFit") {
        self.service = service
    }

    func save(_ data: Data, account: String) {
        let query = baseQuery(account: account)
        SecItemDelete(query as CFDictionary) // upsert: clear any existing item first
        var attributes = query
        attributes[kSecValueData as String] = data
        if Self.supportsAccessibilityClass {
            attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        }
        SecItemAdd(attributes as CFDictionary, nil)
    }

    func load(account: String) -> Data? {
        var query = baseQuery(account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    func delete(account: String) {
        SecItemDelete(baseQuery(account: account) as CFDictionary)
    }

    /// Deletes every item under this service. The macOS login keychain removes one match per
    /// call, so this repeats until nothing is left (bounded, in case a delete keeps failing).
    func deleteAll() {
        let query = baseQuery(account: nil)
        for _ in 0..<100 where SecItemDelete(query as CFDictionary) == errSecSuccess {}
    }

    private func baseQuery(account: String?) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        if let account { query[kSecAttrAccount as String] = account }
        #if os(macOS)
        if Self.usesDataProtectionKeychain {
            query[kSecUseDataProtectionKeychain as String] = true
        }
        #endif
        return query
    }

    /// Whether items carry an accessibility class: always on iOS; on macOS only in the
    /// data-protection keychain (the login keychain has no such class).
    private static var supportsAccessibilityClass: Bool {
        #if os(macOS)
        usesDataProtectionKeychain
        #else
        true
        #endif
    }

    #if os(macOS)
    /// Probed once with a write, because an unsigned process can still query the
    /// data-protection keychain (a missing item reads as `errSecItemNotFound`) but any write
    /// fails with `errSecMissingEntitlement`. The probe item is removed straight away.
    private static let usesDataProtectionKeychain: Bool = {
        let probe: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "studio.ritmofit.keychain-probe",
            kSecAttrAccount as String: "probe",
            kSecUseDataProtectionKeychain as String: true,
        ]
        var item = probe
        item[kSecValueData as String] = Data()
        let status = SecItemAdd(item as CFDictionary, nil)
        SecItemDelete(probe as CFDictionary)
        return status != errSecMissingEntitlement
    }()
    #endif
}
