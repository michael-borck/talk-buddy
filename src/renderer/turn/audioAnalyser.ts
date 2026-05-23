// Web Audio amplitude tap for the EditorialVoiceVisualizer. Ported verbatim
// from the old ConversationPage analyser helpers (one AudioContext, one
// AnalyserNode, one rAF loop writing a smoothed 0..1 amplitude). It is the
// shared infrastructure both the Listening and Voice adapters write to; the
// TurnEngine core never touches it.
//
// `attach*` returns a generation token; `detach(token)` only clears if that
// token is still the active one — so a Voice adapter tearing down its analyser
// after a barge-in can't kill the mic analyser the new Turn just attached.

export interface AudioAnalyser {
  amplitude: { current: number }; // satisfies React's MutableRefObject<number>
  attachStream(stream: MediaStream): number;   // mic source
  attachElement(el: HTMLAudioElement): number; // <audio> source
  detach(token?: number): void;
  dispose(): void;
}

export function createAudioAnalyser(): AudioAnalyser {
  let ctx: AudioContext | null = null;
  let active: AnalyserNode | null = null;
  let raf: number | null = null;
  let seq = 0;
  const amplitude = { current: 0 };

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
  };

  const makeAnalyser = (c: AudioContext): AnalyserNode => {
    const a = c.createAnalyser();
    a.fftSize = 256;
    a.smoothingTimeConstant = 0.7;
    return a;
  };

  return {
    amplitude,

    attachStream(stream) {
      try {
        const c = getCtx();
        const source = c.createMediaStreamSource(stream);
        const analyser = makeAnalyser(c);
        source.connect(analyser);
        active = analyser;
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
        startLoop();
      } catch (err) {
        console.warn('TTS analyser setup failed:', err);
      }
      return ++seq;
    },

    detach(token) {
      if (token !== undefined && token !== seq) return; // a newer attachment owns the analyser
      active = null;
      stopLoop();
    },

    dispose() {
      active = null;
      stopLoop();
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    },
  };
}
