#!/usr/bin/env node
// Fails when a source file uses a colour utility that names a theme key Tailwind
// has no definition for — `bg-bg-surface`, `border-border-default`, `bg-border-default`.
//
// Why this exists: those three shipped, in 12 places across 5 files, and nothing
// caught them. A generated class is a string, so `tsc` has nothing to check and
// ESLint has no rule to apply; Tailwind simply emits no CSS and the element falls
// back to something else. The failure is silent in both directions — a dead `bg-*`
// renders transparent, while a dead `border-*` inherits preflight's #E5E7EB and
// looks deliberate. See docs/audits/claude-design-audit-2026-07-24 (F-01).
//
// Scope is deliberately narrow: a class is only judged when its first value
// segment names one of the colour groups in `tailwind.config.js`. That is where
// the whole observed failure mode lives, and it keeps false positives at zero —
// `text-sm`, `border-2`, and `shadow-lg` are never candidates. Valid names come
// from the config itself, so adding a token cannot make this gate stale.
//
// Run: pnpm --filter @ritmofit/web theme-classes [--selftest]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(WEB_ROOT, 'src');
const CONFIG = join(WEB_ROOT, 'tailwind.config.js');

// Utilities that take a colour, each with every other theme scale it also resolves
// against. A utility prefix is not owned by one scale: `shadow-peak-glow` is a
// legitimate `boxShadow` key, and judging it against `colors` alone reports a
// false positive. A gate that cries wolf gets deleted, so the mapping is explicit.
const COLOUR_UTILITIES = {
  bg: ['backgroundImage'],
  text: ['fontSize'],
  border: ['borderRadius'],
  ring: [],
  fill: [],
  stroke: [],
  from: [],
  via: [],
  to: [],
  divide: [],
  outline: [],
  decoration: [],
  placeholder: [],
  accent: [],
  caret: [],
  shadow: ['boxShadow'],
};

/** Every colour name Tailwind will actually generate from our theme extension. */
function validColourNames(colours) {
  const names = new Set();
  for (const [group, value] of Object.entries(colours)) {
    if (typeof value === 'string') {
      names.add(group);
      continue;
    }
    for (const key of Object.keys(value)) {
      // The trap that produced two of the three regressions: a DEFAULT key is
      // addressed by the bare group name. `colors.border.DEFAULT` is
      // `border-border`, never `border-border-default`.
      names.add(key === 'DEFAULT' ? group : `${group}-${key}`);
    }
  }
  return names;
}

const CANDIDATE = new RegExp(
  String.raw`(?<![\w-])(?:[a-z][a-z0-9-]*:)*(` +
    Object.keys(COLOUR_UTILITIES).join('|') +
    String.raw`)-([a-z0-9][a-z0-9_-]*)`,
  'g',
);

/**
 * Candidates whose first value segment names one of our colour groups — the only
 * ones this gate judges — paired with whether the theme defines them.
 *
 * @returns {{utility: string, value: string, cls: string, dead: boolean}[]}
 */
function candidatesIn(line, { groups, valid, scales }) {
  const found = [];
  for (const m of line.matchAll(CANDIDATE)) {
    const [cls, utility, rawValue] = m;
    if (cls.includes('[')) continue; // arbitrary value — Tailwind validates it, we do not
    const value = rawValue.split('/')[0]; // strip an opacity modifier
    if (!groups.has(value.split('-')[0])) continue;
    // Resolvable as a colour, or as a key of another scale this utility reads.
    const alsoValid = (COLOUR_UTILITIES[utility] ?? []).some((s) => scales[s]?.has(value));
    found.push({ utility, value, cls, dead: !valid.has(value) && !alsoValid });
  }
  return found;
}

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function nearest(value, valid) {
  const group = value.split('-')[0];
  const siblings = [...valid].filter((v) => v === group || v.startsWith(`${group}-`));
  // The DEFAULT mistake is the most likely one, so name it first when it applies.
  if (value === `${group}-default` && valid.has(group)) return [group];
  return siblings.slice(0, 6);
}

async function loadTheme() {
  const extend = (await import(pathToFileURL(CONFIG).href)).default.theme?.extend ?? {};
  const colours = extend.colors ?? {};
  const scales = {};
  for (const [name, value] of Object.entries(extend)) {
    if (name !== 'colors' && value && typeof value === 'object') {
      scales[name] = new Set(Object.keys(value));
    }
  }
  return { colours, scales, groups: new Set(Object.keys(colours)), valid: validColourNames(colours) };
}

