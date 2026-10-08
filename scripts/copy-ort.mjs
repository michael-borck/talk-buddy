// Copy onnxruntime-web's WASM runtime into public/ort/ so the Silero VAD
// runs fully offline (ORT fetches these at session creation, not from a CDN).
// Vendored binaries are not committed — postinstall refreshes them from
// node_modules on every install.
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const src = path.resolve('node_modules/onnxruntime-web/dist');
const dest = path.resolve('public/ort');
const files = ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];

try {
  mkdirSync(dest, { recursive: true });
  for (const f of files) copyFileSync(path.join(src, f), path.join(dest, f));
  console.log('[copy-ort] onnxruntime-web WASM copied to public/ort/');
} catch (err) {
  // Non-fatal: the app falls back to amplitude-based endpointing without it.
  console.warn('[copy-ort] Skipped —', err instanceof Error ? err.message : err);
}
