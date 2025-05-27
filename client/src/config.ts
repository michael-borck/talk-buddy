// Application configuration
export const config = {
  // API endpoints
  pocketbaseUrl: import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090',
  whisperUrl: import.meta.env.VITE_WHISPER_URL || 'http://localhost:8091',
  
  // Feature flags
  features: {
    saveTranscripts: true,
    trackMetrics: true,
  },
  
  // Audio settings
  audio: {
    speechRate: 0.9,
    recordingFormat: 'audio/webm',
  }
};