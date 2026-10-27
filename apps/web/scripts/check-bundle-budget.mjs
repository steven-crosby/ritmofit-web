#!/usr/bin/env node
// Fails when the SPA entry chunk grows past its gzip budget.
//
// Vite only warns (at 500 kB raw), and the warning has been printing on every build,
// so nobody reads it. This gate measures what an instructor's phone actually downloads
// before the app can paint: every script `dist/index.html` loads, gzipped. Lazy chunks
// (Live Mode, the builder panels) are not counted; they load on demand.
//
// The budget is the entry size when the gate landed (171.56 kB gzip) plus about 5%.
// Raise it on purpose, in the same PR as the growth, with the reason in the PR body.
//
// Run after `vite build`: pnpm --filter @ritmofit/web bundle-budget [--selftest]

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(WEB_ROOT, 'dist');

export const BUDGET_GZIP_BYTES = 180 * 1000;

const kB = (bytes) => `${(bytes / 1000).toFixed(2)} kB`;

/** Scripts `index.html` loads at startup, as dist-relative paths. */
function entryScripts(html) {
  const scripts = [];
  for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
    const src = match[1];
    if (/^(https?:)?\/\//.test(src)) continue;
    // The service-worker registration shim is tiny and not part of the app bundle.
    if (src.includes('registerSW')) continue;
    scripts.push(src.replace(/^\//, ''));
  }
  return scripts;
}

/** Returns `{ ok, lines }` for the build in `distDir`. */
export function checkBudget(distDir, budget = BUDGET_GZIP_BYTES) {
  let html;
  try {
    html = readFileSync(join(distDir, 'index.html'), 'utf8');
  } catch {
    return { ok: false, lines: [`No ${join(distDir, 'index.html')}. Run vite build first.`] };
  }
  const scripts = entryScripts(html);
  if (scripts.length === 0) {
    return {
      ok: false,
      lines: ['index.html loads no local script, so there is nothing to measure.'],
    };
  }
  let total = 0;
  const lines = [];
  for (const script of scripts) {
    const raw = readFileSync(join(distDir, script));
    const gzip = gzipSync(raw, { level: 9 }).length;
    total += gzip;
    lines.push(`  ${script}  ${kB(raw.length)} raw, ${kB(gzip)} gzip`);
  }
  const ok = total <= budget;
  lines.push(
    ok
      ? `Entry ${kB(total)} gzip is within the ${kB(budget)} budget.`
      : `Entry ${kB(total)} gzip is over the ${kB(budget)} budget by ${kB(total - budget)}. ` +
          'Split the new code behind a lazy import, or raise BUDGET_GZIP_BYTES in ' +
          'scripts/check-bundle-budget.mjs with the reason in the PR.',
  );
  return { ok, lines };
}

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-budget-'));
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), contents);
  }
  return dir;
}

function selftest() {
  const html = (src) =>
    `<!doctype html><script type="module" crossorigin src="${src}"></script>` +
    '<script id="vite-plugin-pwa:register-sw" src="/registerSW.js"></script>';
  // Random bytes do not compress, so the gzip size tracks the raw size.
  const incompressible = (bytes) => randomBytes(Math.ceil((bytes * 3) / 4)).toString('base64');
  const cases = [
    {
      name: 'entry under budget passes',
      files: { 'index.html': html('/assets/index-a.js'), 'assets/index-a.js': 'console.log(1)' },
      shouldFail: false,
    },
    {
      name: 'inflated entry fails',
      files: {
        'index.html': html('/assets/index-b.js'),
        'assets/index-b.js': incompressible(BUDGET_GZIP_BYTES * 1.4),
        'registerSW.js': incompressible(BUDGET_GZIP_BYTES * 2),
      },
      shouldFail: true,
    },
    {
      name: 'large lazy chunk is not counted',
      files: {
        'index.html': html('/assets/index-c.js'),
        'assets/index-c.js': 'import("./Live-c.js")',
        'assets/Live-c.js': incompressible(BUDGET_GZIP_BYTES * 2),
      },
      shouldFail: false,
    },
    { name: 'missing build fails', files: {}, shouldFail: true },
    {
      name: 'index.html with no local script fails',
      files: { 'index.html': '<!doctype html><p>empty</p>' },
      shouldFail: true,
    },
  ];
  let failures = 0;
  for (const testCase of cases) {
    const dir = fixture(testCase.files);
    try {
      const { ok } = checkBudget(dir);
      const passed = ok !== testCase.shouldFail;
      if (!passed) failures += 1;
      console.log(`${passed ? 'ok  ' : 'FAIL'}  ${testCase.name}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  if (failures > 0) {
    console.error(`bundle-budget selftest: ${failures} of ${cases.length} cases wrong.`);
    process.exit(1);
  }
  console.log(`bundle-budget selftest: ${cases.length} cases ok.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selftest')) {
    selftest();
  } else {
    const { ok, lines } = checkBudget(DIST);
    for (const line of lines) (ok ? console.log : console.error)(line);
    if (!ok) process.exit(1);
  }
}
