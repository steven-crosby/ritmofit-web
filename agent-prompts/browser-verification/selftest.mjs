// Prove the measurement harness before trusting a single number it produces.
//
// This is not ceremony. The 2026-07-24 design audit produced two false findings from
// a harness nobody validated: it read `outline` without `box-shadow` (reporting "no
// focus ring" on controls that had one), and it walked ancestors for a background
// colour without compositing gradient stops (reporting ~1:1 for ink-on-copper, which
// actually measures 5.34-7.04:1). Both errors are invisible in the output — the
// numbers look plausible either way.
//
// So: render swatches whose correct ratio is computable from tokens.json, measure them
// through the harness, and require agreement. Expectations are DERIVED, never hardcoded,
// so this cannot rot as tokens change.
//
//   node agent-prompts/browser-verification/selftest.mjs
//
// Requires Chrome on :9222 (see README) and any page open — it injects its own markup.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { firstPage } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, '..', '..', 'ritmofit_design_system', 'tokens.json'), 'utf8'));

const prim = tokens.color.primitive;
const sem = tokens.color.semantic;
const hex = (v) => {
  const m = typeof v === 'string' && v.match(/^\{color\.primitive\.(\w+)\.(\w+)\}$/);
  return m ? prim[m[1]][m[2]] : v;
};
const role = (path, variant = 'dark') => hex(path.split('.').reduce((o, k) => o[k], sem)[variant]);

// Same maths as ritmofit_design_system/scripts/check-contrast.mjs.
const toRGB = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const lin = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = toRGB(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (fg, bg) => {
  const [a, b] = [lum(fg) + 0.05, lum(bg) + 0.05];
  return Math.max(a, b) / Math.min(a, b);
};

const live = role('bg.live');
const base = role('bg.base');

// Flat backdrops, plus two GRADIENTS whose worst stop is what the harness must find.
const cases = [
  { name: 'text/primary on bg/live', fg: role('text.primary'), bg: live },
  { name: 'text/secondary on bg/live', fg: role('text.secondary'), bg: live },
  { name: 'text/tertiary on bg/live', fg: role('text.tertiary'), bg: live },
  { name: 'text/tertiary on bg/base', fg: role('text.tertiary'), bg: base },
  { name: 'live supporting on bg/live', fg: role('live.text-supporting'), bg: live },
  { name: 'live danger on bg/live', fg: role('live.danger'), bg: live },
  { name: 'state/danger on bg/live', fg: role('state.danger'), bg: live },
  {
    name: 'ink on standard copper gradient',
    fg: role('text.on-accent'),
    gradient: [hex(prim.copper['400']), hex(prim.copper['500'])],
  },
  {
    name: 'ink on Live copper gradient',
    fg: role('text.on-accent'),
    gradient: [role('live.primary-from'), role('live.primary-to')],
  },
];

// A gradient's worst case is its lowest-contrast stop — the label rides all of it.
const expected = (c) =>
  c.gradient ? Math.min(...c.gradient.map((stop) => ratio(c.fg, stop))) : ratio(c.fg, c.bg);

const page = await firstPage();
await page.eval(readFileSync(join(here, 'measure.js'), 'utf8'));
// Built node-by-node rather than via innerHTML: pages that set Trusted Types (the
// Chrome new-tab page does) reject innerHTML outright.
const measured = await page.eval(`
  const cases = ${JSON.stringify(cases)};
  const host = document.createElement('div');
  host.id = '__harness_selftest';
  for (const c of cases) {
    const row = document.createElement('div');
    if (c.gradient) {
      row.style.backgroundImage = 'linear-gradient(170deg,' + c.gradient[0] + ',' + c.gradient[1] + ')';
      row.style.backgroundColor = 'transparent';
    } else {
      row.style.background = c.bg;
    }
    const span = document.createElement('span');
    span.style.color = c.fg;
    span.style.fontSize = '14px';
    span.textContent = c.name;
    row.appendChild(span);
    host.appendChild(row);
  }
  document.body.appendChild(host);
  const rows = window.__measure.contrast('#__harness_selftest');
  host.remove();
  return rows.map(r => ({ text: r.text, ratio: r.ratio }));
`);

let bad = 0;
console.log('measured  expected  case');
for (const c of cases) {
  const got = measured.find((m) => m.text === c.name);
  const want = expected(c);
  const ok = got && Math.abs(got.ratio - want) <= 0.05;
  if (!ok) bad++;
  console.log(
    `${String(got ? got.ratio : '—').padEnd(9)} ${want.toFixed(2).padEnd(9)} ${ok ? '✓' : '✗'} ${c.name}`,
  );
}

page.close();
if (bad) {
  console.error(`\n✗ harness disagrees with tokens.json on ${bad} case(s) — do NOT trust its output`);
  process.exit(1);
}
console.log(`\n✓ harness reproduces tokens.json on all ${cases.length} cases, gradients included`);
