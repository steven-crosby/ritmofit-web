#!/usr/bin/env node
// Generates the :root custom-property block in mockups/theme.css from tokens.json.
// tokens.json is the single source of truth (README canonical decision #1).
// The :root block in theme.css is GENERATED — do not hand-edit it; edit tokens.json
// and re-run:  node scripts/build-tokens.mjs
//
// Web emitter. The iOS Swift emitter is scripts/build-tokens-ios.mjs (same source).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const themePath = join(root, "mockups", "theme.css");

const color = tokens.color;

// Resolve a token value: "{color.primitive.ink.900}" -> var(--rf-ink-900);
// "{color.semantic.border.subtle.dark}" -> var(--rf-border-subtle); raw strings pass through.
const refToVar = (v) => {
  if (typeof v !== "string") return v;
  let m = v.match(/^\{color\.primitive\.(\w+)\.(\w+)\}$/);
  if (m) return `var(--rf-${m[1]}-${m[2]})`;
  m = v.match(/^\{color\.semantic\.border\.(\w+)\.(?:dark|light)\}$/);
  if (m) return `var(--rf-border-${m[1]})`;
  return v;
};
const dark = (node) => refToVar(node.dark);

const lines = [];
const group = (label) => lines.push("", `  /* ${label} */`);
const v = (name, value) => lines.push(`  --rf-${name}: ${value};`);

lines.push("  color-scheme: dark;");

// 1. Primitive palette (hex literals, lowercased to match authored style)
group("primitives");
const PRIMITIVE_ORDER = {
  ink: ["950", "900", "850", "800", "700", "600", "500"],
  bone: ["0", "50", "100", "200", "300", "400", "500"],
  copper: ["200", "300", "400", "500", "600", "700"],
  ember: ["400", "500", "600"],
  cyan: ["300", "400", "500", "600", "700"],
  plasma: ["400", "500", "600"],
  amber: ["400", "500", "600"],
  violet: ["400", "500"],
};
for (const [family, steps] of Object.entries(PRIMITIVE_ORDER)) {
  for (const step of steps) v(`${family}-${step}`, color.primitive[family][step].toLowerCase());
}

// 2. Semantic backgrounds + text
group("semantic surfaces + text");
for (const [k, node] of Object.entries(color.semantic.bg)) v(`bg-${k}`, dark(node));
for (const [k, node] of Object.entries(color.semantic.text)) v(`text-${k}`, dark(node));

// 3. Brand (copper)
group("brand / copper");
v("brand-primary", dark(color.semantic.brand.primary));
v("brand-strong", dark(color.semantic.brand["primary-strong"]));
v("brand-hover", dark(color.semantic.brand["primary-hover"]));
v("brand-muted", dark(color.semantic.brand["primary-muted"]));

// 4. Interactive (cyan) — note: default maps to bare --rf-interactive
group("interactive / cyan");
v("interactive", dark(color.semantic.interactive.default));
v("interactive-hover", dark(color.semantic.interactive.hover));
v("interactive-pressed", dark(color.semantic.interactive.pressed));
v("focus-ring", dark(color.semantic.interactive["focus-ring"]));

// 5. Peak (plasma) — affect only; glow maps to bare --rf-peak
group("peak / plasma (affect only)");
v("peak", dark(color.semantic.peak.glow));
v("peak-bright", dark(color.semantic.peak.bright));

// 6. State (danger/caution paired with mandatory icons elsewhere)
group("state");
v("danger", dark(color.semantic.state.danger));
v("caution", dark(color.semantic.state.caution));

// 7. Borders
group("borders");
for (const [k, node] of Object.entries(color.semantic.border)) v(`border-${k}`, dark(node));

// 8. Typography families
group("type families");
v("font-ui", tokens.typography.family.ui);
v("font-display", tokens.typography.family.display);
v("font-data", tokens.typography.family.data);

// 9. Radius
group("radius");
for (const [k, n] of Object.entries(tokens.radius)) {
  if (k.startsWith("$")) continue;
  v(`radius-${k}`, `${n}px`);
}

