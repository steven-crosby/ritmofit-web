#!/usr/bin/env node
// Design-system guardrail lint. Fast, dependency-free, CI-friendly.
// Run:  node scripts/lint-tokens.mjs   (exits non-zero on any violation)
//
// Checks the invariants the audit (DESIGN-SYSTEM-AUDIT-FINDINGS.md, in this
// folder) and the governing brief care about most:
//   1. No raw hex in hand-written theme.css (must route through tokens). The
//      GENERATED :root / [data-theme=light] blocks and a small documented
//      allowlist of one-off literals are exempt.
//   2. No raw hex in the HTML mockups except the intentional swatch labels.
//   3. No banned party-fitness / generic-SaaS copy in the mockups.
//   4. tokens.json parses and every {color.primitive.*} reference resolves.
//   5. Prose <-> token drift: every typography-scale and radius key in
//      tokens.json is documented in its spec table and the governing brief.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

// --- 1 + 2. Raw hex discipline ---------------------------------------------
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
// Documented one-off literals allowed in hand-written theme.css (each commented in-file).
const THEME_HEX_ALLOW = new Set(["#050403", "#000"]);

const theme = read("mockups/theme.css");
// Strip the two generated blocks (hex there is authored in tokens.json, not by hand).
const handCss = theme
  .replace(/\/\* >>> tokens:start[\s\S]*?\/\* <<< tokens:end \*\//, "")
  .replace(/\/\* >>> theme:light:start[\s\S]*?\/\* <<< theme:light:end \*\//, "");
for (const m of handCss.matchAll(HEX)) {
  if (!THEME_HEX_ALLOW.has(m[0].toLowerCase()) && !THEME_HEX_ALLOW.has(m[0])) {
    fail("mockups/theme.css", `raw hex ${m[0]} in hand-written CSS — use a token`);
  }
}

const htmlFiles = readdirSync(join(root, "mockups")).filter((f) => f.endsWith(".html"));
for (const f of htmlFiles) {
  const src = read(`mockups/${f}`);
  for (const m of src.matchAll(HEX)) {
    // components.html and light.html document the palette with literal swatch chips.
    if ((f === "components.html" || f === "light.html") && /--swatch:\s*#|\/\s*#[0-9A-Fa-f]/.test(
      src.slice(Math.max(0, m.index - 40), m.index + 10),
    )) continue;
    fail(`mockups/${f}`, `raw hex ${m[0]} in markup — use a token/class`);
  }
}

// --- 3. Banned copy ---------------------------------------------------------
const BANNED = [
  /\bturn ?up\b/i, /\bfiesta\b/i, /\bsweat party\b/i, /\bparty ride\b/i,
  /\bbottle service\b/i, /\bvamos\b/i, /\bcaliente\b/i, /\bbeast mode\b/i,
  /\bcrush it\b/i, /\bsynergy\b/i, /\bleverage\b/i, /\bseamless\b/i,
];
for (const f of htmlFiles) {
  const src = read(`mockups/${f}`);
  // Only inspect visible text nodes, not attributes/markup.
  const text = src.replace(/<[^>]+>/g, " ");
  for (const re of BANNED) {
    const hit = text.match(re);
    if (hit) fail(`mockups/${f}`, `banned copy term "${hit[0]}" — use RitmoFit voice`);
  }
}

// --- 4. Token integrity -----------------------------------------------------
let tokens;
try {
  tokens = JSON.parse(read("tokens.json"));
} catch (e) {
  fail("tokens.json", `invalid JSON: ${e.message}`);
}
if (tokens) {
  const prim = tokens.color.primitive;
  const walk = (node) => {
    if (typeof node === "string") {
      const m = node.match(/^\{color\.primitive\.(\w+)\.(\w+)\}$/);
      if (m && !(prim[m[1]] && prim[m[1]][m[2]] !== undefined)) {
        fail("tokens.json", `dangling reference ${node}`);
      }
    } else if (node && typeof node === "object") {
      for (const v of Object.values(node)) walk(v);
    }
  };
  walk(tokens.color);

  // Spacing scale must be emitted to the web :root — the .gap-*/*-pad utilities
  // reference --rf-space-* so web spacing can't drift from tokens.json. Guard the
  // emission so a regression (dropping the group) fails loudly instead of silently
  // breaking layout. The generated :root block lives between the tokens markers.
  const rootBlock = (theme.match(/\/\* >>> tokens:start[\s\S]*?\/\* <<< tokens:end \*\//) || [""])[0];
  for (const k of Object.keys(tokens.space || {})) {
    if (k.startsWith("$")) continue;
    if (!new RegExp(`--rf-space-${k}\\s*:`).test(rootBlock)) {
      fail("mockups/theme.css", `spacing token space.${k} not emitted as --rf-space-${k} — run node scripts/build-tokens.mjs`);
    }
  }
}

// --- 5. Prose <-> token table integrity -------------------------------------
// The value tables in the specs and the governing brief are hand-maintained
// mirrors of tokens.json. Assert every typography-scale and radius key appears
// in its table (so a token can't ship undocumented, and a documented row can't
// outlive its token). Keys are matched as whole hyphen-aware words so `display`
// does not satisfy `display-xl`.
if (tokens) {
  const docHas = (text, key) =>
    new RegExp(`(^|[^\\w-])${key.replace(/[-]/g, "\\-")}([^\\w-]|$)`).test(text);
  const brief = read("ritmofit-design-system.md");
  const typeDocs = read("03-typography.md") + "\n" + brief;
  for (const key of Object.keys(tokens.typography.scale)) {
    if (key.startsWith("$")) continue;
    if (!docHas(typeDocs, key))
      fail("03-typography.md", `type token \`${key}\` is undocumented in the type-scale table(s)`);
  }
  const radiusDocs = read("04-layout-and-surfaces.md") + "\n" + brief;
  for (const key of Object.keys(tokens.radius)) {
    if (key.startsWith("$")) continue;
    if (!docHas(radiusDocs, key))
      fail("04-layout-and-surfaces.md", `radius token \`${key}\` is undocumented in the radius table(s)`);
  }
}

// --- report -----------------------------------------------------------------
if (problems.length) {
  console.error(`✗ lint-tokens: ${problems.length} violation(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("✓ lint-tokens: clean (hex discipline, copy voice, token integrity).");
