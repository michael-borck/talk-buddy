// Speech Provider Abstraction Layer
// Routes TTS/STT calls to the appropriate service based on user preferences

import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';
import * as speachesService from './speaches';
import * as embeddedService from './embedded';
import { loadPreferences, resolveSTT, resolveTTS, STTConfig, TTSConfig } from './config';

// Types for provider selection
export type STTProvider = 'embedded' | 'speaches' | 'wasm';
export type TTSProvider = 'embedded' | 'speaches' | 'piper';

// Get current STT provider from preferences
async function getSTTProvider(): Promise<STTProvider> {
  const provider = await getPreference('sttProvider');
  return (provider as STTProvider) || 'embedded';
}

// Get current TTS provider from preferences
async function getTTSProvider(): Promise<TTSProvider> {
  const provider = await getPreference('ttsProvider');
  return (provider as TTSProvider) || 'embedded';
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
    // Fallback chain: the other local Provider first, then the cloud one.
    const fallbacks: Record<string, Array<'embedded' | 'wasm' | 'speaches'>> = {
      wasm: ['embedded', 'speaches'],
      embedded: ['wasm', 'speaches'],
      speaches: ['wasm', 'embedded'],
    };
    for (const fallback of fallbacks[cfg.provider] ?? []) {
      console.error(`STT failed with ${cfg.provider} provider:`, error);
      console.log(`Attempting fallback to ${fallback} provider...`);
      try {
        return await callSTT(audioBlob, resolveSTT(prefs, fallback), opts?.prompt);
      } catch (fallbackError) {
        console.error(`Fallback STT (${fallback}) also failed:`, fallbackError);
      }
    }
    throw error; // surface the original error
  }
}

async function callSTT(audioBlob: Blob, cfg: STTConfig, prompt?: string): Promise<TranscriptionResult> {
  switch (cfg.provider) {
    case 'wasm':
      return (await import('./wasmStt')).transcribeAudio(audioBlob, prompt);
    case 'speaches':
      return speachesService.transcribeAudio(audioBlob, cfg, prompt);
    default:
      return embeddedService.transcribeAudio(audioBlob, prompt);
  }
}

// Universal Text-to-Speech function. Same resolve-then-dispatch shape as STT.
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  const prefs = await loadPreferences();
  const cfg = resolveTTS(prefs);

  try {
    return await callTTS(options, cfg);
  } catch (error) {
    const fallbacks: Record<string, Array<'embedded' | 'piper' | 'speaches'>> = {
      piper: ['embedded', 'speaches'],
      embedded: ['piper', 'speaches'],
      speaches: ['piper', 'embedded'],
    };
    for (const fallback of fallbacks[cfg.provider] ?? []) {
      console.error(`TTS failed with ${cfg.provider} provider:`, error);
      console.log(`Attempting fallback to ${fallback} provider...`);
      try {
        return await callTTS(options, resolveTTS(prefs, fallback));
      } catch (fallbackError) {
        console.error(`Fallback TTS (${fallback}) also failed:`, fallbackError);
      }
    }
    throw error; // surface the original error
  }
}

async function callTTS(options: SpeechGenerationOptions, cfg: TTSConfig): Promise<Blob> {
  switch (cfg.provider) {
    case 'piper':
      return (await import('./piperTts')).generateSpeech(options, cfg);
    case 'speaches':
      return speachesService.generateSpeech(options, cfg);
    default:
      return embeddedService.generateSpeech(options, cfg);
  }
}

// Check STT connection based on current provider
export async function checkSTTConnection(): Promise<boolean> {
  const provider = await getSTTProvider();
  
  switch (provider) {
    case 'embedded':
      return await embeddedService.checkSTTConnection();
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
    case 'embedded':
      return await embeddedService.checkTTSConnection();
    case 'speaches':
      return await speachesService.checkTTSConnection();
    default:
      return false;
  }
}

// Get available voices from current TTS provider
export async function getAvailableVoices(): Promise<string[]> {
  const provider = await getTTSProvider();
  
  switch (provider) {
    case 'embedded':
      return await embeddedService.getAvailableVoices();
    case 'speaches':
      return await speachesService.getAvailableVoices();
    default:
      return [];
  }
}

// Provider management functions
export const embeddedServer = {
  start: embeddedService.startEmbeddedServer,
  stop: embeddedService.stopEmbeddedServer,
  restart: embeddedService.restartEmbeddedServer,
  status: async () => {
    try {
      const status = await window.electronAPI.embeddedServerStatus();
      return status;
    } catch (error) {
      console.error('Failed to get embedded server status:', error);
      return { running: false, url: 'http://127.0.0.1:8765', port: 8765 };
    }
  }
};

// Backward compatibility - keep existing API
export { checkSTTConnection as checkSpeachesConnection } from './speaches';