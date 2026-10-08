import { describe, it, expect } from 'vitest';
import { PcmAccumulator, PCM_TAP_FLUSH_TIMEOUT_MS } from './pcmCapture';
import { downsampleTo16k } from './vad';

// createPcmTap itself needs a real AudioContext/AudioWorklet (Electron-only);
// the unit surface is the accumulator + decimation pipeline that turns
// worklet batches into the final 16k PCM — the part where correctness bugs
// (dropped samples, mis-sized frames) would corrupt every transcription.

describe('PcmAccumulator', () => {
  it('concatenates arbitrary-size batches in order', () => {
    const acc = new PcmAccumulator();
    acc.push(new Float32Array([1, 2, 3]));
    acc.push(new Float32Array(0)); // empty batches are legal no-ops
    acc.push(new Float32Array([4]));
    acc.push(new Float32Array([5, 6]));
    expect(Array.from(acc.finish())).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles one huge batch (stop without flush granularity)', () => {
    const acc = new PcmAccumulator();
    const big = new Float32Array(4096 * 3 + 17);
    big.fill(0.5);
    acc.push(big);
    expect(acc.finish().length).toBe(big.length);
  });

  it('finish() resets so the accumulator is reusable', () => {
    const acc = new PcmAccumulator();
    acc.push(new Float32Array([1]));
    acc.finish();
    acc.push(new Float32Array([2]));
    expect(Array.from(acc.finish())).toEqual([2]);
  });
});

describe('tap pipeline', () => {
  it('48kHz batches decimate to a 16kHz utterance via downsampleTo16k', () => {
    const acc = new PcmAccumulator();
    // Simulate ~1 second of 48kHz worklet batches (4096 samples each) —
    // the final length is floor(samples / 3), truncated to whole frames.
    const batch = new Float32Array(4096).fill(0.75);
    const batches = Math.ceil(48_000 / 4096);
    for (let i = 0; i < batches; i++) acc.push(batch);
    const total = batches * 4096;
    const pcm = downsampleTo16k(acc.finish(), 48_000);
    expect(pcm.length).toBe(Math.floor(total / 3));
    expect(pcm.every((s) => Math.abs(s - 0.75) < 1e-6)).toBe(true);
  });

  it('already-16kHz input passes through untouched (bluetooth HFP mics)', () => {
    const pcm = new Float32Array(512).fill(0.25);
    expect(downsampleTo16k(pcm, 16_000)).toBe(pcm);
  });

  it('flush timeout is bounded so a dead worklet cannot hang a Turn', () => {
    expect(PCM_TAP_FLUSH_TIMEOUT_MS).toBeLessThanOrEqual(3000);
  });
});
