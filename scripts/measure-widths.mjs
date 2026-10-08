// Measure the real content column width of every route at several viewports.
//
// The plan's estimates (~880-960px) were guesses. This reports what each
// page actually renders, which is the only basis for a single width rule.
//
//   npx vite &
//   npx electron . --dev --no-sandbox --remote-debugging-port=9222 &
//   node scripts/measure-widths.mjs
const PORT = 9222, BASE = 'http://localhost:3307/#';
const ROUTES = [
  ['home', '/'], ['scenarios', '/scenarios'], ['sessions', '/sessions'],
  ['archive', '/archive'], ['packs', '/packs'], ['scenarios-new', '/scenarios/new'],
  ['settings', '/settings'], ['setup-check', '/setup-check'],
];
const VIEWPORTS = [[820, 900, 'sm'], [1280, 900, 'lg'], [1680, 1000, 'xl']];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const PROBE = `(() => {
  // The page's reading column: the widest centred element that actually
  // constrains its content.
  let best = null;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.maxWidth === 'none') continue;
    // Centre by class, not computed style: a used margin-left resolves to 0px
    // whenever max-width has not capped the box, so 'auto' never comes back.
    const cls = (el.className || '').toString();
    if (!cls.includes('mx-auto') && !cls.includes('page-')) continue;
    const w = Math.round(el.getBoundingClientRect().width);
    if (w < 380) continue;
    if (!best || w > best.width) {
      best = { width: w, maxWidth: Math.round(parseFloat(s.maxWidth)),
               pad: s.paddingLeft, cls: cls.slice(0, 52) };
    }
  }
  return best;
})()`;

const rows = [];
for (const [w, h, label] of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  for (const [name, route] of ROUTES) {
    await send('Page.navigate', { url: BASE + route });
    await sleep(1400);
    const m = await ev(PROBE);
    if (m) rows.push({ vp: `${label} ${w}`, name, ...m });
  }
}
await send('Emulation.clearDeviceMetricsOverride');

console.log('viewport   route           rendered  capped-at  padding-left  class');
for (const r of rows) {
  const cap = r.maxWidth >= 10000 ? 'none' : r.maxWidth;
  const capped = r.width === cap ? 'yes' : 'no';
  console.log(
    `${r.vp.padEnd(10)} ${r.name.padEnd(15)} ${String(r.width).padStart(6)}px  ${String(cap).padStart(9)}  ${r.pad.padStart(12)}  ${r.cls}`);
}
const widths = {};
for (const r of rows.filter(r => r.vp.startsWith('xl'))) widths[r.name] = r.width;
console.log('\nat xl, distinct rendered widths:', [...new Set(Object.values(widths))].sort((a,b)=>a-b).join(', '));
ws.close();
