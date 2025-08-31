// Type definitions for Settings components
// Commercial-grade TypeScript interfaces for type safety

export type STTProvider = 'embedded' | 'speaches';
export type TTSProvider = 'embedded' | 'speaches';
export type ChatProvider = 'anthropic' | 'openai' | 'ollama' | 'groq' | 'custom';
export type PromptBehavior = 'enhance' | 'override' | 'scenario-only';

export interface STTSettings {
  provider: STTProvider;
  url: string;
  apiKey: string;
  model: string;
}

export interface TTSSettings {
  provider: TTSProvider;
  url: string;
  apiKey: string;
  model: string;
  voice: 'male' | 'female';
  speed: number;
}

export interface ChatSettings {
  provider: ChatProvider;
  url: string;
  apiKey: string;
  model: string;
}

export interface EmbeddedServerSettings {
  sttUrl: string;
  ttsUrl: string;
  speechSpeed: number;
  maleVoiceId: string;
  femaleVoiceId: string;
}

export interface PromptSettings {
  template: 'natural' | 'educational' | 'concise' | 'business' | 'supportive' | 'custom';
  customPrompt: string;
  behavior: PromptBehavior;
  includeResponseFormat: boolean;
  addModelOptimizations: boolean;
}

export interface AllSettings {
  stt: STTSettings;
  tts: TTSSettings;
  chat: ChatSettings;
  embedded: EmbeddedServerSettings;
  prompt: PromptSettings;
}

export interface ModelList {
  stt: string[];
  tts: string[];
  chat: string[];
}

export interface TestStatus {
  stt: boolean;
  tts: boolean;
  chat: boolean;
}

export interface TestResults {
  stt: string;
  tts: string;
  chat: string;
}

export interface LoadingState {
  stt: boolean;
  tts: boolean;
  chat: boolean;
}

export interface ModelErrors {
  stt: string;
  tts: string;
  chat: string;
}

export interface EmbeddedServerStatus {
  running: boolean;
  url: string;
  port: number;
}

export interface EmbeddedVoices {
  male: Array<{ id: number; name: string; gender: string }>;
  female: Array<{ id: number; name: string; gender: string }>;
  all: Array<{ id: number; name: string; gender: string }>;
}

// Model information interfaces
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ChatModelInfo extends ModelInfo {
  context_length?: number;
  provider?: string;
}

export interface TTSModelInfo extends ModelInfo {
  voice_count?: number;
  languages?: string[];
}

export interface STTModelInfo extends ModelInfo {
  languages?: string[];
  accuracy?: string;
}