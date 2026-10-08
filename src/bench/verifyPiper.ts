// End-to-end verification of the in-app (piper) Voice Provider.
//
// Exercises the PRODUCTION path: ensurePiper (main-process download +
// extraction of the piper binary, dylibs, and SHA-pinned voices) →
// piper:speak IPC → spawned piper process → WAV bytes back to the renderer.
// The WAV is decoded and sanity-checked (duration, non-silence RMS).
//
// First run downloads ~170MB of engine + voices into userData.

window.onerror = (msg) => console.log(`__VERIFY_PIPER__ ${JSON.stringify({ ok: false, error: String(msg) })}`);

const log = (msg: string, cls = '') => {
  console.log(msg);
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = msg;
  document.getElementById('log')!.appendChild(el);
};

function rmsOf(pcm: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
  return Math.sqrt(sum / Math.max(1, pcm.length));
}

async function main() {
  const { ensurePiper, piperStatus } = await import('../renderer/services/piperTts');
  const { decodeWavPcm } = await import('../renderer/services/wasmStt');

  const status = await piperStatus();
  log(`status: engine=${status.piperInstalled ? '✓' : '✗'} voices male=${status.voices.male} female=${status.voices.female}`, 'dim');
  const ensured = await ensurePiper();
  if (!ensured.success) throw new Error(`ensurePiper failed: ${ensured.error}`);
  log('engine + voices ensured (downloaded/verified)', 'ok');

  // Both voices, production IPC shape.
  for (const voice of ['male', 'female'] as const) {
    const t0 = performance.now();
    const result = await window.electronAPI.piper.speak({
      text: 'Thank you for coming in today. Could you tell me about your background?',
      voice,
      speed: 1.2,
    });
    const ms = Math.round(performance.now() - t0);
    if (!result.ok || !result.wav) throw new Error(`speak(${voice}) failed: ${result.error}`);

    const parsed = decodeWavPcm(result.wav.buffer as ArrayBuffer);
    if (!parsed) throw new Error(`speak(${voice}) produced an unparseable WAV`);
    const dur = parsed.pcm.length / parsed.sampleRate;
    const rms = rmsOf(parsed.pcm);
    const ok = dur > 1.5 && dur < 15 && rms > 0.005;
    log(`${voice}: ${(ms / 1000).toFixed(2)}s → ${dur.toFixed(1)}s audio @ ${parsed.sampleRate}Hz, RMS ${rms.toFixed(3)} — ${ok ? 'OK' : 'BAD'}`, ok ? 'ok' : 'err');
    if (!ok) {
      console.log(`__VERIFY_PIPER__ ${JSON.stringify({ ok: false, voice, dur, rms })}`);
      return;
    }
  }
  console.log(`__VERIFY_PIPER__ ${JSON.stringify({ ok: true })}`);
  log('VERDICT: PASS', 'ok');
}

void main().catch((err) => {
  console.log(`__VERIFY_PIPER__ ${JSON.stringify({ ok: false, error: err instanceof Error ? err.stack : String(err) })}`);
});

export {};
