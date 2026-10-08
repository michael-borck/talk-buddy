// Wasm STT service — the renderer half of the in-app Listening Provider.
//
// Responsibilities:
//   - model lifecycle: status / download-with-progress (main process owns IO)
//   - audio: WAV blobs are parsed directly (exact 16kHz — our PCM tap's
//     output); anything else (MediaRecorder fallback webm) is decoded via
//     AudioContext and decimated, reusing the VAD resampler
//   - worker lifecycle: lazily constructs the inlined worker, hands it the
//     tb-models:// bases, serialises transcription requests
//
// See wasmSttWorker.ts for the wire protocol.

import { TranscriptionResult } from '../types';
import { downsampleTo16k } from '../turn/vad';

export interface WasmSttStatus {
  installed: boolean;
  dir: string;
  missing: string[];
  totalBytes: number;
}

export function wasmSttStatus(): Promise<WasmSttStatus> {
  return window.electronAPI.wasmStt.status();
}

export function ensureWasmSttModels(): Promise<{ success: boolean; error?: string }> {
  return window.electronAPI.wasmStt.ensureModels();
}

export function onWasmSttProgress(cb: (p: { file: string; received: number; total: number; pct: number }) => void): () => void {
  return window.electronAPI.wasmStt.onProgress(cb);
}

// ---- Worker plumbing ---------------------------------------------------------

interface PendingEntry {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
}

// Lazily built: the inlined worker embeds transformers.js, so it must stay
// out of the main chunk (dynamic import keeps it code-split).
let worker: Worker | null = null;
// Loopback base for loader/asset files — ORT dynamically *imports* its
// emscripten module, and Chromium's module loader only accepts http(s), so
// the custom protocol alone can't serve it. Main runs a token-guarded
// 127.0.0.1 server sharing the protocol's mounts.
let assetBase: string | null = null;
let readyPromise: Promise<Worker> | null = null;
let nextId = 0;
const pending = new Map<number, PendingEntry>();

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  if (!readyPromise) {
    readyPromise = (async () => {
      // One loopback base for everything the worker needs: ORT's ESM loader
      // (module imports are http-only in Chromium) AND the model repo layout
      // (transformers.js existence probes hard-reject non-http(s) URLs, which
      // would silently null out the tokenizer/processor). Served by the
      // token-guarded 127.0.0.1 server in the main process.
      assetBase = await window.electronAPI.wasmStt.assetBase();
      const { default: WasmSttWorkerCtor } = await import('./wasmSttWorker?worker&inline');
      const w = new WasmSttWorkerCtor();
      w.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'ready') return;
        if (msg.type === 'init-error') {
          console.error('Wasm STT worker init failed:', msg.error);
          return;
        }
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        if (msg.type === 'result') entry.resolve(msg.text);
        else if (msg.type === 'error') entry.reject(new Error(msg.error));
      };
      w.onerror = (e) => console.error('Wasm STT worker error:', e.message);
      const firstMessage = new Promise<void>((resolve, reject) => {
        const onFirst = (e: MessageEvent) => {
          w.removeEventListener('message', onFirst as EventListener);
          if (e.data.type === 'ready') resolve();
          else reject(new Error(e.data.error || 'worker init failed'));
        };
        w.addEventListener('message', onFirst);
      });
      w.postMessage({
        type: 'init',
        ortBase: `${assetBase}/ort-transformers`,
        modelsBase: `${assetBase}/models`,
      });
      await firstMessage;
      worker = w;
      return w;
    })();
    readyPromise.catch(() => { readyPromise = null; });
  }
  return readyPromise;
}

async function transcribeInWorker(pcm: Float32Array): Promise<string> {
  const w = await getWorker();
  const id = ++nextId;
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    // Transfer the buffer — the worker owns it from here.
    w.postMessage({ type: 'transcribe', id, pcm }, [pcm.buffer]);
  }).catch((err) => {
    pending.delete(id);
    throw err;
  });
}

// ---- Audio decoding ------------------------------------------------------------

/**
 * Extract 16kHz mono PCM from a captured blob. Our own WAV (from the PCM
 * tap) is parsed directly to preserve the exact 16kHz samples; other
 * containers (legacy MediaRecorder webm) go through decodeAudioData and are
 * decimated with the shared resampler.
 */
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  if (blob.type.includes('wav')) {
    const parsed = decodeWavPcm(buf);
    if (parsed) {
      return downsampleTo16k(parsed.pcm, parsed.sampleRate);
    }
    // Malformed header — fall through to decodeAudioData, which handles a
    // wider range of encodings.
  }
  const Ctor = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  try {
    const decoded = await ctx.decodeAudioData(buf);
    return downsampleTo16k(decoded.getChannelData(0), decoded.sampleRate);
  } finally {
    void ctx.close().catch(() => {});
  }
}

/**
 * Minimal RIFF/WAVE parser: finds the data chunk and returns the samples of
 * a 16-bit PCM file at its native rate, or null when the layout isn't
 * 16-bit PCM (caller falls back to decodeAudioData).
 */
export function decodeWavPcm(buf: ArrayBuffer): { pcm: Float32Array; sampleRate: number } | null {
  const view = new DataView(buf);
  if (buf.byteLength < 44) return null;
  const tag = (o: number, n: number) => String.fromCharCode(...new Uint8Array(buf, o, n));
  if (tag(0, 4) !== 'RIFF' || tag(8, 4) !== 'WAVE') return null;

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bits = 0;
  while (offset + 8 <= buf.byteLength) {
    const id = tag(offset, 4);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ') {
      if (size < 16) return null;
      const format = view.getUint16(offset + 8, true);
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bits = view.getUint16(offset + 22, true);
      if (format !== 1) return null; // PCM only — else decodeAudioData
    } else if (id === 'data') {
      if (!sampleRate || bits !== 16) return null;
      const frames = Math.floor(Math.min(size, buf.byteLength - offset - 8) / (2 * channels));
      const pcm = new Float32Array(frames);
      // Interleave-aware: average channels into mono (our WAVs are mono —
      // this covers the general case anyway).
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) {
          sum += view.getInt16(offset + 8 + (i * channels + c) * 2, true);
        }
        pcm[i] = sum / channels / 32768;
      }
      return { pcm, sampleRate };
    }
    offset += 8 + size + (size % 2); // chunks are word-aligned
  }
  return null;
}

// ---- Provider entry point -------------------------------------------------------

/**
 * The wasm Listening Provider: decode to 16k mono, transcribe in the worker.
 * `prompt` is accepted for Provider-interface parity; transformers.js has no
 * initial_prompt support, so it is currently a no-op here.
 */
export async function transcribeAudio(audioBlob: Blob, _prompt?: string): Promise<TranscriptionResult> {
  const pcm = await blobToPcm16k(audioBlob);
  const text = await transcribeInWorker(pcm);
  return { text, duration: pcm.length / 16_000 };
}
