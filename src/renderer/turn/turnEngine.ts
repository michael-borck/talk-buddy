// TurnEngine — the deep module that owns one Conversation Turn end-to-end:
// capture (Listening) → transcribe → AI Brain reply → spoken aloud (Voice),
// plus barge-in, replay, pause, and session end. See CONTEXT.md for the
// domain terms (Turn, Conversation, Session, Listening/Voice/AI Brain).
//
// This is the React-FREE, DOM-FREE core. Everything side-effecting is an
// injected PORT (category-4 Mock): tests pass fakes and drive a full Turn —
// plus barge-in and replay — with no mic, no model, no DOM audio.
//
// Race discipline: every Turn has a monotonic id. State mutations arriving
// from an aborted Turn's async callbacks are dropped by `guard(turnId, …)`,
// so the stale-onended / barge-in-during-playback / abort-races-last-token
// bug class is impossible by construction — the one idea borrowed from the
// pure-reducer design without its ceremony.

import { ConversationMessage } from '../types';

// ---- Ports (injected; real adapters in prod, fakes in tests) ---------------

export interface CaptureHandle {
  stop(): Promise<Blob>; // resolve the recorded utterance
  cancel(): void;        // discard without producing a blob
}

export interface ListeningPort {
  startCapture(): Promise<CaptureHandle>;
  transcribe(audio: Blob): Promise<string>;
}

export interface BrainPort {
  // Streaming reply (audio path). Honours signal; throws AbortError on abort.
  stream(history: ConversationMessage[], systemPrompt: string, signal: AbortSignal): AsyncIterable<string>;
  // Non-streaming reply (mute path). Carries Ollama's opaque context forward.
  complete(history: ConversationMessage[], systemPrompt: string, context: number[] | undefined):
    Promise<{ text: string; context?: number[] }>;
}

export interface VoicePort {
  // Stream sentences→audio and play them in order (wraps TTSPipeline in prod).
  // Resolves when the queue drains; rejects AbortError when stopped mid-play.
  speak(opts: {
    tokens: AsyncIterable<string>;
    signal: AbortSignal;
    onProgress: (current: number, total: number) => void;
    onTurnComplete: (blobs: Blob[]) => void;
  }): Promise<void>;
  synthesize(text: string): Promise<Blob>;                       // one-shot (greeting / replay)
  playClips(blobs: Blob[], signal: AbortSignal): Promise<void>;  // replay path
  stop(): void;     // silence + drain the currently-playing audio immediately
  pause(): void;    // pause in place (does NOT abort the pipeline)
  resume(): void;
}

export interface CuePort {
  yourTurn(): void; // the "it's your turn" cue between Turns
}

// ---- Snapshot (what the view renders) --------------------------------------

export type TurnPhase = 'not-started' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused';
export type EndReason = 'natural' | 'user_ended' | 'user_paused';

export interface TurnSnapshot {
  messages: ConversationMessage[];
  phase: TurnPhase;
  chunkProgress: { current: number; total: number };
  replayingMessageId: string | null;
  synthesizingForMsgId: string | null;
  sessionComplete: boolean;
  endReason: EndReason | null;
  error: string | null; // user-facing; AbortError is NEVER surfaced here
}

export interface TurnEngineDeps {
  listening: ListeningPort;
  brain: BrainPort;
  voice: VoicePort;
  cue: CuePort;
  saveTranscript: (messages: ConversationMessage[]) => Promise<void>;
  systemPrompt: string;
  audioEnabled: boolean;
  onComplete?: (reason: EndReason) => void;
  onError?: (message: string) => void;
  // Injectable for deterministic tests; default to wall clock.
  nextId?: () => string;
  nowIso?: () => string;
}

const isAbort = (err: unknown): boolean => (err as { name?: string })?.name === 'AbortError';

const ENDING_PHRASES = [
  'goodbye', 'bye bye', 'have a nice day', 'take care',
  'see you later', 'thank you for coming', 'thanks for calling',
  'have a great day', 'have a great evening', 'have a wonderful day',
];
const STRICT_ENDING_PHRASES = [
  'is there anything else i can help you with today',
  'anything else i can help you with',
  'will that be all for today',
];

export class TurnEngine {
  private d: TurnEngineDeps;
  private listeners = new Set<() => void>();

