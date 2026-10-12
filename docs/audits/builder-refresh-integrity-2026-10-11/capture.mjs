import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { newPage, attach } from '../../../agent-prompts/browser-verification/cdp.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const page = await attach(await newPage());
const rows = [];
let runtimeExceptions = [];
async function until(expression) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await page.eval(`return ${expression}`)) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function key(key, code, modifiers = 0) {
  const virtualKey = { ArrowDown: 40, Enter: 13, Tab: 9 }[key];
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, ...(key === 'Enter' ? { text: '\r' } : {}) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey });
}
try {
  await page.reducedMotion(true);
  for (const [name, width, height] of [['desktop', 1440, 1000], ['narrow', 320, 812]]) {
    await page.viewport(width, height);
    await page.send('Page.navigate', { url: `http://127.0.0.1:${process.env.BUILDER_PORT ?? 5186}/builder-refresh` });
    await until(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Refresh integrity ride')`);
    await page.eval(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Refresh integrity ride').click()`);
    await until(`document.querySelector('[data-track-select-id]') !== null`);
    await page.eval(`document.querySelector('[data-track-select-id="00000000-0000-4000-8000-000000000101"]').click()`);
    await until(`document.querySelector('[aria-label="Track inspector for First Light"]') !== null`);
    await page.eval(`const inspector = document.querySelector('[aria-label="Track inspector for First Light"]');
      const notes = Array.from(inspector.querySelectorAll('label')).find(l => l.textContent.includes('Creator notes')).querySelector('textarea');
      notes.focus();`);
    await page.send('Input.insertText', { text: 'Unsaved browser draft.' });
    await page.eval(`document.querySelector('button[aria-label^="Reorder First Light"]').focus()`);
    await key('ArrowDown', 'ArrowDown');
    await until(`document.querySelector('[aria-label="Class detail refresh"]') !== null`);
    const failed = await page.eval(`
      await document.fonts.ready;
      const warning = document.querySelector('[aria-label="Class detail refresh"]');
      window.scrollTo(0,0);
      const button = warning.querySelector('button');
      const rect = button.getBoundingClientRect();
      const warningRect = warning.getBoundingClientRect();
      const hit = document.elementFromPoint(warningRect.left + warningRect.width/2, warningRect.top + warningRect.height/2);
      const notes = Array.from(document.querySelector('[aria-label="Track inspector for First Light"]').querySelectorAll('label'))
        .find(l => l.textContent.includes('Creator notes')).querySelector('textarea');
      return { role: warning.getAttribute('role'), text: warning.textContent,
        draft: notes.value, selected: document.querySelector('[data-track-select-id="00000000-0000-4000-8000-000000000101"]').getAttribute('aria-pressed'),
        focusBeforeRetry: document.activeElement.getAttribute('aria-label'),
        button: {width:rect.width,height:rect.height,left:rect.left,right:rect.right},
        warning: {top:warningRect.top,bottom:warningRect.bottom,unobscured:warning.contains(hit)},
        horizontalOverflow: document.documentElement.scrollWidth-innerWidth,
        mutations: window.__builderFixture.calls.filter(c => c.method === 'POST').length };
    `);
    await page.screenshot(resolve(here, `${name}-refresh-warning.png`));
    await page.eval(`document.querySelector('[aria-label="Class detail refresh"] button').focus()`);
    await key('Enter', 'Enter');
    await until(`document.querySelector('[aria-label="Class detail refresh"]') === null`);
    const recovered = await page.eval(`
      const notes = Array.from(document.querySelector('[aria-label="Track inspector for First Light"]').querySelectorAll('label'))
        .find(l => l.textContent.includes('Creator notes')).querySelector('textarea');
      return { draft:notes.value, focusTrack:document.activeElement.dataset.trackSelectId,
        focusOnBody: document.activeElement === document.body,
        mutations:window.__builderFixture.calls.filter(c => c.method === 'POST').length,
        trackReads:window.__builderFixture.calls.filter(c => c.path.endsWith('/tracks') && c.method === 'GET').length,
        horizontalOverflow: document.documentElement.scrollWidth-innerWidth };
    `);
    const pass = failed.role === 'status' && failed.draft === 'Unsaved browser draft.' && failed.selected === 'true'
      && failed.focusBeforeRetry?.startsWith('Reorder First Light') && failed.button.width >= 44 && failed.button.height >= 44
      && failed.button.left >= 0 && failed.button.right <= width && failed.horizontalOverflow === 0
      && failed.warning.top >= 0 && failed.warning.bottom <= height && failed.warning.unobscured
      && recovered.draft === failed.draft && !recovered.focusOnBody && recovered.focusTrack === '00000000-0000-4000-8000-000000000101'
      && recovered.mutations === 1 && recovered.trackReads === 3 && recovered.horizontalOverflow === 0;
    rows.push({name,width,height,pass,failed,recovered});
    console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}`);
  }
} finally {
  runtimeExceptions = page.events.filter(e => e.method === 'Runtime.exceptionThrown');
  await writeFile(resolve(here, 'browser-checks.json'), JSON.stringify({
    kind: 'synthetic-Chrome-viewport-emulation', actualBrowserZoom:false, actualDevice:false,
    providerPlayback:false, rows, runtimeExceptions,
  }, null, 2) + '\n');
  page.close();
}
if (runtimeExceptions.length || rows.length !== 2 || rows.some(row => !row.pass)) process.exitCode = 1;
