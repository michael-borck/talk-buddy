// HandsFreeController — voice-activity turn-taking for hands-free practice.
//
// The TurnEngine owns the Turn lifecycle; this controller decides WHEN turns
// begin and end by watching the shared mic amplitude (already computed by the
// AudioAnalyser rAF loop) while the engine sits in the `listening` phase:
//
//   idle     → auto-start capture after a short arm delay (lets the turn cue land)
//   listening→ speech onset (sustained above threshold) arms the endpoint;
//              sustained silence below the hysteresis threshold hands the turn over
//   listening→ no speech at all within the no-speech window → discard the capture
//   listening→ hard utterance cap, as a runaway-recording guard
//
// React-free and timer-injectable for deterministic tests. Barge-in during AI
// speech stays a deliberate space press — automatic barge-in on speaker bleed
// needs real echo cancellation, which the browser does not guarantee.

export type HandsFreePhase =
  | 'not-started' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused';

export interface HandsFreeDeps {
  phase(): HandsFreePhase;
  amplitude: { current: number }; // AudioAnalyser.amplitude, 0..1 smoothed
  beginListening(): Promise<void>;
  endListening(): Promise<void>;
  cancelListening(): void;
}

// Tuning constants. The analyser's smoothed frequency-mean sits around
// 0.005–0.03 for a quiet room and well above 0.06 for close speech.
const ONSET_THRESHOLD = 0.055;       // amplitude that counts as speech starting
const RELEASE_THRESHOLD = 0.04;      // hysteresis floor: below this = silence
const ONSET_SUSTAIN_MS = 150;        // above-onset time before speech is "real"
const SILENCE_TIMEOUT_MS = 1400;     // silence after speech that ends the turn
const NO_SPEECH_TIMEOUT_MS = 8000;   // no speech at all → discard the capture
const MAX_UTTERANCE_MS = 90_000;     // runaway guard on a single utterance
const ARM_DELAY_MS = 500;            // idle → capture delay (cue + breath)
const TICK_MS = 80;                  // amplitude sampling interval

export class HandsFreeController {
  private d: HandsFreeDeps;
  private timer: ReturnType<typeof setInterval> | null = null;
  private armTimer: ReturnType<typeof setTimeout> | null = null;

  // Endpoint state, meaningful only while the engine is listening.
  private listeningSince = 0;
  private speechStartedAt: number | null = null; // first above-onset sample
  private speechArmedAt: number | null = null;   // onset sustained → armed
  private lastLoudAt = 0;

  constructor(deps: HandsFreeDeps) {
    this.d = deps;
  }

  /** Start watching. Safe to call repeatedly; acts only when not running. */
  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.scheduleArm();
  }

  /** Stop watching and clear all pending timers. */
  stop(): void {
    if (this.armTimer !== null) { clearTimeout(this.armTimer); this.armTimer = null; }
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.resetEndpoint();
  }

  private scheduleArm(): void {
    if (this.armTimer !== null) return;
    this.armTimer = setTimeout(() => {
      this.armTimer = null;
      if (this.d.phase() === 'idle') void this.d.beginListening();
    }, ARM_DELAY_MS);
  }

  private resetEndpoint(): void {
    this.listeningSince = 0;
    this.speechStartedAt = null;
    this.speechArmedAt = null;
    this.lastLoudAt = 0;
  }

  private tick(): void {
    const phase = this.d.phase();

    if (phase === 'idle') {
      // Missed arm (race between start() and a phase flip) — try again.
      this.scheduleArm();
      return;
    }

    if (phase !== 'listening') {
      // thinking/speaking/paused/not-started: nothing to endpoint.
      if (this.listeningSince !== 0) this.resetEndpoint();
      return;
    }

    const now = Date.now();
    if (this.listeningSince === 0) {
      this.listeningSince = now;
      this.lastLoudAt = now;
    }
    const amp = this.d.amplitude.current;
    const held = now - this.listeningSince;

    // Hard cap: never record forever.
    if (held >= MAX_UTTERANCE_MS) { void this.d.endListening(); return; }

    // Speech onset — must sustain above threshold so clicks/coughs don't arm.
    if (amp >= ONSET_THRESHOLD) {
      if (this.speechStartedAt === null) this.speechStartedAt = now;
      if (this.speechArmedAt === null && now - this.speechStartedAt >= ONSET_SUSTAIN_MS) {
        this.speechArmedAt = now;
      }
      this.lastLoudAt = now;
      return;
    }
    this.speechStartedAt = null; // below onset: restart the sustain window

    // No speech at all within the window → discard the capture quietly.
    if (this.speechArmedAt === null) {
      if (held >= NO_SPEECH_TIMEOUT_MS) this.d.cancelListening();
      return;
    }

    // Armed + sustained silence below the release threshold → hand over.
    // The grace period starts from the last above-release sample, so brief
    // dips mid-sentence don't chop the utterance.
    if (amp >= RELEASE_THRESHOLD) this.lastLoudAt = now;
    else if (now - this.lastLoudAt >= SILENCE_TIMEOUT_MS) void this.d.endListening();
  }
}
