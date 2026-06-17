#!/usr/bin/env node
// WCAG contrast gate for the semantic color layer (both themes). Governance tool:
// the light palette is opt-in and was hard to verify by eye, so this computes the
// ratios that matter — text and accent-as-text on the solid surfaces — and fails
// on any AA regression.  Run:  node scripts/check-contrast.mjs
//
// Thresholds: AA small text 4.5:1; AA large/UI 3.0:1. Each pair declares which it
// must clear. Alpha (border) colors are not text and are intentionally excluded.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const prim = tokens.color.primitive;
const sem = tokens.color.semantic;

const refHex = (v) => {
  const m = typeof v === "string" && v.match(/^\{color\.primitive\.(\w+)\.(\w+)\}$/);
  return m ? prim[m[1]][m[2]] : v;
};
const S = (path, variant) => {
  const node = path.split(".").reduce((o, k) => o[k], sem);
  return refHex(node[variant]);
};

const toRGB = (hex) => {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const [r, g, b] = toRGB(hex); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (fg, bg) => { const a = lum(fg) + 0.05, b = lum(bg) + 0.05; return Math.max(a, b) / Math.min(a, b); };

// Pairs that carry meaning as text/icon. min = required ratio (4.5 small, 3.0 large/UI).
const pairs = (variant) => {
  const base = S("bg.base", variant), raised = S("bg.raised", variant);
  const onCopper = S("brand.primary", variant), onCyan = S("interactive.default", variant);
  // Solid cyan fills carry ink in dark (bright cyan) and bone in light (deep teal).
  const onCyanText = variant === "light" ? prim.bone["50"] : S("text.on-accent", variant);
  return [
    // Body + meta text — small text, AA 4.5
    ["text/primary", S("text.primary", variant), base, 4.5],
    ["text/secondary", S("text.secondary", variant), base, 4.5],
    ["text/tertiary", S("text.tertiary", variant), base, 4.5],
    ["text/tertiary on raised", S("text.tertiary", variant), raised, 4.5],
    // Accent text — small text, AA 4.5
    ["eyebrow (brand-strong)", S("brand.primary-strong", variant), base, 4.5],
    ["link / cyan control text (interactive)", S("interactive.default", variant), base, 4.5],
    // Button text on accent fills — small text, AA 4.5
    ["ink on copper fill", S("text.on-accent", variant), onCopper, 4.5],
    ["text on solid cyan fill (skip-link)", onCyanText, onCyan, 4.5],
    // Icon / graphic / brand-mark colors — icon-paired per the redundant-encoding
    // rule, so these are non-text graphics: AA 3.0 (WCAG 1.4.11), not 4.5.
    ["caution icon", S("state.caution", variant), base, 3.0],
    ["danger icon", S("state.danger", variant), base, 3.0],
    ["info icon", S("state.info", variant), base, 3.0],
    ["brand-primary mark", S("brand.primary", variant), base, 3.0],
    ["interactive-hover icon", S("interactive.hover", variant), base, 3.0],
  ];
};

let failures = 0;
for (const variant of ["dark", "light"]) {
  console.log(`\n  ${variant.toUpperCase()} theme`);
  for (const [label, fg, bg, min] of pairs(variant)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "✓" : "✗"} ${r.toFixed(2)}:1  (need ${min})  ${label}  [${fg} on ${bg}]`);
  }
}

if (failures) {
  console.error(`\n✗ check-contrast: ${failures} pair(s) below AA`);
  process.exit(1);
}
console.log("\n✓ check-contrast: all semantic text/accent pairs clear AA.");
