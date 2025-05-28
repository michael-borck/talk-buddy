// Speaches service for STT and TTS
import { getPreference } from './sqlite';
import { TranscriptionResult, SpeechGenerationOptions } from '../types';

// Get the Speaches server URL from preferences
async function getSpeachesUrl(): Promise<string> {
  const url = await getPreference('speachesUrl');
  return url || 'http://localhost:8000';
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
  const voice = await getPreference('voice') || 'male';
  
  try {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: options.text,
        voice: options.voice || voice, // Speaches maps male/female to specific voices
        speed: options.speed || 1.0
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