// 10. Shadows
group("shadows");
for (const [k, s] of Object.entries(tokens.surface.shadow)) {
  if (k.startsWith("$") || k.endsWith("Light")) continue; // *Light = theme overrides
  v(`shadow-${k}`, s);
}

// 11. Glass scale (consolidated; --rf-glass is the workhorse alias = strong)
group("glass");
v("glass-subtle", tokens.surface.glass.fill.subtle);
v("glass-default", tokens.surface.glass.fill.default);
v("glass-strong", tokens.surface.glass.fill.strong);
v("glass-border", tokens.surface.glass.border);
v("glass-highlight", tokens.surface.glass.highlight);
v("glass", "var(--rf-glass-strong)");
v("header-fill", tokens.surface.glass.header);

// 11b. Campaign heat — brand-front only (marketing/share/login/onboarding/Explore hero + the Live
// drop). Copper→ember→plasma display-type fill + ambient bloom. Affect only; never a control and never
// on a working surface (02-color-system allowlist item 3). peak-bloom rides the shadow loop (group 10).
group("campaign heat (brand-front only)");
const heatGrad = tokens.surface.gradient.heat;
const heatStops = heatGrad.stops
  .map((s) => `${refToVar(s.color)} ${Math.round(s.at * 100)}%`)
  .join(", ");
v("gradient-heat", `linear-gradient(${heatGrad.angle}deg, ${heatStops})`);
v("bloom-heat", tokens.surface.bloom.heat);

// 12. Easing
group("easing");
v("ease", tokens.motion.easing.standard);
v("ease-beat", tokens.motion.easing.onBeat);
v("ease-snap", tokens.motion.easing.snap);
v("ease-decel", tokens.motion.easing.decelerate);

// 13. Tempo (signature primitive)
group("tempo");
v("bpm", String(tokens.tempo["default-bpm"]));
v("beat", tokens.tempo["beat-derivation"]);

// 14. Intensity ramp — zone fills keyed by zone number. Color reinforces only;
// number + bar count + label always carry the meaning (encoding_rule).
group("intensity (zone ramp)");
for (const z of Object.values(color.intensity)) {
  if (typeof z !== "object" || typeof z.zone !== "number") continue;
  v(`zone-${z.zone}`, refToVar(z.value));
}

// 15. Segment tints — soft reinforcing dot; icon + label lead.
group("segment tints");
for (const [k, node] of Object.entries(color.segment)) {
  if (k.startsWith("$")) continue;
  v(`seg-${k}`, refToVar(node.tint));
}

// 15b. Move identity — neutral by design (icon + label lead). Templates
// (cycle/hiit/sculpt/tread = the real moves.template enum) differ by icon/label, not color.
group("move (neutral; icon + label lead)");
v("move-tint", refToVar(color.move.tint));

// 16. Energy-ribbon ramp, opacities, and baseline. Stops are emitted by index
// (position 0..n) so the gradient ramp lives in tokens, not hand CSS.
group("ribbon");
color.ribbon.stops.forEach((s, i) => v(`ribbon-stop-${i}`, refToVar(s.color)));
v("ribbon-fill-opacity", String(color.ribbon["fill-opacity"]));
v("ribbon-line-opacity", String(color.ribbon["line-opacity"]));
v("ribbon-baseline", refToVar(color.ribbon.baseline));

// 17. Motion durations (easings are emitted above).
group("motion durations");
for (const [k, n] of Object.entries(tokens.motion.duration)) v(`dur-${k}`, `${n}ms`);

// 18. Tempo pulse scales (planning vs Live amplitude).
group("tempo pulse");
v("pulse-scale-max", String(tokens.tempo.pulse["scale-max"]));
v("pulse-live-scale-max", String(tokens.tempo.pulse["live-scale-max"]));

const START = "/* >>> tokens:start — GENERATED from tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */";
const END = "/* <<< tokens:end */";
const block = `:root {\n${START}\n${lines.join("\n")}\n${END}\n}`;

