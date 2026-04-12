import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getScenario, createSession, updateSession, getSession, getPreference } from '../services/sqlite';
import { transcribeAudio, generateSpeech } from '../services/speechProvider';
import { generateResponse } from '../services/chat';
import { Scenario, Session, ConversationMessage } from '../types';
import { ArrowLeft, Info, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { EditorialVoiceVisualizer } from '../components/EditorialVoiceVisualizer';
import { ConversationLoadingSkeleton } from '../components/LoadingSkeleton';
import { playYourTurnCue, CueStyle } from '../services/audioCues';
import toast from 'react-hot-toast';

type ConversationState = 'not-started' | 'idle' | 'listening' | 'thinking' | 'speaking';

export function ConversationPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get('sessionId');
  
  // State
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>('not-started');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<number[] | undefined>();
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialMessageSpokenRef = useRef<boolean>(false);

  // Audio analyser refs — fed into the visualizer so motion responds
  // to the real signal instead of procedural sine waves.
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const amplitudeRef = useRef<number>(0);
  const amplitudeRafRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Load scenario
  useEffect(() => {
    if (scenarioId) {
      // Reset the spoken flag when scenario changes
      initialMessageSpokenRef.current = false;
      loadScenario();
    }
  }, [scenarioId]);
  
  // Resume session if provided
  useEffect(() => {
    if (resumeSessionId && scenario) {
      resumeSession();
    }
  }, [resumeSessionId, scenario]);

  // Timer
  useEffect(() => {
    if (conversationState !== 'not-started' && !sessionComplete) {
      startTimeRef.current = new Date();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [conversationState, sessionComplete]);
  
  // Save transcript on unmount if session exists
  useEffect(() => {
    return () => {
      // Cleanup function runs on unmount
      if (session && messages.length > 0 && !sessionComplete) {
        // Save current transcript state
        updateSession(session.id, {
          transcript: messages,
          duration: elapsedTime
        }).catch(err => console.error('Failed to save transcript on unmount:', err));
      }
    };
  }, [session, messages, elapsedTime, sessionComplete]);

  // Audio-analyser teardown on unmount — release any dangling nodes.
  useEffect(() => {
    return () => {
      stopAmplitudeLoop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spacebar push-to-talk. Guards: no text-input focus, no open modals,
  // no key-repeat storms, and only fires when the session is in a state
  // where speaking makes sense.
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || ev.repeat) return;
      if (showInfo || showEndModal || sessionComplete) return;
      if (isTypingTarget(ev.target)) return;
      if (conversationState !== 'idle') return;
      ev.preventDefault();
      void startRecording();
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space') return;
      if (isTypingTarget(ev.target)) return;
      if (conversationState !== 'listening') return;
      ev.preventDefault();
      stopRecording();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationState, showInfo, showEndModal, sessionComplete]);

  // --- Audio analyser helpers ----------------------------------------------

  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new Ctor();
    }
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const startAmplitudeLoop = () => {
    if (amplitudeRafRef.current !== null) return;
    const buffer = new Uint8Array(128);
    const tick = () => {
      const analyser = activeAnalyserRef.current;
      if (analyser) {
        analyser.getByteFrequencyData(buffer);
        // Mean of low-mid bins (speech range sits in the lower half).
        let sum = 0;
        const limit = Math.min(64, buffer.length);
        for (let i = 0; i < limit; i++) sum += buffer[i];
        const mean = sum / limit / 255; // 0..1
        // Light smoothing so the visual doesn't jitter.
        amplitudeRef.current = amplitudeRef.current * 0.6 + mean * 0.4;
      } else {
        amplitudeRef.current = amplitudeRef.current * 0.85;
      }
      amplitudeRafRef.current = requestAnimationFrame(tick);
    };
    amplitudeRafRef.current = requestAnimationFrame(tick);
  };

  const stopAmplitudeLoop = () => {
    if (amplitudeRafRef.current !== null) {
      cancelAnimationFrame(amplitudeRafRef.current);
      amplitudeRafRef.current = null;
    }
    amplitudeRef.current = 0;
  };

  const setupMicAnalyser = (stream: MediaStream) => {
    try {
      const audioContext = getAudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      activeAnalyserRef.current = analyser;
      startAmplitudeLoop();
    } catch (err) {
      console.warn('Mic analyser setup failed:', err);
    }
  };

  const teardownMicAnalyser = () => {
    activeAnalyserRef.current = null;
    stopAmplitudeLoop();
  };

  const setupTtsAnalyser = (audio: HTMLAudioElement) => {
    try {
      const audioContext = getAudioContext();
      // createMediaElementSource can only be called once per element. Since
      // we create a fresh <audio> for every utterance this is fine.
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      ttsSourceRef.current = source;
      activeAnalyserRef.current = analyser;
      startAmplitudeLoop();
    } catch (err) {
      console.warn('TTS analyser setup failed:', err);
    }
  };

  const teardownTtsAnalyser = () => {
    activeAnalyserRef.current = null;
    ttsSourceRef.current = null;
    stopAmplitudeLoop();
  };

  const loadScenario = async () => {
    if (!scenarioId) return;
    
    setLoading(true);
    try {
      const data = await getScenario(scenarioId);
      if (data) {
        setScenario(data);
      } else {
        setError('Scenario not found');
      }
    } catch (err) {
      console.error('Failed to load scenario:', err);
      setError('Failed to load scenario');
    } finally {
      setLoading(false);
    }
  };

  const resumeSession = async () => {
    try {
      const existingSession = await getSession(resumeSessionId!);
      if (existingSession && !existingSession.endTime) {
        setSession(existingSession);
        
        // Check if this is a brand new session (no transcript yet)
        if (!existingSession.transcript || existingSession.transcript.length === 0) {
          // This is a new session, add initial message if scenario has one
          if (scenario?.initialMessage && !initialMessageSpokenRef.current) {
            initialMessageSpokenRef.current = true;
            
            const initialMsg: ConversationMessage = {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: scenario.initialMessage,
              timestamp: new Date().toISOString()
            };
            setMessages([initialMsg]);
            
            // Save initial transcript
            await updateSession(existingSession.id, {
              transcript: [initialMsg]
            });
            
            // Speak initial message
            if (audioEnabled) {
              await speakText(scenario.initialMessage, true);
            } else {
              setConversationState('idle');
            }
          } else {
            setConversationState('idle');
          }
        } else {
          // Load existing transcript for resumed sessions
          setMessages(existingSession.transcript);
          setConversationState('idle');
        }
        
        // Calculate elapsed time from start
        const startTime = existingSession.startTime ? new Date(existingSession.startTime) : new Date();
        const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
        startTimeRef.current = startTime;
      }
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  const startConversation = async () => {
    if (!scenario) return;
    
    try {
      // Create session
      const newSession = await createSession(scenario.id);
      setSession(newSession);
      
      toast.success('Session started! Begin speaking when ready.');
      
      // Add initial message if provided
      if (scenario.initialMessage) {
        const initialMsg: ConversationMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: scenario.initialMessage,
          timestamp: new Date().toISOString()
        };
        setMessages([initialMsg]);
        
        // Save initial transcript
        await updateSession(newSession.id, {
          transcript: [initialMsg]
        });
        
        // Speak initial message
        if (audioEnabled) {
          await speakText(scenario.initialMessage, true);
        } else {
          setConversationState('idle');
        }
      } else {
        setConversationState('idle');
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
      toast.error('Failed to start conversation. Please try again.');
      setError('Failed to start conversation');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        teardownMicAnalyser();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setupMicAnalyser(stream);
      setConversationState('listening');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setConversationState('thinking');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Transcribe audio
      const result = await transcribeAudio(audioBlob);
      
      if (!result.text.trim()) {
        setConversationState('idle');
        return;
      }
      
      // Add user message
      const userMsg: ConversationMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: result.text,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);
      
      // Generate AI response
      const allMessages = [...messages, userMsg];
      const { response, context } = await generateResponse(
        allMessages,
        scenario?.systemPrompt,
        contextRef.current
      );
      
      contextRef.current = context;
      
      // Add AI message
      const aiMsg: ConversationMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
      
      // Update session with transcript
      if (session) {
        await updateSession(session.id, {
          transcript: [...allMessages, aiMsg]
        });
      }
      
      // Check for natural ending
      if (checkForNaturalEnding(response)) {
        toast.success('Great conversation! Session ending naturally.');
        await completeSession('natural');
      } else {
        // Speak response
        if (audioEnabled) {
          // We're already in 'thinking' state, now transition to speaking
          setConversationState('speaking');
          await speakText(response, false);
        } else {
          setConversationState('idle');
        }
      }
    } catch (err) {
      console.error('Failed to process audio:', err);
      toast.error('Speech processing failed. Check your STT settings.');
      setError('Speech-to-text failed. The STT server may not have models loaded. Consider using Web Speech API in settings.');
      setConversationState('idle');
      setTimeout(() => setError(null), 5000);
    }
  };

  const speakText = async (text: string, isInitialGreeting: boolean = false) => {
    try {
      // Aggressive pre-flight teardown. A prior Audio may still exist
      // (race: onended hasn't fired yet, or the element is mid-decode),
      // and we absolutely must not overlap voices. stopSpeaking() also
      // nulls out the onended handler so any in-flight cleanup can't
      // come back and fire the turn cue for audio we're about to
      // replace.
      stopSpeaking();

      // For initial greetings, show thinking state while generating audio
      // For responses, we're already in speaking state from processAudio
      if (isInitialGreeting) {
        setConversationState('thinking');
      }

      const audioBlob = await generateSpeech({
        text,
        voice: scenario?.voice
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setupTtsAnalyser(audio);

      // Set speaking state when audio actually starts
      audio.onplay = () => {
        setConversationState('speaking');
      };

      // Playback finished — tear down the analyser, play the cue, return to idle.
      audio.onended = async () => {
        teardownTtsAnalyser();
        URL.revokeObjectURL(audioUrl);
        setConversationState('idle');

        if (audioEnabled) {
          try {
            const style = ((await getPreference('conversationCue')) as CueStyle | null) || 'rise';
            playYourTurnCue(style);
          } catch (err) {
            console.warn('Failed to play turn cue:', err);
          }
        }
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        teardownTtsAnalyser();
        setConversationState('idle');
      };

      // Play audio - this will block until play() starts
      await audio.play();
      // Audio is now playing, animation continues until onended fires
    } catch (err) {
      console.error('Failed to speak text:', err);
      teardownTtsAnalyser();
      setConversationState('idle');
    }
  };

  const checkForNaturalEnding = (response: string): boolean => {
    const endingPhrases = [
      'goodbye', 'bye bye', 'have a nice day', 'take care', 
      'see you later', 'thank you for coming', 'thanks for calling',
      'have a great day', 'have a great evening', 'have a wonderful day'
    ];
    
    const strictEndingPhrases = [
      'is there anything else i can help you with today',
      'anything else i can help you with',
      'will that be all for today'
    ];
    
    const lowerResponse = response.toLowerCase();
    
    // Check for strict phrases that need more context
    const hasStrictEnding = strictEndingPhrases.some(phrase => lowerResponse.includes(phrase));
    
    // Check for definite goodbye phrases
    const hasGoodbye = endingPhrases.some(phrase => lowerResponse.includes(phrase));
    
    // Only end if we have a clear goodbye or a strict ending phrase with sufficient conversation
    return hasGoodbye || (hasStrictEnding && messages.length > 4);
  };

  // Immediately silences any TTS audio currently playing, releases the
  // analyser, and clears event handlers so stale onended callbacks
  // from a half-played utterance can't flip state back to idle or fire
  // the turn cue after the session is over.
  const stopSpeaking = () => {
    if (audioRef.current) {
      try {
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
      } catch { /* ignore */ }
      audioRef.current = null;
    }
    teardownTtsAnalyser();
  };

  const handleEndSession = () => {
    // Freeze the talking AI the moment the user opens the end-session
    // modal — otherwise the voice keeps going while the user is trying
    // to decide, which is disorienting.
    stopSpeaking();
    setShowEndModal(true);
  };

  const pauseSession = async () => {
    stopSpeaking();
    if (session) {
      await updateSession(session.id, {
        status: 'paused',
        duration: elapsedTime,
        metadata: {
          endReason: 'user_paused',
          wordsSpoken: messages.filter(m => m.role === 'user').reduce((acc, m) => acc + m.content.split(' ').length, 0)
        }
      });
    }
    navigate('/sessions');
  };

  const completeSession = async (reason: 'natural' | 'user_ended' = 'user_ended') => {
    // Defensive: if the user skipped the modal path (e.g. natural end),
    // still make sure nothing is talking.
    stopSpeaking();
    if (session) {
      await updateSession(session.id, {
        status: 'ended',
        endTime: new Date().toISOString(),
        duration: elapsedTime,
        metadata: {
          naturalEnding: reason === 'natural',
          endReason: reason,
          wordsSpoken: messages.filter(m => m.role === 'user').reduce((acc, m) => acc + m.content.split(' ').length, 0),
          encouragementShown: false
        }
      });
    }
    setSessionComplete(true);
    setConversationState('not-started');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state with professional skeleton
  if (loading) {
    return <ConversationLoadingSkeleton />;
  }

  // Error state
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

  // Session complete state — editorial summary
  if (sessionComplete) {
    const wordsSpoken = messages
      .filter((m) => m.role === 'user')
      .reduce((acc, m) => acc + m.content.split(' ').length, 0);
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
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-quiet font-sans mb-2">
                Messages
              </dt>
              <dd className="font-sans text-3xl text-ink tabular-nums">{messages.length}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-quiet font-sans mb-2">
                Words spoken
              </dt>
              <dd className="font-sans text-3xl text-ink tabular-nums">{wordsSpoken}</dd>
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
              onClick={() => window.location.reload()}
              className="text-[0.95rem] text-ink hover:text-accent transition-colors border-b border-ink hover:border-accent pb-0.5"
            >
              Begin another session →
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

  const visualizerState = conversationState === 'not-started' ? 'idle' : conversationState;
  const statusLabel =
    conversationState === 'not-started'
      ? 'ready'
      : conversationState === 'listening'
      ? 'listening.'
      : conversationState === 'thinking'
      ? 'thinking.'
      : conversationState === 'speaking'
      ? 'speaking.'
      : 'your turn.';

  const statusHint =
    conversationState === 'not-started'
      ? 'Press begin to start the session.'
      : conversationState === 'listening'
      ? 'Release to stop — or let go of the space bar.'
      : conversationState === 'idle'
      ? 'Hold the space bar, or press and hold the button to speak.'
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

      {/* Main — centered visualizer, editorial status, restrained button */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="flex flex-col items-center max-w-xl">
          <div className="mb-10">
            <EditorialVoiceVisualizer
              state={visualizerState}
              amplitudeRef={amplitudeRef}
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 px-5 py-3 border-l-2 border-accent bg-paper-warm max-w-md">
              <p className="text-ink text-sm font-sans leading-relaxed">{error}</p>
            </div>
          )}

          {/* Primary action */}
          {conversationState === 'not-started' && !session ? (
            <button
              onClick={startConversation}
              className="btn-gradient px-10 py-4 text-[1rem]"
            >
              Begin the session
            </button>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={conversationState !== 'idle' && conversationState !== 'listening'}
                className={`px-10 py-4 text-[1rem] font-sans font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-30 ${
                  conversationState === 'listening'
                    ? 'bg-accent text-paper'
                    : conversationState === 'idle'
                    ? 'bg-ink text-paper hover:bg-accent'
                    : 'bg-ink/20 text-ink-muted'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {conversationState === 'listening' ? 'Release to stop' : 'Hold to speak'}
              </button>

              <div className="flex items-center gap-6 text-[0.82rem] font-sans">
                <button
                  onClick={pauseSession}
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  Pause
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
                onClick={() => completeSession('user_ended')}
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