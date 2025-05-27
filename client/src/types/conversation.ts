export type ConversationState = 'not-started' | 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  duration?: number;
}

export interface ConversationSession {
  id: string;
  scenarioId: string;
  startTime: Date;
  endTime?: Date;
  messages: Message[];
  state: ConversationState;
}