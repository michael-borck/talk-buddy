// Silero VAD — neural voice-activity detection for hands-free turn-taking.
//
// Replaces pure amplitude thresholding (which confuses breathing, keyboard
// noise, and background chatter with speech — a real problem for ESL students
// in dorms and shared spaces) with the 1.7MB Silero v4 ONNX model, the same
// one Handy bundles. Runs fully offline in the renderer via onnxruntime-web:
// 16kHz mono PCM goes in 512-sample chunks, a speech probability 0..1 comes
// out, with an LSTM state carried between chunks.
//
// Everything here degrades gracefully: if the model or WASM runtime fails to
// load (packaged-CSP edge, corrupted download), createSileroVad() rejects and
// HandsFreeController falls back to the old amplitude thresholds.

// 16kHz is both Silero's expected rate and Whisper's — no second resample
// before transcription if we ever trim audio with the VAD.
export const VAD_SAMPLE_RATE = 16_000;
export const VAD_CHUNK_SAMPLES = 512; // ~32ms — Silero's required frame size

export interface Vad {
  /** Latest speech probability 0..1, updated as PCM is fed. */
  readonly probability: { current: number };
  /** Timestamp (Date.now) of the last probability update — for staleness. */
  readonly lastFedAt: { current: number };
  /** Feed the next PCM chunk (exactly VAD_CHUNK_SAMPLES samples @ 16kHz). */
  process(chunk: Float32Array): void;
  /** Clear LSTM state between utterances so context doesn't leak. */
  reset(): void;
  dispose(): void;
}

export interface VadStatus {
  state: 'loading' | 'ready' | 'failed';
  error?: string;
}

// Minimal structural type for the ORT pieces we use — keeps the module
// testable without loading real onnxruntime-web in vitest. Values stay loose:
// ORT's Tensor union (Float32Array | string[] | ...) doesn't narrow cleanly,
// and the runtime only touches numeric data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OrtSessionLike {
  run(feeds: Record<string, any>): Promise<Record<string, any>>;
  inputNames: readonly string[];
  outputNames: readonly string[];
  release(): Promise<void>;
}

interface SileroVadOptions {
  modelUrl?: string;
  now?: () => number;
  // Test seam: production builds the real ORT session; tests inject a fake.
  createSession?: () => Promise<OrtSessionLike>;
}

export async function createSileroVad(options: SileroVadOptions = {}): Promise<Vad> {
  const now = options.now ?? Date.now;
  const modelUrl =
    options.modelUrl ?? new URL('models/silero_vad_v4.onnx', document.baseURI).href;

  // document.baseURI resolves against index.html in both dev (http://localhost:3307/)
  // and the packaged app (file://…/dist/index.html), where public/ assets land
  // at the root — so both model and WASM come from the app bundle, never a CDN.
  const createSession =
    options.createSession ?? (async (): Promise<OrtSessionLike> => {
      // The ./wasm entry is the wasm-only bundle — no WebGPU/jsep runtime,
      // so the only external files are the two copied to public/ort/ by
      // scripts/copy-ort.mjs (matches ORT's expected filenames exactly).
      const ort = await import('onnxruntime-web/wasm');
      ort.env.wasm.wasmPaths = new URL('ort/', document.baseURI).href;
      // Single-threaded: avoids the SharedArrayBuffer/cross-origin-isolation
      // requirement, which file:// can't satisfy. The model is tiny — one
      // thread handles a 32ms chunk in well under a millisecond.
      ort.env.wasm.numThreads = 1;
      return ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
    });

  const session = await createSession();

  // Silero v4 tensor contract: inputs input[1,512]/state[2,1,128]/sr int64,
  // outputs output[1,1] and stateN. Map by name defensively so a v4/v5
  // shuffle doesn't hard-crash endpointing.
  const inputName = session.inputNames.includes('input') ? 'input' : session.inputNames[0];
  const stateName = session.inputNames.includes('state') ? 'state' : session.inputNames[1];
  const srName = session.inputNames.includes('sr') ? 'sr' : session.inputNames[2];
  const outStateName = session.outputNames.includes('stateN') ? 'stateN' : session.outputNames[1];

  // LSTM hidden state, zero-initialised; shape [2,1,128].
  let state = new Float32Array(2 * 1 * 128);
  const probability = { current: 0 };
  const lastFedAt = { current: 0 };

  return {
    probability,
    lastFedAt,
    process(chunk: Float32Array) {
      if (chunk.length !== VAD_CHUNK_SAMPLES) {
        throw new Error(`VAD expects ${VAD_CHUNK_SAMPLES} samples, got ${chunk.length}`);
      }
      // run() is async (wasm) but inference is synchronous in spirit for our
      // rAF cadence — we deliberately fire-and-forget and let readers see the
      // freshest completed probability. Errors leave the last value standing;
      // a persistent failure surfaces as staleness, which the controller
      // treats as "VAD unavailable" and falls back to amplitude.
      void session
        .run({
          [inputName]: chunk,
          [stateName]: new Float32Array(state),
          [srName]: BigInt64View(VAD_SAMPLE_RATE),
        })
        .then((outs) => {
          const out = outs[session.outputNames[0]] ?? Object.values(outs)[0];
          const nextState = outs[outStateName] ?? Object.values(outs)[1];
          if (!out) return;
          probability.current = out.data[0];
          lastFedAt.current = now();
          if (nextState) state = new Float32Array(nextState.data);
        })
        .catch((err) => console.warn('Silero VAD inference failed:', err));
    },
    reset() {
      state = new Float32Array(2 * 1 * 128);
      probability.current = 0;
    },
    dispose() {
      void session.release().catch(() => {});
    },
  };
}

// int64 scalar tensor payload for the `sr` input (ORT accepts BigInt64Array).
function BigInt64View(value: number): BigInt64Array {
  const a = new BigInt64Array(1);
  a[0] = BigInt(value);
  return a;
}

// ---- 16kHz conversion ------------------------------------------------------

/**
 * Decimate arbitrary-rate mono PCM to 16kHz for Silero. Averaging decimation
 * (not raw sample-picking) folds in every source sample so high-frequency
 * content doesn't alias into the VAD's band. Pure — exported for tests.
 */
export function downsampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === VAD_SAMPLE_RATE) return input;
  if (fromRate < VAD_SAMPLE_RATE) return input; // should never happen with a live AudioContext
  const ratio = fromRate / VAD_SAMPLE_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = i * ratio;
    const end = start + ratio;
    let sum = 0;
    let n = 0;
    for (let s = Math.floor(start); s < Math.min(Math.ceil(end), input.length); s++) {
      sum += input[s];
      n++;
    }
    out[i] = n > 0 ? sum / n : 0;
  }
  return out;
}

/**
 * Fixed-size chunker that reassembles arbitrarily sized PCM pushes into
 * VAD_CHUNK_SAMPLES frames, carrying the remainder between pushes.
 */
export class PcmChunker {
  private carry = new Float32Array(VAD_CHUNK_SAMPLES);
  private carryLen = 0;

  constructor(private onChunk: (chunk: Float32Array) => void) {}

  push(samples: Float32Array): void {
    let offset = 0;
    while (offset < samples.length) {
      const need = VAD_CHUNK_SAMPLES - this.carryLen;
      const take = Math.min(need, samples.length - offset);
      this.carry.set(samples.subarray(offset, offset + take), this.carryLen);
      this.carryLen += take;
      offset += take;
      if (this.carryLen === VAD_CHUNK_SAMPLES) {
        this.onChunk(this.carry);
        this.carryLen = 0;
      }
    }
  }
}
