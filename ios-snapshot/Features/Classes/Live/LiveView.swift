import SwiftUI
import ActivityKit
import os

/// The live **prompter** — the native surface this whole app exists for. It runs the
/// hardened run-payload as a synchronized cue prompter over the class timeline; it does
/// **not** play audio (the three music rules: playback stays in the provider apps).
///
/// A single `LiveClock` drives everything: play/pause/seek/reset advance one `elapsedMs`,
/// and the prompter derives the live track, current/next cue, and the countdowns from it.
/// Two views: Cue-by-Cue (one big "Now") and Full List (the whole timeline, tap-to-seek).
/// The on-beat pulse and the All-Out drop are the next slice.
struct LiveView: View {
    private static let log = Logger(subsystem: "studio.ritmofit", category: "live")

    let payload: RunPayload
    let onExit: () -> Void

    @State private var clock: LiveClock
    @State private var mode: PrompterMode = .cue

    // iPhone-only: vertical size class is `.compact` in landscape, `.regular` in portrait.
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    private var layout: LiveLayout { LiveLayout.resolve(verticalSizeClass: verticalSizeClass) }

    init(payload: RunPayload, onExit: @escaping () -> Void) {
        self.payload = payload
        self.onExit = onExit
        _clock = State(initialValue: LiveClock(totalMs: payload.class.totalDurationMs))
    }

    enum PrompterMode: String, CaseIterable, Identifiable {
        case cue, list
        var id: String { rawValue }
        var label: String { self == .cue ? "Cue-by-Cue" : "Full List" }
    }

    private var totalMs: Int { clock.totalMs }
    private var elapsedMs: Int { clock.elapsedMs }
    private var frame: LiveTimeline.Frame { LiveTimeline(payload).frame(at: elapsedMs) }

    var body: some View {
        ZStack {
            RFColor.bgBase.ignoresSafeArea()
            if payload.isRunnable {
                switch layout {
                case .portrait:  portraitLayout
                case .landscape: landscapeLayout
                }
            } else {
                // A track-less or zero-length payload has nothing to prompt — show a
                // message state with a way out instead of blank cards + dead transport.
                emptyState
            }
        }
        // The prompter must not let the screen dim/sleep mid-class.
        .keepsScreenAwake()
        .onAppear {
            startActivity()
        }
        .onDisappear {
            endActivity()
        }
        .onChange(of: clock.isRunning) { _, _ in updateActivity() }
        .onChange(of: frame.trackIndex) { _, _ in updateActivity() }
        .onChange(of: frame.current) { oldValue, newValue in
            updateActivity()
            if let newValue, newValue != oldValue {
                LiveAccessibility.announce(newValue)
            }
        }
    }
    
    // MARK: - Live Activity Management
    
    /// Hex strings handed to the out-of-process Live Activity (which can't import the
    /// `RFColor`/`RFIntensity` tokens). Kept in lock-step with `RFIntensity.zones` so the
    /// Lock Screen / Dynamic Island reads as the same brand ramp, never an off-palette color.
    private func intensityHex(_ intensity: Intensity) -> String {
        switch intensity {
        case .none: return "#766B59"
        case .easy: return "#F7B987"
        case .mod: return "#F0975A"
        case .hard: return "#E07E3C"
        case .allOut: return "#D9483A"
        }
    }
    
    private func buildActivityState() -> RitmoFitLiveActivityAttributes.ContentState {
        guard let trackIndex = frame.trackIndex, trackIndex < payload.tracks.count else {
            return RitmoFitLiveActivityAttributes.ContentState(
                trackTitle: payload.class.title,
                cueText: "Paused",
                intensityRaw: intensityHex(.none),
                timerRange: nil
            )
        }
        
        let track = payload.tracks[trackIndex]
        let trackStart = track.startOffsetMs ?? 0
        
        let timerRange: ClosedRange<Date>?
        if let duration = track.track.durationMs {
            let remainingMs = (trackStart + duration) - elapsedMs
            if clock.isRunning && remainingMs > 0 {
                timerRange = Date()...Date().addingTimeInterval(Double(remainingMs) / 1000.0)
            } else {
                timerRange = nil
            }
        } else {
            timerRange = nil
        }
        
        let intensityRaw = intensityHex(track.intensity)
        let cueText = frame.current?.text
        
        return RitmoFitLiveActivityAttributes.ContentState(
            trackTitle: track.track.title,
            cueText: cueText,
            intensityRaw: intensityRaw,
            timerRange: timerRange
        )
    }
    
