// PcmTap — raw 16kHz mono capture from a mic MediaStream.
//
// MediaRecorder gives us the browser's container of the day (webm/opus) and
// forced every speech backend to run ffmpeg before inference. This tap taps
// the stream directly: an AudioWorklet accumulates float samples at the
// hardware rate, the main thread folds them into one buffer and decimates to
// 16kHz (the rate both Silero and Whisper want, reusing downsampleTo16k from
// the VAD). stop() hands back PCM ready for encodeWav() — or, post-Phase-2,
// straight into an in-renderer Whisper.
//
// A dedicated AudioContext (not the shared analyser's) keeps capture running
// when the window is hidden, where the analyser's rAF-driven loop would
// throttle. If AudioWorklet is somehow unavailable, turnPorts falls back to
// the legacy MediaRecorder path.

import { downsampleTo16k } from './vad';

// Runs inside the audio render thread. Accumulates small render quanta into
// 4096-sample batches before posting (≈12 messages/sec at 48kHz, not 375),
// transferring the buffers to avoid copies.
const PCM_TAP_WORKLET_CODE = `
class PcmTapProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._batch = new Float32Array(4096);
    this._len = 0;
    this.port.onmessage = (e) => {
      if (e.data === 'flush') {
        this._postRemainder();
        this.port.postMessage('done');
      }
    };
  }
  _postRemainder() {
    if (this._len > 0) {
      const out = this._batch.slice(0, this._len);
      this.port.postMessage(out, [out.buffer]);
      this._len = 0;
    }
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      let i = 0;
      while (i < ch.length) {
        const take = Math.min(this._batch.length - this._len, ch.length - i);
        this._batch.set(ch.subarray(i, i + take), this._len);
        this._len += take;
        i += take;
        if (this._len === this._batch.length) {
          const out = this._batch.slice();
          this.port.postMessage(out, [out.buffer]);
          this._len = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('pcm-tap', PcmTapProcessor);
`;

export interface PcmTap {
  /** Finalise the capture: flush, tear down, return 16kHz mono PCM. */
  stop(): Promise<{ pcm: Float32Array }>;
  /** Discard the capture immediately. */
  cancel(): void;
}

export const PCM_TAP_FLUSH_TIMEOUT_MS = 3000;

export async function createPcmTap(stream: MediaStream): Promise<PcmTap> {
  const Ctor = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  if (ctx.state === 'suspended') await ctx.resume();

  const blobUrl = URL.createObjectURL(new Blob([PCM_TAP_WORKLET_CODE], { type: 'application/javascript' }));
  try {
    await ctx.audioWorklet.addModule(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm-tap', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: 'explicit', // stereo mics downmix to mono here
  });
  // The graph must reach the destination for the worklet to be pulled, but
  // the mic must never reach the speakers — a zero-gain sink is the standard
  // silent pull.
  const sink = ctx.createGain();
  sink.gain.value = 0;
  source.connect(node);
  node.connect(sink);
  sink.connect(ctx.destination);

  const acc = new PcmAccumulator();
  let doneResolve: (() => void) | null = null;
  node.port.onmessage = (e) => {
    if (e.data === 'done') doneResolve?.();
    else acc.push(e.data as Float32Array);
  };

  const teardown = () => {
    node.port.onmessage = null;
    try { node.disconnect(); source.disconnect(); sink.disconnect(); } catch { /* ignore */ }
    void ctx.close().catch(() => {});
  };

  return {
    stop() {
      return new Promise((resolve) => {
        const finish = () => {
          teardown();
          const raw = acc.finish();
          resolve({ pcm: downsampleTo16k(raw, ctx.sampleRate) });
        };
        doneResolve = finish;
        node.port.postMessage('flush');
        // If the worklet died mid-utterance, resolve with what we have rather
        // than hanging the Turn.
        setTimeout(finish, PCM_TAP_FLUSH_TIMEOUT_MS);
      });
    },
    cancel() {
      teardown();
    },
  };
}

/**
 * Grows a flat Float32Array from arbitrary-size batches. Pure and injectable
 * so tests can drive the exact accumulation the worklet feed performs.
 */
export class PcmAccumulator {
  private batches: Float32Array[] = [];
  private length = 0;

  push(batch: Float32Array): void {
    if (batch.length === 0) return;
    this.batches.push(batch);
    this.length += batch.length;
  }

  finish(): Float32Array {
    const out = new Float32Array(this.length);
    let offset = 0;
    for (const b of this.batches) {
      out.set(b, offset);
      offset += b.length;
    }
    this.batches = [];
    this.length = 0;
    return out;
  }
}
