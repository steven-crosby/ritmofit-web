import Foundation

/// Tells the first launch after an install apart from every later one (RF-1012).
///
/// The Keychain outlives an uninstall, so without this a reinstall would come back
/// signed in with the old session cookie and saved profile. `UserDefaults` and the app's
/// files go with the app, so a missing marker means a fresh install — unless the
/// SwiftData stores are already on disk, which means an upgrade from a build that
/// predates the marker, and that keeps its session.
enum InstallMarker {
    static let key = "studio.ritmofit.installMarker"
    /// Store files every launch since the cache and outbox shipped has created.
    static let storeNames = ["cache.store", "outbox.store"]

    /// Record that the app has launched, and return whether this is the first launch after
    /// an install. Call it before the stores open, or every launch looks like an upgrade.
    static func claimFirstLaunch(
        defaults: UserDefaults = .standard,
        storeDirectory: URL = .applicationSupportDirectory,
        fileManager: FileManager = .default
    ) -> Bool {
        guard !defaults.bool(forKey: key) else { return false }
        defaults.set(true, forKey: key)
        let isUpgrade = storeNames.contains {
            fileManager.fileExists(atPath: storeDirectory.appendingPathComponent($0).path)
        }
        return !isUpgrade
    }
}
