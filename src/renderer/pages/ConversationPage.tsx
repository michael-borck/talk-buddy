import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getScenario, createSession, updateSession, getSession, getPreference, listSessions, startStandaloneSession } from '../services/sqlite';
import { Scenario, Session, ConversationMessage } from '../types';
import { ArrowLeft, Info, Volume2, VolumeX, AlertCircle, Square, Loader2 } from 'lucide-react';
import { EditorialVoiceVisualizer } from '../components/EditorialVoiceVisualizer';
import { ConversationLoadingSkeleton } from '../components/LoadingSkeleton';
import { useConversationTurn } from '../hooks/useConversationTurn';
import { EndReason } from '../turn/turnEngine';
import toast from 'react-hot-toast';

// The spoken-conversation orchestration (turn-taking, streaming, barge-in,
// replay, audio lifecycle) lives in the TurnEngine core behind
// useConversationTurn. This page is the thin view: it loads the scenario,
// owns the Session lifecycle, and renders the engine's snapshot.
export function ConversationPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get('sessionId');

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pttMode, setPttMode] = useState<'hold' | 'toggle'>('hold');
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const initialMessageSpokenRef = useRef(false);

  // Refs so the engine callbacks always see the latest values.
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsedTime;
  const messagesRef = useRef<ConversationMessage[]>([]);
  const completeRef = useRef(false);

  const wordsSpokenOf = (messages: ConversationMessage[]) =>
    messages.filter((m) => m.role === 'user').reduce((acc, m) => acc + m.content.split(' ').length, 0);

  const t = useConversationTurn({
    scenario,
    audioEnabled,
    saveTranscript: async (messages) => {
      if (sessionRef.current) await updateSession(sessionRef.current.id, { transcript: messages });
    },
    onComplete: async (reason: EndReason) => {
      if (reason === 'natural') toast.success('Great conversation! Session ending naturally.');
      if (sessionRef.current) {
        await updateSession(sessionRef.current.id, {
          status: 'ended',
          endTime: new Date().toISOString(),
          duration: elapsedRef.current,
          metadata: {
            naturalEnding: reason === 'natural',
            endReason: reason,
            wordsSpoken: wordsSpokenOf(messagesRef.current),
            encouragementShown: false,
          },
        }).catch((err) => console.error('Failed to finalise session:', err));
      }
    },
    onError: (message) => { toast.error(message); },
  });

  messagesRef.current = t.messages;
  completeRef.current = t.sessionComplete;

  // Load scenario.
  useEffect(() => {
    if (scenarioId) {
      initialMessageSpokenRef.current = false;
      void loadScenario();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  // Resume a session once the engine is ready (so seed/greet land). Re-runs if
  // the engine is recreated (e.g. StrictMode remount) to re-seed it; greet is
  // idempotent via initialMessageSpokenRef + the persisted transcript.
  useEffect(() => {
    if (resumeSessionId && scenario && t.ready) void resumeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId, scenario, t.ready]);

  // Elapsed-time ticker — paused while the session is paused or complete.
  // (Preserves the original behaviour of re-basing on each active phase.)
  useEffect(() => {
    if (t.phase !== 'not-started' && t.phase !== 'paused' && !t.sessionComplete) {
      startTimeRef.current = new Date();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000));
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [t.phase, t.sessionComplete]);

  // Auto-scroll the transcript to the latest message.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [t.messages.length]);

  // Load push-to-talk preference once on mount.
  useEffect(() => {
    getPreference('pttMode').then((v) => { if (v === 'toggle' || v === 'hold') setPttMode(v); });
  }, []);

  // Save the transcript on unmount as a safety net (per-turn saves cover the
  // happy path; this catches navigate-away). Audio teardown is handled by the
  // engine's dispose() inside the hook.
  useEffect(() => {
    return () => {
      if (sessionRef.current && messagesRef.current.length > 0 && !completeRef.current) {
        updateSession(sessionRef.current.id, {
          transcript: messagesRef.current,
          duration: elapsedRef.current,
        }).catch((err) => console.error('Failed to save transcript on unmount:', err));
      }
    };
  }, []);

  // Spacebar push-to-talk. Each branch resolves to a single engine verb.
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (showInfo || showEndModal || t.sessionComplete) return;
      if (isTypingTarget(ev.target)) return;
      if (t.phase === 'paused') return;

      // Escape silences whatever is making sound (replay or live AI).
      if (ev.code === 'Escape') {
        if (t.replayingMessageId || t.phase === 'speaking') {
          ev.preventDefault();
          t.abort();
        }
        return;
      }

      if (ev.code !== 'Space' || ev.repeat) return;

      // Barge-in: space while the AI is speaking cancels the turn and starts a
      // new recording in one gesture (beginListening is barge-in aware).
      if (t.phase === 'speaking') {
        ev.preventDefault();
        void t.beginListening();
        return;
      }

      if (pttMode === 'toggle') {
        if (t.phase === 'idle') { ev.preventDefault(); void t.beginListening(); }
        else if (t.phase === 'listening') { ev.preventDefault(); void t.endListening(); }
        return;
      }

      // Hold mode: key-down starts, key-up stops.
      if (t.phase !== 'idle') return;
      ev.preventDefault();
      void t.beginListening();
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space') return;
      if (isTypingTarget(ev.target)) return;
      if (pttMode === 'toggle') return;
      if (t.phase !== 'listening') return;
      ev.preventDefault();
      void t.endListening();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [t.phase, t.replayingMessageId, t.sessionComplete, showInfo, showEndModal, pttMode, t.abort, t.beginListening, t.endListening]);

  const loadScenario = async () => {
    if (!scenarioId) return;
    setLoading(true);
    try {
      const data = await getScenario(scenarioId);
      if (data) setScenario(data);
      else setError('Scenario not found');
    } catch (err) {
      console.error('Failed to load scenario:', err);
      setError('Failed to load scenario');
    } finally {
      setLoading(false);
    }
  };

  const resumeSession = async () => {
    try {
      const existing = await getSession(resumeSessionId!);
      if (!existing || existing.endTime) return;
      setSession(existing);
      sessionRef.current = existing;

      if (!existing.transcript || existing.transcript.length === 0) {
        if (scenario?.initialMessage && !initialMessageSpokenRef.current) {
          initialMessageSpokenRef.current = true;
          await t.greet(scenario.initialMessage);
        } else {
          t.markReady();
        }
      } else {
        t.seed(existing.transcript);
      }

      const startTime = existing.startTime ? new Date(existing.startTime) : new Date();
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      startTimeRef.current = startTime;
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  const startConversation = async () => {
    if (!scenario) return;
    try {
      const newSession = await createSession(scenario.id);
      setSession(newSession);
      sessionRef.current = newSession;
      toast.success('Session started! Begin speaking when ready.');
      if (scenario.initialMessage) await t.greet(scenario.initialMessage);
      else t.markReady();
    } catch (err) {
      console.error('Failed to start conversation:', err);
      toast.error('Failed to start conversation. Please try again.');
      setError('Failed to start conversation');
    }
  };

  const handleEndSession = () => {
    t.abort(); // freeze the talking AI while the user decides
    setShowEndModal(true);
  };

  const saveAndExitSession = async () => {
    t.abort();
    if (sessionRef.current) {
      await updateSession(sessionRef.current.id, {
        status: 'paused',
        duration: elapsedTime,
        metadata: {
          endReason: 'user_paused',
          wordsSpoken: wordsSpokenOf(t.messages),
        },
      }).catch((err) => console.error('Failed to save session:', err));
    }
    navigate('/sessions');
  };

  // Previous finished attempt at this Scenario — the completion screen
  // shows the delta so practising the same conversation feels like
  // progress, not repetition.
  const [lastAttempt, setLastAttempt] = useState<Session | null>(null);
  useEffect(() => {
    if (!t.sessionComplete || !scenarioId) return;
    listSessions(scenarioId)
      .then((all) => {
        const prev = all
          .filter((s) => s.status === 'ended' && s.id !== sessionRef.current?.id && s.startTime)
          .sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime())[0];
        setLastAttempt(prev || null);
      })
      .catch(() => setLastAttempt(null));
  }, [t.sessionComplete, scenarioId]);

  // Fresh Session for the same Scenario. A plain reload would reuse the
  // ended session's id from the URL and resume a finished session.
  const practiceAgain = async () => {
    if (!scenarioId) return;
    try {
      const next = await startStandaloneSession(scenarioId);
      window.location.hash = `/conversation/${scenarioId}?sessionId=${next.id}`;
      window.location.reload();
    } catch (err) {
      console.error('Failed to start new session:', err);
      toast.error('Could not start a new session.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <ConversationLoadingSkeleton />;
  }

  if (error || !scenario) {
    return (
      <div className="flex items-center justify-center h-full bg-paper">
        <div className="text-center max-w-md px-8">
          <AlertCircle size={32} strokeWidth={1.5} className="text-accent mx-auto mb-6" />
          <p className="font-sans text-2xl text-ink mb-6 leading-tight">
            {error || 'Scenario not found'}
          </p>
          <button
            onClick={() => navigate('/scenarios')}
            className="text-[0.95rem] text-ink hover:text-accent transition-colors border-b border-ink hover:border-accent pb-0.5"
          >
            Back to scenarios
          </button>
        </div>
      </div>
    );
  }

  if (t.sessionComplete) {
    const wordsSpoken = wordsSpokenOf(t.messages);
    const lastWords = lastAttempt?.metadata?.wordsSpoken;
    const lastDuration = lastAttempt?.duration;
    const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
    return (
      <div className="min-h-full bg-paper px-12 lg:px-20 py-16 animate-fadeIn">
        <div className="max-w-3xl">
          <div className="flex items-center mb-6">
            <span className="editorial-rule" aria-hidden="true" />
            <span className="text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted font-medium">
              Session complete
            </span>
          </div>

          <h1 className="font-sans text-ink font-medium leading-[0.95] tracking-display text-[clamp(2.5rem,5vw,4.25rem)] mb-10">
            A good<br />
            conversation.
          </h1>

          <p className="font-sans text-ink-muted text-[1.05rem] mb-12 max-w-[50ch] leading-relaxed">
            You just practiced <em className="font-sans italic text-ink">{scenario.name}</em>.
            Take the transcript with you, or begin another session.
          </p>

          <dl className="grid grid-cols-3 gap-10 max-w-2xl mb-14 border-t border-ink/10 pt-8">
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-quiet font-sans mb-2">
                Duration
              </dt>
              <dd className="font-sans text-3xl text-ink tabular-nums">
                {formatTime(elapsedTime)}
              </dd>
              {lastDuration != null && (
                <p className="mt-1 text-[0.75rem] text-ink-quiet font-sans tabular-nums">
                  last time {formatTime(lastDuration)}
                </p>
              )}
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-quiet font-sans mb-2">
                Messages
              </dt>
              <dd className="font-sans text-3xl text-ink tabular-nums">{t.messages.length}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-quiet font-sans mb-2">
                Words spoken
              </dt>
              <dd className="font-sans text-3xl text-ink tabular-nums">{wordsSpoken}</dd>
              {lastWords != null && (
                <p className={`mt-1 text-[0.75rem] font-sans tabular-nums ${wordsSpoken >= lastWords ? 'text-accent' : 'text-ink-quiet'}`}>
                  {signed(wordsSpoken - lastWords)} vs last time
                </p>
              )}
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {session && (
              <button
                onClick={() => navigate(`/analysis/${session.id}`)}
                className="btn-gradient px-8 py-3.5 text-[0.95rem]"
              >
                Read the analysis
              </button>
            )}
            <button
              onClick={practiceAgain}
              className="text-[0.95rem] text-ink hover:text-accent transition-colors border-b border-ink hover:border-accent pb-0.5"
            >
              Practice this again →
            </button>
            <button
              onClick={() => navigate('/sessions')}
              className="text-[0.95rem] text-ink-muted hover:text-accent transition-colors"
            >
              Session history
            </button>
          </div>
        </div>
      </div>
    );
  }

  // While replaying, drive the visualiser with the speaking ripples.
  const visualizerState = t.replayingMessageId
    ? 'speaking'
    : t.phase === 'not-started' || t.phase === 'paused'
    ? 'idle'
    : t.phase;
  const statusLabel = t.replayingMessageId
    ? 'replaying.'
    : t.phase === 'not-started'
    ? 'ready'
    : t.phase === 'paused'
    ? 'paused.'
    : t.phase === 'listening'
    ? 'listening.'
    : t.phase === 'thinking'
    ? 'thinking.'
    : t.phase === 'speaking'
    ? 'speaking.'
    : 'your turn.';

  const statusHint = t.replayingMessageId
    ? 'Esc or click stop to end the replay.'
    : t.phase === 'not-started'
    ? 'Press begin to start the session.'
    : t.phase === 'paused'
    ? 'Click Resume to continue.'
    : t.phase === 'listening'
    ? (pttMode === 'toggle' ? 'Tap space (or click below) to send.' : 'Release to stop — or let go of the space bar.')
    : t.phase === 'idle'
    ? (pttMode === 'toggle' ? 'Tap space to speak · Esc to silence the AI' : 'Hold space to speak · Esc to silence the AI')
    : t.phase === 'speaking'
    ? 'Esc to silence · space to interrupt and reply'
    : '';

  return (
    <div className="flex flex-col h-full bg-paper">
      {/* Header — hairline, editorial */}
      <header className="border-b border-ink/10 px-8 py-5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate('/scenarios')}
              className="p-1 text-ink-muted hover:text-accent transition-colors"
              aria-label="Back to scenarios"
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="font-sans text-[1.35rem] text-ink font-medium leading-tight tracking-display">
                {scenario.name}
              </h1>
              <p className="text-[0.72rem] uppercase tracking-[0.18em] text-ink-quiet font-sans mt-1">
                {scenario.category} · {scenario.difficulty}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="font-sans text-xl text-ink tabular-nums">
              {formatTime(elapsedTime)}
            </span>
            <button
              onClick={() => setShowInfo(true)}
              className="p-1 text-ink-muted hover:text-accent transition-colors"
              aria-label="Scenario info"
            >
              <Info size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-1 text-ink-muted hover:text-accent transition-colors"
              aria-label={audioEnabled ? 'Mute' : 'Unmute'}
            >
              {audioEnabled ? (
                <Volume2 size={18} strokeWidth={1.5} />
              ) : (
                <VolumeX size={18} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main — live transcript on the left, visualizer + controls on the right. */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 px-8 py-8 min-h-0 overflow-hidden">
        {/* Left: live transcript */}
        <div className="overflow-y-auto pr-4 hidden lg:block">
          {t.messages.length === 0 ? (
            <p className="text-ink-quiet font-sans italic text-center mt-12">
              The conversation will appear here as you speak.
            </p>
          ) : (
            <div className="space-y-6 pb-4">
              {t.messages.map((msg) => {
                const isReplaying = t.replayingMessageId === msg.id;
                const isSynthesizing = t.synthesizingForMsgId === msg.id;
                const showReplay = msg.role === 'assistant' && msg.content.trim().length > 0;
                return (
                  <div
                    key={msg.id}
                    className={isReplaying ? 'border-l-2 border-accent pl-3 -ml-3 transition-colors' : ''}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className={`text-[0.68rem] uppercase tracking-[0.18em] font-sans ${
                        msg.role === 'user' ? 'text-accent' : 'text-ink-quiet'
                      }`}>
                        {msg.role === 'user' ? 'you' : 'tutor'}
                      </p>
                      {showReplay && (
                        <button
                          onClick={() => void t.replay(msg.id)}
                          disabled={isSynthesizing}
                          className={`flex items-center gap-1 transition-colors disabled:opacity-60 disabled:cursor-wait ${
                            isReplaying || isSynthesizing
                              ? 'text-accent'
                              : 'text-ink-muted hover:text-accent'
                          }`}
                          aria-label={isReplaying ? 'Stop replay' : isSynthesizing ? 'Preparing replay' : 'Replay this message'}
                          title={isReplaying ? 'Stop replay' : isSynthesizing ? 'Preparing replay…' : 'Replay this message'}
                        >
                          {isReplaying ? (
                            <Square size={12} strokeWidth={2} fill="currentColor" />
                          ) : isSynthesizing ? (
                            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                          ) : (
                            <Volume2 size={14} strokeWidth={1.5} />
                          )}
                          <span className="text-[0.68rem] uppercase tracking-[0.18em] font-sans">
                            {isReplaying ? 'replaying' : isSynthesizing ? 'preparing' : 'replay'}
                          </span>
                        </button>
                      )}
                    </div>
                    <p className="text-ink leading-relaxed font-sans text-[0.95rem]">
                      {msg.content}
                    </p>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Right: visualizer, status, controls */}
        <div className="flex flex-col items-center justify-start pt-8 lg:pt-12">
          <div className="mb-10">
            <EditorialVoiceVisualizer
              state={visualizerState}
              amplitudeRef={t.amplitudeRef}
              size={280}
            />
          </div>

          {/* Status label + hint */}
          <div className="text-center mb-10 min-h-[4.5rem]">
            <p className="font-sans italic text-[2rem] text-ink leading-none mb-3 tracking-display">
              {statusLabel}
            </p>
            {statusHint && (
              <p className="text-[0.82rem] text-ink-muted font-sans">{statusHint}</p>
            )}
            {t.phase === 'speaking' && t.chunkProgress.total > 0 && (
              <p className="text-[0.72rem] text-ink-muted/70 font-sans mt-1 tabular-nums">
                {t.chunkProgress.current} of {t.chunkProgress.total}
              </p>
            )}
          </div>

          {/* Error Message */}
          {t.error && (
            <div className="mb-6 px-5 py-3 border-l-2 border-accent bg-paper-warm max-w-md">
              <p className="text-ink text-sm font-sans leading-relaxed">{t.error}</p>
            </div>
          )}

          {/* Primary action */}
          {t.phase === 'not-started' && !session ? (
            <button
              onClick={startConversation}
              className="btn-gradient px-10 py-4 text-[1rem]"
            >
              Begin the session
            </button>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <button
                onMouseDown={pttMode === 'toggle'
                  ? (t.phase === 'listening' ? () => void t.endListening() : () => void t.beginListening())
                  : () => void t.beginListening()}
                onMouseUp={pttMode === 'hold' ? () => void t.endListening() : undefined}
                onMouseLeave={pttMode === 'hold' ? () => void t.endListening() : undefined}
                onTouchStart={pttMode === 'toggle'
                  ? (t.phase === 'listening' ? () => void t.endListening() : () => void t.beginListening())
                  : () => void t.beginListening()}
                onTouchEnd={pttMode === 'hold' ? () => void t.endListening() : undefined}
                disabled={t.phase !== 'idle' && t.phase !== 'listening'}
                className={`px-10 py-4 text-[1rem] font-sans font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-30 ${
                  t.phase === 'listening'
                    ? 'bg-accent text-paper'
                    : t.phase === 'idle'
                    ? 'bg-ink text-paper hover:bg-accent'
                    : 'bg-ink/20 text-ink-muted'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {t.phase === 'listening'
                  ? (pttMode === 'toggle' ? 'Tap to send' : 'Release to stop')
                  : (pttMode === 'toggle' ? 'Tap to speak' : 'Hold to speak')}
              </button>

              <div className="flex items-center gap-6 text-[0.82rem] font-sans">
                <button
                  onClick={() => (t.phase === 'paused' ? t.resume() : t.pause())}
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  {t.phase === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <span className="text-ink/20" aria-hidden="true">·</span>
                <button
                  onClick={saveAndExitSession}
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  Save & exit
                </button>
                <span className="text-ink/20" aria-hidden="true">·</span>
                <button
                  onClick={handleEndSession}
                  className="text-ink-muted hover:text-accent transition-colors"
                >
                  End session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals — editorial */}
      {showInfo && (
        <div
          className="fixed inset-0 bg-ink/60 flex items-center justify-center p-6 z-50 animate-fadeIn"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-paper max-w-md w-full p-8 border border-ink/15"
            style={{ borderRadius: '2px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-5">
              <span className="editorial-rule" aria-hidden="true" />
              <span className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-muted font-sans">
                Scenario
              </span>
            </div>
            <h2 className="font-sans text-2xl text-ink font-medium mb-4 leading-tight tracking-display">
              {scenario.name}
            </h2>
            <p className="text-ink-muted text-[0.92rem] leading-relaxed mb-6 font-sans">
              {scenario.description}
            </p>
            <dl className="space-y-2 text-[0.82rem] font-sans text-ink-muted">
              <div className="flex gap-2">
                <dt className="uppercase tracking-[0.12em] text-ink-quiet">Difficulty</dt>
                <dd className="text-ink">{scenario.difficulty}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="uppercase tracking-[0.12em] text-ink-quiet">Duration</dt>
                <dd className="text-ink">~{scenario.estimatedMinutes} min</dd>
              </div>
              {scenario.tags && scenario.tags.length > 0 && (
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.12em] text-ink-quiet">Tags</dt>
                  <dd className="text-ink">{scenario.tags.join(', ')}</dd>
                </div>
              )}
            </dl>
            <button
              onClick={() => setShowInfo(false)}
              className="mt-8 text-[0.9rem] text-ink hover:text-accent transition-colors border-b border-ink hover:border-accent pb-0.5"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showEndModal && (
        <div
          className="fixed inset-0 bg-ink/60 flex items-center justify-center p-6 z-50 animate-fadeIn"
          onClick={() => setShowEndModal(false)}
        >
          <div
            className="bg-paper max-w-md w-full p-8 border border-ink/15"
            style={{ borderRadius: '2px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-sans text-2xl text-ink font-medium mb-4 leading-tight tracking-display">
              End this session?
            </h2>
            <p className="text-ink-muted text-[0.92rem] leading-relaxed mb-8 font-sans">
              Your transcript so far will be saved to the session history.
            </p>
            <div className="flex gap-6 items-center">
              <button
                onClick={() => t.end('user_ended')}
                className="btn-gradient px-6 py-3 text-[0.9rem]"
              >
                End session
              </button>
              <button
                onClick={() => setShowEndModal(false)}
                className="text-[0.9rem] text-ink-muted hover:text-ink transition-colors"
              >
                Keep talking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
