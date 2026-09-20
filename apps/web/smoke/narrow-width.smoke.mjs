/**
 * Responsive browser smoke for the instructor UI.
 *
 * Covers REVIEW.md / SPC-20 checks that jsdom can't (it has no layout):
 * horizontal overflow across 1280 / 953 / 680 / 390 / 320 and 200% zoom,
 * plus real modal focus management (focus moves in, traps, returns;
 * background goes inert).
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
const DEFAULT_VIEWPORT = {
  width: Number(process.env.SMOKE_WIDTH ?? 390),
  height: Number(process.env.SMOKE_HEIGHT ?? 844),
};
const VIEWPORTS = [
  { width: 1280, height: 800, label: '1280' },
  { width: 953, height: 800, label: '953' },
  { width: 680, height: 800, label: '680' },
  { width: 390, height: 844, label: '390' },
  { width: 320, height: 568, label: '320' },
  // 200% zoom of a 1280 CSS-pixel workstation is a 640 CSS-pixel layout.
  // Measuring `document.zoom = 2` against clientWidth is not layout-honest
  // (getBoundingClientRect scales while clientWidth does not).
  { width: 640, height: 400, label: '200pct' },
];
const shotsDir = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(shotsDir, { recursive: true });

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

/** Horizontal overflow of the document at the current viewport (px, >0 = bad). */
const overflowPx = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function overflowOffenders(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('*')]
      .filter((el) => el.getBoundingClientRect().right > vw + 1)
      .slice(0, 20)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cls = (el.className || '').toString().split(' ').slice(0, 4).join('.');
        return `${el.tagName.toLowerCase()}.${cls} right=${Math.round(r.right)} w=${Math.round(r.width)}`;
      });
  });
}

async function checkNoOverflow(page, label) {
  const px = await overflowPx(page);
  if (px <= 1) pass(`no-overflow:${label}`, `${px}px`);
  else {
    const offenders = await overflowOffenders(page);
    fail(
      `no-overflow:${label}`,
      `${px}px horizontal overflow${offenders.length ? `; ${offenders[0]}` : ''}`,
    );
    if (process.env.SMOKE_DIAG) {
      console.log(`--- overflow offenders (${label}) ---\n${offenders.join('\n')}\n---`);
    }
  }
}

/**
 * The intensity picker is a size container whose five flex children need a
 * definite inline size. A widthless container can collapse to 0px in a real
 * browser even though its content and accessibility tree still exist.
 */
async function checkIntensityControlLayout(page, suffix = '') {
  const tag = suffix ? `:${suffix}` : '';
  const metrics = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('.rf-zone-control')].filter((control) => {
      const inspector = control.closest('section[aria-label^="Track inspector"]');
      const inspectorRect = inspector?.getBoundingClientRect();
      return inspectorRect != null && inspectorRect.width > 0 && inspectorRect.height > 0;
    });
    return controls.map((control) => {
      const rect = control.getBoundingClientRect();
      const parentWidth = control.parentElement?.getBoundingClientRect().width ?? 0;
      const groupWidth =
        control.querySelector('[role="group"]')?.getBoundingClientRect().width ?? 0;
      const summaryWidth = control.querySelector('p')?.getBoundingClientRect().width ?? 0;
      const wordDisplays = [...control.querySelectorAll('.rf-zone-word')].map(
        (word) => getComputedStyle(word).display,
      );
      return { width: rect.width, parentWidth, groupWidth, summaryWidth, wordDisplays };
    });
  });

  if (metrics.length !== 1) {
    fail(
      `intensity-control:one-visible${tag}`,
      `expected 1 visible control, saw ${metrics.length}`,
    );
    return;
  }

  const [metric] = metrics;
  const fillsRow = metric.width > 0 && metric.width >= metric.parentWidth - 1;
  const childrenHaveWidth = metric.groupWidth > 2 && metric.summaryWidth > 0;
  if (fillsRow && childrenHaveWidth) {
    pass(
      `intensity-control:definite-width${tag}`,
      `control=${Math.round(metric.width)}px parent=${Math.round(metric.parentWidth)}px`,
    );
  } else {
    fail(
      `intensity-control:definite-width${tag}`,
      `control=${metric.width}px parent=${metric.parentWidth}px group=${metric.groupWidth}px summary=${metric.summaryWidth}px`,
    );
  }

  const wordsHidden = metric.wordDisplays.every((display) => display === 'none');
  const shouldHideWords = metric.width <= 319;
  if (wordsHidden === shouldHideWords) {
    pass(
      `intensity-control:container-query${tag}`,
      `${Math.round(metric.width)}px container; words ${wordsHidden ? 'hidden' : 'shown'}`,
    );
  } else {
    fail(
      `intensity-control:container-query${tag}`,
      `${Math.round(metric.width)}px container; words unexpectedly ${wordsHidden ? 'hidden' : 'shown'}`,
    );
  }
}

