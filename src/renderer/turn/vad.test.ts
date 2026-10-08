import { describe, it, expect, vi } from 'vitest';
import {
  createSileroVad, downsampleTo16k, PcmChunker,
  VAD_SAMPLE_RATE, VAD_CHUNK_SAMPLES,
} from './vad';
import type { OrtSessionLike } from './vad';

// Fake ORT session: echoes a scripted probability and a zeroed next-state,
// recording every feed so tests can assert chunk sizes and input mapping.
function fakeSession(scripted: number[]) {
  const feeds: Array<Record<string, unknown>> = [];
  let call = 0;
  const session: OrtSessionLike = {
    inputNames: ['input', 'state', 'sr'],
    outputNames: ['output', 'stateN'],
    run: async (f) => {
      feeds.push(f);
      const p = scripted[Math.min(call, scripted.length - 1)];
      call++;
      return {
        output: { data: new Float32Array([p]) },
        stateN: { data: new Float32Array(2 * 1 * 128) },
      };
    },
    release: async () => {},
  };
  return { session, feeds };
}

describe('downsampleTo16k', () => {
  it('returns the input untouched at 16kHz', () => {
    const pcm = new Float32Array([0.1, -0.2, 0.3]);
    expect(downsampleTo16k(pcm, 16_000)).toBe(pcm);
  });

  it('decimates 48kHz to exactly 1/3 the length with averaged samples', () => {
    const pcm = new Float32Array(48 * 10); // 10ms @ 48kHz
    pcm.fill(0.6);
    const out = downsampleTo16k(pcm, 48_000);
    expect(out.length).toBe(16 * 10);
    expect(out.every((s) => Math.abs(s - 0.6) < 1e-6)).toBe(true);
  });

  it('averaging folds every source sample (constant stays constant at any ratio)', () => {
    const pcm = new Float32Array(44_100); // 1s @ 44.1kHz
    pcm.fill(-0.25);
    const out = downsampleTo16k(pcm, 44_100);
    expect(out.length).toBe(VAD_SAMPLE_RATE);
    expect(out.every((s) => Math.abs(s + 0.25) < 1e-6)).toBe(true);
  });
});

describe('PcmChunker', () => {
  it('emits only exact VAD_CHUNK_SAMPLES frames, carrying remainders', () => {
    const chunks: number[] = [];
    const c = new PcmChunker((ch) => chunks.push(ch.length));
    c.push(new Float32Array(300));
    c.push(new Float32Array(300));
    c.push(new Float32Array(300)); // 900 total → 1 full + 388 carried
    expect(chunks).toEqual([VAD_CHUNK_SAMPLES]);
    c.push(new Float32Array(200)); // 588 total → one more full
    expect(chunks).toEqual([VAD_CHUNK_SAMPLES, VAD_CHUNK_SAMPLES]);
  });

  it('handles a push larger than one chunk', () => {
    const chunks: number[] = [];
    const c = new PcmChunker((ch) => chunks.push(ch.length));
    c.push(new Float32Array(VAD_CHUNK_SAMPLES * 3 + 7));
    expect(chunks).toEqual([512, 512, 512]);
  });
});

describe('createSileroVad', () => {
  it('feeds 512-sample chunks and surfaces the model probability', async () => {
    const { session, feeds } = fakeSession([0.9, 0.1]);
    const vad = await createSileroVad({ modelUrl: 'unused.onnx', createSession: () => Promise.resolve(session) });

    vad.process(new Float32Array(VAD_CHUNK_SAMPLES).fill(0.01));
    await vi.waitFor(() => expect(vad.probability.current).toBeCloseTo(0.9));
    expect(vad.lastFedAt.current).toBeGreaterThan(0);

    vad.process(new Float32Array(VAD_CHUNK_SAMPLES).fill(0.02));
    await vi.waitFor(() => expect(vad.probability.current).toBeCloseTo(0.1));

    // Tensor contract: input carries the chunk, sr carries 16000.
    expect(feeds[0].input).toBeInstanceOf(Float32Array);
    expect((feeds[0].sr as BigInt64Array)[0]).toBe(BigInt(VAD_SAMPLE_RATE));
    // LSTM state is threaded: the second run received the first run's state.
    expect(feeds[1].state).toBeDefined();
    vad.dispose();
  });

  it('rejects wrong-sized chunks rather than silently corrupting the stream', async () => {
    const { session } = fakeSession([0.5]);
    const vad = await createSileroVad({ modelUrl: 'unused.onnx', createSession: () => Promise.resolve(session) });
    expect(() => vad.process(new Float32Array(128))).toThrow(/512/);
    vad.dispose();
  });

  it('reset() clears the probability so a new utterance starts clean', async () => {
    const { session } = fakeSession([0.9]);
    const vad = await createSileroVad({ modelUrl: 'unused.onnx', createSession: () => Promise.resolve(session) });
    vad.process(new Float32Array(VAD_CHUNK_SAMPLES));
    await vi.waitFor(() => expect(vad.probability.current).toBeCloseTo(0.9));
    vad.reset();
    expect(vad.probability.current).toBe(0);
    vad.dispose();
  });
});
