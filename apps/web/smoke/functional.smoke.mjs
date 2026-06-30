/**
 * Functional browser smoke for the instructor workflow (desktop, 1280×800).
 *
 * Covers the REVIEW.md Follow-Up checklist flows jsdom can't: auth
 * (sign-up / sign-out / sign-in / session-clear), the class lifecycle
 * (create / add track / reopen / publish / share / copy / delete / live),
 * provider connect / search / import / disconnect (mock seam), rapid
 * class-switch, and network-failure handling.
 *
 * Prereqs + how to run: see ./README.md. Needs the local stack with
 * MOCK_PROVIDERS=true. Exits non-zero on any failure; screenshots → ./shots/.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  const base = process.env.PLAYWRIGHT_BASE ?? '/tmp/rf-smoke/package.json';
  ({ chromium } = createRequire(base)('playwright'));
}

const WEB = process.env.SMOKE_WEB_URL ?? 'http://localhost:5173';
const shotsDir = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(shotsDir, { recursive: true });

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });
const shot = (page, name) =>
  page.screenshot({ path: join(shotsDir, `fn-${name}.png`) }).catch(() => {});

/**
 * Signed-out "/" is the public MarketingPage now, not Login. Click its sign-in CTA
 * to reach the auth form and wait for the sign-up toggle so the form is interactive.
 */
async function openLogin(page) {
  await page.locator('#marketing-signin-btn').click();
  await page.getByText('Need an account? Sign up').waitFor({ timeout: 10000 });
}

/**
 * A fresh signup opens the onboarding tutorial dialog over the dashboard. Close it
 * so the dashboard is interactive. No-op if it isn't shown (already dismissed).
 */
async function dismissOnboarding(page) {
  const dlg = page.getByRole('dialog', { name: 'New instructor tutorial video' });
  try {
    await dlg.waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    return;
  }
  await page.getByRole('button', { name: 'Close tutorial video' }).click();
  await dlg.waitFor({ state: 'detached', timeout: 5000 });
}

/** Sign-out now lives inside the Account dialog, not the top-level header. */
async function signOut(page) {
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Account settings' });
  await dlg.waitFor({ timeout: 10000 });
  // The click unmounts the dialog + dashboard as the session clears, which can race
  // the click's post-action checks; assert the outcome instead. Sign-out drops
  // straight onto the Login form (the app keeps showLogin set), not marketing.
  await dlg.getByRole('button', { name: 'Sign out', exact: true }).click({ noWaitAfter: true });
  await page.getByText('Need an account? Sign up').waitFor({ timeout: 15000 });
}

