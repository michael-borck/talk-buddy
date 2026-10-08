// Piper TTS service — the renderer half of the in-app Voice Provider.
// Synthesis runs in the main process (standalone piper binary); this thin
// adapter converts the IPC result into the audio Blob TTSPipeline expects.

import { SpeechGenerationOptions } from '../types';
import { PiperTTS } from './config';

export interface PiperStatus {
  installed: boolean;
  piperInstalled: boolean;
  voices: { male: boolean; female: boolean };
  dir: string;
}

export function piperStatus(): Promise<PiperStatus> {
  return window.electronAPI.piper.status();
}

export function ensurePiper(): Promise<{ success: boolean; error?: string }> {
  return window.electronAPI.piper.ensure();
}

export function onPiperProgress(cb: (p: { stage: string; file: string; pct: number }) => void): () => void {
  return window.electronAPI.piper.onProgress(cb);
}

export async function generateSpeech(options: SpeechGenerationOptions, _cfg: PiperTTS): Promise<Blob> {
  const result = await window.electronAPI.piper.speak({
    text: options.text,
    voice: options.voice === 'male' ? 'male' : 'female',
    speed: options.speed,
  });
  if (!result.ok || !result.wav) {
    throw new Error(result.error || 'piper synthesis failed');
  }
  return new Blob([result.wav], { type: 'audio/wav' });
}