// 14. Light theme — opt-in semantic overrides (dark stays the default). Only the
// semantic layer flips; primitives, radius, spacing, type, motion, and tempo are
// theme-independent. Activated by [data-theme="light"]; nothing toggles it by
// default, so the dark-first mockups are unaffected.
const lightLines = [];
const lgroup = (label) => lightLines.push("", `  /* ${label} */`);
const lv = (name, value) => lightLines.push(`  --rf-${name}: ${value};`);
const light = (node) => refToVar(node.light);
lightLines.push("  color-scheme: light;");
lgroup("semantic surfaces + text");
for (const [k, node] of Object.entries(color.semantic.bg)) lv(`bg-${k}`, light(node));
for (const [k, node] of Object.entries(color.semantic.text)) lv(`text-${k}`, light(node));
lgroup("brand / copper");
lv("brand-primary", light(color.semantic.brand.primary));
lv("brand-strong", light(color.semantic.brand["primary-strong"]));
lv("brand-hover", light(color.semantic.brand["primary-hover"]));
lv("brand-muted", light(color.semantic.brand["primary-muted"]));
lgroup("interactive / cyan");
lv("interactive", light(color.semantic.interactive.default));
lv("interactive-hover", light(color.semantic.interactive.hover));
lv("interactive-pressed", light(color.semantic.interactive.pressed));
lv("focus-ring", light(color.semantic.interactive["focus-ring"]));
lgroup("peak / plasma (affect only)");
lv("peak", light(color.semantic.peak.glow));
lv("peak-bright", light(color.semantic.peak.bright));
lgroup("state");
lv("danger", light(color.semantic.state.danger));
lv("caution", light(color.semantic.state.caution));
lgroup("borders");
for (const [k, node] of Object.entries(color.semantic.border)) lv(`border-${k}`, light(node));
lgroup("glass");
lv("glass-subtle", tokens.surface.glass.fillLight.subtle);
lv("glass-default", tokens.surface.glass.fillLight.default);
lv("glass-strong", tokens.surface.glass.fillLight.strong);
lv("glass-border", tokens.surface.glass.borderLight);
lv("glass-highlight", tokens.surface.glass.highlightLight);
lgroup("shadows");
lv("shadow-card", tokens.surface.shadow.cardLight);
lv("shadow-lifted", tokens.surface.shadow.liftedLight);

const L_START = '/* >>> theme:light:start — GENERATED (light values) by scripts/build-tokens.mjs. Opt-in; dark is the default. Do not edit by hand. */';
const L_END = "/* <<< theme:light:end */";
const lightBlock = `[data-theme="light"] {\n${L_START}\n${lightLines.join("\n")}\n${L_END}\n}`;

const css = readFileSync(themePath, "utf8");
// Replace the first :root { ... } block (it contains no nested braces).
const rootBlock = /:root\s*\{[\s\S]*?\n\}/;
if (!rootBlock.test(css)) {
  console.error("ERROR: could not locate :root block in theme.css");
  process.exit(1);
}
let next = css.replace(rootBlock, block);
// Splice the opt-in light block: update in place if present, else insert after :root.
const lightRe = /\[data-theme="light"\]\s*\{[\s\S]*?\n\}/;
if (lightRe.test(next)) {
  next = next.replace(lightRe, () => lightBlock);
} else {
  next = next.replace(block, () => `${block}\n\n${lightBlock}`);
}
const tokenCount = lines.filter((l) => l.includes("--rf-")).length;
const lightCount = lightLines.filter((l) => l.includes("--rf-")).length;
// `--check` (CI/verify): never write; exit non-zero if theme.css has drifted.
const checkOnly = process.argv.includes("--check");
if (next === css) {
  console.log(`theme.css already in sync (${tokenCount} root + ${lightCount} light tokens).`);
} else if (checkOnly) {
  console.error("ERROR: mockups/theme.css is out of sync with tokens.json — run: node scripts/build-tokens.mjs");
  process.exit(1);
} else {
  writeFileSync(themePath, next);
  console.log(`Wrote ${tokenCount} root + ${lightCount} light tokens to mockups/theme.css`);
}
