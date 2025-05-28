// Application configuration
export const config = {
  // API endpoints
  pocketbaseUrl: import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090',
  whisperUrl: import.meta.env.VITE_WHISPER_URL || 'http://localhost:8091',
  piperUrl: import.meta.env.VITE_PIPER_URL || 'http://localhost:8092',
  ollamaUrl: import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434',
  ollamaApiKey: import.meta.env.VITE_OLLAMA_API_KEY || '',
  ollamaModel: import.meta.env.VITE_OLLAMA_MODEL || 'granite3.2',
  ollamaMaxContext: parseInt(import.meta.env.VITE_OLLAMA_MAX_CONTEXT || '4096'),
  
  // Feature flags
  features: {
    saveTranscripts: true,
    trackMetrics: true,
    usePiperTTS: true, // Use Piper instead of browser TTS
  },
  
  // Audio settings
  audio: {
    speechRate: 0.9,
    recordingFormat: 'audio/webm',
  }
};