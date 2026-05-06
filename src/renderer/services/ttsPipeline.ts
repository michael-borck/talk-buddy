import { SentenceStream } from './sentenceStream';

export interface TTSPipelineOptions {
  synthesize: (sentence: string) => Promise<Blob>;
  autoPlay?: boolean;
  onChunkChange?: (current: number, total: number) => void;
  onAudioStart?: (audio: HTMLAudioElement) => void;
  // Fires once after pump completes successfully (not on abort), passing
  // every blob synthesised this turn in playback order. Consumers use
  // this to enable "rehear" — replaying the AI's full message later
  // without a second TTS round-trip.
  onTurnComplete?: (blobs: Blob[]) => void;
}

export class TTSPipeline {
  private readonly synthesize: (sentence: string) => Promise<Blob>;
  private readonly autoPlay: boolean;
  private readonly onChunkChange?: (current: number, total: number) => void;
  private readonly onAudioStart?: (audio: HTMLAudioElement) => void;
  private readonly onTurnComplete?: (blobs: Blob[]) => void;

  private audioQueue: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private playing = false;

  totalChunks = 0;
  currentChunk = 0;
  done: Promise<void> = Promise.resolve();

  constructor(options: TTSPipelineOptions) {
    this.synthesize = options.synthesize;
    this.autoPlay = options.autoPlay ?? true;
    this.onChunkChange = options.onChunkChange;
    this.onAudioStart = options.onAudioStart;
    this.onTurnComplete = options.onTurnComplete;
  }

  pump(stream: AsyncIterable<string>, signal: AbortSignal): Promise<void> {
    const work = this.runPump(stream, signal);
    this.done = work;
    return work;
  }

  private async runPump(stream: AsyncIterable<string>, signal: AbortSignal): Promise<void> {
    const splitter = new SentenceStream();
    // Captured separately from audioQueue so onTurnComplete sees the
    // full set even after playback has shifted blobs out of the queue.
    const collectedBlobs: Blob[] = [];

    const handleSentence = async (sentence: string) => {
      if (signal.aborted) return;
      this.totalChunks++;
      this.notifyProgress();
      try {
        const blob = await this.synthesize(sentence);
        if (signal.aborted) return;
        this.audioQueue.push(blob);
        collectedBlobs.push(blob);
        if (this.autoPlay) this.tryStartPlayback(signal);
      } catch (e) {
        if (signal.aborted) return;
        throw e;
      }
    };

    try {
      for await (const token of stream) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        for (const sentence of splitter.feed(token)) {
          await handleSentence(sentence);
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        }
      }
      for (const sentence of splitter.flush()) {
        await handleSentence(sentence);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      }
      await this.waitForPlaybackDrain(signal);
      this.onTurnComplete?.(collectedBlobs);
    } catch (e) {
      // Fire onTurnComplete even on abort so consumers can offer
      // "replay what was synthesised so far" — useful when the user
      // barge-ins or hits Esc but wants to rehear the partial.
      this.onTurnComplete?.(collectedBlobs);
      this.stopAndDrain();
      throw e;
    }
  }

  stopAndDrain(): void {
    this.audioQueue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
    }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
    this.currentAudio = null;
    this.playing = false;
  }

  private tryStartPlayback(signal: AbortSignal): void {
    if (this.playing || signal.aborted) return;
    this.playNext(signal);
  }

  private playNext(signal: AbortSignal): void {
    if (signal.aborted) return;
    const blob = this.audioQueue.shift();
    if (!blob) {
      this.playing = false;
      return;
    }
    this.playing = true;
    this.currentChunk++;
    this.notifyProgress();
    this.currentUrl = URL.createObjectURL(blob);
    this.currentAudio = new Audio(this.currentUrl);
    this.currentAudio.onended = () => {
      if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
      this.currentAudio = null;
      this.playNext(signal);
    };
    this.currentAudio.onerror = () => {
      if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
      this.currentAudio = null;
      this.playNext(signal);
    };
    try {
      this.onAudioStart?.(this.currentAudio);
    } catch (e) {
      console.warn('onAudioStart callback failed:', e);
    }
    this.currentAudio.play().catch(() => {
      this.playing = false;
    });
  }

  private async waitForPlaybackDrain(signal: AbortSignal): Promise<void> {
    if (!this.autoPlay) return;
    while ((this.playing || this.audioQueue.length) && !signal.aborted) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  }

  private notifyProgress(): void {
    this.onChunkChange?.(this.currentChunk, this.totalChunks);
  }
}
