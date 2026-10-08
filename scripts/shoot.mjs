// Visual check harness: screenshots the real app over CDP.
//
// The app needs its preload bridge and sqlite, so it has to run as the actual
// Electron app rather than in a bare browser. Launching it with
// --remote-debugging-port exposes the renderer to the Chrome DevTools
// Protocol, which lets us navigate and capture without changing a line of app
// code.
//
//   npx vite &
//   npx electron . --dev --no-sandbox --remote-debugging-port=9222 &
//   node scripts/shoot.mjs <outDir> [light|dark|both]
//
// Two things this has to neutralise to produce honest pictures:
//
//   * CSS animations. An occluded window never advances them, so every
//     `animate-fade-in` page is captured frozen at opacity 0 and looks broken.
//   * The theme. `data-theme` is set from a stored preference, so it is pinned
//     per run rather than inherited from whatever the machine happens to be in.
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/opencode/shots';
const THEME_ARG = process.argv[3] || 'both';
const PORT = 9222;
// The app uses a HashRouter, so routes live after the '#'. Navigating to a
// bare path just serves index.html and lands on Home — which looks like a
// successful capture of the wrong page.
const BASE = 'http://localhost:3307/#';

const ROUTES = [
  ['home', '/'],
  ['scenarios', '/scenarios'],
  ['sessions', '/sessions'],
  ['archive', '/archive'],
  ['packs', '/packs'],
  ['scenarios-new', '/scenarios/new'],
  ['settings', '/settings'],
  ['settings-tts', '/settings?tab=tts'],
  ['settings-chat', '/settings?tab=chat'],
  ['setup-check', '/setup-check'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

async function findPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* debugger not up yet */ }
    await sleep(500);
  }
  throw new Error('no CDP page target found');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, 30000);
    });
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const target = await findPageTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const cdp = new Cdp(ws);

  // A page that throws renders blank, which would otherwise be mistaken for a
  // layout problem in the picture.
  const errors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.exceptionDetails;
      errors.push(d?.exception?.description || d?.text || 'unknown');
    }
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  const themes = THEME_ARG === 'both' ? ['light', 'dark'] : [THEME_ARG];

  for (const theme of themes) {
    for (const [name, route] of ROUTES) {
      const before = errors.length;
      await cdp.send('Page.navigate', { url: BASE + route });
      await sleep(1800);

      // Applied after load: the app resolves its own theme preference in an
      // async effect and will overwrite this, so re-assert until it sticks and
      // confirm before capturing. Without the check, a "light" run silently
      // photographs a dark page.
      for (let attempt = 0; attempt < 6; attempt++) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            document.documentElement.setAttribute('data-theme', '${theme}');
            if (!document.getElementById('__freeze')) {
              const s = document.createElement('style');
              s.id = '__freeze';
              s.textContent = ${JSON.stringify(FREEZE_CSS)};
              document.head.appendChild(s);
            }
          `,
        });
        await sleep(400);
        const applied = await cdp.send('Runtime.evaluate', {
          expression: "document.documentElement.getAttribute('data-theme')",
          returnByValue: true,
        });
        if (applied.result?.value === theme) break;
      }

      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`${OUT}/${theme}-${name}.png`, Buffer.from(data, 'base64'));
      const errs = errors.slice(before);
      console.log(
        `${theme.padEnd(5)} ${name.padEnd(16)} ${errs.length ? 'RENDERER ERROR: ' + errs[0].split('\n')[0] : 'ok'}`
      );
    }
  }

  ws.close();
}

main().catch((err) => {
  console.error('shoot failed:', err.message);
  process.exit(1);
});
