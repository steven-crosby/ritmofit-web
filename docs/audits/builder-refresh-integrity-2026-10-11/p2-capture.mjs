// P2 synthetic Live-return regression. Existing fixture files and evidence stay unchanged.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { attach, newPage } from '../../../agent-prompts/browser-verification/cdp.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const page = await attach(await newPage());
const rows = [];
const errors = [];
page.on((event) => {
  if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails);
});
async function until(expression) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await page.eval(`return !!(${expression})`)) return;
    await new Promise((done) => setTimeout(done, 50));
  }
  throw Error(`Timed out: ${expression}`);
}
async function click(expression) {
  const point = await page.eval(
    `const n=(${expression});if(!n)throw Error('Missing action');n.scrollIntoView({block:'center'});await new Promise(r=>requestAnimationFrame(r));const b=n.getBoundingClientRect();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);if(hit!==n&&!n.contains(hit))throw Error('Action obscured');return {x:b.x+b.width/2,y:b.y+b.height/2}`,
  );
  for (const type of ['mousePressed', 'mouseReleased'])
    await page.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
}
try {
  await page.reducedMotion(true);
  for (const [name, width, height] of [
    ['desktop', 1440, 1000],
    ['narrow', 320, 812],
  ]) {
    await page.viewport(width, height);
    await page.send('Page.navigate', {
      url: `http://127.0.0.1:${process.env.BUILDER_PORT ?? 5186}/builder-refresh`,
    });
    await until(`window.__builderFixture`);
    await page.eval(`
      const base=window.fetch.bind(window);
      const state=window.__p2={logicalReads:0,mutations:0,hold:false};
      window.fetch=async (input,init)=>{
        const url=new URL(typeof input==='string'?input:input.url,location.href);
        const method=init?.method??'GET';
        if(url.pathname.endsWith('/tracks/reorder')&&method==='POST'){
          state.mutations++;const response=await base(input,init);state.hold=true;return response;
        }
        if(url.pathname.endsWith('/tracks')&&method==='GET'){
          state.logicalReads++;
          if(state.hold){state.hold=false;let response=await base(input,init);
            // Existing fixture fails its first post-save read; consume that fixture
            // seam and retain a real synthetic successful response for this P2 race.
            if(!response.ok)response=await base(input,init);
            return new Promise(resolve=>{state.release=()=>resolve(response)});
          }
        }
        const response=await base(input,init);
        if(url.pathname.endsWith('/run-payload')&&response.ok){
          const value=await response.json();value.sections=[];let offset=0;
          value.tracks.sort((a,b)=>a.position-b.position).forEach((track,position)=>{
            track.position=position;track.startOffsetMs=offset;offset+=track.track.durationMs??0;
          });
          return new Response(JSON.stringify(value),{status:response.status,headers:response.headers});
        }
        return response;
      };
    `);
    await until(
      `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Refresh integrity ride')`,
    );
    await click(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Refresh integrity ride')`,
    );
    await until(`document.querySelector('button[aria-label^="Reorder First Light"]')`);
    await page.eval(`document.querySelector('button[aria-label^="Reorder First Light"]').focus()`);
    for (const type of ['keyDown', 'keyUp'])
      await page.send('Input.dispatchKeyEvent', {
        type,
        key: 'ArrowDown',
        code: 'ArrowDown',
        windowsVirtualKeyCode: 40,
        nativeVirtualKeyCode: 40,
      });
    await until(`window.__p2.release`);
    await click(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Run live'))`,
    );
    await until(
      `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Exit')`,
    );
    await page.eval(
      `window.__p2.release();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`,
    );
    const during = await page.eval(
      `return {logicalReads:window.__p2.logicalReads,hasExit:Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Exit')}`,
    );
    await click(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Exit')`,
    );
    await until(
      `document.querySelector('button[aria-label^="Reorder First Light, position 2 of 2"]')`,
    );
    const returned =
      await page.eval(`return {logicalReads:window.__p2.logicalReads,mutations:window.__p2.mutations,
      order:Array.from(document.querySelectorAll('[data-track-select-id]')).map(b=>b.dataset.trackSelectId),
      firstLightGrip:document.querySelector('button[aria-label^="Reorder First Light"]').getAttribute('aria-label'),
      warning:document.querySelector('[aria-label="Class detail refresh"]')?.textContent??null,
      focusOnBody:document.activeElement===document.body,focusText:document.activeElement.textContent,
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth}`);
    await page.eval(
      `document.querySelector('button[aria-label^="Reorder First Light"]').scrollIntoView({block:'center'})`,
    );
    await page.screenshot(resolve(here, `p2-${name}-live-return.png`));
    const pass =
      during.logicalReads === 2 &&
      during.hasExit &&
      returned.logicalReads === 3 &&
      returned.mutations === 1 &&
      returned.firstLightGrip.startsWith('Reorder First Light, position 2 of 2') &&
      !returned.warning &&
      !returned.focusOnBody &&
      returned.focusText === 'Ritmo Studio' &&
      returned.horizontalOverflow === 0;
    rows.push({ name, width, height, pass, during, returned });
    console.log(`${name}: ${pass ? 'PASS' : 'FAIL'}`);
  }
} catch (error) {
  errors.push({ message: error.message });
} finally {
  page.close();
  await writeFile(
    resolve(here, 'p2-browser-checks.json'),
    JSON.stringify(
      {
        kind: 'synthetic-Chrome-Live-preflight-return',
        providerPlayback: false,
        actualDevice: false,
        actualBrowserZoom: false,
        rows,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
}
if (rows.length !== 2 || rows.some((row) => !row.pass) || errors.length) process.exitCode = 1;
