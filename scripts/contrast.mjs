// WCAG contrast audit of the running app.
//
// Reading class strings cannot see a contrast failure, and a screenshot cannot
// tell 3:1 from 4.5:1. This measures each sampled text element's computed
// colour against its real (first non-transparent) background ancestor, in both
// themes, and fails anything under WCAG AA.
//
// Requires the app already running with the debugger attached:
//   npx vite &
//   npx electron . --dev --no-sandbox --remote-debugging-port=9222 &
//   node scripts/contrast.mjs
//
// Known limits: it samples the first h1/p/a/button per route rather than every
// element, and it reads background-color, so a background set by gradient or
// background-image is reported against the wrong ancestor. Ivory text on the
// dark sidebar is a deliberate exception and should be read as such.
// Measure WCAG contrast of real text against its real background, in both
// themes. Eyeballing a screenshot cannot tell 3:1 from 4.5:1.
const PORT = 9222, BASE = 'http://localhost:3307/#';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = await fetch(`http://localhost:${PORT}/json/list`);
const page = (await res.json()).find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r);
  ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;

await send('Page.enable');
let fails = [];
let checked = 0;

// Runs in the page: walk up for the first non-transparent background.
const PROBE = `(() => {
  const lum = (c) => { const [r,g,b] = c.match(/[\\d.]+/g).map(Number).slice(0,3)
      .map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*r + 0.7152*g + 0.0722*b; };
  const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
  const bgOf = (el) => { let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
      n = n.parentElement; }
    return getComputedStyle(document.body).backgroundColor; };
  const pick = (sel, label) => { const el = document.querySelector(sel); if (!el) return null;
    const s = getComputedStyle(el);
    return { label, sel, color: s.color, bg: bgOf(el),
             size: parseFloat(s.fontSize), weight: s.fontWeight,
             ratio: +ratio(s.color, bgOf(el)).toFixed(2) }; };
  return ['h1','p','a','button'].map((t,i) => pick(t, t)).filter(Boolean);
})()`;

for (const theme of ['light', 'dark']) {
  for (const route of ['/', '/scenarios', '/sessions', '/archive', '/packs', '/scenarios/new', '/settings', '/settings?tab=tts', '/setup-check']) {
    await send('Page.navigate', { url: BASE + route });
    await sleep(1600);
    await ev(`document.documentElement.setAttribute('data-theme','${theme}')`);
    await sleep(500);
    const out = await ev(PROBE);
    console.log(`\n${theme} ${route}`);
    for (const r of out) {
      const large = r.size >= 24 || (r.size >= 18.66 && Number(r.weight) >= 700);
      const need = large ? 3 : 4.5;
      if (r.ratio < need) fails.push(`${theme} ${route} ${r.sel} ${r.ratio}:1 (needs ${need}) ${r.color} on ${r.bg}`);
      checked++;
    }
  }
}
console.log(`\nchecked ${checked} text/background pairs`);
if (fails.length) { console.log('FAILURES:'); fails.forEach(f=>console.log('  '+f)); } else console.log('ALL PASS — every sampled pair meets WCAG AA');
ws.close();
