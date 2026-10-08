// Speech Provider Abstraction Layer
// Routes TTS/STT calls to the appropriate service based on user preferences

import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';
import * as speachesService from './speaches';
import { loadPreferences, resolveSTT, resolveTTS, STTConfig, TTSConfig } from './config';

// Types for provider selection. 'embedded' is gone (phase 5): the offline
// built-in IS the in-app engine now — wasm Whisper for Listening, piper for
// Voice. Old stored 'embedded' values migrate to 'wasm'/'piper' in main.
export type STTProvider = 'wasm' | 'speaches';
export type TTSProvider = 'piper' | 'speaches';

// Get current STT provider from preferences
async function getSTTProvider(): Promise<STTProvider> {
  const provider = await getPreference('sttProvider');
  return (provider as STTProvider) || 'wasm';
}

// Get current TTS provider from preferences
async function getTTSProvider(): Promise<TTSProvider> {
  const provider = await getPreference('ttsProvider');
  return (provider as TTSProvider) || 'piper';
}

// Universal Speech-to-Text function. Resolves the active Listening config from
// one preference snapshot, then dispatches; on failure, resolves the OTHER
// Provider from the same snapshot and retries once. `prompt` is an optional
// Whisper bias (the Scenario's vocabulary) — Providers that don't support one
// ignore it.
export async function transcribeAudio(
  audioBlob: Blob,
  opts?: { prompt?: string }
): Promise<TranscriptionResult> {
  const prefs = await loadPreferences();
  const cfg = resolveSTT(prefs);

  try {
    return await callSTT(audioBlob, cfg, opts?.prompt);
  } catch (error) {
    const fallback: STTProvider = cfg.provider === 'wasm' ? 'speaches' : 'wasm';
    console.error(`STT failed with ${cfg.provider} provider:`, error);
    console.log(`Attempting fallback to ${fallback} provider...`);
    try {
      return await callSTT(audioBlob, resolveSTT(prefs, fallback), opts?.prompt);
    } catch (fallbackError) {
      console.error('Fallback STT also failed:', fallbackError);
      throw error; // surface the original error
    }
  }
}

async function callSTT(audioBlob: Blob, cfg: STTConfig, prompt?: string): Promise<TranscriptionResult> {
  return cfg.provider === 'wasm'
    ? (await import('./wasmStt')).transcribeAudio(audioBlob, prompt)
    : speachesService.transcribeAudio(audioBlob, cfg, prompt);
}

// Universal Text-to-Speech function. Same resolve-then-dispatch shape as STT.
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  const prefs = await loadPreferences();
  const cfg = resolveTTS(prefs);

  try {
    return await callTTS(options, cfg);
  } catch (error) {
    const fallback: TTSProvider = cfg.provider === 'piper' ? 'speaches' : 'piper';
    console.error(`TTS failed with ${cfg.provider} provider:`, error);
    console.log(`Attempting fallback to ${fallback} provider...`);
    try {
      return await callTTS(options, resolveTTS(prefs, fallback));
    } catch (fallbackError) {
      console.error('Fallback TTS also failed:', fallbackError);
      throw error; // surface the original error
    }
  }
}

async function callTTS(options: SpeechGenerationOptions, cfg: TTSConfig): Promise<Blob> {
  return cfg.provider === 'piper'
    ? (await import('./piperTts')).generateSpeech(options, cfg)
    : speachesService.generateSpeech(options, cfg);
}

// Check STT connection based on current provider
export async function checkSTTConnection(): Promise<boolean> {
  const provider = await getSTTProvider();

  switch (provider) {
    case 'wasm':
      return (await import('./wasmStt')).wasmSttStatus().then((s) => s.installed);
    case 'speaches':
      return await speachesService.checkSTTConnection();
    default:
      return false;
  }
}

// Check TTS connection based on current provider
export async function checkTTSConnection(): Promise<boolean> {
  const provider = await getTTSProvider();

  switch (provider) {
    case 'piper':
      return (await import('./piperTts')).piperStatus().then((s) => s.installed);
    case 'speaches':
      return await speachesService.checkTTSConnection();
    default:
      return false;
  }
}

// Get available voices from current TTS provider. The in-app piper engine
// serves the fixed Alan & Amy pair; Speaches lists its own.
export async function getAvailableVoices(): Promise<string[]> {
  const provider = await getTTSProvider();

  switch (provider) {
    case 'piper':
      return ['Alan', 'Amy'];
    case 'speaches':
      return await speachesService.getAvailableVoices();
    default:
      return [];
  }
}

// Backward compatibility - keep existing API
export { checkSTTConnection as checkSpeachesConnection } from './speaches';
