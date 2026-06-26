import Foundation
import CryptoKit

/// Pure helpers + wire body for the native Sign in with Apple flow.
///
/// Native flow nonce handshake (verified against Better Auth `apple` provider,
/// `nonceMatches`): generate a random *raw* nonce, hand Apple `sha256Hex(raw)` as
/// the request nonce (Apple echoes it into the ID token's `nonce` claim), and send
/// the backend the **raw** nonce. Better Auth recomputes `sha256Hex(raw)` and
/// compares it to the token claim. Token audience is the app bundle id, validated
/// server-side via the provider's `appBundleIdentifier`.
///
/// These functions are pure so they're unit-testable without `AuthenticationServices`
/// (the `ASAuthorizationController` flow itself is a device/UI step).
enum AppleSignIn {
    /// A cryptographically random nonce string drawn from a URL-safe alphabet.
    /// Used raw on the wire; its SHA-256 is what Apple receives.
    static func randomNonce(length: Int = 32) -> String {
        precondition(length > 0)
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        result.reserveCapacity(length)
        var remaining = length
        while remaining > 0 {
            var random: UInt8 = 0
            let status = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            precondition(status == errSecSuccess, "SecRandomCopyBytes failed: \(status)")
            // Reject bytes outside an exact multiple of the alphabet to avoid modulo bias.
            if random < charset.count * (256 / charset.count) {
                result.append(charset[Int(random) % charset.count])
                remaining -= 1
            }
        }
        return result
    }

    /// Lowercase hex SHA-256 of a string — the value handed to Apple as the request
    /// nonce, matching the digest Better Auth recomputes from the raw nonce.
    static func sha256Hex(_ input: String) -> String {
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

/// Better Auth native social sign-in body: `POST /api/auth/sign-in/social`.
/// `idToken.nonce` carries the **raw** nonce (server hashes to compare).
/// `nonisolated` so the `Encodable` conformance is usable off the main actor
/// (the project defaults to main-actor isolation).
nonisolated struct AppleSocialSignInBody: Encodable {
    let provider: String
    let idToken: IDToken

    struct IDToken: Encodable {
        let token: String
        let nonce: String
    }

    init(token: String, rawNonce: String) {
        self.provider = "apple"
        self.idToken = IDToken(token: token, nonce: rawNonce)
    }
}
