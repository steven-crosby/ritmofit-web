import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The signed-in core loop on a fresh local D1 with mock providers: sign up, create an empty
// Cycle class, add two mock tracks, write cues, run it live without music, play, End Class.
// Music › Songs pick mode also creates a class from two ticked liked songs (RF-151).
// Every destination is checked for sideways overflow (jsdom has no layout) and for WCAG 2.2
// AA violations. Each viewport project signs up its own instructor.

// A long title is what widened the phone Classes page before #615.
const CLASS_TITLE = 'Sunrise Climb Intervals With A Deliberately Long Title For Phones';
const PICKED_TITLE = 'Picked Songs Ride';
const NAME = 'E2E Tester';
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoSidewaysOverflow(page: Page, where: string) {
  const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: viewport,
      offenders: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > viewport + 1)
        .slice(0, 5)
        .map((el) => {
          const label = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40);
          return `${el.tagName.toLowerCase()} "${label}" right=${Math.round(el.getBoundingClientRect().right)}`;
        }),
    };
  });
  expect(
    scrollWidth,
    `${where}: document is ${scrollWidth}px wide in a ${clientWidth}px viewport. ` +
      `Widest: ${offenders.join('; ')}`,
  ).toBeLessThanOrEqual(clientWidth);
}

// RF-189: iOS Safari zooms the page when a text field under 16px gets focus. On a phone
// (the index.css query, copied here and kept in step by hand: under 640px wide, or a phone
// turned sideways, RF-196) every visible text-entry field must compute to 16px or more.
const PHONE_FIELDS_QUERY =
  '(max-width: 639.98px), (pointer: coarse) and (max-height: 639.98px) and (max-width: 959.98px)';

async function expectNoZoomingFields(page: Page, where: string) {
  const small = await page.evaluate((query) => {
    if (!window.matchMedia(query).matches) return [];
    const skip = [
      'checkbox',
      'radio',
      'range',
      'file',
      'color',
      'button',
      'submit',
      'reset',
      'image',
      'hidden',
    ];
    return [...document.querySelectorAll<HTMLElement>('input, select, textarea')]
      .filter((el) => !(el instanceof HTMLInputElement && skip.includes(el.type)))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter(({ size }) => size < 16)
      .map(({ el, size }) => {
        // `||`: a missing id is "", so `??` would never reach the name (RF-196).
        const label = el.getAttribute('aria-label') || el.id || el.getAttribute('name') || '';
        return `${el.tagName.toLowerCase()} "${label}" ${size}px`;
      });
  }, PHONE_FIELDS_QUERY);
  expect(small, `${where}: form fields under 16px zoom iOS Safari`).toEqual([]);
}

// Violations that are tracked but not fixed yet, by page. An entry that stops firing fails the
// smoke too, so the list can only shrink.
const KNOWN_AXE: Record<string, string[]> = {
  // WCAG 2.5.3 Label in Name: the class row, Jump back in card, and template tile buttons set an
  // aria-label that leaves out part of their visible text. axe 4.14 enables this rule by default.
  Classes: ['label-content-name-mismatch'],
  // The Music service chips ("SoundCloud, Connected") have the same mismatch (RF-173).
  'Music songs': ['label-content-name-mismatch'],
};