function scan(theme) {
  const failures = [];
  for (const file of sourceFiles(SRC)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { value, cls, dead } of candidatesIn(line, theme)) {
        if (!dead) continue;
        failures.push({ file: relative(WEB_ROOT, file), line: i + 1, cls, value });
      }
    });
  }
  return failures;
}

// --- self-test -------------------------------------------------------------
// A gate nobody has seen fail is not a gate. This asserts the checker catches the
// three classes that actually shipped, and clears their corrected forms. Expected
// values are derived from the live config, so the cases cannot drift out of sync.
function selftest(theme) {
  const { colours, scales, valid } = theme;
  const cases = [];

  // The three historical regressions this gate exists to prevent (F-01).
  for (const cls of ['bg-bg-surface', 'border-border-default', 'bg-border-default']) {
    cases.push({ cls, shouldFail: true, why: 'historical regression' });
  }
  // Their corrected forms, and one derived valid case per colour group.
  for (const cls of ['bg-bg-base', 'border-border', 'bg-border']) {
    cases.push({ cls, shouldFail: false, why: 'corrected form' });
  }
  for (const [group, value] of Object.entries(colours)) {
    const key = typeof value === 'string' ? null : Object.keys(value)[0];
    const name = !key ? group : key === 'DEFAULT' ? group : `${group}-${key}`;
    cases.push({ cls: `bg-${name}`, shouldFail: false, why: `derived from colors.${group}` });
    cases.push({ cls: `bg-${name}-nope`, shouldFail: true, why: `unknown key under ${group}` });
  }
  // A colour-utility prefix is not owned by the colour scale. Each of these is a
  // key of another scale the same prefix reads, and every one is a false positive
  // this gate produced before the scale mapping existed.
  for (const [scale, utility] of [
    ['boxShadow', 'shadow'],
    ['borderRadius', 'border'],
    ['fontSize', 'text'],
    ['backgroundImage', 'bg'],
  ]) {
    for (const key of scales[scale] ?? []) {
      // Only meaningful when the key collides with a colour-group name, which is
      // the condition that makes it a candidate at all.
      cases.push({ cls: `${utility}-${key}`, shouldFail: false, why: `${scale} key` });
    }
  }
  // Out of scope: must never be judged, or the gate becomes noise nobody trusts.
  for (const cls of ['text-sm', 'border-2', 'shadow-lg', 'bg-[#ff0000]', 'bg-bg-base/50']) {
    cases.push({ cls, shouldFail: false, why: 'out of scope / valid' });
  }

  let bad = 0;
  for (const { cls, shouldFail, why } of cases) {
    const failed = candidatesIn(`className="${cls}"`, theme).some((c) => c.dead);
    const ok = failed === shouldFail;
    if (!ok) bad++;
    console.log(
      `${ok ? '✓' : '✗'} ${shouldFail ? 'rejects' : 'accepts '} ${cls.padEnd(26)} ${why}`,
    );
  }
  if (bad) {
    console.error(`\n✗ self-test failed on ${bad} case(s) — trust nothing this script reports.`);
    process.exit(1);
  }
  console.log(`\n✓ self-test passed on ${cases.length} cases (${valid.size} valid colour names)`);
}

// --- main ------------------------------------------------------------------
const theme = await loadTheme();

if (process.argv.includes('--selftest')) {
  selftest(theme);
  process.exit(0);
}

const failures = scan(theme);
if (failures.length === 0) {
  console.log(`✓ no dead colour utilities (${theme.valid.size} valid names from tailwind.config.js)`);
  process.exit(0);
}

console.error(`✗ ${failures.length} colour utilit${failures.length === 1 ? 'y' : 'ies'} Tailwind will not generate:\n`);
for (const { file, line, cls, value } of failures) {
  console.error(`  ${file}:${line}  ${cls}`);
  console.error(`      "${value}" is not a colour in tailwind.config.js. Did you mean: ${nearest(value, theme.valid).join(', ')}?`);
}
console.error(
  `\nThese emit no CSS. A dead bg-* renders transparent; a dead border-* inherits preflight's #E5E7EB\nand looks deliberate. Fix the class, or add the key to ritmofit_design_system/tokens.json first.`,
);
process.exit(1);
