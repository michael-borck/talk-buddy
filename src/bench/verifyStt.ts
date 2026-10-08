// End-to-end verification of the in-app (wasm) Listening Provider.
//
// Exercises the PRODUCTION service path — ensureWasmSttModels (main-process
// downloader + tb-models:// protocol) → blobToPcm16k → inlined worker →
// transformers.js whisper-tiny — with no mocks. The test input is a spoken
// sentence synthesized by Kokoro from the local mirror, encoded to a WAV
// blob exactly like the PCM tap produces.
//
// Sentinel: `__VERIFY_STT__ {"ok":...}` for scripts/verify-wasm-stt.mjs.

// Same mirror shim as the benchmark: kokoro-js fetches voice files from HF.
const realFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
  if (url.startsWith('https://huggingface.co/')) {
    return realFetch('http://localhost:3307/hf-proxy/' + url.slice('https://huggingface.co/'.length), init);
  }
  return realFetch(input as RequestInfo, init);
}) as typeof window.fetch;

window.onerror = (msg) => console.log(`__VERIFY_STT__ ${JSON.stringify({ ok: false, error: String(msg) })}`);

const log = (msg: string, cls = '') => {
  console.log(msg);
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = msg;
  document.getElementById('log')!.appendChild(el);
};

async function main() {
  const { ensureWasmSttModels, wasmSttStatus, transcribeAudio } = await import('../renderer/services/wasmStt');
  const { encodeWav } = await import('../renderer/turn/wav');

  const status = await wasmSttStatus();
  log(`models ${status.installed ? 'already installed' : 'missing: ' + status.missing.join(', ')}`, 'dim');
  const ensured = await ensureWasmSttModels();
  if (!ensured.success) throw new Error(`ensureModels failed: ${ensured.error}`);
  log('models ensured (main process, sha-verified)', 'ok');

  // Spoken test input via Kokoro (mirror-served), same as the phase-2 bench.
  log('synthesizing test sentence with Kokoro…', 'dim');
  const { KokoroTTS } = await import('kokoro-js');
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm' });
  const audio = await tts.generate('Thank you for coming in today. Could you tell me about your background?', {
    voice: 'af_bella', speed: 1.0,
  });
  // transformers.js RawAudio exposes snake_case sampling_rate (no camelCase alias).
  const rate = (audio as unknown as { sampling_rate?: number }).sampling_rate ?? 24_000;
  const wavBlob = encodeWav(audio.audio, rate);
  log(`test WAV ready (${(wavBlob.size / 1e3).toFixed(0)}KB @ ${rate}Hz)`, 'dim');

  // THE production call: wasm Listening Provider, prompt parity param included.
  const t0 = performance.now();
  const result = await transcribeAudio(wavBlob, 'Thank you for coming');
  const ms = Math.round(performance.now() - t0);
  log(`transcribed in ${(ms / 1000).toFixed(2)}s: "${result.text}"`, 'ok');

  const text = result.text.toLowerCase();
  const expected = ['thank you', 'coming', 'today', 'background'];
  const missingWords = expected.filter((w) => !text.includes(w));
  const ok = missingWords.length === 0;
  log(ok ? 'VERDICT: PASS' : `VERDICT: FAIL — missing words: ${missingWords.join(', ')}`, ok ? 'ok' : 'err');
  console.log(`__VERIFY_STT__ ${JSON.stringify({ ok, ms, text: result.text, missingWords })}`);
}

void main().catch((err) => {
  console.log(`__VERIFY_STT__ ${JSON.stringify({ ok: false, error: err instanceof Error ? err.stack : String(err) })}`);
});
