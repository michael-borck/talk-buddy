import { describe, it, expect } from 'vitest';
import { encodeWav, WAV_SAMPLE_RATE } from './wav';

// WAV layout reference: 44-byte header (RIFF/WAVE + fmt + data), then
// little-endian int16 samples. The embedded server's fast path and
// faster-whisper both rely on this exact shape.

async function parseWav(blob: Blob): Promise<{ view: DataView; text: (o: number, n: number) => string }> {
  const b = await blob.arrayBuffer();
  return {
    view: new DataView(b),
    text: (o: number, n: number) => String.fromCharCode(...new Uint8Array(b, o, n)),
  };
}

describe('encodeWav', () => {
  it('writes a valid 44-byte header with RIFF/WAVE/fmt/data markers', async () => {
    const blob = encodeWav(new Float32Array(100));
    const { view, text } = await parseWav(blob);

    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(text(12, 4)).toBe('fmt ');
    expect(text(36, 4)).toBe('data');

    expect(view.getUint32(4, true)).toBe(36 + 200);          // riff size
    expect(view.getUint16(20, true)).toBe(1);                // PCM
    expect(view.getUint16(22, true)).toBe(1);                // mono
    expect(view.getUint32(24, true)).toBe(WAV_SAMPLE_RATE);  // 16kHz
    expect(view.getUint32(28, true)).toBe(WAV_SAMPLE_RATE * 2);
    expect(view.getUint16(32, true)).toBe(2);                // block align
    expect(view.getUint16(34, true)).toBe(16);               // bits
    expect(view.getUint32(40, true)).toBe(200);              // data size
    expect(blob.size).toBe(44 + 200);
    expect(blob.type).toBe('audio/wav');
  });

  it('honours a custom sample rate in the header', async () => {
    const blob = encodeWav(new Float32Array(10), 48_000);
    const { view } = await parseWav(blob);
    expect(view.getUint32(24, true)).toBe(48_000);
    expect(view.getUint32(28, true)).toBe(96_000);
  });

  it('clamps and quantises float samples into int16', async () => {
    const blob = encodeWav(new Float32Array([0, 0.5, -0.5, 2, -2]));
    const { view } = await parseWav(blob);
    expect(view.getInt16(44 + 0 * 2, true)).toBe(0);
    expect(view.getInt16(44 + 1 * 2, true)).toBeCloseTo(16384, -2);
    expect(view.getInt16(44 + 2 * 2, true)).toBeCloseTo(-16384, -2);
    expect(view.getInt16(44 + 3 * 2, true)).toBe(32767);      // clamped high
    expect(view.getInt16(44 + 4 * 2, true)).toBe(-32768);     // clamped low
  });

  it('encodes silence for empty input', async () => {
    const blob = encodeWav(new Float32Array(0));
    expect(blob.size).toBe(44);
  });
});
