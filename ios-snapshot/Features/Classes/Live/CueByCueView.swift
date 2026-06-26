import SwiftUI

/// The **Cue-by-Cue** prompter: one focal "Now" card plus what's next, for the track
/// live at the scrubbed position. The instructor reads this in front of the room, so it
/// stays large and high-contrast. Intensity is encoded redundantly (bars + zone + label,
/// color only reinforcing).
///
/// This is the one surface that carries the **rhythm signature** (rhythm-system §2/§5):
/// while the clock runs, the "Now" card pulses on the live track's beat, and an All-Out
/// moment blooms the reserved plasma glow (the "drop"). Both are pure affect and fully
/// suppressed under Reduce Motion — the card then shows a static "Now playing" indicator
/// and the numbers/bars/labels stand on their own.
struct CueByCueView: View {
    let frame: LiveTimeline.Frame
    let elapsedMs: Int
    let classTotalMs: Int
    /// The clock is running — gates the on-beat pulse (a focus device, not ambient).
    var isRunning: Bool = false
    /// `.vertical` (portrait) stacks Now over Next; `.horizontal` (landscape) sets them
    /// side-by-side to use the width. The "Now" card stays the single pulsing element either way.
    var axis: Axis = .vertical

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if let track = frame.track {
            content(track)
        } else {
            Text("This class has no tracks yet.")
                .font(.bodyMedium)
                .foregroundStyle(RFColor.textTertiary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(RFSpace.x48)
        }
    }

    private func content(_ track: RunPayload.RunTrack) -> some View {
        // The drop blooms first (behind), then the whole card breathes on the beat.
        let now = nowCard
            .peakGlow(active: frame.isPeakNow, reduceMotion: reduceMotion)
            .beatPulse(bpm: track.displayBpm, isActive: isRunning)
        return Group {
            if axis == .horizontal {
                VStack(spacing: RFSpace.x16) {
                    trackHeader(track)
                    HStack(alignment: .top, spacing: RFSpace.x24) {
                        now
                        VStack(spacing: RFSpace.x16) {
                            nextCard
                            countdowns(track)
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            } else {
                VStack(spacing: RFSpace.x24) {
                    trackHeader(track)
                    now
                    nextCard
                    countdowns(track)
                }
            }
        }
        .padding(RFSpace.x24)
        .frame(maxWidth: .infinity)
    }

    // MARK: Track header

    private func trackHeader(_ track: RunPayload.RunTrack) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: RFSpace.x4) {
                Text("TRACK \((frame.trackIndex ?? 0) + 1)")
                    .font(.dataSmall)
                    .foregroundStyle(RFColor.textTertiary)
                Text(track.track.title)
                    .font(.headlineSmall)
                    .foregroundStyle(RFColor.textPrimary)
                    .lineLimit(2)
                Text(track.track.artist)
                    .font(.bodySmall)
                    .foregroundStyle(RFColor.textSecondary)
                    .lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: RFSpace.x4) {
                IntensityReadout(intensity: track.intensity)
                if let bpm = track.displayBpm {
                    Text("\(bpm) BPM")
                        .font(.dataSmall)
                        .foregroundStyle(RFColor.textSecondary)
                }
            }
        }
        // Read the whole header as one phrase (track, title/artist, intensity, BPM) instead
        // of five separate swipes.
        .accessibilityElement(children: .combine)
        .accessibilityLabel(LiveAccessibility.trackHeaderLabel(track, trackIndex: frame.trackIndex ?? 0))
    }

    // MARK: Now card — the focal cue/move

    private var nowCard: some View {
        let current = frame.current
        let nowColor = current.flatMap { Color(cueHex: $0.colorHex) } ?? RFColor.textPrimary
        return VStack(spacing: RFSpace.x8) {
            Text("NOW")
                .font(.labelSmall)
                .foregroundStyle(RFColor.textTertiary)
            Text(current?.text ?? "—")
                .font(.displayMedium)
                .foregroundStyle(nowColor)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .minimumScaleFactor(0.6)
            if let current, current.kind == .move, let intensity = current.intensity {
                IntensityReadout(intensity: intensity)
            }
            // Reduce Motion suppresses the beat pulse, so the playing state needs a static,
            // legible signal instead (rhythm-system §6: "Now playing" indicator + label).
            if isRunning && reduceMotion {
                playingIndicator
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, RFSpace.x32)
        .padding(.horizontal, RFSpace.x16)
        .background(RFColor.bgSunken, in: RoundedRectangle(cornerRadius: RFRadius.card))
        .accessibilityElement(children: .combine)
        // Carry the kind (cue/move) and a move's intensity into speech — the visual
        // `IntensityReadout` would otherwise be swallowed by `.combine` + this label.
        .accessibilityLabel(LiveAccessibility.nowLabel(for: frame))
        .accessibilityAddTraits(.isHeader)
    }

    /// Static "Now playing" pill — the motion-free stand-in for the beat pulse.
    private var playingIndicator: some View {
        HStack(spacing: RFSpace.x4) {
            Image(systemName: "play.fill")
                .font(.labelSmall)
            Text("Now playing")
                .font(.labelSmall)
        }
        .foregroundStyle(RFColor.brandPrimary)
        .accessibilityLabel("Now playing")
    }

    // MARK: Next card

    private var nextCard: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: RFSpace.x4) {
                Text("NEXT")
                    .font(.labelSmall)
                    .foregroundStyle(RFColor.textTertiary)
                Text(frame.next?.text ?? "End of track")
                    .font(.bodyMedium)
                    .foregroundStyle(RFColor.textPrimary)
                    .lineLimit(2)
            }
            Spacer()
            if let next = frame.next {
                Text((next.atMs - elapsedMs).durationString)
                    .font(.dataLarge)
                    .foregroundStyle(RFColor.brandPrimary)
            }
        }
        .padding(RFSpace.x16)
        .frame(maxWidth: .infinity)
        .background(RFColor.bgSunken, in: RoundedRectangle(cornerRadius: RFRadius.card))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(LiveAccessibility.nextLabel(for: frame, elapsedMs: elapsedMs))
    }

    // MARK: Track / class countdowns

    private func countdowns(_ track: RunPayload.RunTrack) -> some View {
        let start = track.startOffsetMs ?? 0
        let trackDurationMs = track.track.durationMs
        let trackEndMs = start + (trackDurationMs ?? 0)
        return HStack {
            // A track with no entered duration has no real window — don't show a 0:00.
            if trackDurationMs != nil {
                Text("Track ends in \(max(0, trackEndMs - elapsedMs).durationString)")
            } else {
                Text("No track duration set")
            }
            Spacer()
            Text("Class ends in \(max(0, classTotalMs - elapsedMs).durationString)")
        }
        .font(.dataSmall)
        .foregroundStyle(RFColor.textTertiary)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(LiveAccessibility.countdownsLabel(track, elapsedMs: elapsedMs, classTotalMs: classTotalMs))
    }
}
