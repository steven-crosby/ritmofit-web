import SwiftUI

enum ClassEditorMode {
    case create
    case edit(title: String, template: String?, visibility: String)
}

/// A reusable sheet for creating a new class or editing an existing class's metadata.
struct ClassEditorSheet: View {
    let mode: ClassEditorMode
    let onSave: (String, String?, String) async throws -> Void
    let onCancel: () -> Void

    @State private var title: String
    @State private var templateRaw: String
    @State private var visibility: String
    @State private var isSaving = false
    @State private var errorMsg: String?
    @FocusState private var titleFocused: Bool

    // Known templates for the picker
    private let knownTemplates = ["cycle", "hiit", "sculpt", "tread"]

    init(
        mode: ClassEditorMode,
        onSave: @escaping (String, String?, String) async throws -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.mode = mode
        self.onSave = onSave
        self.onCancel = onCancel
        switch mode {
        case .create:
            _title = State(initialValue: "")
            _templateRaw = State(initialValue: "none")
            _visibility = State(initialValue: "private")
        case let .edit(t, temp, v):
            _title = State(initialValue: t)
            _templateRaw = State(initialValue: temp ?? "none")
            _visibility = State(initialValue: v)
        }
    }

    private var navigationTitle: String {
        switch mode {
        case .create: return "New Class"
        case .edit: return "Edit Class"
        }
    }

    private var saveButtonTitle: String {
        switch mode {
        case .create: return "Create"
        case .edit: return "Save"
        }
    }

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
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

                Section("Class Title") {
                    TextField("E.g. Monday HIIT", text: $title)
                        .focused($titleFocused)
                        .submitLabel(.done)
                        .font(.titleLarge)
                }

                Section("Details") {
                    Picker("Template", selection: $templateRaw) {
                        Text("None").tag("none")
                        ForEach(knownTemplates, id: \.self) { t in
                            Text(t.prefix(1).uppercased() + t.dropFirst()).tag(t)
                        }
                    }

                    Picker("Visibility", selection: $visibility) {
                        Text("Private").tag("private")
                        Text("Public").tag("public")
                    }
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
                    Button(saveButtonTitle) {
                        save()
                    }
                    .disabled(!isValid || isSaving)
                    .font(.headline)
                    .foregroundStyle(isValid && !isSaving ? RFColor.brandPrimary : RFColor.textTertiary)
                }
            }
            .onAppear {
                if case .create = mode {
                    titleFocused = true
                }
            }
        }
        .interactiveDismissDisabled(isSaving)
    }

    private func save() {
        titleFocused = false
        isSaving = true
        errorMsg = nil

        Task {
            let finalTemplate = templateRaw == "none" ? nil : templateRaw
            let finalTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
            do {
                try await onSave(finalTitle, finalTemplate, visibility)
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
