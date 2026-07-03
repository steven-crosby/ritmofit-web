// RFTokens.swift
// GENERATED from tokens.json by scripts/build-tokens-ios.mjs — do not edit by hand.
// Single source of truth shared with web (mockups/theme.css). Re-run the emitter
// after changing tokens.json. Requires a `Color(hex:)` initializer in the host app.

import SwiftUI

/// Raw palette. Prefer the semantic RFColor roles below in product code.
enum RFColorPrimitive {
    static let ink500 = Color(hex: "4A3F30")
    static let ink600 = Color(hex: "322A20")
    static let ink700 = Color(hex: "241F18")
    static let ink800 = Color(hex: "1A1712")
    static let ink850 = Color(hex: "12100C")
    static let ink900 = Color(hex: "050403")
    static let ink950 = Color(hex: "020201")
    static let bone0 = Color(hex: "FFFDF9")
    static let bone50 = Color(hex: "FBF7F0")
    static let bone100 = Color(hex: "F3EDE2")
    static let bone200 = Color(hex: "E4DBCB")
    static let bone300 = Color(hex: "C9BEAA")
    static let bone400 = Color(hex: "9E927E")
    static let bone500 = Color(hex: "766B59")
    static let copper200 = Color(hex: "F7B987")
    static let copper300 = Color(hex: "F0975A")
    static let copper400 = Color(hex: "E07E3C")
    static let copper500 = Color(hex: "C8682A")
    static let copper600 = Color(hex: "A8521C")
    static let copper700 = Color(hex: "7A3B12")
    static let ember400 = Color(hex: "E8654F")
    static let ember500 = Color(hex: "D9483A")
    static let ember600 = Color(hex: "B83A2B")
    static let cyan300 = Color(hex: "74D6E5")
    static let cyan400 = Color(hex: "3AC0D4")
    static let cyan500 = Color(hex: "17A2B8")
    static let cyan600 = Color(hex: "0E7C8C")
    static let cyan700 = Color(hex: "0C6B7A")
    static let plasma400 = Color(hex: "FF6AAE")
    static let plasma500 = Color(hex: "FF2E88")
    static let plasma600 = Color(hex: "D11A68")
    static let amber400 = Color(hex: "F2B838")
    static let amber500 = Color(hex: "E8A317")
    static let amber600 = Color(hex: "B5790F")
    static let violet400 = Color(hex: "8678AD")
    static let violet500 = Color(hex: "6B5B95")
}

/// Semantic color roles. copper = identity, cyan = interaction, plasma = peak affect.
/// RFColor is the default (dark). Adopt RFColorLight explicitly for the opt-in light theme.
enum RFColor {
    static let bgBase = Color(hex: "050403")
    static let bgRaised = Color(hex: "1A1712")
    static let bgOverlay = Color(hex: "241F18")
    static let bgSunken = Color(hex: "12100C")
    static let bgLive = Color(hex: "020201")
    static let textPrimary = Color(hex: "FBF7F0")
    static let textSecondary = Color(hex: "C9BEAA")
    static let textTertiary = Color(hex: "9E927E")
    static let textOnAccent = Color(hex: "050403")
    static let brandPrimary = Color(hex: "E07E3C")
    static let brandStrong = Color(hex: "C8682A")
    static let brandHover = Color(hex: "F0975A")
    static let brandMuted = Color(hex: "7A3B12")
    static let interactive = Color(hex: "3AC0D4")
    static let interactiveHover = Color(hex: "74D6E5")
    static let interactivePressed = Color(hex: "17A2B8")
    static let focusRing = Color(hex: "74D6E5")
    static let peak = Color(hex: "FF2E88") // plasma — peak affect only
    static let peakBright = Color(hex: "FF6AAE")
    static let statePositive = Color(hex: "3AC0D4") // icon: check_circle
    static let stateCaution = Color(hex: "F2B838") // icon: warning
    static let stateDanger = Color(hex: "E8654F") // icon: error
    static let stateInfo = Color(hex: "74D6E5") // icon: info
    static let borderSubtle = Color(hex: "FBF7F0").opacity(0.08)
    static let borderDefault = Color(hex: "FBF7F0").opacity(0.14)
    static let borderStrong = Color(hex: "FBF7F0").opacity(0.24)
}

