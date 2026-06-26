import Network
import Observation

/// Lightweight network-reachability signal. Drives the "offline — showing saved"
/// affordance and lets the UI skip an auto-refresh it knows will fail. Not a
/// guarantee the backend is up — just whether a path exists.
@MainActor
@Observable
final class Reachability {
    static let shared = Reachability()

    private(set) var isOnline = true
    private let monitor = NWPathMonitor()

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor [weak self] in self?.isOnline = online }
        }
        monitor.start(queue: DispatchQueue(label: "studio.ritmofit.reachability"))
    }
}
