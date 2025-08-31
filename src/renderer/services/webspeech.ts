// Web Speech API service for STT and TTS
import { TranscriptionResult, SpeechGenerationOptions } from '../types';
import { getPreference } from './sqlite';

// Check if Web Speech API is available
export function isWebSpeechAvailable(): boolean {
  return 'speechSynthesis' in window && 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Speech-to-Text using Web Speech API
// Note: audioBlob parameter is not used as Web Speech API uses microphone directly
export async function transcribeAudio(_audioBlob: Blob): Promise<TranscriptionResult> {
  return new Promise((resolve, reject) => {
    // Check if Web Speech API is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Web Speech API is not supported in this browser'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    const startTime = Date.now();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const duration = (Date.now() - startTime) / 1000;
      resolve({
        text: transcript,
        duration
      });
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.onend = () => {
      // If no result was returned, reject
      const duration = (Date.now() - startTime) / 1000;
      if (duration < 0.5) {
        reject(new Error('No speech detected'));
      }
    };

    // Convert blob to audio and play it to the microphone
    // Note: Web Speech API works with live microphone input, not audio files
    // This is a limitation - we'll need to use the microphone directly
    recognition.start();
  });
}

// Text-to-Speech using Web Speech API
export async function generateSpeech(options: SpeechGenerationOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Web Speech Synthesis API is not supported in this browser'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(options.text);
    
    // Get preferred voice settings
    getPreference('voice').then(preferredVoice => {
      const voiceType = options.voice || preferredVoice || 'male';
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find a voice matching the preference
      const targetVoice = voices.find(voice => {
        if (voiceType === 'male') {
          return voice.name.toLowerCase().includes('male') || 
                 voice.name.toLowerCase().includes('david') ||
                 voice.name.toLowerCase().includes('james');
        } else {
          return voice.name.toLowerCase().includes('female') || 
                 voice.name.toLowerCase().includes('samantha') ||
                 voice.name.toLowerCase().includes('victoria');
        }
      });

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      utterance.rate = options.speed || 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Create a media recorder to capture the audio
      // Note: This is a limitation - Web Speech API doesn't directly provide audio blobs
      // We'll need to work around this by using MediaRecorder with the system audio
      
      // For now, we'll return a dummy blob and play the speech directly
      utterance.onend = () => {
        // Create a dummy blob since Web Speech API doesn't provide audio data
        const dummyBlob = new Blob([new ArrayBuffer(1)], { type: 'audio/mp3' });
        resolve(dummyBlob);
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Speak the text
      window.speechSynthesis.speak(utterance);
    });
  });
}

// Get available voices from Web Speech API
export async function getAvailableVoices(): Promise<string[]> {
  return new Promise((resolve) => {
    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      resolve(voices.map(voice => voice.name));
    };

    // Some browsers load voices asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      getVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = getVoices;
    }
  });
}

// Check if Web Speech API is available and working
export async function checkWebSpeechConnection(): Promise<boolean> {
  return isWebSpeechAvailable();
}

// For backward compatibility
export const checkSTTConnection = checkWebSpeechConnection;
export const checkTTSConnection = checkWebSpeechConnection;