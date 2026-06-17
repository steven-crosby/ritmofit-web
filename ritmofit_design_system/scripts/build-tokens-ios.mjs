#!/usr/bin/env node
// iOS emitter — the second target promised by 08-ios-web-alignment and the web
// generator's header. Reads the SAME tokens.json source of truth and writes
// ios/RFTokens.swift (colors, type roles, spacing, radius, motion, tempo, and the
// intensity/segment/ribbon language). Web (build-tokens.mjs) and iOS stay in
// lockstep because both derive from tokens.json.
//
//   node scripts/build-tokens-ios.mjs
//
// The Swift file expects a `Color(hex:)` initializer in the host app (the RitmoFit
// iOS repo already provides one); this emitter intentionally does not redefine it.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const color = tokens.color;

// --- value resolution -------------------------------------------------------
const PRIM = /^\{color\.primitive\.(\w+)\.(\w+)\}$/;
const RGBA = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\s*\)$/;

const hexOf = (fam, step) => color.primitive[fam][step].replace("#", "").toUpperCase();

// Resolve a token value to a Swift Color expression.
const swiftColor = (val) => {
  if (typeof val !== "string") return "Color.clear";
  const p = val.match(PRIM);
  if (p) return `Color(hex: "${hexOf(p[1], p[2])}")`;
  if (val.startsWith("#")) return `Color(hex: "${val.replace("#", "").toUpperCase()}")`;
  const c = val.match(RGBA);
  if (c) {
    const hex = [c[1], c[2], c[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    return `Color(hex: "${hex}").opacity(${parseFloat(c[4])})`;
  }
  return "Color.clear";
};
const dark = (node) => swiftColor(node.dark);

// --- builder ----------------------------------------------------------------
const L = [];
const p = (s = "") => L.push(s);

p("// RFTokens.swift");
p("// GENERATED from tokens.json by scripts/build-tokens-ios.mjs — do not edit by hand.");
p("// Single source of truth shared with web (mockups/theme.css). Re-run the emitter");
p("// after changing tokens.json. Requires a `Color(hex:)` initializer in the host app.");
p("");
p("import SwiftUI");
p("");

// Primitives
p("/// Raw palette. Prefer the semantic RFColor roles below in product code.");
p("enum RFColorPrimitive {");
for (const [fam, steps] of Object.entries(color.primitive)) {
  for (const [step, hex] of Object.entries(steps)) {
    if (step.startsWith("$")) continue;
    p(`    static let ${fam}${step} = Color(hex: "${hex.replace("#", "").toUpperCase()}")`);
  }
}
p("}");
p("");

// Semantic colors — emitted twice: RFColor (dark, default) + RFColorLight (opt-in).
const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const pick = (node, variant) => swiftColor(node[variant]);
function colorMembers(variant) {
  const out = [];
  const add = (name, val) => out.push(`    static let ${name} = ${val}`);
  for (const [k, node] of Object.entries(color.semantic.bg)) add(`bg${cap(k)}`, pick(node, variant));
  for (const [k, node] of Object.entries(color.semantic.text)) add(`text${cap(camel(k))}`, pick(node, variant));
  add("brandPrimary", pick(color.semantic.brand.primary, variant));
  add("brandStrong", pick(color.semantic.brand["primary-strong"], variant));
  add("brandHover", pick(color.semantic.brand["primary-hover"], variant));
  add("brandMuted", pick(color.semantic.brand["primary-muted"], variant));
  add("interactive", pick(color.semantic.interactive.default, variant));
  add("interactiveHover", pick(color.semantic.interactive.hover, variant));
  add("interactivePressed", pick(color.semantic.interactive.pressed, variant));
  add("focusRing", pick(color.semantic.interactive["focus-ring"], variant));
  out.push(`    static let peak = ${pick(color.semantic.peak.glow, variant)} // plasma — peak affect only`);
  add("peakBright", pick(color.semantic.peak.bright, variant));
  for (const [k, node] of Object.entries(color.semantic.state)) {
    if (k.startsWith("$")) continue;
    out.push(`    static let state${cap(k)} = ${pick(node, variant)} // icon: ${node.icon}`);
  }
  for (const [k, node] of Object.entries(color.semantic.border)) add(`border${cap(k)}`, pick(node, variant));
  return out;
}

p("/// Semantic color roles. copper = identity, cyan = interaction, plasma = peak affect.");
p("/// RFColor is the default (dark). Adopt RFColorLight explicitly for the opt-in light theme.");
p("enum RFColor {");
colorMembers("dark").forEach((l) => p(l));
p("}");
p("");
p("/// Opt-in light theme. Live (bgLive) stays dark in both themes; glass surfaces have no");
p("/// light variant yet (a documented follow-up). Wire to the active color scheme at use site.");
p("enum RFColorLight {");
colorMembers("light").forEach((l) => p(l));
p("}");
p("");

// Radius
p("enum RFRadius {");
for (const [k, n] of Object.entries(tokens.radius)) {
  if (k.startsWith("$")) continue;
  p(`    static let ${k}: CGFloat = ${n}`);
}
p("}");
p("");

// Spacing (4pt grid; named by point value)
p("/// 4pt grid. Named by point value (RFSpace.x16 == 16pt).");
p("enum RFSpace {");
for (const [, n] of Object.entries(tokens.space)) {
  if (typeof n !== "number") continue;
  p(`    static let x${n}: CGFloat = ${n}`);
}
p("}");
p("");

// Typography
const FONT = { ui: "Inter", display: "Space Grotesk", data: "Martian Mono" };
const WEIGHT = { 300: ".light", 400: ".regular", 500: ".medium", 600: ".semibold", 700: ".bold", 800: ".heavy" };
p("enum RFFontFamily: String {");
for (const [k, v] of Object.entries(FONT)) p(`    case ${k} = "${v}"`);
p("}");
p("");
p("struct RFTextStyle {");
p("    let size: CGFloat");
p("    let lineHeight: CGFloat");
p("    let weight: Font.Weight");
p("    let trackingEm: CGFloat");
p("    let family: RFFontFamily");
p("    /// Letter spacing in points for this size (SwiftUI .tracking expects points).");
p("    var tracking: CGFloat { trackingEm * size }");
p("    /// Additive line spacing for SwiftUI .lineSpacing.");
p("    var lineSpacing: CGFloat { lineHeight - size }");
p("}");
p("");
p("enum RFType {");
for (const [k, s] of Object.entries(tokens.typography.scale)) {
  if (k.startsWith("$")) continue;
  const w = WEIGHT[s.weight] || ".regular";
  p(
    `    static let ${camel(k)} = RFTextStyle(size: ${s.size}, lineHeight: ${s.line}, weight: ${w}, trackingEm: ${s.tracking}, family: .${s.family})`,
  );
}
p("}");
p("");

// Motion
const ms = (x) => (x / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, ".0");
p("enum RFMotion {");
p("    /// Durations in seconds.");
for (const [k, n] of Object.entries(tokens.motion.duration)) p(`    static let ${k}: TimeInterval = ${ms(n)}`);
p("    /// Cubic-bezier control points (x1, y1, x2, y2) — feed UnitCurve.bezier (iOS 17+).");
for (const [k, v] of Object.entries(tokens.motion.easing)) {
  const pts = v.match(/cubic-bezier\(([^)]+)\)/);
  if (pts) p(`    static let ease${cap(k)}: (CGFloat, CGFloat, CGFloat, CGFloat) = (${pts[1].replace(/\s+/g, " ").trim()})`);
}
p("}");
p("");

// Tempo
p("/// The signature primitive — the interface keeps time. Beat derives from BPM.");
p("enum RFTempo {");
p(`    static let defaultBPM: Double = ${tokens.tempo["default-bpm"]}`);
p("    /// Seconds per beat at a given BPM. Pulse animations repeat on this duration.");
p("    static func beatDuration(bpm: Double) -> Double { 60.0 / bpm }");
p("    /// On-beat pulse amplitude — subtle in planning's selected track, pronounced in Live.");
p(`    static let pulseScaleMax: CGFloat = ${tokens.tempo.pulse["scale-max"]}`);
p(`    static let pulseLiveScaleMax: CGFloat = ${tokens.tempo.pulse["live-scale-max"]}`);
p("}");
p("");

// Intensity
p("struct RFIntensityZone {");
p("    let enumValue: String");
p("    let zone: Int");
p("    let label: String");
p("    let bars: Int");
p("    let color: Color");
p("}");
p("");
p("/// Intensity ramp. ALWAYS render zone number + bar count + label; color reinforces only.");
p("/// all_out additionally earns the plasma peak glow (affect only).");
p("enum RFIntensity {");
p("    static let zones: [RFIntensityZone] = [");
for (const [k, z] of Object.entries(color.intensity)) {
  if (k.startsWith("$")) continue;
  p(`        RFIntensityZone(enumValue: "${k}", zone: ${z.zone}, label: "${z.label}", bars: ${z.bars}, color: ${swiftColor(z.value)}),`);
}
p("    ]");
p("    static let peakGlow = RFColor.peak // layered on all_out only");
p("}");
p("");

// Segments
p("/// Class sections — identified by icon + label first; tint is a soft reinforcing dot.");
p("enum RFSegment {");
for (const [k, s] of Object.entries(color.segment)) {
  if (k.startsWith("$")) continue;
  p(`    static let ${camel(k)}Tint = ${swiftColor(s.tint)} // ${s.icon} · ${s.label}`);
}
p("}");
p("");

// Moves
p("/// Movement vocabulary. Placed moves reference the moves library, user_moves, or a freeform name.");
p("/// Grouped by the real moves.template enum. Identity = icon + label; moves stay color-neutral.");
p("enum RFMove {");
p(`    static let tint = ${swiftColor(color.move.tint)} // neutral; icon + label carry move identity`);
for (const [k, t] of Object.entries(color.move.template)) {
  p(`    static let ${k} = (icon: "${t.icon}", label: "${t.label}")`);
}
p("}");
p("");

// Ribbon
p("/// Energy ribbon gradient ramp (height encodes zone; color reinforces).");
p("enum RFRibbon {");
p("    static let stops: [(at: CGFloat, color: Color)] = [");
for (const s of color.ribbon.stops) p(`        (${s.at}, ${swiftColor(s.color)}),`);
p("    ]");
p(`    static let fillOpacity: CGFloat = ${color.ribbon["fill-opacity"]}`);
p(`    static let lineOpacity: CGFloat = ${color.ribbon["line-opacity"]}`);
p("}");
p("");

// Campaign heat gradient — brand-front affect only (copper→ember→plasma). Mirrors RFRibbon's shape.
// The ambient bloom is a web backdrop treatment; on iOS, heat shows via this gradient + RFColor.peak.
p("/// Campaign heat gradient — brand-front affect only (copper→ember→plasma). Never a control and");
p("/// never on a working surface. Build a LinearGradient from these stops at heatAngleDegrees.");
p("enum RFGradient {");
p(`    static let heatAngleDegrees: Double = ${tokens.surface.gradient.heat.angle}`);
p("    static let heatStops: [(at: CGFloat, color: Color)] = [");
for (const s of tokens.surface.gradient.heat.stops) p(`        (${s.at}, ${swiftColor(s.color)}),`);
p("    ]");
p("}");
p("");

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const outDir = join(root, "ios");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "RFTokens.swift");
const nextSwift = L.join("\n") + "\n";
const currentSwift = existsSync(outPath) ? readFileSync(outPath, "utf8") : null;
// `--check` (CI/verify): never write; exit non-zero if RFTokens.swift has drifted.
const checkOnly = process.argv.includes("--check");
if (currentSwift === nextSwift) {
  console.log("ios/RFTokens.swift already in sync.");
} else if (checkOnly) {
  console.error("ERROR: ios/RFTokens.swift is out of sync with tokens.json — run: node scripts/build-tokens-ios.mjs");
  process.exit(1);
} else {
  writeFileSync(outPath, nextSwift);
  console.log(`Wrote ${outPath}`);
}
