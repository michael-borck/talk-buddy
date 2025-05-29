// Speaches service for STT and TTS
import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';

// Get the STT server URL from preferences
async function getSTTUrl(): Promise<string> {
  const url = await getPreference('sttUrl');
  // Fall back to speachesUrl for backward compatibility
  if (!url) {
    const speachesUrl = await getPreference('speachesUrl');
    return speachesUrl || 'https://speaches.serveur.au';
  }
  return url;
}

// Get the TTS server URL from preferences
async function getTTSUrl(): Promise<string> {
  const url = await getPreference('ttsUrl');
  // Fall back to speachesUrl for backward compatibility
  if (!url) {
    const speachesUrl = await getPreference('speachesUrl');
    return speachesUrl || 'https://speaches.serveur.au';
  }
  return url;
}

// Get STT API key from preferences
async function getSTTApiKey(): Promise<string> {
  const apiKey = await getPreference('sttApiKey') || '';
  
  // Check if it's an environment variable reference
  if (apiKey.startsWith('env:')) {
    const envVarName = apiKey.substring(4);
    return process.env[envVarName] || '';
  }
  
  return apiKey;
}

// Get TTS API key from preferences
async function getTTSApiKey(): Promise<string> {
  const apiKey = await getPreference('ttsApiKey') || '';
  
  // Check if it's an environment variable reference
  if (apiKey.startsWith('env:')) {
    const envVarName = apiKey.substring(4);
    return process.env[envVarName] || '';
  }
  
  return apiKey;
}

// Speech-to-Text using Speaches API
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const baseUrl = await getSTTUrl();
  const sttModel = await getPreference('sttModel') || 'Systran/faster-distil-whisper-small.en';
  const apiKey = await getSTTApiKey();
  
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', sttModel);
  formData.append('response_format', 'json');

  const headers: HeadersInit = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.text,
      duration: data.duration
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio. Make sure Speaches server is running.');
  }
}

// Text-to-Speech using Speaches API
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  const baseUrl = await getTTSUrl();
  const preferredVoice = await getPreference('voice') || 'male';
  const ttsModel = await getPreference('ttsModel') || 'speaches-ai/Kokoro-82M-v1.0-ONNX-int8';
  const maleVoice = await getPreference('maleVoice') || 'am_echo';
  const femaleVoice = await getPreference('femaleVoice') || 'af_heart';
  const apiKey = await getTTSApiKey();
  
  // Use the configured voice IDs
  const voice = (options.voice || preferredVoice) === 'male' ? maleVoice : femaleVoice;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  try {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: ttsModel,
        input: options.text,
        voice: voice,
        speed: options.speed || 1.0,
        response_format: 'mp3' // or 'opus', 'aac', 'flac'
      }),
    });

    if (!response.ok) {
      throw new Error(`Speech generation failed: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Speech generation error:', error);
    throw new Error('Failed to generate speech. Make sure Speaches server is running.');
  }
}

// Get available voices from Speaches
export async function getAvailableVoices(): Promise<string[]> {
  try {
    const baseUrl = await getTTSUrl();
    const apiKey = await getTTSApiKey();
    
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${baseUrl}/v1/audio/speech/voices`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }
    
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Failed to get voices:', error);
    // Return the configured voice IDs as defaults
    const maleVoice = await getPreference('maleVoice') || 'am_echo';
    const femaleVoice = await getPreference('femaleVoice') || 'af_heart';
    return [maleVoice, femaleVoice];
  }
}

// Check if STT server is available
export async function checkSTTConnection(): Promise<boolean> {
  try {
    const baseUrl = await getSTTUrl();
    const apiKey = await getSTTApiKey();
    
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Check if TTS server is available
export async function checkTTSConnection(): Promise<boolean> {
  try {
    const baseUrl = await getTTSUrl();
    const apiKey = await getTTSApiKey();
    
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Backward compatibility
export const checkSpeachesConnection = checkSTTConnection;