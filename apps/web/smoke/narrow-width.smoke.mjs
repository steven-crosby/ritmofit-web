/**
 * Narrow-width (390×844) browser smoke for the instructor UI.
 *
 * Covers REVIEW.md's still-open manual checks that jsdom can't (it has no
 * layout): horizontal-overflow at a phone viewport and real modal focus
 * management (focus moves in, traps, returns; background goes inert).
 *
 * Prereqs: local API on :8787 and web on :5173 (pnpm dev:api / pnpm dev:web),
 * with MOCK_PROVIDERS=true and no RESEND_API_KEY (dev email fallback).
 *
 * Run (Playwright resolved from a scratch install so it isn't a repo dep yet):
 *   NODE_PATH=/tmp/rf-smoke/node_modules node apps/web/smoke/narrow-width.smoke.mjs
 *
 * Exits non-zero if any check fails. Screenshots land in apps/web/smoke/shots/.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Resolve Playwright from a repo dep if present, else a scratch install
// (PLAYWRIGHT_BASE points at a dir whose node_modules has playwright).
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  const base = process.env.PLAYWRIGHT_BASE ?? '/tmp/rf-smoke/package.json';
  ({ chromium } = createRequire(base)('playwright'));
}

const WEB = process.env.SMOKE_WEB_URL ?? 'http://localhost:5173';
const VIEWPORT = { width: 390, height: 844 };
const shotsDir = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(shotsDir, { recursive: true });

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

/** Horizontal overflow of the document at the current viewport (px, >0 = bad). */
const overflowPx = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function checkNoOverflow(page, label) {
  const px = await overflowPx(page);
  if (px <= 1) pass(`no-overflow:${label}`, `${px}px`);
  else fail(`no-overflow:${label}`, `${px}px horizontal overflow`);
}

/** Exercise one dialog opened by clicking `triggerName`; `dialogName` is its aria-label. */
async function checkDialog(page, triggerName, dialogName) {
  const trigger = page.getByRole('button', { name: triggerName, exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: dialogName });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });

  // Focus moved into the dialog.
  const focusInside = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return !!d && d.contains(document.activeElement) && document.activeElement !== document.body;
  });
  if (focusInside) pass(`focus-in:${triggerName}`);
  else fail(`focus-in:${triggerName}`, 'active element not inside dialog on open');

  // Background marked inert + aria-hidden.
  const inert = await page.evaluate(() => {
    const r = document.getElementById('root');
    return !!r && r.hasAttribute('inert') && r.getAttribute('aria-hidden') === 'true';
  });
  if (inert) pass(`inert-bg:${triggerName}`);
  else fail(`inert-bg:${triggerName}`, '#root not inert/aria-hidden');

  await checkNoOverflow(page, `dialog:${triggerName}`);
  await page.screenshot({ path: join(shotsDir, `dialog-${triggerName.toLowerCase()}.png`) });

  // Focus trap: Tab many times stays inside the dialog.
  let trapped = true;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      document.querySelector('[role="dialog"]').contains(document.activeElement),
    );
    if (!inside) {
      trapped = false;
      break;
    }
  }
  if (trapped) pass(`trap:${triggerName}`);
  else fail(`trap:${triggerName}`, 'focus escaped the dialog on Tab');

  // Escape closes and returns focus to the trigger.
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached', timeout: 5000 });
  const returned = await page.evaluate(
    (name) => document.activeElement?.textContent?.trim() === name,
    triggerName,
  );
  if (returned) pass(`focus-return:${triggerName}`);
  else fail(`focus-return:${triggerName}`, 'focus not returned to trigger after close');
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
try {
  // 1. Sign up a fresh instructor.
  await page.goto(WEB, { waitUntil: 'networkidle' });
  await checkNoOverflow(page, 'login');
  await page.getByText('Need an account? Sign up').click();
  const email = `smoke+${Date.now()}@example.com`;
  await page.getByLabel('Name').fill('Smoke Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('smoke-pass-1234');
  await page.getByRole('button', { name: 'Create account' }).click();

  // 2. Land on the dashboard.
  await page.getByRole('button', { name: 'Explore', exact: true }).waitFor({ timeout: 10000 });
  await checkNoOverflow(page, 'dashboard-empty');
  await page.screenshot({ path: join(shotsDir, 'dashboard-empty.png') });

  // 3. Create a class and open it.
  const titleInput = page.getByLabel('New class title');
  await titleInput.fill('Narrow Width Smoke');
  await titleInput.press('Enter');
  const classBtn = page.getByRole('button', { name: /Narrow Width Smoke/ });
  await classBtn.waitFor({ timeout: 10000 });
  await classBtn.click();

  // 4. Add a manual track (the form lives in a collapsed "Add manually" details).
  await page.getByText('Add manually').click();
  await page.getByLabel('Track title').fill('Smoke Anthem');
  await page.getByLabel('Track artist').fill('The Testers');
  await page.getByLabel('Track duration in milliseconds').fill('180000');
  await page.getByRole('button', { name: 'Add track' }).click();
  await page.getByText('Smoke Anthem').waitFor({ timeout: 10000 });
  await checkNoOverflow(page, 'dashboard-with-track');
  if (process.env.SMOKE_DIAG) {
    const offenders = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > vw + 1)
        .slice(0, 20)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 3).join('.')} right=${Math.round(r.right)} w=${Math.round(r.width)}`;
        });
    });
    console.log('--- overflow offenders ---\n' + offenders.join('\n') + '\n---');
  }
  await page.screenshot({ path: join(shotsDir, 'dashboard-with-track.png'), fullPage: true });

  // 5. Exercise the nav dialogs (the adopted Dialog primitive).
  await checkDialog(page, 'Explore', 'Explore public classes');
  await checkDialog(page, 'Teams', 'Manage teams');
  await checkDialog(page, 'Connections', 'Music connections');
} catch (err) {
  fail('harness', err.message);
  await page.screenshot({ path: join(shotsDir, 'failure.png') }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results)
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
