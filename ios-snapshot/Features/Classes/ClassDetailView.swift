import SwiftUI
import SwiftData

/// Static **pre-flight** screen for a class: fetches the versioned run-payload
/// (`GET /api/v1/classes/:id/run-payload`) and renders the assembled timeline —
/// class header, section band, and the track list with BPM, intensity, cues, and
/// moves. This is the read-only lead-in to the live prompter (slices 6–7); there is
/// no clock and no playback here.
///
/// The run-payload is **not** cached (network DTOs render directly), so offline or a
/// failed fetch shows an error state with retry rather than stale data.
struct ClassDetailView: View {
    let auth: AuthStore
    /// The signed-in caller — scopes the cache write for the note edit.
    let userId: String
    let classId: String
    /// The list already knows the title — show it immediately, before the fetch lands.
    let title: String

    @Environment(\.modelContext) private var modelContext
    @State private var reachability = Reachability.shared

    @State private var state: LoadState = .loading
    /// The single-class detail (carries the editable note + the caller's access);
    /// best-effort, so the pre-flight still renders if only this fetch fails.
    @State private var detail: ClassDetail?
    /// Non-nil while the live prompter is presented over this pre-flight.
    @State private var liveSession: RunPayload?
    @State private var isPresentingEditor = false

    enum LoadState {
        case loading
        case loaded(RunPayload)
        case failed(String)
    }

    /// Write-through gateway for this screen's edits. Stateless — its durable state
    /// lives in SwiftData — so rebuilding it per access is fine.
    private var writeRepo: ClassWriteRepository {
        ClassWriteRepository(
            context: modelContext,
            sender: auth.api,
            queue: PendingMutationQueue(context: RitmoFitStore.outbox.mainContext, sender: auth.api)
        )
    }

    var body: some View {
        ZStack {
            RFColor.bgBase.ignoresSafeArea()
            content
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task { if case .loading = state { await load() } }
        .fullScreenCover(item: $liveSession) { payload in
            LiveView(payload: payload) { liveSession = nil }
        }
        .sheet(isPresented: $isPresentingEditor) {
            if let detail {
                ClassEditorSheet(
                    mode: .edit(title: detail.title, template: detail.template, visibility: detail.visibility),
                    onSave: { newTitle, newTemplate, newVisibility in
                        _ = try await writeRepo.updateClass(
                            classId: classId,
                            callerId: userId,
                            title: newTitle,
                            template: newTemplate,
                            visibility: newVisibility
                        )
                        // Locally update the detail state so the UI refreshes immediately
                        self.detail = ClassDetail(
                            id: detail.id,
                            title: newTitle,
                            description: detail.description,
                            template: newTemplate,
                            status: detail.status,
                            visibility: newVisibility,
                            targetDurationMs: detail.targetDurationMs,
                            accessLevel: detail.accessLevel
                        )
                        isPresentingEditor = false
                    },
                    onCancel: { isPresentingEditor = false }
                )
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch state {
        case .loading:
            ProgressView().tint(RFColor.brandPrimary)
        case let .loaded(payload):
            RunPayloadDetail(
                classId: classId,
                payload: payload,
                canEdit: detail?.canEdit == true,
                onGoLive: { liveSession = payload },
                onEdit: (detail?.canEdit == true) ? { isPresentingEditor = true } : nil,
                onUpdatePayload: updatePayload
            ) {
                if let detail, detail.canEdit {
                    ClassNotesCard(
                        initialText: detail.description ?? "",
                        isOnline: reachability.isOnline,
                        onSave: { await saveNote($0) }
                    )
                }
            }
        case let .failed(message):
            BrasaMessageView(
                symbol: "wifi.exclamationmark",
                title: "Couldn't load this class",
                message: message,
                actionTitle: "Try again"
            ) {
                state = .loading
                Task { await load() }
            }
        }
    }

    /// Persist the edited note through the write path, mapping the outcome to the
    /// card's status. Server/session errors surface; offline writes report as queued.
    private func saveNote(_ text: String) async -> ClassNotesCard.SaveResult {
        do {
            let outcome = try await writeRepo.updateDescription(classId: classId, callerId: userId, to: text)
            detail = detail.map { ClassDetail(id: $0.id, title: $0.title, description: text,
                template: $0.template, status: $0.status, visibility: $0.visibility,
                targetDurationMs: $0.targetDurationMs, accessLevel: $0.accessLevel) }
            return outcome == .queued ? .queued : .synced
        } catch APIError.unauthorized {
            auth.handleUnauthorized()
            return .failed("Your session expired. Please sign in again.")
        } catch {
            return .failed((error as? APIError)?.errorDescription ?? "Couldn't save the note.")
        }
    }

    private func load() async {
        do {
            let payload = try await auth.api.get(
                "api/v1/classes/\(classId)/run-payload", as: RunPayload.self
            )
            state = .loaded(payload)
        } catch APIError.unauthorized {
            auth.handleUnauthorized() // session died — the router bounces to sign-in
            return
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? error.localizedDescription)
            return
        }
        // Best-effort: the note editor is additive, so a failure here must not block the
        // pre-flight. Cache the authoritative detail (backend → SwiftData) when it lands.
        if let fetched = try? await auth.api.get("api/v1/classes/\(classId)", as: ClassDetail.self) {
            _ = try? writeRepo.cache(fetched, callerId: userId)
            detail = fetched
        }
    }

    private func updatePayload(with updatedTrack: RunPayload.RunTrack) {
        if case .loaded(var payload) = state {
            if let idx = payload.tracks.firstIndex(where: { $0.id == updatedTrack.id }) {
                var newTracks = payload.tracks
                newTracks[idx] = updatedTrack
                payload = RunPayload(schemaVersion: payload.schemaVersion, class: payload.class, tracks: newTracks, sections: payload.sections)
                state = .loaded(payload)
            }
        }
    }
}

// MARK: - Loaded content

private struct RunPayloadDetail<Accessory: View>: View {
    let classId: String
    let payload: RunPayload
    let canEdit: Bool
    /// Enter the live prompter for this class.
    let onGoLive: () -> Void
    /// Enter the class metadata editor (nil if caller lacks edit access).
    let onEdit: (() -> Void)?
    let onUpdatePayload: (RunPayload.RunTrack) -> Void
    /// Optional content slotted under the header (the editable note, when allowed).
    let accessory: () -> Accessory

    init(
        classId: String,
        payload: RunPayload,
        canEdit: Bool,
        onGoLive: @escaping () -> Void,
        onEdit: (() -> Void)? = nil,
        onUpdatePayload: @escaping (RunPayload.RunTrack) -> Void,
        @ViewBuilder accessory: @escaping () -> Accessory
    ) {
        self.classId = classId
        self.payload = payload
        self.canEdit = canEdit
        self.onGoLive = onGoLive
        self.onEdit = onEdit
        self.onUpdatePayload = onUpdatePayload
        self.accessory = accessory
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: RFSpace.x16) {
                header
                accessory()
                if !payload.sections.isEmpty {
                    sectionBand
                }
                tracks
            }
            .padding(RFSpace.x24)
        }
        .safeAreaInset(edge: .bottom) { goLiveBar }
    }

