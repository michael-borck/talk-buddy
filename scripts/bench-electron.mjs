// Electron runner for the speech benchmark: loads bench.html from the dev
// server, relays renderer console to stdout, prints the __BENCH_RESULT__
// sentinel line, and exits. Usage:
//   BENCH_COOP=1 npx vite &      # dev server with cross-origin isolation
//   npx electron scripts/bench-electron.mjs
import { app, BrowserWindow } from 'electron';

const BENCH_URL = process.env.BENCH_URL || 'http://localhost:3307/bench.html';
const TIMEOUT_MS = 15 * 60 * 1000;

const timer = setTimeout(() => {
  console.error('__BENCH_ERROR__ timeout after 15min');
  app.exit(1);
}, TIMEOUT_MS);

function handleConsole(...args) {
  // Electron ≥32 passes a structured event; older builds pass
  // (event, level, message, line, sourceId). Support both.
  const ev = args[0];
  const message = ev && typeof ev === 'object' && 'message' in ev ? ev.message : args[2];
  if (typeof message !== 'string') return;
  console.log('[bench]', message);
  if (message.includes('__BENCH_RESULT__')) {
    clearTimeout(timer);
    // Give the page a beat to flush remaining logs, then exit cleanly.
    setTimeout(() => app.exit(0), 500);
  } else if (message.includes('__BENCH_ERROR__')) {
    clearTimeout(timer);
    setTimeout(() => app.exit(1), 500);
  }
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 960,
    height: 800,
    show: true,
    title: 'Talk Buddy speech benchmark',
  });
  win.webContents.on('console-message', handleConsole);
  win.loadURL(BENCH_URL);
});

app.on('window-all-closed', () => app.exit(0));
