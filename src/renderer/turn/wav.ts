// Minimal WAV encoder — 16-bit PCM mono, the universal currency of this app.
//
// Phase 1 of the sidecar retirement (see docs/future-work.md): the renderer
// captures raw 16kHz Float32 PCM, so uploads no longer depend on MediaRecorder's
// container roulette (webm) or the embedded server's ffmpeg conversion. WAV is
// accepted natively by every STT path — Speaches/faster-whisper, and
// pywhispercpp, whose native wave reader requires exactly this layout
// (16kHz / mono / 16-bit) to skip ffmpeg.

export const WAV_SAMPLE_RATE = 16_000;

/**
 * Encode mono float PCM as a 16-bit WAV Blob. Pure — no AudioContext — so
 * tests can assert the exact byte layout.
 */
export function encodeWav(pcm: Float32Array, sampleRate: number = WAV_SAMPLE_RATE): Blob {
  const dataLength = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');

  // fmt chunk — PCM, mono, 16-bit
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // audio format: PCM
  view.setUint16(22, 1, true);           // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate: sr * blockAlign
  view.setUint16(32, 2, true);           // blockAlign: channels * bytes/sample
  view.setUint16(34, 16, true);          // bits per sample

  // data chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
