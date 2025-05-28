// Speaches service for STT and TTS
import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';

// Get the Speaches server URL from preferences
async function getSpeachesUrl(): Promise<string> {
  const url = await getPreference('speachesUrl');
  return url || 'https://speaches.serveur.au';
}

// Speech-to-Text using Speaches API
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const baseUrl = await getSpeachesUrl();
  
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1'); // Speaches uses OpenAI-compatible API
  formData.append('response_format', 'json');

  try {
    const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
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
  const baseUrl = await getSpeachesUrl();
  const preferredVoice = await getPreference('voice') || 'male';
  
  // Map our simple male/female to actual voice names
  // You may need to call /v1/audio/speech/voices to get actual voice names
  const voiceMap: Record<string, string> = {
    'male': 'alloy',    // or 'echo', 'fable', 'onyx'
    'female': 'nova'    // or 'shimmer'
  };
  
  const voice = voiceMap[options.voice || preferredVoice] || 'alloy';
  
  try {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
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
    const baseUrl = await getSpeachesUrl();
    const response = await fetch(`${baseUrl}/v1/audio/speech/voices`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }
    
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Failed to get voices:', error);
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']; // Default OpenAI voices
  }
}

// Check if Speaches server is available
export async function checkSpeachesConnection(): Promise<boolean> {
  try {
    const baseUrl = await getSpeachesUrl();
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}