    /// Pinned primary action — the lead-in from pre-flight to the live prompter.
    private var goLiveBar: some View {
        Button(action: onGoLive) {
            HStack(spacing: RFSpace.x8) {
                Image(systemName: "play.fill")
                Text("Go Live")
            }
            .font(.labelLarge)
            .foregroundStyle(RFColor.textOnAccent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, RFSpace.x12)
            .background(RFColor.brandPrimary, in: RoundedRectangle(cornerRadius: RFRadius.control))
        }
        .padding(.horizontal, RFSpace.x24)
        .padding(.vertical, RFSpace.x12)
        .background(.ultraThinMaterial)
    }

    // MARK: Header — template + planned/assembled durations

    private var header: some View {
        VStack(alignment: .leading, spacing: RFSpace.x12) {
            HStack {
                if let template = payload.class.template {
                    Text(template.label.uppercased())
                        .font(.labelSmall)
                        .foregroundStyle(RFColor.brandPrimary)
                }
                Spacer()
                if let onEdit {
                    Button(action: onEdit) {
                        HStack(spacing: RFSpace.x4) {
                            Image(systemName: "pencil")
                            Text("Edit")
                        }
                        .font(.labelSmall)
                        .foregroundStyle(RFColor.brandPrimary)
                    }
                }
            }
            HStack(spacing: RFSpace.x24) {
                durationStat(label: "Total", ms: payload.class.totalDurationMs)
                if let target = payload.class.targetDurationMs {
                    durationStat(label: "Target", ms: target)
                }
                Spacer()
                Text("\(payload.tracks.count) tracks")
                    .font(.bodySmall)
                    .foregroundStyle(RFColor.textSecondary)
            }
        }
        .padding(RFSpace.x16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RFColor.bgRaised, in: RoundedRectangle(cornerRadius: RFRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: RFRadius.card).strokeBorder(RFColor.borderSubtle)
        )
    }

