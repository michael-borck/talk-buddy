// tb-models:// bridge + wasm-stt IPC — one module so both the real app
// (src/main/index.js) and the dev verification runner
// (scripts/verify-wasm-stt.mjs) register the identical wiring.

const { app, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const wasmSttModels = require('./wasm-stt-models');

// Privileged custom scheme serving the in-app STT models (userData) and the
// ORT WASM runtime (dist/ort) to the renderer AND its Web Worker — workers
// can't fetch file:// paths, so packaged builds stream both mounts through
// here. standard:true makes tb-models://models/x/y parse as host+path so the
// transformers.js remoteHost/remotePathTemplate machinery resolves normally.
// Must be registered before app ready.
function registerSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'tb-models',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        // Fetchable as a CORS target from the http/file page origin — the
        // blob:-origin worker and renderer both need this.
        corsEnabled: true,
      },
    },
  ]);
}

// Locate the ORT dist transformers.js actually loads: its own ORT build
// (nested dependency) when present, else the top-level onnxruntime-web.
// The loader expects ort-wasm-simd-threaded.asyncify.* — verify the candidate
// ships that file set. Walk-up works from src/main (real app, incl. asar)
// and from scripts/ (verify runner).
function transformersOrtDist() {
  let dir = __dirname;
  for (let i = 0; i < 4; i++) {
    const nested = path.join(dir, 'node_modules', '@huggingface', 'transformers', 'node_modules', 'onnxruntime-web', 'dist');
    const top = path.join(dir, 'node_modules', 'onnxruntime-web', 'dist');
    if (fs.existsSync(path.join(nested, 'ort-wasm-simd-threaded.asyncify.wasm'))) return nested;
    if (fs.existsSync(path.join(top, 'ort-wasm-simd-threaded.asyncify.wasm'))) return top;
    dir = path.dirname(dir);
  }
  return null;
}

// Resolve a tb-models mount to an absolute directory. Shared by the
// protocol handler and the loopback asset server below.
function resolveMount(mount) {
  switch (mount) {
    case 'models':
      // modelsDir() points at .../models/whisper-tiny; the mount base is the
      // parent so tb-models://models/whisper-tiny/<file> resolves correctly.
      return path.dirname(wasmSttModels.modelsDir());
    case 'ort':
      return path.join(__dirname, '..', '..', 'dist', 'ort');
    case 'ort-transformers':
      return transformersOrtDist();
    case 'app-models':
      return path.join(__dirname, '..', '..', 'dist', 'models');
    default:
      return null;
  }
}

const MIME = {
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

// Stream a tb-models:// request from disk. Mounts: models/ → userData/models
// (runtime-downloaded weights), ort/ → dist/ort (Silero VAD's onnxruntime-web
// runtime), ort-transformers/ → transformers.js's own ORT dist, app-models/ →
// dist/models (bundle-shipped weights, e.g. Silero). Path-traversal
// hardened; ACAO * because blob:-origin workers fetch cross-origin.
async function handleTbModelsRequest(request) {
  const url = new URL(request.url);
  const base = resolveMount(url.host);
  if (!base) return new Response('not found', { status: 404 });
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const resolvedBase = path.resolve(base);
  const full = path.resolve(resolvedBase, rel);
  if (!full.startsWith(resolvedBase + path.sep)) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const data = fs.readFileSync(full);
    return new Response(data, {
      headers: {
        'access-control-allow-origin': '*',
        'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}

// ---- Loopback asset server -------------------------------------------------
//
// Chromium's ESM module loader (used by ORT's dynamic import of the
// emscripten .mjs) only accepts http(s) — custom schemes are fetchable but
// not importable. A token-guarded 127.0.0.1 server serves the same mounts so
// the worker can import its loader in dev and packaged builds alike. The
// random port + per-session token keep other local processes out, mirroring
// the embedded-server auth model.

let assetServerInfo = null;

async function assetBase() {
  if (assetServerInfo) return assetServerInfo;
  const token = require('crypto').randomBytes(24).toString('hex');
  const server = require('http').createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const parts = decodeURIComponent(url.pathname).replace(/^\/+/, '').split('/');
      const [tokenPart, mount, ...rest] = parts;
      const fail = (code) => {
        res.writeHead(code, { 'Access-Control-Allow-Origin': '*' });
        res.end();
      };
      if (tokenPart !== token || !mount || rest.length === 0) return fail(404);
      const base = resolveMount(mount);
      if (!base) return fail(404);
      const resolvedBase = path.resolve(base);
      const full = path.resolve(resolvedBase, ...rest);
      if (!full.startsWith(resolvedBase + path.sep)) return fail(403);
      const data = fs.readFileSync(full);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
      res.end();
    }
  });
  // server.address() is only valid once the 'listening' event fires.
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  assetServerInfo = { port: server.address().port, token };
  return assetServerInfo;
}

// Call once inside app.whenReady().
function registerWasmSttBridge() {
  protocol.handle('tb-models', handleTbModelsRequest);
  ipcMain.handle('wasm-stt:status', () => wasmSttModels.status());
  ipcMain.handle('wasm-stt:asset-base', async () => {
    const { port, token } = await assetBase();
    return `http://127.0.0.1:${port}/${token}`;
  });
  ipcMain.handle('wasm-stt:ensure-models', async (event) => {
    try {
      return await wasmSttModels.ensureModels(event.sender);
    } catch (err) {
      console.error('wasm-stt:ensure-models failed:', err);
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  });
}

module.exports = { registerSchemes, registerWasmSttBridge };
