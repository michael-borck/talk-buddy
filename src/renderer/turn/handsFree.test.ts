import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HandsFreeController, HandsFreePhase } from './handsFree';

// Deterministic clock + amplitude controller tests. The controller samples a
// fake amplitude ref every 80ms; advanceTimersByTimeAsync steps the fake clock
// and flushes microtasks so begin/end promises resolve.

describe('HandsFreeController', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function setup(initialPhase: HandsFreePhase = 'idle') {
    let phase = initialPhase;
    const amplitude = { current: 0 };
    const beginListening = vi.fn(async () => { phase = 'listening'; });
    const endListening = vi.fn(async () => { phase = 'thinking'; });
    const cancelListening = vi.fn(() => { phase = 'idle'; });
    const c = new HandsFreeController({
      phase: () => phase,
      amplitude,
      beginListening,
      endListening,
      cancelListening,
    });
    const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
    return {
      c, advance, amplitude, beginListening, endListening, cancelListening,
      setPhase: (p: HandsFreePhase) => { phase = p; },
    };
  }

  it('auto-starts listening after the arm delay when idle', async () => {
    const { c, advance, beginListening } = setup('idle');
    c.start();
    await advance(400);
    expect(beginListening).not.toHaveBeenCalled();
    await advance(200);
    expect(beginListening).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it('does not auto-start when the phase moved on before the arm delay elapsed', async () => {
    const { c, advance, beginListening } = setup('speaking');
    c.start();
    await advance(2000);
    expect(beginListening).not.toHaveBeenCalled();
    c.stop();
  });

  it('re-arms via the idle tick after a pause ends', async () => {
    const { c, advance, setPhase, beginListening } = setup('paused');
    c.start();
    await advance(2000);
    expect(beginListening).not.toHaveBeenCalled();

    setPhase('idle'); // the engine resumed back to the user's turn
    await advance(700);
    expect(beginListening).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it('ends the turn after sustained silence once speech was detected', async () => {
    const { c, advance, amplitude, endListening } = setup('listening');
    c.start();

    amplitude.current = 0.2; // speech
    await advance(300);      // sustains past ONSET_SUSTAIN_MS
    expect(endListening).not.toHaveBeenCalled();

    amplitude.current = 0.001; // silence
    await advance(1000);
    expect(endListening).not.toHaveBeenCalled(); // inside the grace window

    await advance(600); // crosses SILENCE_TIMEOUT_MS since the last loud sample
    expect(endListening).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it('ignores a short click that never sustains speech onset, discarding as no-speech', async () => {
    const { c, advance, amplitude, endListening, cancelListening } = setup('listening');
    c.start();

    amplitude.current = 0.3;
    await advance(80); // one loud tick, below ONSET_SUSTAIN_MS
    amplitude.current = 0.001;
    await advance(8300); // past the no-speech window since capture start
    expect(endListening).not.toHaveBeenCalled();
    expect(cancelListening).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it('discards the capture when no speech arrives within the no-speech window', async () => {
    const { c, advance, amplitude, cancelListening, endListening } = setup('listening');
    c.start();
    amplitude.current = 0.001;
    await advance(7500);
    expect(cancelListening).not.toHaveBeenCalled();
    await advance(700);
    expect(cancelListening).toHaveBeenCalledTimes(1);
    expect(endListening).not.toHaveBeenCalled();
    c.stop();
  });

  it('does not hand over mid-sentence dips inside the hysteresis band', async () => {
    const { c, advance, amplitude, endListening } = setup('listening');
    c.start();

    amplitude.current = 0.2;
    await advance(300); // armed

    // Hold in the 0.04–0.055 band — above the release floor, below onset —
    // for longer than SILENCE_TIMEOUT_MS in total.
    for (let i = 0; i < 30; i++) {
      amplitude.current = 0.045;
      await advance(80);
    }
    expect(endListening).not.toHaveBeenCalled();
    c.stop();
  });

  it('caps a runaway utterance at MAX_UTTERANCE_MS', async () => {
    const { c, advance, amplitude, endListening } = setup('listening');
    c.start();
    amplitude.current = 0.2;
    await advance(90_500);
    expect(endListening).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it('stop() clears pending timers so nothing fires afterwards', async () => {
    const { c, advance, beginListening, endListening } = setup('idle');
    c.start();
    c.stop();
    await advance(5000);
    expect(beginListening).not.toHaveBeenCalled();
    expect(endListening).not.toHaveBeenCalled();
  });
});
