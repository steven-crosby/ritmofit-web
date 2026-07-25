// Minimal Chrome DevTools Protocol driver — no dependencies (Node 22+ global WebSocket).
// Drives the real Chrome install, so measurements come from real Blink layout and
// real computed styles rather than jsdom approximations.
import { writeFileSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9222;

async function targets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  return res.json();
}

export async function newPage(url = 'about:blank') {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  });
  return res.json();
}

export async function attach(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, err) => {
    ws.onopen = ok;
    ws.onerror = err;
  });

  let nextId = 1;
  const pending = new Map();
  const events = [];
  const listeners = [];

  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
      for (const l of listeners) l(msg);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 30000);
    });

  const api = {
    send,
    events,
    on: (fn) => listeners.push(fn),
    close: () => ws.close(),

    /** Evaluate in page context; returns the resolved value. */
    async eval(expression) {
      const r = await send('Runtime.evaluate', {
        expression: `(async () => { ${expression} })()`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
      }
      return r.result.value;
    },

    async goto(url, { waitMs = 1200 } = {}) {
      await send('Page.navigate', { url });
      await new Promise((r) => setTimeout(r, waitMs));
    },

    async viewport(width, height, deviceScaleFactor = 1, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor,
        mobile,
      });
    },

    async reducedMotion(on) {
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' }],
      });
    },

    async screenshot(path) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(path, Buffer.from(data, 'base64'));
      return path;
    },

    async setCookie(cookie) {
      await send('Network.setCookie', cookie);
    },
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  return api;
}

export async function firstPage() {
  const list = await targets();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  return attach(page);
}
