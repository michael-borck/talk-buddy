// Electron runner for the wasm STT verification (see src/bench/verifyStt.ts).
// Registers the same tb-models bridge as the real app, then loads the verify
// page. Usage: npx vite & then npx electron scripts/verify-wasm-stt.mjs
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { registerSchemes, registerWasmSttBridge } = require('../src/main/wasm-stt-ipc.js');
registerSchemes();

const URL_ = process.env.VERIFY_URL || 'http://localhost:3307/verify-stt.html';
const TIMEOUT_MS = 10 * 60 * 1000;

const timer = setTimeout(() => {
  console.error('__VERIFY_STT__ {"ok":false,"error":"timeout after 10min"}');
  app.exit(1);
}, TIMEOUT_MS);

function handleConsole(...args) {
  const ev = args[0];
  const message = ev && typeof ev === 'object' && 'message' in ev ? ev.message : args[2];
  if (typeof message !== 'string') return;
  console.log('[verify]', message);
  if (message.includes('__VERIFY_STT__')) {
    clearTimeout(timer);
    setTimeout(() => app.exit(message.includes('"ok":true') ? 0 : 1), 500);
  }
}

app.whenReady().then(() => {
  registerWasmSttBridge();
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: true,
    // Same preload as the real app — the service talks to electronAPI.
    // (getAppPath() points at scripts/ when electron runs a script here.)
    webPreferences: { preload: path.join(process.cwd(), 'src', 'main', 'preload.js') },
  });
  win.webContents.on('console-message', handleConsole);
  win.loadURL(URL_);
});

app.on('window-all-closed', () => app.exit(0));
