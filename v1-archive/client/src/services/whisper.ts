/**
 * Whisper API client for speech-to-text transcription
 * Connects to local Whisper server running on port 8091
 */

import { config } from '../config';

export class WhisperSTT {
  private apiUrl: string;

  constructor(apiUrl: string = config.whisperUrl) {
    this.apiUrl = apiUrl;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      const response = await fetch(`${this.apiUrl}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio
        })
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  async transcribeAudioFile(audioBlob: Blob): Promise<string> {
    try {
      // Alternative method using FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch(`${this.apiUrl}/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Singleton instance
export const whisperSTT = new WhisperSTT();