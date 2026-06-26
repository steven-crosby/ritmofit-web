import Foundation

/// Pure, testable timeline math for the live prompter — a Swift port of the web
/// `LiveMode` derivation (cues + moves flattened onto a single class-absolute axis,
/// the live track for a time, current/next event). No SwiftUI, no clock: a position
/// (`elapsedMs`) goes in, a `Frame` comes out. The clock that drives `elapsedMs` is a
/// later slice; here the prompter is scrubber-driven.
struct LiveTimeline {
    let payload: RunPayload

    init(_ payload: RunPayload) { self.payload = payload }

    /// A cue or move flattened onto the class-absolute timeline.
    struct Event: Identifiable, Equatable {
        enum Kind { case cue, move }
        /// The underlying cue/move id — stable for `ForEach` and view-transition keys.
        let id: String
        /// Absolute milliseconds from class start.
        let atMs: Int
        let kind: Kind
        let text: String
        /// Optional `#RRGGBB` from a cue; `nil` for a move.
        let colorHex: String?
        /// A move may carry its own intensity; a cue does not.
        let intensity: Intensity?
    }

    /// A snapshot of the timeline at one position — everything the prompter renders for
    /// a given `elapsedMs`, computed in one pass so the views stay declarative.
    struct Frame: Equatable {
        /// Index of the live track in `payload.tracks`, or `nil` when the class has none.
        let trackIndex: Int?
        let track: RunPayload.RunTrack?
        /// The live track's events, time-ordered (empty when there is no live track).
        let events: [Event]
        /// Last event at or before `elapsedMs`.
        let current: Event?
        /// First event strictly after `elapsedMs`.
        let next: Event?

        /// Whether this moment is an All-Out **"drop"** (rhythm-system §5): a peak placed
        /// move is the current event, or the live track itself is all-out. Drives the
        /// reserved plasma glow bloom — affect only; the bars/zone/label still carry the
        /// intensity, so the glow is never the sole signal.
        var isPeakNow: Bool {
            if let intensity = current?.intensity, intensity.isPeak { return true }
            return track?.intensity.isPeak ?? false
        }
    }

    /// The live track for a class-absolute time: the last track whose window starts at or
    /// before it (mirrors the web `trackAt`). A missing `startOffsetMs` is treated as 0.
    func track(at elapsedMs: Int) -> (entry: RunPayload.RunTrack, index: Int)? {
        guard !payload.tracks.isEmpty else { return nil }
        var current = 0
        for (i, t) in payload.tracks.enumerated() where (t.startOffsetMs ?? 0) <= elapsedMs {
            current = i
        }
        return (payload.tracks[current], current)
    }

    /// All cues + moves of a track as class-absolute events, time-ordered. Ties keep
    /// cues before moves and otherwise preserve source order (a stable sort by
    /// `(atMs, sourceIndex)`), matching the web's stable concat-then-sort.
    static func events(for entry: RunPayload.RunTrack) -> [Event] {
        let base = entry.startOffsetMs ?? 0
        var built: [Event] = []
        built.reserveCapacity(entry.cues.count + entry.moves.count)
        for c in entry.cues {
            built.append(Event(id: c.id, atMs: base + c.anchorMs, kind: .cue,
                               text: c.text, colorHex: c.color, intensity: nil))
        }
        for m in entry.moves {
            built.append(Event(id: m.id, atMs: base + m.anchorMs, kind: .move,
                               text: m.name, colorHex: nil, intensity: m.intensity))
        }
        return built
            .enumerated()
            .sorted { ($0.element.atMs, $0.offset) < ($1.element.atMs, $1.offset) }
            .map(\.element)
    }

    /// Last event at or before `elapsedMs` (the "Now" cue/move). Backward scan over the
    /// already-sorted events.
    static func current(in events: [Event], at elapsedMs: Int) -> Event? {
        events.last { $0.atMs <= elapsedMs }
    }

    /// First event strictly after `elapsedMs` (the "Next" cue/move).
    static func next(in events: [Event], at elapsedMs: Int) -> Event? {
        events.first { $0.atMs > elapsedMs }
    }

    /// One-pass snapshot at `elapsedMs` for the prompter views.
    func frame(at elapsedMs: Int) -> Frame {
        guard let live = track(at: elapsedMs) else {
            return Frame(trackIndex: nil, track: nil, events: [], current: nil, next: nil)
        }
        let events = Self.events(for: live.entry)
        return Frame(
            trackIndex: live.index,
            track: live.entry,
            events: events,
            current: Self.current(in: events, at: elapsedMs),
            next: Self.next(in: events, at: elapsedMs)
        )
    }
}
