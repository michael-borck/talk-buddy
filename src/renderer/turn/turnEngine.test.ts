import { describe, it, expect, vi } from 'vitest';
import { TurnEngine, ListeningPort, BrainPort, VoicePort, CuePort, TurnEngineDeps } from './turnEngine';

// ---- test helpers ----------------------------------------------------------

const abortErr = () => new DOMException('Aborted', 'AbortError');
const onAbort = (signal: AbortSignal) =>
  new Promise<never>((_, rej) => {
    if (signal.aborted) return rej(abortErr());
    signal.addEventListener('abort', () => rej(abortErr()), { once: true });
  });
const flush = async () => { await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0)); };

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

interface FakeOpts {
  transcript?: string;
  tokens?: string[];
  speakMode?: 'auto' | 'gated';      // gated: hang after draining tokens until aborted
  playMode?: 'auto' | 'gated';       // gated: hang until aborted (for replay-toggle tests)
  staleProgressOnAbort?: boolean;    // fire a stale onProgress after abort (race test)
}

function makeFakes(opts: FakeOpts = {}) {
  const tokens = opts.tokens ?? ['Hello. ', 'How are you?'];
  const transcript = opts.transcript ?? 'hi there';
  const synthCalls: string[] = [];
  const speakGate = deferred();
  const cue = vi.fn();
  const stop = vi.fn();

  const listening: ListeningPort = {
    startCapture: async () => ({ stop: async () => new Blob(['audio']), cancel: () => {} }),
    transcribe: async () => transcript,
  };

  const brain: BrainPort = {
    stream: (_h, _s, signal) =>
      (async function* () {
        for (const t of tokens) { if (signal.aborted) throw abortErr(); yield t; }
      })(),
    complete: async (_h, _s, context) => ({ text: 'muted reply', context }),
  };

  const voice: VoicePort = {
    speak: vi.fn(async ({ tokens: toks, signal, onProgress, onTurnComplete }) => {
      const blobs: Blob[] = [];
      let i = 0;
      for await (const t of toks) {
        if (signal.aborted) break;
        blobs.push(new Blob([t]));
        onProgress(++i, i);
      }
      if (opts.speakMode === 'gated') {
        try {
          await Promise.race([speakGate.promise, onAbort(signal)]);
        } catch (e) {
          if (opts.staleProgressOnAbort) onProgress(99, 99);
          throw e;
        }
      }
      if (signal.aborted) { if (opts.staleProgressOnAbort) onProgress(99, 99); throw abortErr(); }
      onTurnComplete(blobs);
    }),
    synthesize: vi.fn(async (text: string) => { synthCalls.push(text); return new Blob([text]); }),
    playClips: vi.fn(async (_blobs: Blob[], signal: AbortSignal) => {
      if (opts.playMode === 'gated') await onAbort(signal).catch(() => {});
    }),
    stop,
    pause: vi.fn(),
    resume: vi.fn(),
  };

  return { listening, brain, voice, cue: { yourTurn: cue } as CuePort, synthCalls, cueFn: cue, speakGate, stop };
}

function makeEngine(f: ReturnType<typeof makeFakes>, over: Partial<TurnEngineDeps> = {}) {
  let i = 0;
  return new TurnEngine({
    listening: f.listening, brain: f.brain, voice: f.voice, cue: f.cue,
    saveTranscript: vi.fn(async () => {}),
    systemPrompt: 'sys',
    audioEnabled: true,
    nextId: () => `m${i++}`,
    nowIso: () => 'T',
    ...over,
  });
}

// ---- tests -----------------------------------------------------------------

