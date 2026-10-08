// Download the Phase-2 benchmark models, mirrored into public/hf-proxy/
// using the exact HuggingFace path layout. The bench page shims
// window.fetch to redirect huggingface.co → this local mirror, which keeps
// the run inside the dev server's 'self' CSP and makes the whole benchmark
// reproducible offline once fetched.
//
// Files (≈150MB total):
//   whisper-tiny q8  — encoder_model_quantized + decoder_model_merged_quantized
//   Kokoro-82M q8    — model_quantized + two voice style vectors
//
// gitignored: this is a dev-machine cache, never committed.
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const MIRROR = path.resolve('public/hf-proxy');
const HF = 'https://huggingface.co';

const FILES = [
  // Whisper tiny (multilingual — parity with the current ggml-tiny), q8.
  ['onnx-community/whisper-tiny', 'config.json'],
  ['onnx-community/whisper-tiny', 'generation_config.json'],
  ['onnx-community/whisper-tiny', 'preprocessor_config.json'],
  ['onnx-community/whisper-tiny', 'quantize_config.json'],
  ['onnx-community/whisper-tiny', 'tokenizer.json'],
  ['onnx-community/whisper-tiny', 'tokenizer_config.json'],
  ['onnx-community/whisper-tiny', 'vocab.json'],
  ['onnx-community/whisper-tiny', 'merges.txt'],
  ['onnx-community/whisper-tiny', 'special_tokens_map.json'],
  ['onnx-community/whisper-tiny', 'added_tokens.json'],
  ['onnx-community/whisper-tiny', 'normalizer.json'],
  ['onnx-community/whisper-tiny', 'onnx/encoder_model_quantized.onnx'],
  ['onnx-community/whisper-tiny', 'onnx/decoder_model_merged_quantized.onnx'],
  // Kokoro 82M q8 — the same model the Speaches cloud path serves.
  ['onnx-community/Kokoro-82M-v1.0-ONNX', 'config.json'],
  ['onnx-community/Kokoro-82M-v1.0-ONNX', 'tokenizer.json'],
  ['onnx-community/Kokoro-82M-v1.0-ONNX', 'tokenizer_config.json'],
  ['onnx-community/Kokoro-82M-v1.0-ONNX', 'onnx/model_quantized.onnx'],
  ['onnx-community/Kokoro-82M-v1.0-ONNX', 'voices/af_bella.bin'],
  ['onnx-community/Kokoro-82M-v1.0-ONNX', 'voices/am_adam.bin'],
];

async function fetchTo(repo, file) {
  const dest = path.join(MIRROR, repo, 'resolve', 'main', file);
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`  ok  ${repo}/${file} (cached)`);
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  const url = `${HF}/${repo}/resolve/main/${file}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`  new ${repo}/${file} (${(buf.length / 1e6).toFixed(1)}MB)`);
}

console.log('[bench-models] mirroring into', MIRROR);
for (const [repo, file] of FILES) {
  await fetchTo(repo, file);
}
console.log('[bench-models] done');
