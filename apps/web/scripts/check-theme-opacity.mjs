#!/usr/bin/env node
// Fails when a semantic colour + opacity modifier does not generate usable CSS.
//
// Why this exists: `bg-interactive/10` compiled as a class name but emitted no
// rule. Computed background was `rgba(0,0,0,0)` even though the token resolved
// (LiveTimeline played-portion fill). `theme-classes` only strips `/n` and
// checks the base name exists — that gate stayed green. This companion compiles
// representative utilities with the live Tailwind/PostCSS stack and inspects
// the generated declarations.
//
// A gate nobody has seen fail is not a gate: --selftest includes a controlled
// negative (raw `var(--rf-*)` colours, the shape that shipped broken) and a
// passing-after compile of the live config.
//
// Run via `pnpm --filter @ritmofit/web theme-classes` (and `--selftest`).

import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(WEB_ROOT, 'tailwind.config.js');

const REQUIRED = [
  {
    cls: 'bg-interactive',
    property: 'background-color',
    token: '--rf-color-semantic-interactive-default',
  },
  {
    cls: 'bg-interactive/5',
    property: 'background-color',
    token: '--rf-color-semantic-interactive-default',
    alpha: 0.05,
  },
  {
    cls: 'bg-interactive/10',
    property: 'background-color',
    token: '--rf-color-semantic-interactive-default',
    alpha: 0.1,
  },
  {
    cls: 'bg-interactive/15',
    property: 'background-color',
    token: '--rf-color-semantic-interactive-default',
    alpha: 0.15,
  },
  {
    cls: 'border-interactive/15',
    property: 'border-color',
    token: '--rf-color-semantic-interactive-default',
    alpha: 0.15,
  },
  {
    cls: 'text-interactive/50',
    property: 'color',
    token: '--rf-color-semantic-interactive-default',
    alpha: 0.5,
  },
];

const TRANSPARENT =
  /^(?:transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0(?:\.0+)?\s*\)|rgb\(\s*0\s+0\s+0\s*\/\s*0(?:\.0+)?\s*\))$/i;