async function expectNoAxeViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  const known = KNOWN_AXE[where] ?? [];
  const summary = violations
    .filter((v) => !known.includes(v.id))
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} — ` +
        v.nodes.map((n) => `${n.target.join(' ')} ${n.html.slice(0, 160)}`).join(', '),
    );
  expect(summary, `${where}: axe WCAG 2.2 AA violations`).toEqual([]);
  const fixed = known.filter((id) => !violations.some((v) => v.id === id));
  expect(fixed, `${where}: fixed, so remove from KNOWN_AXE`).toEqual([]);
}

async function checkPage(page: Page, where: string) {
  const project = test.info().project.name;
  const slug = where.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await page.screenshot({ path: `.state/shots/${project}-${slug}.png`, fullPage: true });
  await expectNoSidewaysOverflow(page, where);
  await expectNoZoomingFields(page, where);
  await expectNoAxeViolations(page, where);
}

async function signUp(page: Page, email: string) {
  await page.goto('/');
  await page.locator('#marketing-signin-btn').click();
  await page.getByRole('button', { name: /Need an (invited )?account\? Sign up/ }).click();
  // RF-129: sign-in and sign-up have their own paths.
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.getByLabel('Name').fill(NAME);
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill('e2e-pass-1234');
  await expectNoZoomingFields(page, 'sign-up');
  const portrait = page.viewportSize();
  if (test.info().project.use.hasTouch && portrait) {
    // RF-196: the same phone turned sideways is wider than sm but still zooms.
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    expect(
      await page.evaluate((query) => window.matchMedia(query).matches, PHONE_FIELDS_QUERY),
      'sign-up (landscape): the phone query matches a sideways touch screen',
    ).toBe(true);
    await expectNoZoomingFields(page, 'sign-up (landscape)');
    await page.setViewportSize(portrait);
  }
  await page.getByRole('button', { name: 'Create account' }).click();
  const tutorial = page.getByRole('dialog', { name: 'New instructor four-count tutorial' });
  await tutorial.waitFor();
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await expect(tutorial).toBeHidden();
}

async function createEmptyCycleClass(page: Page) {
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'From a template' }).click();
  await page.getByLabel('Class title').fill(CLASS_TITLE);
  await page.getByRole('button', { name: 'Cycle', exact: true }).click();
  await page.getByRole('button', { name: 'Start empty instead' }).click();
  await page.getByRole('button', { name: 'Create empty class' }).click();
  await expect(page.getByRole('heading', { name: CLASS_TITLE })).toBeVisible();
}

async function addMockTrack(page: Page, title: string, artist: string, position: number) {
  const search = page.getByPlaceholder('Search SoundCloud…');
  await search.fill(title);
  await search.press('Enter');
  await page.getByRole('button', { name: `Add ${title} by ${artist}`, exact: true }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(`^Reorder ${title}, position ${position} of`) }),
  ).toBeVisible();
}

async function addCue(page: Page, move: string, at: string) {
  await page.getByRole('textbox', { name: 'Move name', exact: true }).fill(move);
  await page.getByLabel('Cue time (m:ss)').last().fill(at);
  await page.getByRole('button', { name: 'Add cue', exact: true }).click();
  await expect(page.getByRole('button', { name: `Edit cue ${move}` })).toBeVisible();
}

async function openDestination(page: Page, name: 'Classes' | 'Account' | 'Music') {
  await page.getByRole('button', { name, exact: true }).click();
}

// RF-151: tick liked songs on Music › Songs, then name the class in the sheet.
async function createClassFromPickedSongs(page: Page) {
  await openDestination(page, 'Music');
  await page.getByRole('button', { name: /^SoundCloud,/ }).click();
  await page.getByRole('button', { name: 'Songs', exact: true }).click();
  await page.getByRole('button', { name: 'Connect SoundCloud' }).first().click();
  const list = page.getByRole('list', { name: 'Liked songs' });
  await list.getByText('Instinct').click();
  await list.getByText('Baianá').click();
  await expect(page.getByText('2 of 15 selected')).toBeVisible();
  await checkPage(page, 'Music songs');
  await page.getByRole('button', { name: 'Create a class' }).click();
  const sheet = page.getByRole('dialog', { name: 'Create a class' });
  await sheet.getByLabel('Class name').fill(PICKED_TITLE);
  await expectNoZoomingFields(page, 'Create a class sheet');
  await sheet.getByRole('button', { name: 'Create class' }).click();
  await expect(page.getByRole('heading', { name: PICKED_TITLE })).toBeVisible();
}

test('signed-in core loop: build a class, run it live, End Class', async ({ page }, testInfo) => {
  await page.clock.install();
  await signUp(page, `e2e+${testInfo.project.name}-${Date.now()}@example.test`);

  await createEmptyCycleClass(page);
  await page.getByRole('button', { name: 'Music search' }).click();
  await addMockTrack(page, 'Instinct', 'Lane 8', 1);
  await addMockTrack(page, 'Baianá', 'Bakermat', 2);
  await expectNoZoomingFields(page, 'Music search');
  await page.getByRole('button', { name: 'Close music' }).click();

  // Adding the first track opens its inspector.
  await addCue(page, 'Seated climb', '0:30');
  await addCue(page, 'Standing sprint', '1:30');
  await checkPage(page, 'builder');

  await openDestination(page, 'Classes');
  await expect(page.getByRole('heading', { name: 'Your classes' })).toBeVisible();
  await expect(page.getByText(CLASS_TITLE).first()).toBeVisible();
  await checkPage(page, 'Classes');

  await openDestination(page, 'Account');
  await expect(page.getByRole('heading', { name: NAME })).toBeVisible();
  await checkPage(page, 'Account');

  await createClassFromPickedSongs(page);

  await openDestination(page, 'Classes');
  await page
    .getByRole('button', { name: new RegExp(CLASS_TITLE) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: CLASS_TITLE })).toBeVisible();

  await page.getByRole('button', { name: /Run live/ }).click();
  await page.getByRole('button', { name: 'Run without music' }).click();
  await expect(page.getByText('Press play to start', { exact: true })).toBeVisible();
  await checkPage(page, 'Live at rest');

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.fastForward('00:45');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(page.getByText(/^0:4\d \/ 7:00$/).first()).toBeVisible();
  await expect(page.getByText('Seated climb').first()).toBeVisible();
  await checkPage(page, 'Live running');

  await page.getByRole('button', { name: 'End Class', exact: true }).click();
  await expect(page.getByRole('heading', { name: CLASS_TITLE })).toBeVisible();
  await expect(page.getByRole('button', { name: /Run live/ })).toBeVisible();
  await expectNoSidewaysOverflow(page, 'builder after End Class');

  // RF-129: the class has a real URL, so a refresh returns to it, not the Classes home.
  await expect(page).toHaveURL(/\/classes\/[0-9a-f-]{36}$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: CLASS_TITLE })).toBeVisible();
  await expect(page.getByRole('button', { name: /Run live/ })).toBeVisible();
});
