// Generate CSS custom properties from the design system's tokens.json.
// tokens.json is the single source of truth (README): change values there,
// never in component code. This emits the resolved DARK theme as --rf-* vars.
//
// Run: pnpm --filter @ritmofit/web tokens   (auto-runs on dev/build)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const tokensPath = resolve(repoRoot, 'ritmofit_design_system/tokens.json');
const outPath = resolve(here, '../src/styles/tokens.css');

const THEME = 'dark';
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

const getByPath = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

// Resolve a raw token value (ref string, semantic slot, intensity/segment slot,
// or primitive) into a concrete CSS value.
function resolveValue(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const ref = val.match(/^\{(.+)\}$/);
    return ref ? resolveValue(getByPath(tokens, ref[1])) : val;
  }
  if (val && typeof val === 'object') {
    if ('dark' in val || 'light' in val) return resolveValue(val[THEME]);
    if ('value' in val) return resolveValue(val.value); // intensity ramp
    if ('tint' in val) return resolveValue(val.tint); // segment track
  }
  return undefined;
}

const PX_PREFIXES = ['space', 'radius', 'surface-glass-blur'];
const MS_PREFIXES = ['motion-duration'];
function withUnit(name, value) {
  if (typeof value !== 'number') return value;
  if (PX_PREFIXES.some((p) => name.startsWith(p))) return `${value}px`;
  if (MS_PREFIXES.some((p) => name.startsWith(p))) return `${value}ms`;
  return String(value);
}

const lines = [];
function emit(name, raw) {
  const resolved = resolveValue(raw);
  if (resolved === undefined || resolved === '') return;
  lines.push(`  --rf-${name}: ${withUnit(name, resolved)};`);
}

// A node is a "leaf slot" when it directly holds a value rather than children.
const isLeafSlot = (v) =>
  v && typeof v === 'object' && ('dark' in v || 'light' in v || 'value' in v || 'tint' in v);

function walk(node, path) {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    const name = path ? `${path}-${key}` : key;
    if (Array.isArray(val)) continue; // e.g. ribbon.stops — built in code, not a var
    if (val && typeof val === 'object') {
      if (isLeafSlot(val)) emit(name, val);
      else walk(val, name);
    } else {
      emit(name, val);
    }
  }
}

walk(tokens.color, 'color');
walk(tokens.typography, 'typography');
walk(tokens.radius, 'radius');
walk(tokens.space, 'space');
walk(tokens.surface, 'surface');
walk(tokens.motion, 'motion');

// Canonical tempo aliases the rhythm system references directly (10-rhythm-system.md).
lines.push('  --rf-bpm: 120;');
lines.push('  --rf-beat: calc(60s / var(--rf-bpm, 120));');

const header =
  '/* GENERATED — do not edit by hand.\n' +
  ' * Source: ritmofit_design_system/tokens.json (dark theme).\n' +
  ' * Regenerate: pnpm --filter @ritmofit/web tokens */\n';

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${header}\n:root {\n${lines.join('\n')}\n}\n`);
console.log(`tokens.css: wrote ${lines.length} custom properties → ${outPath}`);
