// Thin React adapter over the TurnEngine core. It does subscribe/snapshot
// plumbing (useSyncExternalStore), owns the engine's lifecycle, and forwards
// actions — no orchestration logic lives here. Matches the useSettings /
// useModelFetcher conventions: returns { ...state, ...actions }.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, MutableRefObject } from 'react';
import { TurnEngine, TurnSnapshot, EndReason } from '../turn/turnEngine';
import { AudioAnalyser, createAudioAnalyser } from '../turn/audioAnalyser';
import { createListeningPort, createBrainPort, createVoicePort, createCuePort } from '../turn/turnPorts';
import { Scenario, ConversationMessage } from '../types';

const EMPTY: TurnSnapshot = {
  messages: [],
  phase: 'not-started',
  chunkProgress: { current: 0, total: 0 },
  replayingMessageId: null,
  synthesizingForMsgId: null,
  sessionComplete: false,
  endReason: null,
  error: null,
};

export interface UseConversationTurn extends TurnSnapshot {
  ready: boolean;
  amplitudeRef: MutableRefObject<number>;
  greet(text: string): Promise<void>;
  seed(messages: ConversationMessage[]): void;
  markReady(): void;
  beginListening(): Promise<void>;
  endListening(): Promise<void>;
  abort(): void;
  replay(messageId: string): Promise<void>;
  pause(): void;
  resume(): void;
  end(reason?: EndReason): void;
}

export interface UseConversationTurnParams {
  scenario: Scenario | null;
  audioEnabled: boolean;
  saveTranscript: (messages: ConversationMessage[]) => Promise<void>;
  onComplete: (reason: EndReason) => void;
  onError: (message: string) => void;
}

export function useConversationTurn(params: UseConversationTurnParams): UseConversationTurn {
  // Keep callbacks fresh without rebuilding the engine each render.
  const cb = useRef(params);
  cb.current = params;

  const analyserRef = useRef<AudioAnalyser | null>(null);
  if (!analyserRef.current) analyserRef.current = createAudioAnalyser();

  const [engine, setEngine] = useState<TurnEngine | null>(null);
  const scenarioId = params.scenario?.id ?? null;

  // Build the engine when the scenario is available; dispose on change/unmount.
  useEffect(() => {
    const scenario = cb.current.scenario;
    const analyser = analyserRef.current;
    if (!scenario || !analyser) return;
    const e = new TurnEngine({
      listening: createListeningPort(analyser),
      brain: createBrainPort(),
      voice: createVoicePort(analyser, scenario.voice),
      cue: createCuePort(),
      saveTranscript: (m) => cb.current.saveTranscript(m),
      systemPrompt: scenario.systemPrompt ?? '',
      audioEnabled: cb.current.audioEnabled,
      onComplete: (r) => cb.current.onComplete(r),
      onError: (m) => cb.current.onError(m),
    });
    setEngine(e);
    return () => {
      e.dispose();
      setEngine((cur) => (cur === e ? null : cur));
    };
  }, [scenarioId]);

  // Keep the engine's audio flag in sync with the page's mute toggle.
  useEffect(() => { engine?.setAudioEnabled(params.audioEnabled); }, [engine, params.audioEnabled]);

  // Release the AudioContext on final unmount.
  useEffect(() => () => { analyserRef.current?.dispose(); analyserRef.current = null; }, []);

  const subscribe = useCallback((l: () => void) => (engine ? engine.subscribe(l) : () => {}), [engine]);
  const getSnap = useCallback(() => (engine ? engine.getSnapshot() : EMPTY), [engine]);
  const snapshot = useSyncExternalStore(subscribe, getSnap);

  return {
    ...snapshot,
    ready: engine !== null,
    amplitudeRef: (analyserRef.current?.amplitude ?? { current: 0 }) as MutableRefObject<number>,
    greet: useCallback((text: string) => engine?.greet(text) ?? Promise.resolve(), [engine]),
    seed: useCallback((m: ConversationMessage[]) => { engine?.seed(m); }, [engine]),
    markReady: useCallback(() => { engine?.markReady(); }, [engine]),
    beginListening: useCallback(() => engine?.beginListening() ?? Promise.resolve(), [engine]),
    endListening: useCallback(() => engine?.endListening() ?? Promise.resolve(), [engine]),
    abort: useCallback(() => { engine?.abort(); }, [engine]),
    replay: useCallback((id: string) => engine?.replay(id) ?? Promise.resolve(), [engine]),
    pause: useCallback(() => { engine?.pause(); }, [engine]),
    resume: useCallback(() => { engine?.resume(); }, [engine]),
    end: useCallback((reason?: EndReason) => { engine?.end(reason); }, [engine]),
  };
}