  private _messages: ConversationMessage[] = [];
  private phase: TurnPhase = 'not-started';
  private progress = { current: 0, total: 0 };
  private replayingMessageId: string | null = null;
  private synthesizingForMsgId: string | null = null;
  private sessionComplete = false;
  private endReason: EndReason | null = null;
  private error: string | null = null;
  private audioEnabled: boolean;

  // Per-message synthesized audio cache, for replay.
  private audioByMessage = new Map<string, Blob[]>();
  // Ollama opaque context, carried across mute-path turns.
  private context: number[] | undefined;

  // Live-Turn bookkeeping. activeTurnId is the ONLY turn whose async
  // callbacks may mutate state; cancelling a turn nulls it.
  private turnCounter = 0;
  private activeTurnId: number | null = null;
  private liveAbort: AbortController | null = null;
  private capture: CaptureHandle | null = null;
  private replayAbort: AbortController | null = null;
  private prePausePhase: TurnPhase = 'idle';

  private nextId: () => string;
  private nowIso: () => string;
  private _snapshot: TurnSnapshot;

  constructor(deps: TurnEngineDeps) {
    this.d = deps;
    this.audioEnabled = deps.audioEnabled;
    let n = 0;
    this.nextId = deps.nextId ?? (() => `msg_${Date.now()}_${n++}`);
    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
    this._snapshot = this.build();
  }

  // ---- Observation ---------------------------------------------------------

  getSnapshot = (): TurnSnapshot => this._snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private build(): TurnSnapshot {
    return {
      messages: this._messages,
      phase: this.phase,
      chunkProgress: this.progress,
      replayingMessageId: this.replayingMessageId,
      synthesizingForMsgId: this.synthesizingForMsgId,
      sessionComplete: this.sessionComplete,
      endReason: this.endReason,
      error: this.error,
    };
  }

  private emit() {
    this._snapshot = this.build();
    this.listeners.forEach((l) => l());
  }

  /** Run `fn` only if `turnId` is still the live Turn. Drops stale callbacks. */
  private guard(turnId: number, fn: () => void) {
    if (turnId === this.activeTurnId) fn();
  }

  // ---- Message helpers (always replace the array so React sees a change) ----

  private append(msg: ConversationMessage) { this._messages = [...this._messages, msg]; }
  private patch(id: string, content: string) {
    this._messages = this._messages.map((m) => (m.id === id ? { ...m, content } : m));
  }
  private remove(id: string) { this._messages = this._messages.filter((m) => m.id !== id); }

  setAudioEnabled(enabled: boolean) { this.audioEnabled = enabled; }

  // ---- Seeding -------------------------------------------------------------

  /** Seed a resumed transcript without speaking anything. */
  seed(messages: ConversationMessage[]) {
    this._messages = [...messages];
    this.phase = 'idle';
    this.emit();
  }

  /** Bring a freshly-seeded or greeting-less session to the user's turn
   *  without disturbing any messages already present. */
  markReady() {
    if (this.phase === 'not-started') { this.phase = 'idle'; this.emit(); }
  }

  /** Append and (if audio is on) speak an opening greeting; cache for replay. */
  async greet(text: string): Promise<void> {
    const id = this.nextId();
    this.append({ id, role: 'assistant', content: text, timestamp: this.nowIso() });
    this.emit();
    await this.d.saveTranscript(this._messages).catch(() => {});
    if (!this.audioEnabled) { this.phase = 'idle'; this.emit(); return; }
    this.phase = 'thinking'; this.emit();
    try {
      const blob = await this.d.voice.synthesize(text);
      this.audioByMessage.set(id, [blob]);
      this.phase = 'speaking'; this.emit();
      const ctrl = new AbortController();
      this.replayAbort = ctrl;
      await this.d.voice.playClips([blob], ctrl.signal);
    } catch (err) {
      if (!isAbort(err)) console.warn('greet playback failed:', err);
    } finally {
      this.replayAbort = null;
      if (this.phase === 'speaking') { this.phase = 'idle'; this.emit(); this.safeCue(); }
    }
  }

  // ---- The Turn lifecycle --------------------------------------------------

  /** Begin capturing. Barge-in aware: starting while speaking cancels the
   *  live Turn (preserving its partial) and any replay first. */
  async beginListening(): Promise<void> {
    this.stopReplay();
    this.cancelLiveTurn();
    try {
      this.capture = await this.d.listening.startCapture();
      this.phase = 'listening';
      this.error = null;
      this.emit();
    } catch (err) {
      console.error('Failed to start capture:', err);
      this.fail('Failed to access microphone');
    }
  }