/// Opt-in light theme. Live (bgLive) stays dark in both themes; glass surfaces have no
/// light variant yet (a documented follow-up). Wire to the active color scheme at use site.
enum RFColorLight {
    static let bgBase = Color(hex: "F3EDE2")
    static let bgRaised = Color(hex: "FBF7F0")
    static let bgOverlay = Color(hex: "FFFDF9")
    static let bgSunken = Color(hex: "E4DBCB")
    static let bgLive = Color(hex: "020201")
    static let textPrimary = Color(hex: "050403")
    static let textSecondary = Color(hex: "241F18")
    static let textTertiary = Color(hex: "4A3F30")
    static let textOnAccent = Color(hex: "050403")
    static let brandPrimary = Color(hex: "C8682A")
    static let brandStrong = Color(hex: "A8521C")
    static let brandHover = Color(hex: "E07E3C")
    static let brandMuted = Color(hex: "7A3B12")
    static let interactive = Color(hex: "0C6B7A")
    static let interactiveHover = Color(hex: "0E7C8C")
    static let interactivePressed = Color(hex: "0C6B7A")
    static let focusRing = Color(hex: "0C6B7A")
    static let peak = Color(hex: "FF2E88") // plasma — peak affect only
    static let peakBright = Color(hex: "D11A68")
    static let statePositive = Color(hex: "0C6B7A") // icon: check_circle
    static let stateCaution = Color(hex: "B5790F") // icon: warning
    static let stateDanger = Color(hex: "B83A2B") // icon: error
    static let stateInfo = Color(hex: "0C6B7A") // icon: info
    static let borderSubtle = Color(hex: "0B0A08").opacity(0.08)
    static let borderDefault = Color(hex: "0B0A08").opacity(0.14)
    static let borderStrong = Color(hex: "0B0A08").opacity(0.22)
}

enum RFRadius {
    static let sheet: CGFloat = 24
    static let panel: CGFloat = 20
    static let card: CGFloat = 16
    static let input: CGFloat = 12
    static let control: CGFloat = 10
    static let pill: CGFloat = 999
}

/// 4pt grid. Named by point value (RFSpace.x16 == 16pt).
enum RFSpace {
    static let x0: CGFloat = 0
    static let x4: CGFloat = 4
    static let x8: CGFloat = 8
    static let x12: CGFloat = 12
    static let x16: CGFloat = 16
    static let x20: CGFloat = 20
    static let x24: CGFloat = 24
    static let x32: CGFloat = 32
    static let x40: CGFloat = 40
    static let x48: CGFloat = 48
    static let x64: CGFloat = 64
}

enum RFFontFamily: String {
    case display = "Bricolage Grotesque"
    case ui = "SF Pro Text"
    case data = "Azeret Mono"
}

struct RFTextStyle {
    let size: CGFloat
    let lineHeight: CGFloat
    let weight: Font.Weight
    let trackingEm: CGFloat
    let family: RFFontFamily
    /// Letter spacing in points for this size (SwiftUI .tracking expects points).
    var tracking: CGFloat { trackingEm * size }
    /// Additive line spacing for SwiftUI .lineSpacing.
    var lineSpacing: CGFloat { lineHeight - size }
}

enum RFType {
    static let displayXl = RFTextStyle(size: 52, lineHeight: 56, weight: .bold, trackingEm: -0.04, family: .display)
    static let displayLg = RFTextStyle(size: 48, lineHeight: 52, weight: .bold, trackingEm: -0.035, family: .display)
    static let display = RFTextStyle(size: 34, lineHeight: 40, weight: .bold, trackingEm: -0.03, family: .display)
    static let title = RFTextStyle(size: 24, lineHeight: 30, weight: .semibold, trackingEm: -0.01, family: .ui)
    static let heading = RFTextStyle(size: 18, lineHeight: 24, weight: .semibold, trackingEm: 0, family: .ui)
    static let body = RFTextStyle(size: 15, lineHeight: 22, weight: .regular, trackingEm: 0, family: .ui)
    static let bodyStrong = RFTextStyle(size: 15, lineHeight: 22, weight: .semibold, trackingEm: 0, family: .ui)
    static let label = RFTextStyle(size: 13, lineHeight: 16, weight: .medium, trackingEm: 0.01, family: .ui)
    static let caption = RFTextStyle(size: 11, lineHeight: 14, weight: .medium, trackingEm: 0.04, family: .ui)
    static let dataHero = RFTextStyle(size: 88, lineHeight: 84, weight: .bold, trackingEm: -0.04, family: .data)
    static let dataLg = RFTextStyle(size: 28, lineHeight: 30, weight: .semibold, trackingEm: -0.03, family: .data)
    static let data = RFTextStyle(size: 15, lineHeight: 18, weight: .medium, trackingEm: -0.02, family: .data)
}