/** Open manual track entry. Empty classes expose a "Manual track" start card
 *  that opens the hidden source panel; later adds use "Add music" + the
 *  "Add manually" disclosure. */
async function openManualEntry(page) {
  const manualTrack = page.getByRole('button', { name: 'Manual track' });
  if (await manualTrack.isVisible().catch(() => false)) {
    await manualTrack.click();
  } else {
    const addMusic = page.getByRole('button', { name: 'Add music' });
    if (await addMusic.isVisible().catch(() => false)) {
      await addMusic.click();
    }
    const summary = page.locator('#main-content details > summary').filter({
      hasText: /^Add manually$/,
    });
    await summary.waitFor({ state: 'visible', timeout: 10000 });
    await summary.evaluate((node) => {
      node.parentElement.open = true;
    });
  }
  await page
    .locator('details[open] input[aria-label="Track title"]')
    .waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Signed-out "/" is the public MarketingPage now, not Login. Click its sign-in CTA
 * to reach the auth form. Local open-access and invite-only copy both exist;
 * AUTH-A11Y also added a "Show password" control whose accessible name contains
 * "password", so the password field is targeted by id.
 */
async function openLogin(page) {
  await page.locator('#marketing-signin-btn').click();
  await page.getByRole('button', { name: /Need an (invited )?account\? Sign up/ }).waitFor({
    timeout: 10000,
  });
}

async function fillSignup(page, email) {
  await page.getByRole('button', { name: /Need an (invited )?account\? Sign up/ }).click();
  await page.getByLabel('Name').fill('Smoke Tester');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill('smoke-pass-1234');
  await page.getByRole('button', { name: 'Create account' }).click();
}

/**
 * A fresh signup opens the four-count onboarding dialog over the dashboard.
 * Close it so the dashboard is interactive. No-op if it isn't shown.
 */
async function dismissOnboarding(page) {
  const dlg = page.getByRole('dialog', { name: 'New instructor four-count tutorial' });
  try {
    await dlg.waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    return;
  }
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await dlg.waitFor({ state: 'detached', timeout: 5000 });
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
    (name) =>
      document.activeElement?.getAttribute('aria-label') === name ||
      document.activeElement?.textContent?.trim() === name,
    triggerName,
  );
  if (returned) pass(`focus-return:${triggerName}`);
  else fail(`focus-return:${triggerName}`, 'focus not returned to trigger after close');
}

async function goToClassesWithTrack(page) {
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  const runLive = page.getByRole('button', { name: /Run live/ }).first();
  if (await runLive.isVisible().catch(() => false)) return;
  // The Classes destination clears the open builder; reopen the smoke class.
  const classBtn = page.getByRole('button', { name: /Narrow Width Smoke/ }).first();
  await classBtn.waitFor({ timeout: 10000 });
  await classBtn.click();
  await runLive.waitFor({ timeout: 10000 });
}