function ruleBody(css, className) {
  const selector = `.${className.replace(/\//g, '\\/')}`;
  const re = new RegExp(`${escapeRegExp(selector)}(?![\\w\\\\/-])\\s*\\{([^}]+)\\}`);
  const match = css.match(re);
  return match ? match[1] : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function declaration(body, property) {
  if (!body) return null;
  const match = body.match(new RegExp(`${escapeRegExp(property)}\\s*:\\s*([^;]+)`, 'i'));
  return match ? match[1].trim() : null;
}

function hasRequestedAlpha(decl, fraction) {
  const percent = String(Number(fraction) * 100);
  if (new RegExp(`(?<![\\d.])${escapeRegExp(percent)}%`).test(decl)) return true;
  const frac = String(fraction);
  return new RegExp(`(?<![\\d.])${escapeRegExp(frac)}(?![\\d])`).test(decl);
}

/**
 * Inspect generated CSS. Returns failure strings; empty means the output is
 * usable (rule present, token var retained, requested alpha present, not zero).
 */
export function validateGeneratedOpacityCss(css, cases = REQUIRED) {
  const failures = [];
  for (const { cls, property, token, alpha } of cases) {
    const body = ruleBody(css, cls);
    if (!body) {
      failures.push(`${cls}: no generated rule`);
      continue;
    }
    const value = declaration(body, property);
    if (!value) {
      failures.push(`${cls}: missing ${property}`);
      continue;
    }
    if (TRANSPARENT.test(value)) {
      failures.push(`${cls}: generated ${property} is transparent (${value})`);
      continue;
    }
    if (!value.includes(token)) {
      failures.push(`${cls}: ${property} bypasses token ${token} (${value})`);
      continue;
    }
    if (alpha !== undefined && !hasRequestedAlpha(value, alpha)) {
      failures.push(`${cls}: ${property} dropped alpha ${alpha} (${value})`);
    }
  }
  return failures;
}

async function loadConfig() {
  return (await import(`${pathToFileURL(CONFIG).href}?t=${Date.now()}`)).default;
}

export async function compileUtilities(classList, colorOverride) {
  const config = await loadConfig();
  const result = await postcss([
    tailwindcss({
      ...config,
      theme: {
        ...config.theme,
        extend: {
          ...config.theme.extend,
          ...(colorOverride ? { colors: colorOverride } : {}),
        },
      },
      content: [{ raw: classList.join(' '), extension: 'html' }],
      corePlugins: { preflight: false },
    }),
  ]).process('@tailwind utilities;', { from: undefined });
  return result.css;
}

export async function runOpacityCheck() {
  const css = await compileUtilities(REQUIRED.map((c) => c.cls));
  const failures = validateGeneratedOpacityCss(css);
  if (failures.length === 0) {
    console.log(
      `✓ semantic opacity utilities generate usable CSS (${REQUIRED.length} declarations)`,
    );
    return [];
  }
  console.error(`✗ ${failures.length} semantic opacity utility failure(s):\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    `\nOpacity modifiers must emit a non-transparent rule that keeps the --rf-* token\nand the requested alpha. Do not "fix" this by rewriting call sites.`,
  );
  return failures;
}

function brokenInteractiveColors() {
  // The shape that shipped: object DEFAULT + flat var() strings. Tailwind's
  // parseColor cannot read either, so `/n` emits no rule.
  return {
    interactive: {
      DEFAULT: 'var(--rf-color-semantic-interactive-default)',
      hover: 'var(--rf-color-semantic-interactive-hover)',
    },
    peak: 'var(--rf-color-semantic-peak-glow)',
  };
}

export async function selftestOpacity() {
  const cases = [];

  const emptyCss = '.bg-interactive {\n    background-color: var(--rf-color-semantic-interactive-default)\n}';
  cases.push({
    name: 'rejects missing /10 rule (historical output)',
    ok: validateGeneratedOpacityCss(emptyCss).some((f) => f.includes('bg-interactive/10')),
  });

  const zeroAlphaCss = `.bg-interactive { background-color: var(--rf-color-semantic-interactive-default) }
.bg-interactive\\/5 { background-color: rgb(0 0 0 / 0) }
.bg-interactive\\/10 { background-color: rgb(0 0 0 / 0) }
.bg-interactive\\/15 { background-color: rgb(0 0 0 / 0) }
.border-interactive\\/15 { border-color: rgb(0 0 0 / 0) }
.text-interactive\\/50 { color: rgb(0 0 0 / 0) }`;
  cases.push({
    name: 'rejects zero-alpha generated declarations',
    ok: validateGeneratedOpacityCss(zeroAlphaCss).some((f) => f.includes('transparent')),
  });

  const bakedHexCss = `.bg-interactive { background-color: #3AC0D4 }
.bg-interactive\\/5 { background-color: rgb(58 192 212 / 0.05) }
.bg-interactive\\/10 { background-color: rgb(58 192 212 / 0.1) }
.bg-interactive\\/15 { background-color: rgb(58 192 212 / 0.15) }
.border-interactive\\/15 { border-color: rgb(58 192 212 / 0.15) }
.text-interactive\\/50 { color: rgb(58 192 212 / 0.5) }`;
  cases.push({
    name: 'rejects baked hex that bypasses tokens',
    ok: validateGeneratedOpacityCss(bakedHexCss).some((f) => f.includes('bypasses token')),
  });

  const brokenCss = await compileUtilities(
    REQUIRED.map((c) => c.cls),
    brokenInteractiveColors(),
  );
  const brokenFailures = validateGeneratedOpacityCss(brokenCss);
  cases.push({
    name: 'fails against raw var() colours (failing-before)',
    ok: brokenFailures.some((f) => f.includes('bg-interactive/10')),
  });

  const liveCss = await compileUtilities(REQUIRED.map((c) => c.cls));
  const liveFailures = validateGeneratedOpacityCss(liveCss);
  cases.push({
    name: 'passes against the live config (passing-after)',
    ok: liveFailures.length === 0,
  });

  let bad = 0;
  for (const { name, ok } of cases) {
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} opacity ${ok ? 'proves' : 'missed '} ${name}`);
  }
  if (bad) {
    console.error(`\n✗ opacity self-test failed on ${bad} case(s) — trust nothing this script reports.`);
    return false;
  }
  console.log(`\n✓ opacity self-test passed on ${cases.length} cases`);
  return true;
}
