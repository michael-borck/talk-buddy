// Speech Provider Abstraction Layer
// Routes TTS/STT calls to the appropriate service based on user preferences

import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';
import * as speachesService from './speaches';
import * as embeddedService from './embedded';

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

// Universal Speech-to-Text function
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const provider = await getSTTProvider();
  
  try {
    switch (provider) {
      case 'embedded':
        return await embeddedService.transcribeAudio(audioBlob);
      case 'speaches':
        return await speachesService.transcribeAudio(audioBlob);
      default:
        throw new Error(`Unknown STT provider: ${provider}`);
    }
  } catch (error) {
    console.error(`STT failed with ${provider} provider:`, error);
    
    // Fallback strategy: try the other provider if available
    const fallbackProvider = provider === 'embedded' ? 'speaches' : 'embedded';
    console.log(`Attempting fallback to ${fallbackProvider} provider...`);
    
    try {
      switch (fallbackProvider) {
        case 'embedded':
          return await embeddedService.transcribeAudio(audioBlob);
        case 'speaches':
          return await speachesService.transcribeAudio(audioBlob);
        default:
          throw new Error(`Fallback provider ${fallbackProvider} not available`);
      }
    } catch (fallbackError) {
      console.error(`Fallback STT also failed:`, fallbackError);
      // Re-throw original error since fallback failed
      throw error;
    }
  }
}

// Universal Text-to-Speech function
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  const provider = await getTTSProvider();
  
  try {
    switch (provider) {
      case 'embedded':
        return await embeddedService.generateSpeech(options);
      case 'speaches':
        return await speachesService.generateSpeech(options);
      default:
        throw new Error(`Unknown TTS provider: ${provider}`);
    }
  } catch (error) {
    console.error(`TTS failed with ${provider} provider:`, error);
    
    // Fallback strategy: try the other provider if available
    const fallbackProvider = provider === 'embedded' ? 'speaches' : 'embedded';
    console.log(`Attempting fallback to ${fallbackProvider} provider...`);
    
    try {
      switch (fallbackProvider) {
        case 'embedded':
          return await embeddedService.generateSpeech(options);
        case 'speaches':
          return await speachesService.generateSpeech(options);
        default:
          throw new Error(`Fallback provider ${fallbackProvider} not available`);
      }
    } catch (fallbackError) {
      console.error(`Fallback TTS also failed:`, fallbackError);
      // Re-throw original error since fallback failed
      throw error;
    }
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

// Provider status information
export async function getProviderStatus(): Promise<{
  stt: { provider: STTProvider; available: boolean };
  tts: { provider: TTSProvider; available: boolean };
}> {
  const sttProvider = await getSTTProvider();
  const ttsProvider = await getTTSProvider();
  
  const [sttAvailable, ttsAvailable] = await Promise.all([
    checkSTTConnection(),
    checkTTSConnection()
  ]);
  
  return {
    stt: {
      provider: sttProvider,
      available: sttAvailable
    },
    tts: {
      provider: ttsProvider,
      available: ttsAvailable
    }
  };
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

// Provider switching (useful for settings or fallback scenarios)
export async function switchSTTProvider(newProvider: STTProvider): Promise<void> {
  console.log(`Switching STT provider to: ${newProvider}`);
  // This would be handled by the settings save process, but we can add logic here if needed
}

export async function switchTTSProvider(newProvider: TTSProvider): Promise<void> {
  console.log(`Switching TTS provider to: ${newProvider}`);
  // This would be handled by the settings save process, but we can add logic here if needed
}

// Backward compatibility - keep existing API
export { checkSTTConnection as checkSpeachesConnection } from './speaches';