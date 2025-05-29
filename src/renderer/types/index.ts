export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  systemPrompt: string;
  initialMessage: string;
  tags: string[];
  isDefault?: boolean;  // true for default scenarios, false/undefined for custom
  voice?: 'male' | 'female';
  created: string;
  updated: string;
}

export interface Session {
  id: string;
  scenario: string; // scenario ID
  startTime: string;
  endTime?: string;
  duration?: number;
  transcript?: ConversationMessage[];
  metadata?: SessionMetadata;
  created: string;
  updated: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audioUrl?: string;
}

export interface SessionMetadata {
  wordsSpoken?: number;
  speakingDuration?: number;
  silenceDuration?: number;
  averageResponseTime?: number;
  encouragementShown?: boolean;
  naturalEnding?: boolean;
  endReason?: 'natural' | 'user_ended' | 'timeout' | 'error';
}

export interface UserPreferences {
  speachesUrl: string;
  ollamaUrl: string;
  ollamaModel: string;
  voice: 'male' | 'female';
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

export interface SpeechGenerationOptions {
  text: string;
  voice?: 'male' | 'female';
  speed?: number;
}