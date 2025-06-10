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
  isPublic?: boolean;   // for backward compatibility
  voice?: 'male' | 'female';
  archived?: boolean;
  created: string;
  updated: string;
}

export interface SessionPack {
  id: string;
  packId: string; // reference to original Practice Pack template
  name: string; // copied from original pack at creation time
  description?: string; // copied from original pack
  color: string; // copied from original pack
  created: string;
  updated: string;
}

export interface SessionPackWithSessions extends SessionPack {
  sessions: Session[];
  sessionCount: number;
  completedSessions: number;
  activeSessions: number;
}

export interface Session {
  id: string;
  scenario: string; // scenario ID
  sessionPackId?: string; // NULL for standalone sessions
  packName?: string; // Name of the session pack (for display)
  startTime?: string; // NULL if not started yet
  endTime?: string;
  duration?: number;
  transcript?: ConversationMessage[];
  metadata?: SessionMetadata;
  status: 'not_started' | 'active' | 'paused' | 'ended';
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

export interface Pack {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes?: number;
  orderIndex: number;
  archived?: boolean;
  created: string;
  updated: string;
}

export interface PackWithScenarios extends Pack {
  scenarios: Scenario[];
  scenarioCount: number;
}

export interface PackScenario {
  packId: string;
  scenarioId: string;
  orderIndex: number;
  created: string;
}