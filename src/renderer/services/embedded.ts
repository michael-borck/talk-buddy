// Embedded TTS/STT service
import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';

// Get embedded server status from main process
async function getEmbeddedServerStatus(): Promise<{ running: boolean; url: string; port: number }> {
  try {
    const status = await window.electronAPI.embeddedServerStatus();
    return status;
  } catch (error) {
    console.error('Failed to get embedded server status:', error);
    return { running: false, url: 'http://127.0.0.1:8765', port: 8765 };
  }
}

// Get embedded STT URL - always use actual server status to avoid port mismatches
async function getEmbeddedSTTUrl(): Promise<string> {
  // Always get the actual server status to ensure we use the correct port
  const status = await getEmbeddedServerStatus();
  return status.url;
}

// Get embedded TTS URL - always use actual server status to avoid port mismatches
async function getEmbeddedTTSUrl(): Promise<string> {
  // Always get the actual server status to ensure we use the correct port
  const status = await getEmbeddedServerStatus();
  return status.url;
}

// Speech-to-Text using embedded server
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const baseUrl = await getEmbeddedSTTUrl();
  
  console.log('transcribeAudio called with:', {
    blobSize: audioBlob.size,
    blobType: audioBlob.type,
    baseUrl
  });
  
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  // Try without model parameter - let server use default
  formData.append('response_format', 'json');

  try {
    console.log('Sending transcription request to:', `${baseUrl}/v1/audio/transcriptions`);
    
    const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData,
    });

    console.log('Transcription response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transcription failed with response:', errorText);
      throw new Error(`Transcription failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Transcription response data:', data);
    
    return {
      text: data.text,
      duration: data.duration || 0
    };
  } catch (error) {
    console.error('Embedded transcription error:', error);
    throw new Error('Failed to transcribe audio. Make sure embedded server is running.');
  }
}

// Text-to-Speech using embedded server
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  const baseUrl = await getEmbeddedTTSUrl();
  const preferredVoice = await getPreference('voice') || 'female';
  const voice = options.voice || preferredVoice;
  
  // Get speech speed from preferences (default 1.2x)
  const embeddedSpeed = await getPreference('embeddedSpeechSpeed') || '1.2';
  const speed = options.speed || parseFloat(embeddedSpeed);
  
  // Simplify voice selection - just use alan/amy directly
  let selectedVoice = (voice === 'male') ? 'alan' : 'amy';
  
  // Log what we're sending for debugging
  console.log('TTS Request:', { text: options.text.substring(0, 50), voice: selectedVoice, speed });
  
  try {
    const requestBody: any = {
      model: 'tts-embedded',
      input: options.text,
      voice: selectedVoice, // 'alan', 'amy', or 'random'
      speed: speed,
      response_format: 'wav'
    };
    
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Speech generation failed: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Embedded speech generation error:', error);
    throw new Error('Failed to generate speech. Make sure embedded server is running.');
  }
}

// Get available models from embedded server
export async function getAvailableModels(): Promise<any[]> {
  try {
    const baseUrl = await getEmbeddedTTSUrl();
    
    const response = await fetch(`${baseUrl}/v1/models`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to get models:', error);
    return [];
  }
}

// Get available voices from embedded server
export async function getAvailableVoices(): Promise<string[]> {
  try {
    const models = await getAvailableModels();
    const ttsModels = models.filter(model => model.id.startsWith('tts-voice-'));
    return ttsModels.map(model => model.name || model.id);
  } catch (error) {
    console.error('Failed to get voices:', error);
    return ['Voice 0', 'Voice 1']; // Default fallback
  }
}

// Get categorized voices from embedded server
export async function getCategorizedVoices(): Promise<{
  male: Array<{id: number, name: string, gender: string}>;
  female: Array<{id: number, name: string, gender: string}>;
  unknown: Array<{id: number, name: string, gender: string}>;
  all: Array<{id: number, name: string, gender: string}>;
}> {
  try {
    const baseUrl = await getEmbeddedTTSUrl();
    
    const response = await fetch(`${baseUrl}/v1/voices`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to get categorized voices:', error);
    return {
      male: [],
      female: [],
      unknown: [],
      all: []
    };
  }
}

// Get voices by gender from embedded server
export async function getVoicesByGender(gender: 'male' | 'female' | 'unknown' | 'all'): Promise<Array<{id: number, name: string, gender: string}>> {
  try {
    const baseUrl = await getEmbeddedTTSUrl();
    
    const response = await fetch(`${baseUrl}/v1/voices/${gender}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${gender} voices`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Failed to get ${gender} voices:`, error);
    return [];
  }
}

// Check if embedded STT server is available
export async function checkSTTConnection(): Promise<boolean> {
  try {
    const baseUrl = await getEmbeddedSTTUrl();
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.status === 'healthy' && data.services?.stt === true;
  } catch (error) {
    return false;
  }
}

// Check if embedded TTS server is available
export async function checkTTSConnection(): Promise<boolean> {
  try {
    const baseUrl = await getEmbeddedTTSUrl();
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.status === 'healthy' && data.services?.tts === true;
  } catch (error) {
    return false;
  }
}

// Server management functions
export async function startEmbeddedServer(): Promise<boolean> {
  try {
    const result = await window.electronAPI.embeddedServerStart();
    return result.success;
  } catch (error) {
    console.error('Failed to start embedded server:', error);
    return false;
  }
}

export async function stopEmbeddedServer(): Promise<boolean> {
  try {
    const result = await window.electronAPI.embeddedServerStop();
    return result.success;
  } catch (error) {
    console.error('Failed to stop embedded server:', error);
    return false;
  }
}

export async function restartEmbeddedServer(): Promise<boolean> {
  try {
    const result = await window.electronAPI.embeddedServerRestart();
    return result.success;
  } catch (error) {
    console.error('Failed to restart embedded server:', error);
    return false;
  }
}

// Check overall embedded server connection
export async function checkEmbeddedConnection(): Promise<boolean> {
  const sttOk = await checkSTTConnection();
  const ttsOk = await checkTTSConnection();
  return sttOk && ttsOk;
}