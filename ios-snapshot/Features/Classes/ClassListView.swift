import SwiftUI
import SwiftData

/// The caller's classes — **cache-first**: the list reads the SwiftData cache via
/// `@Query`, while a refresh reconciles `GET /api/v1/classes` into that cache
/// (backend → SwiftData → UI). Cached classes stay visible offline.
struct ClassListView: View {
    let auth: AuthStore
    let user: UserProfile

    @Environment(\.modelContext) private var context
    @Query private var cached: [CachedClass]
    private let reachability = Reachability.shared

    @State private var isRefreshing = false
    @State private var loadError: String?
    @State private var didAttempt = false
    @State private var isPresentingCreator = false

    init(auth: AuthStore, user: UserProfile) {
        self.auth = auth
        self.user = user
        let callerId = user.id
        _cached = Query(
            filter: #Predicate<CachedClass> { $0.cacheOwnerId == callerId },
            sort: \.title
        )
    }

    private var repository: ClassRepository { ClassRepository(context: context, api: auth.api) }
    private var items: [ClassSummary] { cached.map(\.summary) }

    var body: some View {
        NavigationStack {
            ZStack {
                RFColor.bgBase.ignoresSafeArea()
                VStack(spacing: 0) {
                    topBar
                    content
                }
            }
            .toolbar(.hidden, for: .navigationBar) // the list keeps its custom top bar
            .navigationDestination(for: ClassSummary.self) { summary in
                ClassDetailView(auth: auth, userId: user.id, classId: summary.id, title: summary.title)
            }
        }
        .task { if !didAttempt { await refresh(auto: true) } }
        .sheet(isPresented: $isPresentingCreator) {
            ClassEditorSheet(
                mode: .create,
                onSave: { title, template, visibility in
                    let repo = ClassWriteRepository(context: context, sender: auth.api, queue: PendingMutationQueue(context: RitmoFitStore.outbox.mainContext, sender: auth.api))
                    _ = try await repo.createClass(callerId: user.id, title: title, template: template, visibility: visibility)
                    isPresentingCreator = false
                },
                onCancel: { isPresentingCreator = false }
            )
        }
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: RFSpace.x4) {
                Text("Your classes")
                    .font(.headlineSmall)
                    .foregroundStyle(RFColor.textPrimary)
                Text(user.shortName)
                    .font(.bodySmall)
                    .foregroundStyle(RFColor.textSecondary)
            }
            Spacer()
            HStack(spacing: RFSpace.x16) {
                Button {
                    isPresentingCreator = true
                } label: {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundStyle(RFColor.brandPrimary)
                }
                
                Button {
                    Task {
                        try? repository.clear(callerId: user.id) // forget this account's cache
                        await auth.signOut()
                    }
                } label: {
                    Text("Sign out")
                        .font(.labelLarge)
                        .foregroundStyle(RFColor.brandPrimary)
                }
                .disabled(auth.isWorking)
            }
        }
        .padding(.horizontal, RFSpace.x24)
        .padding(.vertical, RFSpace.x16)
        .overlay(alignment: .bottom) {
            Rectangle().fill(RFColor.borderSubtle).frame(height: 1)
        }
    }

    // MARK: - Content (cache-first)

    @ViewBuilder
    private var content: some View {
        if !items.isEmpty {
            ScrollView {
                statusBanner
                LazyVStack(spacing: RFSpace.x12) {
                    ForEach(items) { summary in
                        if summary.accessLevel == "none" {
                            ClassRow(summary: summary) // no access → not openable
                        } else {
                            NavigationLink(value: summary) {
                                ClassRow(summary: summary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(RFSpace.x24)
            }
            .refreshable { await refresh() }
        } else if isRefreshing || !didAttempt {
            centered { ProgressView().tint(RFColor.brandPrimary) }
        } else if let loadError {
            BrasaMessageView(
                symbol: "wifi.exclamationmark",
                title: "Couldn't load classes",
                message: loadError,
                actionTitle: "Try again"
            ) { Task { await refresh() } }
        } else {
            BrasaMessageView(
                symbol: "music.note.list",
                title: "No classes yet",
                message: "Classes you build on the web app will show up here."
            )
        }
    }

    /// Non-blocking status over cached content: offline, or a failed refresh.
    @ViewBuilder
    private var statusBanner: some View {
        if !reachability.isOnline {
            banner(symbol: "wifi.slash", text: "Offline — showing saved classes", tint: RFColor.textSecondary)
        } else if let loadError {
            banner(symbol: "exclamationmark.triangle.fill", text: loadError, tint: RFColor.stateDanger)
        }
    }

    private func banner(symbol: String, text: String, tint: Color) -> some View {
        HStack(spacing: RFSpace.x8) {
            Image(systemName: symbol)
            Text(text).frame(maxWidth: .infinity, alignment: .leading)
        }
        .font(.bodySmall)
        .foregroundStyle(tint)
        .padding(.horizontal, RFSpace.x24)
        .padding(.vertical, RFSpace.x8)
        .accessibilityElement(children: .combine)
    }

    private func centered<V: View>(@ViewBuilder _ content: () -> V) -> some View {
        VStack { Spacer(); content(); Spacer() }.frame(maxWidth: .infinity)
    }

    // MARK: - Refresh

    private func refresh(auto: Bool = false) async {
        // On the initial auto-load while offline, just show whatever is cached.
        if auto && !reachability.isOnline {
            didAttempt = true
            return
        }
        isRefreshing = true
        loadError = nil
        do {
            try await repository.refresh(callerId: user.id)
        } catch APIError.unauthorized {
            try? repository.clear(callerId: user.id)
            auth.handleUnauthorized() // session died — bounce to sign-in
        } catch {
            loadError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        isRefreshing = false
        didAttempt = true
    }
}

/// One class summary card — title + template/timecode + redundant-encoded access badge.
private struct ClassRow: View {
    let summary: ClassSummary

    var body: some View {
        HStack(spacing: RFSpace.x12) {
            VStack(alignment: .leading, spacing: RFSpace.x4) {
                Text(summary.title)
                    .font(.titleSmall)
                    .foregroundStyle(RFColor.textPrimary)
                    .lineLimit(1)
                HStack(spacing: RFSpace.x8) {
                    if let templateLabel = summary.templateLabel {
                        Text(templateLabel)
                            .font(.bodySmall)
                            .foregroundStyle(RFColor.textSecondary)
                    }
                    if let target = summary.targetDurationMs {
                        Text(target.durationString) // timecode → Martian Mono data face
                            .font(.dataSmall)
                            .foregroundStyle(RFColor.textTertiary)
                    }
                }
            }
            Spacer()
            accessBadge
        }
        .padding(RFSpace.x16)
        .background(RFColor.bgRaised, in: RoundedRectangle(cornerRadius: RFRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: RFRadius.card)
                .strokeBorder(RFColor.borderSubtle)
        )
    }

    private var accessBadge: some View {
        HStack(spacing: RFSpace.x4) {
            Image(systemName: summary.accessSymbol)
            Text(summary.accessLabel)
        }
        .font(.labelSmall)
        .foregroundStyle(RFColor.textSecondary)
        .padding(.horizontal, RFSpace.x8)
        .padding(.vertical, RFSpace.x4)
        .background(RFColor.bgOverlay, in: Capsule())
        .accessibilityElement(children: .combine)
    }
}
