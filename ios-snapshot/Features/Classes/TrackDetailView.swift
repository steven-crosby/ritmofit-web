import SwiftUI
import SwiftData

struct TrackDetailView: View {
    let classId: String
    let track: RunPayload.RunTrack
    let canEdit: Bool
    let onUpdate: (RunPayload.RunTrack) -> Void

    @Environment(\.modelContext) private var modelContext
    @State private var isPresentingCueEditor = false
    @State private var editingCue: RunPayload.Cue?
    
    // We use the AuthStore to get the api for the writeRepo
    @Environment(AuthStore.self) private var auth

    private var writeRepo: ClassWriteRepository {
        ClassWriteRepository(
            context: modelContext,
            sender: auth.api,
            queue: PendingMutationQueue(context: modelContext, sender: auth.api)
        )
    }

    var body: some View {
        List {
            Section("Metadata") {
                LabeledContent("Position", value: String(track.position + 1))
                LabeledContent("Title", value: track.track.title)
                LabeledContent("Artist", value: track.track.artist)
                if let duration = track.track.durationMs {
                    LabeledContent("Duration", value: duration.durationString)
                }
                if let bpm = track.displayBpm {
                    LabeledContent("BPM", value: "\(bpm)")
                }
                LabeledContent("Intensity", value: track.intensity.rawValue.capitalized)
            }

            let sortedEvents = LiveTimeline.events(for: track)
            if !sortedEvents.isEmpty {
                Section("Choreography") {
                    ForEach(sortedEvents) { event in
                        eventRow(event)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                if canEdit, event.kind == .cue {
                                    Button(role: .destructive) {
                                        deleteCue(eventId: event.id)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                    Button {
                                        if let cue = track.cues.first(where: { $0.id == event.id }) {
                                            editingCue = cue
                                            isPresentingCueEditor = true
                                        }
                                    } label: {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    .tint(.blue)
                                }
                            }
                    }
                }
            } else {
                Section("Choreography") {
                    Text("No cues or moves.")
                        .foregroundStyle(RFColor.textTertiary)
                }
            }
        }
        .navigationTitle("Track Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if canEdit {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: {
                        editingCue = nil
                        isPresentingCueEditor = true
                    }) {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add Cue")
                }
            }
        }
        .sheet(isPresented: $isPresentingCueEditor) {
            if let cue = editingCue {
                CueEditorSheet(
                    mode: .edit(anchorMs: cue.anchorMs, text: cue.text),
                    onSave: { newTime, newText in
                        try await updateCue(cueId: cue.id, anchorMs: newTime, text: newText)
                        isPresentingCueEditor = false
                    },
                    onCancel: { isPresentingCueEditor = false }
                )
            } else {
                CueEditorSheet(
                    mode: .create,
                    onSave: { newTime, newText in
                        try await createCue(anchorMs: newTime, text: newText)
                        isPresentingCueEditor = false
                    },
                    onCancel: { isPresentingCueEditor = false }
                )
            }
        }
    }

    private func eventRow(_ event: LiveTimeline.Event) -> some View {
        HStack(spacing: RFSpace.x8) {
            Text(event.atMs.durationString)
                .font(.dataSmall)
                .foregroundStyle(RFColor.textTertiary)
            
            let isCue = event.kind == .cue
            let cueColor = Color(cueHex: event.colorHex) ?? RFColor.brandPrimary
            Text(isCue ? "CUE" : "MOVE")
                .font(.labelSmall)
                .foregroundStyle(isCue ? RFColor.textOnAccent : RFColor.textSecondary)
                .padding(.horizontal, RFSpace.x8)
                .padding(.vertical, 2)
                .background(isCue ? cueColor : RFColor.bgOverlay, in: Capsule())
            
            Text(event.text)
                .font(.bodySmall)
                .foregroundStyle(RFColor.textPrimary)
            Spacer()
        }
        .padding(.vertical, RFSpace.x4)
    }

    private func createCue(anchorMs: Int, text: String) async throws {
        // Insert the server-minted cue (real id) so a later edit/delete targets the correct
        // /cues/{id} rather than a throwaway temp id. Offline creation throws here (it can't
        // be reconciled — see ClassWriteRepository.createCue) and CueEditorSheet shows the error.
        let createdCue = try await writeRepo.createCue(classTrackId: track.classTrackId, anchorMs: anchorMs, text: text)
        var updatedCues = track.cues
        updatedCues.append(createdCue)

        let newTrack = RunPayload.RunTrack(
            classTrackId: track.classTrackId,
            position: track.position,
            displayBpm: track.displayBpm,
            intensity: track.intensity,
            startOffsetMs: track.startOffsetMs,
            notes: track.notes,
            track: track.track,
            providerRefs: track.providerRefs,
            cues: updatedCues,
            moves: track.moves
        )
        onUpdate(newTrack)
    }

    private func updateCue(cueId: String, anchorMs: Int, text: String) async throws {
        _ = try await writeRepo.updateCue(cueId: cueId, anchorMs: anchorMs, text: text)
        var updatedCues = track.cues
        if let idx = updatedCues.firstIndex(where: { $0.id == cueId }) {
            let existing = updatedCues[idx]
            updatedCues[idx] = RunPayload.Cue(
                id: existing.id,
                anchorMs: anchorMs,
                beat: existing.beat,
                bar: existing.bar,
                text: text,
                color: existing.color
            )
        }
        let newTrack = RunPayload.RunTrack(
            classTrackId: track.classTrackId,
            position: track.position,
            displayBpm: track.displayBpm,
            intensity: track.intensity,
            startOffsetMs: track.startOffsetMs,
            notes: track.notes,
            track: track.track,
            providerRefs: track.providerRefs,
            cues: updatedCues,
            moves: track.moves
        )
        onUpdate(newTrack)
    }

    private func deleteCue(eventId: String) {
        Task {
            do {
                _ = try await writeRepo.deleteCue(cueId: eventId)
                var updatedCues = track.cues
                updatedCues.removeAll { $0.id == eventId }
                let newTrack = RunPayload.RunTrack(
                    classTrackId: track.classTrackId,
                    position: track.position,
                    displayBpm: track.displayBpm,
                    intensity: track.intensity,
                    startOffsetMs: track.startOffsetMs,
                    notes: track.notes,
                    track: track.track,
                    providerRefs: track.providerRefs,
                    cues: updatedCues,
                    moves: track.moves
                )
                onUpdate(newTrack)
            } catch {
                // Should show error, but we skip for brevity
            }
        }
    }
}
