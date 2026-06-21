// design-sync build inputs (cfg.buildCmd). Run from the repo root.
//
// The RitmoFit "design system" is a token + Tailwind layer on top of the web
// app — there is no compiled component-library dist. This script produces the
// two deterministic inputs the converter consumes:
//
//   1. apps/web/.ds-styles.css — the app's stylesheet COMPILED (Tailwind +
//      inlined tokens.css/fonts.css + the rf-* recipe classes), so the
//      converter (which never runs Tailwind) has real CSS for cssEntry. Font
//      url()s are rewritten from the app's site-absolute `/fonts/..` to a path
//      the converter's font extractor can resolve under apps/web.
//   2. apps/web/.ds-entry.tsx — a barrel re-exporting ONLY the curated
//      components, so the IIFE bundle is those six (+ their deps), not the
//      whole app (the converter's synth-entry would `export *` every src file).
//
// Both outputs are gitignored and regenerated here, so a re-sync is one command.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd) => execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });

// The curated, reusable/presentational components (the design-sync scope).
const COMPONENTS = [
  'Dialog',
  'IntensityRibbon',
  'IntensityReadout',
  'TimelineStrip',
  'LiveTimeline',
];

// 1a. Regenerate tokens.css from tokens.json (single source of truth).
run('pnpm --filter @ritmofit/web tokens');

// 1b. Compile the app stylesheet (Tailwind inlines @import of tokens/fonts).
const cssOut = 'apps/web/.ds-styles.css';
run(
  `./apps/web/node_modules/.bin/tailwindcss ` +
    `-c .design-sync/tailwind.sync.config.mjs ` +
    `-i apps/web/src/index.css -o ${cssOut} --minify`,
);

// 1c. Rewrite font url()s so the converter's extractor can resolve them under
// apps/web (it ignores site-absolute "/fonts/.." — those resolve to FS root).
const cssPath = resolve(repoRoot, cssOut);
const css = readFileSync(cssPath, 'utf8').replaceAll('url(/fonts/', 'url(./public/fonts/');
writeFileSync(cssPath, css);

// 2. Barrel entry exporting only the curated components.
const barrel =
  COMPONENTS.map((c) => `export { ${c} } from './src/components/${c}';`).join('\n') + '\n';
writeFileSync(resolve(repoRoot, 'apps/web/.ds-entry.tsx'), barrel);

console.error(`\n[build-inputs] wrote ${cssOut} and apps/web/.ds-entry.tsx (${COMPONENTS.length} components)`);
