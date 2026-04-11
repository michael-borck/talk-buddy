// Audio cue synthesis via Web Audio API.
// No asset files — cues are generated from oscillators on demand.

export type CueStyle = 'rise' | 'click' | 'none';

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Safari / Chrome may suspend the context until a user gesture
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/**
 * Two-note rise: soft 440Hz → 660Hz sine sweep with a gentle envelope.
 * Reads as "your turn" — lifted, inviting.
 */
function playRise(audioContext: AudioContext) {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.14);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}

/**
 * Single percussive click at 1200Hz, ~60ms.
 * Reads as "go" — tight, tactile.
 */
function playClick(audioContext: AudioContext) {
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Play the "your turn" cue. Silently no-ops for style 'none'.
 * Safe to call from any event handler; failures are swallowed to avoid
 * disrupting the conversation flow.
 */
export function playYourTurnCue(style: CueStyle): void {
  if (style === 'none') return;
  try {
    const audioContext = getContext();
    if (style === 'rise') {
      playRise(audioContext);
    } else if (style === 'click') {
      playClick(audioContext);
    }
  } catch (err) {
    console.warn('Audio cue failed:', err);
  }
}
