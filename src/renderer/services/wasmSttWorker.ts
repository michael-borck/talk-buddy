// WasmSttWorker — in-renderer Whisper (phase 3 of the sidecar retirement).
//
// Runs transformers.js whisper-tiny q8 entirely on-device. Bundled as an
// inlined IIFE worker (`?worker&inline`) so packaged file:// builds can
// construct it from a Blob — file:// workers are origin-blocked in Chromium.
// Model weights and the ORT WASM runtime are fetched over the privileged
// tb-models:// scheme; the bases are passed in at init because a blob worker
// has no page location to resolve them from.
//
// Wire protocol:
//   → { type: 'init', ortBase, modelsBase }
//   ← { type: 'ready' } | { type: 'init-error', error }
//   → { type: 'transcribe', id, pcm }   (16kHz mono Float32Array, transferred)
//   ← { type: 'result', id, text } | { type: 'error', id, error }
//
// Note: transformers.js has no initial_prompt support yet, so the Scenario
// vocabulary hint is a no-op on this provider (it biases embedded/Speaches
// only). Revisit if transformers.js grows prompt support or we switch backends.

import { pipeline, env } from '@huggingface/transformers';

const MODEL_ID = 'whisper-tiny';

// Narrow the pipeline union to the ASR call signature we actually use.
type AsrTranscriber = (audio: Float32Array, opts?: { language?: string }) => Promise<{ text: string }>;

let transcriber: AsrTranscriber | null = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      // Relative to the bases passed by the renderer: modelsBase is the
      // userData mirror of the HF repo layout; ortBase serves the WASM
      // runtime that ships inside the app bundle.
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      env.remoteHost = msg.modelsBase + '/';
      env.remotePathTemplate = '{model}/';
      const wasm = env.backends.onnx.wasm!;
      wasm.wasmPaths = msg.ortBase + '/';
      wasm.numThreads = 1; // no cross-origin isolation in the packaged app
      wasm.proxy = false;

      transcriber = (await pipeline('automatic-speech-recognition', MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
      })) as unknown as AsrTranscriber;
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'init-error', error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (msg.type === 'transcribe') {
    if (!transcriber) {
      self.postMessage({ type: 'error', id: msg.id, error: 'not initialised' });
      return;
    }
    try {
      const out = await transcriber(msg.pcm, { language: 'en' });
      self.postMessage({ type: 'result', id: msg.id, text: out.text });
    } catch (err) {
      self.postMessage({ type: 'error', id: msg.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
};
