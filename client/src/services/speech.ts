import { config } from '../config';

// Text-to-Speech service using Web Speech API
export class TextToSpeech {
  private synthesis: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices(): void {
    const setVoice = () => {
      const voices = this.synthesis.getVoices();
      // Prefer a friendly English voice
      this.voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
                   voices.find(v => v.lang.startsWith('en')) ||
                   voices[0];
    };

    setVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = setVoice;
    }
  }

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  speak(
    text: string,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): void {
    if (!this.isSupported()) {
      onError?.(new Error('Speech synthesis not supported'));
      return;
    }

    console.log('TTS: Speaking text:', text);
    console.log('TTS: Available voices:', this.synthesis.getVoices().length);
    console.log('TTS: Selected voice:', this.voice?.name);

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.rate = config.audio.speechRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('TTS: Started speaking');
    };

    utterance.onend = () => {
      console.log('TTS: Finished speaking');
      onEnd?.();
    };

    utterance.onerror = (event: any) => {
      console.error('TTS: Error occurred:', event);
      onError?.(new Error(`Speech synthesis error: ${event.error}`));
    };

    this.synthesis.speak(utterance);
  }

  stop(): void {
    this.synthesis.cancel();
  }

  pause(): void {
    this.synthesis.pause();
  }

  resume(): void {
    this.synthesis.resume();
  }
}

// Singleton instance
export const textToSpeech = new TextToSpeech();