enum RFMotion {
    /// Durations in seconds.
    static let instant: TimeInterval = 0.08
    static let fast: TimeInterval = 0.14
    static let base: TimeInterval = 0.22
    static let slow: TimeInterval = 0.32
    /// Cubic-bezier control points (x1, y1, x2, y2) — feed UnitCurve.bezier (iOS 17+).
    static let easeStandard: (CGFloat, CGFloat, CGFloat, CGFloat) = (0.2, 0, 0, 1)
    static let easeDecelerate: (CGFloat, CGFloat, CGFloat, CGFloat) = (0, 0, 0, 1)
    static let easeSnap: (CGFloat, CGFloat, CGFloat, CGFloat) = (0.3, 1.3, 0.5, 1)
    static let easeOnBeat: (CGFloat, CGFloat, CGFloat, CGFloat) = (0.4, 0, 0.2, 1)
}

/// The signature primitive — the interface keeps time. Beat derives from BPM.
enum RFTempo {
    static let defaultBPM: Double = 122
    /// Seconds per beat at a given BPM. Pulse animations repeat on this duration.
    static func beatDuration(bpm: Double) -> Double { 60.0 / bpm }
    /// On-beat pulse amplitude — subtle in planning's selected track, pronounced in Live.
    static let pulseScaleMax: CGFloat = 1.03
    static let pulseLiveScaleMax: CGFloat = 1.06
}

struct RFIntensityZone {
    let enumValue: String
    let zone: Int
    let label: String
    let bars: Int
    let color: Color
}

/// Intensity ramp. ALWAYS render zone number + bar count + label; color reinforces only.
/// all_out additionally earns the plasma peak glow (affect only).
enum RFIntensity {
    static let zones: [RFIntensityZone] = [
        RFIntensityZone(enumValue: "none", zone: 0, label: "None", bars: 0, color: Color(hex: "766B59")),
        RFIntensityZone(enumValue: "easy", zone: 1, label: "Build", bars: 1, color: Color(hex: "F7B987")),
        RFIntensityZone(enumValue: "mod", zone: 2, label: "Push", bars: 2, color: Color(hex: "F0975A")),
        RFIntensityZone(enumValue: "hard", zone: 3, label: "Attack", bars: 3, color: Color(hex: "E07E3C")),
        RFIntensityZone(enumValue: "all_out", zone: 4, label: "All Out", bars: 4, color: Color(hex: "D9483A")),
    ]
    static let peakGlow = RFColor.peak // layered on all_out only
}

/// Class sections — identified by icon + label first; tint is a soft reinforcing dot.
enum RFSegment {
    static let warmupTint = Color(hex: "F2B838") // local_fire_department · Warm-up
    static let climbTint = Color(hex: "A8521C") // trending_up · Climb
    static let sprintTint = Color(hex: "E8654F") // bolt · Sprint
    static let recoveryTint = Color(hex: "8678AD") // air · Recovery
    static let cooldownTint = Color(hex: "9E927E") // trending_down · Cool-down
}

/// Movement vocabulary. Placed moves reference the moves library, user_moves, or a freeform name.
/// Grouped by the real moves.template enum. Identity = icon + label; moves stay color-neutral.
enum RFMove {
    static let tint = Color(hex: "E4DBCB") // neutral; icon + label carry move identity
    static let cycle = (icon: "directions_bike", label: "Cycle")
    static let hiit = (icon: "timer", label: "HIIT")
    static let sculpt = (icon: "fitness_center", label: "Sculpt")
    static let tread = (icon: "directions_run", label: "Tread")
}

/// Energy ribbon gradient ramp (height encodes zone; color reinforces).
enum RFRibbon {
    static let stops: [(at: CGFloat, color: Color)] = [
        (0, Color(hex: "F7B987")),
        (0.5, Color(hex: "E07E3C")),
        (0.85, Color(hex: "D9483A")),
        (1, Color(hex: "FF2E88")),
    ]
    static let fillOpacity: CGFloat = 0.22
    static let lineOpacity: CGFloat = 0.9
}

/// Campaign heat gradient — brand-front affect only (copper→ember→plasma). Never a control and
/// never on a working surface. Build a LinearGradient from these stops at heatAngleDegrees.
enum RFGradient {
    static let heatAngleDegrees: Double = 96
    static let heatStops: [(at: CGFloat, color: Color)] = [
        (0, Color(hex: "E07E3C")),
        (1, Color(hex: "D9483A")),
    ]
}

