// Render the three iOS AppIcon variants from icon.svg.
//
//   npx playwright install chromium   # one-time
//   node render.mjs
//
// icon.svg is the single source of truth: it carries the light/dark/tinted
// palettes as CSS custom properties keyed off the root element's class. This
// script loads the SVG, toggles that class, and screenshots each variant at
// 1024x1024 — the sizes the iOS AppIcon.appiconset expects.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const variants = [
  ['', 'AppIcon.png'], // light / default
  ['dark', 'AppIcon-Dark.png'],
  ['tinted', 'AppIcon-Tinted.png'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
await page.goto('file://' + join(here, 'icon.svg'), { waitUntil: 'networkidle' });
for (const [cls, out] of variants) {
  await page.evaluate((c) => document.documentElement.setAttribute('class', c), cls);
  await page.waitForTimeout(120);
  const el = await page.$('svg');
  await el.screenshot({ path: join(here, out) });
  console.log('wrote', out);
}
await browser.close();
