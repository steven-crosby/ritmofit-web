import Foundation
import os

/// Errors surfaced from the API boundary, mapped to user-facing copy.
enum APIError: LocalizedError {
    /// The request reached the server but the session is invalid/expired (HTTP 401).
    /// Carries the server's message (e.g. "Invalid email or password" on sign-in).
    case unauthorized(message: String?)
    /// Authenticated, but the session lacks access to this resource (HTTP 403) —
    /// distinct from 401: the caller stays signed in, so this must NOT bounce to
    /// sign-in. Typically a stale cached `accessLevel`; surface access-denied copy.
    case forbidden(message: String?)
    /// A non-2xx response with the API's `{ error: { code, message } }` (or Better
    /// Auth's flat `{ code, message }`) envelope decoded out.
    case server(status: Int, code: String?, message: String?)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case let .unauthorized(message):
            return message ?? "Your session has expired. Please sign in again."
        case let .forbidden(message):
            return message ?? "You don't have access to this class."
        case let .server(_, _, message):
            return message ?? "The request failed. Please try again."
        case .decoding:
            return "Couldn't read the server's response."
        case let .transport(error):
            let ns = error as NSError
            if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCannotConnectToHost
                || ns.code == NSURLErrorCannotFindHost
                || ns.code == NSURLErrorNotConnectedToInternet {
                return "Couldn't reach the server. Is the backend running?"
            }
            return error.localizedDescription
        }
    }
}

/// The minimal capability `PendingMutationQueue` needs to replay a stored write:
/// fire a verb + path + raw body and either succeed or throw an `APIError`. Kept
/// narrow so the queue's replay logic is unit-testable against a fake sender without
/// any `URLSession` machinery.
protocol MutationSender {
    func sendMutation(method: String, path: String, bodyData: Data?) async throws
    func post<Body: Encodable & Sendable, Response: Decodable & Sendable>(_ path: String, _ body: Body, as: Response.Type) async throws -> Response
}

/// Thin typed JSON client over the single-origin backend.
///
/// Reads its base URL from `Info.plist` (`API_BASE_URL`, injected from the active
/// xcconfig at build time). Uses `URLSession.shared`, whose default cookie storage
/// (`HTTPCookieStorage.shared`) carries the first-party Better Auth session cookie
/// once signed in — so subsequent `/api/v1/*` calls are authenticated automatically.
final class APIClient {
    let baseURL: URL
    let session: URLSession

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    /// Diagnostic breadcrumbs for decode/server failures. Logs only non-sensitive
    /// shape (HTTP status, the API's machine `code`, decode-error type) — never
    /// response bodies, headers, cookies, tokens, paths, or the server `message`
    /// (which can echo user input), per the no-secrets-in-logs rule.
    private static let log = Logger(subsystem: "studio.ritmofit", category: "api")

    convenience init(session: URLSession = .shared) {
        self.init(baseURL: APIClient.resolveBaseURL(), session: session)
    }

    /// Explicit base URL — used by tests (where `Bundle.main` is the test runner, not
    /// the app, so `resolveBaseURL()` wouldn't see the app's `API_BASE_URL`).
    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    /// `API_BASE_URL` from the bundle, falling back to production if unset/blank.
    ///
    /// The xcconfig escapes the scheme slashes as `\/\/` so `//` isn't read as an
    /// xcconfig comment; that escaping survives into the Info.plist value, so strip
    /// the backslashes here to recover a clean URL (e.g. `http:\/\/localhost:8787`
    /// → `http://localhost:8787`).
    static func resolveBaseURL() -> URL {
        let fallback = URL(string: "https://ritmofit.studio")!
        guard
            let raw = (Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String)?
                .replacingOccurrences(of: "\\", with: "")
                .trimmingCharacters(in: .whitespacesAndNewlines),
            !raw.isEmpty,
            let url = URL(string: raw),
            url.scheme != nil
        else { return fallback }
        return url
    }

    // MARK: - Convenience verbs

