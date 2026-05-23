// Speech Provider Abstraction Layer
// Routes TTS/STT calls to the appropriate service based on user preferences

import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';
import * as speachesService from './speaches';
import * as embeddedService from './embedded';
import { loadPreferences, resolveSTT, resolveTTS, STTConfig, TTSConfig } from './config';

// Types for provider selection
export type STTProvider = 'embedded' | 'speaches';
export type TTSProvider = 'embedded' | 'speaches';

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
// Provider from the same snapshot and retries once.
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const prefs = await loadPreferences();
  const cfg = resolveSTT(prefs);

  try {
    return await callSTT(audioBlob, cfg);
  } catch (error) {
    const fallback = cfg.provider === 'embedded' ? 'speaches' : 'embedded';
    console.error(`STT failed with ${cfg.provider} provider:`, error);
    console.log(`Attempting fallback to ${fallback} provider...`);
    try {
      return await callSTT(audioBlob, resolveSTT(prefs, fallback));
    } catch (fallbackError) {
      console.error('Fallback STT also failed:', fallbackError);
      throw error; // surface the original error
    }
  }
}

async function callSTT(audioBlob: Blob, cfg: STTConfig): Promise<TranscriptionResult> {
  return cfg.provider === 'embedded'
    ? embeddedService.transcribeAudio(audioBlob)
    : speachesService.transcribeAudio(audioBlob, cfg);
}

// Universal Text-to-Speech function. Same resolve-then-dispatch shape as STT.
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  const prefs = await loadPreferences();
  const cfg = resolveTTS(prefs);

  try {
    return await callTTS(options, cfg);
  } catch (error) {
    const fallback = cfg.provider === 'embedded' ? 'speaches' : 'embedded';
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
  return cfg.provider === 'embedded'
    ? embeddedService.generateSpeech(options, cfg)
    : speachesService.generateSpeech(options, cfg);
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