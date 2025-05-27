import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationAvatar } from '../components/ConversationAvatar';
import { PushToTalkButton } from '../components/PushToTalkButton';
import { ScenarioInfoModal } from '../components/ScenarioInfoModal';
import { EncouragementModal } from '../components/EncouragementModal';
import { WhisperError } from '../components/WhisperError';
import type { ConversationState } from '../types/conversation';
import { getScenario, type Scenario } from '../services/pocketbase';
import { textToSpeech } from '../services/speech';
import { conversationService } from '../services/conversation';
import { whisperSTT } from '../services/whisper';

export function ConversationPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const [conversationState, setConversationState] = useState<ConversationState>('not-started');
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [showScenarioInfo, setShowScenarioInfo] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [whisperAvailable, setWhisperAvailable] = useState(false);
  const [showWhisperError, setShowWhisperError] = useState(false);
  const sessionStartRef = useRef<Date | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load scenario and initialize conversation
  useEffect(() => {
    if (scenarioId) {
      getScenario(scenarioId)
        .then((loadedScenario) => {
          setScenario(loadedScenario);
          conversationService.initialize(loadedScenario);
          
          // Check if Whisper server is available
          whisperSTT.checkHealth().then(isAvailable => {
            setWhisperAvailable(isAvailable);
            if (!isAvailable) {
              setShowWhisperError(true);
            }
          });
        })
        .catch(console.error);
    }
  }, [scenarioId]);

  // Session timer
  useEffect(() => {
    if (!sessionStartRef.current) {
      return; // Don't start timer until conversation begins
    }

    const interval = setInterval(() => {
      if (sessionStartRef.current) {
        const elapsed = Math.floor((new Date().getTime() - sessionStartRef.current.getTime()) / 1000);
        setSessionTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [conversationState]); // Re-run when conversation state changes

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update timer display
  useEffect(() => {
    const timerElement = document.getElementById('session-timer');
    if (timerElement) {
      timerElement.textContent = formatTime(sessionTime);
    }
  }, [sessionTime]);

  const startRecording = async () => {
    if (!whisperAvailable) {
      setShowWhisperError(true);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio recorded, size:', audioBlob.size);
        
        // Transcribe with Whisper
        try {
          console.log('=== MAIN RECORDING: Sending to Whisper ===');
          console.log('Audio blob size:', audioBlob.size);
          const transcript = await whisperSTT.transcribeAudio(audioBlob);
          console.log('Whisper transcript:', transcript);
          
          if (transcript && transcript.trim()) {
            console.log('Adding user message:', transcript);
            conversationService.addUserMessage(transcript);
            processUserInput();
          } else {
            console.log('No speech detected in recording');
            // No speech detected, go back to idle
            setConversationState('idle');
          }
        } catch (error) {
          console.error('Whisper transcription failed:', error);
          alert('Failed to transcribe audio. Please try again.');
          setConversationState('idle');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setConversationState('listening');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to use this feature.');
    }
  };

  const stopRecording = () => {
    console.log('=== STOP RECORDING CALLED ===');
    console.log('isRecording:', isRecording);
    console.log('mediaRecorder state:', mediaRecorderRef.current?.state);
    
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Stopping media recorder...');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setConversationState('thinking');
    } else {
      console.log('No active recording to stop');
    }
  };

  const processUserInput = async () => {
    try {
      // Get the last user message
      const transcript = conversationService.getTranscript();
      const lastUserMessage = transcript.filter(m => m.role === 'user').pop();
      
      if (!lastUserMessage) {
        setConversationState('idle');
        return;
      }

      // Get AI response
      const aiResponse = await conversationService.getAIResponse(lastUserMessage.content);
      
      // Speak the response
      setConversationState('speaking');
      await textToSpeech.speak(
        aiResponse,
        () => setConversationState('idle'),
        (error) => {
          console.error('TTS error:', error);
          setConversationState('idle');
        }
      );
    } catch (error) {
      console.error('Error processing conversation:', error);
      setConversationState('idle');
    }
  };

  const getButtonState = () => {
    if (conversationState === 'not-started' || conversationState === 'thinking' || conversationState === 'speaking') {
      return 'disabled';
    }
    return isRecording ? 'recording' : 'idle';
  };
  
  const handleStartConversation = () => {
    console.log('Starting conversation, scenario:', scenario);
    
    // Start the session timer
    sessionStartRef.current = new Date();
    
    if (scenario?.initialMessage) {
      setConversationState('speaking');
      
      // Small delay to ensure user interaction is registered
      setTimeout(async () => {
        try {
          await textToSpeech.speak(
            scenario.initialMessage,
            () => {
              console.log('TTS finished speaking');
              setConversationState('idle');
            },
            (error) => {
              console.error('TTS error:', error);
              alert('Text-to-speech failed. The AI said: "' + scenario.initialMessage + '"');
              setConversationState('idle');
            }
          );
        } catch (error) {
          console.error('TTS error:', error);
          setConversationState('idle');
        }
      }, 100);
    } else {
      setConversationState('idle');
    }
  };
  
  const handleEndSession = () => {
    if (confirm('Are you sure you want to end this session?')) {
      // Stop any ongoing speech
      textToSpeech.stop();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      // TODO: Save session data to PocketBase
      const transcript = conversationService.getTranscript();
      console.log('Session transcript:', transcript);
      
      conversationService.clear();
      navigate('/');
    }
  };

  return (
    <>
      <ConversationAvatar 
        state={conversationState} 
        scenario={scenario}
        onInfoClick={() => setShowScenarioInfo(true)}
        onEndSession={handleEndSession}
        onStartConversation={handleStartConversation}
      />
      
      {/* Support Button */}
      <div className="fixed bottom-32 right-4">
        <button
          onClick={() => setShowEncouragement(true)}
          className="bg-white/90 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Nervous?
        </button>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0">
        <PushToTalkButton
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          state={getButtonState()}
          disabled={conversationState === 'not-started' || conversationState === 'thinking' || conversationState === 'speaking'}
        />
      </div>
      
      {scenario && (
        <ScenarioInfoModal
          scenario={scenario}
          isOpen={showScenarioInfo}
          onClose={() => setShowScenarioInfo(false)}
        />
      )}
      
      <EncouragementModal
        isOpen={showEncouragement}
        onClose={() => setShowEncouragement(false)}
      />
      
      <WhisperError
        isOpen={showWhisperError}
        onClose={() => setShowWhisperError(false)}
      />
      
      {/* STT Debugger - uncomment to debug Whisper */}
      {/* <STTDebugger /> */}
    </>
  );
}