import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The signed-in core loop on a fresh local D1 with mock providers: sign up, create an empty
// Cycle class, add two mock tracks, write cues, run it live without music, play, End Class.
// Every destination is checked for sideways overflow (jsdom has no layout) and for WCAG 2.2
// AA violations. Each viewport project signs up its own instructor.

// A long title is what widened the phone Classes page before #615.
const CLASS_TITLE = 'Sunrise Climb Intervals With A Deliberately Long Title For Phones';
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

// Violations that are tracked but not fixed yet, by page. An entry that stops firing fails the
// smoke too, so the list can only shrink.
const KNOWN_AXE: Record<string, string[]> = {
  // WCAG 2.5.3 Label in Name: the class row, Jump back in card, and template tile buttons set an
  // aria-label that leaves out part of their visible text. axe 4.14 enables this rule by default.
  Classes: ['label-content-name-mismatch'],
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
  await expectNoAxeViolations(page, where);
}

async function signUp(page: Page, email: string) {
  await page.goto('/');
  await page.locator('#marketing-signin-btn').click();
  await page.getByRole('button', { name: /Need an (invited )?account\? Sign up/ }).click();
  await page.getByLabel('Name').fill(NAME);
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill('e2e-pass-1234');
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

async function openDestination(page: Page, name: 'Classes' | 'Account') {
  await page.getByRole('button', { name, exact: true }).click();
}

test('signed-in core loop: build a class, run it live, End Class', async ({ page }, testInfo) => {
  await page.clock.install();
  await signUp(page, `e2e+${testInfo.project.name}-${Date.now()}@example.test`);

  await createEmptyCycleClass(page);
  await page.getByRole('button', { name: 'Music search' }).click();
  await addMockTrack(page, 'Instinct', 'Lane 8', 1);
  await addMockTrack(page, 'Baianá', 'Bakermat', 2);
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
});