  /** Commit the in-flight capture: transcribe, then produce the reply. */
  async endListening(): Promise<void> {
    const cap = this.capture;
    if (!cap || this.phase !== 'listening') return;
    this.capture = null;
    this.phase = 'thinking';
    this.emit();
    let blob: Blob;
    try {
      blob = await cap.stop();
    } catch (err) {
      console.error('Capture stop failed:', err);
      this.fail('Failed to capture audio');
      return;
    }
    await this.processAudio(blob);
  }

  private async processAudio(audioBlob: Blob): Promise<void> {
    let text: string;
    try {
      text = await this.d.listening.transcribe(audioBlob);
    } catch (err) {
      console.error('Transcription failed:', err);
      this.fail('Speech-to-text failed. Check your Listening settings.');
      return;
    }
    if (!text.trim()) { this.phase = 'idle'; this.emit(); return; }

    const userMsg: ConversationMessage = { id: this.nextId(), role: 'user', content: text, timestamp: this.nowIso() };
    this.append(userMsg);
    const history = this._messages; // includes the new user message
    this.emit();

    if (!this.audioEnabled) { await this.runMuteTurn(history); return; }
    await this.runSpokenTurn(history);
  }

  private async runMuteTurn(history: ConversationMessage[]): Promise<void> {
    try {
      const { text, context } = await this.d.brain.complete(history, this.d.systemPrompt, this.context);
      this.context = context;
      const aiMsg: ConversationMessage = { id: this.nextId(), role: 'assistant', content: text, timestamp: this.nowIso() };
      this.append(aiMsg);
      this.emit();
      await this.d.saveTranscript(this._messages).catch(() => {});
      if (this.isNaturalEnding(text)) this.complete('natural');
      else { this.phase = 'idle'; this.emit(); }
    } catch (err) {
      console.error('Mute turn failed:', err);
      this.fail('AI Brain request failed.');
    }
  }

  private async runSpokenTurn(history: ConversationMessage[]): Promise<void> {
    this.cancelLiveTurn();
    const turnId = ++this.turnCounter;
    this.activeTurnId = turnId;
    const ctrl = new AbortController();
    this.liveAbort = ctrl;
    this.phase = 'speaking';
    this.emit();

    // Allocate the assistant id up front so synthesized blobs cache against
    // the transcript id and tokens can update the placeholder live — so a
    // barge-in/abort preserves the partial.
    const aiMsgId = this.nextId();
    this.append({ id: aiMsgId, role: 'assistant', content: '', timestamp: this.nowIso() });
    this.emit();

    let full = '';
    const self = this;
    const tokens = (async function* () {
      for await (const tok of self.d.brain.stream(history, self.d.systemPrompt, ctrl.signal)) {
        full += tok;
        self.guard(turnId, () => { self.patch(aiMsgId, full); self.emit(); });
        yield tok;
      }
    })();

    try {
      await this.d.voice.speak({
        tokens,
        signal: ctrl.signal,
        onProgress: (c, t) => this.guard(turnId, () => { this.progress = { current: c, total: t }; this.emit(); }),
        onTurnComplete: (blobs) => { this.audioByMessage.set(aiMsgId, blobs); },
      });

      await this.d.saveTranscript(this._messages).catch(() => {});
      if (this.isNaturalEnding(full)) {
        this.complete('natural');
      } else {
        this.guard(turnId, () => { this.phase = 'idle'; this.emit(); this.safeCue(); });
      }
    } catch (err) {
      if (isAbort(err)) {
        // Barge-in or Esc. Preserve the partial (or drop an empty bubble).
        if (!full.trim()) { this.remove(aiMsgId); this.emit(); }
        else { this.patch(aiMsgId, full); this.emit(); await this.d.saveTranscript(this._messages).catch(() => {}); }
        return; // phase was already moved by whoever cancelled the Turn
      }
      console.error('Voice pipeline failed:', err);
      this.d.onError?.(`Voice pipeline failed: ${err instanceof Error ? err.message : String(err)}`);
      if (!full.trim()) this.remove(aiMsgId);
      this.guard(turnId, () => { this.phase = 'idle'; this.emit(); });
    } finally {
      if (this.activeTurnId === turnId) this.activeTurnId = null;
      if (this.liveAbort === ctrl) this.liveAbort = null;
    }
  }

