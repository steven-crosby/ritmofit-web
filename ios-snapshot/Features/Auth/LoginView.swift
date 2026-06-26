import SwiftUI
import AuthenticationServices

/// Email/password sign-in + account creation against Better Auth, plus native
/// Sign in with Apple (the `applesignin` entitlement is configured).
struct LoginView: View {
    let auth: AuthStore

    private enum Mode: String, CaseIterable {
        case signIn = "Sign in"
        case signUp = "Create account"
    }

    @State private var mode: Mode = .signIn
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    /// The raw nonce for the in-flight Apple request; its SHA-256 went to Apple.
    @State private var appleNonce: String?
    @FocusState private var focused: Field?

    private enum Field { case name, email, password }

    private var canSubmit: Bool {
        guard !auth.isWorking else { return false }
        let hasCredentials = !email.trimmingCharacters(in: .whitespaces).isEmpty && password.count >= 8
        return mode == .signIn ? hasCredentials : hasCredentials && !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        ZStack {
            RFColor.bgBase.ignoresSafeArea()

            ScrollView {
                VStack(spacing: RFSpace.x24) {
                    header

                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    VStack(spacing: RFSpace.x12) {
                        if mode == .signUp {
                            field("Name", text: $name, field: .name)
                                .textContentType(.name)
                        }
                        field("Email", text: $email, field: .email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        field("Password (8+ characters)", text: $password, field: .password, secure: true)
                            .textContentType(mode == .signIn ? .password : .newPassword)
                    }

                    if let errorMessage = auth.errorMessage {
                        errorBanner(errorMessage)
                    }

                    submitButton
                    orDivider
                    appleButton
                    backendNote
                }
                .padding(RFSpace.x24)
                .frame(maxWidth: 480)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .animation(.easeInOut(duration: RFMotion.fast), value: mode)
        .animation(.easeInOut(duration: RFMotion.fast), value: auth.errorMessage)
    }

    // MARK: - Pieces

    private var header: some View {
        VStack(spacing: RFSpace.x8) {
            Text("RitmoFit")
                .font(.displayLarge)
                .foregroundStyle(RFColor.textPrimary)
            Text("Run the room.")
                .font(.bodyMedium)
                .foregroundStyle(RFColor.textSecondary)
        }
        .padding(.top, RFSpace.x48)
        .padding(.bottom, RFSpace.x12)
    }

    private func field(_ label: String, text: Binding<String>, field: Field, secure: Bool = false) -> some View {
        Group {
            if secure {
                SecureField(label, text: text)
            } else {
                TextField(label, text: text)
            }
        }
        .focused($focused, equals: field)
        .font(.bodyMedium)
        .foregroundStyle(RFColor.textPrimary)
        .padding(RFSpace.x12)
        .background(RFColor.bgRaised, in: RoundedRectangle(cornerRadius: RFRadius.input))
        .overlay(
            RoundedRectangle(cornerRadius: RFRadius.input)
                // Focus = the cyan interactive channel (tokens focus-ring).
                .strokeBorder(focused == field ? RFColor.focusRing : RFColor.borderSubtle)
        )
        .submitLabel(.next)
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: RFSpace.x8) {
            Image(systemName: "exclamationmark.triangle.fill")
            Text(message)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .font(.bodySmall)
        .foregroundStyle(RFColor.stateDanger)
        .padding(RFSpace.x12)
        .background(RFColor.stateDanger.opacity(0.15), in: RoundedRectangle(cornerRadius: RFRadius.control))
        .accessibilityElement(children: .combine)
    }

    private var submitButton: some View {
        Button(action: submit) {
            HStack(spacing: RFSpace.x8) {
                if auth.isWorking { ProgressView().tint(RFColor.textPrimary) }
                Text(mode.rawValue)
                    .font(.titleMedium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, RFSpace.x12)
        }
        .foregroundStyle(canSubmit ? RFColor.textPrimary : RFColorPrimitive.bone500)
        .background(
            (canSubmit ? RFColor.brandPrimary : RFColor.bgRaised),
            in: RoundedRectangle(cornerRadius: RFRadius.control)
        )
        .disabled(!canSubmit)
    }

    private var orDivider: some View {
        HStack(spacing: RFSpace.x12) {
            Rectangle().fill(RFColor.borderSubtle).frame(height: 1)
            Text("or")
                .font(.labelSmall)
                .foregroundStyle(RFColor.textTertiary)
            Rectangle().fill(RFColor.borderSubtle).frame(height: 1)
        }
        .accessibilityHidden(true)
    }

    private var appleButton: some View {
        // Dark-only app surface → the white Apple mark per Apple's HIG.
        SignInWithAppleButton(.signIn) { request in
            let raw = AppleSignIn.randomNonce()
            appleNonce = raw
            request.requestedScopes = [.fullName, .email]
            request.nonce = AppleSignIn.sha256Hex(raw)
        } onCompletion: { result in
            handleAppleCompletion(result)
        }
        .signInWithAppleButtonStyle(.white)
        .frame(height: 48)
        .clipShape(RoundedRectangle(cornerRadius: RFRadius.control))
        .disabled(auth.isWorking)
    }

    private var backendNote: some View {
        Text("Connecting to \(auth.api.baseURL.host() ?? auth.api.baseURL.absoluteString)")
            .font(.labelSmall)
            .foregroundStyle(RFColor.textTertiary)
            .padding(.top, RFSpace.x8)
    }

    private func handleAppleCompletion(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case let .success(authorization):
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let token = String(data: tokenData, encoding: .utf8),
                let rawNonce = appleNonce
            else {
                auth.reportAppleSignInFailure("Apple sign-in didn't return a valid token. Please try again.")
                return
            }
            Task { await auth.signInWithApple(idToken: token, rawNonce: rawNonce) }
        case let .failure(error):
            // A user-cancelled sheet isn't an error worth surfacing.
            if let authError = error as? ASAuthorizationError, authError.code == .canceled { return }
            auth.reportAppleSignInFailure(error.localizedDescription)
        }
    }

    private func submit() {
        focused = nil
        Task {
            switch mode {
            case .signIn:
                await auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
            case .signUp:
                await auth.signUp(
                    name: name.trimmingCharacters(in: .whitespaces),
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password
                )
            }
        }
    }
}
