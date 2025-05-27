import { config } from '../config';

// Text-to-Speech service using Piper TTS or Web Speech API
export class TextToSpeech {
  private synthesis: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private usePiper: boolean;

  constructor() {
    this.usePiper = config.features.usePiperTTS;
    if (!this.usePiper) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private loadVoices(): void {
    if (!this.synthesis) return;
    
    const setVoice = () => {
      const voices = this.synthesis!.getVoices();
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
    return this.usePiper || 'speechSynthesis' in window;
  }

  private async synthesizeWithPiper(text: string): Promise<string> {
    const response = await fetch(`${config.piperUrl}/synthesize/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        speed: config.audio.speechRate
      })
    });

    if (!response.ok) {
      throw new Error(`Piper TTS error: ${response.statusText}`);
    }

    const data = await response.json();
    return `data:audio/wav;base64,${data.audio}`;
  }

  async speak(
    text: string,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!this.isSupported()) {
      onError?.(new Error('Speech synthesis not supported'));
      return;
    }

    console.log('TTS: Speaking text:', text);
    console.log('TTS: Using Piper:', this.usePiper);

    // Cancel any ongoing speech
    this.stop();

    if (this.usePiper) {
      try {
        // Use Piper TTS
        const audioUrl = await this.synthesizeWithPiper(text);
        
        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.onended = () => {
          console.log('TTS: Finished speaking (Piper)');
          this.currentAudio = null;
          onEnd?.();
        };
        
        this.currentAudio.onerror = () => {
          console.error('TTS: Audio playback error');
          onError?.(new Error('Audio playback error'));
        };
        
        await this.currentAudio.play();
        console.log('TTS: Started speaking (Piper)');
      } catch (error) {
        console.error('TTS: Piper error:', error);
        onError?.(error as Error);
      }
    } else {
      // Use browser TTS
      console.log('TTS: Available voices:', this.synthesis!.getVoices().length);
      console.log('TTS: Selected voice:', this.voice?.name);

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

      this.synthesis!.speak(utterance);
    }
  }

  stop(): void {
    if (this.usePiper && this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    } else if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  pause(): void {
    if (this.usePiper && this.currentAudio) {
      this.currentAudio.pause();
    } else if (this.synthesis) {
      this.synthesis.pause();
    }
  }

  resume(): void {
    if (this.usePiper && this.currentAudio) {
      this.currentAudio.play();
    } else if (this.synthesis) {
      this.synthesis.resume();
    }
  }
}

// Singleton instance
export const textToSpeech = new TextToSpeech();