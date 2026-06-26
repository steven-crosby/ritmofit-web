import SwiftData
import Foundation

// PendingMutation — local-only offline outbox queue. Never synced to the backend.
// When a backend write fails after retries (network unreachable, timeout), the mutation
// is persisted here and replayed FIFO when connectivity returns (NWPathMonitor).
@Model
final class PendingMutation {
    @Attribute(.unique) var id: String           // UUIDv7, client-generated
    var method: String                           // "POST" | "PATCH" | "DELETE"
    var endpoint: String                         // e.g. "/api/v1/classes/abc/slots/xyz"
    var payloadJSON: String                      // JSON-encoded request body; "" for DELETE
    var headersJSON: String                      // JSON-encoded extra headers e.g. {"If-Match-Version":"3"}
    var createdAt: Date
    var retryCount: Int                          // incremented on each failed attempt; drives exponential back-off
    var lastAttemptAt: Date?                      // nil until first replay; gates the back-off window

    init(
        id: String,
        method: String,
        endpoint: String,
        payloadJSON: String = "",
        headersJSON: String = "{}",
        createdAt: Date = .now,
        retryCount: Int = 0,
        lastAttemptAt: Date? = nil
    ) {
        self.id = id
        self.method = method
        self.endpoint = endpoint
        self.payloadJSON = payloadJSON
        self.headersJSON = headersJSON
        self.createdAt = createdAt
        self.retryCount = retryCount
        self.lastAttemptAt = lastAttemptAt
    }
}