async function openInspector(page) {
  await page
    .getByRole('button', { name: /The Testers/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Add cue' }).waitFor({ timeout: 10000 });
}

/**
 * No overlapping controls (canon 09 P0 gate). Overflow checks cannot see this:
 * a bottom-pinned panel can sit *over* the primary action without widening the
 * page at all. A tall selected-track preview (a track with no provider link
 * carries the recovery block) covered `Run live` at 390px scroll-top, so this
 * hit-tests the button's own centre and fails if anything else answers.
 */
async function checkPrimaryActionReachable(page, suffix) {
  const tag = `primary-action-reachable:${suffix}`;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  const verdict = await page.evaluate(() => {
    const run = [...document.querySelectorAll('button')].find((b) => /Run live/.test(b.textContent));
    if (!run) return { state: 'missing' };
    const r = run.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= window.innerHeight) return { state: 'offscreen' };
    // Probe the centre of the VISIBLE part: a button whose geometric centre
    // sits past the fold makes elementFromPoint return null, which is a
    // measurement artefact, not an occlusion.
    const x = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, window.innerHeight);
    const y = Math.min(Math.max((top + bottom) / 2, 1), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (hit === run || run.contains(hit)) return { state: 'ok' };
    if (!hit) return { state: 'offscreen' };
    const label = hit.getAttribute('aria-label') ?? hit.tagName;
    return { state: 'occluded', by: label };
  });
  if (verdict.state === 'ok') pass(tag, 'hit-testable at scroll-top');
  else if (verdict.state === 'offscreen') pass(tag, 'not on screen at scroll-top');
  else if (verdict.state === 'missing') fail(tag, 'Run live not found');
  else fail(tag, `occluded by ${verdict.by}`);
}

async function checkSignedInSurfaces(page, suffix) {
  await goToClassesWithTrack(page);
  await checkNoOverflow(page, `dashboard-with-track:${suffix}`);

  await openInspector(page);
  await checkNoOverflow(page, `dashboard-inspector-open:${suffix}`);
  await checkIntensityControlLayout(page, suffix);
  await checkPrimaryActionReachable(page, suffix);

  await page.getByRole('button', { name: 'Music', exact: true }).click();
  await page.getByRole('heading', { name: /Browse music, then shape it into class/ }).waitFor({
    timeout: 10000,
  });
  await checkNoOverflow(page, `music:${suffix}`);

  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('heading', { name: 'Smoke Tester' }).waitFor({ timeout: 10000 });
  await checkNoOverflow(page, `account:${suffix}`);

  await goToClassesWithTrack(page);
  await page
    .getByRole('button', { name: /Run live/ })
    .first()
    .click();
  const runWithoutMusic = page.getByRole('button', { name: 'Run without music' });
  await runWithoutMusic.waitFor({ timeout: 10000 });
  await runWithoutMusic.click();
  await page.getByText('Press play to start', { exact: true }).waitFor({
    state: 'visible',
    timeout: 10000,
  });
  await checkNoOverflow(page, `live-at-rest:${suffix}`);
  await page.getByRole('button', { name: 'Exit' }).click();
  await page.getByRole('button', { name: 'Account', exact: true }).waitFor({ timeout: 10000 });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT });
