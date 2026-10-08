// Config resolution — the single place Provider defaults live and the only
// place a preference snapshot is turned into a typed Resolved config.
//
// See CONTEXT.md for the domain terms (Listening/STT, Voice/TTS, AI Brain/Chat,
// Provider, Resolved config).
//
// Design:
//  - loadPreferences() is the one IO step (one round-trip to the prefs table).
//  - resolveSTT / resolveTTS / resolveChat are PURE functions over that
//    snapshot. They are the test surface: no DB, no Electron, no mocks.
//  - The two things that cannot be pure-sync stay in the adapters, not here:
//      * the Embedded server URL is a *live* port (embedded.ts reads it);
//      * an apiKey may be `env:VAR` (the adapter calls resolveApiKey() right
//        before the fetch). Resolved configs therefore carry the *raw* key.

import { getAllPreferences } from './sqlite';
import { STTProvider, TTSProvider, ChatProvider } from '../types/settings';

export type Voice = 'male' | 'female';

// A plain snapshot of the user_preferences table.
export type PrefMap = Record<string, string>;

// Canonical base URLs for the hosted AI Brain Providers. Picking the Provider
// alone determines the URL — users do not type these. Only Ollama and Custom
// read their URL from the prefs, since those can live anywhere.
export const CHAT_PROVIDER_URLS = {
  anthropic: 'https://api.anthropic.com',
  openai:    'https://api.openai.com',
  groq:      'https://api.groq.com/openai',
  gemini:    'https://generativelanguage.googleapis.com',
} as const;

// Default env-var names each hosted Provider reads when a key is stored as
// `env:VAR`. The Settings UI uses this map to pre-fill the env-var placeholder.
export const CHAT_PROVIDER_ENV_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai:    'OPENAI_API_KEY',
  groq:      'GROQ_API_KEY',
  gemini:    'GEMINI_API_KEY',
  ollama:    'OLLAMA_API_KEY',
  custom:    'API_KEY',
} as const;

const KOKORO = 'speaches-ai/Kokoro-82M-v1.0-ONNX';

// Listening and Voice each address a speech server of their own, but a fresh
// install starts both at the same hosted one.
const SPEACHES_SERVER = 'https://speaches.locopuente.org';

// THE single source of Provider defaults. Anything that wants a default value
// reads it from here; nothing redefines a default inline.
export const DEFAULTS = {
  stt: {
    // In-app Whisper (phase 5): the offline built-in, no server involved.
    provider: 'wasm' as STTProvider,
    // Speaches (cloud) server + model.
    speachesServer: SPEACHES_SERVER,
    speachesModel: 'Systran/faster-whisper-small',
  },
  tts: {
    // In-app piper (phase 5): the offline built-in, no server involved.
    provider: 'piper' as TTSProvider,
    speachesServer: SPEACHES_SERVER,
    voice: 'female' as Voice,
    speed: 1.2, // unified: one slider value drives both Providers
    male:   { model: KOKORO, voice: 'am_adam' },
    female: { model: KOKORO, voice: 'af_bella' },
  },
  chat: {
    provider: 'ollama' as ChatProvider,
    // Deliberately empty: there is no silent remote default. The
    // community server URL is only written by an explicit first-run
    // choice (WelcomePage) or typed into Settings. An empty URL means
    // "no AI Brain connected yet" and the UI says so.
    url: '',
    model: 'llama2',
  },
} as const;

// The project's hosted servers — offered as an explicit choice during
// first-run onboarding and as a Settings preset, never as a silent default.
export const COMMUNITY_SERVERS = {
  speech: 'https://speaches.locopuente.org',
  chat: 'https://ollama.serveur.au',
  chatModel: 'llama2',
} as const;

// Preference keys that no runtime path reads any more. Most were orphaned by
// phase 5 (the Python embedded server deleted; its Provider slots migrated to
// the in-app wasm/piper engines — values migrated in main at startup).
export const DEPRECATED_PREFERENCE_KEYS = [
  'ttsModel',
  'embeddedMaleVoiceId',
  'embeddedFemaleVoiceId',
  'embeddedSttUrl',
  'embeddedTtsUrl',
  'ttsSpeed',
] as const;