  /** Esc: silence the live Turn (or replay), keep the partial, return to idle. */
  abort(): void {
    this.stopReplay();
    if (this.cancelLiveTurn()) { this.phase = 'idle'; this.emit(); }
  }

  /** Cancel the live spoken Turn. Returns true if there was one. */
  private cancelLiveTurn(): boolean {
    if (this.activeTurnId === null && this.liveAbort === null) return false;
    this.activeTurnId = null;          // invalidate stale callbacks first
    this.liveAbort?.abort();
    this.liveAbort = null;
    this.d.voice.stop();
    this.progress = { current: 0, total: 0 };
    return true;
  }

  // ---- Replay (look-back; never a live Turn) -------------------------------

  async replay(messageId: string): Promise<void> {
    if (this.replayingMessageId === messageId) { this.stopReplay(); return; }

    if (!this.audioByMessage.has(messageId)) {
      const msg = this._messages.find((m) => m.id === messageId && m.role === 'assistant');
      if (!msg || !msg.content.trim()) { this.d.onError?.('Cannot replay this message.'); return; }
      this.synthesizingForMsgId = messageId;
      this.emit();
      try {
        const blob = await this.d.voice.synthesize(msg.content);
        this.audioByMessage.set(messageId, [blob]);
      } catch (err) {
        console.error('Failed to synthesise replay audio:', err);
        this.d.onError?.('Failed to generate replay audio.');
        this.synthesizingForMsgId = null; this.emit();
        return;
      }
      this.synthesizingForMsgId = null;
    }

    const blobs = this.audioByMessage.get(messageId)!;
    this.cancelLiveTurn();
    this.stopReplay();
    this.replayingMessageId = messageId;
    this.phase = 'speaking';
    this.emit();
    const ctrl = new AbortController();
    this.replayAbort = ctrl;
    try {
      await this.d.voice.playClips(blobs, ctrl.signal);
    } catch (err) {
      if (!isAbort(err)) console.warn('Replay playback failed:', err);
    } finally {
      this.replayAbort = null;
      if (this.replayingMessageId === messageId) {
        this.replayingMessageId = null;
        if (this.phase === 'speaking') this.phase = 'idle';
        this.emit();
      }
    }
  }

  private stopReplay(): void {
    if (!this.replayingMessageId && !this.replayAbort) return;
    this.replayAbort?.abort();
    this.replayAbort = null;
    this.d.voice.stop();
    this.replayingMessageId = null;
    if (this.phase === 'speaking') this.phase = 'idle';
    this.emit();
  }

  // ---- Pause-in-place (keeps the pipeline; distinct from abort) ------------

  pause(): void {
    if (this.phase === 'paused') return;
    this.prePausePhase = this.phase;
    // Pause in place: pause the currently-playing audio (live reply OR replay)
    // without aborting the pipeline. Live and replay are mutually exclusive,
    // so one voice.pause() covers both.
    this.d.voice.pause();
    this.phase = 'paused';
    this.emit();
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.d.voice.resume();
    this.phase = this.prePausePhase;
    this.emit();
  }

  // ---- Session end ---------------------------------------------------------

  end(reason: EndReason = 'user_ended'): void {
    this.stopReplay();
    this.cancelLiveTurn();
    this.complete(reason);
  }

  private complete(reason: EndReason) {
    this.sessionComplete = true;
    this.endReason = reason;
    this.emit();
    this.d.onComplete?.(reason);
  }

  /** Abort everything and release. Idempotent. */
  dispose(): void {
    this.cancelLiveTurn();
    this.replayAbort?.abort();
    this.replayAbort = null;
    this.capture?.cancel();
    this.capture = null;
    this.d.voice.stop();
    this.listeners.clear();
  }

  // ---- internals -----------------------------------------------------------

  private fail(message: string) {
    this.error = message;
    this.phase = 'idle';
    this.emit();
    this.d.onError?.(message);
  }

  private safeCue() {
    if (!this.audioEnabled) return;
    try { this.d.cue.yourTurn(); } catch (err) { console.warn('Failed to play turn cue:', err); }
  }

  private isNaturalEnding(response: string): boolean {
    const lower = response.toLowerCase();
    const hasGoodbye = ENDING_PHRASES.some((p) => lower.includes(p));
    const hasStrict = STRICT_ENDING_PHRASES.some((p) => lower.includes(p));
    return hasGoodbye || (hasStrict && this._messages.length > 4);
  }
}