    private func durationStat(label: String, ms: Int) -> some View {
        VStack(alignment: .leading, spacing: RFSpace.x4) {
            Text(label.uppercased())
                .font(.labelSmall)
                .foregroundStyle(RFColor.textTertiary)
            Text(ms.durationString) // timecode → Martian Mono data face
                .font(.dataLarge)
                .foregroundStyle(RFColor.textPrimary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label) \(ms.durationString)")
    }

    // MARK: Section band

    private var sectionBand: some View {
        VStack(alignment: .leading, spacing: RFSpace.x8) {
            Text("Sections")
                .font(.labelMedium)
                .foregroundStyle(RFColor.textSecondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: RFSpace.x8) {
                    ForEach(payload.sections) { section in
                        sectionChip(section)
                    }
                }
            }
        }
    }

    private func sectionChip(_ section: RunPayload.Section) -> some View {
        HStack(spacing: RFSpace.x4) {
            Image(systemName: section.type.symbol)
            Text(section.type.label)
            Text(section.startOffsetMs.durationString)
                .font(.dataSmall)
                .foregroundStyle(RFColor.textTertiary)
        }
        .font(.labelSmall)
        .foregroundStyle(section.type.tint)
        .padding(.horizontal, RFSpace.x12)
        .padding(.vertical, RFSpace.x8)
        .background(section.type.tintSubtle, in: Capsule())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(section.type.label) at \(section.startOffsetMs.durationString)")
    }

    // MARK: Track list

    private var tracks: some View {
        VStack(alignment: .leading, spacing: RFSpace.x12) {
            Text("Tracks")
                .font(.labelMedium)
                .foregroundStyle(RFColor.textSecondary)
            ForEach(payload.tracks) { track in
                TrackRow(classId: classId, track: track, canEdit: canEdit, onUpdate: onUpdatePayload)
            }
        }
    }
}

// MARK: - Track row

private struct TrackRow: View {
    let classId: String
    let track: RunPayload.RunTrack
    let canEdit: Bool
    let onUpdate: (RunPayload.RunTrack) -> Void

    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationLink(destination: TrackDetailView(classId: classId, track: track, canEdit: canEdit, onUpdate: onUpdate)) {
            VStack(alignment: .leading, spacing: RFSpace.x12) {
            HStack(alignment: .top, spacing: RFSpace.x12) {
                Text(String(format: "%02d", track.position + 1)) // 1-based for the room
                    .font(.data)
                    .foregroundStyle(RFColor.textTertiary)
                VStack(alignment: .leading, spacing: RFSpace.x4) {
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
                bpm
            }

            IntensityReadout(intensity: track.intensity)

            if let notes = track.notes, !notes.isEmpty {
                Text(notes)
                    .font(.bodySmall)
                    .foregroundStyle(RFColor.textSecondary)
            }

            metaRow
        }
        .padding(RFSpace.x16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RFColor.bgRaised, in: RoundedRectangle(cornerRadius: RFRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: RFRadius.card).strokeBorder(RFColor.borderSubtle)
        )
        }
        .buttonStyle(.plain)
    }

