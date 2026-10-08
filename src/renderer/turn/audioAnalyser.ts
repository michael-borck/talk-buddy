// Web Audio amplitude tap for the EditorialVoiceVisualizer. Ported verbatim
// from the old ConversationPage analyser helpers (one AudioContext, one
// AnalyserNode, one rAF loop writing a smoothed 0..1 amplitude). It is the
// shared infrastructure both the Listening and Voice adapters write to; the
// TurnEngine core never touches it.
//
// `attach*` returns a generation token; `detach(token)` only clears if that
// token is still the active one — so a Voice adapter tearing down its analyser
// after a barge-in can't kill the mic analyser the new Turn just attached.
//
// Speech probability: when a Silero VAD is attached (attachVad), the same rAF
// loop also taps time-domain PCM from the *mic* analyser, decimates it to
// 16kHz, and feeds the VAD; `speechProbability.current` then tracks the
// latest speech probability. Only the mic is fed — TTS playback is never
// voice-activity-tested (speaker bleed must not arm a capture).

import { Vad, downsampleTo16k, PcmChunker } from './vad';

export interface AudioAnalyser {
  amplitude: { current: number }; // satisfies React's MutableRefObject<number>
  speechProbability: { current: number }; // 0 until a VAD is attached and fed
  attachStream(stream: MediaStream): number;   // mic source
  attachElement(el: HTMLAudioElement): number; // <audio> source
  detach(token?: number): void;
  attachVad(vad: Vad): void;
  detachVad(): void;
  dispose(): void;
}

export function createAudioAnalyser(): AudioAnalyser {
  let ctx: AudioContext | null = null;
  let active: AnalyserNode | null = null;
  let activeIsMic = false;
  let raf: number | null = null;
  let seq = 0;
  const amplitude = { current: 0 };
  const speechProbability = { current: 0 };

  // VAD plumbing — inert until attachVad().
  let vad: Vad | null = null;
  let chunker: PcmChunker | null = null;
  let pcmBuf = new Float32Array(256); // fftSize

  const getCtx = (): AudioContext => {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };

  const startLoop = () => {
    if (raf !== null) return;
    const buffer = new Uint8Array(128);
    const tick = () => {
      if (active) {
        active.getByteFrequencyData(buffer);
        let sum = 0;
        const limit = Math.min(64, buffer.length);
        for (let i = 0; i < limit; i++) sum += buffer[i];
        const mean = sum / limit / 255; // 0..1
        amplitude.current = amplitude.current * 0.6 + mean * 0.4; // light smoothing

        // Neural VAD tap — mic only, never TTS playback (speaker bleed must
        // not count as speech). Feeds are fire-and-forget; readers see the
        // freshest completed probability.
        if (vad && chunker && activeIsMic) {
          if (pcmBuf.length !== active.fftSize) pcmBuf = new Float32Array(active.fftSize);
          active.getFloatTimeDomainData(pcmBuf);
          chunker.push(downsampleTo16k(pcmBuf, ctx ? ctx.sampleRate : 48_000));
        }
      } else {
        amplitude.current = amplitude.current * 0.85; // decay to rest
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    amplitude.current = 0;
    speechProbability.current = 0;
  };

  const makeAnalyser = (c: AudioContext): AnalyserNode => {
    const a = c.createAnalyser();
    a.fftSize = 256;
    a.smoothingTimeConstant = 0.7;
    return a;
  };

  return {
    amplitude,
    speechProbability,

    attachStream(stream) {
      try {
        const c = getCtx();
        // A new capture is a new utterance: clear the VAD's LSTM state so the
        // previous turn's speech memory can't leak a false-positive onset.
        vad?.reset();
        const source = c.createMediaStreamSource(stream);
        const analyser = makeAnalyser(c);
        source.connect(analyser);
        active = analyser;
        activeIsMic = true;
        startLoop();
      } catch (err) {
        console.warn('Mic analyser setup failed:', err);
      }
      return ++seq;
    },

    attachElement(el) {
      try {
        const c = getCtx();
        // createMediaElementSource may be called only once per element; a fresh
        // <audio> per utterance keeps that safe.
        const source = c.createMediaElementSource(el);
        const analyser = makeAnalyser(c);
        source.connect(analyser);
        analyser.connect(c.destination);
        active = analyser;
        activeIsMic = false;
        startLoop();
      } catch (err) {
        console.warn('TTS analyser setup failed:', err);
      }
      return ++seq;
    },

    detach(token) {
      if (token !== undefined && token !== seq) return; // a newer attachment owns the analyser
      active = null;
      activeIsMic = false;
      stopLoop();
    },

    attachVad(v) {
      vad = v;
      chunker = new PcmChunker((chunk) => vad!.process(chunk));
    },

    detachVad() {
      vad?.reset();
      vad = null;
      chunker = null;
      speechProbability.current = 0;
    },

    dispose() {
      active = null;
      activeIsMic = false;
      stopLoop();
      vad = null;
      chunker = null;
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    },
  };
}
