// Production adapters for the TurnEngine ports. Each wraps a real service so
// the engine core stays React-free and DOM-free. These are the "real" half of
// each seam; the fakes in turnEngine.test.ts are the other half.

import { transcribeAudio, generateSpeech } from '../services/speechProvider';
import { generateResponse, streamChatCompletion } from '../services/chat';
import { TTSPipeline } from '../services/ttsPipeline';
import { playYourTurnCue, CueStyle } from '../services/audioCues';
import { getPreference } from '../services/sqlite';
import { ListeningPort, BrainPort, VoicePort, CuePort, CaptureHandle } from './turnEngine';
import { AudioAnalyser } from './audioAnalyser';

export function createListeningPort(analyser: AudioAnalyser): ListeningPort {
  return {
    async startCapture(): Promise<CaptureHandle> {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const micToken = analyser.attachStream(stream);
      const cleanup = () => {
        analyser.detach(micToken);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      return {
        stop: () =>
          new Promise<Blob>((resolve) => {
            recorder.onstop = () => { cleanup(); resolve(new Blob(chunks, { type: 'audio/webm' })); };
            if (recorder.state === 'recording') recorder.stop();
            else { cleanup(); resolve(new Blob(chunks, { type: 'audio/webm' })); }
          }),
        cancel: () => {
          try { if (recorder.state === 'recording') recorder.stop(); } catch { /* ignore */ }
          cleanup();
        },
      };
    },
    transcribe: async (audio) => (await transcribeAudio(audio)).text,
  };
}

export function createBrainPort(): BrainPort {
  return {
    stream: (history, systemPrompt, signal) => streamChatCompletion(history, systemPrompt, { signal }),
    complete: async (history, systemPrompt, context) => {
      const { response, context: next } = await generateResponse(history, systemPrompt, context);
      return { text: response, context: next };
    },
  };
}

export function createVoicePort(analyser: AudioAnalyser, voice: 'male' | 'female' | undefined): VoicePort {
  let pipeline: TTSPipeline | null = null;
  let replay: HTMLAudioElement | null = null;
  let current: HTMLAudioElement | null = null; // latest playing element (live or replay) — for pause/resume

  const clearReplay = () => {
    if (replay) {
      try { replay.onended = null; replay.onerror = null; replay.pause(); replay.src = ''; } catch { /* ignore */ }
      replay = null;
    }
  };

  return {
    async speak({ tokens, signal, onProgress, onTurnComplete }) {
      let token = -1;
      const p = new TTSPipeline({
        synthesize: (sentence) => generateSpeech({ text: sentence, voice }),
        onChunkChange: (c, t) => onProgress(c, t),
        onAudioStart: (audio) => { current = audio; token = analyser.attachElement(audio); },
        onTurnComplete: (blobs) => onTurnComplete(blobs),
      });
      pipeline = p;
      try {
        await p.pump(tokens, signal);
      } finally {
        analyser.detach(token);
        if (pipeline === p) pipeline = null;
        if (current && current !== replay) current = null;
      }
    },

    synthesize: (text) => generateSpeech({ text, voice }),

    playClips(blobs, signal) {
      clearReplay();
      return new Promise<void>((resolve) => {
        if (signal.aborted) { resolve(); return; }
        let i = 0;
        let token = -1;
        const finish = () => { analyser.detach(token); signal.removeEventListener('abort', onAbort); resolve(); };
        const onAbort = () => { clearReplay(); current = null; finish(); };
        signal.addEventListener('abort', onAbort, { once: true });
        const playNext = () => {
          if (signal.aborted) return;
          if (i >= blobs.length) { replay = null; current = null; finish(); return; }
          const url = URL.createObjectURL(blobs[i]);
          const audio = new Audio(url);
          replay = audio;
          current = audio;
          token = analyser.attachElement(audio);
          audio.onended = () => { URL.revokeObjectURL(url); i++; playNext(); };
          audio.onerror = () => { URL.revokeObjectURL(url); i++; playNext(); };
          audio.play().catch((err) => console.warn('Replay playback failed:', err));
        };
        playNext();
      });
    },

    stop() {
      pipeline?.stopAndDrain();
      pipeline = null;
      clearReplay();
      current = null;
      analyser.detach();
    },

    pause() {
      try { current?.pause(); } catch { /* ignore */ }
    },
    resume() {
      current?.play().catch((err) => console.warn('Resume play failed:', err));
    },
  };
}

export function createCuePort(): CuePort {
  return {
    yourTurn() {
      void (async () => {
        try {
          const style = ((await getPreference('conversationCue')) as CueStyle | null) || 'rise';
          playYourTurnCue(style);
        } catch (err) {
          console.warn('Failed to play turn cue:', err);
        }
      })();
    },
  };
}
