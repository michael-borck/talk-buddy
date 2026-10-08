// Wasm STT model manager (main process).
//
// Phase 3 of the sidecar retirement: the in-renderer Listening Provider runs
// whisper-tiny via transformers.js, with ONNX weights downloaded once into
// userData — same UX as the old Python venv setup, minus ~460MB. Integrity
// follows the embedded-server discipline (setup.sh pins SHA-256s): the two
// model binaries are LFS-pinned and verified after download; the small JSON/
// tokenizer files are size-checked (a tampered config can degrade quality
// but carries no secrets).
//
// Served to the renderer/worker through the tb-models:// privileged scheme
// (registered in index.js) because workers cannot fetch file:// paths.

const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HF_BASE = 'https://huggingface.co';
const REPO = 'onnx-community/whisper-tiny';

// sha256 pins from the HF LFS metadata (api/models/.../tree/main) — the ONNX
// binaries are the integrity-critical files.
const FILES = [
  { file: 'config.json', size: 2243 },
  { file: 'generation_config.json', size: 3772 },
  { file: 'preprocessor_config.json', size: 339 },
  { file: 'quantize_config.json', size: 10126 },
  { file: 'tokenizer.json', size: 2480466 },
  { file: 'tokenizer_config.json', size: 282683 },
  { file: 'vocab.json', size: 1036584 },
  { file: 'merges.txt', size: 493869 },
  { file: 'special_tokens_map.json', size: 2194 },
  { file: 'added_tokens.json', size: 34604 },
  { file: 'normalizer.json', size: 52666 },
  { file: 'onnx/encoder_model_quantized.onnx', size: 10124990, sha256: '2af4a414ca47aa30f61246017e5fe82b0a8d229281d1255ba666a2a7f6b84d19' },
  { file: 'onnx/decoder_model_merged_quantized.onnx', size: 30719241, sha256: '25e807a962b6349356d0ea5d0dfe530b7e5bf0e2a484aeca0359d03143faddd3' },
];

const TOTAL_BYTES = FILES.reduce((sum, f) => sum + f.size, 0);

function modelsDir() {
  return path.join(app.getPath('userData'), 'models', 'whisper-tiny');
}

// Dev shortcut: scripts/fetch-bench-models.mjs already mirrors these exact
// files into public/hf-proxy — copy instead of re-downloading.
function devMirrorDir() {
  if (app.isPackaged) return null;
  const mirror = path.join(app.getAppPath(), 'public', 'hf-proxy', REPO, 'resolve', 'main');
  return fs.existsSync(mirror) ? mirror : null;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Status of each manifest entry: installed = present with matching size. */
function status() {
  const dir = modelsDir();
  const missing = [];
  for (const f of FILES) {
    const p = path.join(dir, f.file);
    let ok = false;
    try {
      ok = fs.statSync(p).size === f.size;
    } catch {
      ok = false;
    }
    if (!ok) missing.push(f.file);
  }
  return { installed: missing.length === 0, dir, missing, totalBytes: TOTAL_BYTES };
}

/**
 * Download (or copy from the dev mirror) every missing file. Verifies size
 * (+ sha256 where pinned) before installing atomically. Emits progress via
 * the passed sender: { file, received, total, pct }.
 */
async function ensureModels(sender) {
  const dir = modelsDir();
  const mirror = devMirrorDir();
  fs.mkdirSync(dir, { recursive: true });

  const emit = (payload) => {
    if (sender && !sender.isDestroyed()) sender.send('wasm-stt:progress', payload);
  };

  for (const entry of FILES) {
    const dest = path.join(dir, entry.file);
    let present = false;
    try {
      present = fs.statSync(dest).size === entry.size;
    } catch { /* missing */ }
    if (present) continue;

    emit({ file: entry.file, received: 0, total: entry.size, pct: 0 });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.download';

    if (mirror) {
      const src = path.join(mirror, entry.file);
      fs.copyFileSync(src, tmp);
      const buf = fs.readFileSync(tmp);
      if (buf.length !== entry.size) throw new Error(`mirror size mismatch: ${entry.file}`);
      if (entry.sha256 && sha256(buf) !== entry.sha256) throw new Error(`mirror sha256 mismatch: ${entry.file}`);
      fs.renameSync(tmp, dest);
      emit({ file: entry.file, received: entry.size, total: entry.size, pct: 100 });
      continue;
    }

    const res = await fetch(`${HF_BASE}/${REPO}/resolve/main/${entry.file}`, { redirect: 'follow' });
    if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText} downloading ${entry.file}`);

    const hash = crypto.createHash('sha256');
    let received = 0;
    const out = fs.createWriteStream(tmp);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      received += value.length;
      if (!out.write(value)) {
        await new Promise((resolve) => out.once('drain', resolve));
      }
      emit({ file: entry.file, received, total: entry.size, pct: Math.min(100, Math.round((received / entry.size) * 100)) });
    }
    await new Promise((resolve, reject) => { out.end(resolve); out.on('error', reject); });

    if (received !== entry.size) throw new Error(`size mismatch for ${entry.file}: ${received} != ${entry.size}`);
    if (entry.sha256 && hash.digest('hex') !== entry.sha256) throw new Error(`sha256 mismatch for ${entry.file}`);
    fs.renameSync(tmp, dest);
    emit({ file: entry.file, received: entry.size, total: entry.size, pct: 100 });
  }

  return { success: true, dir, ...status() };
}

module.exports = { status, ensureModels, modelsDir };