/** Run one named section, recording pass/fail and never aborting the suite. */
async function section(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err.message.split('\n')[0]);
    await shot(page, `fail-${name.replace(/[^a-z0-9]+/gi, '-')}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const email = `smoke+${Date.now()}@example.com`;
const password = 'smoke-pass-1234';

try {
  // ── Auth: sign up ───────────────────────────────────────────────────────
  await section('auth:signup', async () => {
    await page.goto(WEB, { waitUntil: 'networkidle' });
    await openLogin(page);
    await page.getByText('Need an account? Sign up').click();
    await page.getByLabel('Name').fill('Smoke Tester');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await dismissOnboarding(page);
    // The signed-in dashboard surfaces an Account button (sign-out lives inside it).
    await page.getByRole('button', { name: 'Account', exact: true }).waitFor({ timeout: 10000 });
  });

  // ── Auth: sign out → sign in ────────────────────────────────────────────
  await section('auth:signout', async () => {
    // Sign-out drops straight onto the Login form (showLogin stays set).
    await signOut(page);
  });
  await section('auth:signin', async () => {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Account', exact: true }).waitFor({ timeout: 10000 });
  });

  // ── Class lifecycle: create + open + add a track ────────────────────────
  await section('class:create', async () => {
    const t = page.getByLabel('New class title');
    await t.fill('Functional Smoke A');
    await t.press('Enter');
    // .first() targets the row toggle; the row's View/Copy actions share the title.
    await page
      .getByRole('button', { name: /Functional Smoke A/ })
      .first()
      .click();
    await page.getByRole('heading', { name: 'Functional Smoke A' }).waitFor({ timeout: 10000 });
  });
  await section('class:add-track', async () => {
    await page.getByText('Add manually').click();
    await page.getByLabel('Track title').fill('Smoke Anthem');
    await page.getByLabel('Track artist').fill('The Testers');
    await page.getByLabel('Track duration in minutes and seconds').fill('3:00');
    await page.getByRole('button', { name: 'Add track' }).click();
    await page.getByText('Smoke Anthem').waitFor({ timeout: 10000 });
  });

  // ── Reopen (reload + re-select): the track persisted ────────────────────
  await section('class:reopen', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: /Functional Smoke A/ })
      .first()
      .click();
    await page.getByText('Smoke Anthem').waitFor({ timeout: 10000 });
  });

  // ── Publish (edit visibility) ───────────────────────────────────────────
  await section('class:publish', async () => {
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page
      .getByRole('button', { name: 'Make private', exact: true })
      .waitFor({ timeout: 10000 });
  });

  // ── Share dialog opens and is usable ────────────────────────────────────
  await section('class:share-dialog', async () => {
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: /Share Functional Smoke A/ });
    await dlg.waitFor({ timeout: 10000 });
    await page.getByLabel('Invite by email').fill('teammate@example.com');
    await shot(page, 'share-dialog');
    await page.keyboard.press('Escape');
    await dlg.waitFor({ state: 'detached', timeout: 5000 });
  });

  // ── Copy via Explore (the class is now public) ──────────────────────────
  await section('class:copy', async () => {
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Explore public classes' });
    await dlg.waitFor({ timeout: 10000 });
    const row = page.getByRole('listitem').filter({ hasText: 'Functional Smoke A' }).first();
    await row.getByRole('button', { name: 'Save a copy' }).click();
    // onCopied closes Explore and opens the copy; the copy lands in the library.
    await dlg.waitFor({ state: 'detached', timeout: 10000 });
  });

  // ── Live mode: run + exit (track has a duration, so it's enabled) ────────
  await section('class:live', async () => {
    await page
      .getByRole('button', { name: /Functional Smoke A/ })
      .first()
      .click();
    await page.getByRole('button', { name: /Run live/ }).click();
    await page.getByRole('button', { name: 'Exit', exact: true }).waitFor({ timeout: 10000 });
    await shot(page, 'live');
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
  });

  // ── Providers: connect (mock), search, import, disconnect ───────────────
  await section('provider:connect', async () => {
    await page.getByRole('button', { name: 'Connections', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Music connections' });
    await dlg.waitFor({ timeout: 10000 });
    // SoundCloud is the connectable provider; the mock seam links immediately.
    // `exact` avoids matching the "Close connections dialog" button (substring).
    await dlg.getByRole('button', { name: 'Connect', exact: true }).first().click();
    // Connected status renders the ✓ glyph and label as separate nodes; the row's
    // Disconnect button is the unambiguous "now connected" signal.
    await dlg.getByRole('button', { name: 'Disconnect', exact: true }).first().waitFor({ timeout: 10000 });
    await dlg.getByRole('button', { name: 'Close connections dialog' }).click();
    await dlg.waitFor({ state: 'detached', timeout: 5000 });
  });
  await section('provider:search-import', async () => {
    await page
      .getByRole('button', { name: /Functional Smoke A/ })
      .first()
      .click();
    const search = page.getByPlaceholder(/Search SoundCloud/);
    await search.fill('instinct'); // matches the SoundCloud mock catalog ("Instinct" — Lane 8)
    // Mock catalog returns deterministic results; import the first. The result
    // import buttons are labeled "Add <title> by <artist>" — the " by " guards
    // against matching "Add segment" / "Add track".
    const add = page.getByRole('button', { name: /^Add .+ by / }).first();
    await add.waitFor({ timeout: 10000 });
    await add.click();
    // Import succeeds → the new track joins the class track list (the search
    // results reset afterward, so assert on the list, not the result button).
    await page.getByText('Instinct').waitFor({ timeout: 10000 });
  });
  await section('provider:disconnect', async () => {
    await page.getByRole('button', { name: 'Connections', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'Music connections' });
    await dlg.waitFor({ timeout: 10000 });
    await dlg.getByRole('button', { name: 'Disconnect', exact: true }).first().click();
    await dlg.getByRole('button', { name: 'Confirm', exact: true }).click();
    await dlg
      .getByRole('button', { name: 'Connect', exact: true })
      .first()
      .waitFor({ timeout: 10000 });
    await dlg.getByRole('button', { name: 'Close connections dialog' }).click();
    await dlg.waitFor({ state: 'detached', timeout: 5000 });
  });

  // ── Rapid class-switch: no crash, correct header wins ───────────────────
  await section('rapid-switch', async () => {
    const t = page.getByLabel('New class title');
    await t.fill('Functional Smoke B');
    await t.press('Enter');
    await page
      .getByRole('button', { name: /Functional Smoke B/ })
      .first()
      .waitFor({ timeout: 10000 });
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole('button', { name: /Functional Smoke A/ })
        .first()
        .click();
      await page
        .getByRole('button', { name: /Functional Smoke B/ })
        .first()
        .click();
    }
    // Whichever was clicked last (B) must be the header shown — no stale class.
    await page.getByRole('heading', { name: 'Functional Smoke B' }).waitFor({ timeout: 10000 });
  });

  // ── Network failure: a failed class load surfaces an error, not a crash ──
  await section('network-failure', async () => {
    await page.route('**/api/v1/classes/*/run-payload*', (r) => r.abort());
    await page.route('**/api/v1/classes/*/tracks*', (r) => r.abort());
    await page
      .getByRole('button', { name: /Functional Smoke A/ })
      .first()
      .click();
    // The detail pane shows an error + Retry rather than white-screening.
    await page.getByRole('button', { name: 'Retry class' }).waitFor({ timeout: 10000 });
    await page.unroute('**/api/v1/classes/*/run-payload*');
    await page.unroute('**/api/v1/classes/*/tracks*');
    await page.getByRole('button', { name: 'Retry class' }).click();
    await page.getByText('Smoke Anthem').waitFor({ timeout: 10000 });
  });

  // ── Delete a class ──────────────────────────────────────────────────────
  await section('class:delete', async () => {
    await page
      .getByRole('button', { name: /Functional Smoke B/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete class', exact: true }).click();
    await page
      .getByRole('button', { name: /Functional Smoke B/ })
      .first()
      .waitFor({ state: 'detached', timeout: 10000 });
  });
} catch (err) {
  fail('harness', err.message.split('\n')[0]);
  await shot(page, 'failure');
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results)
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