try {
  // 1. Sign up a fresh instructor (via the public marketing front door).
  await page.goto(WEB, { waitUntil: 'networkidle' });
  await checkNoOverflow(page, 'marketing');
  await openLogin(page);
  await checkNoOverflow(page, 'login');
  const email = `smoke+${Date.now()}@example.com`;
  await fillSignup(page, email);
  await dismissOnboarding(page);

  // 2. Land on the dashboard.
  await page.getByRole('button', { name: 'Account', exact: true }).waitFor({ timeout: 10000 });
  await checkNoOverflow(page, 'dashboard-empty');
  await page.screenshot({ path: join(shotsDir, 'dashboard-empty.png') });

  // 3. Create a class and open it. The empty Classes home offers copper
  // "Start a class", which opens the isolated create dialog.
  await page.getByRole('button', { name: 'Start a class' }).click();
  const titleInput = page.getByLabel('Class title');
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  await titleInput.fill('Narrow Width Smoke');
  // Class type is intentionally explicit; a smoke path must make the same
  // deliberate choice an instructor makes before the create action unlocks.
  await page.getByRole('button', { name: 'Cycle', exact: true }).click();
  // `exact` matters: the dialog's close button is labelled "Close create class
  // dialog", which substring-matches "Create class" and trips strict mode.
  await page.getByRole('button', { name: 'Create class', exact: true }).click();
  // The class row exposes a toggle plus View/Copy actions whose aria-labels also
  // contain the title; .first() targets the row toggle (first in DOM order).
  const classBtn = page.getByRole('button', { name: /Narrow Width Smoke/ }).first();
  await classBtn.waitFor({ timeout: 10000 });
  await classBtn.click();
  await page.getByRole('heading', { name: 'Narrow Width Smoke' }).waitFor({ timeout: 10000 });

  // 4. Add a manual track (the form lives in a collapsed "Add manually" details).
  await openManualEntry(page);
  const manualTrackTitle = page.locator('details[open] input[aria-label="Track title"]');
  const manualTrackArtist = page.locator('details[open] input[aria-label="Track artist"]');
  const manualTrackDuration = page.locator(
    'details[open] input[aria-label="Track duration in minutes and seconds"]',
  );
  await manualTrackTitle.fill('Smoke Anthem');
  await manualTrackArtist.fill('The Testers');
  await manualTrackDuration.fill('3:00');
  await page.getByRole('button', { name: 'Add track' }).click();
  // The title now appears in the track row AND as readiness fix-chips (a manual
  // track has no BPM/provider yet), so match the first occurrence, not exactly one.
  await page.getByText('Smoke Anthem').first().waitFor({ timeout: 10000 });

  // 4a. Add a second manual track so the class has ≥2 tracks at the same default
  // intensity ('mod') — the alive-at-rest "unshaped" case. The energy ribbon should
  // draw a derived provisional arc marked with the "auto shape" badge, not a flat
  // slab (design system principle 8 / IntensityRibbon.computeRibbonShape). The
  // "Add manually" <details> collapses after an add, so re-open it and keep the
  // default 'mod' intensity + 3:00 duration.
  await openManualEntry(page);
  await manualTrackTitle.fill('Smoke Reprise');
  await manualTrackArtist.fill('The Testers');
  await page.getByRole('button', { name: 'Add track' }).click();
  await page.getByText('Smoke Reprise').first().waitFor({ timeout: 10000 });
  // Class Pulse replaced the ribbon's "auto shape" badge. An unshaped class
  // still names the derived shape: the pulse region + the "auto-shaped" state.
  const classPulse = page.getByRole('region', { name: 'Class Pulse' });
  const derivedConfirm = classPulse.getByText('◇ auto-shaped');
  if (
    (await classPulse.isVisible().catch(() => false)) &&
    (await derivedConfirm.isVisible().catch(() => false))
  ) {
    pass('provisional-shape:class-pulse');
  } else {
    fail(
      'provisional-shape:class-pulse',
      'Class Pulse derived-shape cue missing on an unshaped 2-track class',
    );
  }
  await page.screenshot({ path: join(shotsDir, 'provisional-shape-390.png'), fullPage: true });

  // Phase 2 (alive at rest): a missing BPM is named in place, never silent. Both
  // manual tracks have no BPM, so each row and the header use the same "No BPM set"
  // words instead of dropping the avg-BPM stat (design system 10 §1a).
  const bpmNeededCount = await page.getByText('No BPM set', { exact: true }).count();
  if (bpmNeededCount >= 2) pass('missing-bpm:row-chips', `${bpmNeededCount} chips`);
  else fail('missing-bpm:row-chips', `expected ≥2 "No BPM set" chips, saw ${bpmNeededCount}`);
  const bpmSummary = page.getByText('no BPM set', { exact: true });
  if (await bpmSummary.isVisible().catch(() => false)) pass('missing-bpm:summary-hint');
  else fail('missing-bpm:summary-hint', 'header summary did not name the missing BPM');

  // Phase 5 (alive at rest): a class with tracks but no authored sections shows a
  // provisional warm-up → cool-down banding marked "auto", not "No segments yet."
  // (design system 09 §Segments / 10 §4). The "auto" pill (exact) is distinct from
  // the ribbon's "auto shape" badge.
  const showTimeline = page.getByRole('button', { name: 'Show timeline' });
  if (await showTimeline.isVisible().catch(() => false)) {
    await showTimeline.click();
  }
  const noSegments = await page
    .getByText('No segments yet.', { exact: true })
    .isVisible()
    .catch(() => false);
  if (!noSegments) pass('auto-bands:no-empty-state');
  else fail('auto-bands:no-empty-state', '"No segments yet." shown instead of provisional bands');
  const autoBandsPill = await page
    .getByText('auto', { exact: true })
    .isVisible()
    .catch(() => false);
  if (autoBandsPill) pass('auto-bands:auto-pill');
  else fail('auto-bands:auto-pill', 'provisional segment "auto" pill not shown');

  await checkNoOverflow(page, 'dashboard-with-track');
  await page.screenshot({ path: join(shotsDir, 'dashboard-with-track.png'), fullPage: true });

  // 4b. Select the track to open the side inspector (intensity/BPM/cues/moves) and
  // re-check overflow — the inspector was previously untested at 390px, where its
  // "Add cue"/"Add move" rows overflowed.
  await openInspector(page);
  await checkNoOverflow(page, 'dashboard-inspector-open');
  await checkIntensityControlLayout(page);
  await page.screenshot({ path: join(shotsDir, 'dashboard-inspector-open.png'), fullPage: true });

  // Phase 3 (alive at rest): the inspector opens on Essentials (intensity/BPM/duration/
  // notes + cues/moves); the long tail (RPM, holds, trim, downbeat) sits under an
  // "Advanced" disclosure that is collapsed by default (design system 09 §Inspector).
  const advanced = page.getByText('Advanced timing and placement', { exact: true });
  const downbeat = page.getByText('Downbeat', { exact: true });
  const advancedShown = await advanced.isVisible().catch(() => false);
  const downbeatCollapsed = !(await downbeat.isVisible().catch(() => false));
  if (advancedShown && downbeatCollapsed) pass('inspector:advanced-collapsed');
  else
    fail(
      'inspector:advanced-collapsed',
      `advanced summary visible=${advancedShown}, long-tail collapsed=${downbeatCollapsed}`,
    );
  await advanced.click();
  await downbeat.waitFor({ state: 'visible', timeout: 5000 });
  pass('inspector:advanced-expands');
  await checkNoOverflow(page, 'dashboard-inspector-advanced');
  await page.screenshot({
    path: join(shotsDir, 'dashboard-inspector-advanced.png'),
    fullPage: true,
  });

  // 5. Music is a first-class destination (D21) and was missing from this harness.
  await page.getByRole('button', { name: 'Music', exact: true }).click();
  await page.getByRole('heading', { name: /Browse music, then shape it into class/ }).waitFor({
    timeout: 10000,
  });
  await checkNoOverflow(page, 'music');
  await page.screenshot({ path: join(shotsDir, 'music-390.png'), fullPage: true });

  // 6. Account is a destination (not a modal): prove its compact layout, then
  // exercise the shared music-connections dialog from its direct action.
  // "Personal workspace" is an eyebrow, not a heading — wait for the profile name.
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('heading', { name: 'Smoke Tester' }).waitFor({ timeout: 10000 });
  await checkNoOverflow(page, 'account');
  await page.screenshot({ path: join(shotsDir, 'account-390.png'), fullPage: true });
  await checkDialog(page, 'Manage', 'Music connections');

  // Return to the selected class before exercising its Live handoff.
  await goToClassesWithTrack(page);

  // 7. Live at rest (alive at rest · phase 4): entering Live and passing preflight
  // without music lands on the at-rest prompter, which must LEAD with the affirmative
  // "Press play to start" hero + class-shape mini-map — never "No cue set". Both tracks
  // have a duration, so Run live is enabled.
  await page
    .getByRole('button', { name: /Run live/ })
    .first()
    .click();
  const runWithoutMusic = page.getByRole('button', { name: 'Run without music' });
  await runWithoutMusic.waitFor({ timeout: 10000 });
  await runWithoutMusic.click();
  await page.getByText('Press play to start', { exact: true }).waitFor({
    state: 'visible',
    timeout: 10000,
  });
  pass('live-at-rest:ready-lead');
  const absenceLeads = await page
    .getByText('No cue set', { exact: true })
    .isVisible()
    .catch(() => false);
  if (!absenceLeads) pass('live-at-rest:no-absence-lead');
  else fail('live-at-rest:no-absence-lead', 'Live at rest still leads with "No cue set"');
  await checkNoOverflow(page, 'live-at-rest');
  await page.screenshot({ path: join(shotsDir, 'live-at-rest-390.png'), fullPage: true });
  await page.getByRole('button', { name: 'Exit' }).click();

  // 8. Viewport matrix + 200% zoom. Resize the same authenticated session rather
  // than re-signing-up; overflow is a layout property of the current surface.
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await checkSignedInSurfaces(page, viewport.label);
    await page.screenshot({
      path: join(shotsDir, `matrix-${viewport.label}.png`),
      fullPage: true,
    });
  }
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
