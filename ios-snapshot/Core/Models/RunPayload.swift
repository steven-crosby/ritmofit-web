import Foundation

// The versioned live contract: the decoded shape of `GET /api/v1/classes/:id/run-payload`.
//
// This is the **frozen v1 run-payload** (api.md decision D12 / `RunPayload` in the
// generated `openapi.json`) — the canonical single-fetch input for running a class
// live. These are read-only DTOs that mirror the wire shape exactly (camelCase,
// ms-based); they are NOT the SwiftData cache models. (The pre-v1 `ClassPlan`/
// `ClassSlot` model family was removed in the 2026-06-14 stale-model cleanup.)
//
// Closed wire enums (`template`, section `type`, `provider`) decode **leniently**:
// an unrecognised value lands in `.other(raw)` instead of failing the whole payload,
// so a future contract addition can't black out the live screen. `intensity` reuses
// the existing `Intensity` ramp.

/// Top-level run payload. `schemaVersion` is `1` for this shape; treat a different
/// value as a contract the client doesn't understand.
nonisolated struct RunPayload: Decodable, Equatable {
    let schemaVersion: Int
    let `class`: RunClass
    let tracks: [RunTrack]
    let sections: [Section]

    /// Whether this payload can actually drive the live prompter. A payload with no
    /// placed tracks, or a zero-length assembled timeline, has nothing to run — the
    /// prompter would render blank Now/Next cards over a dead transport. The live
    /// surface guards on this and shows a message state instead.
    var isRunnable: Bool {
        !tracks.isEmpty && self.class.totalDurationMs > 0
    }
}

nonisolated extension RunPayload {

    /// Class-level header: identity, template, and the planned-vs-assembled durations.
    struct RunClass: Decodable, Equatable, Identifiable {
        let id: String
        let title: String
        let template: ClassTemplate?
        /// The instructor's planned length; may be absent.
        let targetDurationMs: Int?
        /// The assembled timeline length (sum of track durations); drives the live timer.
        let totalDurationMs: Int
    }

    /// One placed track on the timeline, with its resolved metadata, provider refs,
    /// and the cues/moves anchored within it.
    struct RunTrack: Decodable, Equatable, Identifiable {
        let classTrackId: String
        let position: Int
        /// Resolved BPM (`display_bpm_override ?? track.display_bpm`); manual/optional in M1.
        let displayBpm: Int?
        let intensity: Intensity
        /// Server-derived start on the assembled timeline (read-only).
        let startOffsetMs: Int?
        let notes: String?
        let track: TrackMeta
        let providerRefs: [ProviderRef]
        let cues: [Cue]
        let moves: [Move]

        /// `Identifiable` via the placement id (one track may appear once per placement).
        var id: String { classTrackId }

        private enum CodingKeys: String, CodingKey {
            case classTrackId, position, displayBpm, intensity, startOffsetMs, notes
            case track, providerRefs, cues, moves
        }

        init(classTrackId: String, position: Int, displayBpm: Int?, intensity: Intensity, startOffsetMs: Int?, notes: String?, track: TrackMeta, providerRefs: [ProviderRef], cues: [Cue], moves: [Move]) {
            self.classTrackId = classTrackId
            self.position = position
            self.displayBpm = displayBpm
            self.intensity = intensity
            self.startOffsetMs = startOffsetMs
            self.notes = notes
            self.track = track
            self.providerRefs = providerRefs
            self.cues = cues
            self.moves = moves
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            classTrackId = try c.decode(String.self, forKey: .classTrackId)
            position = try c.decode(Int.self, forKey: .position)
            displayBpm = try c.decodeIfPresent(Int.self, forKey: .displayBpm)
            // Lenient: an unknown intensity falls back rather than failing the payload.
            intensity = Intensity(rawValue: try c.decode(String.self, forKey: .intensity)) ?? .none
            startOffsetMs = try c.decodeIfPresent(Int.self, forKey: .startOffsetMs)
            notes = try c.decodeIfPresent(String.self, forKey: .notes)
            track = try c.decode(TrackMeta.self, forKey: .track)
            providerRefs = try c.decode([ProviderRef].self, forKey: .providerRefs)
            cues = try c.decode([Cue].self, forKey: .cues)
            moves = try c.decode([Move].self, forKey: .moves)
        }
    }

    /// The underlying catalog track (title/artist/duration/art).
    struct TrackMeta: Decodable, Equatable, Identifiable {
        let id: String
        let title: String
        let artist: String
        let durationMs: Int?
        let albumArtUrl: String?
    }

    /// A provider handoff reference — used to deep-link to the provider app (deferred);
    /// for now it only signals which providers carry the track. Never in-app playback.
    struct ProviderRef: Decodable, Equatable {
        let provider: ProviderKind
        let providerTrackId: String
        let providerUri: String?
    }

    /// A spoken/visual cue anchored at `anchorMs`. `beat`/`bar`/`color` are optional.
    struct Cue: Decodable, Equatable, Identifiable {
        let id: String
        let anchorMs: Int
        let beat: Int?
        let bar: Int?
        let text: String
        /// Optional hex string from the backend (e.g. "#3AC0D4"); presentation may ignore it.
        let color: String?
    }

    /// A placed move (choreography beat) anchored at `anchorMs`, with optional intensity.
    struct Move: Decodable, Equatable, Identifiable {
        let id: String
        let anchorMs: Int
        let name: String
        let intensity: Intensity?

        private enum CodingKeys: String, CodingKey { case id, anchorMs, name, intensity }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            anchorMs = try c.decode(Int.self, forKey: .anchorMs)
            name = try c.decode(String.self, forKey: .name)
            if let raw = try c.decodeIfPresent(String.self, forKey: .intensity) {
                intensity = Intensity(rawValue: raw)
            } else {
                intensity = nil
            }
        }
    }

    /// A timeline section boundary — the band of effort starting at `startOffsetMs`.
    struct Section: Decodable, Equatable, Identifiable {
        let type: SectionType
        let startOffsetMs: Int

        /// Stable enough for `ForEach` (sections are ordered, non-overlapping).
        var id: Int { startOffsetMs }
    }

    /// Index into `sections` of the section live at `elapsedMs` — the last whose window has
    /// started (sections are ordered, non-overlapping). `nil` when there are no sections or
    /// the time precedes the first one. Drives the Live segment band's current highlight.
    func sectionIndex(at elapsedMs: Int) -> Int? {
        var current: Int?
        for (i, section) in sections.enumerated() where section.startOffsetMs <= elapsedMs {
            current = i
        }
        return current
    }
}

