const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const http=require('http'); const s=http.createServer((q,res)=>res.end('<p>x</p>')).listen(8811); await p.goto('http://localhost:8811/');
  const r = await p.evaluate(async () => {
    const cfg=[{initDataTypes:['cenc'],audioCapabilities:[{contentType:'audio/mp4; codecs="mp4a.40.2"'}]}];
    const out={};
    const request = navigator.requestMediaKeySystemAccess;
    try { await request('org.w3.clearkey', cfg); out.unbound='resolved'; } catch(e){ out.unbound=e.constructor.name+': '+e.message; }
    try { await navigator.requestMediaKeySystemAccess('org.w3.clearkey', cfg); out.bound='resolved'; } catch(e){ out.bound=e.constructor.name+': '+e.message; }
    return out; });
  console.log(JSON.stringify(r)); await b.close(); s.close();
})();