// ---- Resolved config shapes -------------------------------------------------
// Discriminated unions: the shape itself documents what each Provider reads.

export interface SpeachesSTT { provider: 'speaches'; url: string; model: string; apiKey: string; }
// In-app WASM inference (phase 3 of the sidecar retirement): no settings at
// all — models live in userData, managed by the main process. Since phase 5
// this IS the offline built-in (the old 'embedded' Provider slot migrates
// here in main at startup).
export interface WasmSTT { provider: 'wasm'; }
export type STTConfig = SpeachesSTT | WasmSTT;

export interface SpeachesTTS {
  provider: 'speaches';
  url: string;
  voice: Voice;
  speed: number;
  apiKey: string;
  male:   { model: string; voice: string };
  female: { model: string; voice: string };
}
// In-app piper (phase 4 of the sidecar retirement): standalone binary +
// alan/amy voices in userData. Since phase 5 this IS the offline built-in
// (the old 'embedded' Provider slot migrates here in main at startup).
export interface PiperTTS { provider: 'piper'; voice: Voice; speed: number; }
export type TTSConfig = SpeachesTTS | PiperTTS;

export interface ChatConfig {
  provider: ChatProvider;
  url: string;
  model: string;
  apiKey: string; // raw — may be `env:VAR`; the adapter resolves it
}

// ---- Loading + resolution ---------------------------------------------------

// The one async/IO step. Everything below is pure over its result.
export async function loadPreferences(): Promise<PrefMap> {
  return getAllPreferences();
}

export function resolveSTT(
  p: PrefMap,
  provider: STTProvider = (p.sttProvider as STTProvider) || DEFAULTS.stt.provider,
): STTConfig {
  if (provider === 'speaches') {
    return {
      provider: 'speaches',
      url: p.sttUrl || DEFAULTS.stt.speachesServer,
      model: p.sttModel || DEFAULTS.stt.speachesModel,
      apiKey: p.sttApiKey || '',
    };
  }
  // 'wasm' — and a stray legacy 'embedded' value, which the startup
  // migration normally rewrites — resolve to the in-app engine.
  return { provider: 'wasm' };
}

export function resolveTTS(
  p: PrefMap,
  provider: TTSProvider = (p.ttsProvider as TTSProvider) || DEFAULTS.tts.provider,
): TTSConfig {
  const voice = (p.voice as Voice) || DEFAULTS.tts.voice;
  // Unified speed: the slider writes embeddedSpeechSpeed; both Providers use it.
  const speed = parseFloat(p.embeddedSpeechSpeed || String(DEFAULTS.tts.speed));

  if (provider === 'speaches') {
    return {
      provider: 'speaches',
      url: p.ttsUrl || DEFAULTS.tts.speachesServer,
      voice,
      speed,
      apiKey: p.ttsApiKey || '',
      male:   { model: p.maleTTSModel || DEFAULTS.tts.male.model,   voice: p.maleVoice   || DEFAULTS.tts.male.voice },
      female: { model: p.femaleTTSModel || DEFAULTS.tts.female.model, voice: p.femaleVoice || DEFAULTS.tts.female.voice },
    };
  }
  // 'piper' — and a stray legacy 'embedded' value, which the startup
  // migration normally rewrites — resolve to the in-app engine.
  return { provider: 'piper', voice, speed };
}

export function resolveChat(
  p: PrefMap,
  provider: ChatProvider = (p.chatProvider as ChatProvider) || DEFAULTS.chat.provider,
): ChatConfig {
  const url = provider in CHAT_PROVIDER_URLS
    ? CHAT_PROVIDER_URLS[provider as keyof typeof CHAT_PROVIDER_URLS]
    // `ollamaUrl`/`ollamaModel`/`ollamaApiKey` are legacy key names shared by
    // Ollama and Custom — kept for backward compatibility.
    : (p.ollamaUrl || DEFAULTS.chat.url);
  return {
    provider,
    url,
    model: p.ollamaModel || DEFAULTS.chat.model,
    apiKey: p.ollamaApiKey || '',
  };
}
