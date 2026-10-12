// Run from repo root with dedicated Chrome CDP and fixture server already running.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { newPage, attach } from '../../../agent-prompts/browser-verification/cdp.mjs';

const evidence = resolve('docs/audits/live-short-viewport-2026-10-11');
const stage = process.env.CAPTURE_STAGE ?? 'p2-candidate';
const output = resolve(evidence, stage);
await mkdir(output, { recursive: true });
const page = await attach(await newPage());
const errors = [];
page.on((event) => {
  if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails);
});
const variants = ['short', 'long', 'long-count', 'long-holds', 'long-section-count-holds'];
const results = [];
const states = [];
const measure = `
const focal = document.querySelector('[data-live-region="focal"]');
const transport = document.querySelector('[aria-label="Live transport"]');
const header = document.querySelector('header');
const shell = document.querySelector('[data-live-region="teaching"]').parentElement.parentElement;
const paragraphs = [...focal.querySelectorAll('p')];
const current = paragraphs.find(n => n.textContent.startsWith('Keep shoulders') || n.textContent === 'Find your rhythm');
const next = paragraphs.find(n => n.textContent === 'Add a quarter turn and stay seated with a smooth, controlled cadence.');
const timecode = [...header.querySelectorAll('p')].find(n => /\\d+:\\d+ \\/ 12:00/.test(n.textContent) && n.getBoundingClientRect().width > 4 && n.getBoundingClientRect().height > 4);
const primary = [...transport.querySelectorAll('button')].find(n => ['Play','Pause'].includes(n.textContent));
const bpm = [...focal.querySelectorAll('span')].find(n => n.textContent === 'BPM')?.parentElement;
const holds = [...focal.querySelectorAll('span')].find(n => n.textContent === 'Holds')?.parentElement;
const effort = [...focal.querySelectorAll('span')].find(n => n.textContent === 'Effort')?.parentElement;
function check(n) {
 if (!n) return { missing: true, pass: false };
 const r=n.getBoundingClientRect();
 let bounds={left:0,top:0,right:innerWidth,bottom:innerHeight};
 for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/hidden|auto|scroll|clip/.test(s.overflowY)){bounds.top=Math.max(bounds.top,b.top);bounds.bottom=Math.min(bounds.bottom,b.bottom)}if(/hidden|auto|scroll|clip/.test(s.overflowX)){bounds.left=Math.max(bounds.left,b.left);bounds.right=Math.min(bounds.right,b.right)}}
 const inBounds=r.width>0&&r.height>0&&r.left>=bounds.left-0.5&&r.right<=bounds.right+0.5&&r.top>=bounds.top-0.5&&r.bottom<=bounds.bottom+0.5;
 const samples=n.tagName==='BUTTON'?[.25,.5,.75]:[.1,.5,.9];
 const points=samples.flatMap(x=>samples.map(y=>[r.left+r.width*x,r.top+r.height*y]));
 const hit=getComputedStyle(n).pointerEvents==='none'||points.every(([x,y])=>{const top=document.elementFromPoint(x,y);return top===n||n.contains(top)});
 const s=getComputedStyle(n);
 return {text:n.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom},bounds,inBounds,unobscured:hit,fontSize:s.fontSize,lineHeight:s.lineHeight,pass:inBounds&&hit};
}
const elements={current:check(current),next:check(next),countdown:check(focal.querySelector('[aria-label="Time to next cue"]')),timecode:check(timecode),bpm:check(bpm),effort:check(effort),primary:check(primary)};
const count=focal.querySelector('[aria-label^="Bar and count"]');if(count)elements.count=check(count);if(holds)elements.holds=check(holds);
const controls=[...transport.querySelectorAll('button'),...header.querySelectorAll('button')].filter(n=>n.getBoundingClientRect().width>4).map(n=>({name:n.getAttribute('aria-label')||n.textContent,...check(n)}));
return {controls,viewport:{width:innerWidth,height:innerHeight},elements,horizontalOverflow:Math.max(document.documentElement.scrollWidth,shell.scrollWidth)-innerWidth,scrollTop:shell.scrollTop,transportHeight:transport.getBoundingClientRect().height,headerHeight:header.parentElement.getBoundingClientRect().height};
`;
async function waitFor(expression) {
  const until = Date.now() + 10000;
  while (Date.now() < until) {
    if (await page.eval(`return !!(${expression});`)) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function clickText(text) {
  await page.eval(
    'await document.fonts.ready; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));',
  );
  const point = await page.eval(
    `const n=[...document.querySelectorAll('button')].find(n=>n.textContent.trim()===${JSON.stringify(text)});if(!n)throw Error('missing button');let r=n.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight){n.scrollIntoView({block:'center'});r=n.getBoundingClientRect();}const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(hit!==n&&!n.contains(hit))throw Error('Button is obscured: '+n.textContent);return {x:r.x+r.width/2,y:r.y+r.height/2};`,
  );
  await page.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...point,
    button: 'left',
    clickCount: 1,
  });
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...point,
    button: 'left',
    clickCount: 1,
  });
}
async function reach(expression) {
  return page.eval(
    `const n=(${expression});if(!n)return {pass:false,missing:true};n.scrollIntoView({block:'center'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const r=n.getBoundingClientRect();const h=document.querySelector('header').parentElement.getBoundingClientRect();const t=document.querySelector('[aria-label="Live transport"]').getBoundingClientRect();let left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(h.bottom,r.top),bottom=Math.min(t.top,r.bottom);for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/hidden|clip|auto|scroll/.test(s.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom)}if(/hidden|clip|auto|scroll/.test(s.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right)}}const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2);return {text:n.textContent,pass:right>left&&bottom>top&&(hit===n||n.contains(hit)),visibleHeight:bottom-top};`,
  );
}
async function openGuidance() {
  const expression =
    "[...document.querySelectorAll('summary')].find(n=>n.textContent.trim()==='Full guidance')";
  const visible = await reach(expression);
  if (!visible.pass) throw Error('Full guidance is unreachable');
  const point = await page.eval(
    `const r=(${expression}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};`,
  );
  await page.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...point,
    button: 'left',
    clickCount: 1,
  });
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...point,
    button: 'left',
    clickCount: 1,
  });
  await waitFor(
    "[...document.querySelectorAll('details')].some(n=>n.open&&n.textContent.includes('Full guidance'))",
  );
}
const viewports = [
  [375, 812],
  [375, 635],
  [320, 568],
  [812, 375],
  [1440, 900],
  [320, 812],
  ...[375, 320].flatMap((width) => [700, 701, 740, 799, 800, 801].map((height) => [width, height])),
];
const stateViewports = [
  [375, 812],
  [375, 635],
  [320, 568],
  [812, 375],
  [1440, 900],
  ...[375, 320].flatMap((width) => [700, 701, 740, 799, 800, 801].map((height) => [width, height])),
];
const measureCompletion =
  measure.slice(measure.indexOf('function check(n) {'), measure.indexOf('const elements=')) +
  `
const labels=[...document.querySelector('header').querySelectorAll('p,span')].filter(n=>/^Complete(?:\\b|$)/.test(n.textContent));
const observations=labels.map(check);
return {labels:observations,pass:observations.some(n=>n.pass&&n.rect.width>4&&n.rect.height>4)};
`;
try {
  await page.reducedMotion(true);
  for (const [width, height] of viewports) {
    await page.viewport(width, height);
    for (const variant of variants) {
      await page.send('Page.navigate', {
        url: `http://127.0.0.1:${process.env.GLANCE_PORT ?? 5185}/live-short-viewport?variant=${variant}`,
      });
      await waitFor(
        "[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Run without music')",
      );
      await clickText('Run without music');
      await page.eval('await document.fonts.ready;');
      await waitFor('document.querySelector(\'[data-live-region="focal"]\')');
      await clickText('Play');
      await waitFor(
        "[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Pause')",
      );
      let observed = await page.eval(measure);
      let stable = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        await page.eval(
          'await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));',
        );
        const next = await page.eval(measure);
        const geometry = (sample) =>
          JSON.stringify(
            Object.fromEntries(Object.entries(sample.elements).map(([key, e]) => [key, e.rect])),
          );
        if (geometry(observed) === geometry(next)) {
          observed = next;
          stable = true;
          break;
        }
        observed = next;
      }
      if (!stable) throw Error('Layout did not stabilize');
      const screenshot = `${width}x${height}-${variant}.png`;
      await page.screenshot(resolve(output, screenshot));
      const required = width < 500;
      const pass =
        observed.horizontalOverflow === 0 &&
        (!required || Object.values(observed.elements).every((e) => e.pass)) &&
        observed.elements.primary.pass &&
        observed.elements.primary.rect.width >= 44 &&
        observed.elements.primary.rect.height >= 44 &&
        observed.controls.every((c) => c.pass && c.rect.width >= 44 && c.rect.height >= 44);
      results.push({ variant, required, pass, screenshot: `${stage}/${screenshot}`, ...observed });
      console.log(
        `${width}x${height} ${variant}: ${pass ? 'PASS' : 'FAIL'} ${Object.entries(
          observed.elements,
        )
          .filter(([, e]) => !e.pass)
          .map(([k]) => k)
          .join(',')}`,
      );
    }
  }
  for (const [width, height] of stateViewports) {
    await page.viewport(width, height);
    await page.send('Page.navigate', {
      url: `http://127.0.0.1:${process.env.GLANCE_PORT ?? 5185}/live-short-viewport?variant=long-section-count-holds`,
    });
    await waitFor(
      "[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Run without music')",
    );
    await clickText('Run without music');
    await page.eval('await document.fonts.ready;');
    await clickText('Play');
    await waitFor("[...document.querySelectorAll('button')].some(n=>n.textContent==='Pause')");
    const content = {};
    for (const [name, expression] of [
      [
        'next',
        "[...document.querySelector('[data-live-region=\"focal\"]').querySelectorAll('p')].find(n=>n.textContent.startsWith('Add a quarter'))",
      ],
      ['countdown', 'document.querySelector(\'[aria-label="Time to next cue"]\')'],
      [
        'bpm',
        "[...document.querySelector('[data-live-region=\"focal\"]').querySelectorAll('span')].find(n=>n.textContent==='BPM').parentElement",
      ],
      [
        'holds',
        "[...document.querySelector('[data-live-region=\"focal\"]').querySelectorAll('span')].find(n=>n.textContent==='Holds').parentElement",
      ],
    ])
      content[name] = await reach(expression);
    await openGuidance();
    content.fullGuidance = await reach(
      "[...document.querySelectorAll('details[open] p')].find(n=>n.textContent.startsWith('Keep shoulders'))",
    );
    // Native disclosure preserves the full authored string; no hidden paragraph clipping.
    content.fullGuidance.complete = await page.eval(
      "const n=[...document.querySelectorAll('details[open] p')].find(n=>n.textContent.startsWith('Keep shoulders'));return n.textContent.includes('prepare to add resistance with control.') && n.scrollHeight===n.clientHeight;",
    );
    await clickText('Pause');
    await waitFor("[...document.querySelectorAll('button')].some(n=>n.textContent==='Play')");
    const more = await page.eval(
      "return !![...document.querySelectorAll('button')].find(n=>n.textContent==='More'&&n.getBoundingClientRect().width>0);",
    );
    if (more) {
      await clickText('More');
      await waitFor(
        "document.getElementById('live-transport-more').getBoundingClientRect().height>0",
      );
    }
    const secondary = await page.eval(
      "const n=[...document.querySelectorAll('button')].find(n=>n.textContent==='Reset');const r=n.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {visible:hit===n||n.contains(hit),width:r.width,height:r.height};",
    );
    if (more) await clickText('Less');
    await clickText('Full List');
    content.fullList = await reach(
      "[...document.querySelector('[data-live-region=\"teaching\"]').querySelectorAll('*')].find(n=>n.children.length===0&&n.textContent.startsWith('Keep shoulders'))",
    );
    await page.screenshot(resolve(output, `${width}x${height}-full-list.png`));
    states.push({
      viewport: { width, height },
      state: 'guidance-more-pause-full-list',
      content,
      secondary,
      pass:
        Object.values(content).every((n) => n.pass) &&
        content.fullGuidance.complete &&
        secondary.visible &&
        secondary.width >= 44 &&
        secondary.height >= 44,
    });
    for (const state of ['waiting', 'error', 'completion']) {
      await page.send('Page.navigate', {
        url: `http://127.0.0.1:${process.env.GLANCE_PORT ?? 5185}/live-short-viewport?variant=long-section-count-holds&state=${state}`,
      });
      await waitFor(
        "[...document.querySelectorAll('button')].some(n=>n.textContent.trim()==='Run without music')",
      );
      await clickText(state === 'completion' ? 'Run without music' : 'Start class');
      if (state === 'completion') {
        await clickText('Play');
        await waitFor(
          "[...document.querySelectorAll('p')].some(n=>n.textContent.startsWith('Complete'))",
        );
      } else if (state === 'error') {
        await waitFor(
          'document.querySelector(\'[aria-label="Playback recovery"][role="alert"]\')?.textContent.includes(\'SoundCloud could not load\')',
        );
      } else {
        await waitFor(
          'document.querySelector(\'[aria-label="Playback recovery"][role="status"]\')?.textContent.includes(\'Waiting for music\')',
        );
      }
      const observation = await page.eval(
        "const recovery=document.querySelector('[aria-label=\"Playback recovery\"]');const primary=[...document.querySelector('[aria-label=\"Live transport\"]').querySelectorAll('button')].find(n=>/^(Pause|Play|Retry)/.test(n.textContent));const r=primary.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {recoveryText:recovery?.textContent,primaryVisible:hit===primary||primary.contains(hit),focus:document.activeElement.getAttribute('aria-label')};",
      );
      if (state === 'completion') {
        observation.completion = await page.eval(measureCompletion);
        await clickText('Full List');
        observation.completionFullList = await page.eval(measureCompletion);
      }
      if (state !== 'completion') {
        observation.recovery = await reach(
          'document.querySelector(\'[aria-label="Playback recovery"]\')',
        );
        observation.continue = await reach(
          "[...document.querySelector('[aria-label=\"Playback recovery\"]').querySelectorAll('button')].find(n=>n.textContent==='Continue without music')",
        );
      }
      await page.screenshot(resolve(output, `${width}x${height}-${state}.png`));
      states.push({
        viewport: { width, height },
        state,
        ...observation,
        pass:
          observation.primaryVisible &&
          (state !== 'error' ||
            (observation.recoveryText.includes('Playback stopped') &&
              observation.recoveryText.includes('SoundCloud could not load') &&
              observation.recoveryText.includes('Retry playback'))) &&
          ((state === 'completion' &&
            observation.completion.pass &&
            observation.completionFullList.pass) ||
            (state !== 'completion' &&
              observation.recovery.pass &&
              observation.continue.pass &&
              observation.recoveryText.includes('Teaching position is held.'))),
      });
    }
    console.log(
      `${width}x${height} state checks: ${states.filter((s) => s.viewport.width === width && s.viewport.height === height).every((s) => s.pass) ? 'PASS' : 'FAIL'}`,
    );
  }
} catch (error) {
  errors.push({ message: error.message });
} finally {
  page.close();
}
if (results.length !== viewports.length * variants.length)
  errors.push({ message: 'Incomplete viewport matrix' });