describe('TurnEngine — a full spoken Turn', () => {
  it('listening → reply spoken → idle, with one turn cue', async () => {
    const f = makeFakes({ transcript: 'hi there', tokens: ['Hello. ', 'there.'] });
    const save = vi.fn(async () => {});
    const e = makeEngine(f, { saveTranscript: save });

    await e.beginListening();
    expect(e.getSnapshot().phase).toBe('listening');

    await e.endListening();
    const s = e.getSnapshot();
    expect(s.phase).toBe('idle');
    expect(s.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(s.messages[0].content).toBe('hi there');
    expect(s.messages[1].content).toBe('Hello. there.');
    expect(f.cueFn).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalled();
  });

  it('drops an empty transcript without creating messages', async () => {
    const f = makeFakes({ transcript: '   ' });
    const e = makeEngine(f);
    await e.beginListening();
    await e.endListening();
    expect(e.getSnapshot().phase).toBe('idle');
    expect(e.getSnapshot().messages).toHaveLength(0);
    expect(f.voice.speak).not.toHaveBeenCalled();
  });
});

describe('TurnEngine — barge-in', () => {
  it('starting a Turn while speaking keeps the partial reply and fires no cue', async () => {
    const f = makeFakes({ transcript: 'q', tokens: ['Part', 'ial'], speakMode: 'gated' });
    const e = makeEngine(f);

    await e.beginListening();
    const turn = e.endListening();          // hangs at the speak gate
    await flush();
    expect(e.getSnapshot().phase).toBe('speaking');
    expect(e.getSnapshot().messages.find((m) => m.role === 'assistant')?.content).toBe('Partial');

    await e.beginListening();               // BARGE-IN
    await turn;                             // the aborted Turn settles

    const s = e.getSnapshot();
    expect(s.phase).toBe('listening');                                   // new Turn capturing
    expect(s.messages.find((m) => m.role === 'assistant')?.content).toBe('Partial'); // preserved
    expect(f.cueFn).not.toHaveBeenCalled();                             // no cue on aborted Turn
  });

  it('drops stale callbacks from the aborted Turn (turnId guard)', async () => {
    const f = makeFakes({ tokens: ['a'], speakMode: 'gated', staleProgressOnAbort: true });
    const e = makeEngine(f);

    await e.beginListening();
    const turn = e.endListening();
    await flush();
    expect(e.getSnapshot().chunkProgress).toEqual({ current: 1, total: 1 });

    await e.beginListening();               // barge-in: cancel resets progress to 0/0
    await turn;                             // stale onProgress(99,99) arrives — must be ignored

    expect(e.getSnapshot().chunkProgress).toEqual({ current: 0, total: 0 });
  });
});

describe('TurnEngine — replay', () => {
  it('re-hears a Turn from cache without re-synthesizing', async () => {
    const f = makeFakes({ tokens: ['Hi.'], playMode: 'gated' });
    const e = makeEngine(f);
    await e.beginListening();
    await e.endListening();                 // caches the assistant audio via onTurnComplete
    const aiId = e.getSnapshot().messages.at(-1)!.id;

    const rp = e.replay(aiId);              // gated playback hangs
    await flush();
    expect(e.getSnapshot().replayingMessageId).toBe(aiId);
    expect(f.synthCalls).toHaveLength(0);   // cache hit

    await e.replay(aiId);                   // same id toggles replay off
    await rp;
    expect(e.getSnapshot().replayingMessageId).toBeNull();
  });

  it('synthesizes on demand for a seeded message, then caches it', async () => {
    const f = makeFakes({ playMode: 'auto' });
    const e = makeEngine(f);
    e.seed([{ id: 'a1', role: 'assistant', content: 'Welcome back', timestamp: 'T' }]);

    await e.replay('a1');
    expect(f.synthCalls).toEqual(['Welcome back']);
    expect(e.getSnapshot().replayingMessageId).toBeNull();

    await e.replay('a1');                   // second time: cached
    expect(f.synthCalls).toEqual(['Welcome back']);
  });
});

describe('TurnEngine — mute path and natural ending', () => {
  it('uses the non-streaming Brain and fires no cue when audio is off', async () => {
    const f = makeFakes({ transcript: 'hello' });
    const e = makeEngine(f, { audioEnabled: false });
    await e.beginListening();
    await e.endListening();
    const s = e.getSnapshot();
    expect(s.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(s.messages[1].content).toBe('muted reply');
    expect(f.voice.speak).not.toHaveBeenCalled();
    expect(f.cueFn).not.toHaveBeenCalled();
  });

  it('completes the session when the reply says goodbye', async () => {
    const f = makeFakes({ tokens: ['Goodbye!'] });
    const onComplete = vi.fn();
    const e = makeEngine(f, { onComplete });
    await e.beginListening();
    await e.endListening();
    expect(e.getSnapshot().sessionComplete).toBe(true);
    expect(e.getSnapshot().endReason).toBe('natural');
    expect(onComplete).toHaveBeenCalledWith('natural');
    expect(f.cueFn).not.toHaveBeenCalled();
  });
});
