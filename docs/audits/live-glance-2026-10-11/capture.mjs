// PLAYWRIGHT_MODULE may point to an installed Playwright module outside the repo.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const evidence = resolve('docs/audits/live-glance-2026-10-11');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const results = [];
const variants = ['short', 'long', 'long-count', 'long-holds', 'long-section-count-holds'];
try {
  for (const height of [812, 635, 568]) {
    const width = height === 568 ? 320 : 375;
    await page.setViewportSize({ width, height });
    for (const variant of variants) {
      await page.goto(`http://127.0.0.1:${process.env.GLANCE_PORT ?? 5184}/live-glance?variant=${variant}`);
      await page.getByRole('button', { name: 'Run without music' }).click();
      await page.evaluate(() => document.fonts.ready);
      // A locator click scrolls the sticky transport's underlying box into view.
      // Use its visible hit target, as a person would, without injecting a scroll.
      const play = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox();
      if (!play || play.y < 0 || play.y + play.height > height) throw new Error('Play is not visible');
      await page.mouse.click(play.x + play.width / 2, play.y + play.height / 2);
      await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const observed = await page.evaluate(() => {
        const focal = document.querySelector('[data-live-region="focal"]');
        const shell = focal.closest('.fixed');
        const current = focal.querySelector('p.line-clamp-2');
        const countdown = focal.querySelector('[aria-label="Time to next cue"]');
        const next = countdown.parentElement.querySelector('p.truncate');
        const transport = document.querySelector('[aria-label="Live transport"]');
        const header = document.querySelector('header').parentElement;
        const transportTop = transport.getBoundingClientRect().top;
        function measure(node) {
          const rect = node.getBoundingClientRect();
          const x = Math.min(innerWidth - 1, Math.max(0, rect.x + rect.width / 2));
          const y = Math.min(innerHeight - 1, Math.max(0, rect.y + rect.height / 2));
          const top = document.elementFromPoint(x, y);
          return {
            text: node.textContent,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom },
            inViewport: rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth,
            aboveTransport: rect.bottom <= transportTop,
            centerUnobscured: top === node || node.contains(top),
            textTruncated: node.scrollWidth > node.clientWidth,
          };
        }
        return {
          viewport: { width: innerWidth, height: innerHeight },
          current: measure(current), next: measure(next), countdown: measure(countdown),
          transportTop,
          chromeHeight: (header?.getBoundingClientRect().height ?? 0) + transport.getBoundingClientRect().height,
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
          documentScrollTop: document.scrollingElement.scrollTop,
          liveShellScrollTop: shell.scrollTop,
          currentCueLineClamp: getComputedStyle(current).webkitLineClamp,
        };
      });
      const pass = observed.horizontalOverflow === 0 && ['current', 'next', 'countdown'].every(
        (key) => observed[key].inViewport && observed[key].aboveTransport && observed[key].centerUnobscured,
      ) && observed.currentCueLineClamp === '2' && observed.liveShellScrollTop === 0;
      const screenshot = `${width}x${height}-${variant}.png`;
      await page.screenshot({ path: resolve(evidence, screenshot) });
      results.push({ variant, pass, screenshot, ...observed });
      console.log(`${width}x${height} ${variant}: ${pass ? 'PASS' : 'FAIL'}`);
    }
  }
} finally {
  await browser.close();
  await writeFile(resolve(evidence, 'results.json'), JSON.stringify({
    kind: 'synthetic-Chrome-viewport-emulation',
    providerPlayback: false, actualDevice: false, actualBrowserZoom: false,
    errors, results,
  }, null, 2) + '\n');
}
if (errors.length || results.filter((row) => row.viewport.height === 812).some((row) => !row.pass)) process.exitCode = 1;
