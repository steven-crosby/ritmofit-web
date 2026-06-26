import Foundation
import UIKit

/// Pure VoiceOver label builders for the live prompter.
///
/// SwiftUI accessibility modifiers can't be asserted headlessly, so the *spoken strings*
/// live here as pure functions over the timeline value types — deterministic and
/// unit-testable — and the views just attach them. Live mode targets WCAG **AAA**
/// (design-system §07), so the redundant-encoding channels that the visual carries
/// (cue-vs-move kind, intensity zone + label) must survive into the spoken output too —
/// a `.combine` + visual label would otherwise drop a move's intensity entirely.
enum LiveAccessibility {

    /// Posts an announcement to VoiceOver when a new cue or move starts.
    static func announce(_ event: LiveTimeline.Event) {
        UIAccessibility.post(notification: .announcement, argument: eventPhrase(event))
    }

    /// The focal "Now" cue/move, spoken with its kind and — for a move — its intensity, so
    /// a VoiceOver user hears everything the sighted redundant encoding shows.
    static func nowLabel(for frame: LiveTimeline.Frame) -> String {
        guard let current = frame.current else { return "Now: nothing yet" }
        return "Now: \(eventPhrase(current))"
    }

    /// The upcoming cue/move and how long until it; "end of track" when there is none.
    static func nextLabel(for frame: LiveTimeline.Frame, elapsedMs: Int) -> String {
        guard let next = frame.next else { return "Next: end of track" }
        return "Next: \(next.text), in \((next.atMs - elapsedMs).durationString)"
    }

    /// The Cue-by-Cue track header summary (track number, title, artist, intensity, BPM).
    static func trackHeaderLabel(_ track: RunPayload.RunTrack, trackIndex: Int) -> String {
        trackSummary(track, index: trackIndex, includeStart: false)
    }

    /// The track + class countdowns, spoken as one phrase.
    static func countdownsLabel(_ track: RunPayload.RunTrack, elapsedMs: Int, classTotalMs: Int) -> String {
        let start = track.startOffsetMs ?? 0
        var parts: [String] = []
        // A track with no entered duration has no real window — don't speak a 0:00.
        if let dur = track.track.durationMs {
            parts.append("Track ends in \(max(0, start + dur - elapsedMs).durationString)")
        } else {
            parts.append("No track duration set")
        }
        parts.append("Class ends in \(max(0, classTotalMs - elapsedMs).durationString)")
        return parts.joined(separator: ", ")
    }

    /// A Full List track-card summary, spoken before its seek hint.
    static func trackSummaryLabel(_ track: RunPayload.RunTrack, index: Int) -> String {
        trackSummary(track, index: index, includeStart: true)
    }

    /// A Full List timeline row: kind, text, offset within the track, and whether it's past.
    static func eventLabel(_ event: LiveTimeline.Event, trackStart: Int, isPast: Bool) -> String {
        let kind = event.kind == .cue ? "Cue" : "Move"
        let at = (event.atMs - trackStart).durationString
        return "\(kind) \(event.text) at \(at)\(isPast ? ", done" : "")"
    }

    // MARK: - Shared

    /// Kind + text, plus intensity when it's a move that carries one.
    private static func eventPhrase(_ event: LiveTimeline.Event) -> String {
        let kind = event.kind == .cue ? "cue" : "move"
        if event.kind == .move, let intensity = event.intensity {
            return "\(kind), \(event.text), \(intensityPhrase(intensity))"
        }
        return "\(kind), \(event.text)"
    }

    private static func trackSummary(_ track: RunPayload.RunTrack, index: Int, includeStart: Bool) -> String {
        var parts = ["Track \(index + 1)", track.track.title, "by \(track.track.artist)"]
        if includeStart {
            parts.append("starts \((track.startOffsetMs ?? 0).durationString)")
        }
        parts.append(intensityPhrase(track.intensity))
        if let bpm = track.displayBpm {
            parts.append("\(bpm) BPM")
        }
        return parts.joined(separator: ", ")
    }

    /// Matches `IntensityReadout`'s spoken form so intensity sounds the same everywhere.
    private static func intensityPhrase(_ intensity: Intensity) -> String {
        "intensity zone \(intensity.zone), \(intensity.label)"
    }
}
