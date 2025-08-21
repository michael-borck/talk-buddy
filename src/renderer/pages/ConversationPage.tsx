import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getScenario, createSession, updateSession, getSession } from '../services/sqlite';
import { transcribeAudio, generateSpeech } from '../services/speechProvider';
import { generateResponse } from '../services/chat';
import { Scenario, Session, ConversationMessage } from '../types';
import { ArrowLeft, Info, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { VoiceWaveAnimation } from '../components/VoiceWaveAnimation';
import { ModernVoiceVisualizer } from '../components/ModernVoiceVisualizer';
import { ConversationLoadingSkeleton } from '../components/LoadingSkeleton';
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
        const startTime = new Date(existingSession.startTime);
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
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
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
      // Prevent overlapping speech - if already speaking, stop current audio
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
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
      audioRef.current = new Audio(audioUrl);
      
      // Set speaking state when audio actually starts
      audioRef.current.onplay = () => {
        setConversationState('speaking');
      };
      
      // Keep speaking state throughout playback
      audioRef.current.onended = () => {
        setConversationState('idle');
        URL.revokeObjectURL(audioUrl);
      };
      
      audioRef.current.onerror = () => {
        console.error('Audio playback error');
        setConversationState('idle');
      };
      
      // Play audio - this will block until play() starts
      await audioRef.current.play();
      // Audio is now playing, animation continues until onended fires
    } catch (err) {
      console.error('Failed to speak text:', err);
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

  const handleEndSession = () => {
    setShowEndModal(true);
  };

  const pauseSession = async () => {
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 mb-4">{error || 'Scenario not found'}</p>
          <button
            onClick={() => navigate('/scenarios')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Scenarios
          </button>
        </div>
      </div>
    );
  }

  // Session complete state with celebration
  if (sessionComplete) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-fadeIn">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-float">🎉</div>
            <h2 className="text-3xl font-bold gradient-text mb-2">Congratulations!</h2>
            <p className="text-xl text-gray-700">Session Complete</p>
          </div>
          <p className="text-gray-600 mb-8 text-lg">
            Excellent practice with <span className="font-semibold">"{scenario.name}"</span>
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
              <p className="text-sm text-gray-600 mb-1">Duration</p>
              <p className="text-2xl font-bold gradient-text">{formatTime(elapsedTime)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-gray-600 mb-1">Messages</p>
              <p className="text-2xl font-bold gradient-text">{messages.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <p className="text-sm text-gray-600 mb-1">Words Spoken</p>
              <p className="text-2xl font-bold gradient-text">
                {messages.filter(m => m.role === 'user').reduce((acc, m) => acc + m.content.split(' ').length, 0)}
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            {session && (
              <button
                onClick={() => navigate(`/analysis/${session.id}`)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transform transition-all hover:scale-105 font-medium"
              >
                📊 View Analysis
              </button>
            )}
            <button
              onClick={() => navigate('/sessions')}
              className="px-6 py-3 glass-card text-gray-700 rounded-xl hover:bg-white/90 transform transition-all hover:scale-105 font-medium"
            >
              📚 Session History
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-gradient px-6 py-3 text-white rounded-xl hover:shadow-lg transform transition-all hover:scale-105 font-medium"
            >
              🔄 Practice Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/scenarios')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{scenario.name}</h1>
              <p className="text-sm text-gray-600">{scenario.category} • {scenario.difficulty}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium text-gray-700">{formatTime(elapsedTime)}</span>
            <button
              onClick={() => setShowInfo(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Info size={20} />
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          {/* Modern Voice Visualizer */}
          <div className="mb-8">
            <div className="relative w-80 h-80 mx-auto">
              <ModernVoiceVisualizer 
                state={conversationState === 'not-started' ? 'idle' : conversationState}
              />
            </div>
          </div>

          {/* Status Text with enhanced styling */}
          <div className="mb-8">
            <p className="text-xl font-medium mb-2">
              <span className={`${
                conversationState === 'listening' ? 'text-red-500' :
                conversationState === 'thinking' ? 'text-yellow-600' :
                conversationState === 'speaking' ? 'gradient-text' :
                'text-gray-700'
              }`}>
                {conversationState === 'not-started' ? 'Ready to start practicing?' :
                 conversationState === 'listening' ? '🎤 Listening...' :
                 conversationState === 'thinking' ? '🤔 Processing...' :
                 conversationState === 'speaking' ? '🗣️ AI is speaking' :
                 '✨ Your turn to speak'}
              </span>
            </p>
            {conversationState === 'listening' && (
              <p className="text-sm text-gray-500 animate-pulse">Release button to stop recording</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons with enhanced styling */}
          {conversationState === 'not-started' && !session ? (
            <button
              onClick={startConversation}
              className="btn-gradient px-10 py-5 rounded-xl text-white text-lg font-semibold shadow-lg transform transition-all hover:scale-105"
            >
              Start Conversation
            </button>
          ) : (
            <div className="space-y-4">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={conversationState !== 'idle' && conversationState !== 'listening'}
                className={`px-10 py-5 rounded-xl text-lg font-semibold transition-all transform ${
                  conversationState === 'listening' 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white scale-110 shadow-2xl animate-pulse' 
                    : conversationState === 'idle'
                    ? 'btn-gradient text-white hover:scale-105 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                {conversationState === 'listening' ? '🔴 Release to Stop' : '🎤 Hold to Speak'}
              </button>
              
              <div className="mt-6 space-x-4">
                <button
                  onClick={pauseSession}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Pause Session
                </button>
                <button
                  onClick={handleEndSession}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  End Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Scenario Information</h2>
            <p className="text-gray-600 mb-4">{scenario.description}</p>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Difficulty:</strong> {scenario.difficulty}</p>
              <p><strong>Estimated Duration:</strong> {scenario.estimatedMinutes} minutes</p>
              {scenario.tags && scenario.tags.length > 0 && (
                <p><strong>Tags:</strong> {scenario.tags.join(', ')}</p>
              )}
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">End Session?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to end this practice session?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Continue
              </button>
              <button
                onClick={() => completeSession('user_ended')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}