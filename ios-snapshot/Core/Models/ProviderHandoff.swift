import Foundation

// Provider-app handoff: resolve a track's `ProviderRef` to a URL that opens it in the
// provider's own app (Spotify / Apple Music / SoundCloud). This is **app handoff only** —
// we open a link and hand the user off; we never cache provider audio, pull BPM, or play,
// mix, or embed playback in-app (the three inviolable music rules).
//
// Pure value-type logic with no SwiftUI/UIKit dependency, so the URL resolution is unit
// tested directly; the actual `openURL` + on-device app routing is the human/device step.

extension RunPayload.ProviderRef {
    /// A URL that hands off to this track in its provider app, or `nil` when nothing
    /// openable can be resolved (so the UI hides the affordance rather than dead-linking).
    ///
    /// Prefers the backend-supplied `providerUri` verbatim when it parses to a scheme-
    /// bearing URL; otherwise synthesizes a canonical **https** web link. The OS routes
    /// these universal links to the installed provider app and falls back to the web
    /// player when the app is absent — the cleanest degradation. Providers whose ids are
    /// not URL-derivable (SoundCloud, unknown) resolve to `nil` unless the backend carried
    /// a `providerUri`.
    var handoffURL: URL? {
        if let uri = providerUri?.trimmingCharacters(in: .whitespacesAndNewlines),
           !uri.isEmpty,
           let url = URL(string: uri),
           url.scheme != nil {
            return url
        }
        return provider.webURL(forTrackId: providerTrackId)
    }
}

extension ProviderKind {
    /// Canonical https web link for a provider track id, or `nil` when the provider's ids
    /// are not URL-derivable. Universal links route to the installed app and otherwise
    /// open the provider's web player.
    func webURL(forTrackId trackId: String) -> URL? {
        let id = trackId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !id.isEmpty,
              let encoded = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)
        else { return nil }

        switch self {
        case .spotify:
            return URL(string: "https://open.spotify.com/track/\(encoded)")
        case .appleMusic:
            // Storefront-less song link; Apple Music redirects it to the user's storefront.
            return URL(string: "https://music.apple.com/song/\(encoded)")
        case .soundcloud, .other:
            // SoundCloud track ids aren't a public URL slug, and unknown providers have no
            // known scheme — only an explicit `providerUri` can open these.
            return nil
        }
    }
}
