// Type definitions for Settings components
// Commercial-grade TypeScript interfaces for type safety

// 'embedded' is gone (phase 5): the offline built-in IS the in-app engine —
// wasm Whisper for Listening, piper for Voice. Old stored values migrate in
// main at startup.
export type STTProvider = 'wasm' | 'speaches';
export type TTSProvider = 'piper' | 'speaches';
export type ChatProvider = 'anthropic' | 'openai' | 'ollama' | 'groq' | 'gemini' | 'custom';
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