import Foundation

// Network response DTOs for the auth keystone slice.
//
// These are thin, camelCase-matching mirrors of the shared web contract
// (`packages/shared`) — NOT the SwiftData cache models. Enum-like fields are kept
// as plain `String` here on purpose: the class `accessLevel`
// (none/view/edit/owner) is a distinct concept from the music-provider access
// level, so it is decoded as a lenient `String` rather than a closed Swift enum.

/// The canonical caller profile from `POST /api/v1/auth/session`.
struct UserProfile: Codable, Identifiable, Equatable {
    let id: String
    let email: String
    let displayName: String?
    let imageUrl: String?

    /// A short label for greetings — display name if present, else the email's local part.
    var shortName: String {
        if let displayName, !displayName.trimmingCharacters(in: .whitespaces).isEmpty {
            return displayName
        }
        return String(email.prefix(while: { $0 != "@" }))
    }
}

/// One row of `GET /api/v1/classes` — a class plus the caller's effective access.
/// Extra fields in the JSON (ownerUserId, timestamps, …) are ignored by Decodable.
struct ClassSummary: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let title: String
    let template: String?
    let status: String
    let visibility: String
    let targetDurationMs: Int?
    let accessLevel: String

    /// Human label for the access level (`none`/`view`/`edit`/`owner`).
    var accessLabel: String {
        switch accessLevel {
        case "owner": return "Owner"
        case "edit": return "Editor"
        case "view": return "Viewer"
        default: return "No access"
        }
    }

    /// SF Symbol paired with `accessLabel` so access is never color-only (redundant encoding).
    var accessSymbol: String {
        switch accessLevel {
        case "owner": return "person.crop.circle.badge.checkmark"
        case "edit": return "pencil"
        case "view": return "eye"
        default: return "lock"
        }
    }

    /// Title-cased template label, e.g. "cycle" → "Cycle"; nil when untemplated.
    var templateLabel: String? {
        guard let template, !template.isEmpty else { return nil }
        return template.prefix(1).uppercased() + template.dropFirst()
    }
}

/// `GET /api/v1/classes/:id` — a single class with the caller's effective access.
/// Unlike `ClassSummary` it carries the editable `description`, so the pre-flight
/// detail screen fetches this to seed (and write back) the class note.
nonisolated struct ClassDetail: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let description: String?
    let template: String?
    let status: String
    let visibility: String
    let targetDurationMs: Int?
    let accessLevel: String

    /// Whether the caller may edit class fields — `edit` or `owner` per the
    /// authorization contract ("Update class fields" requires EDIT).
    var canEdit: Bool { accessLevel == "edit" || accessLevel == "owner" }
}
