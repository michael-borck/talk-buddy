import { describe, it, expect } from 'vitest';
import { decodeWavPcm } from './wasmStt';
import { encodeWav } from '../turn/wav';

// decodeWavPcm must read back exactly what encodeWav writes — the in-app
// Listening Provider's accuracy depends on getting the same 16kHz samples
// the PCM tap captured. The 44.1kHz case pins the fallback contract: any
// non-16k content still parses (then the caller decimates).

describe('decodeWavPcm', () => {
  it('round-trips encodeWav output at 16kHz', () => {
    const pcm = new Float32Array([0, 0.5, -0.5, 0.25, -0.25]);
    const blob = encodeWav(pcm);
    return blob.arrayBuffer().then((buf) => {
      const parsed = decodeWavPcm(buf)!;
      expect(parsed.sampleRate).toBe(16_000);
      expect(parsed.pcm.length).toBe(5);
      expect(parsed.pcm[1]).toBeCloseTo(0.5, 4);
      expect(parsed.pcm[2]).toBeCloseTo(-0.5, 4);
    });
  });

  it('accepts 44.1kHz files (caller decimates afterwards)', () => {
    const pcm = new Float32Array([0.1, -0.1, 0.2]);
    const blob = encodeWav(pcm, 44_100);
    return blob.arrayBuffer().then((buf) => {
      const parsed = decodeWavPcm(buf)!;
      expect(parsed.sampleRate).toBe(44_100);
      expect(parsed.pcm.length).toBe(3);
    });
  });

  it('returns null for non-WAV data and truncated headers', () => {
    expect(decodeWavPcm(new ArrayBuffer(10))).toBeNull();
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]).buffer;
    expect(decodeWavPcm(webm)).toBeNull();
  });
});
