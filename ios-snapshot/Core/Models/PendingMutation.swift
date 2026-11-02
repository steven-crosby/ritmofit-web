import SwiftData
import Foundation

// PendingMutation — local-only offline outbox queue. Never synced to the backend.
// When a backend write fails after retries (network unreachable, timeout), the mutation
// is persisted here and replayed when connectivity returns (NWPathMonitor).
// Schema version 2 (`OutboxSchemaV2`); V1 is frozen in `OutboxSchema.swift`.
@Model
final class PendingMutation {
    @Attribute(.unique) var id: String           // UUIDv7, client-generated
    var method: String                           // "POST" | "PATCH" | "DELETE"
    var endpoint: String                         // e.g. "/api/v1/classes/abc/slots/xyz"
    var payloadJSON: String                      // JSON-encoded request body; "" for DELETE
    var headersJSON: String                      // JSON-encoded extra headers e.g. {"If-Match-Version":"3"}
    var createdAt: Date
    var retryCount: Int                          // failed attempts (not cancellations); drives exponential back-off
    var lastAttemptAt: Date?                      // nil until first replay; gates the back-off window
    var ownerUserId: String?                     // account that queued it; nil only for rows from before V2
    var firstFailedAt: Date?                     // first failed attempt; starts the 24 h server-error window
    var deadLetteredAt: Date?                    // set when replay gives up; the row is kept, not deleted
    var deadLetterReason: String?                // why, e.g. "422", "server", "stale"; never payload text
    var rollbackJSON: String?                    // pre-edit values for RF-1023; nil until that lands

    init(
        id: String,
        method: String,
        endpoint: String,
        payloadJSON: String = "",
        headersJSON: String = "{}",
        createdAt: Date = .now,
        retryCount: Int = 0,
        lastAttemptAt: Date? = nil,
        ownerUserId: String? = nil,
        firstFailedAt: Date? = nil,
        deadLetteredAt: Date? = nil,
        deadLetterReason: String? = nil,
        rollbackJSON: String? = nil
    ) {
        self.id = id
        self.method = method
        self.endpoint = endpoint
        self.payloadJSON = payloadJSON
        self.headersJSON = headersJSON
        self.createdAt = createdAt
        self.retryCount = retryCount
        self.lastAttemptAt = lastAttemptAt
        self.ownerUserId = ownerUserId
        self.firstFailedAt = firstFailedAt
        self.deadLetteredAt = deadLetteredAt
        self.deadLetterReason = deadLetterReason
        self.rollbackJSON = rollbackJSON
    }
}
