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
import { withPersonaTag, withSpokenText, parsePersonaTag, splitSpeakerPrefix } from './personaStream';

// Shared per-Turn speaker state. The Brain side writes the `[[Name]]` tag it
// strips; the Voice side reads it to pick the character's voice and to strip
// the `Name: ` transcript label from speech.
export interface PersonaChannel {
  current: string | null;
}

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

export function createBrainPort(persona?: PersonaChannel): BrainPort {
  const stripTag = (text: string): string => {
    if (!persona) return text;
    persona.current = null; // fresh Turn — clear any previous speaker
    const tag = parsePersonaTag(text);
    if (!tag) return text;
    persona.current = tag.name;
    return `${tag.name}: ${tag.rest}`;
  };
  return {
    stream: (history, systemPrompt, signal) => {
      if (persona) persona.current = null; // fresh Turn — clear any previous speaker
      const raw = streamChatCompletion(history, systemPrompt, { signal });
      if (!persona) return raw;
      return withPersonaTag(raw, (name) => { persona.current = name; });
    },
    complete: async (history, systemPrompt, context) => {
      const { response, context: next } = await generateResponse(history, systemPrompt, context);
      return { text: stripTag(response), context: next };
    },
  };
}

export function createVoicePort(
  analyser: AudioAnalyser,
  getVoice: () => 'male' | 'female' | undefined,
  persona?: PersonaChannel
): VoicePort {
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
      const spoken = persona ? withSpokenText(tokens, () => persona.current) : tokens;
      const p = new TTSPipeline({
        // Resolved per sentence, so a persona change mid-turn takes effect
        // from the next synthesized sentence.
        synthesize: (sentence) => generateSpeech({ text: sentence, voice: getVoice() }),
        onChunkChange: (c, t) => onProgress(c, t),
        onAudioStart: (audio) => { current = audio; token = analyser.attachElement(audio); },
        onTurnComplete: (blobs) => onTurnComplete(blobs),
      });
      pipeline = p;
      try {
        await p.pump(spoken, signal);
      } finally {
        analyser.detach(token);
        if (pipeline === p) pipeline = null;
        if (current && current !== replay) current = null;
      }
    },

    synthesize: (text) => {
      // Greeting / replay path. Strip a leading [[Name]] tag — and any
      // `Name: ` transcript label on resumed/seeded messages — so names are
      // never read aloud, and the right persona's voice is resolved.
      let spoken = text;
      if (persona) {
        persona.current = null;
        const tag = parsePersonaTag(text);
        if (tag) { persona.current = tag.name; spoken = tag.rest; }
        const labelled = splitSpeakerPrefix(spoken);
        if (labelled) {
          if (!persona.current) persona.current = labelled.speaker;
          spoken = labelled.text;
        }
      }
      return generateSpeech({ text: spoken, voice: getVoice() });
    },

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