    func get<Response: Decodable>(_ path: String, as: Response.Type) async throws -> Response {
        try await send(path: path, method: "GET", bodyData: nil, decode: Response.self)
    }

    func post<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ path: String, _ body: Body, as: Response.Type
    ) async throws -> Response {
        try await send(path: path, method: "POST", bodyData: try encoder.encode(body), decode: Response.self)
    }

    func patch<Body: Encodable, Response: Decodable>(
        _ path: String, _ body: Body, as: Response.Type
    ) async throws -> Response {
        try await send(path: path, method: "PATCH", bodyData: try encoder.encode(body), decode: Response.self)
    }

    func delete<Response: Decodable>(
        _ path: String, as: Response.Type
    ) async throws -> Response {
        try await send(path: path, method: "DELETE", bodyData: nil, decode: Response.self)
    }

    /// POST that only needs success (2xx) — the response body is ignored.
    func postExpectingSuccess<Body: Encodable>(_ path: String, _ body: Body) async throws {
        _ = try await raw(path: path, method: "POST", bodyData: try encoder.encode(body))
    }

    /// DELETE that only needs success (2xx) — the response body is ignored.
    func deleteExpectingSuccess(_ path: String) async throws {
        _ = try await raw(path: path, method: "DELETE", bodyData: nil)
    }

    /// POST with no request body, decoding the response (e.g. the session reconcile).
    func postEmpty<Response: Decodable>(_ path: String, as: Response.Type) async throws -> Response {
        try await send(path: path, method: "POST", bodyData: nil, decode: Response.self)
    }

    // MARK: - Core

    private func send<Response: Decodable>(
        path: String, method: String, bodyData: Data?, decode: Response.Type
    ) async throws -> Response {
        let data = try await raw(path: path, method: method, bodyData: bodyData)
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            // Log the decode-failure type only (no body — it may carry session/PII).
            Self.log.error("decode failed for \(String(describing: Response.self), privacy: .public): \(String(describing: type(of: error)), privacy: .public)")
            throw APIError.decoding(error)
        }
    }

    /// Perform the request, map transport + HTTP errors, and return the raw body.
    @discardableResult
    private func raw(path: String, method: String, bodyData: Data?) async throws -> Data {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let bodyData {
            request.httpBody = bodyData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.server(status: -1, code: nil, message: nil)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw Self.mapError(status: http.statusCode, data: data)
        }
        return data
    }

    /// Decode whatever error shape the backend returned into an `APIError`.
    private static func mapError(status: Int, data: Data) -> APIError {
        let message = decodeErrorMessage(from: data)
        // Status + machine code only — the `message` can echo user input, so it's
        // left out of the log (it still flows to the user-facing error copy).
        log.error("HTTP \(status, privacy: .public) code=\(message?.code ?? "nil", privacy: .public)")
        if status == 401 { return .unauthorized(message: message?.message) }
        if status == 403 { return .forbidden(message: message?.message) }
        return .server(status: status, code: message?.code, message: message?.message)
    }

    /// The API wraps errors as `{ error: { code, message } }`; Better Auth returns a
    /// flat `{ code, message }`. Try both.
    private static func decodeErrorMessage(from data: Data) -> (code: String?, message: String?)? {
        struct Envelope: Decodable { struct Body: Decodable { let code: String?; let message: String? }; let error: Body }
        struct Flat: Decodable { let code: String?; let message: String? }
        let decoder = JSONDecoder()
        if let env = try? decoder.decode(Envelope.self, from: data) {
            return (env.error.code, env.error.message)
        }
        if let flat = try? decoder.decode(Flat.self, from: data), flat.message != nil || flat.code != nil {
            return (flat.code, flat.message)
        }
        return nil
    }
}

extension APIClient: MutationSender {
    /// Replay a queued mutation. Reuses the same transport/HTTP error mapping as the
    /// typed verbs, so the queue can classify `.transport` (retry) vs `.server` (drop).
    func sendMutation(method: String, path: String, bodyData: Data?) async throws {
        _ = try await raw(path: path, method: method, bodyData: bodyData)
    }
}
