// Shared state for the Settings tabs.
//
// The tabs used to live inline in one 1,865-line component and each read
// the same preferences object, provider-switch handler, connection tester,
// and model loader out of its closure. Extracting them as components meant
// threading ~12 values through props; a context keeps each tab file
// self-contained while the page stays the single owner of the state.
//
// SettingsPage owns the state and passes it in — nothing here holds state
// of its own, so there is exactly one source of truth.
import { createContext, useContext, Dispatch, SetStateAction } from 'react';

export type ServiceType = 'stt' | 'tts' | 'chat';

export interface SettingsPreferences {
  sttUrl: string;
  ttsUrl: string;
  sttProvider: 'wasm' | 'speaches';
  ttsProvider: 'piper' | 'speaches';
  chatProvider: 'anthropic' | 'openai' | 'ollama' | 'groq' | 'gemini' | 'custom';
  embeddedSpeechSpeed: string;
  sttApiKey: string;
  ttsApiKey: string;
  ollamaUrl: string;
  ollamaApiKey: string;
  ollamaModel: string;
  voice: 'male' | 'female';
  sttModel: string;
  ttsModel: string;
  maleTTSModel: string;
  femaleTTSModel: string;
  maleVoice: string;
  femaleVoice: string;
  ttsSpeed: string;
  conversationCue: 'rise' | 'click' | 'none';
  inputMode: 'hands-free' | 'ptt';
  pttMode: 'hold' | 'toggle';
  theme: 'light' | 'dark' | 'system';
  promptTemplate: string;
  customPrompt: string;
  promptBehavior: 'enhance' | 'override' | 'scenario-only';
  includeResponseFormat: boolean;
  addModelOptimizations: boolean;
}

export interface SettingsContextValue {
  preferences: SettingsPreferences;
  setPreferences: Dispatch<SetStateAction<SettingsPreferences>>;
  /** Pending/succeeded connection tests, per service. */
  testing: Record<ServiceType, boolean>;
  testResults: Record<ServiceType, string>;
  models: Record<ServiceType, string[]>;
  loadingModels: Record<ServiceType, boolean>;
  modelErrors: Record<ServiceType, string>;
  testService: (serviceType: ServiceType) => Promise<void>;
  fetchModels: (serviceType: ServiceType) => Promise<void>;
  handleProviderChange: (
    field: 'sttProvider' | 'ttsProvider',
    value: 'wasm' | 'piper' | 'speaches'
  ) => void;
  /** True once the in-page save has completed (drives the Save button). */
  saving: boolean;
  savePreferences: () => Promise<void>;
  /** Data-management actions, used by the Your Data tab. */
  exportData: () => Promise<void>;
  importData: () => Promise<void>;
  handleResetDatabase: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside <SettingsContext.Provider>');
  }
  return ctx;
}
