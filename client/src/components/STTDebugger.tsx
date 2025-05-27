import { useState, useRef } from 'react';
import { whisperSTT } from '../services/whisper';

export function STTDebugger() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      setDebugInfo('Starting recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
        setDebugInfo(prev => prev + `\nChunk received: ${event.data.size} bytes`);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setDebugInfo(prev => prev + `\nTotal audio size: ${audioBlob.size} bytes`);
        
        // Test Whisper
        try {
          setDebugInfo(prev => prev + '\nSending to Whisper...');
          const result = await whisperSTT.transcribeAudio(audioBlob);
          setTranscript(result);
          setDebugInfo(prev => prev + `\nTranscript: "${result}"`);
        } catch (err: any) {
          setError(err.message);
          setDebugInfo(prev => prev + `\nError: ${err.message}`);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDebugInfo(prev => prev + '\nRecording started - SPEAK NOW!');
    } catch (err: any) {
      setError(err.message);
      setDebugInfo(prev => prev + `\nStart error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    console.log('Stop recording clicked, mediaRecorder:', mediaRecorderRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setDebugInfo(prev => prev + '\nRecording stopped - processing...');
    } else {
      setDebugInfo(prev => prev + '\nNo active recording to stop!');
    }
  };

  const testWhisperHealth = async () => {
    try {
      const healthy = await whisperSTT.checkHealth();
      setDebugInfo(`Whisper health check: ${healthy ? 'OK' : 'FAILED'}`);
    } catch (err: any) {
      setDebugInfo(`Health check error: ${err.message}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-md border-2 border-gray-300">
      <h3 className="font-bold mb-2 text-lg">🔧 STT Debugger (Testing Only)</h3>
      <div className="text-xs text-gray-600 mb-3 space-y-1">
        <p className="font-bold text-red-600">⚠️ This is SEPARATE from the main mic button!</p>
        <p>Main button = HOLD to talk (press & hold, release to stop)</p>
        <p>This debugger = CLICK to start, CLICK to stop</p>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={testWhisperHealth}
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          1. Test Whisper Connection
        </button>
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded w-full font-bold ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          } text-white`}
        >
          {isRecording ? '⏹ CLICK TO STOP' : '🎤 2. Start Recording'}
        </button>
        
        {isRecording && (
          <div className="text-center text-red-600 font-bold animate-pulse">
            🔴 RECORDING - SPEAK NOW!
          </div>
        )}
      </div>

      {transcript && (
        <div className="mt-4 p-2 bg-green-100 rounded">
          <strong>Transcript:</strong> {transcript}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-2 bg-red-100 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
        <strong>Debug:</strong>
        <pre className="whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
}