if (states.length !== stateViewports.length * 4)
  errors.push({ message: 'Incomplete state matrix' });
const sourceFiles = [
  'apps/web/src/components/LiveMode.tsx',
  'apps/web/src/components/LiveMode.test.tsx',
  'docs/audits/live-short-viewport-2026-10-11/fixture.tsx',
  'docs/audits/live-short-viewport-2026-10-11/serve.mjs',
  'docs/audits/live-short-viewport-2026-10-11/capture-p2.mjs',
];
const hashes = {};
for (const file of sourceFiles)
  hashes[file] = createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
const resultPath = resolve(evidence, 'p2-results.json');
let all = {};
try {
  all = JSON.parse(await readFile(resultPath, 'utf8'));
} catch {}
if (all[stage]) {
  all.attempts ??= [];
  all.attempts.push({ stage, ...all[stage] });
}
all[stage] = {
  checkpoint: '9702fd0299063f02890a5d82ab990e047763afc7',
  kind: 'synthetic-Chrome-viewport-emulation',
  providerPlayback: false,
  actualDevice: false,
  actualBrowserZoom: false,
  sourceHashes: hashes,
  errors,
  results,
  states,
};
await writeFile(resultPath, JSON.stringify(all, null, 2) + '\n');
if (errors.length || results.some((r) => !r.pass) || states.some((r) => !r.pass))
  process.exitCode = 1;
