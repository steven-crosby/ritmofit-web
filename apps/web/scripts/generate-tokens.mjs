// Generate CSS custom properties from the design system's tokens.json.
// tokens.json is the single source of truth (README): change values there,
// never in component code. Emits the resolved DARK theme as --rf-* vars under
// :root, plus an OPT-IN [data-theme="light"] block that overrides only the
// theme-dependent slots (semantic colors + light glass/shadow). Dark is the
// default; nothing toggles light unless a [data-theme="light"] is set, so the
// dark-first app is unaffected. Live mode stays dark in both themes (bg/live).
//
// Run: pnpm --filter @ritmofit/web tokens   (auto-runs on dev/build)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const tokensPath = resolve(repoRoot, 'ritmofit_design_system/tokens.json');
const outPath = resolve(here, '../src/styles/tokens.css');

const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

const getByPath = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

// Resolve a raw token value (ref string, semantic slot, intensity/segment slot,
// or primitive) into a concrete CSS value for the given theme.
function resolveValue(val, theme) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const ref = val.match(/^\{(.+)\}$/);
    return ref ? resolveValue(getByPath(tokens, ref[1]), theme) : val;
  }
  if (val && typeof val === 'object') {
    if ('dark' in val || 'light' in val) return resolveValue(val[theme], theme);
    if ('value' in val) return resolveValue(val.value, theme); // intensity ramp
    if ('tint' in val) return resolveValue(val.tint, theme); // segment track
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

function emit(out, name, raw, theme) {
  const resolved = resolveValue(raw, theme);
  if (resolved === undefined || resolved === '') return;
  out.push(`  --rf-${name}: ${withUnit(name, resolved)};`);
}

// A node is a "leaf slot" when it directly holds a value rather than children.
const isLeafSlot = (v) =>
  v && typeof v === 'object' && ('dark' in v || 'light' in v || 'value' in v || 'tint' in v);

function walk(out, node, path, theme) {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    // *Light keys are the light-theme overrides (glass/shadow); they belong to the
    // [data-theme="light"] block, not :root — emitted explicitly below.
    if (key.endsWith('Light')) continue;
    const name = path ? `${path}-${key}` : key;
    if (Array.isArray(val)) continue; // e.g. ribbon.stops — built in code, not a var
    if (val && typeof val === 'object') {
      if (isLeafSlot(val)) emit(out, name, val, theme);
      else walk(out, val, name, theme);
    } else {
      emit(out, name, val, theme);
    }
  }
}

// ── Dark :root — the full token set (theme-independent + dark color values) ──
const lines = ['  color-scheme: dark;'];
walk(lines, tokens.color, 'color', 'dark');
walk(lines, tokens.typography, 'typography', 'dark');
walk(lines, tokens.radius, 'radius', 'dark');
walk(lines, tokens.space, 'space', 'dark');
walk(lines, tokens.surface, 'surface', 'dark');
walk(lines, tokens.motion, 'motion', 'dark');

// Canonical tempo aliases the rhythm system references directly (10-rhythm-system.md).
// --rf-bpm is the default/at-rest tempo from tokens.json (tempo.default-bpm); Live
// overrides it per playing track at runtime. --rf-beat derives the beat duration.
const defaultBpm = tokens.tempo?.['default-bpm'] ?? 120;
lines.push(`  --rf-bpm: ${defaultBpm};`);
lines.push('  --rf-beat: calc(60s / var(--rf-bpm, 120));');

// ── Opt-in [data-theme="light"] — only the theme-dependent slots flip ──
// Same var names as :root, so the existing Tailwind mappings pick up the light
// values automatically. Primitives, type, radius, spacing, motion, tempo, and the
// intensity/segment/ribbon colors are theme-independent and are NOT re-emitted.
const lightLines = ['  color-scheme: light;'];
walk(lightLines, tokens.color.semantic, 'color-semantic', 'light');
// Light glass + shadow overrides (canonical names so they override :root). peak-glow
// is theme-independent affect and is intentionally left to the dark value.
const g = tokens.surface.glass;
const s = tokens.surface.shadow;
lightLines.push(`  --rf-surface-glass-fill-subtle: ${g.fillLight.subtle};`);
lightLines.push(`  --rf-surface-glass-fill-default: ${g.fillLight.default};`);
lightLines.push(`  --rf-surface-glass-fill-strong: ${g.fillLight.strong};`);
lightLines.push(`  --rf-surface-glass-border: ${g.borderLight};`);
lightLines.push(`  --rf-surface-glass-highlight: ${g.highlightLight};`);
lightLines.push(`  --rf-surface-shadow-card: ${s.cardLight};`);
lightLines.push(`  --rf-surface-shadow-lifted: ${s.liftedLight};`);

const header =
  '/* GENERATED — do not edit by hand.\n' +
  ' * Source: ritmofit_design_system/tokens.json.\n' +
  ' * :root = dark (default); [data-theme="light"] = opt-in light overrides.\n' +
  ' * Regenerate: pnpm --filter @ritmofit/web tokens */\n';

mkdirSync(dirname(outPath), { recursive: true });
const css =
  `${header}\n` +
  `:root {\n${lines.join('\n')}\n}\n\n` +
  `[data-theme='light'] {\n${lightLines.join('\n')}\n}\n`;
writeFileSync(outPath, css);
console.log(
  `tokens.css: wrote ${lines.length} root + ${lightLines.length} light custom properties → ${outPath}`,
);