    private var bpm: some View {
        VStack(alignment: .trailing, spacing: 0) {
            Text(track.displayBpm.map(String.init) ?? "—")
                .font(.dataLarge)
                .foregroundStyle(RFColor.textPrimary)
            Text("BPM")
                .font(.labelSmall)
                .foregroundStyle(RFColor.textTertiary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(track.displayBpm.map { "\($0) BPM" } ?? "BPM not set")
    }

    /// Track duration + cue/move/provider counts — the room-prep glance.
    private var metaRow: some View {
        HStack(spacing: RFSpace.x16) {
            if let durationMs = track.track.durationMs {
                metaItem(symbol: "clock", text: durationMs.durationString, isData: true)
            }
            if !track.cues.isEmpty {
                metaItem(symbol: "text.bubble", text: "\(track.cues.count)")
            }
            if !track.moves.isEmpty {
                metaItem(symbol: "figure.run", text: "\(track.moves.count)")
            }
            Spacer()
            ForEach(track.providerRefs, id: \.providerTrackId) { ref in
                providerMark(ref)
            }
        }
        .foregroundStyle(RFColor.textSecondary)
    }

    /// One provider reference: a **handoff** chip that opens the track in the provider app
    /// when a URL resolves, or the plain (non-interactive) mark otherwise. The chip carries
    /// icon **and** provider name plus the cyan interactive channel — redundant signal, so
    /// "you can tap this" never rides on color alone. Opening hands off to the provider app;
    /// no in-app playback.
    @ViewBuilder
    private func providerMark(_ ref: RunPayload.ProviderRef) -> some View {
        if let url = ref.handoffURL {
            Button {
                openURL(url)
            } label: {
                HStack(spacing: RFSpace.x4) {
                    Image(systemName: ref.provider.symbol)
                    Text(ref.provider.label)
                }
                .font(.labelSmall)
            }
            .buttonStyle(.plain)
            .foregroundStyle(RFColor.interactive)
            .accessibilityLabel("Open in \(ref.provider.label)")
            .accessibilityAddTraits(.isLink)
        } else {
            Image(systemName: ref.provider.symbol)
                .font(.labelSmall)
                .foregroundStyle(RFColor.textTertiary)
                .accessibilityLabel(ref.provider.label)
        }
    }

    private func metaItem(symbol: String, text: String, isData: Bool = false) -> some View {
        HStack(spacing: RFSpace.x4) {
            Image(systemName: symbol)
            Text(text).font(isData ? .dataSmall : .labelSmall)
        }
        .font(.labelSmall)
        .foregroundStyle(RFColor.textSecondary)
        .accessibilityElement(children: .combine)
    }
}

// Section tint/tintSubtle live in `Core/DesignSystem/SectionType+Style.swift` (shared with
// the Live segment band).

// MARK: - Class notes editor (the slice-10 write surface)

/// Inline editor for a class's free-text note — the single user-facing write behind the
/// offline write path. Owns its draft; `onSave` performs the UI → SwiftData → backend
/// write and reports back whether it synced or was queued offline (redundant icon+text,
/// never color alone).
private struct ClassNotesCard: View {
    let initialText: String
    let isOnline: Bool
    let onSave: (String) async -> SaveResult

    /// Outcome the parent reports back from the write path.
    enum SaveResult: Equatable { case synced, queued, failed(String) }

    @State private var draft: String
    /// The last persisted value — drives the dirty check so Save hides after a save.
    @State private var baseline: String
    @State private var status: Status = .idle
    @FocusState private var focused: Bool

    enum Status: Equatable { case idle, saving, synced, queued, failed(String) }

    init(initialText: String, isOnline: Bool, onSave: @escaping (String) async -> SaveResult) {
        self.initialText = initialText
        self.isOnline = isOnline
        self.onSave = onSave
        _draft = State(initialValue: initialText)
        _baseline = State(initialValue: initialText)
    }

    private var isDirty: Bool { draft != baseline }

    var body: some View {
        VStack(alignment: .leading, spacing: RFSpace.x8) {
            HStack {
                Text("Class notes")
                    .font(.labelMedium)
                    .foregroundStyle(RFColor.textSecondary)
                Spacer()
                statusBadge
            }
            TextField("Add a note for this class…", text: $draft, axis: .vertical)
                .lineLimit(2...5)
                .font(.bodyMedium)
                .foregroundStyle(RFColor.textPrimary)
                .focused($focused)
                .onChange(of: draft) { if status != .saving { status = .idle } }
            if isDirty {
                Button(action: save) {
                    Text(status == .saving ? "Saving…" : "Save note")
                        .font(.labelLarge)
                        .foregroundStyle(RFColor.textOnAccent)
                        .padding(.horizontal, RFSpace.x16)
                        .padding(.vertical, RFSpace.x8)
                        .background(RFColor.brandPrimary, in: RoundedRectangle(cornerRadius: RFRadius.control))
                }
                .disabled(status == .saving)
            }
        }
        .padding(RFSpace.x16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RFColor.bgRaised, in: RoundedRectangle(cornerRadius: RFRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: RFRadius.card).strokeBorder(RFColor.borderSubtle)
        )
    }

    @ViewBuilder
    private var statusBadge: some View {
        switch status {
        case .idle:
            if !isOnline {
                badge(symbol: "wifi.slash", text: "Offline", tint: RFColor.textTertiary)
            }
        case .saving:
            ProgressView().controlSize(.small).tint(RFColor.brandPrimary)
        case .synced:
            badge(symbol: "checkmark.circle.fill", text: "Saved", tint: RFColor.brandPrimary)
        case .queued:
            badge(symbol: "icloud.slash", text: "Saved offline — will sync", tint: RFColor.textSecondary)
        case let .failed(message):
            badge(symbol: "exclamationmark.triangle.fill", text: message, tint: RFColor.textSecondary)
        }
    }

    private func badge(symbol: String, text: String, tint: Color) -> some View {
        HStack(spacing: RFSpace.x4) {
            Image(systemName: symbol)
            Text(text)
        }
        .font(.labelSmall)
        .foregroundStyle(tint)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(text)
    }

    private func save() {
        focused = false
        status = .saving
        let value = draft
        Task {
            switch await onSave(value) {
            case .synced:
                baseline = value
                status = .synced
            case .queued:
                baseline = value
                status = .queued
            case let .failed(message):
                status = .failed(message)
            }
        }
    }
}
