const { chromium } = require('playwright');
const http = require('http');
(async () => {
  let b; let s;
  try {
    // Port 0: the OS picks a free port, so a busy fixed port cannot break the run.
    s = http.createServer((q, res) => res.end('<p>x</p>'));
    await new Promise((resolve, reject) => { s.once('error', reject); s.listen(0, '127.0.0.1', resolve); });
    b = await chromium.launch(); const p = await b.newPage();
    await p.goto(`http://localhost:${s.address().port}/`);
    const r = await p.evaluate(async () => {
      const cfg=[{initDataTypes:['cenc'],audioCapabilities:[{contentType:'audio/mp4; codecs="mp4a.40.2"'}]}];
      const out={};
      const request = navigator.requestMediaKeySystemAccess;
      try { await request('org.w3.clearkey', cfg); out.unbound='resolved'; } catch(e){ out.unbound=e.constructor.name+': '+e.message; }
      try { await navigator.requestMediaKeySystemAccess('org.w3.clearkey', cfg); out.bound='resolved'; } catch(e){ out.bound=e.constructor.name+': '+e.message; }
      return out; });
    console.log(JSON.stringify(r));
  } finally {
    if (b) await b.close().catch(() => {});
    if (s) s.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
