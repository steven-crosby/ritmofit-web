import SwiftUI
import UIKit

/// Keeps the device screen awake while the modified view is on screen. The live
/// prompter is glance-at-a-distance content an instructor isn't touching, so the
/// display must not auto-dim or sleep mid-class. Disables the idle timer on appear
/// and restores it on disappear (and tracks `isActive` if it toggles).
///
/// Device-only behavior — the idle timer has no effect in the simulator, so this is a
/// human/device verification step, not a simulator one.
private struct KeepScreenAwakeModifier: ViewModifier {
    let isActive: Bool

    func body(content: Content) -> some View {
        content
            .onAppear { setIdleTimer(disabled: isActive) }
            .onDisappear { setIdleTimer(disabled: false) }
            .onChange(of: isActive) { _, newValue in setIdleTimer(disabled: newValue) }
    }

    @MainActor
    private func setIdleTimer(disabled: Bool) {
        UIApplication.shared.isIdleTimerDisabled = disabled
    }
}

extension View {
    /// Keep the screen awake while this view is visible. Pass `false` to release it
    /// without removing the view. See `KeepScreenAwakeModifier`.
    func keepsScreenAwake(_ isActive: Bool = true) -> some View {
        modifier(KeepScreenAwakeModifier(isActive: isActive))
    }
}