    private func startActivity() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        
        let attributes = RitmoFitLiveActivityAttributes(classTitle: payload.class.title)
        let state = buildActivityState()
        
        do {
            let _ = try Activity.request(
                attributes: attributes,
                content: ActivityContent(state: state, staleDate: nil),
                pushType: nil
            )
        } catch {
            Self.log.error("Live Activity start failed: \(String(describing: type(of: error)), privacy: .public)")
        }
    }

    private func updateActivity() {
        let content = ActivityContent(state: buildActivityState(), staleDate: nil)
        Task {
            for activity in Activity<RitmoFitLiveActivityAttributes>.activities {
                await activity.update(content)
            }
        }
    }

    private func endActivity() {
        let content = ActivityContent(state: buildActivityState(), staleDate: nil)
        Task {
            for activity in Activity<RitmoFitLiveActivityAttributes>.activities {
                await activity.end(content, dismissalPolicy: .immediate)
            }
        }
    }

    // Degenerate run-payload (no tracks / zero duration): the same shared full-screen
    // state used by the list/detail surfaces, with an Exit back to class detail.
    private var emptyState: some View {
        BrasaMessageView(
            symbol: "exclamationmark.triangle",
            title: "Can't run this class",
            message: "This class has no playable timeline yet. Add tracks on the web planner, then try again.",
            actionTitle: "Exit",
            action: onExit
        )
    }

    // Portrait: header, then the scrolling prompter, then a full-width transport bar.
    private var portraitLayout: some View {
        VStack(spacing: 0) {
            header
            hairline
            ScrollView {
                // Leave room for the toggle that overhangs the header divider.
                Spacer(minLength: RFSpace.x24)
                segmentBand
                prompter
            }
            transportBar
        }
    }

    // Landscape: a compact single-row header, then the prompter and a side transport rail.
    private var landscapeLayout: some View {
        VStack(spacing: 0) {
            landscapeHeader
            hairline
            HStack(spacing: 0) {
                ScrollView {
                    segmentBand
                    prompter
                }
                Rectangle().fill(RFColor.borderSubtle).frame(width: 1)
                transportRail
            }
        }
    }

    private var hairline: some View {
        Rectangle().fill(RFColor.borderSubtle).frame(height: 1)
    }

    // MARK: Header — title, elapsed/total timecode, view toggle, exit

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: RFSpace.x4) {
                Text(payload.class.title)
                    .font(.headlineSmall)
                    .foregroundStyle(RFColor.textPrimary)
                    .lineLimit(1)
                    .accessibilityAddTraits(.isHeader)
                Text("\(elapsedMs.durationString) / \(totalMs.durationString)")
                    .font(.dataSmall)
                    .foregroundStyle(RFColor.textTertiary)
                    .accessibilityLabel("Elapsed \(elapsedMs.durationString) of \(totalMs.durationString)")
            }
            Spacer()
            Button(action: onExit) {
                Text("Exit")
                    .font(.labelLarge)
                    .foregroundStyle(RFColor.brandPrimary)
            }
        }
        .padding(.horizontal, RFSpace.x24)
        .padding(.vertical, RFSpace.x16)
        .overlay(alignment: .bottom) { modePicker.offset(y: 22) }
    }

    private var modePicker: some View {
        Picker("Prompter view", selection: $mode) {
            ForEach(PrompterMode.allCases) { m in Text(m.label).tag(m) }
        }
        .pickerStyle(.segmented)
        .fixedSize()
    }

    // Landscape header: title + timecode, the mode toggle, and Exit all on one compact row,
    // so the prompter keeps the scarce vertical height.
    private var landscapeHeader: some View {
        HStack(spacing: RFSpace.x16) {
            VStack(alignment: .leading, spacing: RFSpace.x4) {
                Text(payload.class.title)
                    .font(.titleSmall)
                    .foregroundStyle(RFColor.textPrimary)
                    .lineLimit(1)
                    .accessibilityAddTraits(.isHeader)
                Text("\(elapsedMs.durationString) / \(totalMs.durationString)")
                    .font(.dataSmall)
                    .foregroundStyle(RFColor.textTertiary)
                    .accessibilityLabel("Elapsed \(elapsedMs.durationString) of \(totalMs.durationString)")
            }
            Spacer(minLength: RFSpace.x8)
            modePicker
            Button(action: onExit) {
                Text("Exit")
                    .font(.labelLarge)
                    .foregroundStyle(RFColor.brandPrimary)
            }
        }
        .padding(.horizontal, RFSpace.x24)
        .padding(.vertical, RFSpace.x12)
    }

    // MARK: Content — the active prompter view, axis-aware for landscape

    @ViewBuilder
    private var prompter: some View {
        switch mode {
        case .cue:
            CueByCueView(
                frame: frame, elapsedMs: elapsedMs, classTotalMs: totalMs,
                isRunning: clock.isRunning, axis: layout.prompterAxis
            )
        case .list:
            FullListView(payload: payload, liveIndex: frame.trackIndex, elapsedMs: elapsedMs, onSeek: { clock.seek(toMs: $0) })
        }
    }

    // MARK: Segment band — the class's structural shape, current section highlighted

    /// A slim, persistent band of the class's sections with the live one highlighted. This
    /// is *structural*, not motion (rhythm-system §4/§6), so it's unaffected by Reduce
    /// Motion and never pulses. Each chip is identified by icon + label first; the tint and
    /// the highlight (border + weight + dot) only reinforce it — never color alone.
    @ViewBuilder
    private var segmentBand: some View {
        if !payload.sections.isEmpty {
            let currentIndex = payload.sectionIndex(at: elapsedMs)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: RFSpace.x8) {
                    ForEach(Array(payload.sections.enumerated()), id: \.element.id) { index, section in
                        segmentChip(section, isCurrent: index == currentIndex)
                    }
                }
                .padding(.horizontal, RFSpace.x24)
            }
            .padding(.bottom, RFSpace.x8)
        }
    }

    private func segmentChip(_ section: RunPayload.Section, isCurrent: Bool) -> some View {
        HStack(spacing: RFSpace.x4) {
            Image(systemName: section.type.symbol)
            Text(section.type.label)
            if isCurrent {
                Circle()
                    .fill(section.type.tint)
                    .frame(width: 5, height: 5)
                    .accessibilityHidden(true)
            }
        }
        .font(.labelSmall.weight(isCurrent ? .semibold : .regular))
        .foregroundStyle(isCurrent ? section.type.tint : RFColor.textTertiary)
        .padding(.horizontal, RFSpace.x12)
        .padding(.vertical, RFSpace.x8)
        .background(isCurrent ? section.type.tintSubtle : RFColor.bgOverlay, in: Capsule())
        .overlay(
            Capsule().strokeBorder(section.type.tint, lineWidth: isCurrent ? 1.5 : 0)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(section.type.label)\(isCurrent ? ", current section" : "")")
    }

    // MARK: Transport — one clock: play/pause, reset, and the seek bar

    private var seekSlider: some View {
        Slider(
            value: Binding(
                get: { Double(elapsedMs) },
                set: { clock.seek(toMs: Int($0)) }
            ),
            in: 0...Double(max(1, totalMs))
        )
        .tint(RFColor.brandPrimary)
        .disabled(totalMs == 0)
        .accessibilityLabel("Seek class timeline")
        .accessibilityValue(elapsedMs.durationString)
    }

    private var resetButton: some View {
        Button { clock.reset() } label: {
            Image(systemName: "arrow.counterclockwise")
                .font(.titleMedium)
                .foregroundStyle(RFColor.textSecondary)
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Reset to start")
    }

    private var playPauseButton: some View {
        Button { clock.toggle() } label: {
            HStack(spacing: RFSpace.x8) {
                Image(systemName: clock.isRunning ? "pause.fill" : "play.fill")
                Text(clock.isRunning ? "Pause" : "Play")
            }
            .font(.labelLarge)
            .foregroundStyle(RFColor.textOnAccent)
            .frame(minWidth: 132)
            .padding(.vertical, RFSpace.x12)
            .background(RFColor.brandPrimary, in: Capsule())
        }
        .disabled(totalMs == 0)
    }

    // Portrait: full-width bar pinned under the scroll — seek over a centered Play.
    private var transportBar: some View {
        VStack(spacing: RFSpace.x12) {
            seekSlider
            HStack(spacing: RFSpace.x16) {
                resetButton
                Spacer()
                playPauseButton
                Spacer()
                // Balances the reset button so Play stays centered.
                Color.clear.frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal, RFSpace.x24)
        .padding(.top, RFSpace.x12)
        .padding(.bottom, RFSpace.x16)
        .overlay(alignment: .top) {
            Rectangle().fill(RFColor.borderSubtle).frame(height: 1)
        }
    }

    // Landscape: a side rail — Play/Pause and Reset within thumb reach, seek along the bottom.
    private var transportRail: some View {
        VStack(spacing: RFSpace.x16) {
            playPauseButton
            resetButton
            Spacer(minLength: 0)
            seekSlider
        }
        .frame(width: 240)
        .padding(.horizontal, RFSpace.x16)
        .padding(.vertical, RFSpace.x16)
    }
}

/// Lets a class be presented as a live session via `.fullScreenCover(item:)`.
extension RunPayload: Identifiable {
    public var id: String { self.class.id }
}

#if DEBUG
/// A small decoded fixture so the prompter can be rendered in Xcode Previews (the
/// authenticated end-to-end path isn't available there). Two placed tracks with cues +
/// moves; scrub the slider to watch Now/Next advance.
private let previewPayloadJSON = """
{
  "schemaVersion": 1,
  "class": { "id": "preview", "title": "Mon POWER 6/8", "template": "cycle", "targetDurationMs": 360000, "totalDurationMs": 360000 },
  "tracks": [
    {
      "classTrackId": "A", "position": 0, "displayBpm": 122, "intensity": "mod",
      "startOffsetMs": 0, "notes": null,
      "track": { "id": "ta", "title": "Baianá", "artist": "Bakermat", "durationMs": 180000, "albumArtUrl": null },
      "providerRefs": [ { "provider": "soundcloud", "providerTrackId": "sc-1", "providerUri": null } ],
      "cues": [
        { "id": "a1", "anchorMs": 30000, "beat": null, "bar": null, "text": "Add a turn of the dial", "color": "#3AC0D4" },
        { "id": "a2", "anchorMs": 90000, "beat": null, "bar": null, "text": "Out of the saddle", "color": null }
      ],
      "moves": [ { "id": "m1", "anchorMs": 30000, "name": "Standing climb", "intensity": "hard" } ]
    },
    {
      "classTrackId": "B", "position": 1, "displayBpm": 128, "intensity": "all_out",
      "startOffsetMs": 180000, "notes": "The drop",
      "track": { "id": "tb", "title": "Titanium", "artist": "David Guetta", "durationMs": 180000, "albumArtUrl": null },
      "providerRefs": [ { "provider": "spotify", "providerTrackId": "sp-1", "providerUri": null } ],
      "cues": [ { "id": "b1", "anchorMs": 20000, "beat": null, "bar": null, "text": "ALL OUT", "color": "#E5447A" } ],
      "moves": []
    }
  ],
  "sections": [
    { "type": "warm_up", "startOffsetMs": 0 },
    { "type": "sprint", "startOffsetMs": 180000 }
  ]
}
"""

#Preview("Live prompter") {
    let payload = try! JSONDecoder().decode(RunPayload.self, from: Data(previewPayloadJSON.utf8))
    return LiveView(payload: payload) {}
}
#endif
