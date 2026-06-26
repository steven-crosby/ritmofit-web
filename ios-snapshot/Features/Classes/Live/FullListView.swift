import SwiftUI

/// The **Full List** prompter: the whole class timeline at a glance. The live track is
/// ring-highlighted; tapping any track seeks the scrubber to its start. Past events on the
/// live track read struck-through so the eye lands on what's ahead. Intensity stays
/// redundantly encoded (bars + zone + label).
struct FullListView: View {
    let payload: RunPayload
    let liveIndex: Int?
    let elapsedMs: Int
    let onSeek: (Int) -> Void

    var body: some View {
        if payload.tracks.isEmpty {
            Text("This class has no tracks yet.")
                .font(.bodyMedium)
                .foregroundStyle(RFColor.textTertiary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(RFSpace.x48)
        } else {
            VStack(spacing: RFSpace.x12) {
                ForEach(Array(payload.tracks.enumerated()), id: \.element.classTrackId) { index, track in
                    trackCard(track, index: index)
                }
            }
            .padding(RFSpace.x24)
        }
    }

    private func trackCard(_ track: RunPayload.RunTrack, index: Int) -> some View {
        let start = track.startOffsetMs ?? 0
        let isLive = index == liveIndex
        return VStack(alignment: .leading, spacing: RFSpace.x12) {
            Button { onSeek(start) } label: {
                HStack(alignment: .top, spacing: RFSpace.x12) {
                    VStack(alignment: .leading, spacing: RFSpace.x4) {
                        Text("\(start.durationString) · #\(index + 1)")
                            .font(.dataSmall)
                            .foregroundStyle(RFColor.textTertiary)
                        Text(track.track.title)
                            .font(.titleSmall)
                            .foregroundStyle(RFColor.textPrimary)
                            .lineLimit(1)
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
                                .foregroundStyle(RFColor.textTertiary)
                        }
                    }
                }
            }
            .buttonStyle(.plain)
            // One coherent utterance in reading order, not the raw children (timecode,
            // intensity bars, BPM) in layout order.
            .accessibilityElement(children: .combine)
            .accessibilityLabel(LiveAccessibility.trackSummaryLabel(track, index: index))
            .accessibilityHint("Seeks to track \(index + 1)")

            let events = LiveTimeline.events(for: track)
            if !events.isEmpty {
                VStack(alignment: .leading, spacing: RFSpace.x4) {
                    ForEach(events) { event in
                        eventRow(event, trackStart: start, isLive: isLive)
                    }
                }
                .padding(.top, RFSpace.x4)
                .overlay(alignment: .top) {
                    Rectangle().fill(RFColor.borderSubtle).frame(height: 1)
                }
            }
        }
        .padding(RFSpace.x16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RFColor.bgSunken, in: RoundedRectangle(cornerRadius: RFRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: RFRadius.card)
                .strokeBorder(isLive ? RFColor.brandPrimary : RFColor.borderSubtle,
                              lineWidth: isLive ? 2 : 1)
        )
    }

    private func eventRow(_ event: LiveTimeline.Event, trackStart: Int, isLive: Bool) -> some View {
        let isPast = isLive && event.atMs <= elapsedMs
        return HStack(spacing: RFSpace.x8) {
            Text((event.atMs - trackStart).durationString)
                .font(.dataSmall)
                .foregroundStyle(RFColor.textTertiary)
            kindPill(event)
            Text(event.text)
                .font(.bodySmall)
                .strikethrough(isPast)
                .foregroundStyle(isPast ? RFColor.textTertiary : RFColor.textSecondary)
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(LiveAccessibility.eventLabel(event, trackStart: trackStart, isPast: isPast))
    }

    /// Kind tag — text-labelled (never color alone). A cue wears its own color when set.
    @ViewBuilder
    private func kindPill(_ event: LiveTimeline.Event) -> some View {
        let isCue = event.kind == .cue
        let cueColor = Color(cueHex: event.colorHex) ?? RFColor.brandPrimary
        Text(isCue ? "CUE" : "MOVE")
            .font(.labelSmall)
            .foregroundStyle(isCue ? RFColor.textOnAccent : RFColor.textSecondary)
            .padding(.horizontal, RFSpace.x8)
            .padding(.vertical, 2)
            .background(isCue ? cueColor : RFColor.bgOverlay, in: Capsule())
    }
}
