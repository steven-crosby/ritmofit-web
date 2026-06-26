import SwiftUI

/// Which prompter layout to render. This is iPhone-only, so the **vertical** size class is
/// a clean orientation signal: iPhone reports `.compact` vertically in landscape and
/// `.regular` in portrait. Selecting off the size class (rather than reading device
/// orientation) means the layout follows the actual rotation the app is allowed to take,
/// with no scene/AppDelegate machinery. Pure + value-typed so it's unit-testable.
enum LiveLayout: Equatable {
    case portrait
    case landscape

    /// iPhone reports a `.compact` vertical size class only in landscape.
    static func resolve(verticalSizeClass: UserInterfaceSizeClass?) -> LiveLayout {
        verticalSizeClass == .compact ? .landscape : .portrait
    }

    /// Cue-by-Cue places Now and Next side-by-side in landscape to use the width.
    var prompterAxis: Axis {
        self == .landscape ? .horizontal : .vertical
    }
}
