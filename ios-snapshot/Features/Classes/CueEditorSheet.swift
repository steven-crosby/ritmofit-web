import SwiftUI

enum CueEditorMode {
    case create
    case edit(anchorMs: Int, text: String)
}

struct CueEditorSheet: View {
    let mode: CueEditorMode
    let onSave: (Int, String) async throws -> Void
    let onCancel: () -> Void

    @State private var timeString: String
    @State private var text: String
    @State private var isSaving = false
    @State private var errorMsg: String?
    @FocusState private var textFocused: Bool

    init(
        mode: CueEditorMode,
        onSave: @escaping (Int, String) async throws -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.mode = mode
        self.onSave = onSave
        self.onCancel = onCancel
        switch mode {
        case .create:
            _timeString = State(initialValue: "0:00")
            _text = State(initialValue: "")
        case let .edit(anchorMs, text):
            _timeString = State(initialValue: anchorMs.durationString)
            _text = State(initialValue: text)
        }
    }

    private var navigationTitle: String {
        switch mode {
        case .create: return "New Cue"
        case .edit: return "Edit Cue"
        }
    }

    private var isValid: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && parseTime(timeString) != nil
    }

    private func parseTime(_ str: String) -> Int? {
        let parts = str.split(separator: ":").map { String($0) }
        guard parts.count <= 2 else { return nil }
        if parts.count == 1, let s = Int(parts[0]) {
            return s * 1000
        }
        if parts.count == 2, let m = Int(parts[0]), let s = Int(parts[1]) {
            return (m * 60 + s) * 1000
        }
        return nil
    }

    var body: some View {
        NavigationStack {
            Form {
                if let errorMsg {
                    Section {
                        Text(errorMsg)
                            .font(.bodySmall)
                            .foregroundStyle(RFColor.stateDanger)
                    }
                }

                Section("Time (M:SS)") {
                    TextField("0:45", text: $timeString)
                        .keyboardType(.numbersAndPunctuation)
                        .font(.dataLarge)
                }

                Section("Cue Text") {
                    TextField("E.g. Prepare for the drop", text: $text)
                        .focused($textFocused)
                        .submitLabel(.done)
                        .font(.bodyMedium)
                }
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                    }
                    .disabled(!isValid || isSaving)
                    .font(.headline)
                    .foregroundStyle(isValid && !isSaving ? RFColor.brandPrimary : RFColor.textTertiary)
                }
            }
            .onAppear {
                if case .create = mode {
                    textFocused = true
                }
            }
        }
        .interactiveDismissDisabled(isSaving)
    }

    private func save() {
        guard let anchorMs = parseTime(timeString) else { return }
        let finalText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        
        textFocused = false
        isSaving = true
        errorMsg = nil

        Task {
            do {
                try await onSave(anchorMs, finalText)
            } catch {
                if let apiError = error as? APIError {
                    errorMsg = apiError.errorDescription
                } else {
                    errorMsg = error.localizedDescription
                }
                isSaving = false
            }
        }
    }
}