// MARK: - Lenient wire enums

/// Class workout template (`cycle`/`hiit`/`sculpt`/`tread`); `.other` for forward-compat.
nonisolated enum ClassTemplate: Decodable, Equatable {
    case cycle, hiit, sculpt, tread
    case other(String)

    init(from decoder: Decoder) throws {
        switch try decoder.singleValueContainer().decode(String.self) {
        case "cycle": self = .cycle
        case "hiit": self = .hiit
        case "sculpt": self = .sculpt
        case "tread": self = .tread
        case let raw: self = .other(raw)
        }
    }

    /// Title-cased label, e.g. "Cycle"; `.other` shows its raw value capitalized.
    var label: String {
        switch self {
        case .cycle: return "Cycle"
        case .hiit: return "HIIT"
        case .sculpt: return "Sculpt"
        case .tread: return "Tread"
        case let .other(raw): return raw.prefix(1).uppercased() + raw.dropFirst()
        }
    }
}

/// Timeline section type. Drives the section band; pairs an icon + label with a quiet
/// tint so the band never communicates by color alone.
nonisolated enum SectionType: Decodable, Equatable {
    case warmUp, climb, sprint, recovery, coolDown
    case other(String)

    init(from decoder: Decoder) throws {
        switch try decoder.singleValueContainer().decode(String.self) {
        case "warm_up": self = .warmUp
        case "climb": self = .climb
        case "sprint": self = .sprint
        case "recovery": self = .recovery
        case "cool_down": self = .coolDown
        case let raw: self = .other(raw)
        }
    }

    var label: String {
        switch self {
        case .warmUp: return "Warm Up"
        case .climb: return "Climb"
        case .sprint: return "Sprint"
        case .recovery: return "Recovery"
        case .coolDown: return "Cool Down"
        case let .other(raw): return raw.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    /// SF Symbol — the primary, colorblind-safe signal paired with `label`.
    var symbol: String {
        switch self {
        case .warmUp: return "thermometer.low"
        case .climb: return "arrow.up.right"
        case .sprint: return "bolt.fill"
        case .recovery: return "wind"
        case .coolDown: return "thermometer.snowflake"
        case .other: return "circle"
        }
    }
}

/// Music provider that carries a track. Brand-colored marks only; no in-app playback.
nonisolated enum ProviderKind: Decodable, Equatable {
    case spotify, appleMusic, soundcloud
    case other(String)

    init(from decoder: Decoder) throws {
        switch try decoder.singleValueContainer().decode(String.self) {
        case "spotify": self = .spotify
        case "apple_music": self = .appleMusic
        case "soundcloud": self = .soundcloud
        case let raw: self = .other(raw)
        }
    }

    var label: String {
        switch self {
        case .spotify: return "Spotify"
        case .appleMusic: return "Apple Music"
        case .soundcloud: return "SoundCloud"
        case let .other(raw): return raw.capitalized
        }
    }

    /// SF Symbol stand-in (provider word marks aren't bundled); paired with `label`.
    var symbol: String { "music.note" }
}
